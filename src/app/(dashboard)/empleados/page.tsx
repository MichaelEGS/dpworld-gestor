import { redirect } from "next/navigation";
import { getSession } from "@/app/actions/auth";
import { getEmployees } from "@/app/actions/employees";
import EmployeesClient from "./EmployeesClient";

export default async function EmpleadosPage() {
  const session = await getSession();

  if (session.role !== "admin") {
    redirect("/asignaciones");
  }

  const employees = await getEmployees();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Empleados</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {employees.filter((e) => e.active).length} activos ·{" "}
          {employees.filter((e) => !e.active).length} inactivos
        </p>
      </div>

      <EmployeesClient employees={employees} />
    </div>
  );
}
