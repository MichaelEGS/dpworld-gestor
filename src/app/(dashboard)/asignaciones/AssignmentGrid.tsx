"use client";

import { useState, useTransition } from "react";
import { Plus, X, ChevronDown, Pencil } from "lucide-react";
import { getDay, parseISO } from "date-fns";
import {
  addAssignment,
  removeAssignment,
  addSupervisorAssignment,
  removeSupervisorAssignment,
  updateShiftLabel,
} from "@/app/actions/assignments";
import { DEFAULT_SHIFTS } from "@/lib/constants";

const MAINTENANCE_SHIFT = "TODO EL DIA";
const SUPERVISOR_AREAS = [
  "TODOS LOS ALMACENES",
  "TRANSITO",
  "IMPORT",
] as const;

type Employee = {
  id: number;
  name: string;
  role: string;
  daysOffWeekly?: { dayOfWeek: number }[];
  daysOffSpecific?: { date: string }[];
};
type Zone = { id: number; name: string; displayOrder: number; isSubZone: boolean };
type Assignment = {
  id: number;
  employeeId: number;
  zoneId: number;
  shiftTime: string;
  notes: string | null;
  employee: Employee;
};
type SupervisorAssignment = {
  id: number;
  employeeId: number;
  area: string;
  shiftTime: string;
  notes: string | null;
  employee: Employee;
};

interface Props {
  date: string;
  zones: Zone[];
  assignments: Assignment[];
  supervisorAssignments: SupervisorAssignment[];
  employees: Employee[];
  shiftColumns: string[];
}

interface ModalState {
  type: "zone" | "supervisor";
  zoneId?: number;
}

// Returns true if the employee has the day off on the given date
function hasDayOff(emp: Employee, date: string): boolean {
  const dayOfWeek = getDay(parseISO(date)); // 0=Dom, 1=Lun, ..., 6=Sáb
  if (emp.daysOffWeekly?.some((d) => d.dayOfWeek === dayOfWeek)) return true;
  if (emp.daysOffSpecific?.some((d) => d.date === date)) return true;
  return false;
}

export default function AssignmentGrid({
  date,
  zones,
  assignments,
  supervisorAssignments,
  employees,
  shiftColumns,
}: Props) {
  const [modal, setModal] = useState<ModalState | null>(null);
  const [selectedShift, setSelectedShift] = useState<string>(shiftColumns[0] ?? DEFAULT_SHIFTS[0]);
  const [useCustomShift, setUseCustomShift] = useState(false);
  const [customShiftValue, setCustomShiftValue] = useState("");
  const [showReforzando, setShowReforzando] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string>(SUPERVISOR_AREAS[0]);
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  // Editable column headers
  const [editingShift, setEditingShift] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  function saveShiftEdit() {
    if (!editingShift || !editingValue.trim() || editingValue === editingShift) {
      setEditingShift(null);
      return;
    }
    startTransition(async () => {
      await updateShiftLabel(date, editingShift, editingValue.trim());
      setEditingShift(null);
    });
  }

  // Effective shift used when submitting
  const effectiveShift = useCustomShift ? customShiftValue : selectedShift;

  // All shift columns: from server prop + any custom-timed assignments not yet in config
  const allShiftColumns = (() => {
    const extra = [...new Set(assignments.map((a) => a.shiftTime))].filter(
      (s) => !shiftColumns.includes(s) && s !== MAINTENANCE_SHIFT
    );
    return [...shiftColumns, ...extra];
  })();

  // IDs of supervisors already assigned today (any shift)
  const assignedSupervisorIds = new Set(supervisorAssignments.map((sa) => sa.employeeId));

  function openModal(state: ModalState) {
    setModal(state);
    setNotes("");
    setShowReforzando(false);
    setUseCustomShift(false);
    setCustomShiftValue("");
  }

  function handleAddZone(zoneId: number) {
    openModal({ type: "zone", zoneId });
  }

  function handleAddSupervisor() {
    openModal({ type: "supervisor" });
    setSelectedArea(SUPERVISOR_AREAS[0]);
  }

  function handleEmployeeSelect(employeeId: number) {
    if (!modal) return;
    const fd = new FormData();
    fd.append("date", date);
    fd.append("employeeId", String(employeeId));
    fd.append("shiftTime", effectiveShift);
    if (notes) fd.append("notes", notes);

    startTransition(async () => {
      if (modal.type === "zone" && modal.zoneId) {
        fd.append("zoneId", String(modal.zoneId));
        await addAssignment(fd);
      } else if (modal.type === "supervisor") {
        fd.append("area", selectedArea);
        await addSupervisorAssignment(fd);
      }
      setModal(null);
    });
  }

  function handleRemove(id: number) {
    startTransition(() => removeAssignment(id));
  }

  function handleRemoveSupervisor(id: number) {
    startTransition(() => removeSupervisorAssignment(id));
  }

  function getZoneShiftAssignments(zoneId: number, shift: string) {
    return assignments.filter(
      (a) => a.zoneId === zoneId && a.shiftTime === shift
    );
  }

  // ── Available employees for the modal ──────────────────────────────
  const availableEmployees = (() => {
    // When reforzando mode is OFF, hide employees with days off (default behavior)
    const base = showReforzando
      ? employees
      : employees.filter((e) => !hasDayOff(e, date));

    if (modal?.type === "zone") {
      if (effectiveShift === MAINTENANCE_SHIFT) {
        const assignedToday = new Set(assignments.map((a) => a.employeeId));
        return base.filter(
          (e) => e.role === "mantenimiento" && !assignedToday.has(e.id)
        );
      }
      return base.filter(
        (e) =>
          !assignments.some(
            (a) => a.employeeId === e.id && a.shiftTime === effectiveShift
          )
      );
    } else {
      return base.filter(
        (e) =>
          e.role === "supervisor_cargo" && !assignedSupervisorIds.has(e.id)
      );
    }
  })();

  const maintenanceZone = zones.find((z) => z.isSubZone);
  const regularZones = zones.filter((z) => !z.isSubZone);
  const maintenanceAssignment = maintenanceZone
    ? assignments.find(
        (a) => a.zoneId === maintenanceZone.id && a.shiftTime === MAINTENANCE_SHIFT
      )
    : null;

  return (
    <div id="assignments-grid" className="space-y-5">
      {/* ── Sección Supervisores ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-blue-600 rounded-t-xl">
          <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
            Supervisores
          </h2>
          <button
            onClick={handleAddSupervisor}
            className="flex items-center gap-1 text-xs text-blue-100 hover:text-white transition-colors border border-blue-400 hover:border-white rounded-md px-2 py-1"
          >
            <Plus size={13} />
            Agregar
          </button>
        </div>

        {supervisorAssignments.length === 0 ? (
          <p className="text-sm text-slate-400 px-4 py-4 italic">
            Sin supervisores asignados para este día
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {supervisorAssignments.map((sa) => {
              const isReforzando = hasDayOff(sa.employee, date);
              return (
              <div
                key={sa.id}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-semibold text-slate-800">
                    {sa.employee.name}
                    {isReforzando && (
                      <span className="ml-1.5 text-[10px] font-bold text-amber-500" title="Reforzando">★ Reforzando</span>
                    )}
                  </span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-medium border border-blue-200">
                    {sa.area}
                  </span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {sa.shiftTime}
                  </span>
                  {sa.notes && (
                    <span className="text-xs text-slate-400 italic">
                      {sa.notes}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveSupervisor(sa.id)}
                  disabled={isPending}
                  className="text-slate-300 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50"
                >
                  <X size={14} />
                </button>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Grid de Zonas ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Header row */}
        <div
          className="border-b border-slate-200 bg-slate-50"
          style={{ display: "grid", gridTemplateColumns: `220px ${allShiftColumns.map(() => "1fr").join(" ")}` }}
        >
          <div className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">
            Zona
          </div>
          {allShiftColumns.map((shift) => (
            <div
              key={shift}
              className="px-2 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider border-l border-slate-200 text-center"
            >
              {editingShift === shift ? (
                <input
                  autoFocus
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onBlur={saveShiftEdit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveShiftEdit();
                    if (e.key === "Escape") setEditingShift(null);
                  }}
                  className="w-full text-center text-xs font-bold bg-white border border-blue-400 rounded px-1 py-0.5 outline-none"
                />
              ) : (
                <button
                  onDoubleClick={() => { setEditingShift(shift); setEditingValue(shift); }}
                  className="group inline-flex items-center gap-1 hover:text-blue-600 transition-colors"
                  title="Doble clic para editar el turno"
                >
                  {shift}
                  <Pencil size={9} className="opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Zone rows */}
        {regularZones.map((zone, idx) => (
          <div
            key={zone.id}
            className={`border-b border-slate-100 last:border-0 ${
              idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"
            }`}
            style={{ display: "grid", gridTemplateColumns: `220px ${allShiftColumns.map(() => "1fr").join(" ")}` }}
          >
            {/* Zone name */}
            <div className="px-4 py-3 flex items-start border-r border-slate-100">
              <span className="text-sm leading-snug text-slate-800 font-semibold">
                {zone.name}
              </span>
            </div>

            {/* Shift cells */}
            {allShiftColumns.map((shift) => {
              const cellAssignments = getZoneShiftAssignments(zone.id, shift);
              return (
                <div
                  key={shift}
                  className="px-3 py-2 border-l border-slate-100 min-h-[56px] flex flex-col gap-1.5"
                >
                  {cellAssignments.map((a) => {
                    const isReforzando = hasDayOff(a.employee, date);
                    const isMontacargista = a.employee.role === "montacargista";
                    const chipClass = isReforzando
                      ? "bg-amber-50 border-amber-300"
                      : isMontacargista
                      ? "bg-green-50 border-green-200"
                      : "bg-blue-50 border-blue-200";
                    const textClass = isReforzando
                      ? "text-amber-900"
                      : isMontacargista
                      ? "text-green-900"
                      : "text-blue-900";
                    const xClass = isReforzando
                      ? "text-amber-300"
                      : isMontacargista
                      ? "text-green-300"
                      : "text-blue-300";
                    return (
                      <div
                        key={a.id}
                        title={isReforzando ? "Reforzando (día de descanso)" : isMontacargista ? "Montacargista" : undefined}
                        className={`group flex items-center justify-between rounded-md px-2 py-1 border ${chipClass}`}
                      >
                        <span className={`text-xs font-medium truncate ${textClass}`}>
                          {a.employee.name}
                          {isReforzando && <span className="ml-1 text-[10px] font-bold text-amber-600">★</span>}
                          {isMontacargista && !isReforzando && <span className="ml-1 text-[10px] font-bold text-green-600">MTC</span>}
                        </span>
                        <button
                          onClick={() => handleRemove(a.id)}
                          disabled={isPending}
                          className={`transition-colors ml-1 shrink-0 group-hover:text-red-500 ${xClass}`}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                  <button
                    onClick={() => {
                      setSelectedShift(shift);
                      openModal({ type: "zone", zoneId: zone.id });
                    }}
                    className="flex items-center justify-center w-6 h-6 rounded-md text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title={`Agregar a ${zone.name} — ${shift}`}
                  >
                    <Plus size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Mantenimiento (persona única todo el día) ────────────── */}
      {maintenanceZone && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-600 rounded-t-xl">
            <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
              Mantenimiento
            </h2>
            {!maintenanceAssignment && (
              <button
                onClick={() => {
                  setSelectedShift(MAINTENANCE_SHIFT);
                  handleAddZone(maintenanceZone.id);
                }}
                className="flex items-center gap-1 text-xs text-slate-200 hover:text-white transition-colors border border-slate-400 hover:border-white rounded-md px-2 py-1"
              >
                <Plus size={13} />
                Agregar
              </button>
            )}
          </div>

          {!maintenanceAssignment ? (
            <p className="text-sm text-slate-400 px-4 py-4 italic">
              Sin personal de mantenimiento asignado para este día
            </p>
          ) : (
            <div className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-800">
                  {maintenanceAssignment.employee.name}
                </span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  Todo el día
                </span>
              </div>
              <button
                onClick={() => handleRemove(maintenanceAssignment.id)}
                disabled={isPending}
                className="text-slate-300 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Modal ────────────────────────────────────────────────── */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">
                {modal.type === "zone"
                  ? `Asignar a ${zones.find((z) => z.id === modal.zoneId)?.name}`
                  : "Asignar supervisor"}
              </h3>
              <button
                onClick={() => { setModal(null); setShowReforzando(false); setUseCustomShift(false); }}
                className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Turno — for regular zones and supervisors */}
              {((modal.type === "zone" && effectiveShift !== MAINTENANCE_SHIFT) ||
                modal.type === "supervisor") && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Turno
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {shiftColumns.map((s) => (
                      <button
                        key={s}
                        onClick={() => { setSelectedShift(s); setUseCustomShift(false); }}
                        className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${
                          !useCustomShift && selectedShift === s
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                    <button
                      onClick={() => setUseCustomShift(true)}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${
                        useCustomShift
                          ? "bg-slate-700 text-white border-slate-700 shadow-sm"
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      Otro
                    </button>
                  </div>
                  {useCustomShift && (
                    <input
                      autoFocus
                      type="text"
                      value={customShiftValue}
                      onChange={(e) => setCustomShiftValue(e.target.value)}
                      placeholder="ej: 7:00 AM"
                      className="mt-2 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              )}

              {/* Área (solo supervisores) */}
              {modal.type === "supervisor" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Área
                  </label>
                  <div className="relative">
                    <select
                      value={selectedArea}
                      onChange={(e) => setSelectedArea(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {SUPERVISOR_AREAS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                  </div>
                </div>
              )}

              {/* Notas */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Notas{" "}
                  <span className="font-normal normal-case text-slate-400">
                    (opcional)
                  </span>
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ej: permiso DPW pagando día feriado"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Toggle reforzando */}
              {modal.type === "zone" && (
                <button
                  type="button"
                  onClick={() => setShowReforzando((v) => !v)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                    showReforzando
                      ? "bg-amber-50 border-amber-300 text-amber-800"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-700"
                  }`}
                >
                  <span>★ Mostrar personal en día libre (Reforzando)</span>
                  <span className={`w-4 h-4 rounded-full border-2 transition-colors ${showReforzando ? "bg-amber-500 border-amber-500" : "border-slate-300"}`} />
                </button>
              )}

              {/* Lista de empleados */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Seleccionar empleado
                </label>
                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                  {availableEmployees.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8 italic">
                      Sin empleados disponibles
                    </p>
                  ) : (
                    availableEmployees.map((emp) => {
                      const isDayOff = hasDayOff(emp, date);
                      return (
                      <button
                        key={emp.id}
                        onClick={() => handleEmployeeSelect(emp.id)}
                        disabled={isPending}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors disabled:opacity-50 first:rounded-t-xl last:rounded-b-xl ${
                          isDayOff ? "hover:bg-amber-50" : "hover:bg-blue-50"
                        }`}
                      >
                        <span className={`text-sm font-medium ${isDayOff ? "text-amber-800" : "text-slate-800"}`}>
                          {emp.name}
                          {isDayOff && <span className="ml-1.5 text-[10px] font-bold text-amber-500">★ Reforzando</span>}
                        </span>
                        <span className="text-xs text-slate-400 capitalize">
                          {emp.role.replace("_", " ")}
                        </span>
                      </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
