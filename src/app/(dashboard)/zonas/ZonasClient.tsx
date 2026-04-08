"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Check, X } from "lucide-react";
import { createZone, updateZoneName, deleteZone, moveZone } from "@/app/actions/zones";

type Zone = { id: number; name: string; displayOrder: number; isSubZone: boolean };

export default function ZonasClient({ zones: initial }: { zones: Zone[] }) {
  const [zones, setZones] = useState(initial);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [newName, setNewName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startEdit(zone: Zone) {
    setEditingId(zone.id);
    setEditingValue(zone.name);
    setError(null);
  }

  function handleSaveEdit(id: number) {
    if (!editingValue.trim()) { setEditingId(null); return; }
    startTransition(async () => {
      await updateZoneName(id, editingValue.trim());
      setZones((prev) => prev.map((z) => z.id === id ? { ...z, name: editingValue.trim() } : z));
      setEditingId(null);
    });
  }

  function handleCreate() {
    if (!newName.trim()) return;
    startTransition(async () => {
      await createZone(newName.trim());
      setNewName("");
      setShowNew(false);
      // Page will revalidate; for optimistic update just append
      setZones((prev) => [
        ...prev,
        { id: Date.now(), name: newName.trim(), displayOrder: prev.length + 1, isSubZone: false },
      ]);
    });
  }

  function handleDelete(id: number) {
    setError(null);
    startTransition(async () => {
      try {
        await deleteZone(id);
        setZones((prev) => prev.filter((z) => z.id !== id));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error al eliminar");
      }
    });
  }

  function handleMove(id: number, direction: "up" | "down") {
    startTransition(async () => {
      await moveZone(id, direction);
      setZones((prev) => {
        const arr = [...prev];
        const idx = arr.findIndex((z) => z.id === id);
        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= arr.length) return arr;
        [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
        return arr;
      });
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Orden</span>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex-1 ml-4">Nombre</span>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</span>
        </div>

        <div className="divide-y divide-slate-100">
          {zones.map((zone, idx) => (
            <div key={zone.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
              {/* Reorder */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => handleMove(zone.id, "up")}
                  disabled={isPending || idx === 0}
                  className="p-0.5 rounded text-slate-300 hover:text-slate-600 disabled:opacity-20 transition-colors"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => handleMove(zone.id, "down")}
                  disabled={isPending || idx === zones.length - 1}
                  className="p-0.5 rounded text-slate-300 hover:text-slate-600 disabled:opacity-20 transition-colors"
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              {/* Name */}
              <div className="flex-1">
                {editingId === zone.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit(zone.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="flex-1 border border-blue-400 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={() => handleSaveEdit(zone.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${zone.isSubZone ? "text-slate-500 italic" : "text-slate-800"}`}>
                      {zone.name}
                    </span>
                    {zone.isSubZone && (
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">especial</span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              {editingId !== zone.id && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => startEdit(zone)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Renombrar zona"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(zone.id)}
                    disabled={isPending}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                    title="Eliminar zona"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add new zone */}
      {showNew ? (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowNew(false); }}
            placeholder="Nombre de la nueva zona"
            className="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim() || isPending}
            className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Plus size={14} />
            Crear
          </button>
          <button onClick={() => setShowNew(false)} className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus size={15} />
          Agregar zona
        </button>
      )}
    </div>
  );
}
