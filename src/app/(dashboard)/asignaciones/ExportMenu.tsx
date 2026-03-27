"use client";

import { useState, useRef, useEffect } from "react";
import { Download, FileSpreadsheet, Printer, ChevronDown, Loader2 } from "lucide-react";
import { toPng } from "html-to-image";

export default function ExportMenu({ date }: { date: string }) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function exportPng() {
    setOpen(false);
    setExporting(true);
    try {
      const el = document.getElementById("assignments-grid");
      if (!el) return;
      const dataUrl = await toPng(el, {
        pixelRatio: 2,
        backgroundColor: "#f8fafc",
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `asignaciones-${date}.png`;
      a.click();
    } finally {
      setExporting(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={exporting}
        className="flex items-center gap-1.5 bg-white border border-slate-300 text-slate-700 text-sm font-semibold px-3 py-2 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-sm disabled:opacity-60"
      >
        {exporting ? (
          <Loader2 size={14} className="animate-spin text-blue-500" />
        ) : (
          <Download size={14} />
        )}
        {exporting ? "Generando..." : "Exportar"}
        <ChevronDown
          size={13}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-20">
          <a
            href={`/api/export/excel?date=${date}`}
            download
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors"
          >
            <FileSpreadsheet size={16} className="text-emerald-600 shrink-0" />
            <div>
              <p className="font-semibold text-slate-800">Excel</p>
              <p className="text-xs text-slate-400">Archivo .xlsx</p>
            </div>
          </a>

          <button
            onClick={exportPng}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors text-left"
          >
            <svg className="w-4 h-4 text-purple-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div>
              <p className="font-semibold text-slate-800">Imagen PNG</p>
              <p className="text-xs text-slate-400">Captura del tablero</p>
            </div>
          </button>

          <div className="border-t border-slate-100 my-1" />

          <a
            href={`/print/${date}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors"
          >
            <Printer size={16} className="text-slate-400 shrink-0" />
            <div>
              <p className="font-semibold text-slate-800">Imprimir / PDF</p>
              <p className="text-xs text-slate-400">Vista de impresión</p>
            </div>
          </a>
        </div>
      )}
    </div>
  );
}
