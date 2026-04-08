"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "./auth";

export const DEFAULT_SHIFTS = ["6:00 AM", "8:00 AM", "11:00 AM", "1:00 PM"];

export async function getAssignmentsData(date: string) {
  const [zones, assignments, supervisorAssignments, employees, shiftConfig] =
    await Promise.all([
      prisma.zone.findMany({ orderBy: { displayOrder: "asc" } }),
      prisma.assignment.findMany({
        where: { date },
        include: {
          employee: {
            include: {
              daysOffWeekly: true,
              daysOffSpecific: { where: { date } },
            },
          },
          zone: true,
        },
      }),
      prisma.supervisorAssignment.findMany({
        where: { date },
        include: {
          employee: {
            include: {
              daysOffWeekly: true,
              daysOffSpecific: { where: { date } },
            },
          },
        },
      }),
      prisma.employee.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        include: {
          daysOffWeekly: true,
          daysOffSpecific: { where: { date } },
        },
      }),
      prisma.dayShiftConfig.findUnique({ where: { date } }).catch(() => null),
    ]);

  const shiftColumns: string[] = shiftConfig
    ? (JSON.parse(shiftConfig.shifts) as string[])
    : DEFAULT_SHIFTS;

  return { zones, assignments, supervisorAssignments, employees, shiftColumns };
}

export async function addAssignment(formData: FormData) {
  const session = await getSession();
  if (!session.isLoggedIn) throw new Error("No autorizado");

  const date = formData.get("date") as string;
  const employeeId = parseInt(formData.get("employeeId") as string);
  const zoneId = parseInt(formData.get("zoneId") as string);
  const shiftTime = formData.get("shiftTime") as string;
  const notes = (formData.get("notes") as string) || null;

  await prisma.assignment.create({
    data: { date, employeeId, zoneId, shiftTime, notes, createdById: session.userId },
  });

  revalidatePath("/asignaciones");
}

export async function removeAssignment(id: number) {
  const session = await getSession();
  if (!session.isLoggedIn) throw new Error("No autorizado");

  await prisma.assignment.delete({ where: { id } });
  revalidatePath("/asignaciones");
}

export async function addSupervisorAssignment(formData: FormData) {
  const session = await getSession();
  if (!session.isLoggedIn) throw new Error("No autorizado");

  const date = formData.get("date") as string;
  const employeeId = parseInt(formData.get("employeeId") as string);
  const area = formData.get("area") as string;
  const shiftTime = formData.get("shiftTime") as string;
  const notes = (formData.get("notes") as string) || null;

  await prisma.supervisorAssignment.create({
    data: { date, employeeId, area, shiftTime, notes, createdById: session.userId },
  });

  revalidatePath("/asignaciones");
}

export async function removeSupervisorAssignment(id: number) {
  const session = await getSession();
  if (!session.isLoggedIn) throw new Error("No autorizado");

  await prisma.supervisorAssignment.delete({ where: { id } });
  revalidatePath("/asignaciones");
}

// ── Editable shift column headers ─────────────────────────────────────────────
export async function updateShiftLabel(
  date: string,
  oldShift: string,
  newShift: string
) {
  const session = await getSession();
  if (!session.isLoggedIn) throw new Error("No autorizado");
  if (!newShift.trim()) return;

  // Bulk-rename all assignments on this date that used the old shift time
  await prisma.assignment.updateMany({
    where: { date, shiftTime: oldShift },
    data: { shiftTime: newShift },
  });
  await prisma.supervisorAssignment.updateMany({
    where: { date, shiftTime: oldShift },
    data: { shiftTime: newShift },
  });

  // Persist the ordered shift list for this date
  const existing = await prisma.dayShiftConfig
    .findUnique({ where: { date } })
    .catch(() => null);
  const current: string[] = existing
    ? (JSON.parse(existing.shifts) as string[])
    : DEFAULT_SHIFTS;
  const updated = current.map((s) => (s === oldShift ? newShift : s));

  await prisma.dayShiftConfig
    .upsert({
      where: { date },
      create: { date, shifts: JSON.stringify(updated) },
      update: { shifts: JSON.stringify(updated) },
    })
    .catch(() => null); // graceful if table not yet migrated

  revalidatePath("/asignaciones");
}

// ── Duplicate assignments from another day ────────────────────────────────────
export async function duplicateAssignments(fromDate: string, toDate: string) {
  const session = await getSession();
  if (!session.isLoggedIn) throw new Error("No autorizado");
  if (fromDate === toDate) return;

  const [fromAssignments, fromSupervisors, fromShiftConfig] = await Promise.all([
    prisma.assignment.findMany({ where: { date: fromDate } }),
    prisma.supervisorAssignment.findMany({ where: { date: fromDate } }),
    prisma.dayShiftConfig.findUnique({ where: { date: fromDate } }).catch(() => null),
  ]);

  // Merge strategy: skip if same employee+zone+shift already exists on toDate
  for (const a of fromAssignments) {
    const exists = await prisma.assignment.findFirst({
      where: { date: toDate, employeeId: a.employeeId, zoneId: a.zoneId, shiftTime: a.shiftTime },
    });
    if (!exists) {
      await prisma.assignment.create({
        data: {
          date: toDate,
          employeeId: a.employeeId,
          zoneId: a.zoneId,
          shiftTime: a.shiftTime,
          notes: a.notes,
          createdById: session.userId,
        },
      });
    }
  }

  for (const sa of fromSupervisors) {
    const exists = await prisma.supervisorAssignment.findFirst({
      where: { date: toDate, employeeId: sa.employeeId, area: sa.area },
    });
    if (!exists) {
      await prisma.supervisorAssignment.create({
        data: {
          date: toDate,
          employeeId: sa.employeeId,
          area: sa.area,
          shiftTime: sa.shiftTime,
          notes: sa.notes,
          createdById: session.userId,
        },
      });
    }
  }

  // Copy shift config if the source day had custom hours
  if (fromShiftConfig) {
    await prisma.dayShiftConfig
      .upsert({
        where: { date: toDate },
        create: { date: toDate, shifts: fromShiftConfig.shifts },
        update: { shifts: fromShiftConfig.shifts },
      })
      .catch(() => null);
  }

  revalidatePath("/asignaciones");
  return { copied: fromAssignments.length + fromSupervisors.length };
}
