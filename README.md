# Prospección B2B (local)

Bot personal de prospección B2B. Corre 100% en tu computadora: la base de
datos es un archivo SQLite en `data/prospecting.db` (persistencia real en
disco, no en el navegador). No envía emails ni contacta a nadie solo — solo
busca, investiga, puntúa y deja los prospectos preparados.

## Instalación

Requisitos: Node.js 20+ y [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm exec prisma generate
pnpm db:push          # crea/actualiza data/prospecting.db según prisma/schema.prisma
pnpm dev              # http://localhost:3000
```

`.env` ya apunta a `DATABASE_URL="file:../data/prospecting.db"` — no hace
falta tocarlo para uso local.

## Cómo se usa

1. **Creá una campaña** desde la web (`+ Nueva campaña`): qué vendés, dónde
   buscar, sector/tamaño/palabras clave, cargos objetivo, cantidad máxima
   de empresas y umbral mínimo de score.
2. **Cargá los criterios de "buen prospecto"** con su peso, desde la página
   de la campaña.
3. **Corré la campaña pidiéndoselo a Claude Code**, abierto en esta misma
   carpeta (`claude` en la terminal, o Claude Code en tu editor). La web
   **no** busca sola — no hay botón de "correr" que llame a ninguna API por
   su cuenta, así no pagás nada aparte de tu plan de Claude. Pedile algo
   como:

   > Corré la campaña "Nombre" (id 3): buscá hasta N empresas reales que
   > matcheen la config, investigalas con fuentes públicas, puntualas según
   > los criterios cargados (con evidencia y URL fuente para cada punto),
   > buscá contacto y email, y guardá todo con `scripts/importRun.ts`.

   Claude Code hace la investigación real con su herramienta de búsqueda
   web, arma un JSON con el resultado (ver formato abajo) y lo persiste
   corriendo:

   ```bash
   pnpm exec tsx scripts/importRun.ts payload.json
   ```

   El script deduplica automáticamente por dominio dentro de la campaña:
   una empresa que ya está guardada no se vuelve a insertar en corridas
   futuras.

4. **Mirá la tabla de resultados** en la página de la campaña (Score,
   Empresa, Ubicación, Motivo, Contacto, Email, Web, Estado) y entrá a
   cada empresa para ver el desglose del score por criterio, la evidencia
   citada, el contacto encontrado y las fuentes.
5. **Actualizá el estado de contacto a mano** (nuevo / contactado /
   respondió / descartado) desde el detalle de cada prospecto — nunca
   cambia solo.
6. **Exportá a CSV o Excel** con los botones de la página de la campaña.

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
patrón de email. `criterionId` tiene que existir en la campaña (se ve en
la página de la campaña o consultando la tabla `Criterion`).

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

Con `"deliveryMethod": "eml"` se genera un archivo `.eml` en
`exports/drafts/` que abrís con cualquier cliente de correo sin que se
envíe. Con `"deliveryMethod": "outlook_draft"` (y `"outlookMessageId"`
del borrador ya creado) se deja registrado que el borrador vive en tu
Outlook — si tenés el conector de Microsoft 365 disponible en tu sesión
de Claude Code, pedile que cree el borrador ahí directamente, sin
necesidad de registrar una app en Azure AD.

## Comandos útiles

- `pnpm db:studio` — abre Prisma Studio para inspeccionar/editar la base a mano.
- `pnpm build && pnpm start` — build de producción.
