# Prospección B2B

Bot personal de prospección B2B. Panel web con URL fija (deployado en
Railway, igual que el del restaurante), base de datos Postgres real (no en
el navegador, no en localStorage). No envía emails ni contacta a nadie
solo — solo busca, investiga, puntúa y deja los prospectos preparados. La
búsqueda/investigación no corre sola: se la pedís a Claude en una
conversación, y él escribe los resultados directamente en la base.

## Deploy (una sola vez)

1. Andá a **railway.app** → **New Project** → **Deploy from GitHub repo**
   → elegí `Agustinlarici/BotSales`.
2. Dentro de ese mismo proyecto: **+ New** → **Database** → **Add
   PostgreSQL**. Railway crea el servicio de base y lo deja disponible
   para referenciar.
3. En el servicio de la app (no el de la base) → pestaña **Variables** →
   agregá `DATABASE_URL` como referencia a
   `${{Postgres.DATABASE_URL}}` (Railway te la sugiere sola al escribir
   `${{`).
4. En el servicio de la app → **Settings** → **Networking** → **Generate
   Domain**. Ahí te da la URL fija tipo `botsales.up.railway.app` — es tu
   panel, abrilo cuando quieras.
5. Railway detecta Next.js solo (build con `pnpm install && pnpm build`,
   arranca con `pnpm start`, que ya respeta el puerto que asigna Railway).
6. **Creá las tablas una sola vez**: pasame el `DATABASE_URL` del servicio
   Postgres (Variables → `DATABASE_URL`, ahí sí el valor real, no la
   referencia) para inicializar el esquema con `prisma db push`.

## Cómo se usa

1. Entrás a tu URL de Railway y creás una campaña: qué vendés, dónde
   buscar, sector/tamaño/palabras clave, cargos objetivo, cantidad máxima
   de empresas y umbral mínimo de score.
2. Cargás los criterios de "buen prospecto" con su peso.
3. **Me pedís acá en el chat** que corra la campaña. Yo investigo con
   fuentes públicas reales, armo el score con evidencia citada, busco
   contacto/email, y guardo todo directo en tu base Postgres con
   `scripts/importRun.ts` — deduplicando por dominio, así no se repiten
   empresas entre corridas.
4. Refrescás tu URL de Railway y ya está la tabla actualizada: Score,
   Empresa, Ubicación, Motivo, Contacto, Email, Web. Entrás a cada empresa
   para ver el desglose del score, evidencia, contacto y fuentes.
5. Actualizás el estado de contacto a mano (nunca cambia solo).
6. Exportás a CSV o Excel con los botones de la página.

## Desarrollo local (opcional)

Si en algún momento SÍ querés tocarlo vos:

```bash
pnpm install
cp .env.example .env    # completá DATABASE_URL con el mismo Postgres
pnpm dev                # http://localhost:3000
```

## Formato de `payload.json` para `scripts/importRun.ts`

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

```bash
pnpm exec tsx scripts/addEmailDraft.ts draft.json
```

```json
{
  "prospectId": 5,
  "subject": "Asunto del email",
  "body": "Cuerpo del email personalizado.",
  "deliveryMethod": "eml"
}
```

Con `"deliveryMethod": "eml"` se genera un archivo `.eml` que te paso por
el chat, para que lo abras con cualquier cliente de correo sin que se
envíe. Con `"deliveryMethod": "outlook_draft"` puedo crear el borrador
directo en tu Outlook usando el conector de Microsoft 365, sin necesidad
de registrar una app en Azure AD.

## Comandos útiles

- `pnpm exec prisma studio` — inspeccionar/editar la base a mano.
- `pnpm build && pnpm start` — build de producción local.
