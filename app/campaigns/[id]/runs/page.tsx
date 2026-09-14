import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function RunsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaignId = Number(id);
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) notFound();

  const runs = await prisma.run.findMany({
    where: { campaignId },
    orderBy: { startedAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/campaigns/${campaignId}`} className="text-sm" style={{ color: "var(--accent)" }}>
        ← {campaign.name}
      </Link>
      <h1 className="text-xl font-semibold">Historial de corridas</h1>

      {runs.length === 0 ? (
        <p className="text-sm card" style={{ color: "var(--muted)" }}>
          Todavía no se corrió esta campaña.
        </p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Estado</th>
                <th>Evaluadas</th>
                <th>Nuevas</th>
                <th>Duplicadas</th>
                <th>Descartadas</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.startedAt).toLocaleString("es-AR")}</td>
                  <td>{r.finishedAt ? new Date(r.finishedAt).toLocaleString("es-AR") : "—"}</td>
                  <td>
                    <span className="badge">{r.status}</span>
                  </td>
                  <td>{r.companiesFound}</td>
                  <td>{r.companiesAdded}</td>
                  <td>{r.companiesDuplicate}</td>
                  <td>{r.companiesRejected}</td>
                  <td className="max-w-xs">{r.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
