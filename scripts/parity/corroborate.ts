/**
 * FACTORY-400's refresh trusted herdr.dev's install-script manifest
 * (https://herdr.dev/latest.json, the same URL install.sh reads) as the sole
 * definition of "latest herdr" — a stale or wrong manifest would never be
 * caught. This cross-checks that manifest-installed version against the
 * herdrdev/herdr GitHub Releases API, a genuinely separate source (a
 * different host, publisher-controlled, filtering out `prerelease` tags)
 * rather than another read of the same manifest.
 */
export interface Corroboration {
  status: "match" | "mismatch" | "unavailable";
  source: string;
  githubVersion?: string;
  error?: string;
}

const GITHUB_API = "https://api.github.com/repos/herdrdev/herdr/releases/latest";
export const CORROBORATION_SOURCE = "api.github.com/repos/herdrdev/herdr/releases/latest";

export async function corroborateLatest(
  installedVersion: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Corroboration> {
  const source = CORROBORATION_SOURCE;
  const headers: Record<string, string> = {
    "User-Agent": "jsHerdrSDK-parity-check",
    Accept: "application/vnd.github+json",
  };
  const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetchImpl(GITHUB_API, { headers });
  } catch (e) {
    return { status: "unavailable", source, error: e instanceof Error ? e.message : String(e) };
  }
  if (!res.ok) return { status: "unavailable", source, error: `HTTP ${res.status}` };

  let body: unknown;
  try {
    body = await res.json();
  } catch (e) {
    return { status: "unavailable", source, error: `bad JSON: ${e instanceof Error ? e.message : String(e)}` };
  }
  const tag = (body as { tag_name?: unknown } | null)?.tag_name;
  if (typeof tag !== "string" || !tag) return { status: "unavailable", source, error: "response had no tag_name" };

  const githubVersion = tag.replace(/^v/, "");
  return { status: githubVersion === installedVersion ? "match" : "mismatch", source, githubVersion };
}
