"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "./auth";

export async function getAssignmentsData(date: string) {
  const [zones, assignments, supervisorAssignments, employees] =
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
    ]);

  return { zones, assignments, supervisorAssignments, employees };
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
    data: {
      date,
      employeeId,
      zoneId,
      shiftTime,
      notes,
      createdById: session.userId,
    },
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
    data: {
      date,
      employeeId,
      area,
      shiftTime,
      notes,
      createdById: session.userId,
    },
  });

  revalidatePath("/asignaciones");
}

export async function removeSupervisorAssignment(id: number) {
  const session = await getSession();
  if (!session.isLoggedIn) throw new Error("No autorizado");

  await prisma.supervisorAssignment.delete({ where: { id } });
  revalidatePath("/asignaciones");
}
