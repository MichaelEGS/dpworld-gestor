"use client";

import { useState } from "react";
import { ImageDown } from "lucide-react";

export default function ExportImageButton({ date }: { date: string }) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const el = document.getElementById("print-document");
      if (!el) return;

      const canvas = await html2canvas(el, {
        scale: 2, // retina quality
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const link = document.createElement("a");
      link.download = `asignaciones-${date}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
    >
      <ImageDown size={15} />
      {loading ? "Exportando..." : "Exportar imagen"}
    </button>
  );
}
