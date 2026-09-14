/**
 * Punto de entrada para persistir el resultado de una corrida de campaña.
 *
 * Uso (lo ejecuta Claude Code local después de hacer la investigación real
 * con WebSearch — nunca la app web sola):
 *
 *   pnpm exec tsx scripts/importRun.ts payload.json
 *
 * Formato de payload.json: ver RunPayload más abajo. Cada empresa nueva
 * (dominio no visto antes para esa campaña) se inserta; los duplicados se
 * cuentan pero no se tocan.
 */
import { readFileSync } from "node:fs";
import { prisma } from "../lib/db";
import { startRun, finishRun, upsertProspect, normalizeDomain, type ProspectInput } from "../lib/pipelineApi";

type ProspectPayloadItem = Omit<ProspectInput, "domain"> & {
  website: string;
  domain?: string; // si no viene, se normaliza a partir de website
};

interface RunPayload {
  campaignId: number;
  companiesFound: number; // candidatas evaluadas en total, antes de filtrar
  companiesRejected: number; // no pasaron el umbral / criterios
  notes?: string;
  prospects: ProspectPayloadItem[];
}

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Uso: pnpm exec tsx scripts/importRun.ts payload.json");
    process.exit(1);
  }

  const payload: RunPayload = JSON.parse(readFileSync(path, "utf-8"));

  const campaign = await prisma.campaign.findUnique({ where: { id: payload.campaignId } });
  if (!campaign) {
    console.error(`No existe la campaña con id ${payload.campaignId}`);
    process.exit(1);
  }

  const run = await startRun(payload.campaignId);

  let added = 0;
  let duplicate = 0;

  for (const p of payload.prospects) {
    const domain = normalizeDomain(p.domain ?? p.website);
    const result = await upsertProspect(payload.campaignId, run.id, { ...p, domain });
    if (result.created) {
      added++;
      console.log(`+ agregado: ${p.companyName} (${domain}) score=${p.score}`);
    } else {
      duplicate++;
      console.log(`= duplicado (ya existía): ${p.companyName} (${domain})`);
    }
  }

  await finishRun(run.id, {
    companiesFound: payload.companiesFound,
    companiesAdded: added,
    companiesDuplicate: duplicate,
    companiesRejected: payload.companiesRejected,
    notes: payload.notes,
  });

  console.log(`\nCorrida #${run.id} terminada: ${added} nuevos, ${duplicate} duplicados, ${payload.companiesRejected} descartados.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
