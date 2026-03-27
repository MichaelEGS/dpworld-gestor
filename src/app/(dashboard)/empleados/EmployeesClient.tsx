"use client";

import { useState, useTransition } from "react";
import { Plus, X, Pencil, Check, UserX, UserCheck } from "lucide-react";
import {
  createEmployee,
  updateEmployee,
  toggleEmployeeActive,
  setDaysOffWeekly,
} from "@/app/actions/employees";

const ROLES = [
  { value: "operario", label: "Operario" },
  { value: "supervisor_cargo", label: "Supervisor de Carga" },
  { value: "mantenimiento", label: "Mantenimiento" },
] as const;

const DAYS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mié" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sáb" },
];

type Employee = {
  id: number;
  name: string;
  role: string;
  active: boolean;
  daysOffWeekly: { dayOfWeek: number }[];
  _count: { assignments: number };
};

interface Props {
  employees: Employee[];
}

export default function EmployeesClient({ employees }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [createError, setCreateError] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterActive, setFilterActive] = useState<string>("active");
  const [isPending, startTransition] = useTransition();

  const filtered = employees.filter((e) => {
    if (filterRole !== "all" && e.role !== filterRole) return false;
    if (filterActive === "active" && !e.active) return false;
    if (filterActive === "inactive" && e.active) return false;
    return true;
  });

  function handleCreate(formData: FormData) {
    setCreateError("");
    startTransition(async () => {
      const result = await createEmployee(formData);
      if (result?.error) {
        setCreateError(result.error);
      } else {
        setShowCreate(false);
      }
    });
  }

  function handleUpdate(id: number, formData: FormData) {
    startTransition(async () => {
      await updateEmployee(id, formData);
      setEditingId(null);
    });
  }

  function handleToggleActive(id: number, current: boolean) {
    startTransition(() => toggleEmployeeActive(id, !current));
  }

  function handleDaysOff(employeeId: number, days: number[]) {
    startTransition(() => setDaysOffWeekly(employeeId, days));
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {/* Filter active */}
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>

          {/* Filter role */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los roles</option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          <span className="text-sm text-slate-400">
            {filtered.length} empleado{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={15} />
          Nuevo empleado
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-blue-800 mb-4">
            Nuevo empleado
          </h3>
          <form action={handleCreate} className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-blue-700 mb-1">
                Nombre completo
              </label>
              <input
                name="name"
                type="text"
                required
                autoFocus
                className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                placeholder="APELLIDO NOMBRE"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-blue-700 mb-1">
                Rol
              </label>
              <select
                name="role"
                defaultValue="operario"
                className="border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Check size={14} />
                Crear
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setCreateError("");
                }}
                className="text-slate-500 hover:text-slate-700 p-2"
              >
                <X size={16} />
              </button>
            </div>
            {createError && (
              <p className="w-full text-sm text-red-600">{createError}</p>
            )}
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-12">
            Sin empleados con los filtros seleccionados
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Nombre
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Rol
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Días libres
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Asignaciones
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((emp) =>
                editingId === emp.id ? (
                  <EditRow
                    key={emp.id}
                    employee={emp}
                    onSave={(fd) => handleUpdate(emp.id, fd)}
                    onCancel={() => setEditingId(null)}
                    isPending={isPending}
                  />
                ) : (
                  <tr key={emp.id} className={emp.active ? "" : "opacity-50"}>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {emp.name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          emp.role === "supervisor_cargo"
                            ? "bg-purple-100 text-purple-700"
                            : emp.role === "mantenimiento"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {ROLES.find((r) => r.value === emp.role)?.label ??
                          emp.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <DaysOffSelector
                        currentDays={emp.daysOffWeekly.map((d) => d.dayOfWeek)}
                        onChange={(days) => handleDaysOff(emp.id, days)}
                        disabled={isPending}
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {emp._count.assignments}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setEditingId(emp.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() =>
                            handleToggleActive(emp.id, emp.active)
                          }
                          disabled={isPending}
                          className={`p-1.5 rounded-lg transition-colors ${
                            emp.active
                              ? "text-slate-400 hover:text-red-500 hover:bg-red-50"
                              : "text-slate-400 hover:text-green-600 hover:bg-green-50"
                          }`}
                          title={emp.active ? "Desactivar" : "Activar"}
                        >
                          {emp.active ? (
                            <UserX size={14} />
                          ) : (
                            <UserCheck size={14} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Edit Row ──────────────────────────────────────────────────────────
function EditRow({
  employee,
  onSave,
  onCancel,
  isPending,
}: {
  employee: Employee;
  onSave: (fd: FormData) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <tr className="bg-blue-50">
      <td className="px-4 py-2">
        <input
          form={`edit-${employee.id}`}
          name="name"
          defaultValue={employee.name}
          className="border border-slate-300 rounded-lg px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
        />
      </td>
      <td className="px-4 py-2">
        <select
          form={`edit-${employee.id}`}
          name="role"
          defaultValue={employee.role}
          className="border border-slate-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <input
          form={`edit-${employee.id}`}
          type="hidden"
          name="active"
          value={String(employee.active)}
        />
      </td>
      <td className="px-4 py-2 text-slate-400 text-xs">—</td>
      <td className="px-4 py-2 text-slate-400 text-xs">—</td>
      <td className="px-4 py-2">
        <form
          id={`edit-${employee.id}`}
          action={onSave}
          className="flex items-center gap-1 justify-end"
        >
          <button
            type="submit"
            disabled={isPending}
            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={14} />
          </button>
        </form>
      </td>
    </tr>
  );
}

// ── Days Off Selector ─────────────────────────────────────────────────
function DaysOffSelector({
  currentDays,
  onChange,
  disabled,
}: {
  currentDays: number[];
  onChange: (days: number[]) => void;
  disabled: boolean;
}) {
  const [days, setDays] = useState(currentDays);
  const [dirty, setDirty] = useState(false);

  function toggle(day: number) {
    const next = days.includes(day)
      ? days.filter((d) => d !== day)
      : [...days, day];
    setDays(next);
    setDirty(true);
  }

  return (
    <div className="flex items-center gap-1.5">
      {DAYS.map((d) => (
        <button
          key={d.value}
          type="button"
          onClick={() => toggle(d.value)}
          disabled={disabled}
          className={`w-7 h-7 text-xs rounded-md font-medium transition-colors ${
            days.includes(d.value)
              ? "bg-red-100 text-red-700 border border-red-200"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          {d.label}
        </button>
      ))}
      {dirty && (
        <button
          type="button"
          onClick={() => {
            onChange(days);
            setDirty(false);
          }}
          disabled={disabled}
          className="text-xs bg-blue-600 text-white px-2 py-1 rounded-md hover:bg-blue-700 transition-colors ml-1"
        >
          Guardar
        </button>
      )}
    </div>
  );
}
