import { prisma } from "@/lib/db";

/**
 * Funciones que usa el pipeline de prospección (corrido por Claude Code local,
 * nunca por la app web sola) para persistir los resultados de una corrida.
 * Ver scripts/importRun.ts para el punto de entrada real.
 */

export function normalizeDomain(website: string): string {
  let host = website.trim().toLowerCase();
  host = host.replace(/^https?:\/\//, "");
  host = host.replace(/^www\./, "");
  host = host.split("/")[0].split("?")[0];
  return host;
}

export async function startRun(campaignId: number) {
  return prisma.run.create({
    data: { campaignId, status: "running" },
  });
}

export async function finishRun(
  runId: number,
  stats: {
    companiesFound: number;
    companiesAdded: number;
    companiesDuplicate: number;
    companiesRejected: number;
    notes?: string;
    status?: "completed" | "failed";
  }
) {
  return prisma.run.update({
    where: { id: runId },
    data: {
      finishedAt: new Date(),
      status: stats.status ?? "completed",
      companiesFound: stats.companiesFound,
      companiesAdded: stats.companiesAdded,
      companiesDuplicate: stats.companiesDuplicate,
      companiesRejected: stats.companiesRejected,
      notes: stats.notes,
    },
  });
}

export interface ProspectInput {
  domain: string; // ya normalizado
  companyName: string;
  website?: string;
  country?: string;
  region?: string;
  province?: string;
  city?: string;
  sector?: string;
  companySizeEstimate?: string;
  score: number;
  reasonSummary: string;
  criteriaScores: {
    criterionId: number;
    pointsAwarded: number;
    evidenceText?: string;
    evidenceSourceUrl?: string;
  }[];
  contact?: {
    name?: string;
    role?: string;
    email?: string;
    emailSourceUrl?: string;
    linkedinUrl?: string;
    phone?: string;
    found: boolean;
  };
  sources: { url: string; title?: string; note?: string }[];
}

/** Devuelve {created:false} sin tocar nada si el dominio ya existe para esa campaña. */
export async function upsertProspect(
  campaignId: number,
  runId: number,
  input: ProspectInput
): Promise<{ created: boolean; id?: number }> {
  const existing = await prisma.prospect.findUnique({
    where: { campaignId_domain: { campaignId, domain: input.domain } },
  });
  if (existing) return { created: false };

  const prospect = await prisma.prospect.create({
    data: {
      campaignId,
      runId,
      domain: input.domain,
      companyName: input.companyName,
      website: input.website,
      country: input.country,
      region: input.region,
      province: input.province,
      city: input.city,
      sector: input.sector,
      companySizeEstimate: input.companySizeEstimate,
      score: input.score,
      reasonSummary: input.reasonSummary,
      criteriaScores: { create: input.criteriaScores },
      contacts: input.contact ? { create: [input.contact] } : undefined,
      sources: { create: input.sources },
    },
  });
  return { created: true, id: prospect.id };
}
