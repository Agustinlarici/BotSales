import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";

const COLUMNS = [
  "Score",
  "Empresa",
  "Ubicación",
  "Sector",
  "Tamaño",
  "Motivo",
  "Contacto",
  "Cargo",
  "Email",
  "Teléfono",
  "LinkedIn",
  "Web",
  "Estado",
  "Dominio",
] as const;

export const dynamic = "force-dynamic";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId: campaignIdParam } = await params;
  const campaignId = Number(campaignIdParam);
  const format = req.nextUrl.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { prospects: { orderBy: { score: "desc" }, include: { contacts: true } } },
  });
  if (!campaign) {
    return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
  }

  const rows = campaign.prospects.map((p) => {
    const contact = p.contacts[0];
    return [
      String(p.score),
      p.companyName,
      [p.city, p.province, p.country].filter(Boolean).join(", "),
      p.sector ?? "",
      p.companySizeEstimate ?? "",
      p.reasonSummary,
      contact?.name ?? "",
      contact?.role ?? "",
      contact?.email ?? "",
      contact?.phone ?? "",
      contact?.linkedinUrl ?? "",
      p.website ?? "",
      p.contactStatus,
      p.domain,
    ];
  });

  const safeName = campaign.name.replace(/[^a-z0-9-_]+/gi, "_").toLowerCase();

  if (format === "csv") {
    const lines = [COLUMNS.join(","), ...rows.map((r) => r.map(csvEscape).join(","))];
    const csv = "﻿" + lines.join("\n"); // BOM para que Excel abra bien los acentos
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}-prospectos.csv"`,
      },
    });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Prospectos");
  sheet.addRow(COLUMNS as unknown as string[]);
  sheet.getRow(1).font = { bold: true };
  rows.forEach((r) => sheet.addRow(r));
  sheet.columns.forEach((col) => {
    col.width = 22;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${safeName}-prospectos.xlsx"`,
    },
  });
}
