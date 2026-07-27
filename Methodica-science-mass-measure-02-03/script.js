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
  /* קישור בין סינים: מסך ראשון בסיין 3 -> מסך אחרון (9) בסיין 2 */
  window.location.href = '../Methodica-science-mass-measure-02-02/index.html#screen=8';
}

/* =========================================================
   מסך 2 — משימת כיתה (עותק של מסך 30 בלומדה המקורית)
   מסך טקסטואלי טהור, ללא state — זהה למקור (אין resetScreenState30
   בלומדה המקורית; רק כפתור המשך יחיד)
   ========================================================= */

function resetScreenState1() {}

function s1Continue() {
  /* קישור בין סינים: מסך אחרון בסיין 3 -> מסך ראשון בסיין 4 */
  window.location.href = '../Methodica-science-mass-measure-02-04/index.html';
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
