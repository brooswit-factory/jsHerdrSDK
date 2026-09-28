# Changelog

All notable changes to `@brooswit/herdr-sdk`. Format is [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
entries are `## [x.y.z] - YYYY-MM-DD` with subsections from: `BREAKING`, `Added`, `Changed`, `Fixed`, `Removed`.
CI (`scripts/release/check.ts`) refuses a merge that changes `src/`, `schema/` or `package.json` without a new entry here.

## Versioning — what the numbers mean in this project

- **MAJOR** — a major restructuring or rewrite that breaks a lot of things, requiring reimplementation by consumers. Requires a `### BREAKING` section.
- **MINOR** — a new feature, or a change to an existing feature that breaks just that feature. Also the floor whenever `schema/herdr-api.schema.json` changes.
- **PATCH** — a fix or correction that requires no consumer code changes, or very minor ones.

## [0.2.0] - 2026-09-27
### Fixed
- Windows could never connect: the transport hardcoded `Bun.connect({ unix: path })`, a Unix-domain-only API with no platform branch. Replaced with `node:net`'s `Socket`, which handles both a Unix socket path (Linux/macOS, unchanged) and a Windows named pipe — matching herdr's own published address contract (`\\.\pipe\<path>`, prefixed byte-for-byte, never otherwise rewritten). Pinned by unit tests that inject `process.platform`, so this runs in ordinary CI without a Windows host.
- The SDK ignored `HERDR_SOCKET_PATH`, herdr's actual documented socket-path override, and read only the nonstandard `HERDR_SOCKET`. `HERDR_SOCKET_PATH` is now honored and takes precedence; `HERDR_SOCKET` remains a deprecated fallback for backward compatibility.
- The default socket path no longer hardcodes `~/.config/herdr/herdr.sock`. It now mirrors herdr's own config-dir resolution: `XDG_CONFIG_HOME` if set; else on Windows `%APPDATA%`, then `%USERPROFILE%\AppData\Roaming`, then `$HOME/.config`, then the temp dir; else (POSIX) `$HOME/.config`, then the temp dir.
### Added
- `HerdrClientOptions.dev` — point at a `herdr-dev` debug build's config dir instead of a release build's `herdr`. Never inferred at runtime; opt in explicitly.
- `HerdrClientOptions.sessionName` — connect to a named session's socket (`<configdir>/sessions/<name>/herdr.sock`) instead of the default.
- `configDir()` and `socketEndpoint()` exported from `src/transport/socket-path.ts` for anyone deriving these paths themselves.

## [0.1.3] - 2026-08-26
### Changed
- Repository moved to the brooswit-factory org; package.json repository/homepage/bugs URLs updated (npm provenance verifies repository.url against the building repo).

## [0.1.2] - 2026-08-24
### Fixed
- `package.json` now declares `repository`. npm provenance verification requires it to match the building repo; without it the registry refused 0.1.1 with E422, so 0.1.1 was never published and this is the first CI-published release.

## [0.1.1] - 2026-08-24
_Never published: the CI publish was refused by provenance verification (see 0.1.2)._
### Added
- In-process fake herdr for tests; the socket layer and every service wrapper are now covered without a running herdr. CI blocks merges under 90% line and function coverage.
### Added
- Every source file has a generated load test, and a meta-test that every file has one — a file no test imports is invisible to coverage and could ship unparseable.
- In-process fake herdr; the socket layer and all 91 service wrappers are tested without a running herdr. The code generator is tested and proven byte-identical to its committed output.
- CI blocks merges under 90% whole-project line and function coverage.
### Changed
- First release published by CI: npm provenance via trusted publishing, git tag and GitHub Release created automatically on merge to main.

## [0.1.0] - 2026-08-24
### Added
- Typed client for every herdr socket method (91 methods, protocol 20), generated from herdr's published schema.
- Subscriptions as an async iterator; typed `HerdrError` / `HerdrTransportError`; `isTimeout`.
- CI parity check against the latest herdr release.
