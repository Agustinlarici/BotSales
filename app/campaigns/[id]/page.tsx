import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { addCriterion, deleteCriterion, deleteCampaign } from "@/lib/actions";
import CopySummaryButton from "@/components/CopySummaryButton";

export const dynamic = "force-dynamic";

function scoreColor(score: number) {
  if (score >= 70) return { background: "#dcfce7", color: "#166534" };
  if (score >= 40) return { background: "#fef9c3", color: "#854d0e" };
  return { background: "#fee2e2", color: "#991b1b" };
}

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaignId = Number(id);

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      criteria: { orderBy: { id: "asc" } },
      prospects: {
        orderBy: { score: "desc" },
        include: { contacts: true },
      },
      _count: { select: { runs: true } },
    },
  });
  if (!campaign) notFound();

  const totalWeight = campaign.criteria.reduce((sum, c) => sum + c.weight, 0);
  const boundAddCriterion = addCriterion.bind(null, campaignId);
  const boundDeleteCampaign = deleteCampaign.bind(null, campaignId);

  const summaryText = `Campaña: ${campaign.name} (id ${campaignId})

Qué vendo:
- Producto/servicio: ${campaign.productTitle}
- Descripción: ${campaign.productDescription}

Dónde buscar:
- País: ${campaign.country}
- Región: ${campaign.region ?? "—"}
- Provincia: ${campaign.province ?? "—"}
- Ciudad: ${campaign.city ?? "—"}
- Radio (km): ${campaign.radiusKm ?? "—"}

Qué empresas:
- Sector: ${campaign.sector ?? "—"}
- Tamaño: ${campaign.companySize ?? "—"}
- Palabras clave: ${campaign.keywords || "—"}

Contacto objetivo (cargos): ${campaign.targetRoles || "—"}

Límites:
- Máx. empresas: ${campaign.maxCompanies}
- Score mínimo: ${campaign.minScoreThreshold}

Criterios (id · peso · etiqueta):
${
  campaign.criteria.length === 0
    ? "(sin criterios cargados)"
    : campaign.criteria
        .map((c) => `- id ${c.id} · peso ${c.weight} · ${c.label}${c.description ? ` — ${c.description}` : ""}`)
        .join("\n")
}

Corré esta campaña: buscá hasta ${campaign.maxCompanies} empresas reales que matcheen esto, investigalas con fuentes públicas, puntualas según estos criterios (con evidencia y URL fuente para cada punto), buscá contacto y email, y guardá los resultados en pending-runs/ con push.`;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">
            {campaign.name} <span className="badge">id {campaignId}</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            {campaign.productTitle} ·{" "}
            {[campaign.city, campaign.province, campaign.region, campaign.country]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/campaigns/${campaignId}/runs`} className="btn">
            Historial de corridas ({campaign._count.runs})
          </Link>
          <Link href={`/campaigns/${campaignId}/edit`} className="btn">
            Editar campaña
          </Link>
          <a href={`/api/export/${campaignId}?format=csv`} className="btn">
            Exportar CSV
          </a>
          <a href={`/api/export/${campaignId}?format=xlsx`} className="btn">
            Exportar Excel
          </a>
        </div>
      </div>

      <section className="card flex flex-col gap-3">
        <h2 className="font-semibold">Cómo correr esta campaña</h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Esta app no busca sola. Copiá el resumen (botón abajo) y pegaselo a
          Claude en el chat — ya trae todo lo que necesita: qué vendés,
          dónde buscar y los criterios con su id.
        </p>
        <div>
          <CopySummaryButton text={summaryText} />
        </div>
      </section>

      <section className="card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">
            Criterios de &quot;buen prospecto&quot; (peso total: {totalWeight})
          </h2>
        </div>
        {campaign.criteria.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Todavía no cargaste criterios. Sin al menos uno, el score no se
            puede calcular.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {campaign.criteria.map((c) => {
              const boundDelete = deleteCriterion.bind(null, campaignId, c.id);
              return (
                <li
                  key={c.id}
                  className="flex items-start justify-between gap-3 border rounded-lg px-3 py-2"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div>
                    <p className="text-sm font-medium">
                      {c.label} <span className="badge ml-1">peso {c.weight}</span>{" "}
                      <span className="badge ml-1">id {c.id}</span>
                    </p>
                    {c.description && (
                      <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                        {c.description}
                      </p>
                    )}
                  </div>
                  <form action={boundDelete}>
                    <button type="submit" className="btn btn-danger">
                      Quitar
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}

        <form action={boundAddCriterion} className="grid gap-3 sm:grid-cols-[2fr_3fr_1fr_auto] items-end">
          <div>
            <label className="field-label" htmlFor="label">
              Criterio
            </label>
            <input
              id="label"
              name="label"
              required
              className="input"
              placeholder="Ej. Usa un ERP viejo"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="description">
              Descripción (opcional)
            </label>
            <input id="description" name="description" className="input" />
          </div>
          <div>
            <label className="field-label" htmlFor="weight">
              Peso
            </label>
            <input
              id="weight"
              name="weight"
              type="number"
              min={1}
              max={100}
              defaultValue={10}
              className="input"
            />
          </div>
          <button type="submit" className="btn btn-primary h-fit">
            Agregar
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">
          Prospectos ({campaign.prospects.length})
        </h2>
        {campaign.prospects.length === 0 ? (
          <p className="text-sm card" style={{ color: "var(--muted)" }}>
            Todavía no hay prospectos guardados para esta campaña. Corré la
            campaña (ver arriba) para que aparezcan acá.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Score</th>
                  <th>Empresa</th>
                  <th>Ubicación</th>
                  <th>Motivo</th>
                  <th>Contacto</th>
                  <th>Email</th>
                  <th>Web</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {campaign.prospects.map((p) => {
                  const contact = p.contacts[0];
                  return (
                    <tr key={p.id}>
                      <td>
                        <span
                          className="badge"
                          style={{ ...scoreColor(p.score), borderColor: "transparent" }}
                        >
                          {p.score}
                        </span>
                      </td>
                      <td>
                        <Link
                          href={`/campaigns/${campaignId}/prospects/${p.id}`}
                          className="font-medium"
                          style={{ color: "var(--accent)" }}
                        >
                          {p.companyName}
                        </Link>
                      </td>
                      <td>{[p.city, p.province, p.country].filter(Boolean).join(", ")}</td>
                      <td className="max-w-xs">
                        <span className="line-clamp-2">{p.reasonSummary}</span>
                      </td>
                      <td>{contact?.name ?? "No encontrado"}</td>
                      <td>{contact?.email ?? "No encontrado"}</td>
                      <td>
                        {p.website ? (
                          <a href={p.website} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
                            sitio
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <span className="badge">{p.contactStatus}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm">Zona de riesgo</h2>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Borra la campaña, sus criterios, corridas y prospectos guardados.
          </p>
        </div>
        <form action={boundDeleteCampaign}>
          <button type="submit" className="btn btn-danger">
            Borrar campaña
          </button>
        </form>
      </section>
    </div>
  );
}
