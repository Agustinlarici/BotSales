import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ImportsLogPage() {
  const files = await prisma.processedImportFile.findMany({
    orderBy: { processedAt: "desc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Log de imports</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Cada vez que Claude hace push de un archivo a{" "}
          <code>pending-runs/</code> o <code>pending-drafts/</code>, la app lo
          procesa al arrancar (después del deploy) y queda registrado acá —
          incluso si falló, para poder diagnosticarlo.
        </p>
      </div>

      {files.length === 0 ? (
        <p className="text-sm card" style={{ color: "var(--muted)" }}>
          Todavía no se procesó ningún archivo.
        </p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Archivo</th>
                <th>Estado</th>
                <th>Detalle</th>
                <th>Procesado</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.id}>
                  <td>{f.filename}</td>
                  <td>
                    <span
                      className="badge"
                      style={
                        f.status === "ok"
                          ? { background: "#dcfce7", color: "#166534", borderColor: "transparent" }
                          : { background: "#fee2e2", color: "#991b1b", borderColor: "transparent" }
                      }
                    >
                      {f.status}
                    </span>
                  </td>
                  <td className="max-w-md">{f.detail ?? "—"}</td>
                  <td>{new Date(f.processedAt).toLocaleString("es-AR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
