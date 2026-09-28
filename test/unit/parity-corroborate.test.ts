import { describe, expect, test } from "bun:test";
import { CORROBORATION_SOURCE, corroborateLatest } from "../../scripts/parity/corroborate.js";

const okFetch = (tag: string): typeof fetch =>
  (async () => new Response(JSON.stringify({ tag_name: tag }), { status: 200 })) as unknown as typeof fetch;

describe("corroborateLatest", () => {
  test("agrees when the GitHub release tag (v-stripped) matches the installed version", async () => {
    const r = await corroborateLatest("0.9.1", okFetch("v0.9.1"));
    expect(r).toEqual({ status: "match", source: CORROBORATION_SOURCE, githubVersion: "0.9.1" });
  });

  test("mismatch when GitHub's latest release differs from the installed version", async () => {
    const r = await corroborateLatest("0.9.0", okFetch("v0.9.1"));
    expect(r.status).toBe("mismatch");
    expect(r.githubVersion).toBe("0.9.1");
  });

  test("unavailable on a non-2xx response", async () => {
    const fetchImpl = (async () => new Response("nope", { status: 500 })) as unknown as typeof fetch;
    const r = await corroborateLatest("0.9.1", fetchImpl);
    expect(r.status).toBe("unavailable");
    expect(r.error).toContain("500");
  });

  test("unavailable when the network call throws", async () => {
    const fetchImpl = (async () => { throw new Error("ECONNRESET"); }) as unknown as typeof fetch;
    const r = await corroborateLatest("0.9.1", fetchImpl);
    expect(r.status).toBe("unavailable");
    expect(r.error).toContain("ECONNRESET");
  });

  test("unavailable on unparseable JSON", async () => {
    const fetchImpl = (async () => new Response("not json", { status: 200 })) as unknown as typeof fetch;
    const r = await corroborateLatest("0.9.1", fetchImpl);
    expect(r.status).toBe("unavailable");
  });

  test("unavailable when the response has no tag_name", async () => {
    const fetchImpl = (async () => new Response(JSON.stringify({ nope: true }), { status: 200 })) as unknown as typeof fetch;
    const r = await corroborateLatest("0.9.1", fetchImpl);
    expect(r.status).toBe("unavailable");
    expect(r.error).toContain("tag_name");
  });
});
