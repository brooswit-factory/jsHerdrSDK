import { tmpdir } from "node:os";
import path from "node:path";

/** Joins with the given platform's own separator, regardless of the host OS `node:path` normally assumes. */
function joinFor(platform: NodeJS.Platform, ...parts: string[]): string {
  return (platform === "win32" ? path.win32 : path.posix).join(...parts);
}

/** Options that steer socket-path resolution away from the ordinary release-build default. */
export interface SocketPathOptions {
  /**
   * Point at a `herdr-dev` debug build's config dir instead of a release build's `herdr`.
   * herdr's own debug builds use `herdr-dev` as their app-dir name; this SDK never guesses
   * that at runtime — pass it explicitly when you know you're talking to a dev server.
   */
  dev?: boolean;
  /** A named session's socket lives at `<configdir>/sessions/<name>/herdr.sock`, not `<configdir>/herdr.sock`. */
  sessionName?: string;
}

function appDirName(dev: boolean): string {
  return dev ? "herdr-dev" : "herdr";
}

/**
 * Mirrors herdr's own config-dir resolution (`config_dir()` in herdr's `src/config/io.rs`):
 * `XDG_CONFIG_HOME` if set; else on Windows `%APPDATA%`, then `%USERPROFILE%\AppData\Roaming`,
 * then `$HOME/.config`, then the temp dir; else (POSIX) `$HOME/.config`, then the temp dir.
 */
export function configDir(
  env: Record<string, string | undefined> = process.env,
  platform: NodeJS.Platform = process.platform,
  dev = false,
): string {
  const appDir = appDirName(dev);
  const j = (...parts: string[]) => joinFor(platform, ...parts);
  if (env.XDG_CONFIG_HOME) return j(env.XDG_CONFIG_HOME, appDir);
  if (platform === "win32") {
    if (env.APPDATA) return j(env.APPDATA, appDir);
    if (env.USERPROFILE) return j(env.USERPROFILE, "AppData", "Roaming", appDir);
    if (env.HOME) return j(env.HOME, ".config", appDir);
    return j(tmpdir(), appDir);
  }
  if (env.HOME) return j(env.HOME, ".config", appDir);
  return j(tmpdir(), appDir);
}

/**
 * herdr's socket path: `HERDR_SOCKET_PATH` (herdr's own published override) if set; else the
 * deprecated `HERDR_SOCKET` fallback, kept for backward compatibility; else herdr's default,
 * `<configdir>/herdr.sock` (or `<configdir>/sessions/<name>/herdr.sock` for a named session).
 */
export function defaultSocketPath(
  env: Record<string, string | undefined> = process.env,
  platform: NodeJS.Platform = process.platform,
  opts: SocketPathOptions = {},
): string {
  if (env.HERDR_SOCKET_PATH) return env.HERDR_SOCKET_PATH;
  if (env.HERDR_SOCKET) return env.HERDR_SOCKET;
  const dir = configDir(env, platform, opts.dev ?? false);
  return opts.sessionName
    ? joinFor(platform, dir, "sessions", opts.sessionName, "herdr.sock")
    : joinFor(platform, dir, "herdr.sock");
}

/**
 * The address `node:net`'s `createConnection` actually needs to reach herdr's listener:
 * unchanged on Linux/macOS (a real Unix-domain socket at that path); on Windows, herdr's
 * server only writes a marker file at this path and listens on the named pipe
 * `\\.\pipe\<path>` instead (a published herdr contract, matched byte-for-byte — the path
 * itself is never otherwise rewritten).
 */
export function socketEndpoint(path: string, platform: NodeJS.Platform = process.platform): string {
  return platform === "win32" ? `\\\\.\\pipe\\${path}` : path;
}
