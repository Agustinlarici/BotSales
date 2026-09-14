import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/lib/db";
import {
  startRun,
  finishRun,
  upsertProspect,
  normalizeDomain,
  type ProspectInput,
} from "@/lib/pipelineApi";

/**
 * Se corre una vez al arrancar el server (ver instrumentation.ts). Procesa
 * los archivos que Claude dejó en pending-runs/ y pending-drafts/ al hacer
 * push — así la app importa sus propios resultados sin que nadie le pegue
 * por HTTP desde afuera.
 */

const PENDING_RUNS_DIR = join(process.cwd(), "pending-runs");
const PENDING_DRAFTS_DIR = join(process.cwd(), "pending-drafts");
const PENDING_CRITERIA_DIR = join(process.cwd(), "pending-criteria");

type ProspectPayloadItem = Omit<ProspectInput, "domain"> & {
  website: string;
  domain?: string;
};

interface RunPayload {
  campaignId: number;
  companiesFound: number;
  companiesRejected: number;
  notes?: string;
  prospects: ProspectPayloadItem[];
}

interface DraftPayload {
  prospectId: number;
  subject: string;
  body: string;
  deliveryMethod: "eml" | "outlook_draft";
  outlookMessageId?: string;
}

interface CriteriaPayload {
  campaignId: number;
  criteria: { label: string; description?: string; weight: number }[];
}

async function listJsonFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir);
    return entries.filter((f) => f.endsWith(".json")).sort();
  } catch {
    return [];
  }
}

async function alreadyProcessed(filename: string): Promise<boolean> {
  const existing = await prisma.processedImportFile.findUnique({ where: { filename } });
  return !!existing;
}

async function markProcessed(filename: string, status: "ok" | "error", detail?: string) {
  await prisma.processedImportFile.upsert({
    where: { filename },
    create: { filename, status, detail },
    update: { status, detail, processedAt: new Date() },
  });
}

async function processRunFile(name: string) {
  const path = join(PENDING_RUNS_DIR, name);
  try {
    const payload: RunPayload = JSON.parse(await readFile(path, "utf-8"));
    const campaign = await prisma.campaign.findUnique({ where: { id: payload.campaignId } });
    if (!campaign) throw new Error(`No existe la campaña ${payload.campaignId}`);

    const run = await startRun(payload.campaignId);
    let added = 0;
    let duplicate = 0;
    for (const p of payload.prospects) {
      const domain = normalizeDomain(p.domain ?? p.website);
      const result = await upsertProspect(payload.campaignId, run.id, { ...p, domain });
      if (result.created) added++;
      else duplicate++;
    }
    await finishRun(run.id, {
      companiesFound: payload.companiesFound,
      companiesAdded: added,
      companiesDuplicate: duplicate,
      companiesRejected: payload.companiesRejected,
      notes: payload.notes,
    });
    await markProcessed(name, "ok", `Corrida #${run.id}: ${added} nuevas, ${duplicate} duplicadas`);
    console.log(`[pending-runs] ${name}: ok (${added} nuevas, ${duplicate} duplicadas)`);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    await markProcessed(name, "error", detail);
    console.error(`[pending-runs] ${name}: error - ${detail}`);
  }
}

async function processDraftFile(name: string) {
  const path = join(PENDING_DRAFTS_DIR, name);
  try {
    const payload: DraftPayload = JSON.parse(await readFile(path, "utf-8"));
    const prospect = await prisma.prospect.findUnique({ where: { id: payload.prospectId } });
    if (!prospect) throw new Error(`No existe el prospecto ${payload.prospectId}`);

    const draft = await prisma.emailDraft.create({
      data: {
        prospectId: payload.prospectId,
        subject: payload.subject,
        body: payload.body,
        deliveryMethod: payload.deliveryMethod,
        outlookMessageId: payload.outlookMessageId,
      },
    });
    await markProcessed(name, "ok", `Borrador #${draft.id} para prospecto ${payload.prospectId}`);
    console.log(`[pending-drafts] ${name}: ok`);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    await markProcessed(name, "error", detail);
    console.error(`[pending-drafts] ${name}: error - ${detail}`);
  }
}

async function processCriteriaFile(name: string) {
  const path = join(PENDING_CRITERIA_DIR, name);
  try {
    const payload: CriteriaPayload = JSON.parse(await readFile(path, "utf-8"));
    const campaign = await prisma.campaign.findUnique({ where: { id: payload.campaignId } });
    if (!campaign) throw new Error(`No existe la campaña ${payload.campaignId}`);

    const created = await prisma.$transaction(
      payload.criteria.map((c) =>
        prisma.criterion.create({
          data: {
            campaignId: payload.campaignId,
            label: c.label,
            description: c.description,
            weight: c.weight,
          },
        })
      )
    );
    const summary = created.map((c) => `id ${c.id} (${c.label})`).join(", ");
    await markProcessed(name, "ok", `${created.length} criterios creados: ${summary}`);
    console.log(`[pending-criteria] ${name}: ok (${summary})`);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    await markProcessed(name, "error", detail);
    console.error(`[pending-criteria] ${name}: error - ${detail}`);
  }
}

export async function processPendingImports() {
  try {
    for (const name of await listJsonFiles(PENDING_CRITERIA_DIR)) {
      if (await alreadyProcessed(name)) continue;
      await processCriteriaFile(name);
    }
    for (const name of await listJsonFiles(PENDING_RUNS_DIR)) {
      if (await alreadyProcessed(name)) continue;
      await processRunFile(name);
    }
    for (const name of await listJsonFiles(PENDING_DRAFTS_DIR)) {
      if (await alreadyProcessed(name)) continue;
      await processDraftFile(name);
    }
  } catch (err) {
    console.error("[processPendingImports] fallo general:", err);
  }
}
