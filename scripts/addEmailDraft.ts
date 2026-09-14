/**
 * Guarda un borrador de email para un prospecto. Nunca envía nada.
 *
 * Uso: pnpm exec tsx scripts/addEmailDraft.ts draft.json
 *
 * draft.json:
 * {
 *   "prospectId": 12,
 *   "subject": "...",
 *   "body": "...",
 *   "deliveryMethod": "eml" | "outlook_draft",
 *   "outlookMessageId": "..."   // solo si deliveryMethod es outlook_draft y ya se creó el borrador vía el conector de Outlook
 * }
 *
 * Si deliveryMethod es "eml", además escribe un archivo .eml en exports/drafts/
 * que se puede abrir con cualquier cliente de correo sin enviarlo.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../lib/db";

interface DraftPayload {
  prospectId: number;
  subject: string;
  body: string;
  deliveryMethod: "eml" | "outlook_draft";
  outlookMessageId?: string;
}

function buildEml(to: string | null, subject: string, body: string) {
  const headers = [
    `To: ${to ?? ""}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
  ];
  return `${headers.join("\r\n")}\r\n\r\n${body}`;
}

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Uso: pnpm exec tsx scripts/addEmailDraft.ts draft.json");
    process.exit(1);
  }

  const payload: DraftPayload = JSON.parse(readFileSync(path, "utf-8"));

  const prospect = await prisma.prospect.findUnique({
    where: { id: payload.prospectId },
    include: { contacts: true },
  });
  if (!prospect) {
    console.error(`No existe el prospecto ${payload.prospectId}`);
    process.exit(1);
  }

  let filePath: string | undefined;
  if (payload.deliveryMethod === "eml") {
    const dir = join(process.cwd(), "exports", "drafts");
    mkdirSync(dir, { recursive: true });
    filePath = join(dir, `prospecto-${payload.prospectId}.eml`);
    const to = prospect.contacts[0]?.email ?? null;
    writeFileSync(filePath, buildEml(to, payload.subject, payload.body), "utf-8");
  }

  const draft = await prisma.emailDraft.create({
    data: {
      prospectId: payload.prospectId,
      subject: payload.subject,
      body: payload.body,
      deliveryMethod: payload.deliveryMethod,
      filePath,
      outlookMessageId: payload.outlookMessageId,
    },
  });

  console.log(`Borrador #${draft.id} guardado para ${prospect.companyName} (${payload.deliveryMethod}).`);
  if (filePath) console.log(`Archivo: ${filePath}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
