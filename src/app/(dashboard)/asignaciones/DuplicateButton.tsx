"use client";

import { useState, useTransition, useRef } from "react";
import { Copy, X } from "lucide-react";
import { duplicateAssignments } from "@/app/actions/assignments";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export default function DuplicateButton({ currentDate }: { currentDate: string }) {
  const [open, setOpen] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDuplicate() {
    if (!fromDate) return;
    startTransition(async () => {
      const res = await duplicateAssignments(fromDate, currentDate);
      setResult(`✓ ${res?.copied ?? 0} asignaciones copiadas desde ${format(parseISO(fromDate), "d 'de' MMMM", { locale: es })}`);
      setFromDate("");
    });
  }

  function handleClose() {
    setOpen(false);
    setResult(null);
    setFromDate("");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-lg shadow-sm transition-colors"
        title="Copiar asignaciones de otro día"
      >
        <Copy size={13} />
        Duplicar del...
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={handleClose}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Duplicar asignación</h3>
              <button onClick={handleClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-500">
                Selecciona el día de origen. Las asignaciones se copiarán al{" "}
                <span className="font-semibold text-slate-700 capitalize">
                  {format(parseISO(currentDate), "d 'de' MMMM", { locale: es })}
                </span>.
                <br />
                <span className="text-xs text-slate-400 mt-1 block">
                  Las asignaciones que ya existen en el destino no se sobreescriben.
                </span>
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Día de origen
                </label>
                <input
                  ref={inputRef}
                  type="date"
                  value={fromDate}
                  max={currentDate}
                  onChange={(e) => { setFromDate(e.target.value); setResult(null); }}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {result && (
                <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  {result}
                </p>
              )}

              <button
                onClick={handleDuplicate}
                disabled={!fromDate || isPending}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Copy size={14} />
                {isPending ? "Copiando..." : "Duplicar asignación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
