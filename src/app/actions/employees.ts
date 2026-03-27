"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "./auth";

async function requireAdmin() {
  const session = await getSession();
  if (!session.isLoggedIn || session.role !== "admin") {
    throw new Error("Solo administradores pueden realizar esta acción");
  }
  return session;
}

export async function getEmployees() {
  return prisma.employee.findMany({
    orderBy: { name: "asc" },
    include: {
      daysOffWeekly: true,
      _count: { select: { assignments: true } },
    },
  });
}

export async function createEmployee(formData: FormData) {
  await requireAdmin();

  const name = (formData.get("name") as string).trim().toUpperCase();
  const role = formData.get("role") as string;

  if (!name) return { error: "El nombre es requerido" };
  if (!["operario", "supervisor_cargo", "mantenimiento"].includes(role)) {
    return { error: "Rol inválido" };
  }

  const existing = await prisma.employee.findFirst({ where: { name } });
  if (existing) return { error: "Ya existe un empleado con ese nombre" };

  await prisma.employee.create({ data: { name, role } });
  revalidatePath("/empleados");
  return { success: true };
}

export async function updateEmployee(
  id: number,
  formData: FormData
) {
  await requireAdmin();

  const name = (formData.get("name") as string).trim().toUpperCase();
  const role = formData.get("role") as string;
  const active = formData.get("active") === "true";

  await prisma.employee.update({
    where: { id },
    data: { name, role, active },
  });

  revalidatePath("/empleados");
  return { success: true };
}

export async function toggleEmployeeActive(id: number, active: boolean) {
  await requireAdmin();
  await prisma.employee.update({ where: { id }, data: { active } });
  revalidatePath("/empleados");
}

export async function setDaysOffWeekly(
  employeeId: number,
  daysOfWeek: number[]
) {
  await requireAdmin();

  await prisma.dayOffWeekly.deleteMany({ where: { employeeId } });
  if (daysOfWeek.length > 0) {
    await prisma.dayOffWeekly.createMany({
      data: daysOfWeek.map((dayOfWeek) => ({ employeeId, dayOfWeek })),
    });
  }

  revalidatePath("/empleados");
}
