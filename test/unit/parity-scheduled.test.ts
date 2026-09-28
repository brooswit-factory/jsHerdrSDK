import { describe, expect, test } from "bun:test";
import { LABEL, ensureLabel, runUrl, syncIssue } from "../../scripts/parity/scheduled.js";
import type { Gh } from "../../scripts/parity/scheduled.js";
import type { ParityResult } from "../../scripts/parity/run.js";

/** Records every `gh` invocation and answers `issue list` from a scripted queue. */
function fakeGh(issueListAnswer: { number: number; title: string }[]) {
  const calls: string[][] = [];
  const gh: Gh = (args) => {
    calls.push(args);
    if (args[0] === "issue" && args[1] === "list") return JSON.stringify(issueListAnswer);
    if (args[0] === "issue" && args[1] === "create") return "https://github.com/o/r/issues/9\n";
    return "";
  };
  return { gh, calls };
}

const ok: ParityResult = { ok: true, lines: ["OK"] };
const failing: ParityResult = { ok: false, lines: ["FAILED", "  ✗ methods: herdr ADDED 1 the SDK lacks: new.thing"] };

describe("syncIssue", () => {
  test("passing check with no open issue: no-op besides ensuring the label", () => {
    const { gh, calls } = fakeGh([]);
    syncIssue("o/r", ok, gh);
    expect(calls).toContainEqual(["label", "create", LABEL, "--repo", "o/r", "--color", "d93f0b", "--description", "Scheduled herdr-parity check failed", "--force"]);
    expect(calls.some((c) => c[0] === "issue" && c[1] === "close")).toBe(false);
    expect(calls.some((c) => c[0] === "issue" && c[1] === "create")).toBe(false);
  });

  test("passing check with an open drift issue: closes it with a comment", () => {
    const { gh, calls } = fakeGh([{ number: 42, title: "herdr parity drift detected" }]);
    syncIssue("o/r", ok, gh, "https://github.com/o/r/actions/runs/1");
    const close = calls.find((c) => c[0] === "issue" && c[1] === "close");
    expect(close).toBeDefined();
    expect(close).toEqual(["issue", "close", "42", "--repo", "o/r", "--comment", "Parity restored on the scheduled run (https://github.com/o/r/actions/runs/1). Closing automatically."]);
  });

  test("failing check with no open issue: files a new one carrying the check's own output", () => {
    const { gh, calls } = fakeGh([]);
    syncIssue("o/r", failing, gh);
    const create = calls.find((c) => c[0] === "issue" && c[1] === "create");
    expect(create).toBeDefined();
    expect(create).toContain("herdr parity drift detected");
    expect(create).toContain(LABEL);
    expect(create).toContain("--body-file");
  });

  test("failing check with an already-open issue: comments instead of creating a duplicate", () => {
    const { gh, calls } = fakeGh([{ number: 7, title: "herdr parity drift detected" }]);
    syncIssue("o/r", failing, gh);
    expect(calls.some((c) => c[0] === "issue" && c[1] === "create")).toBe(false);
    const comment = calls.find((c) => c[0] === "issue" && c[1] === "comment");
    expect(comment?.[2]).toBe("7");
    expect(comment?.some((s) => s.includes("new.thing"))).toBe(true);
  });

  test("ensureLabel swallows a failure (label already exists) instead of throwing", () => {
    const gh: Gh = () => { throw new Error("already exists"); };
    expect(() => ensureLabel("o/r", gh)).not.toThrow();
  });
});

describe("runUrl", () => {
  test("built from GITHUB_SERVER_URL + GITHUB_RUN_ID when both are set", () => {
    expect(runUrl("o/r", { GITHUB_SERVER_URL: "https://github.com", GITHUB_RUN_ID: "123" })).toBe("https://github.com/o/r/actions/runs/123");
  });
  test("undefined when either is missing", () => {
    expect(runUrl("o/r", {})).toBeUndefined();
    expect(runUrl("o/r", { GITHUB_RUN_ID: "123" })).toBeUndefined();
  });
});
