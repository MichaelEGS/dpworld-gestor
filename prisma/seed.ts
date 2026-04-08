import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Iniciando seed de base de datos...");

  // ─── Zonas fijas (estructura del Excel) ──────────────────────────────────
  const zones = [
    { id: 9,  name: "EXPORTACION",          displayOrder: 1,  isSubZone: false },
    { id: 3,  name: "IMPORTACION",           displayOrder: 2,  isSubZone: false },
    { id: 1,  name: "TRANSITO INTERNACIONAL",displayOrder: 3,  isSubZone: false },
    { id: 10, name: "PAQUETERIA",            displayOrder: 4,  isSubZone: false },
    { id: 4,  name: "632 DV IN",             displayOrder: 5,  isSubZone: false },
    { id: 5,  name: "632 DV OUT",            displayOrder: 6,  isSubZone: false },
    { id: 6,  name: "928 DX IN",             displayOrder: 7,  isSubZone: false },
    { id: 7,  name: "928 DX OUT",            displayOrder: 8,  isSubZone: false },
    { id: 8,  name: "AMARRADORES IN",        displayOrder: 9,  isSubZone: false },
    { id: 11, name: "AMARRADORES OUT",       displayOrder: 10, isSubZone: false },
    { id: 2,  name: "MANTENIMIENTO",         displayOrder: 11, isSubZone: true  },
  ];

  for (const zone of zones) {
    await prisma.zone.upsert({
      where: { id: zone.id },
      update: { name: zone.name, displayOrder: zone.displayOrder },
      create: zone,
    });
  }
  console.log(`✓ ${zones.length} zonas creadas`);

  // ─── Usuario administrador inicial ───────────────────────────────────────
  const adminPassword = await bcrypt.hash("admin123", 12);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      name: "Administrador",
      passwordHash: adminPassword,
      role: "admin",
    },
  });
  console.log("✓ Usuario admin creado (user: admin / pass: admin123)");

  // ─── Empleados de ejemplo (basados en el Excel) ───────────────────────────
  const sampleEmployees = [
    { name: "AUGUSTO MONTERO", role: "operario" },
    { name: "JHON GUZMAN", role: "operario" },
    { name: "JONATHAN GOMEZ", role: "operario" },
    { name: "NELSON DIAZ", role: "operario" },
    { name: "JOSE ALEXANDER", role: "operario" },
    { name: "SAULO PEGUERO", role: "operario" },
    { name: "YERAL LINARES", role: "operario" },
    { name: "ALEXANDER BELTRE", role: "operario" },
    { name: "NOLBERTO LOPEZ", role: "operario" },
    { name: "VICTOR MANUEL", role: "operario" },
    { name: "CRISTOFER SALDIVAR", role: "operario" },
    { name: "MIGUEL ANGEL", role: "operario" },
    { name: "ELIAS LAZAL", role: "operario" },
    { name: "JOHANCEL DEL ROSARIO", role: "operario" },
    { name: "YUNIOL FELIX", role: "operario" },
    { name: "JULEYSI MONTERO", role: "operario" },
    { name: "JAVIER DL SANTOS", role: "operario" },
    { name: "LUIS JOSE", role: "operario" },
    { name: "JUAN JOSE", role: "operario" },
    { name: "FRANK PACHE", role: "operario" },
    { name: "JESUS FERREIRAS", role: "operario" },
    { name: "ANTHONY BENJAMIN", role: "operario" },
    { name: "LEO DE LA ROSA", role: "operario" },
    { name: "ADONNY BOBADILLA", role: "operario" },
    { name: "HECTOR SAVINON", role: "operario" },
    { name: "EDISON TRINIDAD", role: "operario" },
    { name: "JORGE FELIX", role: "operario" },
    { name: "MIGUEL FAMILIA", role: "mantenimiento" },
    { name: "JULIO CURIEL", role: "supervisor_cargo" },
    { name: "FRANCISCO SANTANA", role: "supervisor_cargo" },
    { name: "HANIEL GONZALEZ", role: "supervisor_cargo" },
    { name: "PABLO DE LA ROSA", role: "supervisor_cargo" },
    { name: "KELLIN SOSA", role: "supervisor_cargo" },
    { name: "JULIO POLANCO", role: "supervisor_cargo" },
  ];

  for (const emp of sampleEmployees) {
    const existing = await prisma.employee.findFirst({ where: { name: emp.name } });
    if (!existing) {
      await prisma.employee.create({ data: emp });
    }
  }
  console.log(`✓ ${sampleEmployees.length} empleados de ejemplo creados`);

  console.log("\n✅ Seed completado exitosamente");
  console.log("   → Accede con: admin / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
