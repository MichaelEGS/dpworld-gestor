import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import * as XLSX from "xlsx";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { sessionOptions, SessionData } from "@/lib/session";

export async function GET(request: NextRequest) {
  // Auth check
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const date = searchParams.get("date") ?? format(new Date(), "yyyy-MM-dd");

  // Load data
  const [zones, assignments, supervisorAssignments] = await Promise.all([
    prisma.zone.findMany({ orderBy: { displayOrder: "asc" } }),
    prisma.assignment.findMany({
      where: { date },
      include: { employee: true, zone: true },
    }),
    prisma.supervisorAssignment.findMany({
      where: { date },
      include: { employee: true },
    }),
  ]);

  const SHIFTS = ["6:00 AM", "8:00 AM", "11:00 AM", "1:00 PM"];

  // ── Build worksheet data ────────────────────────────────────────────────
  const rows: (string | number)[][] = [];

  // Title row
  const dateLabel = format(parseISO(date), "EEEE d 'de' MMMM yyyy", {
    locale: es,
  });
  rows.push([`DP WORLD AIR CARGO HUB — ${dateLabel.toUpperCase()}`]);
  rows.push([]); // blank

  // Supervisors header
  rows.push(["SUPERVISORES", "", "", "", ""]);
  rows.push(["Nombre", "Área", "Turno", "Notas"]);

  if (supervisorAssignments.length === 0) {
    rows.push(["(sin supervisores asignados)", "", "", ""]);
  } else {
    for (const sa of supervisorAssignments) {
      rows.push([sa.employee.name, sa.area, sa.shiftTime, sa.notes ?? ""]);
    }
  }

  rows.push([]); // blank

  // Zone assignments header
  rows.push(["ASIGNACIONES POR ZONA", "", "", "", "", ""]);
  rows.push(["ZONA", ...SHIFTS]);

  for (const zone of zones) {
    const cells = SHIFTS.map((shift) => {
      const names = assignments
        .filter((a) => a.zoneId === zone.id && a.shiftTime === shift)
        .map((a) => {
          const note = a.notes ? ` (${a.notes})` : "";
          return `${a.employee.name}${note}`;
        });
      return names.join("\n") || "";
    });
    rows.push([zone.name, ...cells]);
  }

  rows.push([]); // blank
  rows.push([
    `Exportado: ${format(new Date(), "dd/MM/yyyy HH:mm")} por ${session.name}`,
  ]);

  // ── Create workbook ─────────────────────────────────────────────────────
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws["!cols"] = [
    { wch: 30 }, // Zona
    { wch: 22 }, // 6AM
    { wch: 22 }, // 8AM
    { wch: 22 }, // 11AM
    { wch: 22 }, // 1PM
  ];

  // Merge title cell across all columns
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Asignaciones");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const filename = `asignaciones-${date}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
