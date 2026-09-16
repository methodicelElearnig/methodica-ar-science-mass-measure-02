'use strict';

/* =========================================================
   מנוע גלובלי — canvas scaling, ניווט מסכים, סטייט גלובלי
   ========================================================= */

const TOTAL_SCREENS = 2;
let currentScreen = 0;

/* הדמות שנבחרה בסיין 1 נשמרת במסמך ה-state של היחידה (v4) ומוקאשת ב-localStorage כי כל סיין הוא מסמך
   HTML נפרד לחלוטין — window.lomdaState לא "עובר" בין הסינים בטעינת
   עמוד מלאה. try/catch: בפתיחה מ-file:// חלק מהדפדפנים (ולמשל jsdom)
   חוסמים גישה ל-localStorage עם SecurityError — בלי ה-try/catch,
   חריגה כאן הייתה עוצרת את טעינת כל script.js */
let savedCharacter = null;
try {
  /* v4: localStorage הוא הקאש הסינכרוני, לא מקור האמת. getUnitCharacter
     נופל אליו כל עוד מסמך ה-state לא נקרא — וזה בדיוק המצב כאן, בראש
     הטעינה, שני סקריפטים מה-CDN לפני שהמסמך זמין. זה מה שמחזיק את כלל 1
     ב-CLAUDE.md: הצבע נקבע לפני ה-paint הראשון, בלי הבהוב. המסמך מיישר
     את הערך אחר כך ב-applyUnitProfile (unit-js/50-loader.js, שלב א'),
     מאחורי #boot-cover.
     typeof: 40-resume.js שנכשל בטעינה לא אמור להפיל את כל script.js. */
  savedCharacter = (typeof getUnitCharacter === 'function')
    ? getUnitCharacter()
    : localStorage.getItem('lomda_selectedCharacter');
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
  /* resume: ציור מצב "נענה" של המסך הזה — applyExecutionState מצייר את מסך
     הנחיתה בלבד, וכל מסך אחר שנענה היה נשאר ריק ותקוע. לפני xapiOnScreen
     ולפני scheduleResumeSave במכוון.
     ההנמקה המלאה: unit-js/40-resume.js ליד repaintScreen. */
  try { repaintScreen(n); } catch (e) { console.error('[resume] repaint', e); }
  /* xAPI: זוגות initialized/completed ברמת הפריט. מוצב **אחרון**, אחרי
     ה-.active, כדי שקריאת רשת לא תעכב את ה-paint; ואחרי currentScreen = n,
     שממנו submitReport והיומן קוראים. עטוף ב-try/catch — דיווח לעולם לא
     יעצור ניווט. resetScreenState לפני ה-.active נשאר כפי שהיה: זה הכלל
     שמונע הבהוב אווטאר (CLAUDE.md כלל 1). */
  try { xapiOnScreen(n); } catch (e) {}
  /* resume: נקודת החנק לשמירה — כל החלפת מסך עוברת כאן, וזה מה שתוחם את
     האיבוד למסך אחד. מושהה (800ms), ולכן דפדוף מהיר מתקבץ לכתיבה אחת.
     מוצב אחרון, אחרי ה-paint ואחרי xapiOnScreen, מאותו נימוק: שמירה לא
     מעכבת את מה שהלומד רואה. עטוף כמו שכנו — ניווט לעולם לא נשבר מדיווח
     או משמירה. */
  try { scheduleResumeSave(); } catch (e) {}
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
  /* קישור בין סינים: מסך ראשון בסיין 4 -> מסך אחרון (2) בסיין 3.
     ה-query string לפני ה-hash — ראו REPORT-XAPI.md §6.
     עובר דרך goBackToPreviousPart כדי להזיז את מצביע הנחיתה לפני הניווט;
     בלעדיו הלואדר של היעד מקפיץ את הלומד מיד חזרה לכאן. הארגומנטים הם
     ה-fallback המקובע. ראו unit-js/40-resume.js. */
  goBackToPreviousPart('methodica-science-mass-measure-02-03', '#screen=1');
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
/* ── חתימת התשובה שכבר נשלחה ──
   בקוד החי tblCheck() מכבה את כפתור "צדקתי", והוא חוזר רק כשהלומד משנה
   שדה או רשימה. אחרי רענון אי אפשר לשחזר את ההשבתה הזאת "כמו שהיא":
   tblRestoreUI קורא ל-tblOnInput, שמחשב את הכפתור מ-tblAllFilled — והוא true כי
   התשובה השגויה של הלומד עדיין בטבלה. לכן אותה תשובה בדיוק הייתה ניתנת
   לשליחה חוזרת, והניסיון השני האמיתי נשרף. במקום דגל disabled שלא שורד
   טעינה, נשמרת חתימה של מה שנשלח בפועל.
   החתימה מכסה גם את השדות וגם את הרשימות — שינוי בכל אחד מהם
   מדליק את הכפתור מחדש, ולכן אין כאן לומד תקוע. */
let tblLastSubmittedSig = null;

function tblAllFilled() {
  const inputsFilled = TBL_INPUT_IDS.every(function (id) {
    const el = document.getElementById(id);
    return el && el.value.trim() !== '';
  });
  const ddsFilled = TBL_DD_IDS.every(function (id) { return tblDdValues[id] !== ''; });
  return inputsFilled && ddsFilled;
}

function tblSig() {
  var dd = TBL_DD_IDS.map(function (id) { return id + ':' + tblDdValues[id]; }).join('|');
  var inp = TBL_INPUT_IDS.map(function (id) {
    var el = document.getElementById(id);
    return id + ':' + (el ? el.value.trim() : '');
  }).join('|');
  return dd + '#' + inp;
}

function tblOnInput() {
  const btn = document.getElementById('tbl-check');
  if (btn) btn.disabled = !tblAllFilled() || tblSig() === tblLastSubmittedSig;
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
  tblLastSubmittedSig = tblSig();

  const inputsCorrect = TBL_INPUT_IDS.every(function (id) {
    const el = document.getElementById(id);
    return el && parseFloat(el.value) === parseFloat(TBL_INPUT_CORRECT[id]);
  });
  const ddsCorrect = TBL_DD_IDS.every(function (id) { return tblDdValues[id] === TBL_DD_CORRECT[id]; });
  const allCorrect = inputsCorrect && ddsCorrect;
  xapiAnswered('001', 'q1', allCorrect, allCorrect || tblAttempts >= 2,
    xapiFieldsAnswer(TBL_INPUT_IDS) + ' | ' + xapiFieldsAnswer(TBL_DD_IDS, tblDdValues));

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

  /* resume: שמירה סינכרונית ברגע מחויבות התשובה. השמירה המושהית שבסוף goTo()
     לא מספיקה כאן — תשובה שניתנה ואז הלשונית נהרגה לפני הניווט הבא הייתה
     נאבדת. עטוף: דיווח ושמירה לעולם לא שוברים את זרימת התשובה. */
  try { flushResumeSave(); } catch (e) {}
}

/* מסך 2 הוא כרגע המסך האחרון בסיין 4 — ממשיכים לסיין 5 (מסך מעבר
   "כל הכבוד! עכשיו מגיעה שאלת השיא" ואילך) */
function tblContinue() {
  /* xAPI: לסין הזה שאלה מדורגת אחת (הטבלה המקיפה), ולכן המכנה הוא 1 והציון
     בינארי. התוצאה נלקחת מ-XAPI_Q_RESULTS ולא מחושבת מחדש, כדי שהציון יהיה
     בהכרח זהה למה שדווח ב-answered. */
  var _ok = !!XAPI_Q_RESULTS['001/q1'];
  xapiEndComponent({ success: _ok, score: { scaled: _ok ? 1 : 0 } },
    document.getElementById('tbl-check'));

  /* המעבר לסין 05 שהיה כאן חי רק ב-walkthrough מקומי (DEV_NAV,
     unit-js/10-identity.js). בייצור Kata מקבלת את ה-completed ומנתבת;
     הרכיב נעצר בלחיצה הזאת והכפתור מושבת (2026-09-16). */
  if (DEV_NAV) {
    writeForwardState('methodica-science-mass-measure-02-05', '#screen=1');
    window.location.href = '../methodica-science-mass-measure-02-05/index.html' + window.location.search;
  }
}

function tblOpenHint() {
  /* xAPI: requested.1 — אחרי הגארדים ומיד לפני החשיפה, כדי לא
     לדווח בקשה שלא קרתה. פותח בלבד, לא toggle. */
  xapiRequestedHint('001', 'q1');
  document.getElementById('tbl-hint-overlay').hidden = false;
}
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
   בכל פתיחה. אין כפתור סגירה — הפופ-אפ נסגר רק במעבר מסך, בניסיון
   חדש, או בלחיצה על כפתור המעבר "התשובה הנכונה"/"התשובה שלי".
   מיושם על תיבת המשוב היחידה בסיין 4: tbl-feedbox.
   ========================================================= */

/* מיקומי בועיות המשוב שהלומד גרר: boxId → {left, top}.
   הערכים הם פיקסלים של קנבס העיצוב (1280×710) ולא של המסך: ההגדלה
   היא transform על #app, ולכן layout px אינם משתנים בין חלונות ומכשירים —
   מיקום שנשמר במסך אחד תקף בדיוק גם באחר.
   נלכד ב-capturePartPayload ומוחזר ב-applyResumeVars. */
var fbPositions = {};

/* מחזיר מיקום שנשמר. מחזיר true אם היה משהו להחזיר. */
function scqFbApplyPosition(boxId) {
  var box = document.getElementById(boxId);
  var pos = fbPositions[boxId];
  if (!box || !pos) return false;
  /* bottom חייב להיות auto: ברירת המחדל ב-CSS עוגנת את הבועית ב-bottom
     (ראו .scq-fb-box ב-styles.css), והצבת top לבדה הייתה מותירה את שתיהן
     פעילות — בדיוק מה ש-mousedown של הגרירה עושה. */
  box.style.left = pos.left + 'px';
  box.style.top = pos.top + 'px';
  box.style.bottom = 'auto';
  return true;
}

function scqFbResetPosition(boxId) {
  const box = document.getElementById(boxId);
  if (!box) return;
  /* צייר רץ → זו אינה הודעת משוב חדשה אלא הצגה מחדש של משוב קיים,
     ולכן המיקום שהלומד בחר מוחזר במקום להימחק. זה התיקון לתקלה
     שדווחה מ-QA: כל רענון וכל חזרה למסך עברו דרך showFeedback → איפוס.
     במסלול הרגיל (משוב חדש) האיפוס **נשמר**: בועית שנגררה לפינה חייבת
     לחזור לתצוגה כשיש משהו חדש להגיד.
     ⚠אין כאן clamp במכוון: הפונקציה רצה לפני classList.add('visible'),
     כלומר כשה-box עדיין display:none וה-offsetWidth שלו 0 — כל חישוב גבולות
     כאן היה שגוי. הערכים בין כה וכה כבר clamped על ידי mousemove. */
  if (typeof resumeIsPainting === 'function' && resumeIsPainting()) {
    if (scqFbApplyPosition(boxId)) return;
  }
  box.style.left = '';
  box.style.top = '';
  box.style.bottom = '';
  delete fbPositions[boxId];
}

function scqFbMakeDraggable(boxId) {
  const box = document.getElementById(boxId);
  if (!box) return;

  let dragging = false;
  let startX = 0, startY = 0, startLeft = 0, startTop = 0, scale = 1;

  box.addEventListener('mousedown', function (e) {
    if (e.target.closest('.scq-fb-reveal-btn')) return;
    const parent = box.offsetParent || box.parentElement;
    const parentRect = parent.getBoundingClientRect();
    scale = parentRect.width / parent.offsetWidth || 1;
    startLeft = box.offsetLeft;
    startTop = box.offsetTop;
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
    const maxLeft = Math.max(0, parent.offsetWidth - box.offsetWidth);
    const maxTop = Math.max(0, parent.offsetHeight - box.offsetHeight);
    let left = startLeft + (e.clientX - startX) / scale;
    let top = startTop + (e.clientY - startY) / scale;
    left = Math.min(Math.max(0, left), maxLeft);
    top = Math.min(Math.max(0, top), maxTop);
    box.style.left = left + 'px';
    box.style.top = top + 'px';
  });

  document.addEventListener('mouseup', function () {
    if (!dragging) return;
    dragging = false;
    box.classList.remove('is-dragging');
    /* עד כאן המיקום חי אך ורק ב-style inline של האלמנט, ולכן כל רענון
       או ציור מחדש מחק אותו. offsetLeft/offsetTop תקפים כאן כי הבועית
       גלויה, והערכים כבר clamped על ידי mousemove. */
    fbPositions[boxId] = { left: box.offsetLeft, top: box.offsetTop };
    /* מושהיה ולא סינכרונית: זה שינוי קוסמטי, לא תשובה. */
    if (typeof scheduleResumeSave === 'function') scheduleResumeSave();
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


/* ═══════════════════ xAPI (720) — קונפיגורציה של הסין ═══════════════════
   נתונים בלבד. השכבה המשותפת ב-../unit-js/ קוראת אותם בזמן call.
   ראו REPORT-XAPI.md §2 בלומדת methodica-math-scale-01. */

/* מסך מעבר, ואז טבלת המסה המקיפה (מסך גלילה). */
var SCREEN_TO_SUBCONTENT = {
  0: null,
  1: ['001', 1]
};

/* ⚠️ SCREEN_TO_SUBCONTENT חייב להחזיק בדיוק TOTAL_SCREENS מפתחות (2).
   מפתח חסר = מסך שלא מדווח, בשקט. _test/verify-report.js אוכף את זה. */

var XAPI_COMP_SLUG = 'methodica-science-mass-measure-02-04';
/* מזהי הרכיב והפריטים חייבים להתאים ל-metadata/*.json בית-לבית — המוסכמה
   כאן נושאת TRAILING SLASH על יחידה, רכיב ופריט (לא על שאלה). */
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';

var XAPI_EVAL_ITEMS = {'001': 1};

var XAPI_METADATA_FILE = '../metadata/methodica-science-mass-measure-02-04.json';


/* ═══════════════════ resume — התפרים הפר-סיניים ═══════════════════
   ארבעת השמות האלה נקראים מ-unit-js/40-resume.js ומ-unit-js/50-loader.js
   בזמן call, לא בזמן טעינה — ולכן מותר להם לשבת בתחתית הקובץ.

   הם חייבים לשבת **כאן**, בתוך script.js, ולא בשכבה המשותפת: כל מצב הלומד
   בסין הזה מוצהר כ-let/const ברמת top-level, כלומר הוא יושב ב-global
   lexical scope ואינו נגיש דרך window. השכבה המשותפת לא יכולה להגיע אליו,
   וזו הסיבה שהחוזה הזה הוא פר-סין ולא פונקציה משותפת אחת.

   ── שלב 1 (הנוכחי): מצביע מסך בלבד ──
   capturePartPayload מחזיר את currentScreen, ושלושת האחרים הם no-op.
   התוצאה: לומד שחוזר נוחת על **המסך** הנכון, אבל המסך עצמו נקי — מצב
   התשובות אינו משוחזר.

   זה מכוון ולא חוסר. החזרת משתני התשובה בלי ה-painters הייתה מייצרת מסך
   שנראה כאילו אפשר לענות עליו אבל מתעלם מלחיצות (כי sNNDone כבר true),
   ולכן השניים נשארים צמודים לשלב 2. במצב הנוכחי המסך פשוט טרי וניתן
   לענות עליו שוב.

   ⚠️ הנגזרת המוכרת של שלב 1: stationProgress* ו-XAPI_Q_RESULTS אינם
   משוחזרים, ולכן הניתוב קדימה שנגזר מהם עלול לשלוח לומד שעמד בסף אל
   התרגול המחזק. ראו unit-js/10-identity.js. */
function capturePartPayload() {
  var st = { currentScreen: currentScreen };

  /* שלב 2א — מצב הניקוד וההסתעפות.
     XAPI_Q_RESULTS הוא var ב-20-xapi.js ולכן נגיש כאן. */
  st.qResults = Object.assign({}, XAPI_Q_RESULTS);

  /* שלב 2ב — מצב התשובה של מסך 2 (הטבלה).
     tblDdValues הוא ה"אמת" של ה-dropdowns; ערכי השדות עצמם יושבים **רק
     ב-DOM** ולכן נקראים משם (st.inputs).

     ⚠️ שלושה שדות שנראים מיותרים והם דווקא הליבה של כלל 4 ב-CLAUDE.md:
     כשהלומד לחץ "התשובה הנכונה", tblReveal קרא ל-tblLockAll(true) שדרס את
     tblDdValues ואת השדות בערכים הנכונים. כלומר במצב הזה dd/inputs מתארים
     את **הפתרון**, לא את הלומד — והתשובה האמיתית שלו שרדה רק ב-tblLastAnswer.
     showingCorrect הוא מה שאומר איזה מהשניים מוצג כרגע. בלי שלושתם יחד,
     שחזור היה מקבע את הפתרון כאילו הלומד ענה אותו. */
  st.tbl = {
    dd: Object.assign({}, tblDdValues),
    done: tblDone,
    attempts: tblAttempts,
    phase: tblPhase,
    lastAnswer: tblLastAnswer,
    showingCorrect: tblShowingCorrect,
    sig: tblLastSubmittedSig
  };
  st.inputs = {};
  TBL_INPUT_IDS.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) st.inputs[id] = el.value;
  });
  /* מיקומי בועיות המשוב שנגררו (ראו fbPositions). חייב לצאת מכאן
     ולא להיכתב למסמך ממקום אחר: captureUnitState **מחליף** את
     parts[slug] בכל שמירה. */
  st.fbPos = Object.assign({}, fbPositions);
  return st;
}

/* מחזיר את משתני המצב. נקרא **פעמיים** מ-applyExecutionState — לפני ה-goTo
   ואחריו — כי resetScreenState הוא מאתחל ולא משחזר. ראו unit-js/40-resume.js.

   מוטציה במקום ולא הצבה מחדש, במקומות שבהם קוד המסך מחזיק הפניה חיה
   לאובייקט (XAPI_Q_RESULTS, tblDdValues); החלפת האובייקט הייתה משאירה
   קוראים על עותק מיושן. */
function applyResumeVars(st) {
  if (!st) return;
  /* מסמך ישן בלי המפתח → המפה נשארת ריקה, וההתנהגות זהה לקודם. */
  if (st.fbPos) Object.keys(st.fbPos).forEach(function (k) { fbPositions[k] = st.fbPos[k]; });
  if (st.qResults) {
    Object.keys(st.qResults).forEach(function (k) { XAPI_Q_RESULTS[k] = st.qResults[k]; });
  }
  if (st.tbl) {
    if (st.tbl.dd) Object.keys(st.tbl.dd).forEach(function (k) { tblDdValues[k] = st.tbl.dd[k]; });
    tblDone           = !!st.tbl.done;
    tblAttempts       = st.tbl.attempts || 0;
    tblPhase          = st.tbl.phase || 'before';
    tblLastAnswer     = st.tbl.lastAnswer || null;
    tblShowingCorrect = !!st.tbl.showingCorrect;
    /* מסמך ישן בלי המפתח → null, כלומר הכפתור מחושב כמו קודם. */
    tblLastSubmittedSig = (typeof st.tbl.sig === 'string') ? st.tbl.sig : null;
  }
}

/* מחזיר ערכים שיושבים רק ב-DOM. רץ **לפני** ה-painter, שנועל ומסמן אותם. */
function applyResumeDom(st) {
  if (!st) return;

  /* ── התווית הנראית של ה-dropdowns (QA 2026-08-20, שקופית 6) ──
     ה-dropdowns כאן אינם <select> אלא מותאמים: הערך יושב ב-tblDdValues,
     אבל **התווית העברית שהלומד רואה** יושבת רק ב-#<id>-val, שריק ב-markup.
     שלושה מקומות כותבים אותה, וכולם מסלולי זרימה חיה: tblDdSelect,
     tblLockAll(true) בחשיפה, ו-tblShowMyAnswer בטוגל. אף אחד מהם לא רץ
     בשחזור.

     מה שכן חזר הטעה: applyResumeVars החזיר את tblDdValues, ו-tblMarkAll
     צובע את **הכפתור** ב-correct/wrong לפי הערכים האלה — ולכן אחרי רענון
     המסך הציג סימוני ✓/✗ על תאים ריקים לגמרי, בעוד שדות הטקסט (שכן
     מוחזרים למטה) שמרו את ערכיהם. זה בדיוק מה שה-QA דיווח.

     ⚠️ הבלוק הזה חייב לשבת **לפני** הבדיקה על st.inputs: עד התיקון הפונקציה
     פתחה ב-`if (!st || !st.inputs) return`, ומסמך בלי inputs היה מדלג גם על
     התוויות.

     אותו בלוק בדיוק קיים בשני הסינים האחרים שיש בהם dropdowns מותאמים —
     סין 02 (st.dd8.vals) וסין 01 (st.s19.vals). סין 04 היה היחיד בלעדיו. */
  if (st.tbl && st.tbl.dd) {
    TBL_DD_IDS.forEach(function (id) {
      var valEl = document.getElementById(id + '-val');
      if (valEl && typeof st.tbl.dd[id] === 'string') valEl.textContent = st.tbl.dd[id];
    });
  }

  if (!st.inputs) return;
  TBL_INPUT_IDS.forEach(function (id) {
    if (typeof st.inputs[id] !== 'string') return;
    var el = document.getElementById(id);
    if (el) el.value = st.inputs[id];
  });
}

/* ציור מצב "נענה". חייב להישאר exception-safe — נקרא גם מ-applyExecutionState
   וגם מכל ניווט, ואסור לו לשבור ניווט. */
function restoreScreenUI(n) {
  try {
    if (n === 1) tblRestoreUI();
  } catch (e) { console.error('[resume] restoreScreenUI', e); }
}

/* מסך 2 — משקף **רק** את כתיבות ה-DOM של tblCheck. אין כאן שינוי state, אין
   דיווח xAPI ואין xapiAnswered: הכל כבר קרה בפעם הראשונה, וכפילות כאן הייתה
   מדווחת תשובה שנייה על אותה שאלה.

   הערכים עצמם (dd ו-inputs) הוחזרו כבר ע"י applyResumeVars/applyResumeDom,
   ולכן tblLockAll נקרא עם false גם במצב "מציג פתרון" — קריאה עם true הייתה
   דורסת אותם מחדש ללא צורך. */
function tblRestoreUI() {
  const revealBtn = document.getElementById('tbl-reveal-btn');

  if (tblDone) {
    tblLockAll(false);
    tblMarkAll();
    if (tblPhase === 'correct') {
      tblShowFeedback('correct', true);
    } else {
      /* wrong-final. הטוגל נשמר: מי שהשאיר את הפתרון על המסך חוזר לפתרון,
         ומי שהחזיר את תשובתו חוזר אליה — עם התווית המתאימה לכל מצב. */
      tblShowFeedback(tblShowingCorrect ? 'wrongFinal' : 'wrongPending', false);
      if (revealBtn) {
        revealBtn.hidden = false;
        revealBtn.textContent = tblShowingCorrect ? 'התשובה שלי' : 'התשובה הנכונה';
      }
    }
    tblSetBtnCheck('המשך', true, 'continue');
    return;
  }

  if (tblAttempts >= 1) {
    tblMarkAll();
    tblShowFeedback('wrong1', false);
    const hb = document.getElementById('tbl-hint');
    if (hb) hb.hidden = false;
  }
  /* מחשב מחדש את כפתור הבדיקה מ**אותו** predicate שהקוד החי משתמש בו.
     זה מה שמונע לומד תקוע: tblCheck משבית את הכפתור אחרי טעות, והוא חוזר
     לפעולה רק דרך tblOnInput. בלי הקריאה הזאת מסך משוחזר עם כל השדות
     מלאים היה מציג כפתור מושבת בלי דרך להפעיל אותו. */
  tblOnInput();
}
