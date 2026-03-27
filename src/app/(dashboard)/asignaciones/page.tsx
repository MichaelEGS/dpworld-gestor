import { format } from "date-fns";
import { getAssignmentsData } from "@/app/actions/assignments";
import AssignmentGrid from "./AssignmentGrid";
import DateNav from "./DateNav";
import ExportMenu from "./ExportMenu";

interface Props {
  searchParams: Promise<{ date?: string }>;
}

export default async function AsignacionesPage({ searchParams }: Props) {
  const params = await searchParams;
  const date = params.date ?? format(new Date(), "yyyy-MM-dd");

  const { zones, assignments, supervisorAssignments, employees } =
    await getAssignmentsData(date);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <DateNav date={date} />
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            {assignments.length} asignaciones ·{" "}
            {supervisorAssignments.length} supervisores
          </span>
          <ExportMenu date={date} />
        </div>
      </div>

      {/* Grid */}
      <AssignmentGrid
        date={date}
        zones={zones}
        assignments={assignments}
        supervisorAssignments={supervisorAssignments}
        employees={employees}
      />
    </div>
  );
}
