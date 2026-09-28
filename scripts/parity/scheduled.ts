import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runParityCheck, type ParityResult } from "./run.js";

/**
 * Entry point for the scheduled workflow (.github/workflows/parity-schedule.yml).
 * Runs the same check as scripts/parity/check.ts, but — instead of only
 * failing the workflow run, which nobody watches until they happen to open a
 * PR — files (or updates, or closes) a labeled GitHub issue against the repo
 * itself, so an upstream herdr release produces a signal owned by the repo
 * rather than first appearing as a red required check on an innocent PR.
 */
export const LABEL = "herdr-parity-drift";

export type Gh = (args: string[]) => string;

export const realGh: Gh = (args) => execFileSync("gh", args, { encoding: "utf8" });

export function runUrl(repo: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  const server = env.GITHUB_SERVER_URL;
  const runId = env.GITHUB_RUN_ID;
  return server && runId ? `${server}/${repo}/actions/runs/${runId}` : undefined;
}

export function ensureLabel(repo: string, gh: Gh): void {
  try {
    gh(["label", "create", LABEL, "--repo", repo, "--color", "d93f0b", "--description", "Scheduled herdr-parity check failed", "--force"]);
  } catch (e) {
    console.log(`(label create for ${LABEL} failed — assuming it already exists: ${e instanceof Error ? e.message : String(e)})`);
  }
}

/** Open/update/close the one `herdr-parity-drift`-labeled issue based on this run's result. */
export function syncIssue(repo: string, result: ParityResult, gh: Gh, url?: string): void {
  ensureLabel(repo, gh);

  const existing = JSON.parse(
    gh(["issue", "list", "--repo", repo, "--label", LABEL, "--state", "open", "--json", "number,title", "--limit", "20"]),
  ) as { number: number; title: string }[];

  if (result.ok) {
    for (const issue of existing) {
      gh([
        "issue", "close", String(issue.number), "--repo", repo,
        "--comment", `Parity restored on the scheduled run${url ? ` (${url})` : ""}. Closing automatically.`,
      ]);
      console.log(`closed #${issue.number} (parity restored)`);
    }
    if (!existing.length) console.log("no open herdr-parity-drift issue to close");
    return;
  }

  const body = [
    `Scheduled herdr-parity check failed${url ? ` — run: ${url}` : ""}.`,
    "",
    "```",
    ...result.lines,
    "```",
    "",
    "Refresh runbook: scripts/parity/REFRESH.md",
  ].join("\n");

  if (existing.length) {
    const first = existing[0]!;
    gh(["issue", "comment", String(first.number), "--repo", repo, "--body", body]);
    console.log(`commented on existing #${first.number} (drift still present)`);
    return;
  }

  const dir = mkdtempSync(join(tmpdir(), "herdr-parity-issue-"));
  const bodyFile = join(dir, "body.md");
  writeFileSync(bodyFile, body);
  const created = gh([
    "issue", "create", "--repo", repo,
    "--title", "herdr parity drift detected",
    "--label", LABEL,
    "--body-file", bodyFile,
  ]);
  console.log(`filed new issue: ${created.trim()}`);
}

async function main() {
  const result = await runParityCheck();
  console.log(result.lines.join("\n"));

  const repo = process.env.GITHUB_REPOSITORY;
  if (repo && process.env.GH_TOKEN) {
    syncIssue(repo, result, realGh, runUrl(repo));
  } else {
    console.log(
      "\n(GITHUB_REPOSITORY/GH_TOKEN not set — skipping issue filing. Expected when running this script outside the scheduled workflow.)",
    );
  }

  process.exit(result.ok ? 0 : 1);
}

if (import.meta.main) await main();
