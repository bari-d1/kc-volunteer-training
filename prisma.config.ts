import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // The CLI (migrate, studio) uses the direct connection; the app connects
    // through the pooler via DATABASE_URL in src/lib/prisma.ts.
    url: process.env["DIRECT_URL"],
  },
});
