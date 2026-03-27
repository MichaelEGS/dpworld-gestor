"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { format, addDays, subDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export default function DateNav({ date }: { date: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const current = parseISO(date);
  const isToday = date === format(new Date(), "yyyy-MM-dd");

  function navigate(d: Date) {
    router.push(`/asignaciones?date=${format(d, "yyyy-MM-dd")}`);
  }

  function openPicker() {
    if (inputRef.current) {
      try {
        inputRef.current.showPicker();
      } catch {
        inputRef.current.click();
      }
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Prev day */}
      <button
        onClick={() => navigate(subDays(current, 1))}
        className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-colors shadow-sm"
        title="Día anterior"
      >
        <ChevronLeft size={16} />
      </button>

      {/* Date pill — click opens calendar picker */}
      <button
        onClick={openPicker}
        className="relative flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm hover:border-blue-300 hover:shadow-md transition-all group"
        title="Seleccionar fecha"
      >
        <CalendarDays size={16} className="text-blue-500 shrink-0 group-hover:text-blue-600" />
        <span className="text-base font-semibold text-slate-800 capitalize select-none">
          {format(current, "EEEE d 'de' MMMM yyyy", { locale: es })}
        </span>
        {isToday && (
          <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium ml-1">
            Hoy
          </span>
        )}

        {/* Hidden native date input — positioned over button so showPicker() works */}
        <input
          ref={inputRef}
          type="date"
          value={date}
          onChange={(e) => e.target.value && navigate(parseISO(e.target.value))}
          className="absolute inset-0 opacity-0 w-full cursor-pointer"
          tabIndex={-1}
        />
      </button>

      {/* Next day */}
      <button
        onClick={() => navigate(addDays(current, 1))}
        className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-colors shadow-sm"
        title="Día siguiente"
      >
        <ChevronRight size={16} />
      </button>

      {!isToday && (
        <button
          onClick={() => navigate(new Date())}
          className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors"
        >
          Ir a hoy
        </button>
      )}
    </div>
  );
}
