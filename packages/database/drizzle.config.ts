import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./migrations/generated",
  dbCredentials: {
    url:
      process.env["DIRECT_URL"] ??
      process.env["DATABASE_URL"] ??
      "postgresql://roboworkpool:local-postgres-password-change-me@localhost:5432/roboworkpool",
  },
  strict: true,
  verbose: true,
});
