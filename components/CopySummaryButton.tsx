"use client";

import { useState } from "react";

export default function CopySummaryButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Portapapeles no disponible (ej. http sin permisos): mostramos el texto para copiar a mano.
      window.prompt("Copiá este texto manualmente:", text);
    }
  }

  return (
    <button type="button" onClick={handleClick} className="btn btn-primary">
      {copied ? "¡Copiado!" : "Copiar resumen para Claude"}
    </button>
  );
}
