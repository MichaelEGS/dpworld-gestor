import { redirect } from "next/navigation";
import { getSession } from "@/app/actions/auth";
import { getZones } from "@/app/actions/zones";
import ZonasClient from "./ZonasClient";

export default async function ZonasPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");
  if (session.role !== "admin") redirect("/asignaciones");

  const zones = await getZones();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Gestión de Zonas</h1>
        <p className="text-sm text-slate-500 mt-1">
          Agrega, renombra o reordena las zonas del sistema. Los cambios se reflejan inmediatamente en el grid de asignaciones.
        </p>
      </div>
      <ZonasClient zones={zones} />
    </div>
  );
}
