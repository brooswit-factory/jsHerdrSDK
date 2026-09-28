# Refreshing the herdr schema pin

This repo pins a copy of herdr's published API schema (`schema/herdr-api.schema.json`
+ `schema/herdr-version.json`) and generates typed wrappers from it. The
`parity` CI job (`.github/workflows/ci.yml`) and the scheduled
`herdr-parity-schedule` workflow (`.github/workflows/parity-schedule.yml`)
both install the latest published herdr at run time and run
`scripts/parity/check.ts` against it — when that diverges from the pin, this
is the procedure to refresh it.

This is written from what actually happened doing the refresh once, live:
FACTORY-400's herdr 0.9.1/protocol-22 refresh, [jsHerdrSDK#8](https://github.com/brooswit-factory/jsHerdrSDK/pull/8),
and FACTORY-404 re-running the same steps end to end to write this doc.
Verify each command against your own checkout before trusting it — this file
can go stale exactly like any other.

## 1. Install the herdr you're refreshing against, in isolation

A herdr client refuses `herdr update` from inside a running session, and you
do not want to touch the herdr your own session runs under anyway. Install
into a scratch directory instead, using the exact step CI uses:

```sh
export HERDR_INSTALL_DIR=/tmp/herdr-refresh-bin
curl -fsSL https://herdr.dev/install.sh | sh
"$HERDR_INSTALL_DIR/herdr" --version
```

`HERDR_BIN="$HERDR_INSTALL_DIR/herdr"` is what `scripts/parity/check.ts` and
`scripts/parity/scheduled.ts` read to find it (falls back to `herdr` on
`$PATH` if unset).

**Know what "latest" means here.** `install.sh` resolves "latest" from
`https://herdr.dev/latest.json` at run time — a single source. The parity
check cross-checks that against the `herdrdev/herdr` GitHub Releases API
(a separate, publisher-controlled source, filtered to non-prerelease tags) and
prints whether they agree; see step 3 below. If you want to double check
by hand: `gh api repos/herdrdev/herdr/releases/latest -q .tag_name` (or
`curl -fsSL https://herdr.dev/latest.json | head`) and compare against the
version the install script actually fetched.

## 2. Regenerate the schema and wrappers

```sh
"$HERDR_INSTALL_DIR/herdr" api schema --json > schema/herdr-api.schema.json
bun run generate   # regenerates src/generated/* from the new schema
```

Update `schema/herdr-version.json` (`{ "version": "...", "protocol": ... }`)
to match `"$HERDR_INSTALL_DIR/herdr" --version` and the schema's own
`.protocol` field — both files must move together, or `scripts/parity/check.ts`
will report a version/protocol mismatch even after the schema itself is
current.

## 3. Confirm parity passes locally, before touching wrappers

```sh
HERDR_BIN="$HERDR_INSTALL_DIR/herdr" bun run scripts/parity/check.ts
```

Read its output in order:
1. **version** — informational only; a mismatch here alone is not a failure.
2. **corroborating "latest"** — `✓` means the GitHub Releases API agrees with
   what the install manifest served; `⚠ ... disagree` or `⚠ ... could not
   reach ...` means treat the rest of this run's notion of "latest" with
   that in mind (see the note in step 1) — this step never fails the check
   by itself.
3. **API inventory** — the step that actually decides drift. On real drift it
   prints the exact added/removed method, resultTag, subscriptionKind, and
   eventKind names — that list is your task list for step 4, not a diff to
   reverse-engineer.
4. **service coverage** — flags a wrapper for a method herdr no longer has
   (`stale`, a real failure) separately from a method with no wrapper yet
   (`unwrapped`, a warning — a valid state via `client.call()` directly, but
   usually you want a wrapper for anything herdr just added).

## 4. Add typed wrappers for anything new

For each method the inventory step listed as added, add a typed wrapper
method in the matching `src/services/*.ts` file (group by the schema method's
own namespace prefix — see the existing files for the pattern: one thin
`this.call("namespace.action", params)` per method), and extend
`test/unit/every-wrapper-sends-its-method.test.ts` with a table entry for
each. Re-run step 3 until "service coverage" reports no stale wrappers and
(ideally) no unwrapped methods either.

## 5. Version bump

`CHANGELOG.md` states the rule and `scripts/release/check.ts` enforces it:
**a `schema/` change floors the bump at MINOR** — a patch bump against a
schema diff fails the release gate. Add a dated, non-empty `CHANGELOG.md`
entry at the top naming the new herdr version/protocol and the new methods,
bump `package.json`'s `version` to match, then confirm:

```sh
RELEASE_BASE=origin/main bun run scripts/release/check.ts
```

Watch for a version collision: if `main` moved (another PR merged) while you
were working, re-derive the bump against current `origin/main` rather than
whatever `main` was when you started — FACTORY-400 hit exactly this
(`main` moved from 0.1.3 to 0.2.0 mid-refresh) and had to rebase and rebump.

## 6. Full local check before pushing

```sh
bun run check    # generate && typecheck && test:unit (incl. coverage gate) && verify-generated-is-committed
bun run build
```

`bun run check` does **not** run `scripts/parity/check.ts` (parity is a
separate CI job, not part of the release gate — see the note in this repo's
top-level docs on why parity drift blocks merges but not publishing); run
parity yourself as step 3 above before opening the PR.

## What does NOT need touching

- The release/publish workflow (`.github/workflows/release.yml`) is not
  gated on parity and needs no changes for a routine refresh.
- Branch protection / `enforce_admins` — never touch this as part of a
  refresh, regardless of how red `main` currently is.
