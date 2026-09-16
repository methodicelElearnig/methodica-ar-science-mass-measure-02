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
    ? ['avatar-green-dancing.gif']
    : ['avatar-orange-dancing.gif'];
  files.forEach(function (name) {
    const img = new Image();
    img.src = '../unit-assets/img/' + name;   /* the list above is dancing GIFs only, and they live at unit level */
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
  /* resume: ציור מצב "נענה" של המסך הזה. בסין הזה restoreScreenUI ריק (שני
     מסכים סטטיים), ולכן זו קריאה no-op — נשמרת לאחידות, כדי שהוספת שאלה כאן
     לא תדרוש לזכור את הקריאה. ההנמקה: unit-js/40-resume.js ליד repaintScreen. */
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
   מסך 1 — מסך מעבר: השלמת בהצלחה את התרגול
   ========================================================= */

function resetScreenState0() {
  const img = document.getElementById('s0-avatar-img');
  if (img) {
    img.src = (window.lomdaState.selectedCharacter === 'green')
      ? '../unit-assets/img/avatar-green-dancing.gif'
      : '../unit-assets/img/avatar-orange-dancing.gif';
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
     ראו unit-js/40-resume.js → "קשתות-חזרה בין סינים". */
  goBackToPreviousPart('methodica-science-mass-measure-02-02', '#screen=8');
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
  xapiEndComponent({ success: true }, document.getElementById('s1-continue'));

  /* המעבר לסין 04 שהיה כאן חי רק ב-walkthrough מקומי (DEV_NAV,
     unit-js/10-identity.js). בייצור Kata מקבלת את ה-completed ומנתבת;
     הרכיב נעצר בלחיצה הזאת והכפתור מושבת (2026-09-16). */
  if (DEV_NAV) {
    writeForwardState('methodica-science-mass-measure-02-04', '#screen=1');
    window.location.href = '../methodica-science-mass-measure-02-04/index.html' + window.location.search;
  }
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
     XAPI_Q_RESULTS הוא var ב-20-xapi.js ולכן נגיש כאן; המפות stationProgress*
     הן let פר-סין ולכן **חייבות** לעבור דרך ה-hook הזה. */
  st.qResults = Object.assign({}, XAPI_Q_RESULTS);
  return st;
}

/* שלב 2 — החזרת משתני התשובה של הסין.
   ⚠️ אם המימוש יעבור ל-eval כמו בלומדת המקור, שם הפרמטר חייב להישאר `st`:
   ה-eval מפרש אותו לקסיקלית, ושינוי שם נכשל **בשקט** (הזריקה נבלעת
   ב-try/catch העוטף) ולוקח איתו את התשובות של הלומד. */
/* שלב 2א — מחזיר את מצב הניקוד וההסתעפות בלבד.

   למה זה חייב לקרות, ולא רק "נחמד": הניתוב קדימה נגזר מהמפות האלה, ולכן
   לומד שהמשיך אחרי resume בלעדיהן היה מנותב לפי ציון 0 — כלומר מי שעמד
   בסף נשלח לתרגול מחזק שהוא כבר דילג עליו.

   מוטציה במקום ולא הצבה מחדש: 20-xapi.js כותב ל-XAPI_Q_RESULTS[key] דרך
   הגלובל, וקוד הסין מחזיק הפניה חיה למפות — החלפת האובייקט הייתה עלולה
   להשאיר קוראים על עותק מיושן.

   ⚠️ במכוון **לא** מחזיר דגלי sNNDone/Selected/Attempts. הם משוחזרים רק
   יחד עם ה-painters (שלב 2ב), כי מסך עם Done=true ובלי ציור נראה כאילן
   אפשר לענות עליו אבל מתעלם מלחיצות. */
function applyResumeVars(st) {
  if (!st) return;
  if (st.qResults) {
    Object.keys(st.qResults).forEach(function (k) { XAPI_Q_RESULTS[k] = st.qResults[k]; });
  }
}

/* שלב 2 — החזרת ערכים שיושבים רק ב-DOM: טקסט שהוקלד בשדות, ותוויות
   של dropdown שה-value המכונה שלהן נשמר בנפרד. */
function applyResumeDom(st) {}

/* שלב 2 — ציור מצב "נענה" (מסומן, נעול, פידבק גלוי).
   חייב להישאר exception-safe: נקרא גם מ-applyExecutionState וגם — בשלב 2 —
   מכל ניווט, ואסור לו לשבור ניווט. */
function restoreScreenUI(n) {}
