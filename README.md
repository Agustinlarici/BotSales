# Prospección B2B

Bot personal de prospección B2B. Panel web con URL fija (deployado en
Railway, igual que el del restaurante), base de datos Postgres real (no en
el navegador, no en localStorage), protegido con contraseña porque la URL
es pública. No envía emails ni contacta a nadie solo — solo busca,
investiga, puntúa y deja los prospectos preparados. La
búsqueda/investigación no corre sola: se la pedís a Claude en una
conversación, y Claude llama a un endpoint HTTPS de la propia app para que
sea ella (corriendo en Railway) la que escriba en su Postgres — Claude
nunca se conecta directo a la base.

## Deploy (una sola vez)

1. Andá a **railway.app** → **New Project** → **Deploy from GitHub repo**
   → elegí `Agustinlarici/BotSales`.
2. Dentro de ese mismo proyecto: **+ New** → **Database** → **Add
   PostgreSQL**. Railway crea el servicio de base y lo deja disponible
   para referenciar.
3. En el servicio de la app (no el de la base) → pestaña **Variables** →
   agregá:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (Railway te la sugiere
     sola al escribir `${{`) — la **interna**, no la pública; la app corre
     dentro del mismo proyecto así que le sirve.
   - `APP_PASSWORD` = una contraseña larga tuya (avisale a Claude cuál
     elegiste, la va a necesitar para poder correr campañas).
4. En el servicio de la app → **Settings** → **Networking** → **Generate
   Domain**. Ahí te da la URL fija tipo `botsales.up.railway.app` — es tu
   panel. Al abrirla te va a pedir usuario (cualquiera) y la
   `APP_PASSWORD` como contraseña.
5. Railway detecta Next.js solo (build con `pnpm install && pnpm build`,
   arranca con `pnpm start`, que ya respeta el puerto que asigna Railway).
6. **Creá las tablas una sola vez**: pasame la variable `DATABASE_URL`
   **pública** del servicio Postgres (Variables → `DATABASE_PUBLIC_URL`,
   o pestaña Connect → el host que dice `algo.proxy.rlwy.net:puerto`) para
   que yo pueda inicializar el esquema con `prisma db push` desde acá —
   esa la uso una sola vez y no la guardo en ningún lado.

## Cómo se usa

1. Entrás a tu URL de Railway (con la contraseña) y creás una campaña:
   qué vendés, dónde buscar, sector/tamaño/palabras clave, cargos
   objetivo, cantidad máxima de empresas y umbral mínimo de score.
2. Cargás los criterios de "buen prospecto" con su peso.
3. **Me pedís acá en el chat** que corra la campaña. Yo investigo con
   fuentes públicas reales, armo el score con evidencia citada, busco
   contacto/email, y mando todo por HTTPS a `POST /api/import-run` de tu
   app (con tu `APP_PASSWORD`) — es la app la que escribe en su Postgres,
   deduplicando por dominio, así no se repiten empresas entre corridas.
4. Refrescás tu URL de Railway y ya está la tabla actualizada: Score,
   Empresa, Ubicación, Motivo, Contacto, Email, Web. Entrás a cada empresa
   para ver el desglose del score, evidencia, contacto y fuentes.
5. Actualizás el estado de contacto a mano (nunca cambia solo).
6. Exportás a CSV o Excel con los botones de la página.

## Desarrollo local (opcional)

Si en algún momento SÍ querés tocarlo vos:

```bash
pnpm install
cp .env.example .env    # completá DATABASE_URL (pública) y APP_PASSWORD
pnpm dev                # http://localhost:3000
```

Corriendo local, los scripts `scripts/importRun.ts` y
`scripts/addEmailDraft.ts` siguen andando conectándose directo a la base
(no hace falta pasar por la API en ese caso).

## Formato de `payload.json` para `/api/import-run`

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

`POST /api/email-drafts` con:

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

## Comandos útiles

- `pnpm exec prisma studio` (con `DATABASE_URL` seteada) — inspeccionar/editar la base a mano.
- `pnpm build && pnpm start` — build de producción local.
