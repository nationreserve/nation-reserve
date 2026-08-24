import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationDirectory = resolve("migrations");

describe("ordered migration sequence regressions", () => {
  it("has one canonical creation of users.email_normalized", async () => {
    const core = await readFile(
      resolve(migrationDirectory, "0001_core_domain.sql"),
      "utf8",
    );
    const authentication = await readFile(
      resolve(migrationDirectory, "0002_authentication_and_access.sql"),
      "utf8",
    );

    expect(core).toMatch(/CREATE TABLE users[\s\S]*?\bemail_normalized text NOT NULL/);
    expect(core).toContain(
      "CONSTRAINT users_email_normalized_unique UNIQUE (email_normalized)",
    );
    expect(core).toContain("CONSTRAINT users_email_normalized_lower CHECK");
    expect(authentication).not.toMatch(/ADD\s+COLUMN\s+email_normalized\b/i);
    expect(authentication).not.toMatch(
      /CREATE\s+UNIQUE\s+INDEX\s+users_email_normalized_unique\b/i,
    );
  });

  it("does not add an existing column again without an explicit guard", async () => {
    const filenames = (await readdir(migrationDirectory))
      .filter((name) => /^\d{4}_.+\.sql$/.test(name))
      .sort();
    const knownColumns = new Map<string, Set<string>>();
    const conflicts: string[] = [];

    for (const filename of filenames) {
      const sql = await readFile(resolve(migrationDirectory, filename), "utf8");
      for (const match of sql.matchAll(
        /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([\s\S]*?)\);/gi,
      )) {
        const table = match[1]!.toLowerCase();
        const columns = knownColumns.get(table) ?? new Set<string>();
        for (const line of match[2]!.split(/\r?\n/)) {
          const column = line.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s+[a-zA-Z]/)?.[1];
          if (
            column &&
            !["constraint", "primary", "unique", "check", "foreign"].includes(
              column.toLowerCase(),
            )
          ) {
            columns.add(column.toLowerCase());
          }
        }
        knownColumns.set(table, columns);
      }

      for (const statement of sql.matchAll(
        /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.)?([a-zA-Z_][a-zA-Z0-9_]*)\s+([\s\S]*?);/gi,
      )) {
        const table = statement[1]!.toLowerCase();
        const columns = knownColumns.get(table) ?? new Set<string>();
        for (const addition of statement[2]!.matchAll(
          /ADD\s+COLUMN\s+(IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_][a-zA-Z0-9_]*)/gi,
        )) {
          const guarded = Boolean(addition[1]);
          const column = addition[2]!.toLowerCase();
          if (columns.has(column) && !guarded)
            conflicts.push(`${filename}:${table}.${column}`);
          columns.add(column);
        }
        knownColumns.set(table, columns);
      }
    }

    expect(conflicts).toEqual([]);
  });
});
