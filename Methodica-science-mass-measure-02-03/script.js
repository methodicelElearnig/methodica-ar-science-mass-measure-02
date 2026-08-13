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
    ? ['avatar-green-dancing.gif']
    : ['avatar-orange-dancing.gif'];
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
  /* xAPI: זוגות initialized/completed ברמת הפריט. מוצב **אחרון**, אחרי
     ה-.active, כדי שקריאת רשת לא תעכב את ה-paint; ואחרי currentScreen = n,
     שממנו submitReport והיומן קוראים. עטוף ב-try/catch — דיווח לעולם לא
     יעצור ניווט. resetScreenState לפני ה-.active נשאר כפי שהיה: זה הכלל
     שמונע הבהוב אווטאר (CLAUDE.md כלל 1). */
  try { xapiOnScreen(n); } catch (e) {}
}

function resetScreenState(n) {
  if (n === 0) resetScreenState0();
  if (n === 1) resetScreenState1();
}

/* =========================================================
   מסך 1 — מסך מעבר: השלמת בהצלחה את התרגול
   ========================================================= */

function resetScreenState0() {
  const img = document.getElementById('s0-avatar-img');
  if (img) {
    img.src = (window.lomdaState.selectedCharacter === 'green')
      ? 'assets/images/avatar-green-dancing.gif'
      : 'assets/images/avatar-orange-dancing.gif';
  }
}

function s0Continue() { goTo(1); }
function s0Back() {
  /* הסין הזה ניתן להגעה משני מקומות: מסין 02 (המסלול הרגיל) ומסין 01 ישירות,
     כשהלומד עמד בסף 4/5 ודילג על סין 02. לכן ה"חזרה" נגזרת מקשת שנרשמה
     בניווט קדימה, ולא מקובעת — אחרת מי שדילג היה נשלח לתוך סין 02, תוכן
     שלא ראה.
     ה-fallback הוא ההתנהגות שהייתה קודם (סין 02, מסך 9), כך שאם sessionStorage
     חסום או שלא נרשמה קשת — הכפתור מתנהג בדיוק כמו לפני השינוי.
     ראו unit-js/40-ledger.js → "קשתות-חזרה בין סינים". */
  goBackToPreviousPart('Methodica-science-mass-measure-02-02', '#screen=8');
}

/* =========================================================
   מסך 2 — משימת כיתה (עותק של מסך 30 בלומדה המקורית)
   מסך טקסטואלי טהור, ללא state — זהה למקור (אין resetScreenState30
   בלומדה המקורית; רק כפתור המשך יחיד)
   ========================================================= */

function resetScreenState1() {}

function s1Continue() {
  /* xAPI: הרכיב הזה הוא משימת כיתה מחוץ למחשב — פריט 001 במטא-דאטה הוא
     contentType=task-inquiry-or-project ואין לו שאלות בכלל. לכן מדווח
     success בלי score: אין מה לדרג, אבל חשוב לרשום שהלומד עבר בו.
     ‎(דיווח score כאן היה ממציא ניקוד שאף אחד לא מדד.) */
  xapiCompleteComponent({ success: true });

  /* קישור בין סינים: מסך אחרון בסיין 3 -> מסך ראשון בסיין 4 (+ ?slxapi, §6) */
  window.location.href = '../Methodica-science-mass-measure-02-04/index.html' + window.location.search;
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

/* אתחול */
scaleApp();
resetScreenState(0);

/* קישור בין סינים: הגעה לכאן דרך "חזרה" מהסיין הבא נכנסת ישירות למסך
   המבוקש לפי #screen=N ב-URL, במקום למסך הראשון כברירת מחדל */
(function jumpToLinkedScreen() {
  const m = /^#screen=(\d+)$/.exec(location.hash);
  if (m) goTo(parseInt(m[1], 10));
})();


/* ═══════════════════ xAPI (720) — קונפיגורציה של הסין ═══════════════════
   נתונים בלבד. השכבה המשותפת ב-../unit-js/ קוראת אותם בזמן call.
   ראו REPORT-XAPI.md §2 בלומדת methodica-math-scale-01. */

/* מסך מעבר, ואז משימת הכיתה. לפריט 001 אין שאלות במטא-דאטה
   (contentType=task-inquiry-or-project) — משימה מחוץ למחשב, אין מה לדרג. */
var SCREEN_TO_SUBCONTENT = {
  0: null,
  1: ['001', 1]
};

/* ⚠️ SCREEN_TO_SUBCONTENT חייב להחזיק בדיוק TOTAL_SCREENS מפתחות (2).
   מפתח חסר = מסך שלא מדווח, בשקט. _test/verify-report.js אוכף את זה. */

var XAPI_COMP_SLUG = 'methodica-science-mass-measure-02-03';
/* מזהי הרכיב והפריטים חייבים להתאים ל-metadata/*.json בית-לבית — המוסכמה
   כאן נושאת TRAILING SLASH על יחידה, רכיב ופריט (לא על שאלה). */
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';

/* אין שאלות מדורגות בסין הזה. */
var XAPI_EVAL_ITEMS = {};

var XAPI_METADATA_FILE = '../metadata/methodica-science-mass-measure-02-03.json';

