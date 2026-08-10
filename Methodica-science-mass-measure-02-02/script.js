'use strict';

/* =========================================================
   מנוע גלובלי — canvas scaling, ניווט מסכים, סטייט גלובלי
   ========================================================= */

const TOTAL_SCREENS = 9;
let currentScreen = 0;

/* הדמות שנבחרה בסיין 1 (מסך 1) נשמרת ב-localStorage כי סיין 2 הוא
   מסמך HTML נפרד לחלוטין — window.lomdaState לא "עובר" בין הסינים
   בטעינת עמוד מלאה. קורא כאן את הערך שסיין 1 שמר, עם ברירת מחדל
   'orange' (התנהגות זהה לכל שאר המסכים בפרויקט כשאין בחירה).
   try/catch: בפתיחה מ-file:// חלק מהדפדפנים (ולמשל jsdom) חוסמים
   גישה ל-localStorage עם SecurityError — בלי ה-try/catch, חריגה כאן
   הייתה עוצרת את טעינת כל script.js (גם הפונקציות שמוגדרות בהמשך) */
let savedCharacter = null;
try {
  savedCharacter = localStorage.getItem('lomda_selectedCharacter');
} catch (e) { /* localStorage חסום (opaque origin/פרטיות) — נמשיך בלי שמירה */ }
window.lomdaState = {
  selectedCharacter: savedCharacter || null
};

/* טוענים מראש (preload) את תמונות הדמות של הצבע הנבחר, כדי שכש-
   resetScreenState0/6 יקבעו את ה-src הנכון, התמונה כבר תהיה בקאש
   של הדפדפן ותצויר מיידית — בלי רגע ריק/מהבהב בכניסה הראשונה למסך. */
(function preloadCharacterAvatars() {
  const isGreen = window.lomdaState.selectedCharacter === 'green';
  const files = isGreen
    ? ['avatar-green-come-in.png', 'avatar-green-clapping-hands.png']
    : ['avatar-orange-come-in.png', 'avatar-orange-clapping-hands.png'];
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
  // resetScreenState לפני .active: כך שכל תמונת דמות תלוית-בחירה (למשל
  // s0-avatar-img / s6-avatar-img) כבר מקבלת את ה-src הנכון לפני שהמסך
  // בכלל נהיה גלוי — מונע הבהוב "כתום ואז ירוק" (או להפך) כשה-DOM כבר
  // הציג את ברירת המחדל הישנה ורק אז JS מחליף אותה.
  resetScreenState(n);
  target.classList.add('active');
}

function resetScreenState(n) {
  if (n === 0) resetScreenState0();
  if (n === 1) resetScreenState1();
  if (n === 2) resetScreenState2();
  if (n === 3) resetScreenState3();
  if (n === 4) resetScreenState4();
  if (n === 5) resetScreenState5();
  if (n === 6) resetScreenState6();
  if (n === 7) resetScreenState7();
  if (n === 8) resetScreenState8();
}

/* =========================================================
   מסך 1 — מסך מעבר: אפשר להתחיל!
   ========================================================= */

function resetScreenState0() {
  const img = document.getElementById('s0-avatar-img');
  if (img) {
    img.src = (window.lomdaState.selectedCharacter === 'green')
      ? 'assets/images/avatar-green-come-in.png'
      : 'assets/images/avatar-orange-come-in.png';
  }
}

function s0Continue() { goTo(1); }
function s0Back() {
  /* קישור בין סינים: מסך ראשון בסיין 2 -> מסך אחרון (20) בסיין 1 */
  window.location.href = '../Methodica-science-mass-measure-02-01/index.html#screen=19';
}

/* =========================================================
   stationProgress2 — מעקב שאלות תחנה (מסכים 2-6, שאלות 1-5)
   סרגל ההתקדמות המשותף (updateQuestionNav2) קורא מהאובייקט הזה
   ========================================================= */

let stationProgress2 = { q2: null, q3: null, q4: null, q5: null, q6: null };

function updateQuestionNav2(prefix) {
  const qs = [stationProgress2.q2, stationProgress2.q3, stationProgress2.q4,
              stationProgress2.q5, stationProgress2.q6];
  const currentIdx = qs.indexOf(null);
  for (let i = 0; i < 5; i++) {
    const icon = document.getElementById(prefix + '-qnav-icon-' + (i + 1));
    const label = document.getElementById(prefix + '-qnav-label-' + (i + 1));
    if (!icon) continue;
    icon.className = 'qnav-icon';
    if (label) label.className = 'qnav-label';
    if (qs[i] === 'success') {
      icon.classList.add('qnav-success');
      if (label) label.classList.add('qnav-label-active');
    } else if (qs[i] === 'fail') {
      icon.classList.add('qnav-fail');
      if (label) label.classList.add('qnav-label-active');
    } else if (i === currentIdx) {
      icon.classList.add('qnav-current');
      if (label) label.classList.add('qnav-label-active');
    } else {
      icon.classList.add('qnav-future');
    }
  }
  for (let j = 1; j <= 4; j++) {
    const line = document.getElementById(prefix + '-qnav-line-' + j);
    if (!line) continue;
    line.className = 'qnav-line';
    if (qs[j - 1] !== null) line.classList.add('line-done');
  }
}

/* =========================================================
   מסך 2 — שאלה 1/5: מהו ברוטו? (MultipleChoiceQuestion)
   רמז גלוי ומופעל מההתחלה — לא נחשף רק אחרי ניסיון ראשון
   ========================================================= */

const MCQ_SQ2 = {
  correctIds: ['a', 'c'],
  maxAttempts: 2,
  feedback: {
    correct: { title: 'מצוין!', body: 'ברוטו = הכול יחד (התוכן והאריזה גם יחד).' },
    wrong1: { title: 'התשובה אינה נכונה.', body: 'לא נורא, גם מטעויות לומדים. ננסה שוב?' },
    wrong2: { title: 'התשובה אינה נכונה.', body: 'ברוטו = הכול יחד (התוכן והאריזה גם יחד).' }
  }
};

let sq2Selected = [];
let sq2Attempts = 0;
let sq2Done = false;
let sq2Phase = 'before';

function sq2OptEl(id) { return document.querySelector('#s1 .scq-opt[data-id="' + id + '"]'); }

function sq2Toggle(id) {
  if (sq2Done) return;
  if (sq2Phase === 'wrong1') {
    document.querySelectorAll('#s1 .scq-opt').forEach(function (el) { el.classList.remove('wrong'); });
    document.getElementById('sq2-feedbox').classList.remove('visible');
    sq2Phase = 'before';
  }
  const el = sq2OptEl(id);
  const idx = sq2Selected.indexOf(id);
  if (idx >= 0) {
    sq2Selected.splice(idx, 1);
    el.classList.remove('selected');
    el.setAttribute('aria-checked', 'false');
  } else {
    sq2Selected.push(id);
    el.classList.add('selected');
    el.setAttribute('aria-checked', 'true');
  }
  if (sq2Selected.length > 0) sq2Phase = 'selected';
  const checkBtn = document.getElementById('sq2-check');
  checkBtn.textContent = 'צדקתי?';
  checkBtn.disabled = sq2Selected.length === 0;
  checkBtn.onclick = sq2Check;
}

function sq2ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('sq2-feedbox');
  const data = MCQ_SQ2.feedback[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition(box.id);
  box.classList.add('visible');
}

function sq2SetBarDone(label, handler) {
  const checkBtn = document.getElementById('sq2-check');
  checkBtn.textContent = label;
  checkBtn.disabled = false;
  checkBtn.onclick = handler;
}

function sq2Check() {
  if (sq2Selected.length === 0 || sq2Done) return;
  sq2Attempts++;
  const correct = MCQ_SQ2.correctIds;
  const isCorrect = correct.length === sq2Selected.length &&
    correct.every(function (cid) { return sq2Selected.indexOf(cid) >= 0; });

  if (isCorrect) {
    sq2Phase = 'correct';
    sq2Done = true;
    correct.forEach(function (cid) {
      const el = sq2OptEl(cid);
      el.classList.remove('selected');
      el.classList.add('correct');
    });
    sq2LockOptions();
    sq2ShowFeedback('correct', true);
    stationProgress2.q2 = 'success';
    updateQuestionNav2('sq2');
    sq2SetBarDone('המשך', function () { sq2Continue(); });
    return;
  }

  document.querySelectorAll('#s1 .scq-opt').forEach(function (el) {
    if (sq2Selected.indexOf(el.dataset.id) >= 0) {
      el.classList.remove('selected');
      el.classList.add('wrong');
    }
  });
  sq2Selected = [];

  if (sq2Attempts < MCQ_SQ2.maxAttempts) {
    sq2Phase = 'wrong1';
    sq2ShowFeedback('wrong1', false);
    const checkBtn = document.getElementById('sq2-check');
    checkBtn.textContent = 'צדקתי?';
    checkBtn.disabled = true;
    checkBtn.onclick = sq2Check;
  } else {
    correct.forEach(function (cid) {
      const el = sq2OptEl(cid);
      el.classList.remove('wrong');
      el.classList.add('correct');
    });
    sq2Phase = 'wrong-final';
    sq2Done = true;
    sq2LockOptions();
    sq2ShowFeedback('wrong2', false);
    stationProgress2.q2 = 'fail';
    updateQuestionNav2('sq2');
    sq2SetBarDone('המשך', function () { sq2Continue(); });
  }
}

function sq2LockOptions() {
  document.querySelectorAll('#s1 .scq-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.onclick = null;
  });
}
function sq2UnlockOptions() {
  document.querySelectorAll('#s1 .scq-opt').forEach(function (el) {
    el.classList.remove('disabled');
    el.onclick = function () { sq2Toggle(el.dataset.id); };
  });
}

function sq2Continue() { goTo(2); }

function sq2OpenHint() { document.getElementById('sq2-hint-overlay').hidden = false; }
function sq2CloseHint() { document.getElementById('sq2-hint-overlay').hidden = true; }
document.getElementById('sq2-hint-overlay').addEventListener('click', function (e) {
  if (e.target === this) sq2CloseHint();
});


function resetScreenState1() {
  if (sq2Done || sq2Attempts > 0 || sq2Selected.length > 0) return; // resume-state: שאלה שהתחילה/נענתה כבר לא מקבלת איפוס
  sq2Selected = [];
  sq2Attempts = 0;
  sq2Phase = 'before';
  sq2UnlockOptions();
  document.querySelectorAll('#s1 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong', 'correct');
    el.setAttribute('aria-checked', 'false');
  });
  document.getElementById('sq2-feedbox').classList.remove('visible');
  const checkBtn = document.getElementById('sq2-check');
  checkBtn.textContent = 'צדקתי?';
  checkBtn.disabled = true;
  checkBtn.onclick = sq2Check;
  document.getElementById('sq2-hint-overlay').hidden = true;
  updateQuestionNav2('sq2');
}

/* =========================================================
   מסך 3 — שאלה 2/5: מהו נטו? (MultipleChoiceQuestion)
   ========================================================= */

const MCQ_SQ3 = {
  correctIds: ['b', 'd'],
  maxAttempts: 2,
  feedback: {
    correct: { title: 'מצוין!', body: 'נטו = התוכן בלבד (מה שבאמת משתמשים בו).' },
    wrong1: { title: 'התשובה אינה נכונה.', body: 'לא נורא, גם מטעויות לומדים. ננסה שוב?' },
    wrong2: { title: 'התשובה אינה נכונה.', body: 'נטו = התוכן בלבד (מה שבאמת משתמשים בו).' }
  }
};

let sq3Selected = [];
let sq3Attempts = 0;
let sq3Done = false;
let sq3Phase = 'before';

function sq3OptEl(id) { return document.querySelector('#s2 .scq-opt[data-id="' + id + '"]'); }

function sq3Toggle(id) {
  if (sq3Done) return;
  if (sq3Phase === 'wrong1') {
    document.querySelectorAll('#s2 .scq-opt').forEach(function (el) { el.classList.remove('wrong'); });
    document.getElementById('sq3-feedbox').classList.remove('visible');
    sq3Phase = 'before';
  }
  const el = sq3OptEl(id);
  const idx = sq3Selected.indexOf(id);
  if (idx >= 0) {
    sq3Selected.splice(idx, 1);
    el.classList.remove('selected');
    el.setAttribute('aria-checked', 'false');
  } else {
    sq3Selected.push(id);
    el.classList.add('selected');
    el.setAttribute('aria-checked', 'true');
  }
  if (sq3Selected.length > 0) sq3Phase = 'selected';
  const checkBtn = document.getElementById('sq3-check');
  checkBtn.textContent = 'צדקתי?';
  checkBtn.disabled = sq3Selected.length === 0;
  checkBtn.onclick = sq3Check;
}

function sq3ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('sq3-feedbox');
  const data = MCQ_SQ3.feedback[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition(box.id);
  box.classList.add('visible');
}

function sq3SetBarDone(label, handler) {
  const checkBtn = document.getElementById('sq3-check');
  checkBtn.textContent = label;
  checkBtn.disabled = false;
  checkBtn.onclick = handler;
}

function sq3Check() {
  if (sq3Selected.length === 0 || sq3Done) return;
  sq3Attempts++;
  const correct = MCQ_SQ3.correctIds;
  const isCorrect = correct.length === sq3Selected.length &&
    correct.every(function (cid) { return sq3Selected.indexOf(cid) >= 0; });

  if (isCorrect) {
    sq3Phase = 'correct';
    sq3Done = true;
    correct.forEach(function (cid) {
      const el = sq3OptEl(cid);
      el.classList.remove('selected');
      el.classList.add('correct');
    });
    sq3LockOptions();
    sq3ShowFeedback('correct', true);
    stationProgress2.q3 = 'success';
    updateQuestionNav2('sq3');
    sq3SetBarDone('המשך', function () { sq3Continue(); });
    return;
  }

  document.querySelectorAll('#s2 .scq-opt').forEach(function (el) {
    if (sq3Selected.indexOf(el.dataset.id) >= 0) {
      el.classList.remove('selected');
      el.classList.add('wrong');
    }
  });
  sq3Selected = [];

  if (sq3Attempts < MCQ_SQ3.maxAttempts) {
    sq3Phase = 'wrong1';
    sq3ShowFeedback('wrong1', false);
    const checkBtn = document.getElementById('sq3-check');
    checkBtn.textContent = 'צדקתי?';
    checkBtn.disabled = true;
    checkBtn.onclick = sq3Check;
  } else {
    correct.forEach(function (cid) {
      const el = sq3OptEl(cid);
      el.classList.remove('wrong');
      el.classList.add('correct');
    });
    sq3Phase = 'wrong-final';
    sq3Done = true;
    sq3LockOptions();
    sq3ShowFeedback('wrong2', false);
    stationProgress2.q3 = 'fail';
    updateQuestionNav2('sq3');
    sq3SetBarDone('המשך', function () { sq3Continue(); });
  }
}

function sq3LockOptions() {
  document.querySelectorAll('#s2 .scq-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.onclick = null;
  });
}
function sq3UnlockOptions() {
  document.querySelectorAll('#s2 .scq-opt').forEach(function (el) {
    el.classList.remove('disabled');
    el.onclick = function () { sq3Toggle(el.dataset.id); };
  });
}

function sq3Continue() { goTo(3); }

function sq3OpenHint() { document.getElementById('sq3-hint-overlay').hidden = false; }
function sq3CloseHint() { document.getElementById('sq3-hint-overlay').hidden = true; }
document.getElementById('sq3-hint-overlay').addEventListener('click', function (e) {
  if (e.target === this) sq3CloseHint();
});


function resetScreenState2() {
  if (sq3Done || sq3Attempts > 0 || sq3Selected.length > 0) return;
  sq3Selected = [];
  sq3Attempts = 0;
  sq3Phase = 'before';
  sq3UnlockOptions();
  document.querySelectorAll('#s2 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong', 'correct');
    el.setAttribute('aria-checked', 'false');
  });
  document.getElementById('sq3-feedbox').classList.remove('visible');
  const checkBtn = document.getElementById('sq3-check');
  checkBtn.textContent = 'צדקתי?';
  checkBtn.disabled = true;
  checkBtn.onclick = sq3Check;
  document.getElementById('sq3-hint-overlay').hidden = true;
  updateQuestionNav2('sq3');
}

/* =========================================================
   מסך 4 — שאלה 3/5: יחידות מסה (גרם) (MultipleChoiceQuestion)
   ========================================================= */

const MCQ_SQ4 = {
  correctIds: ['a', 'c'],
  maxAttempts: 2,
  feedback: {
    correct: { title: 'מצוין!', body: 'גרמים מתאימים בדרך כלל למדידת גופים קטנים עד בינוניים בחיי היום-יום.' },
    wrong1: { title: 'התשובה אינה נכונה.', body: 'לא נורא, גם מטעויות לומדים. ננסה שוב?' },
    wrong2: { title: 'התשובה אינה נכונה.', body: 'גרמים מתאימים בדרך כלל למדידת גופים קטנים עד בינוניים בחיי היום-יום.' }
  }
};

let sq4Selected = [];
let sq4Attempts = 0;
let sq4Done = false;
let sq4Phase = 'before';

function sq4OptEl(id) { return document.querySelector('#s3 .scq-opt[data-id="' + id + '"]'); }

function sq4Toggle(id) {
  if (sq4Done) return;
  if (sq4Phase === 'wrong1') {
    document.querySelectorAll('#s3 .scq-opt').forEach(function (el) { el.classList.remove('wrong'); });
    document.getElementById('sq4-feedbox').classList.remove('visible');
    sq4Phase = 'before';
  }
  const el = sq4OptEl(id);
  const idx = sq4Selected.indexOf(id);
  if (idx >= 0) {
    sq4Selected.splice(idx, 1);
    el.classList.remove('selected');
    el.setAttribute('aria-checked', 'false');
  } else {
    sq4Selected.push(id);
    el.classList.add('selected');
    el.setAttribute('aria-checked', 'true');
  }
  if (sq4Selected.length > 0) sq4Phase = 'selected';
  const checkBtn = document.getElementById('sq4-check');
  checkBtn.textContent = 'צדקתי?';
  checkBtn.disabled = sq4Selected.length === 0;
  checkBtn.onclick = sq4Check;
}

function sq4ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('sq4-feedbox');
  const data = MCQ_SQ4.feedback[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition(box.id);
  box.classList.add('visible');
}

function sq4SetBarDone(label, handler) {
  const checkBtn = document.getElementById('sq4-check');
  checkBtn.textContent = label;
  checkBtn.disabled = false;
  checkBtn.onclick = handler;
}

function sq4Check() {
  if (sq4Selected.length === 0 || sq4Done) return;
  sq4Attempts++;
  const correct = MCQ_SQ4.correctIds;
  const isCorrect = correct.length === sq4Selected.length &&
    correct.every(function (cid) { return sq4Selected.indexOf(cid) >= 0; });

  if (isCorrect) {
    sq4Phase = 'correct';
    sq4Done = true;
    correct.forEach(function (cid) {
      const el = sq4OptEl(cid);
      el.classList.remove('selected');
      el.classList.add('correct');
    });
    sq4LockOptions();
    sq4ShowFeedback('correct', true);
    stationProgress2.q4 = 'success';
    updateQuestionNav2('sq4');
    sq4SetBarDone('המשך', function () { sq4Continue(); });
    return;
  }

  document.querySelectorAll('#s3 .scq-opt').forEach(function (el) {
    if (sq4Selected.indexOf(el.dataset.id) >= 0) {
      el.classList.remove('selected');
      el.classList.add('wrong');
    }
  });
  sq4Selected = [];

  if (sq4Attempts < MCQ_SQ4.maxAttempts) {
    sq4Phase = 'wrong1';
    sq4ShowFeedback('wrong1', false);
    const checkBtn = document.getElementById('sq4-check');
    checkBtn.textContent = 'צדקתי?';
    checkBtn.disabled = true;
    checkBtn.onclick = sq4Check;
  } else {
    correct.forEach(function (cid) {
      const el = sq4OptEl(cid);
      el.classList.remove('wrong');
      el.classList.add('correct');
    });
    sq4Phase = 'wrong-final';
    sq4Done = true;
    sq4LockOptions();
    sq4ShowFeedback('wrong2', false);
    stationProgress2.q4 = 'fail';
    updateQuestionNav2('sq4');
    sq4SetBarDone('המשך', function () { sq4Continue(); });
  }
}

function sq4LockOptions() {
  document.querySelectorAll('#s3 .scq-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.onclick = null;
  });
}
function sq4UnlockOptions() {
  document.querySelectorAll('#s3 .scq-opt').forEach(function (el) {
    el.classList.remove('disabled');
    el.onclick = function () { sq4Toggle(el.dataset.id); };
  });
}

function sq4Continue() { goTo(4); }

function sq4OpenHint() { document.getElementById('sq4-hint-overlay').hidden = false; }
function sq4CloseHint() { document.getElementById('sq4-hint-overlay').hidden = true; }
document.getElementById('sq4-hint-overlay').addEventListener('click', function (e) {
  if (e.target === this) sq4CloseHint();
});


function resetScreenState3() {
  if (sq4Done || sq4Attempts > 0 || sq4Selected.length > 0) return;
  sq4Selected = [];
  sq4Attempts = 0;
  sq4Phase = 'before';
  sq4UnlockOptions();
  document.querySelectorAll('#s3 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong', 'correct');
    el.setAttribute('aria-checked', 'false');
  });
  document.getElementById('sq4-feedbox').classList.remove('visible');
  const checkBtn = document.getElementById('sq4-check');
  checkBtn.textContent = 'צדקתי?';
  checkBtn.disabled = true;
  checkBtn.onclick = sq4Check;
  document.getElementById('sq4-hint-overlay').hidden = true;
  updateQuestionNav2('sq4');
}

/* =========================================================
   מסך 5 — שאלה 4/5: נכון / לא נכון (TrueFalseQuestion)
   4 טענות — יש להכריע נכון/לא נכון בכולן; אין ניקוד חלקי
   ========================================================= */

const TF_SQ5_CORRECT = { r1: 'true', r2: 'true', r3: 'true', r4: 'false' };
const TF_SQ5 = {
  maxAttempts: 2,
  feedback: {
    correct: {
      title: 'מצוין!',
      body: 'אפשר למדוד כל גוף בכל יחידת מסה, אך בוחרים את היחידה שנותנת מספר נוח לקריאה ולהשוואה.\nלמשל:\nגרגר מלח – במיליגרמים\nתפוח – בגרמים\nכלב – בקילוגרמים\nקטר – בטונות.'
    },
    wrong1: { title: 'התשובה אינה נכונה.', body: 'לא נורא, גם מטעויות לומדים. ננסה שוב?' },
    wrongPending: { title: 'התשובה אינה נכונה.', body: 'רוצים לראות את הפתרון הנכון?' },
    wrong2: {
      title: 'התשובה אינה נכונה.',
      body: 'אפשר למדוד כל גוף בכל יחידת מסה, אך בוחרים את היחידה שנותנת מספר נוח לקריאה ולהשוואה.\nלמשל:\nגרגר מלח – במיליגרמים\nתפוח – בגרמים\nכלב – בקילוגרמים\nקטר – בטונות.'
    }
  }
};

let sq5Selected = { r1: null, r2: null, r3: null, r4: null };
let sq5Attempts = 0;
let sq5Done = false;
let sq5Phase = 'before';
let sq5LastAnswer = null;
let sq5ShowingCorrect = false;

function sq5AllSelected() {
  return sq5Selected.r1 !== null && sq5Selected.r2 !== null &&
         sq5Selected.r3 !== null && sq5Selected.r4 !== null;
}

function sq5Select(rowNum, val) {
  if (sq5Done) return;
  if (sq5Phase === 'wrong1') {
    [1, 2, 3, 4].forEach(function (n) {
      const row = document.getElementById('sq5-row-' + n);
      if (row) row.classList.remove('row-wrong');
      ['true', 'false'].forEach(function (v) {
        const btn = document.getElementById('sq5-r' + n + '-' + v);
        if (btn) btn.classList.remove('btn-correct', 'btn-wrong');
      });
    });
    document.getElementById('sq5-feedbox').classList.remove('visible');
    sq5Phase = 'before';
  }
  const rowKey = 'r' + rowNum;
  sq5Selected[rowKey] = val;
  const trueBtn = document.getElementById('sq5-r' + rowNum + '-true');
  const falseBtn = document.getElementById('sq5-r' + rowNum + '-false');
  if (trueBtn) trueBtn.classList.remove('selected');
  if (falseBtn) falseBtn.classList.remove('selected');
  const activeBtn = document.getElementById('sq5-r' + rowNum + '-' + val);
  if (activeBtn) activeBtn.classList.add('selected');
  const checkBtn = document.getElementById('sq5-check');
  checkBtn.disabled = !sq5AllSelected();
}

function sq5ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('sq5-feedbox');
  const data = TF_SQ5.feedback[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition(box.id);
  box.classList.add('visible');
}

function sq5LockRows(revealCorrect) {
  ['r1', 'r2', 'r3', 'r4'].forEach(function (r, idx) {
    const rowNum = idx + 1;
    const row = document.getElementById('sq5-row-' + rowNum);
    const trueBtn = document.getElementById('sq5-r' + rowNum + '-true');
    const falseBtn = document.getElementById('sq5-r' + rowNum + '-false');
    if (row) row.classList.add('row-locked');
    if (trueBtn) trueBtn.disabled = true;
    if (falseBtn) falseBtn.disabled = true;
    if (revealCorrect) {
      const correctVal = TF_SQ5_CORRECT[r];
      const selectedVal = sq5Selected[r];
      const correctBtn = document.getElementById('sq5-r' + rowNum + '-' + correctVal);
      const wrongBtn = (selectedVal && selectedVal !== correctVal)
        ? document.getElementById('sq5-r' + rowNum + '-' + selectedVal)
        : null;
      if (correctBtn) correctBtn.classList.add('btn-correct');
      if (wrongBtn) wrongBtn.classList.add('btn-wrong');
    }
  });
}

function sq5MarkOwnAnswer() {
  ['r1', 'r2', 'r3', 'r4'].forEach(function (r, idx) {
    const rowNum = idx + 1;
    const row = document.getElementById('sq5-row-' + rowNum);
    ['true', 'false'].forEach(function (v) {
      const btn = document.getElementById('sq5-r' + rowNum + '-' + v);
      if (btn) btn.classList.remove('btn-correct', 'btn-wrong');
    });
    if (row) row.classList.remove('row-wrong');
    const selectedVal = sq5LastAnswer[r];
    const selectedBtn = document.getElementById('sq5-r' + rowNum + '-' + selectedVal);
    if (selectedVal === TF_SQ5_CORRECT[r]) {
      if (selectedBtn) selectedBtn.classList.add('btn-correct');
    } else {
      if (row) row.classList.add('row-wrong');
      if (selectedBtn) selectedBtn.classList.add('btn-wrong');
    }
  });
}

function sq5MarkRevealed() {
  ['r1', 'r2', 'r3', 'r4'].forEach(function (r, idx) {
    const rowNum = idx + 1;
    const row = document.getElementById('sq5-row-' + rowNum);
    ['true', 'false'].forEach(function (v) {
      const btn = document.getElementById('sq5-r' + rowNum + '-' + v);
      if (btn) btn.classList.remove('btn-correct', 'btn-wrong');
    });
    if (row) row.classList.remove('row-wrong');
    const correctVal = TF_SQ5_CORRECT[r];
    const selectedVal = sq5LastAnswer[r];
    const correctBtn = document.getElementById('sq5-r' + rowNum + '-' + correctVal);
    const wrongBtn = (selectedVal !== correctVal)
      ? document.getElementById('sq5-r' + rowNum + '-' + selectedVal)
      : null;
    if (correctBtn) correctBtn.classList.add('btn-correct');
    if (wrongBtn) wrongBtn.classList.add('btn-wrong');
  });
}

function sq5ShowMyAnswer() {
  sq5MarkOwnAnswer();
  sq5ShowFeedback('wrongPending', false);
}

function sq5Reveal() {
  const revealBtn = document.getElementById('sq5-reveal-btn');
  if (sq5ShowingCorrect) {
    sq5ShowMyAnswer();
    sq5ShowingCorrect = false;
    if (revealBtn) revealBtn.textContent = 'התשובה הנכונה';
  } else {
    sq5MarkRevealed();
    sq5ShowFeedback('wrong2', false);
    sq5ShowingCorrect = true;
    if (revealBtn) revealBtn.textContent = 'התשובה שלי';
  }
}

function sq5Check() {
  if (sq5Done || !sq5AllSelected()) return;
  sq5Attempts++;
  const allCorrect = ['r1', 'r2', 'r3', 'r4'].every(function (r) {
    return sq5Selected[r] === TF_SQ5_CORRECT[r];
  });

  if (allCorrect) {
    sq5Phase = 'correct';
    sq5Done = true;
    sq5LockRows(false);
    sq5ShowFeedback('correct', true);
    stationProgress2.q5 = 'success';
    updateQuestionNav2('sq5');
    const checkBtn = document.getElementById('sq5-check');
    checkBtn.textContent = 'המשך';
    checkBtn.disabled = false;
    checkBtn.onclick = sq5Continue;
    return;
  }

  if (sq5Attempts < TF_SQ5.maxAttempts) {
    sq5Phase = 'wrong1';
    ['r1', 'r2', 'r3', 'r4'].forEach(function (r, idx) {
      const rowNum = idx + 1;
      const selectedVal = sq5Selected[r];
      const selectedBtn = document.getElementById('sq5-r' + rowNum + '-' + selectedVal);
      if (selectedVal === TF_SQ5_CORRECT[r]) {
        if (selectedBtn) selectedBtn.classList.add('btn-correct');
      } else {
        const row = document.getElementById('sq5-row-' + rowNum);
        if (row) row.classList.add('row-wrong');
        if (selectedBtn) selectedBtn.classList.add('btn-wrong');
      }
    });
    sq5ShowFeedback('wrong1', false);
    const checkBtn = document.getElementById('sq5-check');
    checkBtn.disabled = true;
  } else {
    sq5Phase = 'wrong-final';
    sq5Done = true;
    /* דריסה: הפתרון לא נחשף אוטומטית — רק בלחיצה על "התשובה הנכונה" */
    sq5LastAnswer = Object.assign({}, sq5Selected);
    sq5LockRows(false);
    sq5MarkOwnAnswer();
    sq5ShowingCorrect = false;
    sq5ShowFeedback('wrongPending', false);
    const revealBtn = document.getElementById('sq5-reveal-btn');
    if (revealBtn) { revealBtn.hidden = false; revealBtn.textContent = 'התשובה הנכונה'; }
    stationProgress2.q5 = 'fail';
    updateQuestionNav2('sq5');
    const checkBtn = document.getElementById('sq5-check');
    checkBtn.textContent = 'המשך';
    checkBtn.disabled = false;
    checkBtn.onclick = sq5Continue;
  }
}

function sq5Continue() { goTo(5); }

function sq5OpenHint() { document.getElementById('sq5-hint-overlay').hidden = false; }
function sq5CloseHint() { document.getElementById('sq5-hint-overlay').hidden = true; }
document.getElementById('sq5-hint-overlay').addEventListener('click', function (e) {
  if (e.target === this) sq5CloseHint();
});


function resetScreenState4() {
  if (sq5Done || sq5Attempts > 0 || Object.values(sq5Selected).some(function (v) { return v != null; })) return;
  sq5Selected = { r1: null, r2: null, r3: null, r4: null };
  sq5Attempts = 0;
  sq5Phase = 'before';
  sq5LastAnswer = null;
  sq5ShowingCorrect = false;
  [1, 2, 3, 4].forEach(function (n) {
    const row = document.getElementById('sq5-row-' + n);
    if (row) row.className = 'tf-row';
    ['true', 'false'].forEach(function (v) {
      const b = document.getElementById('sq5-r' + n + '-' + v);
      if (b) { b.className = 'tf-btn'; b.disabled = false; }
    });
  });
  document.getElementById('sq5-feedbox').classList.remove('visible');
  const checkBtn = document.getElementById('sq5-check');
  checkBtn.textContent = 'צדקתי?';
  checkBtn.disabled = true;
  checkBtn.onclick = sq5Check;
  document.getElementById('sq5-hint-overlay').hidden = true;
  const revealBtn = document.getElementById('sq5-reveal-btn');
  if (revealBtn) { revealBtn.hidden = true; revealBtn.textContent = 'התשובה הנכונה'; }
  updateQuestionNav2('sq5');
}

/* =========================================================
   מסך 6 — שאלה 5/5: יחידות מסה (קילוגרם) (MultipleChoiceQuestion)
   ========================================================= */

const MCQ_SQ6 = {
  correctIds: ['b', 'd'],
  maxAttempts: 2,
  feedback: {
    correct: { title: 'מצוין!', body: 'קילוגרמים מתאימים בדרך כלל לבעלי חיים, אנשים וחפצים גדולים ומסיביים יחסית.' },
    wrong1: { title: 'התשובה אינה נכונה.', body: 'לא נורא, גם מטעויות לומדים. ננסה שוב?' },
    wrong2: { title: 'התשובה אינה נכונה.', body: 'קילוגרמים מתאימים בדרך כלל לבעלי חיים, אנשים וחפצים גדולים וכבדים יחסית.' }
  }
};

let sq6Selected = [];
let sq6Attempts = 0;
let sq6Done = false;
let sq6Phase = 'before';

function sq6OptEl(id) { return document.querySelector('#s5 .scq-opt[data-id="' + id + '"]'); }

function sq6Toggle(id) {
  if (sq6Done) return;
  if (sq6Phase === 'wrong1') {
    document.querySelectorAll('#s5 .scq-opt').forEach(function (el) { el.classList.remove('wrong'); });
    document.getElementById('sq6-feedbox').classList.remove('visible');
    sq6Phase = 'before';
  }
  const el = sq6OptEl(id);
  const idx = sq6Selected.indexOf(id);
  if (idx >= 0) {
    sq6Selected.splice(idx, 1);
    el.classList.remove('selected');
    el.setAttribute('aria-checked', 'false');
  } else {
    sq6Selected.push(id);
    el.classList.add('selected');
    el.setAttribute('aria-checked', 'true');
  }
  if (sq6Selected.length > 0) sq6Phase = 'selected';
  const checkBtn = document.getElementById('sq6-check');
  checkBtn.textContent = 'צדקתי?';
  checkBtn.disabled = sq6Selected.length === 0;
  checkBtn.onclick = sq6Check;
}

function sq6ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('sq6-feedbox');
  const data = MCQ_SQ6.feedback[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition(box.id);
  box.classList.add('visible');
}

function sq6SetBarDone(label, handler) {
  const checkBtn = document.getElementById('sq6-check');
  checkBtn.textContent = label;
  checkBtn.disabled = false;
  checkBtn.onclick = handler;
}

function sq6Check() {
  if (sq6Selected.length === 0 || sq6Done) return;
  sq6Attempts++;
  const correct = MCQ_SQ6.correctIds;
  const isCorrect = correct.length === sq6Selected.length &&
    correct.every(function (cid) { return sq6Selected.indexOf(cid) >= 0; });

  if (isCorrect) {
    sq6Phase = 'correct';
    sq6Done = true;
    correct.forEach(function (cid) {
      const el = sq6OptEl(cid);
      el.classList.remove('selected');
      el.classList.add('correct');
    });
    sq6LockOptions();
    sq6ShowFeedback('correct', true);
    stationProgress2.q6 = 'success';
    updateQuestionNav2('sq6');
    sq6SetBarDone('סיום', function () { sq6Continue(); });
    return;
  }

  document.querySelectorAll('#s5 .scq-opt').forEach(function (el) {
    if (sq6Selected.indexOf(el.dataset.id) >= 0) {
      el.classList.remove('selected');
      el.classList.add('wrong');
    }
  });
  sq6Selected = [];

  if (sq6Attempts < MCQ_SQ6.maxAttempts) {
    sq6Phase = 'wrong1';
    sq6ShowFeedback('wrong1', false);
    const checkBtn = document.getElementById('sq6-check');
    checkBtn.textContent = 'צדקתי?';
    checkBtn.disabled = true;
    checkBtn.onclick = sq6Check;
  } else {
    correct.forEach(function (cid) {
      const el = sq6OptEl(cid);
      el.classList.remove('wrong');
      el.classList.add('correct');
    });
    sq6Phase = 'wrong-final';
    sq6Done = true;
    sq6LockOptions();
    sq6ShowFeedback('wrong2', false);
    stationProgress2.q6 = 'fail';
    updateQuestionNav2('sq6');
    sq6SetBarDone('סיום', function () { sq6Continue(); });
  }
}

function sq6LockOptions() {
  document.querySelectorAll('#s5 .scq-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.onclick = null;
  });
}
function sq6UnlockOptions() {
  document.querySelectorAll('#s5 .scq-opt').forEach(function (el) {
    el.classList.remove('disabled');
    el.onclick = function () { sq6Toggle(el.dataset.id); };
  });
}

function sq6Continue() { goTo(6); }

function sq6OpenHint() { document.getElementById('sq6-hint-overlay').hidden = false; }
function sq6CloseHint() { document.getElementById('sq6-hint-overlay').hidden = true; }
document.getElementById('sq6-hint-overlay').addEventListener('click', function (e) {
  if (e.target === this) sq6CloseHint();
});


function resetScreenState5() {
  if (sq6Done || sq6Attempts > 0 || sq6Selected.length > 0) return;
  sq6Selected = [];
  sq6Attempts = 0;
  sq6Phase = 'before';
  sq6UnlockOptions();
  document.querySelectorAll('#s5 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong', 'correct');
    el.setAttribute('aria-checked', 'false');
  });
  document.getElementById('sq6-feedbox').classList.remove('visible');
  const checkBtn = document.getElementById('sq6-check');
  checkBtn.textContent = 'צדקתי?';
  checkBtn.disabled = true;
  checkBtn.onclick = sq6Check;
  document.getElementById('sq6-hint-overlay').hidden = true;
  updateQuestionNav2('sq6');
}

/* =========================================================
   מסך 7 — מסך מעבר: יופי של עבודה! נחזור ל-2 תרגילים
   ========================================================= */

function resetScreenState6() {
  const img = document.getElementById('s6-avatar-img');
  if (img) {
    img.src = (window.lomdaState.selectedCharacter === 'green')
      ? 'assets/images/avatar-green-clapping-hands.png'
      : 'assets/images/avatar-orange-clapping-hands.png';
  }
}

function s6Continue() { goTo(7); }

/* =========================================================
   stationProgress3 — מעקב שאלות תחנה (מסכים 8-9, שתי שאלות בלבד)
   ========================================================= */

let stationProgress3 = { q8: null, q9: null };

function updateQuestionNav3(prefix) {
  const qs = [stationProgress3.q8, stationProgress3.q9];
  const currentIdx = qs.indexOf(null);
  for (let i = 0; i < 2; i++) {
    const icon = document.getElementById(prefix + '-qnav-icon-' + (i + 1));
    const label = document.getElementById(prefix + '-qnav-label-' + (i + 1));
    if (!icon) continue;
    icon.className = 'qnav-icon';
    if (label) label.className = 'qnav-label';
    if (qs[i] === 'success') {
      icon.classList.add('qnav-success');
      if (label) label.classList.add('qnav-label-active');
    } else if (qs[i] === 'fail') {
      icon.classList.add('qnav-fail');
      if (label) label.classList.add('qnav-label-active');
    } else if (i === currentIdx) {
      icon.classList.add('qnav-current');
      if (label) label.classList.add('qnav-label-active');
    } else {
      icon.classList.add('qnav-future');
    }
  }
  const line = document.getElementById(prefix + '-qnav-line-1');
  if (line) {
    line.className = 'qnav-line';
    if (qs[0] !== null) line.classList.add('line-done');
  }
}

/* =========================================================
   מסך 8 — שאלה 1/2: השלמת מושגים (Dropdown per row)
   רמז: כפתור גלוי אך disabled מההתחלה, מופעל רק אחרי ניסיון שגוי ראשון
   (בניגוד למסכים 2-6 — לפי בקשה מפורשת למסכים 8-9)
   ========================================================= */

const DD8_IDS = ['dd8-1', 'dd8-2', 'dd8-3', 'dd8-4', 'dd8-5', 'dd8-6'];
const DD8_CORRECT = {
  'dd8-1': 'ברוטו', 'dd8-2': 'נטו', 'dd8-3': 'טרה',
  'dd8-4': 'ברוטו', 'dd8-5': 'נטו', 'dd8-6': 'טרה'
};
let dd8Values = { 'dd8-1': '', 'dd8-2': '', 'dd8-3': '', 'dd8-4': '', 'dd8-5': '', 'dd8-6': '' };
const TEXTS_DD8 = {
  correct: { title: 'מצוין!', body: 'ברוטו = התוכן והאריזה יחד.\nנטו = התוכן בלבד.\nטרה = האריזה או המיכל בלבד.' },
  wrong1: { title: 'התשובה אינה נכונה.', body: 'לא נורא, גם מטעויות לומדים. ננסה שוב?' },
  wrongPending: { title: 'התשובה אינה נכונה.', body: 'רוצים לראות את הפתרון הנכון?' },
  wrong2: { title: 'התשובה לא נכונה.', body: 'ברוטו = התוכן והאריזה יחד.\nנטו = התוכן בלבד.\nטרה = האריזה או המיכל בלבד.' }
};

let dd8Done = false;
let dd8Attempts = 0;
let dd8LastAnswer = null;
let dd8ShowingCorrect = false;

function dd8Toggle(ddId) {
  const opts = document.getElementById(ddId + '-opts');
  const btn = document.getElementById(ddId + '-btn');
  if (!opts || !btn) return;
  const isOpen = !opts.hidden;
  DD8_IDS.forEach(function (id) {
    const o = document.getElementById(id + '-opts');
    const b = document.getElementById(id + '-btn');
    if (o && o !== opts) { o.hidden = true; if (b) b.setAttribute('aria-expanded', 'false'); }
  });
  opts.hidden = isOpen;
  btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
}

function dd8Select(ddId, val) {
  dd8Values[ddId] = val;
  const valEl = document.getElementById(ddId + '-val');
  if (valEl) valEl.textContent = val;
  const opts = document.getElementById(ddId + '-opts');
  const btn = document.getElementById(ddId + '-btn');
  if (opts) opts.hidden = true;
  if (btn) { btn.setAttribute('aria-expanded', 'false'); btn.classList.remove('wrong', 'correct'); }
  const allSelected = DD8_IDS.every(function (id) { return dd8Values[id] !== ''; });
  document.getElementById('dd8-check').disabled = !allSelected;
}

function dd8CloseAllDropdowns() {
  DD8_IDS.forEach(function (id) {
    const opts = document.getElementById(id + '-opts');
    const btn = document.getElementById(id + '-btn');
    if (opts) opts.hidden = true;
    if (btn) btn.setAttribute('aria-expanded', 'false');
  });
}

function dd8LockDropdowns(revealCorrect) {
  DD8_IDS.forEach(function (id) {
    const btn = document.getElementById(id + '-btn');
    const opts = document.getElementById(id + '-opts');
    const valEl = document.getElementById(id + '-val');
    if (opts) opts.hidden = true;
    if (btn) { btn.disabled = true; btn.setAttribute('aria-expanded', 'false'); }
    if (revealCorrect) {
      dd8Values[id] = DD8_CORRECT[id];
      if (valEl) valEl.textContent = DD8_CORRECT[id];
    }
  });
}

function dd8MarkDropdowns() {
  DD8_IDS.forEach(function (id) {
    const btn = document.getElementById(id + '-btn');
    if (!btn) return;
    btn.classList.remove('wrong', 'correct');
    btn.classList.add(dd8Values[id] === DD8_CORRECT[id] ? 'correct' : 'wrong');
  });
}

function dd8ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('dd8-feedbox');
  const data = TEXTS_DD8[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition(box.id);
  box.classList.add('visible');
}


function dd8EnableHint() {
  document.getElementById('dd8-hint').hidden = false;
}

function dd8SetBarDone(handler) {
  const checkBtn = document.getElementById('dd8-check');
  checkBtn.textContent = 'המשך';
  checkBtn.disabled = false;
  checkBtn.onclick = handler;
}

function dd8ShowMyAnswer() {
  DD8_IDS.forEach(function (id) {
    dd8Values[id] = dd8LastAnswer[id];
    const valEl = document.getElementById(id + '-val');
    if (valEl) valEl.textContent = dd8LastAnswer[id];
  });
  dd8MarkDropdowns();
  dd8ShowFeedback('wrongPending', false);
}

function dd8Reveal() {
  const revealBtn = document.getElementById('dd8-reveal-btn');
  if (dd8ShowingCorrect) {
    dd8ShowMyAnswer();
    dd8ShowingCorrect = false;
    if (revealBtn) revealBtn.textContent = 'התשובה הנכונה';
  } else {
    dd8LockDropdowns(true);
    dd8MarkDropdowns();
    dd8ShowFeedback('wrong2', false);
    dd8ShowingCorrect = true;
    if (revealBtn) revealBtn.textContent = 'התשובה שלי';
  }
}

function dd8Check() {
  if (dd8Done) return;
  dd8CloseAllDropdowns();
  dd8Attempts++;
  const allCorrect = DD8_IDS.every(function (id) { return dd8Values[id] === DD8_CORRECT[id]; });

  if (allCorrect) {
    dd8Done = true;
    dd8LockDropdowns(false);
    dd8MarkDropdowns();
    dd8ShowFeedback('correct', true);
    stationProgress3.q8 = 'success';
    updateQuestionNav3('dd8');
    dd8SetBarDone(dd8Continue);
  } else if (dd8Attempts < 2) {
    dd8MarkDropdowns();
    dd8ShowFeedback('wrong1', false);
    document.getElementById('dd8-check').disabled = true;
    dd8EnableHint();
  } else {
    dd8Done = true;
    /* דריסה: הפתרון לא נחשף אוטומטית — רק בלחיצה על "התשובה הנכונה" */
    dd8LastAnswer = Object.assign({}, dd8Values);
    dd8LockDropdowns(false);
    dd8MarkDropdowns();
    dd8ShowingCorrect = false;
    dd8ShowFeedback('wrongPending', false);
    const revealBtn = document.getElementById('dd8-reveal-btn');
    if (revealBtn) { revealBtn.hidden = false; revealBtn.textContent = 'התשובה הנכונה'; }
    stationProgress3.q8 = 'fail';
    updateQuestionNav3('dd8');
    dd8SetBarDone(dd8Continue);
  }
}

function dd8Continue() { goTo(8); }

function dd8OpenHint() {
  if (dd8Done) return;
  document.getElementById('dd8-hint-overlay').hidden = false;
}
function dd8CloseHint() { document.getElementById('dd8-hint-overlay').hidden = true; }
document.getElementById('dd8-hint-overlay').addEventListener('click', function (e) {
  if (e.target === this) dd8CloseHint();
});

function resetScreenState7() {
  updateQuestionNav3('dd8');
  if (dd8Done || dd8Attempts > 0 || Object.values(dd8Values).some(function (v) { return v !== ''; })) return;
  dd8Attempts = 0;
  dd8LastAnswer = null;
  dd8ShowingCorrect = false;
  DD8_IDS.forEach(function (id) {
    dd8Values[id] = '';
    const btn = document.getElementById(id + '-btn');
    const valEl = document.getElementById(id + '-val');
    const opts = document.getElementById(id + '-opts');
    if (btn) { btn.disabled = false; btn.className = 'dd-btn'; btn.setAttribute('aria-expanded', 'false'); }
    if (valEl) valEl.textContent = '';
    if (opts) opts.hidden = true;
  });
  document.getElementById('dd8-feedbox').classList.remove('visible');
  const checkBtn = document.getElementById('dd8-check');
  checkBtn.textContent = 'צדקתי?';
  checkBtn.disabled = true;
  checkBtn.onclick = dd8Check;
  document.getElementById('dd8-hint').hidden = true;
  document.getElementById('dd8-hint-overlay').hidden = true;
  const revealBtn = document.getElementById('dd8-reveal-btn');
  if (revealBtn) { revealBtn.hidden = true; revealBtn.textContent = 'התשובה הנכונה'; }
}

/* =========================================================
   מסך 9 — שאלה 2/2: השלמת יחידות מסה (Drag & Drop)
   רמז: מוסתר (hidden) עד ניסיון שגוי ראשון, ואז גלוי ופעיל לתמיד
   ========================================================= */

const DRAG9_ITEM_IDS = ['drag9i2', 'drag9i1', 'drag9i4', 'drag9i3'];
const DRAG9_ZONES = ['milligram', 'gram', 'kilogram', 'ton'];
let drag9Done = false;
let drag9Attempts = 0;
let drag9DragId = null;
let drag9LastAnswer = null;
let drag9ShowingCorrect = false;
const TEXTS_DRAG9 = {
  correct: { title: 'מצוין!', body: 'ככל שהגוף גדול ומסיבי יותר, כך משתמשים בדרך כלל ביחידת מסה גדולה יותר.' },
  wrong1: { title: 'התשובה אינה נכונה.', body: 'לא נורא, גם מטעויות לומדים. ננסה שוב?' },
  wrong2Pending: { title: 'התשובה אינה נכונה.', body: 'רוצים לראות את הפתרון הנכון?' },
  wrong2: { title: 'התשובה אינה נכונה.', body: 'ככל שהגוף גדול ומסיבי יותר, כך משתמשים בדרך כלל ביחידת מסה גדולה יותר.' }
};

function drag9AllPlaced() {
  const sb = document.getElementById('drag9-source-bank');
  if (!sb) return false;
  return DRAG9_ITEM_IDS.every(function (id) {
    const el = document.getElementById(id);
    return el && el.parentElement && el.parentElement.id !== 'drag9-source-bank';
  });
}

function drag9UpdateCheckBtn() {
  document.getElementById('drag9-check').disabled = !drag9AllPlaced();
}

function drag9ClearZoneStates() {
  DRAG9_ZONES.forEach(function (z) {
    document.getElementById('drag9-zone-' + z).classList.remove('correct', 'wrong', 'drag-over');
  });
  DRAG9_ITEM_IDS.forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('drag-item-correct', 'drag-item-wrong');
  });
}

function drag9DragStart(event, itemId) {
  drag9DragId = itemId;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', itemId);
  setTimeout(function () {
    const el = document.getElementById(itemId);
    if (el) el.classList.add('drag-dragging');
  }, 0);
}

function drag9DragEnd(itemId) {
  const el = document.getElementById(itemId);
  if (el) el.classList.remove('drag-dragging');
  drag9DragId = null;
}

function drag9DragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
}

function drag9DragEnter(event, zoneId) {
  event.preventDefault();
  document.getElementById(zoneId).classList.add('drag-over');
}

function drag9DragLeave(event, zoneId) {
  const zone = document.getElementById(zoneId);
  if (zone && !zone.contains(event.relatedTarget)) {
    zone.classList.remove('drag-over');
  }
}

function drag9Drop(event, targetZone) {
  event.preventDefault();
  if (drag9Done) return;
  const itemId = event.dataTransfer.getData('text/plain') || drag9DragId;
  if (!itemId) return;
  const zoneEl = document.getElementById('drag9-zone-' + targetZone);
  const itemEl = document.getElementById(itemId);
  if (zoneEl && itemEl) {
    zoneEl.classList.remove('drag-over');
    if (itemEl.parentElement) itemEl.parentElement.removeChild(itemEl);
    zoneEl.appendChild(itemEl);
  }
  drag9UpdateCheckBtn();
  drag9ClearZoneStates();
}

function drag9DropToSource(event) {
  event.preventDefault();
  if (drag9Done) return;
  const itemId = event.dataTransfer.getData('text/plain') || drag9DragId;
  if (!itemId) return;
  const sourceBank = document.getElementById('drag9-source-bank');
  const itemEl = document.getElementById(itemId);
  if (itemEl && sourceBank && itemEl.parentElement !== sourceBank) {
    if (itemEl.parentElement) itemEl.parentElement.removeChild(itemEl);
    sourceBank.appendChild(itemEl);
  }
  drag9UpdateCheckBtn();
  drag9ClearZoneStates();
}

function drag9ItemClick(itemId) {
  if (drag9Done) return;
  const el = document.getElementById(itemId);
  const sourceBank = document.getElementById('drag9-source-bank');
  if (!el || !sourceBank || el.parentElement === sourceBank) return;
  el.parentElement.removeChild(el);
  sourceBank.appendChild(el);
  drag9ClearZoneStates();
  drag9UpdateCheckBtn();
}

function drag9ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('drag9-feedbox');
  const data = TEXTS_DRAG9[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition(box.id);
  box.classList.add('visible');
}


function drag9ShowMyAnswer() {
  DRAG9_ITEM_IDS.forEach(function (id) {
    const item = document.getElementById(id);
    const dest = drag9LastAnswer[id];
    const destEl = (dest === 'source')
      ? document.getElementById('drag9-source-bank')
      : document.getElementById('drag9-zone-' + dest);
    if (item.parentElement) item.parentElement.removeChild(item);
    destEl.appendChild(item);
  });
  DRAG9_ZONES.forEach(function (zoneId) {
    const zoneEl = document.getElementById('drag9-zone-' + zoneId);
    const items = zoneEl.querySelectorAll('.drag-item');
    let zoneOk = items.length > 0;
    items.forEach(function (item) {
      const itemOk = item.dataset.correct === zoneId;
      if (!itemOk) zoneOk = false;
      item.classList.remove('drag-item-correct', 'drag-item-wrong');
      item.classList.add(itemOk ? 'drag-item-correct' : 'drag-item-wrong');
    });
    zoneEl.classList.remove('wrong', 'correct', 'drag-over');
    zoneEl.classList.add(zoneOk ? 'correct' : 'wrong');
  });
  drag9ShowFeedback('wrong2Pending', false);
}

function drag9Reveal() {
  const revealBtn = document.getElementById('drag9-reveal-btn');
  if (drag9ShowingCorrect) {
    drag9ShowMyAnswer();
    drag9ShowingCorrect = false;
    if (revealBtn) revealBtn.textContent = 'התשובה הנכונה';
  } else {
    drag9RevealCorrect();
    drag9ShowFeedback('wrong2', false);
    drag9ShowingCorrect = true;
    if (revealBtn) revealBtn.textContent = 'התשובה שלי';
  }
}

function drag9EnableHint() {
  document.getElementById('drag9-hint').hidden = false;
}

function drag9RevealCorrect() {
  DRAG9_ITEM_IDS.forEach(function (id) {
    const item = document.getElementById(id);
    const zoneEl = document.getElementById('drag9-zone-' + item.dataset.correct);
    if (item.parentElement) item.parentElement.removeChild(item);
    zoneEl.appendChild(item);
    item.classList.remove('drag-item-wrong');
    item.classList.add('drag-item-correct');
  });
  DRAG9_ZONES.forEach(function (zoneId) {
    const zoneEl = document.getElementById('drag9-zone-' + zoneId);
    zoneEl.classList.remove('wrong', 'drag-over');
    zoneEl.classList.add('correct');
  });
}

function drag9Check() {
  if (drag9Done) return;
  drag9Attempts++;

  let allCorrect = true;
  DRAG9_ZONES.forEach(function (zoneId) {
    const zoneEl = document.getElementById('drag9-zone-' + zoneId);
    const items = zoneEl.querySelectorAll('.drag-item');
    let zoneOk = items.length > 0;
    items.forEach(function (item) {
      const itemOk = item.dataset.correct === zoneId;
      if (!itemOk) zoneOk = false;
      item.classList.remove('drag-item-correct', 'drag-item-wrong');
      item.classList.add(itemOk ? 'drag-item-correct' : 'drag-item-wrong');
    });
    zoneEl.classList.toggle('correct', zoneOk);
    zoneEl.classList.toggle('wrong', !zoneOk);
    if (!zoneOk) allCorrect = false;
  });

  const checkBtn = document.getElementById('drag9-check');
  if (allCorrect) {
    drag9Done = true;
    drag9ShowFeedback('correct', true);
    checkBtn.textContent = 'סיום';
    checkBtn.disabled = false;
    checkBtn.onclick = drag9Continue;
    stationProgress3.q9 = 'success';
    updateQuestionNav3('drag9');
  } else if (drag9Attempts >= 2) {
    drag9Done = true;
    /* דריסה: הפתרון לא נחשף אוטומטית — רק בלחיצה על "התשובה הנכונה" */
    drag9LastAnswer = {};
    DRAG9_ITEM_IDS.forEach(function (id) {
      const el = document.getElementById(id);
      const parentId = el && el.parentElement ? el.parentElement.id : '';
      drag9LastAnswer[id] = parentId.indexOf('drag9-zone-') === 0 ? parentId.replace('drag9-zone-', '') : 'source';
    });
    drag9ShowingCorrect = false;
    drag9ShowFeedback('wrong2Pending', false);
    const revealBtn = document.getElementById('drag9-reveal-btn');
    if (revealBtn) { revealBtn.hidden = false; revealBtn.textContent = 'התשובה הנכונה'; }
    checkBtn.textContent = 'סיום';
    checkBtn.disabled = false;
    checkBtn.onclick = drag9Continue;
    stationProgress3.q9 = 'fail';
    updateQuestionNav3('drag9');
  } else {
    drag9ShowFeedback('wrong1', false);
    checkBtn.disabled = true;
    drag9EnableHint();
  }
}

function drag9Continue() {
  /* קישור בין סינים: מסך אחרון בסיין 2 -> מסך ראשון בסיין 3 */
  window.location.href = '../Methodica-science-mass-measure-02-03/index.html';
}

function drag9OpenHint() {
  if (drag9Done) return;
  document.getElementById('drag9-hint-overlay').hidden = false;
}
function drag9CloseHint() { document.getElementById('drag9-hint-overlay').hidden = true; }
document.getElementById('drag9-hint-overlay').addEventListener('click', function (e) {
  if (e.target === this) drag9CloseHint();
});

function resetScreenState8() {
  updateQuestionNav3('drag9');
  if (drag9Done || drag9Attempts > 0 || DRAG9_ITEM_IDS.some(function (id) {
    const el = document.getElementById(id);
    return el && el.parentElement && el.parentElement.id !== 'drag9-source-bank';
  })) return;
  drag9Attempts = 0;
  drag9DragId = null;
  drag9LastAnswer = null;
  drag9ShowingCorrect = false;

  const sourceBank = document.getElementById('drag9-source-bank');
  DRAG9_ITEM_IDS.forEach(function (id) {
    const el = document.getElementById(id);
    if (el && el.parentElement !== sourceBank) {
      el.parentElement.removeChild(el);
      sourceBank.appendChild(el);
    }
  });

  drag9ClearZoneStates();
  document.getElementById('drag9-feedbox').classList.remove('visible');
  document.getElementById('drag9-hint-overlay').hidden = true;

  const checkBtn = document.getElementById('drag9-check');
  checkBtn.textContent = 'צדקתי?';
  checkBtn.disabled = true;
  checkBtn.onclick = drag9Check;
  document.getElementById('drag9-hint').hidden = true;
  const revealBtn = document.getElementById('drag9-reveal-btn');
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
   בכל פתיחה. אין כפתור סגירה/X — הפופ-אפ נעלם רק בניווט למסך אחר,
   בניסיון חדש, או (בסיין עם כפתור חשיפה) בלחיצה על .scq-fb-reveal-btn.
   מיושם על כל 7 תיבות המשוב בסיין 2.
   ========================================================= */

function scqFbResetPosition(boxId) {
  const box = document.getElementById(boxId);
  if (!box) return;
  box.style.left = '';
  box.style.top = '';
  box.style.bottom = '';
}

function scqFbMakeDraggable(boxId) {
  const box = document.getElementById(boxId);
  if (!box) return;

  let dragging = false;
  let startX = 0, startY = 0, startLeft = 0, startTop = 0;

  box.addEventListener('mousedown', function (e) {
    if (e.target.closest('.scq-fb-reveal-btn')) return;
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

/* =========================================================
   הגדלת תמונה v2 (img-zoom) — לפי מפרט 720-templates
   _global-components.md.
   ========================================================= */

function imgZoomOpen(trigger) {
  const modal = document.getElementById('img-zoom-modal');
  const stage = modal && modal.querySelector('.img-zoom-modal__stage');
  const frame = trigger.closest('.scq-img-inner');
  if (!modal || !stage || !frame) return;
  const clone = frame.cloneNode(true);
  const btnInClone = clone.querySelector('.img-zoom-btn');
  if (btnInClone) btnInClone.remove();
  stage.innerHTML = '';
  stage.appendChild(clone);
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function imgZoomClose() {
  const modal = document.getElementById('img-zoom-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  const stage = modal.querySelector('.img-zoom-modal__stage');
  if (stage) stage.innerHTML = '';
}

document.addEventListener('click', function (e) {
  const trigger = e.target.closest('[data-zoom-src]');
  if (trigger) { imgZoomOpen(trigger); return; }
  const closeTarget = e.target.closest('[data-zoom-close="true"]');
  if (!closeTarget) return;
  if (closeTarget.id === 'img-zoom-modal' && e.target.closest('.img-zoom-modal__panel')) return;
  imgZoomClose();
});

document.addEventListener('keydown', function (e) {
  const modal = document.getElementById('img-zoom-modal');
  if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) imgZoomClose();
});

const SCQ_FB_BOX_IDS = [
  'sq2-feedbox', 'sq3-feedbox', 'sq4-feedbox', 'sq5-feedbox',
  'sq6-feedbox', 'dd8-feedbox', 'drag9-feedbox'
];

/* אתחול */
scaleApp();
resetScreenState(0);
SCQ_FB_BOX_IDS.forEach(scqFbMakeDraggable);

/* קישור בין סינים: הגעה לכאן דרך "חזרה" מהסיין הבא נכנסת ישירות למסך
   המבוקש לפי #screen=N ב-URL, במקום למסך הראשון כברירת מחדל */
(function jumpToLinkedScreen() {
  const m = /^#screen=(\d+)$/.exec(location.hash);
  if (m) goTo(parseInt(m[1], 10));
})();
