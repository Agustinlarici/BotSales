import { NextRequest, NextResponse } from "next/server";

// Protege toda la app (UI + API) con una contraseña compartida, ya que
// ahora corre en una URL pública. Sin esto, cualquiera con el link podría
// ver o borrar tus campañas y prospectos.
export function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    return new NextResponse(
      "Falta configurar la variable de entorno APP_PASSWORD en Railway antes de usar la app.",
      { status: 500 }
    );
  }

  const auth = req.headers.get("authorization");
  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = Buffer.from(encoded, "base64").toString("utf-8");
      const separatorIndex = decoded.indexOf(":");
      const suppliedPassword = decoded.slice(separatorIndex + 1);
      if (suppliedPassword === password) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Autenticación requerida.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Prospección B2B"' },
  });
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
