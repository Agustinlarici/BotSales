"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

function str(fd: FormData, key: string): string {
  return (fd.get(key) as string | null)?.trim() ?? "";
}
function optStr(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v.length ? v : null;
}
function int(fd: FormData, key: string, fallback: number): number {
  const v = str(fd, key);
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function campaignDataFromForm(fd: FormData) {
  return {
    name: str(fd, "name"),
    productTitle: str(fd, "productTitle"),
    productDescription: str(fd, "productDescription"),
    country: str(fd, "country"),
    region: optStr(fd, "region"),
    province: optStr(fd, "province"),
    city: optStr(fd, "city"),
    radiusKm: fd.get("radiusKm") ? int(fd, "radiusKm", 0) : null,
    sector: optStr(fd, "sector"),
    companySize: optStr(fd, "companySize"),
    keywords: str(fd, "keywords"),
    targetRoles: str(fd, "targetRoles"),
    maxCompanies: int(fd, "maxCompanies", 20),
    minScoreThreshold: int(fd, "minScoreThreshold", 0),
  };
}

export async function createCampaign(fd: FormData) {
  const data = campaignDataFromForm(fd);
  const campaign = await prisma.campaign.create({ data });
  revalidatePath("/");
  redirect(`/campaigns/${campaign.id}`);
}

export async function updateCampaign(campaignId: number, fd: FormData) {
  const data = campaignDataFromForm(fd);
  await prisma.campaign.update({ where: { id: campaignId }, data });
  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}`);
}

export async function deleteCampaign(campaignId: number) {
  await prisma.campaign.delete({ where: { id: campaignId } });
  revalidatePath("/");
  redirect("/");
}

export async function addCriterion(campaignId: number, fd: FormData) {
  await prisma.criterion.create({
    data: {
      campaignId,
      label: str(fd, "label"),
      description: optStr(fd, "description"),
      weight: int(fd, "weight", 10),
    },
  });
  revalidatePath(`/campaigns/${campaignId}`);
}

export async function deleteCriterion(campaignId: number, criterionId: number) {
  await prisma.criterion.delete({ where: { id: criterionId } });
  revalidatePath(`/campaigns/${campaignId}`);
}

const CONTACT_STATUSES = ["nuevo", "contactado", "respondio", "descartado"] as const;

export async function updateContactStatus(campaignId: number, prospectId: number, fd: FormData) {
  const status = str(fd, "contactStatus");
  if (!CONTACT_STATUSES.includes(status as (typeof CONTACT_STATUSES)[number])) {
    throw new Error(`Estado de contacto inválido: ${status}`);
  }
  await prisma.prospect.update({
    where: { id: prospectId },
    data: { contactStatus: status },
  });
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath(`/campaigns/${campaignId}/prospects/${prospectId}`);
}
