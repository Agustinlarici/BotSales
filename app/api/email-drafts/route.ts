import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface DraftPayload {
  prospectId: number;
  subject: string;
  body: string;
  deliveryMethod: "eml" | "outlook_draft";
  outlookMessageId?: string;
}

export async function POST(req: NextRequest) {
  let payload: DraftPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const prospect = await prisma.prospect.findUnique({
    where: { id: payload.prospectId },
    include: { contacts: true },
  });
  if (!prospect) {
    return NextResponse.json(
      { error: `No existe el prospecto ${payload.prospectId}` },
      { status: 404 }
    );
  }

  const draft = await prisma.emailDraft.create({
    data: {
      prospectId: payload.prospectId,
      subject: payload.subject,
      body: payload.body,
      deliveryMethod: payload.deliveryMethod,
      outlookMessageId: payload.outlookMessageId,
    },
  });

  return NextResponse.json({
    draftId: draft.id,
    companyName: prospect.companyName,
    contactEmail: prospect.contacts[0]?.email ?? null,
  });
}
