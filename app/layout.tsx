import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Prospección B2B",
  description: "Bot personal de prospección B2B.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b" style={{ borderColor: "var(--border)" }}>
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-semibold tracking-tight">
              Prospección B2B
            </Link>
            <nav className="text-sm flex items-center gap-3">
              <Link href="/admin/imports" style={{ color: "var(--muted)" }}>
                Log de imports
              </Link>
              <Link href="/campaigns/new" className="btn btn-primary">
                + Nueva campaña
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="text-xs px-4 py-6 text-center" style={{ color: "var(--muted)" }}>
          Datos en Postgres — nada se envía a ningún servicio externo ni se
          contacta a nadie automáticamente.
        </footer>
      </body>
    </html>
  );
}
