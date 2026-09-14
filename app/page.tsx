import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { prospects: true, runs: true } },
      runs: { orderBy: { startedAt: "desc" }, take: 1 },
    },
  });

  if (campaigns.length === 0) {
    return (
      <div className="card text-center py-16">
        <h1 className="text-xl font-semibold mb-2">Todavía no tenés campañas</h1>
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          Una campaña define qué vendés, dónde buscar, qué hace bueno a un
          prospecto y qué contacto buscar. Creá la primera para arrancar.
        </p>
        <Link href="/campaigns/new" className="btn btn-primary">
          + Nueva campaña
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Tus campañas</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {campaigns.map((c) => {
          const lastRun = c.runs[0];
          return (
            <Link
              key={c.id}
              href={`/campaigns/${c.id}`}
              className="card flex flex-col gap-2 hover:border-[var(--accent)]"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold">{c.name}</h2>
                <span className="badge">{c._count.prospects} prospectos</span>
              </div>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                {c.productTitle}
              </p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {[c.city, c.province, c.region, c.country].filter(Boolean).join(", ")}
              </p>
              <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
                {lastRun
                  ? `Última corrida: ${new Date(lastRun.startedAt).toLocaleString("es-AR")}`
                  : "Todavía no se corrió ninguna vez"}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
