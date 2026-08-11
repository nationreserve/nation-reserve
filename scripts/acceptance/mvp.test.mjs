import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

test("fixture acceptance produces deterministic machine-readable evidence", () => {
  const root = resolve(import.meta.dirname, "../..");
  const result = spawnSync(process.execPath, ["scripts/acceptance/mvp.mjs", "--fixture"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const path = resolve(root, "artifacts/acceptance/fixture/mvp-acceptance.json");
  assert.equal(existsSync(path), true);
  const report = JSON.parse(readFileSync(path, "utf8"));
  assert.equal(report.status, "passed");
  assert.equal(report.promptId, "PROMPT-022");
  assert.equal(report.stages[0].id, "fixture");
});

