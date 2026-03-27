import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/app/actions/auth";
import LogoutButton from "@/components/LogoutButton";
import { Users, CalendarDays } from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Logo + brand */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">DW</span>
            </div>
            <span className="font-semibold text-slate-800 text-sm hidden sm:block">
              DP World — Air Cargo Hub
            </span>
          </div>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            <Link
              href="/asignaciones"
              className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <CalendarDays size={15} />
              Asignaciones
            </Link>
            {session.role === "admin" && (
              <Link
                href="/empleados"
                className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Users size={15} />
                Empleados
              </Link>
            )}
          </nav>

          {/* User + logout */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-800 leading-none">
                {session.name}
              </p>
              <p className="text-xs text-slate-400 mt-0.5 capitalize">
                {session.role}
              </p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  );
}
