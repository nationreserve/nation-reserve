import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "../..");
const quick = process.argv.includes("--fixture");
const artifacts = join(root, "artifacts", "acceptance", ...(quick ? ["fixture"] : []));
mkdirSync(artifacts, { recursive: true });
const startedAt = new Date().toISOString();

const stages = quick ? [
  ["fixture", process.execPath, ["-e", "process.exit(0)"]],
] : [
  ["specification-validation", "corepack", ["pnpm", "specification:validate"]],
  ["strict-specification-coverage", "corepack", ["pnpm", "specification:coverage:strict"]],
  ["migration-plan", process.execPath, ["scripts/migrations/plan.mjs"]],
  ["unit-and-integration-tests", "corepack", ["pnpm", "-r", "--filter", "./packages/**", "run", "test"]],
  ["authorization-and-api-tests", "corepack", ["pnpm", "--filter", "@nation-reserve/api", "test"]],
  ["frontend-tests", "corepack", ["pnpm", "web:test"]],
  ["accessibility-tests", "corepack", ["pnpm", "--filter", "@nation-reserve/web", "test:a11y"]],
  ["critical-journeys", "corepack", ["pnpm", "--filter", "@nation-reserve/web", "test:e2e"]],
  ["heartbeat-simulator", "corepack", ["pnpm", "--filter", "@nation-reserve/heartbeat-domain", "simulate"]],
  ["security-source-audit", process.execPath, ["scripts/security/verify-source.mjs"]],
  ["build", "corepack", ["pnpm", "build"]],
];

const redact = (value) => value
  .replace(/(authorization|api[_-]?key|secret|token|password)\s*[:=]\s*[^\s,]+/gi, "$1=[REDACTED]")
  .slice(-20000);
const results = [];
for (const [id, command, args] of stages) {
  const began = Date.now();
  const isWindowsCommand = process.platform === "win32" && command === "corepack";
  const executable = isWindowsCommand ? (process.env.ComSpec ?? "cmd.exe") : command;
  const executableArgs = isWindowsCommand ? ["/d", "/s", "/c", `corepack ${args.join(" ")}`] : args;
  const run = spawnSync(executable, executableArgs, { cwd: root, encoding: "utf8", shell: false, timeout: 300000 });
  const status = run.error?.code === "ETIMEDOUT" ? "blocked" : run.status === 0 ? "passed" : "failed";
  results.push({ id, status, exitCode: run.status, durationMs: Date.now() - began,
    output: redact(`${run.stdout ?? ""}\n${run.stderr ?? ""}`), error: run.error?.message });
}

const sourceRoots = ["apps", "packages", "scripts", "infrastructure", "docs"];
const files = [];
const walk = (dir) => { for (const entry of readdirSync(dir, { withFileTypes: true })) {
  if (["node_modules", "dist", ".git", "artifacts"].includes(entry.name) || entry.name.includes(".p022")) continue;
  const path = join(dir, entry.name); entry.isDirectory() ? walk(path) : files.push(path);
}};
for (const source of sourceRoots) walk(join(root, source));
const marker = /\b(TODO|FIXME|placeholder|mock|not implemented|coming soon|fake data)\b/i;
const placeholderFindings = files.flatMap((file) => {
  let text; try { text = readFileSync(file, "utf8"); } catch { return []; }
  return text.split(/\r?\n/).flatMap((line, index) => marker.test(line)
    ? [{ file: relative(root, file).replaceAll("\\", "/"), line: index + 1, excerpt: line.trim().slice(0, 240) }] : []);
});
const blockingStages = results.filter((item) => item.status !== "passed");
const report = { schemaVersion: "1.0.0", promptId: "PROMPT-022", startedAt,
  completedAt: new Date().toISOString(), status: blockingStages.length ? "blocked" : "passed",
  fixture: quick, stages: results, placeholderFindings,
  blockers: blockingStages.map((item) => ({ id: `stage:${item.id}`, reason: item.error ?? `exit ${item.exitCode}` })) };
writeFileSync(join(artifacts, "mvp-acceptance.json"), `${JSON.stringify(report, null, 2)}\n`);
const md = `# MVP Acceptance Evidence\n\nStatus: **${report.status.toUpperCase()}**  \nStarted: ${startedAt}  \nCompleted: ${report.completedAt}\n\n` +
  `| Stage | Status | Duration | Exit |\n|---|---|---:|---:|\n${results.map((r) => `| ${r.id} | ${r.status} | ${r.durationMs} ms | ${r.exitCode ?? "n/a"} |`).join("\n")}\n\n` +
  `## Blocking stages\n\n${blockingStages.map((r) => `- ${r.id}: ${r.error ?? `exit ${r.exitCode}`}`).join("\n") || "- None."}\n\n` +
  `## Placeholder findings\n\n${placeholderFindings.slice(0, 200).map((f) => `- \`${f.file}:${f.line}\` — ${f.excerpt}`).join("\n") || "- None."}\n`;
writeFileSync(join(artifacts, "mvp-acceptance.md"), md);
process.stdout.write(`${JSON.stringify({ status: report.status, report: "artifacts/acceptance/mvp-acceptance.json", stages: results.length, blockers: blockingStages.length })}\n`);
process.exitCode = blockingStages.length ? 1 : 0;





