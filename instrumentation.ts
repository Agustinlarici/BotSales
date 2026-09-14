export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { processPendingImports } = await import("./lib/processPendingImports");
    await processPendingImports();
  }
}
