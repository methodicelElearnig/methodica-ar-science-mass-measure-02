# SELF-QA — Figma-exact behavior/design spec for critical recurring elements

This file applies to all sub-projects in this directory (`methodica-science-mass-measure-03-01`
through `-06`, and any new Sain added later), the same scope as `CLAUDE.md`. Where `CLAUDE.md`
documents *bugs that happened and must not happen again*, this file documents *exact Figma values
for elements that must always match Figma pixel-for-pixel* — colors, borders, radii, icon assets,
and state-by-state behavior for recurring template categories and shared chrome elements. **Figma
is the source of truth.** If a screen's CSS disagrees with the tables below, the CSS is wrong, not
the table.

Figma file: `720 — UI Templates` (fileKey `eSbp4bKHgBky0rakDb8l9N`). Every value below was pulled
live via `get_design_context`/`download_assets` on the node IDs cited per section — none of it is
estimated from a screenshot or guessed from "looks about right."

Canonical icon assets (already extracted, copy into each project's own `assets/images/` — every
Sain keeps its own asset copies per the project's independence convention, never a shared folder):
- Green standalone checkmark (16×16, fill `#609E12`) — used inline in `ValueInputQuestion` only.
- Red standalone X (16×16, fill `#B20010`) — used inline in `ValueInputQuestion` only.
- White checkmark glyph (16×11) — for use *inside* a colored circle badge (any size: 22px/26px/32px).
- White X glyph (16×16) — for use *inside* a colored circle badge.
(The white glyphs are one shape family reused at multiple badge sizes across the design system —
scale the SVG via the container's `width`/`height`, don't treat different badge sizes as different
icons.)

Shared tokens already correct across this family — reuse, never reinvent:
`--subject-500: #019de5` (focus/selected/dragging blue) · `--subject-700: #007ac6` ·
`--subject-100` fill `#d4f3ff` (selected/dropped background) · Feedback/Correct/300 `#609e12` ·
Feedback/Correct/100 `#edf8ed` · Feedback/Incorrect/300 `#b20010` · light-pink `#fff0f4` (DDQ-image
wrong-card background only) · body text `#303030` (Assistant).

---

## 1. ValueInputQuestion — inline fill-in-the-blank "answer box"
Figma nodes: `196:3401` (correct), `196:3409` (incorrect), `196:3393` (focus).

Base box: 180×42px, radius 10px, padding 0 16px, white background, Assistant Regular 24px,
color `#303030`, text-align right. **In Figma**, the icon sits at the box's own physical right edge
via a flex row (two children — a text box and an icon box — with `justify-content: flex-end` and a
10px gap between them). **This codebase implements it differently**, and correctly so: a single
`<input>` element can't have child elements, so the icon is a CSS `background-image` on the input
itself, with enough reserved `padding-right` to keep it clear of the text (see checklist below) —
don't try to force a real flex/gap layout here, and don't read the Figma description above as
literal implementation guidance.

| State | Border | Icon | Text color | Background |
|---|---|---|---|---|
| Focus (typing) | **1.5px solid `var(--subject-500)`** | none | `#303030` | white |
| Correct | **1px solid `#609e12`** | 16×16 green check, right edge, `background-position: right 16px center` | `#303030` (**never recolored**) | **white** |
| Incorrect | **1px solid `#b20010`** | 16×16 red X, right edge, same position | `#303030` (**never recolored**) | **white** |

⚠️ **White background, even though the box is locked/`disabled` at that point.** A common
`<input>` pattern is `input:disabled { background-color: #f5f5f5; }` (a generic "this field is
locked" gray) — Figma's own correct/incorrect answer box is `bg-white` in both outcomes, with no
gray anywhere. If a `:disabled` rule sets `background-color` and the `.correct`/`.wrong` classes
don't explicitly set it back to white, the disabled-gray silently wins (same or higher specificity,
later class rule with no competing property doesn't override it) and every locked answer box reads
as grayed-out instead of white-with-a-colored-border — a real bug found on
`methodica-ar-science-mass-measure-02-04` screen `s1` ("מסך 2"), not a hypothetical.

**Self-QA checklist:**
- [ ] Border is exactly 1px on correct/incorrect (1.5px is the focus-state width only).
- [ ] Icon is the real downloaded SVG asset, not a hand-drawn/inline data-URI shape.
- [ ] Icon `background-position` is `right 16px center` (matches the box's own 16px padding — 10px is wrong).
- [ ] Text color never changes on correct/incorrect — only the border + icon change.
- [ ] **The value text and the icon must never overlap.** Since the icon is a `background-image` on
      the `<input>` itself (not a separate flex child, unlike Figma's own two-element AnswerBox),
      the correct/wrong/error states need `padding-right: 42px` (16 base + 16 icon + 10 gap) — not
      the base rule's plain 16px — or a 2+ character value paints directly under the icon.
- [ ] `<input type="number">` must have its native spin-button arrows suppressed
      (`::-webkit-outer/inner-spin-button { -webkit-appearance: none }` + `-moz-appearance:
      textfield`) — Figma's box has no such control, and browsers show one by default.
- [ ] Every state-transition code path (first-wrong, final-wrong, correct, and the reveal-toggle's
      two directions) must each explicitly add the class that produces its border/icon — check this
      in the JS, not just the CSS. A path that only sets `disabled`/shows feedback text without also
      adding `.correct`/`.error`/`.wrong` will silently render with no border or icon at all.
- [ ] **The icon must appear on the first wrong attempt too, not only the final one.** Figma's
      "Incorrect" node doesn't distinguish attempt number — a border-only first-attempt style (icon
      added only once the attempts are exhausted) is a real, recurring gap, not an intentional
      design choice.
- [ ] The correct/incorrect box stays **white**, not gray, even though it's `disabled`/locked at
      that point. If the project has a generic `input:disabled { background-color: #f5f5f5 }` rule
      (or similar), the `.correct`/`.wrong`/`.revealed` classes must explicitly set
      `background-color: #fff` to win over it — check this by reading the actual computed
      background, not just by confirming the border color is right.

---

## 2. SingleChoiceQuestion — Image Options ("SingleChoiceQuestion - ImageOptions" in Figma)
Figma nodes: `2134:26163` (default+selected), `2134:26170` (full correct-screen state),
`2134:26792` (selecting), `2134:26841` (correct-selected), `2134:26879` (incorrect-selected).

Square photo card with a caption (bold 32px title + regular 24px sub-line) below it.

| State | Border | Background | Radius | Badge |
|---|---|---|---|---|
| Default (unselected) | 3px solid `rgba(201,206,216,0.4)` | white | 16px | none |
| Selecting (clicked, not yet checked) | 3px solid `var(--subject-500)` | `var(--subject-100)` `#d4f3ff` | **24px** | none |
| Correct (after check) | 3px solid `#609e12` | white | 16px | 32×32 circle, bg `#609e12`, overlapping the top-right corner (`top:-16px`), white checkmark |
| Incorrect (after check) | 3px solid `#b20010` | white | 16px | 32×32 circle, bg `#b20010`, same corner (`top:-19px`), white X |

**Reference implementation:** `methodica-science-mass-measure-03-01`, screen `s15` (מסך 16,
"בחרו את המאזניים המתאימים") — `.s15-card`/`.s15-card-frame`/`.s15-card-badge` in `styles.css`.
⚠️ This screen uses project-specific class names, not a generic `scq-image-option`-style name — a
keyword/pattern search across the family will miss it (and would miss any other screen built the
same way in a different project). Verify visually screen-by-screen if you need certainty that no
other instance of this template exists somewhere under an unexpected class name.

**Self-QA checklist:**
- [ ] Radius is **24px only** while "selecting" (pre-check) — every other state (default, correct, incorrect) uses 16px. A single hardcoded radius across all states is wrong.
- [ ] The correct/incorrect badge is a real circle (32×32, colored background + white glyph), overlapping the card's top-right corner — not a corner-clipped triangle, not a plain small icon with no circle.
- [ ] The badge element must live outside any ancestor with `overflow:hidden` (e.g. as a sibling of
      the bordered image frame, not a child of it) or it will be clipped where it's meant to poke
      out past the border.
- [ ] Selecting/correct/incorrect backgrounds are never a same-hue *tint* of the border color —
      selecting uses the `--subject-100` fill, correct/incorrect stay white. A tinted background on
      correct/incorrect (borrowed from a different template's convention) is wrong.

---

## 3. DragAndDropQuestion — Text-fill / "Image Top" layout (fixed images above targets,
draggable text pills below — Figma name `ImageTopDragAndDropQuestion`)
Figma nodes: `1444:37398` (before interaction), `1451:37198` (dragging), `1451:37257` (all
dropped/blue), `1460:38215` (correct pill), `1460:38261` (incorrect pill).

**Draggable text pill:**

| State | Border | Background | Text | Badge |
|---|---|---|---|---|
| Idle in word bank | 1.5px solid `#ececec` | white | `#303030`, 24px | none |
| Being dragged | 1.5px solid `var(--subject-500)` | white | `#303030`, 24px | none |
| Dropped, not yet checked | 1.5px solid `var(--subject-500)` | `var(--subject-100)` `#d4f3ff` | **`#222`, 22px** (differs from idle!) | none |
| Correct (after check) | 1.5px solid `#609e12` | **white** (reverts from blue) | `#303030`, 24px (reverts) | 26×26 circle bg `#609e12`, at the pill's own physical right edge, 10px gap from text — not a corner overlay, white checkmark. ⚠️ Figma's own layer is authored LTR and calls this property `justify-content: flex-end`; in this codebase's `direction:rtl` pill, the CSS that actually produces the same right-anchored visual result is `justify-content: flex-start` (per CLAUDE.md rule #3) — implement for the visual outcome, not by copying the raw Figma property name. |
| Incorrect (after check) | 1.5px solid `#b20010` | white | `#303030`, 24px | 26×26 circle bg `#b20010`, same right-edge position, white X |

**Drop zone (empty target):**
| State | Background | Border |
|---|---|---|
| Default | `#f3f4f5` | 1px dashed `rgba(0,0,0,0.6)` |
| Hover (dragging over it) | white | 1px dashed `var(--subject-500)` |

**Image frame above each target:** square (1:1 aspect; actual px floats with column count/available
width — don't hardcode one instance's pixel value into a different-column-count screen), border
3px solid `rgba(201,206,216,0.4)`, radius 16px; inner photo centered, ~79% of frame width, radius
16px, `object-fit: cover`.

⚠️ **Confirmed family-wide bug, fixed 2026-08-02 across every project that has this template**
(Sain 1, 3, 5, 6): the shared `makeDragQuestion()` factory's `.dq-snt-drop.correct/.wrong
.dq-placed-card::after` rule used a **CSS `content: '✓'`/`content: '✕'` Unicode text glyph**
recolored via `color:`/`font-size`, with **no circle badge at all**, and separately recolored the
placed text itself (`.dq-placed-card { color: #3d6b0a / #7a000a }`) — Figma does neither. The fix:
replace the `::after` rule with a real circle (`border-radius:50%`, colored `background-color`,
a real white-glyph SVG as `background-image`) and delete the text-recolor rule entirely.

```css
.dq-snt-drop.correct .dq-placed-card::after {
  content: ''; display: inline-block; width: 26px; height: 26px; flex-shrink: 0;
  border-radius: 50%; background-color: #609e12;
  background-image: url('assets/images/<white-check-badge>.svg');
  background-repeat: no-repeat; background-position: center; background-size: 12px 9px;
}
/* mirror for .wrong with #b20010 + white-X, background-size ~12px 12px */
```

**Self-QA checklist:**
- [ ] The correct/incorrect badge is a real colored circle with a white glyph inside — never a
      bare colored Unicode character.
- [ ] **The glyph asset is actually white — verify by opening the file, not by trusting its
      filename.** A family-wide asset bug exists where `icon-check-white.png`/`icon-x-white.png`
      (present, byte-identical, in every project's `assets/images/`) are actually solid green/red
      despite the name — sample a pixel if in doubt. Using them as a badge glyph on a same-colored
      circle makes the icon nearly invisible.
- [ ] The placed pill's text color never changes on correct/incorrect (`#303030` throughout).
- [ ] Gap between the pill's text and the badge is **10px** (a 6px gap has recurred across multiple
      projects, including the "gold reference" implementation — check this explicitly, it's easy to
      leave at whatever the pre-badge value happened to be).
- [ ] **The badge must render on the physical right of the text, not the left.** `.dq-placed-card`
      is `direction: rtl` with a bare text node followed by a `::after` badge — in an RTL flex row,
      the *first* item in document order lands at the main-axis start (physical right), so the text
      claims the right edge and the badge (always last, via `::after`) lands to its *left* by
      default. `justify-content` does NOT fix this (it only positions the whole group, never
      reorders items within it) — the fix is `order: -1` on the `::after` rule, moving the badge
      before the text in flex order.
- [ ] **The draggable pill must be the same width in the word bank (before dragging) as it is once
      placed in a target.** Figma's own pill is a consistent width across every state — don't size
      the source-bank item to fit only its own text (e.g. a tight `min-width`) while the target zone
      is sized wider to fit the longest label + badge. Both the source item and the target zone
      should be sized together, to fit the *longest* label used on the screen plus the badge that
      appears after checking — otherwise the learner sees a visibly smaller item that's supposed to
      fill a visibly bigger slot, which reads as broken even though nothing is functionally wrong.
- [ ] Idle word-bank pill border is 1.5px `#ececec` (not the ValueInputQuestion-style
      `rgba(174,174,174,0.5)`).
- [ ] Drop-zone default background is `#f3f4f5` with a **dashed** border (not solid).
- [ ] Dropped-but-unchecked state uses 22px/`#222` text and `#d4f3ff` background — this is a
      transient look distinct from both idle and resolved states; don't collapse it into one of them.
- [ ] Known open limitation (Sain 3): the "being dragged" pill's blue border cannot be forced onto
      the *native browser drag-image snapshot* via CSS alone — the snapshot is taken before any
      `.dragging` class lands. Fixing this properly needs `e.dataTransfer.setDragImage()` JS, out of
      scope for a CSS-only pass; note it if a producer specifically flags the drag-preview color.
- [ ] **A drop-zone/pill's width must never be matched to the image above it.** In a hand-written
      (non-factory) variant of this template, a too-tight zone (sized to fit text alone, before a
      badge existed) was widened to fit the longest label + badge + gap — the natural instinct was
      to widen the image above it to the same width for visual symmetry, but the image has a fixed
      `aspect-ratio`, so widening it also grows its height and can push content below a fixed-size
      canvas. Size the image and the drop-zone/pill independently; nothing requires a column's image
      and its zone to share a width.

---

## 4. DragAndDropQuestion — Image / "Classic"/"ImageOnly" layout (the draggable items themselves
are photos — Figma name `ImageOnlyDragAndDropQuestion`)
Figma nodes: `391:4247` (before interaction), `391:4388` (correct, isolated card), `395:4303`
(incorrect, isolated card). Mid-drag states (`391:4294`/`391:4341`) were not deep-inspected in this
pass — verify those two directly against Figma before shipping this template anywhere.

**Source draggable image card (idle):** 167×167px, border 3px solid `rgba(201,206,216,0.4)`,
radius 16px, white background.

**Empty target slot:** 167×167px, background `#f8f8f8`, border 1.5px dashed `#bdbdbd`, radius 10px.

**After check:**
| State | Card background | Border | Radius | Badge |
|---|---|---|---|---|
| Correct | white | 2px solid `#609e12` | **10px** (smaller than the 16px idle radius) | 22×22 circle bg `#609e12`, inset **inside** the card's own top-right corner (`right:4.5px; top:4.5px`), white checkmark |
| Incorrect | **`#fff0f4`** (light pink — not white) | 2px solid `#b20010` | 10px | 22×22 circle bg `#b20010`, same inset corner, white X |

**Self-QA checklist:**
- [ ] Correct-state radius is 10px, not the 16px used by the idle source card — this is a real
      Figma value, not a typo to "fix."
- [ ] Incorrect-state card background is the light-pink tint `#fff0f4`, not white.
- [ ] The correct/incorrect badge sits **mostly inside** the card's own corner (4.5px inset on both
      edges) — this is visually different from category 2's 32px badge, which floats detached
      *outside* the card. Don't reuse the same badge-position CSS for both templates.
- [ ] No project in this family has built this template yet (as of 2026-08-02) — when one does,
      also verify the two un-inspected mid-drag states (`391:4294`, `391:4341`) directly against
      Figma, since they weren't captured in this pass.

---

## 5. MixedAnswerQuestion — paired free-text input + dropdown (Figma name `MixedAnswerQuestion`)
Figma nodes: `1126:15739` (default, State01), `1126:16444` (input focus, State02), `1126:16592`
(input filled, State03), `1126:16739` (dropdown open, State04), `1126:16897` (dropdown selected /
input filled-blurred, State05), `1126:17063` (correct/incorrect feedback, State06). Confirmed
against a second, standalone Figma component too — `DropdownQuestion/Multiple Blanks` (`415:8332`
state02, `731:10387` state06) — which has no paired input at all, so **every rule below for the
dropdown applies to a lone fill-in-the-sentence dropdown just as much as to one paired with an
input**; this isn't a MixedAnswerQuestion-only quirk.

A sentence-fill (or table-cell) question with two independently-behaving controls sharing one
180×42px, radius-10px token — a free-text input (`question/textbox` → "answer box") and a custom
dropdown (`question/textbox` → "textbox"). Despite the shared token, the two controls diverge in
exactly one respect: how they look while the learner has not focused/opened them.

**Free-text input:**

| State | Border | Opacity |
|---|---|---|
| Idle (empty) | 1px `rgba(174,174,174,0.5)` | 1 (never dims) |
| Focus (typing) | 1.5px `var(--subject-500)` `#019de5` | 1 |
| **Filled, blurred (before check)** | **1.5px `#ececec`** | 1 |
| Correct (after check) | 1px `#609e12` + real green-check icon (see §1) | 1 |
| Incorrect (after check) | 1px `#b20010` + real red-X icon (see §1) | 1 |

The filled-blurred row is a **third, distinct resting state** — not the idle gray, not the focus
blue. Easy to miss because it only shows up once the learner types something and clicks/tabs away
*before* pressing check.

**Dropdown:**

| State | Border | Opacity |
|---|---|---|
| Idle (closed, empty) | 1px `rgba(174,174,174,0.5)` | **0.8** |
| Open (menu showing) | 1.5px `var(--subject-500)` `#019de5` — same blue token as input focus | **1** |
| Selected, closed (before check) | 1px `rgba(174,174,174,0.5)` — **unchanged from idle** | **0.8** |
| Correct (after check) | 1px `#609e12`, chevron replaced by real check icon | **0.8** |
| Incorrect (after check) | 1px `#b20010`, chevron replaced by real X icon | **0.8** |

⚠️ **The dropdown sits at 80% opacity in every state except while its menu is open** — including
the final correct/incorrect state. This is a consistent Figma signal across all 6 states, not a
one-off default. **The input is never dimmed, in any state.** Unlike the input, the dropdown does
not get a distinguishing border color once it has a value — only its opacity changes between
open/closed.

⚠️ **Correct/incorrect badge position — the input and the dropdown must render it on the *same*
physical side (right, adjacent to the value), and a naive port from one to the other silently
breaks this.** The input places its check/X via a `background-image` at the box's own physical
right edge — direction-agnostic, always correct. A hand-rolled dropdown, by contrast, typically
renders its value in a `<span>` with `flex: 1` (so the value fills the box while the menu is
closed-with-a-caret) inside a `direction: rtl` flex row, with the check/X badge added as a `::after`
pseudo-element (necessarily last in DOM order). That combination — RTL row + a flex-grow value span
that is *first* in DOM order + a badge that is *last* in DOM order — makes the value span swallow
all the free space and pushes the badge to the far *opposite* edge, detached from the text, on the
correct/incorrect state specifically (the closed-idle state looks fine, which is why this hides
until someone answers a question and looks at the result). The fix, same technique as CLAUDE.md rule
#3: on the correct/incorrect/revealed classes only, drop the value span's `flex: 1` down to
`flex: 0 1 auto` and give the `::after` badge `order: -1` so it's placed before the value in flex
order — plus `justify-content: flex-start; gap: 10px` on the button itself. Don't assume matching
border/opacity/icon-asset means the layout is also right — check the actual physical position of the
badge relative to the text at all three outcomes (idle-with-value, correct, incorrect), not just its
color.

**Reference implementation:** `methodica-ar-science-mass-measure-02-04`, screen `s1` ("מסך 2", the
two-table practice screen) — `.tbl-input` / `.tbl-dd-btn` in `styles.css`.

**Self-QA checklist:**
- [ ] Input has **three** distinct resting border states, not two: idle gray, focus blue, and
      filled-blurred `#ececec`. A filled-but-unfocused input that still shows the plain idle border
      is missing this third state.
- [ ] Dropdown trigger has `opacity: 0.8` by default and `opacity: 1` only while its option list is
      open — driven by the same state/attribute that controls the list's visibility (e.g.
      `[aria-expanded="true"]`), not a separate flag that can drift out of sync.
- [ ] Do not copy the dropdown's opacity rule onto the input, and do not invent a "has a selection"
      border color for the dropdown to mirror the input's filled-blurred state — the dropdown's own
      spec has no such border, only the opacity change.
- [ ] To detect "input has a value while blurred" in pure CSS, the `<input>` needs
      `placeholder=" "` (a single space) so `:not(:placeholder-shown)` works — don't reach for a JS
      state class unless the project already tracks that input's value in JS for another reason.
- [ ] Known open item, not yet fixed anywhere in the family (as of 2026-08-06): the dropdown's
      closed-state caret in this codebase is a hand-drawn CSS border-triangle, not the real exported
      Figma "v open" SVG asset — inconsistent with the same screen's input, which does use real SVG
      assets for its correct/incorrect icons. Left unfixed pending explicit approval; don't fix
      opportunistically as a drive-by while touching the states above.
- [ ] The dropdown's correct/incorrect badge lands snug against the right edge of the *text*, not
      detached at the opposite end of the box. Verify this visually (or by reading the actual
      rendered DOM order + computed flex properties, not just the CSS source) — a value span with
      `flex: 1` inside a `direction: rtl` row plus a `::after` badge is the specific combination that
      breaks this silently; see the ⚠️ note above for the exact fix.

---

## 6. Bottom-bar navigation buttons — Check/"צדקתי?", Hint/"אפשר רמז?", Back/"חזרה"
Figma nodes: `1126:16900`–`1126:16903` (`FixedNavigationBar` instance showing all three together —
check enabled, hint disabled, back), `1126:15748` (check, disabled state, from `MixedAnswerQuestion`
State01), `731:10387` (hint, enabled state, `DropdownQuestion` State06 bottom bar). Shared mechanism
doc: node `2567:20391` ("nav label" — an invisible SemiBold "sizer" reserves the button's max width
so it never resizes between states; the *visible* label is always Assistant Regular, never Bold/
SemiBold).

All three buttons share: pill radius `1000px`, `Assistant` font at `20px`, `min-width: 140px`,
horizontal padding `20px` — and, critically, **every state of every button renders at the exact same
total height: 39px.** Figma achieves this with a different padding/content recipe per button (12px
padding + text for check/back; 7.5px padding + a 26×24 icon for hint-disabled), but the codebase
should not rely on that arithmetic landing correctly on its own — **set `height: 39px` explicitly**
on the shared base rule so every state inherits it with no drift, rather than trusting
padding+line-height math across browsers/fonts.

| Button | State | Height | Padding | Border | Background | Text color |
|---|---|---|---|---|---|---|
| Check ("צדקתי?" / Figma "continue") | Enabled | 39px | `0 20px` | none | 3-stop gradient, top→bottom: `#005FBE` 9%, `#0059B2` 23.361%, `#003971` 100% | white |
| Check | Disabled | **39px (same as enabled)** | `0 20px` | none | `#AEAEAE` | `#303030` |
| Hint ("אפשר רמז?") | Disabled (pre-attempt) | 39px | `0 20px` | 1px `#aeaeae` | white | `#aeaeae` (+ gray idea icon **26×24px** — wider than tall, `gap: 6px`) |
| Hint | Enabled (post-attempt) | 39px | `0 20px` | 1px `#007ac6` (**subject-700**) | white | `#007ac6` |
| Back ("חזרה") | Single state | 39px | `0 20px` | 1px `#007ac6` (**subject-700**) | white | `#007ac6` (no icon) |

⚠️ **subject-700 (`#007ac6`) vs subject-500 (`#019de5`)** — the hint button's enabled/only-shown
color is the single most commonly confused value in this family. `#019de5` is the *focus/dragging*
token used elsewhere (input focus border, dropdown open border); it does **not** belong on the hint
or back buttons, whose token is `#007ac6`.

**Reference CSS** (verified against Figma, currently implemented in
`methodica-ar-science-mass-measure-02-02/styles.css`):

```css
.btn-continue {
  display: flex; align-items: center; justify-content: center;
  height: 39px;
  background: linear-gradient(180deg, #005FBE 9%, #0059B2 23.361%, #003971 100%);
  color: #ffffff; border: none; border-radius: 1000px;
  font-family: 'Assistant', sans-serif; font-size: 20px; font-weight: 400;
  padding: 0 20px; min-width: 140px; box-sizing: border-box;
  cursor: pointer; white-space: nowrap;
}
.btn-continue:disabled { background: #AEAEAE; color: #303030; cursor: not-allowed; }

.btn-hint {
  display: flex; align-items: center; justify-content: center;
  height: 39px;
  background: #ffffff; color: #007ac6; border: 1px solid #007ac6; border-radius: 1000px;
  font-family: 'Assistant', sans-serif; font-size: 20px; font-weight: 400;
  padding: 0 20px; min-width: 140px; box-sizing: border-box;
  cursor: pointer; gap: 6px; white-space: nowrap;
}
.btn-hint .scq-hint-icon { flex-shrink: 0; width: 26px; height: 24px; }
.btn-hint:disabled { color: #aeaeae; border-color: #aeaeae; cursor: not-allowed; }

.btn-back {
  display: flex; align-items: center; justify-content: center;
  height: 39px;
  background: #ffffff; color: #007ac6; border: 1px solid #007ac6; border-radius: 1000px;
  font-family: 'Assistant', sans-serif; font-size: 20px; font-weight: 400;
  padding: 0 20px; min-width: 140px; box-sizing: border-box;
  cursor: pointer; white-space: nowrap;
}
```

**A project's own explicit product decision can legitimately override the *timing* of hint
visibility without it being a bug** — e.g. `methodica-ar-science-mass-measure-02-02` shows its hint
button visible-and-enabled from screen load on some screens (`sq2`–`sq6`) instead of the family's
default "hidden until first wrong attempt" (still used on that same project's `dd8`/`drag9`
screens) — but this is documented with an explicit code comment citing the client request, right
above the `.btn-hint` rule. **Never infer such a deviation from the code alone; a visibility/timing
difference with no comment explaining it is a bug, not a feature.** Either way, the *color/size*
spec above still applies regardless of which visibility timing a screen uses.

**Self-QA checklist:**
- [ ] `height: 39px` is set explicitly on the shared base rule for all three button classes — not
      left to padding+line-height arithmetic, which drifts across button types/fonts and was the
      actual root cause the first time this was audited (2026-08-06): no button in any of the 6
      Sain projects had an explicit height, and disabled/enabled state pairs happened to match each
      other but the family-wide value itself was ~45-51px, not 39px.
- [ ] `min-width: 140px`, not a fixed `width: 140px` — a fixed width silently clips a longer label
      (this already happened once and needed a one-off `#s12-continue-btn { width: auto;
      min-width: 140px }` patch in Sain 1 rather than a systemic fix).
- [ ] Check button's gradient has all **3** stops (`#005FBE 9%`, `#0059B2 23.361%`, `#003971 100%`)
      — a 2-stop simplification (dropping the middle `#0059B2` stop) was found in every single Sain
      project and is visually a flatter, slightly different blue than Figma's.
- [ ] Hint/back border-width is `1px`, not `1.5px` (a value found copy-pasted into every project).
- [ ] Hint enabled color and back color are `#007ac6` (subject-700) — check specifically for
      `#019de5` (subject-500) on the hint button; it was wrong in every project audited so far.
- [ ] Hint icon is `26×24px` (width×height — **wider than tall**, matching the real bulb glyph's
      aspect ratio). Getting width/height transposed (`24×26`) visibly squishes/stretches the icon —
      this exact mistake was made once already in this doc's own first draft of this table and
      propagated into `methodica-ar-science-mass-measure-02-02`'s CSS before the client caught it from a
      screenshot (2026-08-06) — always sanity-check "is the icon wider or taller than it is X" against
      the Figma node directly, never trust a remembered number without re-deriving width vs height.
      `26×22` (the inner glyph's tighter bounding box, Figma height `22.288px`) is an acceptable
      rounding of the same shape and is not a bug — `24×26` is the actual bug.
- [ ] Hint font-size is `20px`, matching check/back — not `18px`.
- [ ] Before "fixing" a screen's hint-visibility timing to match the family default, check for a
      code comment documenting an explicit client request first (see note above).

---

## Change log

Everything below happened the same day (2026-08-02), as one long QA/fix session across categories
1, 2, and 3, run against this specific family's 6 existing sub-projects
(`methodica-science-mass-measure-03-01` through `-06`). Category 4 was never found built anywhere in
the family and so was never touched. This log is a brief summary of what each round found, kept here
so the reasoning behind the tables/checklists above isn't lost — it doesn't depend on any other file
to be useful. A companion document, `SELF-QA-gap-report-2026-08-02.md`, has the full narrative
detail (file:line references, before/after values, verification steps) for anyone working in *this*
family who wants to trace a specific fix back to its source; it isn't needed anywhere else and
doesn't need to travel with this file if this spec is reused in an unrelated project.

- **Round 1** — Initial Figma extraction + family-wide keyword-search QA pass across all 6
  sub-projects. Found and fixed: the DDQ text-fill Unicode-glyph/text-recolor bug (Sain 1, 3, 5, 6),
  the ValueInputQuestion border-width/hand-drawn-icon/text-recolor bug (Sain 1, 2), and the SCQ
  image-option card missing-badge/wrong-tint bug (Sain 1, screen `s15` — missed by the initial
  automated survey, found and fixed after the client pointed directly at the screen since it uses
  project-specific class names a keyword search couldn't match).
- **Round 2** — Client asked for a proper manual (non-keyword-search) re-audit of categories 1/3/4
  before any further fix, with explicit approval required first (see
  `SELF-QA-mapping-2026-08-02-pending-approval.md` for the full mapping). Found and fixed (after
  approval): ValueInputQuestion `text-align`/`padding` (Sain 1, 2); DDQ text-fill idle-pill border,
  drop-zone colors, missing dropped-unchecked text style, and badge/text gap in every project that
  has this template (Sain 1 `s11`/`s16`, Sain 3, Sain 5, Sain 6); the family-wide misnamed-white-icon
  asset bug where it was an active visible problem (Sain 5's badge); and Sain 1's hand-written `s17`
  variant, which needed a badge added from scratch plus zone/image-frame styling fixes.
- **Round 3** — Client live-tested the fixed screens and found real interaction bugs a static CSS
  read can't catch: (1) Sain 1's `viqCheck()` never added any class on the final wrong attempt, so
  no border/icon showed at all — a JS bug, not a CSS mismatch; (2) native browser number-input spin
  arrows were visible (not part of the Figma design) in both Sain 1 and 2; (3) the value text and the
  correct/incorrect icon visually overlapped for 2+ character values, since both were anchored to the
  same position with no reserved gap; (4) the DDQ badge rendered on the wrong (left) side of the text
  everywhere the template exists, because `justify-content` only positions the item *group* and never
  reorders items within it — the real fix was `order: -1` on the badge, which Round 2's
  `justify-content` change could never have achieved.
- **Round 4** — One more full live-verification pass, explicitly checking both the first *and*
  second wrong attempts and every DDQ screen's badge. Found one more gap (Sain 2's first wrong
  attempt had no icon, unlike its final attempt) and fixed it; confirmed everything else already
  matched Figma via real drag/fill/click interactions on every affected screen (not just reading
  code).
- **Round 5** — Client caught a sizing regression from Round 2's own `s17` badge fix: forcing the
  placed pill to `width: 100%` of a zone that was only ever sized for text (184px) meant the longest
  label overflowed once a 26px badge was added. First fix attempt (matching the zone width to the
  image above it) was itself wrong and reverted within the same pass — the image has a fixed aspect
  ratio, so widening it also grew its height and pushed content below the visible canvas. Actual fix:
  widen only the zone (to 260px, sized for the longest label + badge + gap) and leave the image at
  its original size, since a column's image and drop-zone never need to share a width.
- **Round 6** — Client immediately noticed the follow-on issue Round 5 left behind: the source-bank
  pill (before dragging) was still 180px wide while the target zone was now 260px — an obvious size
  mismatch. Fixed by widening the source pill's `min-width` to match the zone (260px), so both are
  always uniform. This is now a general checklist rule in category 3 above, not just an `s17` note.
- **Round 7** (2026-08-06) — Client supplied Figma frames for a template not covered by any prior
  round, `MixedAnswerQuestion` (paired free-text input + dropdown). Found two real gaps that existed
  in neither this doc nor the code: the input's third "filled-but-blurred" `#ececec` border state,
  and the dropdown's always-`opacity:0.8`-unless-open treatment (a real, consistent Figma signal the
  input never gets). Documented both as category 5 above and fixed both in the reference
  implementation (`methodica-ar-science-mass-measure-02-04`, screen `s1`/"מסך 2"). The dropdown's
  non-Figma CSS-triangle caret icon was noted as a known gap but left unfixed, pending approval.
- **Round 8** (2026-08-06, same day) — Client live-tested Round 7's fix and found the dropdown's
  correct/incorrect check/X badge rendering detached at the box's far (wrong) edge, disconnected from
  the value text — while the input's own badge was correctly snug against its text. Root cause: the
  dropdown's value `<span>` has `flex: 1` (needed so it fills the box while showing the closed-state
  caret) inside a `direction: rtl` row, and the badge is a `::after` pseudo-element (always last in
  DOM order) — that specific combination makes the value span swallow all free space and strand the
  badge at the opposite edge, visible only once a question is actually answered (the idle-with-value
  state looks fine, which is why Round 7's checklist-driven pass — checking border/opacity values,
  not physical layout — missed it). Verified the SVG assets themselves were byte-identical to a fresh
  Figma re-download before concluding the bug was positional, not a fake-icon issue. Fixed with the
  same `order: -1` technique CLAUDE.md rule #3 already documents for an analogous RTL-badge bug
  elsewhere in the family; documented as a new ⚠️ note + checklist item in category 5 above so a
  border/opacity-only re-check doesn't repeat this gap on the next project that builds this template.
- **Round 9** (2026-08-06, same day) — Client noticed every locked correct/incorrect input on
  `methodica-ar-science-mass-measure-02-04` screen `s1` had a gray background, which doesn't exist in
  Figma (both outcomes are `bg-white`). Root cause: a generic `.tbl-input:disabled { background-color:
  #f5f5f5 }` rule (the project's plain "this field is locked" style) was never overridden back to
  white by `.tbl-input-correct`/`.tbl-input-wrong` — those classes set border + icon but no
  `background-color`, so the disabled-gray simply never got contested. This is a category 1
  (ValueInputQuestion) gap, not category 5-specific — any project with a `:disabled` gray-background
  convention on its answer box is exposed to it. Added a Background column + a ⚠️ note + a checklist
  item to category 1 above; fixed in the reference implementation. Not yet swept across the other 5
  sub-projects that also implement ValueInputQuestion — flagged as a follow-up, not done in this round.
- **Round 10** (2026-08-06, same day) — Client asked to sweep the whole family so Rounds 7–9's fixes
  don't recur elsewhere, naming three specific screens to check: Sain 1 `s18` (inputs) and `s19`
  (dropdown), Sain 2 `dd8` (dropdown). Grepped every project for `type="number"`/`type="text"` answer
  inputs and `aria-haspopup="listbox"` dropdowns to confirm nothing else exists in the family (Sain 3,
  5, 6 have neither template at all; Sain 1 only has `s18`/`s19`; Sain 2 only has `dd8`; Sain 4's `s1`
  was already fixed in Rounds 7–9).
  - `s18` had the exact Round 9 gray-background bug (`.s18-input:disabled` background never
    overridden back to white by `.s18-input-correct`/`.s18-input-wrong`) — fixed the same way.
  - `s19` and `dd8` turned out to have **more** wrong than Sain 4's `tbl-dd-btn` ever did, despite
    looking like the same component: (1) the correct/incorrect badge was a bare colored Unicode
    character (`content: '✓'`/`content: '✕'`) with no SVG at all — the exact "fake icon" bug the
    client originally (and correctly, just on the wrong screen) suspected; (2) the same `flex:1`
    value-span RTL-badge-detachment bug from Round 8; (3) correct/incorrect border was 1.5px instead
    of Figma's 1px; (4) the open-menu state had no border-color/opacity change at all — only the
    arrow rotated, so opening the dropdown gave no visual "focused" feedback. Fixed all four in both
    `s19` (`methodica-ar-science-mass-measure-02-01`) and `dd8` (`methodica-ar-science-mass-measure-02-02`)
    using the same real SVG assets, border values, and `order: -1` technique as the Sain 4 reference.
    Sain 2 had no `icon-answerbox-*.svg` files at all (every Sain keeps independent asset copies) —
    added fresh ones, verified byte-identical to the Figma source before use.
  - Updated category 5's node list to cite the standalone `DropdownQuestion/Multiple Blanks` component
    (`415:8332`/`731:10387`) alongside `MixedAnswerQuestion`, since this round confirmed the opacity
    and badge-position rules hold for a lone dropdown too, not just one paired with an input.
- **Round 11** (2026-08-06, same day) — Client asked for a pure audit (no fixes yet) of the three
  bottom-bar buttons — Check/"צדקתי?", Hint/"אפשר רמז?", Back/"חזרה" — against Figma, requiring the
  CSS be exact *and* uniform for every button of the same type everywhere in the family, with
  explicit emphasis that a button's disabled and enabled states must render at the identical size.
  Sampled 2 screens per project (6 general-purpose sub-agents in parallel, one per Sain, each with
  the full Figma spec inlined so they didn't need Figma access themselves) plus a manual follow-up
  check on Sain 3 (initially skipped by its sub-agent because it has no check/hint screen — the user
  correctly pointed out it still has continue/back buttons worth checking).
  - **Result: every one of the 6 Sain projects has the exact same bugs**, byte-for-byte identical in
    several cases — strong evidence this all traces back to one shared scaffold/template, not 6
    independent mistakes: no button anywhere has an explicit `height` (computed height ends up
    ~45-51px depending on button/project, never Figma's `39px`, and not even consistent with the
    *other* buttons in the same bar); check/back use `padding: 12px 40px` instead of `12px 20px`;
    check/back use fixed `width: 140px` instead of `min-width: 140px`; the check button's gradient is
    a 2-stop simplification missing the `#0059B2 23.361%` middle stop; hint/back border-width is
    `1.5px` instead of `1px`; the hint button uses subject-500 `#019de5` instead of subject-700
    `#007ac6`; hint font-size is `18px` instead of `20px`; hint has no `min-width` at all.
    ~~the hint icon is sized `26×24`/`26×22` instead of `24×26`~~ — **this specific line was wrong,
    see Round 12.** Documented the full spec, a checklist, and reference CSS as category 6 above.
  - Sain 5 additionally has no disabled/enabled state model for the hint button at all (binary
    `hidden`/shown, one look, and that look is miscolored) — noted in category 6's product-decision
    callout as something to verify isn't itself a documented client request before "fixing" it.
  - Sain 1 has one isolated prior patch (`#s12-continue-btn { width: auto; min-width: 140px }`)
    proving the fixed-width bug was already noticed once, just never generalized.
  - User then asked to actually implement the category 6 fixes on Sain 2 specifically. Applied the
    reference CSS to `methodica-ar-science-mass-measure-02-02/styles.css`'s `.btn-continue`/`.btn-hint`/
    `.btn-back` (confirmed via grep these are the *only* definitions — no per-screen ID overrides
    exist anywhere in that project, so the fix covers all 10 of its screens at once). Deliberately
    did **not** touch that project's hint-visibility timing: a code comment at the `.btn-hint` rule
    documents an explicit client request for the hint to show enabled-from-load on `sq2`–`sq6`
    (differing from `dd8`/`drag9` in the same project, which still use the family-default
    hidden-until-first-wrong-attempt behavior) — only the color/size spec was corrected, on both
    visibility models equally. Sain 1, 3, 4, 5, 6 still have the full category 6 bug set as of this
    writing; only Sain 2 has been fixed.
- **Round 12** (2026-08-06, same day) — Client screenshotted Sain 2's hint icon after Round 11's fix
  and it looked visibly squished/stretched. Root cause: Round 11 transposed the icon's width and
  height when transcribing the Figma component into prose — the real Iocn component is `w-[26px]
  h-[24px]` on its outer slot (inner glyph `h-[22.288px]`, i.e. **wider than tall**), but this doc
  and the resulting CSS fix both wrote `width: 24px; height: 26px` (taller than wide) — the exact
  opposite orientation. Forcing a horizontally-oriented bulb icon into a vertically-oriented box (with
  no `object-fit` to preserve aspect ratio) stretches/compresses it, which is exactly what the
  screenshot showed. This means Round 11's own audit table was itself wrong about which projects had
  the "bad" value — `26×24` (Sain 1) and `26×22` (Sain 4/5/6) were actually fine (or a harmless
  rounding of the same shape); the only genuinely wrong instance was the `24×26` this doc introduced
  into Sain 2. Fixed `methodica-ar-science-mass-measure-02-02/styles.css`'s `.btn-hint .scq-hint-icon`
  back to `width: 26px; height: 24px`, and corrected every reference to this in category 6 above
  (the state table, the reference CSS block, and the checklist item) rather than just the code —
  the previous wording is struck through above, not deleted, so this correction has a paper trail.
  Lesson for next time: when transcribing a Figma dimension pair into prose, re-derive width vs.
  height from the actual node data at the moment of writing, don't rely on a remembered "WxH" without
  checking which axis is which — swapping two numbers is an easy, silent error that only shows up
  visually.
- **Round 13** (2026-08-06, same day) — Client asked to roll the category 6 fix out to the rest of
  the family (Sain 2 was the only project fixed so far), explicitly requiring the rollout follow this
  doc's corrected spec exactly with nothing invented. Read each project's actual `.btn-continue`/
  `.btn-hint`/`.btn-back` rules fresh (not from the Round 11 audit summaries, to avoid propagating any
  paraphrase error the way Round 12 had to fix) before editing. Confirmed via grep across all five
  remaining projects that no per-screen ID-selector override exists for these buttons except Sain 1's
  known `#s12-continue-btn { width: auto; min-width: 140px }` — left untouched, since it's now merely
  redundant with (not conflicting with) the fixed base class.
  - `methodica-ar-science-mass-measure-02-01`, `-04`, `-05`, `-06`: applied the full reference CSS
    (explicit `height: 39px`, `padding: 0 20px`, `min-width: 140px`, 3-stop gradient, `1px`
    hint/back border, hint color `#007ac6`, hint `font-size: 20px`) to all three button classes.
    Left each project's hint icon size untouched where it was already `26×24` (Sain 1) or `26×22`
    (Sain 4, 5, 6) — per Round 12's correction, both are the *correct* orientation and not a bug.
  - `methodica-ar-science-mass-measure-02-03`: only `.btn-continue`/`.btn-back` exist (confirmed again,
    no `.btn-hint` anywhere in the project) — fixed those two only; did not invent a hint button rule
    that has no corresponding markup.
  - Did not touch any hint-visibility timing (`hidden` attribute, hover/focus-visible rules, or
    JS) anywhere — every one of these projects' `.btn-hint` comment blocks documents which timing
    model it uses (family-default hidden-until-first-wrong-attempt in Sain 1/4/5/6, Sain 2's
    documented always-visible exception on `sq2`–`sq6`), and Sain 3 has no hint at all; only the
    color/size properties covered by category 6 were changed, everywhere.
  - **Family-wide status as of this round: all 6 Sain projects now match category 6 exactly.**
