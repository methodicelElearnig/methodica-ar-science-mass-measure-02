# Sending metadata to the Kata catalog

`send-metadata.ps1` pushes the repo-root `metadata/` folder (1 unit + 6 components +
25 items) into the Katalog (Kata) catalog at `https://kata.cet.ac.il/api/v1`.
It **upserts**: for each entity it does a `GET` by uniqueKey, then `PATCH` if it
already exists or `POST` if it doesn't — so it's safe to run more than once.

The script lives in `docs-and-tools/` and resolves `../metadata` by default, so it is
run from the repo root.

## This unit: Arabic components inside the existing Hebrew unit

`methodica-ar-science-mass-measure-02` has **no unit of its own in KATA**. KATA binds a
learning objective to exactly one unit. A separate Arabic unit was rejected for the ratio unit
(`409 "objective already bound to a unit (strict 1:1)"`, 2026-09-24), and this unit shares
its objective with the Hebrew unit too. The KATA team's instruction is to add the Arabic
components to the existing unit, as `methodica-ar-math-ratio-01` and
`methodica-ar-science-mass-measure-01` do.

So the script runs in **parent-unit mode** by default: `$ParentUnitKey =
'methodica-science-mass-measure-02'` (the Hebrew unit; override with `-ParentUnitKey`).

- The parent unit is **read-only**. One `GET` confirms it exists, then the 6 Arabic components
  and their items are created under
  `/api/v1/content-units/methodica-science-mass-measure-02/components`. No `POST` / `PATCH` ever
  goes to the unit: a `PATCH` would overwrite the Hebrew unit's title, sectors and audience.
- The Arabic components keep the orders 1–6, the same numbers as the Hebrew ones. KATA
  accepts repeated orders in one unit.
- `metadata/methodica-ar-science-mass-measure-02_unit.json` is **not read or sent**. It stays in
  the repo as a record of the unit's own metadata. The Arabic unit title is added in the KATA UI.
- The script is the **v2.5** one from `methodica-ar-science-mass-measure-01` (field names
  `cognitiveLevels`, `manufacturer`, `targetSectors`). The Hebrew repo's script still emits
  v2.4 names, which KATA has silently dropped since August 2026.
- A clean dry run reports `created=31 updated=1 failed=0`: 6 components and 25 items, plus the
  `LINKED` line for `-02`'s `recommendedAfterFail` (→ `-01`).
- To check a send, run `retrieve-metadata.ps1 -UnitKey methodica-science-mass-measure-02` before
  and after, and diff the two.
- `-ParentUnitKey ''` restores the original behaviour (upsert this repo's `*_unit.json`).

## Requirements

- **PowerShell 7+** (`pwsh`). The script declares `#Requires -Version 7.0` and will
  not run on Windows PowerShell 5.1 (needed for correct array + UTF-8 JSON handling).
- **curl.exe** — bundled with Windows 10/11.

## One-time setup

Get an API key from the Kata UI → **מפתחות API** (`/api-credentials`), then make it
available in any **one** of these ways — the script checks them in this order:

1. `-ApiKey '<key>'` on the command line.
2. The `KATA_API_KEY` environment variable.
3. **`docs-and-tools/kata-api-key.txt`** — next to the script, one line, just the key.
   This is the usual choice; the file is git-ignored.

```powershell
# option 3, once — from the repo root:
'<your-key>' | Set-Content docs-and-tools\kata-api-key.txt -NoNewline
```

Outside `-DryRun` the script refuses to run when no key is found. The key is never
written to the log, and both scripts share the same file.

> **Never hard-code a key in the scripts** — unlike before, `send-metadata.ps1` and
> `retrieve-metadata.ps1` are committed. `kata-api-key.txt` is the only place a live key
> may sit on disk, and `.gitignore` excludes it.

## Usage

Run from the **repo root**, and from native PowerShell — Git Bash garbles the Hebrew in
the console output (the data itself is fine).

```powershell
# 1) Dry run — builds and prints every payload, no network, no key needed.
pwsh -File docs-and-tools\send-metadata.ps1 -DryRun

# 2) Live run — after setting up the key (see above).
pwsh -File docs-and-tools\send-metadata.ps1

# Optional overrides:
pwsh -File docs-and-tools\send-metadata.ps1 -BaseUrl 'https://kata.cet.ac.il' -MetadataDir '.\metadata'
```

A clean dry run for this unit reports `created=32 updated=1 failed=0` and exits 0 —
1 unit + 6 components + 25 items, plus one `LINKED` line for part `-02`'s
`recommendedAfterFail`.

Progress prints to the console and to `send-metadata.log` (git-ignored). Each line is
`CREATED` / `UPDATED` / `FAILED` with the HTTP status; the run ends with a
`created / updated / failed` summary and a non-zero exit code if anything failed.

## What the script does to the metadata

The metadata schema doesn't match the API 1:1, so the script transforms it. All of
this is controlled from the **CONFIG** block at the top of the file.

| Metadata | Sent to API |
|---|---|
| unit `id` (full URL) | `uniqueKey` = last path segment (slug), e.g. `methodica-ar-science-mass-measure-02`. Trailing slashes are trimmed first, so `…/foo/` yields `foo`, not `""`. The **unit** keeps a slug — 720 v2.5 §2.7 exempts the content unit, and Kata does not warn on it. |
| component / item `id` (full URL) | `uniqueKey` = **the IRI verbatim**, unchanged. Since 2026-09-15 (see below) these are no longer reduced to a slug. |
| unit `title` (string) | `title` object `{ "Hebrew": "…" }` (`$TitleLangKey`) |
| unit — (no manufacture) | `manufacture` = `'methodica'` (`$UnitManufacture`) |
| unit `targetSector` / `targetAudience` | passed through, but **validated** against `$ValidTargetSector` / `$ValidTargetAudience` first — a bad value stops the run instead of 422-ing after the unit was already created |
| component `relativeDifficulty` / `depthLevel` / `cognitiveLevel` | read **from the metadata**. Precedence is `$ComponentOverrides` > metadata value > fallback (component `order` for `relativeDifficulty`, `$DefaultDepthLevel` for `depthLevel`) |
| component `masteryLevel` | forwarded when present and non-null; absent stays absent rather than being defaulted. (All six components in this unit are `null`, so no key is emitted.) |
| component `id` | `uniqueKey` only. `hostedContentRef` is built from `$ContentBaseUrl` in the CONFIG block and is **not** derived from the id — an id lives under `720active/` and the content is served from `720/`, so deriving one from the other wrote a launch URL that serves 0 bytes (fixed 2026-09-16). |
| component `manufacture` | dropped (owning group is derived from the API key) |
| component `recommendedAfterFail` | the component IRIs, verbatim, applied in a **second pass** — see below |
| item — (no order) | `order` = 1-based position in `subContent[]` |
| `questions[]` | passed through unchanged |

### `recommendedAfterFail` is a second pass, not part of the create

These references can point at components created later in the same run, which KATA
rejects at create time (`"… is not a component"`). So `New-ComponentBody` deliberately
omits the field, and after every component exists the script issues one `PATCH` per
component that has any — logged as `LINKED`. Forward references are therefore fine.

### Identifier format — IRIs, and the route that follows from them

**Changed 2026-09-15.** Component and item `uniqueKey`s are the **full IRI** from
`metadata/`, not a slug. 720 v2.5 p.11 requires it, and Kata now says so directly: any
slug-keyed row comes back carrying

```json
{ "code": "identifier_not_iri", "field": "uniqueKey",
  "message": "uniqueKey should be an absolute IRI … Advisory for now." }
```

This forces the **route**, not just the payload. An IRI contains `/`, and a URL path
segment cannot — the server decodes `%2F` before routing, so `/api/v1/components/{key}`
returns `404` for every encoding of an IRI. All component and item calls therefore use
the query-string routes Kata shipped in the same release, with `Enc` (`[uri]::EscapeDataString`)
applied to every key:

| | route |
|---|---|
| component GET / PATCH | `/api/v1/component?componentKey=…` |
| item create | `/api/v1/component/items?componentKey=…` |
| item GET / PATCH | `/api/v1/component/item?componentKey=…&itemKey=…` |
| component create | `/api/v1/content-units/{unitSlug}/components` — unchanged, the key is in the body |
| everything unit-level | unchanged — the unit key is still a slug |

The one-time migration that renamed the existing rows is `rename-to-iri.ps1` (it also
reverts, with `-Revert`). `hostedContentRef` is unaffected and still derives from the
component `id`.

### The unit slug is guarded

`New-UnitBody` throws if `uniqueKey` resolves to anything that isn't a `methodica-*`
slug. This catches a unit `id` that stops at the folder (`…/mass-measure/02/`), which
would otherwise key the unit as the bare string `"02"` and collide with every other
unit numbered 02 across every subject.

### Enums are kebab-case — no translation needed

Since the metadata was aligned to 720 v2.3 it stores the **same kebab-case vocabulary
the API uses** (`core-curriculum-basic`, `project-or-inquiry-task`,
`interactive-content`, `applying-a-model-or-procedure`, `state-general`, …). So values
pass straight through and are only *checked* against `$ValidContentType` /
`$ValidMediaFormat` / `$ValidDepthLevel` / `$ValidComponentPurpose` in CONFIG
section (4).

`$ComponentPurposeMap` / `$ContentTypeMap` / `$CognitiveLevelMap` now only rewrite
leftover **pre-v2.3** spellings (`ClassroomTask`, `Assessment`, `Analyzing`, …), which
current metadata no longer contains. Any value outside the API enums makes the script
**stop with an error** naming the offender rather than send bad data.

> ⚠️ **Watch for word-reversed spellings.** This unit's metadata was authored with
> `content-interactive` and `task-inquiry-or-project` — the right words in the wrong
> order. Both were corrected (2026-08-16) to `interactive-content` and
> `project-or-inquiry-task`. The `$Valid*` lists hold the live vocabulary, so a dry run
> names any such value rather than letting it 422 mid-push.

### How the vocabularies were verified

Only two of the controlled vocabularies have list endpoints. Checked 2026-08-16:

| Endpoint | Result |
|---|---|
| `GET /api/v1/cognitive-levels` | **200** — authoritative |
| `GET /api/v1/skills` | **200** |
| `media-formats`, `content-types`, `depth-levels`, `mastery-levels`, `component-purposes`, `target-sectors`, `target-audiences` | **404** — no list endpoint |

For the seven with no endpoint, the reference is the **already-published sibling unit**
`methodica-science-mass-measure-01`: `GET /api/v1/content-units/methodica-science-mass-measure-01`
returns values KATA has actually accepted for this same subject and series. That is what
confirmed `interactive-content` and `project-or-inquiry-task`.

### `cognitiveLevel` — all 12 science levels are live

KATA validates `cognitiveLevel` against a **per-discipline coded taxonomy**
(`GET /api/v1/cognitive-levels`). Those codes are kebab-case slugs **identical to what
the metadata stores**, so no mapping is required — the value passes through and is
checked against `$ValidCognitiveLevel`.

Verified live 2026-08-16: **16 codes — 12 `science` + 4 `mathematics`.** All 12 science
levels from 720 v2.2 pp.17-18 are loaded, so `$PendingCognitiveLevel` is **empty** and
nothing is blocked. What this unit uses:

| Component | `cognitiveLevel` |
|---|---|
| `-01`, `-02`, `-03` | `applying-a-model-or-procedure` |
| `-04`, `-05` | `analyzing` |
| `-06` | `evaluating-and-justifying` |

`$PendingCognitiveLevel` is retained as a mechanism: if a future spec level isn't loaded
in KATA yet, listing it there produces an explanatory error instead of a bare "unknown
value", and the fix is to move it into `$ValidCognitiveLevel` once released.

`depthLevel`, by contrast, is a **plain enum** (720 v2.2 p.16), not a coded taxonomy, and
is read straight from the metadata.

## Going the other way

[`retrieve-metadata.ps1`](RETRIEVE-METADATA.md) pulls a unit back out of the catalog
into `metadata-from/` at the repo root, in this same file format, so you can diff the
catalog against the repo:

```bash
git diff --no-index metadata metadata-from
```

## Assumptions to verify on the first live run

Two mappings are best-guesses and isolated to single config points, so a first-call
`422` is a one-line fix:

1. ~~**`uniqueKey` = URL slug.**~~ **Settled 2026-09-15 — the catalog wants the full URL.**
   Kata now reports `identifier_not_iri` on any component or item key that is a bare slug
   ("uniqueKey should be an absolute IRI … per Ministry 720 v2.5 p.11 … Advisory for now"),
   so component and item keys are sent as the IRI verbatim and only the **unit** still goes
   through `Get-Slug`. See "Identifier format" below.
2. **Unit `title` is an object** `{ "Hebrew": "…" }`. If rejected, adjust the
   title builder in `New-UnitBody`.

Also unresolved, though it will not fail a dry run: the unit's
`prerequisiteLearningObjective` holds a **URL**
(`…/mass-measure/01/methodica-science-mass-measure-01/`) while the neighbouring
`subTopic` and `learningObjective` are MOE codes. There is no endpoint to check it
against, and picking the right code is a content decision — flagged, not guessed.

## Verify the result

- `GET /api/v1/content-units/methodica-ar-science-mass-measure-02` returns the unit with
  its components; spot-check one component and one item through the query routes, e.g.
  `GET /api/v1/component?componentKey=<url-encoded component IRI>`. The old
  `/api/v1/components/{key}` form `404`s on an IRI key — that is expected, not a fault.
- Every component and item should report `warnings: []`. A row still carrying
  `identifier_not_iri` was keyed with a slug.
- In the Kata UI: **יחידות תוכן** (`/author`).
- Re-run once — every entity should report `UPDATED` (not duplicated).
