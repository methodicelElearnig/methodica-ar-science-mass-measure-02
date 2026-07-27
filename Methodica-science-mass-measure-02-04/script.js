'use strict';

/* =========================================================
   מנוע גלובלי — canvas scaling, ניווט מסכים, סטייט גלובלי
   ========================================================= */

const TOTAL_SCREENS = 2;
let currentScreen = 0;

/* הדמות שנבחרה בסיין 1 נשמרת ב-localStorage כי כל סיין הוא מסמך
   HTML נפרד לחלוטין — window.lomdaState לא "עובר" בין הסינים בטעינת
   עמוד מלאה. try/catch: בפתיחה מ-file:// חלק מהדפדפנים (ולמשל jsdom)
   חוסמים גישה ל-localStorage עם SecurityError — בלי ה-try/catch,
   חריגה כאן הייתה עוצרת את טעינת כל script.js */
let savedCharacter = null;
try {
  savedCharacter = localStorage.getItem('lomda_selectedCharacter');
} catch (e) { /* localStorage חסום (opaque origin/פרטיות) — נמשיך בלי שמירה */ }
window.lomdaState = {
  selectedCharacter: savedCharacter || null
};

/* טוענים מראש (preload) את תמונת הדמות של הצבע הנבחר, כדי שכש-
   resetScreenState0 תקבע את ה-src הנכון, התמונה כבר תהיה בקאש של
   הדפדפן ותצויר מיידית — בלי רגע ריק/מהבהב בכניסה הראשונה למסך. */
(function preloadCharacterAvatars() {
  const isGreen = window.lomdaState.selectedCharacter === 'green';
  const files = isGreen
    ? ['avatar-green-running.gif']
    : ['avatar-orange-running.gif'];
  files.forEach(function (name) {
    const img = new Image();
    img.src = 'assets/images/' + name;
  });
})();

function scaleApp() {
  const app = document.getElementById('app');
  const CANVAS_W = 1280;
  const CANVAS_H = 710;
  const scale = Math.min(window.innerWidth / CANVAS_W, window.innerHeight / CANVAS_H);
  const left = (window.innerWidth - CANVAS_W * scale) / 2;
  const top = (window.innerHeight - CANVAS_H * scale) / 2;
  app.style.transform = 'scale(' + scale + ')';
  app.style.left = left + 'px';
  app.style.top = top + 'px';
}
window.addEventListener('resize', scaleApp);

function goTo(n) {
  if (n < 0 || n >= TOTAL_SCREENS) return;
  document.querySelectorAll('.screen').forEach(function (el) {
    el.classList.remove('active');
  });
  const target = document.querySelector('.screen[data-screen="' + n + '"]');
  if (!target) return;
  currentScreen = n;
  resetScreenState(n);
  target.classList.add('active');
}

function resetScreenState(n) {
  if (n === 0) resetScreenState0();
  if (n === 1) resetScreenState1();
}

/* =========================================================
   מסך 1 — מסך מעבר: ו..אנחנו מתקדמים!
   ========================================================= */

function resetScreenState0() {
  const img = document.getElementById('s0-avatar-img');
  if (img) {
    img.src = (window.lomdaState.selectedCharacter === 'green')
      ? 'assets/images/avatar-green-running.gif'
      : 'assets/images/avatar-orange-running.gif';
  }
}

function s0Continue() { goTo(1); }
function s0Back() {
  /* קישור בין סינים: מסך ראשון בסיין 4 -> מסך אחרון (2) בסיין 3 */
  window.location.href = '../Methodica-science-mass-measure-02-03/index.html#screen=1';
}

/* =========================================================
   מסך 2 — תרגול מתקדם: שתי טבלאות (גרירה בגלילה)
   מנגנון: 2 ניסיונות, רמז מוסתר (hidden) עד לניסיון שגוי ראשון —
   כמו מסך 32 בלומדת המקור (טבלה א' מקורית; טבלה ב' תוכן חדש)
   ========================================================= */

const TBL_DD_IDS = [
  'tblA-dd-1', 'tblA-dd-2', 'tblA-dd-3',
  'tblB-dd-1', 'tblB-dd-2', 'tblB-dd-3', 'tblB-dd-4', 'tblB-dd-5'
];
const TBL_INPUT_IDS = ['tblA-input-2', 'tblB-input-1'];

const TBL_DD_CORRECT = {
  'tblA-dd-1': 'ברוטו',    /* שקית חטיפים מלאה — מושג מסה */
  'tblA-dd-2': 'קילוגרם',  /* טרולי מלא לטיסה — יחידת מסה */
  'tblA-dd-3': 'נטו',      /* הבגדים שבתוך הטרולי — מושג מסה */
  'tblB-dd-1': 'ברוטו',    /* מכולה ימית מלאה בברווזי פלסטיק — מושג מסה */
  'tblB-dd-2': 'טון',      /* מכולה ימית ריקה — יחידת מסה */
  'tblB-dd-3': 'ברוטו',    /* בקבוק שתיה מלא — מושג מסה */
  'tblB-dd-4': 'גרם',      /* המשקה בלבד — יחידת מסה */
  'tblB-dd-5': 'טרה'       /* כלוב פלדה לנשיאת נמר — מושג מסה */
};
const TBL_INPUT_CORRECT = {
  'tblA-input-2': '2',   /* מזוודת הטרולי הריקה — מסה */
  'tblB-input-1': '26'   /* ברווזי הפלסטיק בלבד — מסה */
};

let tblDdValues = {};
TBL_DD_IDS.forEach(function (id) { tblDdValues[id] = ''; });

let tblDone = false;
let tblAttempts = 0;
let tblPhase = 'before';

const TEXTS_TBL = {
  correct: {
    title: 'כל הכבוד!',
    body: 'הצלחתם לשלב בין כל חלקי היחידה:\nסוגי המסה: ברוטו, נטו וטרה\nיחידות המסה: מ"ג, גרם, ק"ג וטון\nחישובי מסה: ברוטו = נטו + טרה'
  },
  wrong1: {
    title: 'התשובה לא נכונה.',
    body: 'לא נורא, גם מטעויות לומדים.\nננסה שוב?'
  },
  wrongPending: {
    title: 'התשובה אינה נכונה.',
    body: 'רוצים לראות את הפתרון הנכון?'
  },
  wrongFinal: {
    title: 'התשובה אינה נכונה.',
    body: 'הצלחתם לשלב בין כל חלקי היחידה:\nסוגי המסה: ברוטו, נטו וטרה\nיחידות המסה: מ"ג, גרם, ק"ג וטון\nחישובי מסה: ברוטו = נטו + טרה'
  }
};

let tblLastAnswer = null;
let tblShowingCorrect = false;

function tblAllFilled() {
  const inputsFilled = TBL_INPUT_IDS.every(function (id) {
    const el = document.getElementById(id);
    return el && el.value.trim() !== '';
  });
  const ddsFilled = TBL_DD_IDS.every(function (id) { return tblDdValues[id] !== ''; });
  return inputsFilled && ddsFilled;
}

function tblOnInput() {
  const btn = document.getElementById('tbl-check');
  if (btn) btn.disabled = !tblAllFilled();
}

function tblDdToggle(ddId) {
  if (tblDone) return;
  const btn = document.getElementById(ddId + '-btn');
  if (btn && btn.disabled) return;
  const isOpen = btn && btn.getAttribute('aria-expanded') === 'true';
  tblCloseAllDropdowns();
  if (!isOpen) {
    if (btn) btn.setAttribute('aria-expanded', 'true');
    const opts = document.getElementById(ddId + '-opts');
    if (opts) opts.hidden = false;
  }
}

function tblDdSelect(ddId, value) {
  tblDdValues[ddId] = value;
  const valEl = document.getElementById(ddId + '-val');
  if (valEl) valEl.textContent = value;
  const btn = document.getElementById(ddId + '-btn');
  if (btn) btn.setAttribute('aria-expanded', 'false');
  const opts = document.getElementById(ddId + '-opts');
  if (opts) opts.hidden = true;
  tblOnInput();
}

function tblCloseAllDropdowns() {
  TBL_DD_IDS.forEach(function (id) {
    const btn = document.getElementById(id + '-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    const opts = document.getElementById(id + '-opts');
    if (opts) opts.hidden = true;
  });
}

document.addEventListener('click', function (e) {
  const insideDd = TBL_DD_IDS.some(function (id) {
    const wrap = document.getElementById(id);
    return wrap && wrap.contains(e.target);
  });
  if (!insideDd) tblCloseAllDropdowns();
});

function tblShowFeedback(kind, isCorrect) {
  const box = document.getElementById('tbl-feedbox');
  const data = TEXTS_TBL[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition('tbl-feedbox');
  box.classList.add('visible');
}
function tblHideFeedback() { document.getElementById('tbl-feedbox').classList.remove('visible'); }
function tblToggleFeedbox() { document.getElementById('tbl-feedbox').classList.remove('visible'); }

function tblSetBtnCheck(label, enabled, mode) {
  const btn = document.getElementById('tbl-check');
  btn.textContent = label;
  btn.disabled = !enabled;
  btn.onclick = (mode === 'continue') ? tblContinue : tblCheck;
}

function tblLockAll(revealCorrect) {
  TBL_INPUT_IDS.forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.disabled = true;
    if (revealCorrect) el.value = TBL_INPUT_CORRECT[id];
  });
  TBL_DD_IDS.forEach(function (id) {
    const btn = document.getElementById(id + '-btn');
    if (btn) btn.disabled = true;
    const opts = document.getElementById(id + '-opts');
    if (opts) opts.hidden = true;
    if (revealCorrect) {
      const val = TBL_DD_CORRECT[id];
      tblDdValues[id] = val;
      const valEl = document.getElementById(id + '-val');
      if (valEl) valEl.textContent = val;
    }
  });
}

function tblMarkAll() {
  TBL_INPUT_IDS.forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('tbl-input-correct', 'tbl-input-wrong');
    el.classList.add(parseFloat(el.value) === parseFloat(TBL_INPUT_CORRECT[id]) ? 'tbl-input-correct' : 'tbl-input-wrong');
  });
  TBL_DD_IDS.forEach(function (id) {
    const btn = document.getElementById(id + '-btn');
    if (!btn) return;
    btn.classList.remove('correct', 'wrong');
    btn.classList.add(tblDdValues[id] === TBL_DD_CORRECT[id] ? 'correct' : 'wrong');
  });
}

function tblShowMyAnswer() {
  TBL_INPUT_IDS.forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.value = tblLastAnswer.inputs[id];
  });
  TBL_DD_IDS.forEach(function (id) {
    tblDdValues[id] = tblLastAnswer.dd[id];
    const valEl = document.getElementById(id + '-val');
    if (valEl) valEl.textContent = tblLastAnswer.dd[id];
  });
  tblMarkAll();
  tblShowFeedback('wrongPending', false);
}

function tblReveal() {
  const revealBtn = document.getElementById('tbl-reveal-btn');
  if (tblShowingCorrect) {
    tblShowMyAnswer();
    tblShowingCorrect = false;
    if (revealBtn) revealBtn.textContent = 'התשובה הנכונה';
  } else {
    tblLockAll(true);
    tblMarkAll();
    tblShowFeedback('wrongFinal', false);
    tblShowingCorrect = true;
    if (revealBtn) revealBtn.textContent = 'התשובה שלי';
  }
}

function tblCheck() {
  if (tblDone || !tblAllFilled()) return;
  tblAttempts++;

  const inputsCorrect = TBL_INPUT_IDS.every(function (id) {
    const el = document.getElementById(id);
    return el && parseFloat(el.value) === parseFloat(TBL_INPUT_CORRECT[id]);
  });
  const ddsCorrect = TBL_DD_IDS.every(function (id) { return tblDdValues[id] === TBL_DD_CORRECT[id]; });
  const allCorrect = inputsCorrect && ddsCorrect;

  if (allCorrect) {
    tblDone = true; tblPhase = 'correct';
    tblLockAll(false); tblMarkAll();
    tblShowFeedback('correct', true);
    tblSetBtnCheck('המשך', true, 'continue');
  } else if (tblAttempts < 2) {
    tblPhase = 'wrong1';
    tblMarkAll();
    tblShowFeedback('wrong1', false);
    document.getElementById('tbl-check').disabled = true;
    const hb = document.getElementById('tbl-hint');
    if (hb) hb.hidden = false;
  } else {
    tblDone = true; tblPhase = 'wrong-final';
    /* דריסה: הפתרון לא נחשף אוטומטית — רק בלחיצה על "התשובה הנכונה" */
    tblLastAnswer = {
      inputs: {},
      dd: Object.assign({}, tblDdValues)
    };
    TBL_INPUT_IDS.forEach(function (id) {
      const el = document.getElementById(id);
      tblLastAnswer.inputs[id] = el ? el.value : '';
    });
    tblLockAll(false); tblMarkAll();
    tblShowingCorrect = false;
    tblShowFeedback('wrongPending', false);
    const revealBtn = document.getElementById('tbl-reveal-btn');
    if (revealBtn) { revealBtn.hidden = false; revealBtn.textContent = 'התשובה הנכונה'; }
    tblSetBtnCheck('המשך', true, 'continue');
  }
}

/* מסך 2 הוא כרגע המסך האחרון בסיין 4 — ממשיכים לסיין 5 (מסך מעבר
   "כל הכבוד! עכשיו מגיעה שאלת השיא" ואילך) */
function tblContinue() {
  /* קישור בין סינים: מסך אחרון בסיין 4 -> מסך ראשון בסיין 5 */
  window.location.href = '../Methodica-science-mass-measure-02-05/index.html';
}

function tblOpenHint() { document.getElementById('tbl-hint-overlay').hidden = false; }
function tblCloseHint() { document.getElementById('tbl-hint-overlay').hidden = true; }
document.getElementById('tbl-hint-overlay').addEventListener('click', function (e) {
  if (e.target === this) tblCloseHint();
});

/* רמז קטן לשורה בטבלה (אייקון "?" ליד שם הפריט) — טקסט משתנה לפי העמוד */
function tblOpenRowHint(text) {
  document.getElementById('tbl-row-hint-body').textContent = text;
  document.getElementById('tbl-row-hint-overlay').hidden = false;
}
function tblCloseRowHint() { document.getElementById('tbl-row-hint-overlay').hidden = true; }
document.getElementById('tbl-row-hint-overlay').addEventListener('click', function (e) {
  if (e.target === this) tblCloseRowHint();
});

function resetScreenState1() {
  const scrollArea = document.getElementById('tbl-scroll-area');
  if (scrollArea) scrollArea.scrollTop = 0;

  if (tblDone || tblAttempts > 0 || Object.values(tblDdValues).some(v => v !== '') || TBL_INPUT_IDS.some(id => { const el = document.getElementById(id); return el && el.value !== ''; })) return;
  tblAttempts = 0;
  tblPhase = 'before';
  tblLastAnswer = null;
  tblShowingCorrect = false;

  TBL_INPUT_IDS.forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = ''; el.disabled = false; el.className = 'tbl-input';
  });
  TBL_DD_IDS.forEach(function (id) {
    tblDdValues[id] = '';
    const btn = document.getElementById(id + '-btn');
    if (btn) { btn.disabled = false; btn.className = 'tbl-dd-btn'; btn.setAttribute('aria-expanded', 'false'); }
    const valEl = document.getElementById(id + '-val');
    if (valEl) valEl.textContent = '';
    const opts = document.getElementById(id + '-opts');
    if (opts) opts.hidden = true;
  });

  tblHideFeedback();
  tblSetBtnCheck('צדקתי?', false, 'check');
  const hb = document.getElementById('tbl-hint');
  if (hb) hb.hidden = true;
  document.getElementById('tbl-hint-overlay').hidden = true;
  document.getElementById('tbl-row-hint-overlay').hidden = true;
  const revealBtn = document.getElementById('tbl-reveal-btn');
  if (revealBtn) { revealBtn.hidden = true; revealBtn.textContent = 'התשובה הנכונה'; }
}

/* ─── Dev mode: postMessage bridge ─────────────────────── */
window.addEventListener('message', function (e) {
  if (!e.data || e.data.type !== 'DEV_GOTO') return;
  const n = parseInt(e.data.screen, 10);
  if (!isNaN(n)) goTo(n);
});

if (window.parent !== window) {
  const screenCount = document.querySelectorAll('.screen').length;
  window.parent.postMessage({ type: 'DEV_READY', total: screenCount }, '*');
}

document.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.key === 'ArrowLeft') goTo(currentScreen + 1);
  if (e.ctrlKey && e.key === 'ArrowRight') goTo(currentScreen - 1);
});

/* =========================================================
   מערכת פופ-אפ משוב גריר — לפי "Feedback popup system" (720-templates
   skill): גרירה מוגבלת לגבולות הקנבס, איפוס למיקום ברירת המחדל
   בכל פתיחה, כפתור סגירה (X) שלא נוגע בסטייט התשובה. מיושם על תיבת
   המשוב היחידה בסיין 4: tbl-feedbox.
   ========================================================= */

function scqFbResetPosition(boxId) {
  const box = document.getElementById(boxId);
  if (!box) return;
  box.style.left = '';
  box.style.top = '';
  box.style.bottom = '';
}

function scqFbClose(boxId) {
  const box = document.getElementById(boxId);
  if (box) box.classList.remove('visible');
}

function scqFbMakeDraggable(boxId) {
  const box = document.getElementById(boxId);
  if (!box) return;

  let dragging = false;
  let startX = 0, startY = 0, startLeft = 0, startTop = 0;

  box.addEventListener('mousedown', function (e) {
    if (e.target.closest('.scq-fb-close') || e.target.closest('.scq-fb-reveal-btn')) return;
    const parent = box.offsetParent || box.parentElement;
    const boxRect = box.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    startLeft = boxRect.left - parentRect.left;
    startTop = boxRect.top - parentRect.top;
    box.style.left = startLeft + 'px';
    box.style.top = startTop + 'px';
    box.style.bottom = 'auto';
    startX = e.clientX;
    startY = e.clientY;
    dragging = true;
    box.classList.add('is-dragging');
    e.preventDefault();
  });

  document.addEventListener('mousemove', function (e) {
    if (!dragging) return;
    const parent = box.offsetParent || box.parentElement;
    const parentRect = parent.getBoundingClientRect();
    const maxLeft = Math.max(0, parentRect.width - box.offsetWidth);
    const maxTop = Math.max(0, parentRect.height - box.offsetHeight);
    let left = startLeft + (e.clientX - startX);
    let top = startTop + (e.clientY - startY);
    left = Math.min(Math.max(0, left), maxLeft);
    top = Math.min(Math.max(0, top), maxTop);
    box.style.left = left + 'px';
    box.style.top = top + 'px';
  });

  document.addEventListener('mouseup', function () {
    if (!dragging) return;
    dragging = false;
    box.classList.remove('is-dragging');
  });
}

/* אתחול */
scaleApp();
resetScreenState(0);
scqFbMakeDraggable('tbl-feedbox');

/* קישור בין סינים: הגעה לכאן דרך "חזרה" מהסיין הבא נכנסת ישירות למסך
   המבוקש לפי #screen=N ב-URL, במקום למסך הראשון כברירת מחדל */
(function jumpToLinkedScreen() {
  const m = /^#screen=(\d+)$/.exec(location.hash);
  if (m) goTo(parseInt(m[1], 10));
})();
