# Prospección B2B

Bot personal de prospección B2B. Panel web con URL fija (deployado en
Railway, igual que el del restaurante), base de datos Postgres real (no en
el navegador, no en localStorage), protegido con contraseña porque la URL
es pública. No envía emails ni contacta a nadie solo — solo busca,
investiga, puntúa y deja los prospectos preparados.

**Cómo se conecta la investigación con la app:** el sandbox donde corre
Claude tiene la salida de red restringida (solo GitHub, npm y poco más —
ni Postgres directo ni HTTPS a Railway/Vercel/etc. están permitidos). Así
que en vez de que Claude le pegue a la app por internet, Claude deja el
resultado de cada corrida como un archivo en este mismo repo
(`pending-runs/`) y hace `git push`. Railway ya redeploya solo con cada
push; al arrancar, la app misma revisa esa carpeta e importa lo que
encuentre a su Postgres (ver `instrumentation.ts` y
`lib/processPendingImports.ts`). Cero llamadas salientes desde el lado de
Claude, cero pasos manuales tuyos.

## Deploy (una sola vez)

1. Andá a **railway.app** → **New Project** → **Deploy from GitHub repo**
   → elegí `Agustinlarici/BotSales`.
2. Dentro de ese mismo proyecto: **+ New** → **Database** → **Add
   PostgreSQL**.
3. En el servicio de la app (no el de la base) → pestaña **Variables** →
   agregá:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (Railway te la sugiere
     sola al escribir `${{`) — la interna alcanza, la app corre dentro del
     mismo proyecto.
   - `APP_PASSWORD` = una contraseña larga tuya.
4. En el servicio de la app → **Settings** → **Networking** → **Generate
   Domain** → esa es tu URL fija. Al abrirla pide usuario (cualquiera) y
   la `APP_PASSWORD` como contraseña.
5. Listo — no hace falta crear las tablas a mano: el comando de arranque
   (`prisma db push && next start`) las crea/sincroniza solo en cada
   deploy.

## Cómo se usa

1. Entrás a tu URL de Railway (con la contraseña) y creás una campaña:
   qué vendés, dónde buscar, sector/tamaño/palabras clave, cargos
   objetivo, cantidad máxima de empresas y umbral mínimo de score.
2. Cargás los criterios de "buen prospecto" con su peso.
3. **Me pedís acá en el chat** que corra la campaña. Yo investigo con
   fuentes públicas reales, armo el score con evidencia citada, busco
   contacto/email, escribo un archivo en `pending-runs/` con todo eso, y
   hago push al repo. Railway redeploya (tarda uno o dos minutos) y al
   arrancar importa el archivo, deduplicando por dominio.
4. Refrescás tu URL de Railway y ya está la tabla actualizada: Score,
   Empresa, Ubicación, Motivo, Contacto, Email, Web. Entrás a cada empresa
   para ver el desglose del score, evidencia, contacto y fuentes.
5. Si algo falló (campaña inexistente, JSON con error), lo vas a ver en
   **Log de imports** (link en el header) con el detalle.
6. Actualizás el estado de contacto a mano (nunca cambia solo).
7. Exportás a CSV o Excel con los botones de la página.

## Desarrollo local (opcional)

Si en algún momento SÍ querés tocarlo vos:

```bash
pnpm install
cp .env.example .env    # completá DATABASE_URL y APP_PASSWORD
pnpm dev                # http://localhost:3000
```

Corriendo local, los scripts `scripts/importRun.ts` y
`scripts/addEmailDraft.ts` siguen andando conectándose directo a la base
(alternativa a dejar el archivo en `pending-runs/`).

## Formato de los archivos en `pending-runs/`

```json
{
  "campaignId": 1,
  "companiesFound": 12,
  "companiesRejected": 4,
  "notes": "texto libre opcional sobre la corrida",
  "prospects": [
    {
      "website": "https://empresa.com",
      "companyName": "Empresa SA",
      "country": "Argentina",
      "province": "Buenos Aires",
      "city": "CABA",
      "sector": "Retail",
      "companySizeEstimate": "50-200 empleados",
      "score": 78,
      "reasonSummary": "Por qué es buen prospecto, en una o dos frases.",
      "criteriaScores": [
        {
          "criterionId": 1,
          "pointsAwarded": 40,
          "evidenceText": "Qué se encontró",
          "evidenceSourceUrl": "https://fuente-real.com/pagina"
        }
      ],
      "contact": {
        "name": "Nombre Apellido",
        "role": "Cargo",
        "email": "persona@empresa.com",
        "emailSourceUrl": "https://empresa.com/contacto",
        "linkedinUrl": null,
        "phone": null,
        "found": true
      },
      "sources": [{ "url": "https://empresa.com", "title": "Sitio oficial" }]
    }
  ]
}
```

Regla dura: si un dato no se encontró (por ejemplo el email), va como
`null` con su `*SourceUrl` vacío — nunca se inventa ni se adivina un
patrón de email. `criterionId` tiene que existir en la campaña.

## Borradores de email (opcional, nunca se envían solos)

Mismo mecanismo, en `pending-drafts/`:

```json
{
  "prospectId": 5,
  "subject": "Asunto del email",
  "body": "Cuerpo del email personalizado.",
  "deliveryMethod": "eml"
}
```

Con `"deliveryMethod": "eml"` yo te mando el archivo `.eml` directo por
el chat (no queda guardado en el servidor), para que lo abras con
cualquier cliente de correo sin que se envíe. Con
`"deliveryMethod": "outlook_draft"` puedo crear el borrador directo en tu
Outlook usando el conector de Microsoft 365, sin necesidad de registrar
una app en Azure AD.

También existen `/api/import-run` y `/api/email-drafts` (mismo formato,
por HTTP) por si en el futuro agregamos una pantalla para pegar el JSON
vos mismo desde el navegador — hoy no las uso porque no puedo llegar a tu
dominio de Railway desde donde corro.

## Comandos útiles

- `pnpm exec prisma studio` (con `DATABASE_URL` seteada) — inspeccionar/editar la base a mano.
- `pnpm build && pnpm start` — build de producción local.
