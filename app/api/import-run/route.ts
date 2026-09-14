import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  startRun,
  finishRun,
  upsertProspect,
  normalizeDomain,
  type ProspectInput,
} from "@/lib/pipelineApi";

export const dynamic = "force-dynamic";

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

/**
 * Punto de entrada que uso yo (Claude, desde una conversación) para
 * persistir el resultado de una corrida de campaña, vía HTTPS normal —
 * la app corre en Railway y es ella la que escribe en su propio Postgres.
 * Protegido por la misma contraseña compartida que el resto de la app
 * (ver middleware.ts).
 */
export async function POST(req: NextRequest) {
  let payload: RunPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!payload.campaignId || !Array.isArray(payload.prospects)) {
    return NextResponse.json(
      { error: "Faltan campaignId o prospects" },
      { status: 400 }
    );
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: payload.campaignId },
  });
  if (!campaign) {
    return NextResponse.json(
      { error: `No existe la campaña con id ${payload.campaignId}` },
      { status: 404 }
    );
  }

  const run = await startRun(payload.campaignId);

  let added = 0;
  let duplicate = 0;
  const addedCompanies: string[] = [];
  const duplicateCompanies: string[] = [];

  for (const p of payload.prospects) {
    const domain = normalizeDomain(p.domain ?? p.website);
    const result = await upsertProspect(payload.campaignId, run.id, {
      ...p,
      domain,
    });
    if (result.created) {
      added++;
      addedCompanies.push(`${p.companyName} (${domain})`);
    } else {
      duplicate++;
      duplicateCompanies.push(`${p.companyName} (${domain})`);
    }
  }

  await finishRun(run.id, {
    companiesFound: payload.companiesFound,
    companiesAdded: added,
    companiesDuplicate: duplicate,
    companiesRejected: payload.companiesRejected,
    notes: payload.notes,
  });

  return NextResponse.json({
    runId: run.id,
    added,
    duplicate,
    addedCompanies,
    duplicateCompanies,
  });
}
