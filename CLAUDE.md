# Instructions for Claude Code — Methodica mass-measure (720 lomda family)

This file applies to all sub-projects in this directory (`Methodica-science-mass-measure-02-01` through `-06`, and any new Sain added later). Each is an independent HTML/CSS/JS lomda ("Sain") sharing the same template conventions. These bugs happened in this project and must not happen again in future lomdas.

## 1. Companion-character avatar images must never change by themselves a few seconds after the screen appears

Any screen showing the learner's chosen companion character (green/orange) must satisfy ALL of these:

- **No hardcoded default `src`** on the `<img>` tag in HTML (e.g. `src="assets/images/avatar-orange-X.png"`). Leave `src` off entirely — only JS should ever set it.
- **Resolve the avatar image *before* the screen becomes visible.** In `goTo(n)`, `resetScreenState(n)` (which sets `img.src` based on `window.lomdaState.selectedCharacter`) must run **before** `target.classList.add('active')`. If any code path shows a popup/screen via a different route (not through `goTo`, e.g. a "check answer" feedback function), the same rule applies there too — resolve the avatar src before the containing element becomes visible.
- **Preload** both color variants (or at least the resolved one) at script init via `new Image()`, so the very first time a color is needed there's no network/decode delay.

Why this matters: if the screen becomes visible while the `<img>` still shows the old hardcoded/default src, the browser paints the wrong color for one or more frames before the JS-corrected src loads — a visible "wrong character, then it swaps a few seconds later" flash.

**Quick self-check for a new screen:** grep the project for `selectedCharacter ===` to find every avatar read site, then confirm each one's `<img>` has no hardcoded src and runs before its container's visibility is toggled.

## 2. Feedback popup must be draggable from anywhere on it, and the X must fully close it

- **Dragging:** the popup must be draggable from **anywhere on the popup**, not just the title bar. When implementing `scqFbMakeDraggable`-style drag logic, bind `mousedown` to the whole `.scq-fb-box`/popup element (excluding the close/toggle button via `e.target.closest(...)`), not just `.scq-fb-title`.
- **Closing:** the X button must fully close/hide the popup — `box.classList.remove('visible')` — never just collapse the body text while leaving the title bar stuck on screen. There is no "collapsed" state in the spec; if you see a `.collapsed` class being toggled instead of `visible` being removed, that's a bug, not a variant. Per the `720-templates` skill (`_global-components.md` → "Feedback popup system"): "Close button dismisses the popup without resetting answer state."

## 3. In drag&drop questions, a placed/dropped item's label must never drift toward the wrong side of its slot

When a dragged item (a distractor/word chip) is dropped into a target slot and rendered there — typically a `.dq-placed-card`-style element inside a drop zone (`direction: rtl`, `display: inline-flex`) — the item's internal alignment must use `justify-content: flex-start`, **never** `flex-end`.

- In an RTL flex row, `flex-start` anchors content to the **right** (where it visually belongs, adjacent to the preceding text/slot edge). `flex-end` anchors it to the **left** — the opposite of what it looks like in an LTR mental model.
- This only becomes visible when the slot can be wider than the placed content (e.g. a `min-width` on the drop zone that isn't collapsed to the content size when occupied) — a short label like "טון" or "מסה" gets shoved to the far side of the slot, reading as "the word jumped left after I dropped it."
- The correct reference implementation is `.dq-placed-card` in `Methodica-science-mass-measure-02-05/styles.css` (`justify-content: flex-start`). This bug was introduced in `-02-06` by copying that block but transcribing `flex-end` instead — always copy this rule verbatim, never "fix" it based on LTR intuition.

**Quick self-check for a new drag&drop screen:** grep the project's CSS for `justify-content: flex-end` anywhere inside a `direction: rtl` block that positions a placed/dropped label, and confirm it's `flex-start` (or `center`, if the slot is always sized to fit its content exactly).

## 4. Drag&drop questions capped at 2 attempts must not auto-reveal the correct answer — they need a "התשובה הנכונה" / "התשובה שלי" toggle button

By default, a drag&drop question that locks after a 2nd wrong attempt (`attempts >= 2`) tends to call its `revealCorrect()`-style function immediately and show the final "here's the correct answer" feedback. Per explicit client request, this must instead be **learner-initiated**, with the ability to switch back and forth between the correct solution and the learner's own last answer:

- **Don't auto-reveal.** On the 2nd wrong attempt: mark the zones wrong (as already happened), show a short "pending" feedback text (e.g. `רוצים לראות את הפתרון הנכון?`), and reveal a button inside the feedback popup instead of calling the reveal function.
- **The button** (`class="scq-fb-reveal-btn"`, hidden by default) lives inside the `.scq-fb-box`, after `.scq-fb-body`. Style it like `.btn-hint`: white background, `#019de5` border/text, `border-radius: 1000px`, `font-family: 'Assistant'`, `font-size: 18px`, `padding: 10px 24px` — a secondary pill, not the solid `.btn-continue` gradient.
- **It's a toggle, not a one-shot reveal:**
  - First click ("התשובה הנכונה") → reveal the correct placement (existing `revealCorrect()` logic, unchanged) + show the existing final feedback text (e.g. `wrongFinal`) → relabel the button to **"התשובה שלי"**.
  - Second click ("התשובה שלי") → restore the learner's own last-submitted placement, re-mark each zone correct/wrong against it, and show the "pending" text again → relabel the button back to **"התשובה הנכונה"**.
  - Keeps toggling indefinitely; nothing else about the check flow changes.
- **Snapshot the real answer, don't guess it.** At the exact moment the 2nd wrong attempt is detected (before any reveal), copy the current placement state (which drag item is in which zone, or `'source'`/unplaced for anything never dropped) into a separate variable. `revealCorrect()` overwrites the live placement object, so without this snapshot the learner's original answer is unrecoverable once "התשובה הנכונה" is clicked.
- **Do not reword any existing feedback text** (`correct`, `wrong1`, `wrongFinal`/`wrong2`, etc.) to build this — the only new copy needed is the one "pending" message, reused for both the initial post-2nd-wrong state and every time the learner toggles back to "my answer."
- **Fix the drag-popup exclusion.** Every project has its own copy of `scqFbMakeDraggable(boxId)`, which binds `mousedown` on the whole feedback box to make it draggable (see rule #2). Its exclusion check (`e.target.closest('.scq-fb-close')` or `.scq-fb-toggle`, depending on the project) must also exclude `.scq-fb-reveal-btn`, or clicking the new button gets hijacked as a drag-start and does nothing.
- **Reset properly.** On a fresh screen load/reset, hide the button, reset its label back to "התשובה הנכונה", and clear the snapshot variable — otherwise a learner who reset the question can inherit stale state from a previous attempt.
- Two implementation shapes exist in this family: the shared `makeDragQuestion(cfg)` factory (used by e.g. Sain 5/6's sentence-fill questions — add a `revealBtnId` key to `cfg` and the toggle lives in the factory itself) and hand-written per-screen code (the `s9`/`s20`/`drag9`-style questions — wire the same toggle logic directly into that screen's own `Check()`/`RevealCorrect()`/`resetScreenState*()` functions). Match whichever pattern the target screen already uses.

**Quick self-check for a new capped-attempt drag&drop screen:** confirm the reveal function is never called automatically inside the wrong-attempt branch of `Check()`; confirm a placement snapshot is taken *before* any reveal happens; and confirm `scqFbMakeDraggable`'s exclusion list includes the new button's class.
