"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "./auth";

async function requireAdmin() {
  const session = await getSession();
  if (!session.isLoggedIn || session.role !== "admin")
    throw new Error("No autorizado");
}

export async function getZones() {
  return prisma.zone.findMany({ orderBy: { displayOrder: "asc" } });
}

export async function createZone(name: string) {
  await requireAdmin();
  const agg = await prisma.zone.aggregate({ _max: { displayOrder: true } });
  const newOrder = (agg._max.displayOrder ?? 0) + 1;
  await prisma.zone.create({ data: { name, displayOrder: newOrder, isSubZone: false } });
  revalidatePath("/zonas");
  revalidatePath("/asignaciones");
}

export async function updateZoneName(id: number, name: string) {
  await requireAdmin();
  await prisma.zone.update({ where: { id }, data: { name } });
  revalidatePath("/zonas");
  revalidatePath("/asignaciones");
}

export async function deleteZone(id: number) {
  await requireAdmin();
  // Check no assignments reference this zone
  const count = await prisma.assignment.count({ where: { zoneId: id } });
  if (count > 0)
    throw new Error(`No se puede eliminar: hay ${count} asignaciones en esta zona.`);
  await prisma.zone.delete({ where: { id } });
  revalidatePath("/zonas");
  revalidatePath("/asignaciones");
}

export async function moveZone(id: number, direction: "up" | "down") {
  await requireAdmin();
  const zones = await prisma.zone.findMany({ orderBy: { displayOrder: "asc" } });
  const idx = zones.findIndex((z) => z.id === id);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= zones.length) return;

  const a = zones[idx];
  const b = zones[swapIdx];
  await prisma.zone.update({ where: { id: a.id }, data: { displayOrder: b.displayOrder } });
  await prisma.zone.update({ where: { id: b.id }, data: { displayOrder: a.displayOrder } });

  revalidatePath("/zonas");
  revalidatePath("/asignaciones");
}
