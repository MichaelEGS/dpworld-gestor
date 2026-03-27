import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // DIRECT_URL: conexión directa (sin pgBouncer) para que las migraciones funcionen
    // DATABASE_URL (con pooling) solo se usa en runtime vía el adapter en PrismaClient
    url: process.env["DIRECT_URL"],
  },
});
