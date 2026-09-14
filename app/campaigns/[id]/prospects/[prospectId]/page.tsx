import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { updateContactStatus } from "@/lib/actions";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  respondio: "Respondió",
  descartado: "Descartado",
};

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string; prospectId: string }>;
}) {
  const { id, prospectId } = await params;
  const campaignId = Number(id);
  const prospect = await prisma.prospect.findUnique({
    where: { id: Number(prospectId) },
    include: {
      criteriaScores: { include: { criterion: true } },
      contacts: true,
      sources: true,
      emailDrafts: { orderBy: { createdAt: "desc" } },
      campaign: true,
    },
  });
  if (!prospect || prospect.campaignId !== campaignId) notFound();

  const contact = prospect.contacts[0];
  const boundUpdateStatus = updateContactStatus.bind(null, campaignId, prospect.id);

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <Link href={`/campaigns/${campaignId}`} className="text-sm" style={{ color: "var(--accent)" }}>
          ← {prospect.campaign.name}
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-xl font-semibold">{prospect.companyName}</h1>
          <span className="badge">score {prospect.score}</span>
        </div>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          {[prospect.city, prospect.province, prospect.region, prospect.country]
            .filter(Boolean)
            .join(", ")}
          {prospect.sector && ` · ${prospect.sector}`}
          {prospect.companySizeEstimate && ` · ${prospect.companySizeEstimate}`}
        </p>
        {prospect.website && (
          <a
            href={prospect.website}
            target="_blank"
            rel="noreferrer"
            className="text-sm"
            style={{ color: "var(--accent)" }}
          >
            {prospect.website}
          </a>
        )}
      </div>

      <section className="card flex flex-col gap-2">
        <h2 className="font-semibold">Por qué es buen prospecto</h2>
        <p className="text-sm">{prospect.reasonSummary}</p>
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="font-semibold">Desglose del score</h2>
        {prospect.criteriaScores.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Sin desglose registrado.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {prospect.criteriaScores.map((cs) => (
              <li key={cs.id} className="border-l-2 pl-3" style={{ borderColor: "var(--accent)" }}>
                <p className="text-sm font-medium">
                  {cs.criterion.label} — {cs.pointsAwarded} pts
                </p>
                {cs.evidenceText && (
                  <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
                    {cs.evidenceText}
                  </p>
                )}
                {cs.evidenceSourceUrl && (
                  <a
                    href={cs.evidenceSourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs"
                    style={{ color: "var(--accent)" }}
                  >
                    fuente ↗
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="font-semibold">Contacto</h2>
        {contact?.found ? (
          <div className="text-sm flex flex-col gap-1">
            <p>
              <strong>{contact.name ?? "Nombre no encontrado"}</strong>
              {contact.role && ` — ${contact.role}`}
            </p>
            {contact.email && (
              <p>
                Email: {contact.email}{" "}
                {contact.emailSourceUrl && (
                  <a href={contact.emailSourceUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
                    (fuente ↗)
                  </a>
                )}
              </p>
            )}
            {contact.phone && <p>Teléfono: {contact.phone}</p>}
            {contact.linkedinUrl && (
              <a href={contact.linkedinUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
                LinkedIn ↗
              </a>
            )}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            No se encontró contacto en fuentes públicas.
          </p>
        )}
      </section>

      <section className="card flex flex-col gap-2">
        <h2 className="font-semibold">Fuentes</h2>
        {prospect.sources.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Sin fuentes registradas.
          </p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {prospect.sources.map((s) => (
              <li key={s.id}>
                <a href={s.url} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
                  {s.title ?? s.url}
                </a>
                {s.note && (
                  <span style={{ color: "var(--muted)" }}> — {s.note}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {prospect.emailDrafts.length > 0 && (
        <section className="card flex flex-col gap-3">
          <h2 className="font-semibold">Borradores de email (nunca enviados automáticamente)</h2>
          {prospect.emailDrafts.map((d) => (
            <div key={d.id} className="border rounded-lg p-3" style={{ borderColor: "var(--border)" }}>
              <p className="text-sm font-medium">{d.subject}</p>
              <p className="text-sm whitespace-pre-wrap mt-1">{d.body}</p>
              <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
                {d.deliveryMethod === "eml"
                  ? `Guardado como .eml${d.filePath ? `: ${d.filePath}` : ""}`
                  : "Borrador creado en Outlook"}
              </p>
            </div>
          ))}
        </section>
      )}

      <section className="card flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-semibold text-sm">Estado de contacto</h2>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Lo actualizás vos a mano — nunca cambia solo.
          </p>
        </div>
        <form action={boundUpdateStatus} className="flex items-center gap-2">
          <select name="contactStatus" defaultValue={prospect.contactStatus} className="select">
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary">
            Guardar
          </button>
        </form>
      </section>
    </div>
  );
}
