import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runParityCheck } from "../../scripts/parity/run.js";

/** A minimal herdr-shaped schema, parametrized by the inventory it should report. */
function schemaOf(opts: { protocol: number; methods: string[]; resultTags: string[]; subscriptionKinds?: string[]; eventKinds?: string[] }) {
  const subs = opts.subscriptionKinds ?? ["sub.a"];
  const events = opts.eventKinds ?? ["evt.a"];
  return {
    protocol: opts.protocol,
    schemas: {
      request: {
        oneOf: opts.methods.map((m) => ({ properties: { method: { const: m } } })),
        $defs: { Subscription: { oneOf: subs.map((s) => ({ properties: { type: { const: s } } })) } },
      },
      success_response: { $defs: { ResponseResult: { oneOf: opts.resultTags.map((t) => ({ properties: { type: { const: t } } })) } } },
      event: { $defs: { EventKind: { enum: events } } },
    },
  };
}

/**
 * A throwaway repo root wired to a fake `herdr` binary. The version and the
 * schema herdr "installs" are baked into the script's own source rather than
 * read from the environment at run time: Bun's execSync for the plain
 * `herdr --version` call (scripts/parity/run.ts has no `env` override there)
 * does not pick up process.env mutations made after the test process started
 * — confirmed directly, not assumed — so an env-var-driven fixture silently
 * saw an empty version in that call while the explicit-env `api schema`
 * call saw it fine. Baking values into the script sidesteps that.
 */
function fixture(opts: { version: string; theirs: unknown }) {
  const root = mkdtempSync(join(tmpdir(), "parity-run-"));
  mkdirSync(join(root, "schema"), { recursive: true });
  mkdirSync(join(root, "src/services"), { recursive: true });
  writeFileSync(
    join(root, "schema/herdr-api.schema.json"),
    JSON.stringify(schemaOf({ protocol: 22, methods: ["a.b"], resultTags: ["ok"] })),
  );
  writeFileSync(join(root, "schema/herdr-version.json"), JSON.stringify({ version: "0.9.1", protocol: 22 }));
  writeFileSync(join(root, "src/services/a.ts"), 'export class A { m() { return this.call("a.b", {}); } }');

  const schemaFile = join(root, "their-schema.json");
  writeFileSync(schemaFile, JSON.stringify(opts.theirs));

  const herdrBin = join(root, "herdr");
  writeFileSync(
    herdrBin,
    [
      "#!/usr/bin/env bash",
      "set -e",
      `if [ "$1" = "--version" ]; then echo "herdr ${opts.version}"; exit 0; fi`,
      `if [ "$1" = "api" ] && [ "$2" = "schema" ]; then cat ${JSON.stringify(schemaFile)}; exit 0; fi`,
      "exit 1",
    ].join("\n"),
  );
  chmodSync(herdrBin, 0o755);
  return { root, herdrBin };
}

const savedEnv = { ...process.env };
afterEach(() => {
  for (const k of Object.keys(process.env)) if (!(k in savedEnv)) delete process.env[k];
  Object.assign(process.env, savedEnv);
});

describe("runParityCheck", () => {
  test("passes when the installed herdr's schema matches ours and every method is wrapped", async () => {
    const { root, herdrBin } = fixture({ version: "0.9.1", theirs: schemaOf({ protocol: 22, methods: ["a.b"], resultTags: ["ok"] }) });
    process.env.HERDR_BIN = herdrBin;

    const r = await runParityCheck(root);
    expect(r.ok).toBe(true);
    expect(r.lines.join("\n")).toContain("OK — SDK matches herdr 0.9.1");
  });

  test("fails and names the exact added method/resultTag when herdr has drifted ahead", async () => {
    const { root, herdrBin } = fixture({
      version: "0.9.2",
      theirs: schemaOf({ protocol: 22, methods: ["a.b", "new.method"], resultTags: ["ok", "new_tag"] }),
    });
    process.env.HERDR_BIN = herdrBin;

    const r = await runParityCheck(root);
    expect(r.ok).toBe(false);
    const text = r.lines.join("\n");
    expect(text).toContain("methods: herdr ADDED 1 the SDK lacks: new.method");
    expect(text).toContain("resultTags: herdr ADDED 1 the SDK lacks: new_tag");
    expect(text).toContain("FAILED");
  });

  test("fails on a protocol change and on a stale wrapper for a method herdr dropped", async () => {
    const { root, herdrBin } = fixture({ version: "0.10.0", theirs: schemaOf({ protocol: 23, methods: [], resultTags: ["ok"] }) });
    process.env.HERDR_BIN = herdrBin;

    const r = await runParityCheck(root);
    expect(r.ok).toBe(false);
    const text = r.lines.join("\n");
    expect(text).toContain("protocol changed 22 → 23");
    expect(text).toContain("wrappers for methods herdr no longer has: a.b");
  });

  test("corroboration: warns without failing when GitHub disagrees with the installed version", async () => {
    const { root, herdrBin } = fixture({ version: "0.9.1", theirs: schemaOf({ protocol: 22, methods: ["a.b"], resultTags: ["ok"] }) });
    process.env.HERDR_BIN = herdrBin;

    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response(JSON.stringify({ tag_name: "v9.9.9" }), { status: 200 })) as unknown as typeof fetch;
    try {
      const r = await runParityCheck(root);
      expect(r.ok).toBe(true);
      expect(r.lines.join("\n")).toContain('reports latest release 9.9.9, but herdr.dev\'s install manifest served 0.9.1 instead');
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  test("corroboration: warns and names the single-source limitation when GitHub is unreachable", async () => {
    const { root, herdrBin } = fixture({ version: "0.9.1", theirs: schemaOf({ protocol: 22, methods: ["a.b"], resultTags: ["ok"] }) });
    process.env.HERDR_BIN = herdrBin;

    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => { throw new Error("offline"); }) as unknown as typeof fetch;
    try {
      const r = await runParityCheck(root);
      expect(r.ok).toBe(true);
      expect(r.lines.join("\n")).toContain("single-source limitation");
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
