import { notFound } from "next/navigation";
import CampaignForm from "@/components/CampaignForm";
import { updateCampaign } from "@/lib/actions";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaignId = Number(id);
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) notFound();

  const boundUpdate = updateCampaign.bind(null, campaignId);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <h1 className="text-xl font-semibold">Editar campaña</h1>
      <CampaignForm campaign={campaign} action={boundUpdate} submitLabel="Guardar cambios" />
    </div>
  );
}
