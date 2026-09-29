#Requires -Version 7.0
<#
.SYNOPSIS
    Send the metadata/ folder (6 components + their items, added to the Hebrew parent unit) to the Kata
    (Katalog) catalog API at https://kata.cet.ac.il/api/v1.

.DESCRIPTION
    Walks the metadata tree top-down and UPSERTS each entity (GET by uniqueKey ->
    PATCH if it exists, else POST). Transforms the on-disk metadata into the API
    payloads, filling in required fields the metadata lacks (from the CONFIG block
    below) and remapping values that fall outside the API enums.

    Runtime: PowerShell 7+ and curl.exe (bundled with Windows 10/11).

    SAFETY: never hard-code the API key here — this script is committed. Supply it via
    -ApiKey, $env:KATA_API_KEY, or the git-ignored kata-api-key.txt next to this script
    (see SEND-METADATA.md). The script refuses to run without one and never logs it.

.PARAMETER DryRun
    Build and print every payload WITHOUT any network call. No key required.

.PARAMETER ApiKey
    The Kata API key. Overrides $env:KATA_API_KEY and kata-api-key.txt.

.PARAMETER BaseUrl
    Override the API base URL (default https://kata.cet.ac.il).

.PARAMETER MetadataDir
    Override the metadata folder (default: the metadata/ folder next to this script).

.EXAMPLE
    pwsh -File send-metadata.ps1 -DryRun
.EXAMPLE
    pwsh -File send-metadata.ps1
#>
[CmdletBinding()]
param(
    [switch] $DryRun,
    [string] $ApiKey,
    [string] $BaseUrl,
    [string] $MetadataDir,
    [string] $ParentUnitKey
)

# ═══════════════════════════════════════════════════════════════════════════════
#  ⚠️  SEND ONLY ON AN EXPLICIT INSTRUCTION (Arabic components, 2026-09-29)
# ═══════════════════════════════════════════════════════════════════════════════
#  methodica-ar-science-mass-measure-02 was rebuilt from the Hebrew unit
#  methodica-science-mass-measure-02. It has NO unit of its own in Kata: its six
#  components are added to the EXISTING Hebrew unit (parent-unit mode, below), as
#  in methodica-ar-math-ratio-01. The Hebrew unit's record is never written from
#  this repo — parent-unit mode only GETs it.
#
#  verify-metadata.ps1 assumes one unit per repo and does not fit this layout;
#  check a send with retrieve-metadata.ps1 -UnitKey methodica-science-mass-measure-02
#  before and after, and diff the two.
#
#  Only run this script against this unit on a fresh, explicit instruction. Keep
#  -DryRun on until you have one.
#
#  ── Values taken from the live Hebrew unit, not from metadata-ar/ ──
#  Component 02 isRequired=false matches the Hebrew 02 in Kata (metadata-ar/ had true;
#  owner decision 2026-09-29). Component 04 isRequired=false is what Kata holds for the
#  Hebrew 04; the Hebrew repo's local metadata/ (true) was never published.
#  Components 05 and 06 both have order 5, as the Hebrew 05/06 in Kata (06 is the
#  second-chance version of 05). The Hebrew repo's metadata-from/ shows 6 for 06; that
#  copy came from the old v2.4 retrieve script and does not match Kata (checked against
#  the raw API response, 2026-09-29).
#
#  ── Wire format: v2.5 names only ──
#  Kata stopped accepting the v2.4 field names in August 2026 (project owner,
#  2026-09-09). There is deliberately no legacy-name switch: emitting v2.4 names now
#  risks them being silently ignored, which would create records with fields missing
#  rather than failing loudly.
#
#  ⚠️ This repo was forked from the Hebrew -02, whose own send-metadata.ps1 still emits
#  v2.4 names: its 2026-09-01 run logged created=32 updated=1 failed=0 while Kata
#  dropped the legacy fields (recorded in methodica-ar-science-mass-measure-01). This
#  file replaces that script with the v2.5 one from methodica-ar-science-mass-measure-01
#  (a840a64). Treat a "successful" send as proof of nothing until the round-trip check
#  agrees.
# ═══════════════════════════════════════════════════════════════════════════════

# ============================================================================
#  CONFIG  — edit these before running
# ----------------------------------------------------------------------------
#  REUSE GUIDE — running this for a DIFFERENT unit? Touch only what applies:
#    (1) ALWAYS: set the API key, and point $MetadataDir at the unit's folder.
#    (2) PER-UNIT: usually fine as-is (title language, manufacture, overrides).
#    (3) CONTENT VOCABULARY: adjust ONLY for a different subject or new metadata
#        values — the cognitiveLevel codes (subject-specific!) and the small
#        value-mapping tables. If the metadata contains a value not covered here,
#        the script STOPS with a clear message naming it, so you know what to add.
#    (4) 720 STANDARD ENUMS: rarely change — they mirror the KATA spec.
#  Sections are ordered (1)->(4) below.
# ============================================================================

# ── (1) PER-RUN / ENVIRONMENT — always check ────────────────────────────────
# API key from Kata -> "מפתחות API" (/api-credentials).
# NEVER hard-code it here — this script is committed. It is resolved at runtime, in
# order, from: the -ApiKey parameter, the KATA_API_KEY environment variable, or the
# git-ignored key file below (one line, just the key). See SEND-METADATA.md.
$ApiKeyFile = Join-Path $PSScriptRoot 'kata-api-key.txt'
# API base URL (override at launch with -BaseUrl).
if (-not $BaseUrl) { $BaseUrl = 'https://kata.cet.ac.il' }
# Metadata folder to send (override with -MetadataDir). Defaults to ./metadata.
# This script lives in docs-and-tools/, so metadata/ is one level up at the repo root.
if (-not $MetadataDir) { $MetadataDir = Join-Path (Split-Path -Parent $PSScriptRoot) 'metadata' }
# Run log (git-ignored via *.log).
$LogFile = Join-Path $PSScriptRoot 'send-metadata.log'

# ── (2) PER-UNIT — usually fine as-is ───────────────────────────────────────
# PARENT UNIT — the Arabic components join the EXISTING Hebrew unit; there is no Arabic unit
# in KATA. KATA binds a learning objective to exactly one unit (a separate Arabic unit got
# 409 "objective already bound to a unit (strict 1:1)" for methodica-ar-math-ratio-01), and
# the KATA team's instruction (2026-09-25) is to add the Arabic components to the existing unit.
#
# When set, the unit is READ-ONLY: one GET confirms it exists, *_unit.json is not read, and
# no POST/PATCH ever goes to the unit — a PATCH here would overwrite the Hebrew unit's title,
# sectors and audience with this repo's values. Components are created under this key.
# -ParentUnitKey '' restores the original behaviour (upsert this repo's own *_unit.json).
if (-not $PSBoundParameters.ContainsKey('ParentUnitKey')) { $ParentUnitKey = 'methodica-science-mass-measure-02' }
# Where the CONTENT is served from, for hostedContentRef — the field Kata launches the
# component from. It must resolve.
#
# ⚠️ DELIBERATELY NOT DERIVED FROM $Comp.id. Until 2026-09-16 this script built the ref as
#   ($Comp.id.TrimEnd('/')) + '/index.html'
# and an id lives under 720active/ while the content is served from 720/. The split is
# correct by design — 720 v2.5 p.11 says an id "אינו חייב להוביל בפועל לדף אינטרנט פעיל",
# and no clause ties an id to a serving URL — so deriving one from the other produced a
# launch URL that serves 0 bytes. Kata currently holds the correct 720/ values, which means
# the next live run of this script would have overwritten a working launch path with a dead
# one, for every component of this unit.
#
# Take this from the unit's own DEPLOY.md deploy target. No trailing slash.
$ContentBaseUrl = 'https://lomdot.education.gov.il/metodica/720/ar/science/mass-measure/02'
# Title language key: wraps a string title into the API object, e.g.
#   "قياس الكتلة" -> { "Arabic": "قياس الكتلة" }. Arabic content.
$TitleLangKey = 'Arabic'
# Manufacture value sent on the unit (the metadata unit file carries none).
# v2.5 moved `manufacture` (free-text provider name, per COMPONENT) to `manufacturer`
# (MOE-assigned provider NUMBER, per UNIT). The value now comes from the unit metadata
# (metadata/*_unit.json -> "manufacturer": 310), so this hardcoded fallback is only used
# if that key is absent.
#
# ⚠️ Kata DERIVES this field server-side from the API key's provider account and ignores
# what we send: it has never been transmitted by this script, yet the live catalog returns
# manufacturer='מתודיקה' plus a manufacturerGroupId GUID, providerName and providerLogoUrl.
# So expect a round-trip diff on this one field, and do not read it as drift.
$UnitManufacture = 310
# Fallback depthLevel — used ONLY if a component's metadata omits it (components
# normally carry their own relativeDifficulty / depthLevel / cognitiveLevel).
$DefaultDepthLevel = 'core-curriculum-basic'
# Optional per-component overrides, keyed by uniqueKey (URL slug). An override
# WINS over the metadata value; unlisted components use their metadata value.
#   e.g. 'methodica-ar-science-mass-measure-02-05' = @{ relativeDifficulty = 4; depthLevel = 'core-curriculum-advanced' }
$ComponentOverrides = @{
}

# ── (3) CONTENT VOCABULARY — ADJUST PER UNIT / SUBJECT ───────────────────────
# These translate values found in the metadata into what KATA accepts. This is
# THE section to review when reusing. Unmapped/invalid values -> the script stops
# and names the offender (see Map-Enum / New-ComponentBody).
#
# Since metadata v2.3 the metadata files store the SAME kebab-case vocabulary the
# API uses, so these maps are only needed for legacy values left over from the
# pre-v2.3 files. Everything else passes through and is checked against the
# $Valid* lists in section (4).

# 3a. componentPurpose: metadata value -> API enum (see $ValidComponentPurpose).
$ComponentPurposeMap = @{
    'assessment' = 'practice'   # an assessment component (isAssessment already flags it)
}
# 3b. contentType (items): metadata value -> API enum (see $ValidContentType).
#     Both keys are pre-v2.3 spellings; current metadata needs no mapping.
$ContentTypeMap = @{
    'ClassroomTask' = 'project-or-inquiry-task'
    'Assessment'    = 'practice'
}
# 3c. cognitiveLevel: metadata value -> official MOE code — SUBJECT-SPECIFIC.
#     KATA validates against GET /api/v1/cognitive-levels. The codes turned out to
#     be kebab-case slugs identical to what the metadata stores, so this map only
#     translates the pre-v2.3 Title Case labels; a different subject (e.g. math)
#     has a different code set, so replace $ValidCognitiveLevel when reusing.
$CognitiveLevelMap = @{
    'Identifying'                    = 'identifying'                    # זיהוי
    'Describing'                     = 'describing'                     # תיאור
    'Retrieving Information'         = 'retrieving-information'          # איתור מידע
    'Providing Examples'             = 'providing-examples'              # מתן דוגמאות
    'Making Connections'             = 'making-connections'              # קישור
    'Interpreting'                   = 'interpreting'                    # פירוש
    'Applying a Model or Procedure'  = 'applying-a-model-or-procedure'   # שימוש במודל או בפרוצדורה
    'Explaining'                     = 'explaining'                      # הסבר
    'Providing Scientific Reasoning' = 'providing-scientific-reasoning'   # הנמקה מדעית
    'Analyzing'                      = 'analyzing'                       # ניתוח
    'Synthesizing'                   = 'synthesizing'                    # סינתזה
    'Evaluating and Justifying'      = 'evaluating-and-justifying'        # הערכה והצדקה
}
# ("NOT in KATA yet" removed from the four above on 2026-09-09 — all twelve science
#  codes are live. See the $ValidCognitiveLevel note below for how that was verified.)
# The codes KATA actually holds — VERIFIED live 2026-09-09 via
# GET /api/v1/cognitive-levels: 28 codes across four disciplines.
#
# ⚠️ THIS LIST WAS WRONG AND WOULD HAVE BLOCKED EVERY RE-SEND OF THIS UNIT.
# It previously held only 8 science codes and listed 'analyzing' /
# 'evaluating-and-justifying' / 'synthesizing' / 'providing-scientific-reasoning' in
# $PendingCognitiveLevel as "not loaded, would 422". All twelve science codes ARE
# loaded. (Found in methodica-science-mass-measure-01, where the stale list made
# New-ComponentBody throw on 'analyzing' and 'evaluating-and-justifying'.) This unit
# uses 'applying-a-model-or-procedure' (01-03), 'analyzing' (04, 05) and
# 'evaluating-and-justifying' (06) — all live.
#
# THIS UNIT IS SCIENCE, so the twelve `science` codes are the ones in play. The other
# three disciplines are retained because the endpoint accepts them and a cross-subject
# or reused copy of this script may need them — no edit required on reuse.
#
# To re-check: GET /api/v1/cognitive-levels returns {code, discipline, id, title}.
$ValidCognitiveLevel = @(
    # science (12) — all of 720 v2.2 pp.17-18, all live
    'identifying'
    'describing'
    'retrieving-information'
    'providing-examples'
    'making-connections'
    'interpreting'
    'applying-a-model-or-procedure'
    'explaining'
    'providing-scientific-reasoning'
    'analyzing'
    'synthesizing'
    'evaluating-and-justifying'
    # mathematics (4). Note the word order of 'interpretation-and-reasoning'
    # (NOT 'reasoning-and-interpretation').
    'algorithmic-thinking'
    'process-thinking'
    'interpretation-and-reasoning'
    'knowledge-and-recall'
    # geography (6)
    'recognize'
    'understand'          # also artificial-intelligence
    'apply'               # also artificial-intelligence
    'analyze-and-infer'
    'evaluate-and-decide'
    'inquiry-and-create'
    # artificial-intelligence (6) — 'apply' and 'understand' already listed above
    'remember'
    'analyze'
    'create'
    'evaluate'
)
# 28 rows from the endpoint = 26 DISTINCT codes: geography and
# artificial-intelligence both carry 'apply' and 'understand'. The list above is
# deduplicated, which is why the per-discipline counts do not sum to its length.
# Spec levels that exist in 720 but are NOT loaded in KATA — used only to give a
# clearer error than "unmapped value" when the metadata legitimately uses one.
# EMPTY as of the 2026-09-09 check. Kept as a mechanism: if a future spec level is
# not yet loaded, list it here to get an explanatory message instead of a bare
# "unknown value" — do not delete the variable.
$PendingCognitiveLevel = @()

# ── (4) 720 STANDARD ENUMS — rarely change (mirror the KATA spec) ────────────
# Used to fail fast on any value that maps outside the standard vocabulary.
# NOTE: these are kebab-case, matching what the live API returns and accepts —
# the Title Case tables in KATA-API.md's "Controlled Vocabularies" are stale.
$ValidComponentPurpose = @('instruction','practice','both')
# masteryLevel (720 v2.2) — was previously dropped from the payload entirely, so any
# value in the metadata never reached the catalog.
$ValidMasteryLevel     = @('basic','intermediate','advanced')
# Unit audience vocabularies. These used to be forwarded unvalidated, so a bad value only
# surfaced as a 422 from the live API — after the unit had already been created.
$ValidTargetSector     = @('state-general','state-religious','orthodox','arab-sector','druze-sector','bedouin-sector','special-education')
$ValidTargetAudience   = @('general','excellent','disadvantaged-populations','new-immigrants','students-with-special-needs','students-with-language-gaps','at-risk-students')
$ValidContentType      = @('instruction','practice','project-or-inquiry-task','educational-game','reading-text','simulation','motivational','solved-exercise','summary')
$ValidMediaFormat      = @('text','image','audio','video','animation','interactive-content','presentation')
# depthLevel is a plain enum (720 v2.2 p.16), not a coded taxonomy.
$ValidDepthLevel       = @('core-curriculum-basic','core-curriculum-advanced','core-curriculum-enrichment','non-core-basic','non-core-advanced','non-core-enrichment')

# ============================================================================
#  End of CONFIG
# ============================================================================

$ErrorActionPreference = 'Stop'
$script:counts = @{ created = 0; updated = 0; failed = 0 }

function Write-Log {
    param([string] $Message, [string] $Level = 'INFO')
    $line = "[{0}] {1}" -f $Level, $Message
    Write-Host $line
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
}

function Get-Slug {
    param([string] $Url)
    # Trim any trailing slash(es) first so a URL like ".../foo/" yields "foo", not "".
    return (($Url.TrimEnd('/')) -split '/')[-1]
}

# Percent-encode a key for a query string. Component and item keys are full IRIs (720
# v2.5 p.11), so they contain '/' and CANNOT travel in a URL path segment — the server
# decodes %2F before routing, which is why the old /components/{key} routes 404 on them.
# In a query parameter %2F is ordinary data. See Documentation/KATA/KATA-API.md.
function Enc {
    param([string] $Value)
    return [uri]::EscapeDataString($Value)
}

# -ApiKey > $env:KATA_API_KEY > the git-ignored key file. Returns '' if none is set.
function Resolve-ApiKey {
    if ($ApiKey)            { return $ApiKey.Trim() }
    if ($env:KATA_API_KEY)  { return $env:KATA_API_KEY.Trim() }
    if (Test-Path $ApiKeyFile) {
        return ((Get-Content -Raw -Path $ApiKeyFile -Encoding UTF8) -replace '\s', '')
    }
    return ''
}

function Map-Enum {
    param([string] $Value, [hashtable] $Map, [string[]] $Valid, [string] $FieldName, [string] $Where)
    $mapped = if ($Map.ContainsKey($Value)) { $Map[$Value] } else { $Value }
    if ($Valid -notcontains $mapped) {
        throw "Unmapped $FieldName value '$Value' at $Where — add it to the enum map or fix the metadata."
    }
    return $mapped
}

function Remove-Key {
    param([System.Collections.Specialized.OrderedDictionary] $Dict, [string] $Key)
    $copy = [ordered]@{}
    foreach ($k in $Dict.Keys) { if ($k -ne $Key) { $copy[$k] = $Dict[$k] } }
    return $copy
}

function Invoke-Kata {
    param([string] $Method, [string] $Path, $Body)
    $url = "$BaseUrl$Path"

    if ($DryRun) {
        Write-Log "DRY-RUN $Method $url"
        if ($null -ne $Body) {
            $json = $Body | ConvertTo-Json -Depth 12
            Write-Host $json
        }
        return @{ Code = '000'; Body = '(dry-run)' }
    }

    $tmp = [System.IO.Path]::GetTempFileName()
    try {
        $curlArgs = @('-sS', '-X', $Method, $url, '-H', "X-API-Key: $ApiKey")
        if ($null -ne $Body) {
            $json = $Body | ConvertTo-Json -Depth 12
            [System.IO.File]::WriteAllText($tmp, $json, (New-Object System.Text.UTF8Encoding($false)))
            $curlArgs += @('-H', 'Content-Type: application/json; charset=utf-8', '--data-binary', "@$tmp")
        }
        $curlArgs += @('-w', '\n%{http_code}')

        $raw = (& curl.exe @curlArgs 2>&1 | Out-String)
        $text = ($raw -replace "`r", '').TrimEnd("`n")
        $idx  = $text.LastIndexOf("`n")
        if ($idx -ge 0) {
            $code = $text.Substring($idx + 1).Trim()
            $bodyText = $text.Substring(0, $idx)
        } else {
            $code = $text.Trim()
            $bodyText = ''
        }
        return @{ Code = $code; Body = $bodyText }
    }
    finally {
        Remove-Item $tmp -ErrorAction SilentlyContinue
    }
}

function Test-Exists {
    param([string] $Path)
    if ($DryRun) { return $false }
    $code = (& curl.exe -s -o NUL -w '%{http_code}' -X GET "$BaseUrl$Path" -H "X-API-Key: $ApiKey")
    return ($code -eq '200')
}

# Upsert one entity. Returns $true on success (so children may proceed).
function Send-Entity {
    param(
        [string] $Label,
        [string] $GetPath,
        [string] $CreateMethod,
        [string] $CreatePath,
        $CreateBody,
        [string] $PatchPath,
        $PatchBody
    )
    $exists = Test-Exists $GetPath
    if ($exists) {
        $r = Invoke-Kata 'PATCH' $PatchPath $PatchBody
        $action = 'UPDATED'
    } else {
        $r = Invoke-Kata $CreateMethod $CreatePath $CreateBody
        $action = 'CREATED'
    }

    $ok = $DryRun -or ($r.Code -match '^2\d\d$')
    if ($ok) {
        if ($action -eq 'UPDATED') { $script:counts.updated++ } else { $script:counts.created++ }
        Write-Log ("{0,-7} {1} (HTTP {2})" -f $action, $Label, $r.Code)
    } else {
        $script:counts.failed++
        $snippet = ($r.Body -replace '\s+', ' ')
        if ($snippet.Length -gt 400) { $snippet = $snippet.Substring(0, 400) + '…' }
        Write-Log ("FAILED  {0} — {1} {2} (HTTP {3}) {4}" -f $Label, $CreateMethod, $CreatePath, $r.Code, $snippet) 'ERROR'
    }
    return $ok
}

# ---- Payload builders -------------------------------------------------------

function New-UnitBody {
    param($Unit)

    # uniqueKey comes from the last path segment of the unit id. Guard against an id that
    # stops at the unit FOLDER (".../mass-measure/02/"), which would silently key the unit
    # as "01" and collide with every other unit numbered 01.
    $unitKey = Get-Slug $Unit.id
    if ($unitKey -notmatch '^methodica-') {
        throw ("Unit uniqueKey resolves to '$unitKey' from id '$($Unit.id)' — expected a slug like " +
               "'methodica-ar-science-mass-measure-02'. The unit id must end with the unit slug, not the folder number.")
    }

    # targetSectors / targetAudience: validated rather than forwarded blind, so a bad
    # value fails here instead of as a 422 after the unit has already been PATCHed.
    foreach ($v in @($Unit.targetSectors)) {
        if ($ValidTargetSector -notcontains $v) {
            throw "Invalid targetSectors entry '$v' on the unit — expected one of: $($ValidTargetSector -join ', ')."
        }
    }
    # v2.5 made targetAudience a SINGLE value. Reject an array outright: forwarding one
    # is how the sibling unit silently ended up coerced to just its first element.
    if ($Unit.targetAudience -is [array]) {
        throw ("targetAudience must be a single value in 720 v2.5, but the metadata has an array " +
               "($($Unit.targetAudience.Count) entries). Pick one of: $($ValidTargetAudience -join ', ').")
    }
    if ($ValidTargetAudience -notcontains $Unit.targetAudience) {
        throw "Invalid targetAudience '$($Unit.targetAudience)' on the unit — expected one of: $($ValidTargetAudience -join ', ')."
    }

    $manufacturer = if ($null -ne $Unit.manufacturer) { $Unit.manufacturer } else { $UnitManufacture }

    $body = [ordered]@{
        uniqueKey         = $unitKey
        title             = [ordered]@{ $TitleLangKey = $Unit.title }
        learningObjective = $Unit.learningObjective
    }

    # ── The wire format: 720 v2.5 names, and only those ───────────────────────────
    # v2.5 renamed targetSector -> targetSectors, made targetAudience scalar, renamed
    # manufacture -> manufacturer and moved it to unit level, and REMOVED
    # prerequisiteLearningObjective (objective dependencies moved to the curriculum
    # index's `prerequisites`, which MOE owns). Kata stopped accepting the v2.4 names in
    # August 2026 — see the banner at the top of this file for why there is no fallback.
    $body.targetSectors  = @($Unit.targetSectors)
    $body.targetAudience = $Unit.targetAudience                         # v2.5: scalar
    $body.manufacturer   = $manufacturer
    return $body
}

function New-ComponentBody {
    param($Comp)
    $slug = Get-Slug $Comp.id
    $ov   = if ($ComponentOverrides.ContainsKey($slug)) { $ComponentOverrides[$slug] } else { @{} }

    # relativeDifficulty: override > metadata value > (last resort) component order.
    $relDiff = if ($ov.ContainsKey('relativeDifficulty')) { $ov.relativeDifficulty }
               elseif ($null -ne $Comp.relativeDifficulty)  { $Comp.relativeDifficulty }
               else { $Comp.order }

    # depthLevel: override > metadata value > fallback. Validated against the enum.
    $depth = if ($ov.ContainsKey('depthLevel')) { $ov.depthLevel }
             elseif ($Comp.depthLevel)          { $Comp.depthLevel }
             else { $DefaultDepthLevel }
    if ($ValidDepthLevel -notcontains $depth) {
        throw "Invalid depthLevel '$depth' at $slug — expected one of: $($ValidDepthLevel -join ', ')."
    }

    # cognitiveLevel(s): override wins; otherwise the metadata value already IS the MOE
    # code (kebab-case), and $CognitiveLevelMap only rewrites pre-v2.3 labels.
    #
    # READS the v2.5 name `cognitiveLevels` (an array) and collapses it to the single
    # value the rest of this function validates; falls back to the v2.4 scalar
    # `cognitiveLevel` so an un-migrated metadata folder still works. $ComponentOverrides
    # keeps the singular key — it is our own config, not the metadata format.
    #
    # ⚠️ Only the FIRST level is carried. v2.5 allows several per component; nothing in
    # this unit uses more than one. If that changes, this collapse and the validation
    # below both need to become list-aware — and $body.cognitiveLevels should carry the
    # whole list instead of @($cog).
    if ($ov.ContainsKey('cognitiveLevel')) {
        $cog = $ov.cognitiveLevel
    } else {
        $levels = @($Comp.cognitiveLevels | Where-Object { $_ })
        if ($levels.Count -eq 0 -and $Comp.cognitiveLevel) { $levels = @($Comp.cognitiveLevel) }
        if ($levels.Count -eq 0) {
            throw ("No cognitiveLevels at $slug — expected `"cognitiveLevels`": [`"<code>`"] (720 v2.5) " +
                   'or the pre-v2.5 scalar "cognitiveLevel". Check GET /api/v1/cognitive-levels for valid codes.')
        }
        if ($levels.Count -gt 1) {
            Write-Log ("$slug carries $($levels.Count) cognitiveLevels; only the first ('$($levels[0])') " +
                       'is sent. See the note in New-ComponentBody.') 'WARN'
        }
        $label = $levels[0]
        $cog   = if ($CognitiveLevelMap.ContainsKey($label)) { $CognitiveLevelMap[$label] } else { $label }
        if ($PendingCognitiveLevel -contains $cog) {
            throw ("cognitiveLevel '$cog' ($slug) is a 720 spec level that KATA has NOT loaded yet — it would fail " +
                   'with 422 "cognitiveLevel code does not exist". Re-check GET /api/v1/cognitive-levels; once the ' +
                   'code appears, move it from $PendingCognitiveLevel into $ValidCognitiveLevel and re-run. Meanwhile ' +
                   'either pick a released level in the metadata, or set an override in $ComponentOverrides. ' +
                   '(As of 2026-09-09 $PendingCognitiveLevel is empty and all 12 science levels are live, so ' +
                   'reaching this branch means the endpoint changed — verify before assuming the metadata is wrong.)')
        }
        if ($ValidCognitiveLevel -notcontains $cog) {
            throw ("Unknown cognitiveLevel '$label' at $slug — not one of the codes KATA holds for this subject: " +
                   "$($ValidCognitiveLevel -join ', '). Check GET /api/v1/cognitive-levels.")
        }
    }

    $purpose = Map-Enum $Comp.componentPurpose $ComponentPurposeMap $ValidComponentPurpose 'componentPurpose' $slug

    # NOTE: recommendedAfterFail is intentionally NOT set here. Those references can
    # point to components created later in the run (e.g. part 01 -> part 02), which
    # KATA rejects at create time ("... is not a component"). It's applied in a
    # separate PATCH pass after every component exists — see the Main section.

    # masteryLevel: optional in the metadata, but when present it must reach the catalog —
    # this field used to be dropped on the floor. Absent stays absent rather than being
    # defaulted. (Null on all four of this unit's components today, and absent from the
    # authored metadata, so this is a no-op here until someone sets it.)
    $mastery = $null
    if ($null -ne $Comp.masteryLevel -and "$($Comp.masteryLevel)".Trim() -ne '') {
        $mastery = $ValidMasteryLevel | Where-Object { $_ -ieq $Comp.masteryLevel } | Select-Object -First 1
        if (-not $mastery) {
            throw "Invalid masteryLevel '$($Comp.masteryLevel)' at $slug — expected one of: $($ValidMasteryLevel -join ', ')."
        }
    }

    $body = [ordered]@{
        # The full IRI, verbatim from metadata/ — NOT $slug. 720 v2.5 p.11 requires the
        # catalogue row itself to carry an IRI, and Kata reports `identifier_not_iri` on
        # any key that is a bare slug. $slug remains the lookup key for overrides above.
        uniqueKey              = $Comp.id
        title                  = $Comp.title
        componentPurpose       = $purpose
        isAssessment           = [bool] $Comp.isAssessment
        isRequired             = [bool] $Comp.isRequired
        relativeDifficulty     = [int] $relDiff
        order                  = [int] $Comp.order
        depthLevel             = $depth
    }

    # v2.5: cognitiveLevel -> cognitiveLevels, and it is an ARRAY (a component may carry
    # several thinking levels). Added after the literal because the surrounding block
    # keeps the field order stable in the emitted body.
    $body.cognitiveLevels = @($cog)

    $body.languages              = @($Comp.languages)
    $body.skills                 = @($Comp.skills)
    $body.estimatedTimeInMinutes = [int] $Comp.estimatedTimeInMinutes
    # "כתובת תוכן מתארח" — the component's hosted URL (folder + /index.html), built from
    # $ContentBaseUrl and NOT from $Comp.id. See the CONFIG note on $ContentBaseUrl.
    $body.hostedContentRef       = $ContentBaseUrl.TrimEnd('/') + '/' + $slug + '/index.html'
    if ($mastery) { $body.masteryLevel = $mastery }

    return $body
}

function New-ItemBody {
    param($Item, [int] $Order)
    $slug = Get-Slug $Item.id
    $contentType = Map-Enum $Item.contentType $ContentTypeMap $ValidContentType 'contentType' $slug
    # Canonicalize mediaFormat casing to the exact API enum value. The API is
    # case-SENSITIVE ('Interactive-Content' -> 422), but PowerShell -contains is
    # case-insensitive, so match case-insensitively and send the canonical form.
    $mediaFormat = $ValidMediaFormat | Where-Object { $_ -ieq $Item.mediaFormat } | Select-Object -First 1
    if (-not $mediaFormat) {
        throw "Invalid mediaFormat '$($Item.mediaFormat)' at $slug — expected one of: $($ValidMediaFormat -join ', ')."
    }
    $body = [ordered]@{
        # The full IRI, verbatim from metadata/ — see the note in New-ComponentBody.
        # $slug is kept above only for the enum error messages.
        uniqueKey        = $Item.id
        title            = $Item.title
        informationToBot = $Item.informationToBot
        contentType      = $contentType
        mediaFormat      = $mediaFormat
        order            = $Order
    }
    if ($null -ne $Item.questions -and @($Item.questions).Count -gt 0) {
        $body.questions = @($Item.questions)
    }
    return $body
}

# ---- Main -------------------------------------------------------------------

# Fresh log per run.
$modeLabel = if ($DryRun) { 'DRY-RUN (no network)' } else { 'LIVE' }
Set-Content -Path $LogFile -Value ("=== send-metadata {0} ===" -f $modeLabel) -Encoding UTF8

$ApiKey = Resolve-ApiKey
if (-not $DryRun -and -not $ApiKey) {
    Write-Log ("API key not set. Pass -ApiKey, set `$env:KATA_API_KEY, or put the key on one line in " +
               "$ApiKeyFile (get it from /api-credentials). Or run with -DryRun.") 'ERROR'
    exit 1
}
if (-not (Test-Path $MetadataDir)) {
    Write-Log "Metadata folder not found: $MetadataDir" 'ERROR'
    exit 1
}

Write-Log ("Base URL     : {0}" -f $BaseUrl)
Write-Log ("Metadata dir : {0}" -f $MetadataDir)
Write-Log ("Mode         : {0}" -f $modeLabel)

# 1) Unit — either an existing parent unit (read-only) or this repo's own unit (upserted)
if ($ParentUnitKey) {
    $unitKey = $ParentUnitKey
    Write-Log ("Parent unit  : {0} (read-only, not modified)" -f $unitKey)
    $r = Invoke-Kata 'GET' "/api/v1/content-units/$unitKey" $null
    $unitOk = $DryRun -or ($r.Code -eq '200')
    if (-not $unitOk) {
        Write-Log ("Parent unit {0} not found or not readable (HTTP {1}) — nothing sent." -f $unitKey, $r.Code) 'ERROR'
    }
} else {
    $unitFile = Get-ChildItem -Path $MetadataDir -Filter '*_unit.json' | Select-Object -First 1
    if (-not $unitFile) { Write-Log "No *_unit.json found in $MetadataDir" 'ERROR'; exit 1 }
    $unit = Get-Content -Raw -Path $unitFile.FullName -Encoding UTF8 | ConvertFrom-Json
    $unitKey = Get-Slug $unit.id

    $unitBody  = New-UnitBody $unit
    $unitPatch = Remove-Key $unitBody 'uniqueKey'
    $unitOk = Send-Entity -Label "unit $unitKey" `
        -GetPath "/api/v1/content-units/$unitKey" `
        -CreateMethod 'POST' -CreatePath '/api/v1/content-units' -CreateBody $unitBody `
        -PatchPath "/api/v1/content-units/$unitKey" -PatchBody $unitPatch
}

if (-not $unitOk) {
    Write-Log "Unit upsert failed — skipping components (cannot nest under a missing unit)." 'ERROR'
} else {
    # 2) Components (sorted by order), then 3) their items
    $compFiles = Get-ChildItem -Path $MetadataDir -Filter '*.json' |
        Where-Object { $_.Name -notlike '*_unit.json' }
    $comps = foreach ($f in $compFiles) {
        Get-Content -Raw -Path $f.FullName -Encoding UTF8 | ConvertFrom-Json
    }
    $comps = $comps | Sort-Object { [int] $_.order }

    # Component and item keys are full IRIs, so every route below is the query-string form
    # (/api/v1/component?componentKey=…). The plural /components/{key} routes carry the key
    # as a path segment and 404 on anything containing '/'. The unit key is still a slug
    # (v2.5 §2.7 exempts the content unit), so its routes are unchanged.
    foreach ($comp in $comps) {
        $compKey   = $comp.id
        $compSlug  = Get-Slug $comp.id      # for readable log labels only
        $compEnc   = Enc $compKey
        $compBody  = New-ComponentBody $comp
        $compPatch = Remove-Key $compBody 'uniqueKey'
        $compOk = Send-Entity -Label "component $compSlug" `
            -GetPath "/api/v1/component?componentKey=$compEnc" `
            -CreateMethod 'POST' -CreatePath "/api/v1/content-units/$unitKey/components" -CreateBody $compBody `
            -PatchPath "/api/v1/component?componentKey=$compEnc" -PatchBody $compPatch

        if (-not $compOk) {
            Write-Log "Component $compSlug failed — skipping its items." 'ERROR'
            continue
        }

        $order = 0
        foreach ($item in @($comp.subContent)) {
            $order++
            $itemKey   = $item.id
            $itemSlug  = Get-Slug $item.id
            $itemEnc   = Enc $itemKey
            $itemBody  = New-ItemBody $item $order
            $itemPatch = Remove-Key $itemBody 'uniqueKey'
            [void] (Send-Entity -Label "item $itemSlug" `
                -GetPath "/api/v1/component/item?componentKey=$compEnc&itemKey=$itemEnc" `
                -CreateMethod 'POST' -CreatePath "/api/v1/component/items?componentKey=$compEnc" -CreateBody $itemBody `
                -PatchPath "/api/v1/component/item?componentKey=$compEnc&itemKey=$itemEnc" -PatchBody $itemPatch)
        }
    }

    # 4) recommendedAfterFail — second pass, now that every component exists so
    #    forward references (e.g. part 01 -> part 02) resolve.
    $slugToIri = @{}
    foreach ($c in $comps) { $slugToIri[(Get-Slug $c.id)] = $c.id }

    foreach ($comp in $comps) {
        if (-not $comp.recommendedAfterFail) { continue }
        $compSlug = Get-Slug $comp.id
        $compEnc  = Enc $comp.id
        # A reference is a component KEY, so it must now be that component's IRI. This unit
        # stores these as bare slugs in metadata/ (other units store full IRIs), so resolve
        # either shape against the component ids rather than assuming one.
        $keys = @($comp.recommendedAfterFail | ForEach-Object {
            $s = Get-Slug ([string] $_)
            if ($slugToIri.ContainsKey($s)) { $slugToIri[$s] }
            else { Write-Log ("recommendedAfterFail on {0} names '{1}', not a component of this unit" -f $compSlug, $_) 'ERROR'; [string] $_ }
        })
        $r = Invoke-Kata 'PATCH' "/api/v1/component?componentKey=$compEnc" ([ordered]@{ recommendedAfterFail = $keys })
        if ($DryRun -or ($r.Code -match '^2\d\d$')) {
            $script:counts.updated++
            Write-Log ("LINKED  component {0} recommendedAfterFail -> [{1}] (HTTP {2})" -f $compSlug, (($keys | ForEach-Object { Get-Slug $_ }) -join ', '), $r.Code)
        } else {
            $script:counts.failed++
            $snippet = ($r.Body -replace '\s+', ' ')
            if ($snippet.Length -gt 400) { $snippet = $snippet.Substring(0, 400) + '…' }
            Write-Log ("FAILED  recommendedAfterFail on {0} (HTTP {1}) {2}" -f $compSlug, $r.Code, $snippet) 'ERROR'
        }
    }
}

Write-Log ("Done. created={0} updated={1} failed={2}" -f $script:counts.created, $script:counts.updated, $script:counts.failed)
if ($script:counts.failed -gt 0) { exit 1 }
