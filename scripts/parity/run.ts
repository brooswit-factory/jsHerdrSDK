import { execSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { compareInventories, inventoryOf } from "./inventory.js";
import { coverage, wrappedMethods } from "./coverage.js";
import { corroborateLatest } from "./corroborate.js";

export interface ParityResult {
  ok: boolean;
  /** Rendered console lines, in order — the same text a human sees running the script directly. */
  lines: string[];
}

/**
 * The parity check's actual logic, factored out of the CLI entry point
 * (scripts/parity/check.ts) so a scheduled run (scripts/parity/scheduled.ts)
 * can call it too and act on the structured result instead of a subprocess
 * exit code.
 */
export async function runParityCheck(root = join(import.meta.dir, "..", "..")): Promise<ParityResult> {
  const herdr = process.env.HERDR_BIN ?? "herdr";
  const lines: string[] = [];
  let failed = false;
  const log = (msg: string) => lines.push(msg);
  const fail = (msg: string) => { failed = true; log("  ✗ " + msg); };
  const ok = (msg: string) => log("  ✓ " + msg);
  const warn = (msg: string) => log("  ⚠ " + msg);

  const ours = JSON.parse(readFileSync(join(root, "schema/herdr-api.schema.json"), "utf8"));
  const pinned = JSON.parse(readFileSync(join(root, "schema/herdr-version.json"), "utf8"));
  const theirsRaw = execSync(`${herdr} api schema --json`, { encoding: "utf8", env: { ...process.env, HERDR_SOCKET: "/nonexistent" } });
  const theirs = JSON.parse(theirsRaw);
  const liveVersion = execSync(`${herdr} --version`, { encoding: "utf8" }).trim().replace(/^herdr\s+/, "");

  log(`\n1. version — SDK pinned to herdr ${pinned.version}, installed herdr ${liveVersion}`);
  liveVersion === pinned.version ? ok("versions match") : warn(`herdr ${liveVersion} is out; the SDK was generated against ${pinned.version}. Not a failure by itself — the schema diff below decides.`);

  log(`\n2. corroborating "latest" — herdr.dev's install manifest (what installed the herdr above) is a single, uncorroborated source; cross-checking it against the GitHub releases API`);
  const corr = await corroborateLatest(liveVersion);
  if (corr.status === "match") {
    ok(`${corr.source} agrees: its latest published (non-prerelease) release is ${corr.githubVersion}`);
  } else if (corr.status === "mismatch") {
    warn(`${corr.source} reports latest release ${corr.githubVersion}, but herdr.dev's install manifest served ${liveVersion} instead — the two sources disagree. This does not fail the check by itself (the schema diff below is what decides drift), but it means "latest" here may not be trustworthy this run; investigate before trusting a clean result.`);
  } else {
    warn(`could not reach ${corr.source} to corroborate (${corr.error}). Falling back to the single-source limitation: "latest herdr" here means only "whatever herdr.dev's install manifest currently serves," and a stale or wrong manifest would go undetected this run.`);
  }

  log(`\n3. API inventory — committed schema vs installed herdr's schema`);
  const cmp = compareInventories(inventoryOf(ours), inventoryOf(theirs));
  cmp.protocol.same ? ok(`protocol ${cmp.protocol.ours}`) : fail(`protocol changed ${cmp.protocol.ours} → ${cmp.protocol.theirs}`);
  for (const [k, d] of Object.entries(cmp)) {
    if (k === "protocol") continue;
    const { added, removed } = d as { added: string[]; removed: string[] };
    if (!added.length && !removed.length) { ok(`${k}: identical`); continue; }
    if (added.length) fail(`${k}: herdr ADDED ${added.length} the SDK lacks: ${added.join(", ")}`);
    if (removed.length) fail(`${k}: herdr REMOVED ${removed.length} the SDK still has: ${removed.join(", ")}`);
  }

  log(`\n4. service coverage — every schema method has a typed wrapper`);
  const svcDir = join(root, "src/services");
  const sources = readdirSync(svcDir).filter((f) => f.endsWith(".ts")).map((f) => readFileSync(join(svcDir, f), "utf8"));
  const cov = coverage(inventoryOf(theirs).methods, wrappedMethods(sources));
  cov.stale.length ? fail(`wrappers for methods herdr no longer has: ${cov.stale.join(", ")}`) : ok("no stale wrappers");
  cov.unwrapped.length
    ? warn(`${cov.unwrapped.length} methods reachable only via client.call(): ${cov.unwrapped.join(", ")}`)
    : ok("every method has a service wrapper");

  if (failed) {
    log("\nFAILED — herdr's API and this SDK have drifted. Refresh with:\n  herdr api schema --json > schema/herdr-api.schema.json && bun run generate\nand update schema/herdr-version.json.\nRunbook: scripts/parity/REFRESH.md");
  } else {
    log(`\nOK — SDK matches herdr ${liveVersion}.`);
  }
  return { ok: !failed, lines };
}
