import { redirect } from "next/navigation";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { getSession } from "@/app/actions/auth";
import { getAssignmentsData } from "@/app/actions/assignments";
import PrintButton from "./PrintButton";
import ExportImageButton from "./ExportImageButton";


interface Props {
  params: Promise<{ date: string }>;
}

export default async function PrintPage({ params }: Props) {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const { date } = await params;
  const { zones, assignments, supervisorAssignments, shiftColumns } =
    await getAssignmentsData(date);

  const dateLabel = format(parseISO(date), "EEEE d 'de' MMMM yyyy", {
    locale: es,
  });

  // Use configured shift columns for this day (includes any custom times)
  const SHIFTS = shiftColumns.filter((s) => s !== "TODO EL DIA");

  function getNames(zoneId: number, shift: string) {
    return assignments
      .filter((a) => a.zoneId === zoneId && a.shiftTime === shift)
      .map((a) => a.employee.name);
  }

  return (
    <div className="min-h-screen bg-white p-8 print:p-4">
      {/* Print controls — hidden when printing */}
      <div className="print:hidden flex items-center justify-between mb-6 pb-4 border-b">
        <div>
          <h2 className="font-semibold text-slate-800">Vista de impresión</h2>
          <p className="text-sm text-slate-500 capitalize">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/asignaciones?date=${date}`}
            className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            ← Volver
          </a>
          <ExportImageButton date={date} />
          <PrintButton />
        </div>
      </div>

      {/* Document */}
      <div id="print-document" className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center border-b-2 border-slate-800 pb-3">
          <h1 className="text-xl font-bold text-slate-900 uppercase tracking-wide">
            DP WORLD AIR CARGO HUB
          </h1>
          <p className="text-base font-semibold text-slate-700 mt-1 capitalize">
            {dateLabel}
          </p>
        </div>

        {/* Supervisors */}
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-2 border-b border-slate-300 pb-1">
            Supervisores
          </h2>
          {supervisorAssignments.length === 0 ? (
            <p className="text-sm text-slate-400 italic">
              Sin supervisores asignados
            </p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left px-3 py-1.5 border border-slate-300 font-semibold">
                    Nombre
                  </th>
                  <th className="text-left px-3 py-1.5 border border-slate-300 font-semibold">
                    Área
                  </th>
                  <th className="text-left px-3 py-1.5 border border-slate-300 font-semibold">
                    Turno
                  </th>
                  <th className="text-left px-3 py-1.5 border border-slate-300 font-semibold">
                    Notas
                  </th>
                </tr>
              </thead>
              <tbody>
                {supervisorAssignments.map((sa) => (
                  <tr key={sa.id}>
                    <td className="px-3 py-1.5 border border-slate-300 font-medium">
                      {sa.employee.name}
                    </td>
                    <td className="px-3 py-1.5 border border-slate-300">
                      {sa.area}
                    </td>
                    <td className="px-3 py-1.5 border border-slate-300">
                      {sa.shiftTime}
                    </td>
                    <td className="px-3 py-1.5 border border-slate-300 text-slate-500 italic">
                      {sa.notes ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Zone grid */}
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-2 border-b border-slate-300 pb-1">
            Asignaciones por zona
          </h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="text-left px-3 py-2 border border-slate-600 font-semibold">
                  ZONA
                </th>
                {SHIFTS.map((s) => (
                  <th
                    key={s}
                    className="text-center px-3 py-2 border border-slate-600 font-semibold"
                  >
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {zones.map((zone) => (
                <tr
                  key={zone.id}
                  className={zone.isSubZone ? "bg-slate-50" : ""}
                >
                  <td
                    className={`px-3 py-2 border border-slate-300 font-medium ${
                      zone.isSubZone ? "pl-6 text-slate-600 text-xs" : ""
                    }`}
                  >
                    {zone.name}
                  </td>
                  {SHIFTS.map((shift) => {
                    const names = getNames(zone.id, shift);
                    return (
                      <td
                        key={shift}
                        className="px-3 py-2 border border-slate-300 align-top"
                      >
                        {names.length === 0 ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          <ul className="space-y-0.5">
                            {names.map((n) => (
                              <li key={n} className="text-xs font-medium">
                                {n}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="text-xs text-slate-400 text-right pt-2 border-t border-slate-200">
          Impreso por {session.name} · {format(new Date(), "dd/MM/yyyy HH:mm")}
        </div>
      </div>
    </div>
  );
}
