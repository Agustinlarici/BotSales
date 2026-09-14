import CampaignForm from "@/components/CampaignForm";
import { createCampaign } from "@/lib/actions";

export default function NewCampaignPage() {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold">Nueva campaña</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Después de crearla vas a poder agregar los criterios de &quot;buen
          prospecto&quot; y su peso.
        </p>
      </div>
      <CampaignForm action={createCampaign} submitLabel="Crear campaña" />
    </div>
  );
}
