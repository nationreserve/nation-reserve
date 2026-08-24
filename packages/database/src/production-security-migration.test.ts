import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("production database security repair migration", () => {
  it("protects every public table/view/function and future object by default", async () => {
    const sql = await readFile(
      resolve("migrations/0040_supabase_access_and_journal_integrity.sql"),
      "utf8",
    );
    expect(sql).toContain("database_object_access_classification");
    expect(sql).toContain("ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM anon");
    expect(sql).toContain("REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC");
    expect(sql).toContain("ALTER DEFAULT PRIVILEGES IN SCHEMA public");
    expect(sql).not.toMatch(/(?:USING|WITH CHECK)\s*\(\s*true\s*\)/i);
  });

  it("keeps managed storage buckets private", async () => {
    const sql = await readFile(
      resolve("migrations/0040_supabase_access_and_journal_integrity.sql"),
      "utf8",
    );
    expect(sql).toContain("UPDATE storage.buckets");
    expect(sql).toContain("SET public = false");
  });

  it("closes both posted-journal mutation bypasses", async () => {
    const sql = await readFile(
      resolve("migrations/0040_supabase_access_and_journal_integrity.sql"),
      "utf8",
    );
    expect(sql).toContain("reject_direct_posted_journal_insert");
    expect(sql).toContain("BEFORE INSERT ON journal_entries");
    expect(sql).toContain("BEFORE INSERT OR UPDATE OR DELETE ON journal_lines");
    expect(sql).toContain("FOR UPDATE");
  });
});
