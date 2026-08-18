'use strict';

/* =========================================================
   שתי המדידות נכונותנוע גלובלי — canvas scaling, ניווט מסכים, סטייט גלובלי
   ========================================================= */

const TOTAL_SCREENS = 20;
let currentScreen = 0;

let savedCharacter = null;
try {
  savedCharacter = localStorage.getItem('lomda_selectedCharacter');
} catch (e) {}
window.lomdaState = {
  selectedCharacter: savedCharacter // 'green' | 'orange' — נקבע במסך 1, נצרך בכל מסך שמציג את הדמות הנבחרת
};

/* טוענים מראש (preload) את מדיית הדמות של הצבע הנבחר (אם כבר נשמר
   מביקור קודם), כדי שבכל מסך שמציג את הדמות המדיה כבר תהיה בקאש של
   הדפדפן ותוצג מיידית — בלי רגע ריק/מהבהב. במסך 1 עצמו (שם הבחירה
   נקבעת בפעם הראשונה) אין עדיין ערך שמור, אז זה רלוונטי בעיקר לחזרות. */
(function preloadCharacterAvatars() {
  const color = (window.lomdaState.selectedCharacter === 'green') ? 'green' : 'orange';
  const imageFiles = ['avatar-' + color + '.png', 'avatar-' + color + '-workout.gif'];
  const videoFiles = [
    'avatar-' + color + '-come-in.mp4',
    'avatar-' + color + '-questioning.mp4',
    'avatar-' + color + '-clapping-hands.mp4'
  ];
  imageFiles.forEach(function (name) {
    const img = new Image();
    img.src = 'assets/images/' + name;
  });
  videoFiles.forEach(function (name) {
    const video = document.createElement('video');
    video.muted = true;
    video.preload = 'auto';
    video.src = 'assets/videos/' + name;
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
  /* resume: ציור מצב "נענה" של המסך הזה. חייב לשבת כאן ולא רק
     ב-applyExecutionState, שמצייר את מסך הנחיתה **בלבד** — בלי זה כל מסך אחר
     שנענה נשאר ריק ותקוע (הקליקים נבלעים ב-`if (scqNDone) return;` וכפתור
     הבדיקה נשאר disabled מה-markup). לפני xapiOnScreen ולפני
     scheduleResumeSave במכוון: capturePartPayload קורא סימוני 'wrong' מה-DOM,
     ולכן שמירה שהייתה מקדימה את הציור הייתה מרוקנת אותם.
     בלי catch ריק: repaintScreen יושב ב-40-resume.js, וגרסה מיושנת בקאש
     הייתה זורקת ReferenceError שקט בכל ניווט. */
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
  if (n === 2) resetScreenState2();
  if (n === 3) resetScreenState3();
  if (n === 4) resetScreenState4();
  if (n === 5) resetScreenState5();
  if (n === 6) resetScreenState6();
  if (n === 7) resetScreenState7();
  if (n === 8) resetScreenState8();
  if (n === 9) resetScreenState9();
  if (n === 10) resetScreenState10();
  if (n === 11) resetScreenState11();
  if (n === 12) resetScreenState12();
  if (n === 13) resetScreenState13();
  if (n === 14) resetScreenState14();
  if (n === 15) resetScreenState15();
  if (n === 16) resetScreenState16();
  if (n === 17) resetScreenState17();
  if (n === 18) resetScreenState18();
  if (n === 19) resetScreenState19();
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
   מסך 1 — בחירת דמות (TwoOptionSelection)
   ========================================================= */

function resetScreenState0() {
  // תמיד מסנכרן את ה-UI מ-window.lomdaState.selectedCharacter (לא "פעם אחת בלבד") —
  // כך שינוי בחירה בחזרה למסך זה ישתקף נכון, לפי חוזה ה-Companion character system
  const chosen = window.lomdaState.selectedCharacter;
  document.querySelectorAll('.option-card').forEach(function (c) {
    const isChosen = c.dataset.value === chosen;
    c.classList.toggle('selected', isChosen);
    c.setAttribute('aria-checked', isChosen ? 'true' : 'false');
  });
  const btn = document.getElementById('s0-continue');
  if (btn) btn.disabled = !chosen;
}

function selectOption(cardEl) {
  document.querySelectorAll('.option-card').forEach(function (c) {
    c.classList.remove('selected');
    c.setAttribute('aria-checked', 'false');
  });
  cardEl.classList.add('selected');
  cardEl.setAttribute('aria-checked', 'true');
  window.lomdaState.selectedCharacter = cardEl.dataset.value;
  /* try/catch: localStorage חסום ב-SecurityError בפתיחה מ-file:// בחלק
     מהדפדפנים/opaque origins — שמירת ההעדפה בין הסינים היא nice-to-have,
     אין להפיל את המסך הראשון אם היא נכשלת */
  try { localStorage.setItem('lomda_selectedCharacter', cardEl.dataset.value); } catch (e) {}
  const btn = document.getElementById('s0-continue');
  if (btn) btn.disabled = false;
}

function handleCardKey(event, cardEl) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    selectOption(cardEl);
  }
}

function advanceFromS0() {
  if (!window.lomdaState.selectedCharacter) return;
  goTo(1);
}

/* =========================================================
   מסך 2 — SingleChoiceQuestion (שאלת בחירה יחידה)
   ========================================================= */

const SCQ = {
  correctId: 'a',
  maxAttempts: 2,
  feedback: {
    correct: {
      title: 'מצוין!',
      body: 'כדי לדעת אם בתיבה יש אוצר, לא מספיק לדעת את המסה הכוללת שלה. צריך לדעת גם מה המסה של התיבה עצמה.\nרק כך אפשר להפריד בין מסת התיבה למסת התכולה שבתוכה.\n <strong>על הרעיון הזה בדיוק נלמד ביחידה.</strong>'
    },
    wrong1: {
      title: 'התשובה אינה נכונה.',
      body: 'לא נורא, גם מטעויות לומדים.\nננסה שוב?'
    },
    wrong2: {
      title: 'התשובה לא נכונה.',
      body: 'כדי לדעת אם בתיבה יש אוצר, לא מספיק לדעת את המסה הכוללת שלה. צריך לדעת גם מה המסה של התיבה עצמה.\nרק כך אפשר להפריד בין מסת התיבה למסת התכולה שבתוכה.\n <strong>על הרעיון הזה בדיוק נלמד ביחידה.</strong>'
    }
  }
};

let scqSelected = null;
let scqAttempts = 0;
let scqDone = false;
let scqPhase = 'before'; // 'before' | 'selected' | 'wrong1' | 'correct' | 'wrong-final'

function scqOptEl(id) {
  return document.querySelector('#s1 .scq-opt[data-id="' + id + '"]');
}

function scqSelect(id) {
  if (scqDone) return;
  const wasWrong1 = (scqPhase === 'wrong1');
  document.querySelectorAll('#s1 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong');
    el.setAttribute('aria-checked', 'false');
  });
  const selectedEl = scqOptEl(id);
  selectedEl.classList.add('selected');
  selectedEl.setAttribute('aria-checked', 'true');
  scqSelected = id;
  scqPhase = 'selected';
  // ניסיון 1 שגוי → בוחרים תשובה אחרת ישירות, בלי כפתור-ביניים: מנקה את סימון
  // הטעות ואת המשוב באותה פעולה (בדיוק כמו במסך 2 בלומדה הקודמת)
  if (wasWrong1) {
    document.getElementById('scq-feedbox').classList.remove('visible');
  }
  const checkBtn = document.getElementById('scq-check');
  checkBtn.textContent = 'צדקתי?';
  checkBtn.disabled = false;
  checkBtn.onclick = scqCheck;
}

function scqShowFeedback(kind, isCorrect) {
  const box = document.getElementById('scq-feedbox');
  const data = SCQ.feedback[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition(box.id);
  box.classList.add('visible');
}

function scqSetBarDone(label, handler) {
  const checkBtn = document.getElementById('scq-check');
  checkBtn.textContent = label;
  checkBtn.disabled = false;
  checkBtn.onclick = handler;
  document.getElementById('scq-hint').hidden = true;
}

function scqCheck() {
  if (!scqSelected || scqDone) return;
  scqAttempts++;
  const optEl = scqOptEl(scqSelected);
  xapiAnswered('001', 'q1', scqSelected === SCQ.correctId, scqSelected === SCQ.correctId || scqAttempts >= SCQ.maxAttempts, xapiAnswerText(optEl));

  if (scqSelected === SCQ.correctId) {
    optEl.classList.add('correct');
    optEl.classList.remove('selected');
    scqPhase = 'correct';
    scqDone = true;
    scqLockOptions();
    scqShowFeedback('correct', true);
    scqSetBarDone('המשך', function () { advanceScreen(); });
    return;
  }

  optEl.classList.add('wrong');
  optEl.classList.remove('selected');

  if (scqAttempts < SCQ.maxAttempts) {
    // ניסיון 1 שגוי — מציג משוב ומחזיר מיד ל-"צדקתי?" (disabled) כדי לאפשר
    // בחירה חוזרת ישירה, בדיוק כמו במסך 2 בלומדה הקודמת (אין כפתור-ביניים)
    scqPhase = 'wrong1';
    scqShowFeedback('wrong1', false);
    const checkBtn = document.getElementById('scq-check');
    checkBtn.textContent = 'צדקתי?';
    checkBtn.disabled = true;
    checkBtn.onclick = scqCheck;
    document.getElementById('scq-hint').hidden = false;
  } else {
    scqOptEl(SCQ.correctId).classList.add('correct');
    scqPhase = 'wrong-final';
    scqDone = true;
    scqLockOptions();
    scqShowFeedback('wrong2', false);
    scqSetBarDone('המשך', function () { advanceScreen(); });
  }

  /* resume: שמירה סינכרונית ברגע מחויבות התשובה. השמירה המושהית שבסוף goTo()
     לא מספיקה כאן — תשובה שניתנה ואז הלשונית נהרגה לפני הניווט הבא הייתה
     נאבדת. עטוף: דיווח ושמירה לעולם לא שוברים את זרימת התשובה. */
  try { flushResumeSave(); } catch (e) {}
}

function scqLockOptions() {
  document.querySelectorAll('#s1 .scq-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.onclick = null;
  });
}

function scqUnlockOptions() {
  document.querySelectorAll('#s1 .scq-opt').forEach(function (el) {
    el.classList.remove('disabled');
    el.onclick = function () { scqSelect(el.dataset.id); };
  });
}

function advanceScreen() {
  goTo(2);
}

function scqOpenHint() {
  if (scqDone) return;
  /* xAPI: requested.1 — מוצב אחרי כל הגארדים ומיד לפני שהרמז
     באמת נחשף, כדי לא לדווח בקשה שלא קרתה. הפונקציה פותחת בלבד
     (hidden=false) ולא toggle, ולכן אין סיכון לדיווח כפול. */
  xapiRequestedHint('001', 'q1');
  document.getElementById('scq-hint-overlay').hidden = false;
}

function scqCloseHint() {
  document.getElementById('scq-hint-overlay').hidden = true;
}

document.getElementById('scq-hint-overlay').addEventListener('click', function (e) {
  if (e.target === this) scqCloseHint();
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && !document.getElementById('scq-hint-overlay').hidden) {
    scqCloseHint();
  }
});

function resetScreenState1() {
  if (scqDone || scqAttempts > 0 || scqSelected) return; // resume-state: שאלה שהתחילה (אפילו לא הסתיימה) לא נמחקת בחזרה למסך
  scqSelected = null;
  scqAttempts = 0;
  scqPhase = 'before';
  scqUnlockOptions();
  document.querySelectorAll('#s1 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong', 'correct');
    el.setAttribute('aria-checked', 'false');
  });
  document.getElementById('scq-feedbox').classList.remove('visible');
  const checkBtn = document.getElementById('scq-check');
  checkBtn.textContent = 'צדקתי?';
  checkBtn.disabled = true;
  checkBtn.onclick = scqCheck;
  const hintBtn = document.getElementById('scq-hint');
  hintBtn.hidden = true;
  hintBtn.disabled = false;
  document.getElementById('scq-hint-icon').src = 'assets/images/icon-hint-blue.svg';
  document.getElementById('scq-hint-overlay').hidden = true;
}

document.querySelectorAll('#s1 .scq-opt').forEach(function (opt) {
  opt.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      scqSelect(opt.dataset.id);
    }
  });
});

/* =========================================================
   מסך 3 — כרטיסיות מתהפכות (FlipCardsReveal)
   ========================================================= */

let scr3Card1Flipped = false; // flip-card-right (צנצנת חמוצים)
let scr3Card2Flipped = false; // flip-card-left  (מזוודה)
let scr3Done = false;

function scr3FlipCard(cardId) {
  const card = document.getElementById(cardId);
  if (!card) return;
  card.classList.toggle('flipped');
  if (cardId === 'flip-card-right') scr3Card1Flipped = true;
  if (cardId === 'flip-card-left') scr3Card2Flipped = true;
  if (scr3Card1Flipped && scr3Card2Flipped) {
    document.getElementById('btn-s3-continue').disabled = false;
  }
}

function scr3CardKey(event, cardId) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    scr3FlipCard(cardId);
  }
}

function scr3Continue() {
  scr3Done = true;
  goTo(3);
}

function resetScreenState2() {
  const c1 = document.getElementById('flip-card-right');
  const c2 = document.getElementById('flip-card-left');
  const btn = document.getElementById('btn-s3-continue');
  if (scr3Done) {
    // resume-state: שני הקלפים כבר הופכו — נשארים הפוכים, כפתור פעיל
    scr3Card1Flipped = true;
    scr3Card2Flipped = true;
    c1.classList.add('flipped');
    c2.classList.add('flipped');
    btn.disabled = false;
    return;
  }
  scr3Card1Flipped = false;
  scr3Card2Flipped = false;
  c1.classList.remove('flipped');
  c2.classList.remove('flipped');
  btn.disabled = true;
}

/* =========================================================
   מסך 4 — SingleChoiceQuestion (מהו החלק החסר?)
   ========================================================= */

const SCQ4 = {
  correctId: 'c', // 500 גרם
  maxAttempts: 2,
  feedback: {
    correct: {
      title: 'מצוין!',
      body: 'אם מחסירים את מסת המלפפונים מהמסה הכוללת, מקבלים את מסת הצנצנת: 500 גרם.\nלמסה של האריזה או המיכל בלבד, ללא התכולה, יש שם מיוחד: <b>טָרָה</b>.'
    },
    wrong1: {
      title: 'התשובה אינה נכונה.',
      body: 'לא נורא, גם מטעויות לומדים.\nננסה שוב?'
    },
    wrong2: {
      title: 'התשובה לא נכונה.',
      body: 'אם מחסירים את מסת המלפפונים מהמסה הכוללת, מקבלים את מסת הצנצנת: 500 גרם.\nלמסה של האריזה או המיכל בלבד, ללא התכולה, יש שם מיוחד: <b>טָרָה</b>.'
    }
  }
};

let scq4Selected = null;
let scq4Attempts = 0;
let scq4Done = false;
let scq4Phase = 'before'; // 'before' | 'selected' | 'wrong1' | 'correct' | 'wrong-final'

function scq4OptEl(id) {
  return document.querySelector('#s3 .scq-opt[data-id="' + id + '"]');
}

function scq4Select(id) {
  if (scq4Done) return;
  const wasWrong1 = (scq4Phase === 'wrong1');
  document.querySelectorAll('#s3 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong');
    el.setAttribute('aria-checked', 'false');
  });
  const selectedEl = scq4OptEl(id);
  selectedEl.classList.add('selected');
  selectedEl.setAttribute('aria-checked', 'true');
  scq4Selected = id;
  scq4Phase = 'selected';
  // ניסיון 1 שגוי → בוחרים תשובה אחרת ישירות, בלי כפתור-ביניים (כמו במסך 2)
  if (wasWrong1) {
    document.getElementById('scq4-feedbox').classList.remove('visible');
  }
  const checkBtn = document.getElementById('scq4-check');
  checkBtn.textContent = 'צדקתי?';
  checkBtn.disabled = false;
  checkBtn.onclick = scq4Check;
}

function scq4ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('scq4-feedbox');
  const data = SCQ4.feedback[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition(box.id);
  // הדמות עם בועית הדיבור מופיעה רק במשוב נכון או במשוב אחרי ניסיון שני שגוי — לא בניסיון ראשון שגוי
  const monsterArea = box.querySelector('.s4-monster-area');
  if (monsterArea) monsterArea.hidden = (kind === 'wrong1');
  // עדכון הדמות בבועית לפי הבחירה במסך 1 — *לפני* שהתיבה נהיית גלויה,
  // כדי שלא יהבהב רגע דמות כתומה (ברירת מחדל) ואז יתחלף לירוקה
  const avatarImg = document.getElementById('s4-avatar-img');
  if (avatarImg) {
    avatarImg.src = (window.lomdaState.selectedCharacter === 'green')
      ? 'assets/images/avatar-green.png'
      : 'assets/images/avatar-orange.png';
  }
  box.classList.add('visible');
}

function scq4SetBarDone(label, handler) {
  const checkBtn = document.getElementById('scq4-check');
  checkBtn.textContent = label;
  checkBtn.disabled = false;
  checkBtn.onclick = handler;
  document.getElementById('scq4-hint').hidden = true;
}

function scq4Check() {
  if (!scq4Selected || scq4Done) return;
  scq4Attempts++;
  const optEl = scq4OptEl(scq4Selected);
  xapiAnswered('002', 'q1', scq4Selected === SCQ4.correctId, scq4Selected === SCQ4.correctId || scq4Attempts >= SCQ4.maxAttempts, xapiAnswerText(optEl));

  if (scq4Selected === SCQ4.correctId) {
    optEl.classList.add('correct');
    optEl.classList.remove('selected');
    scq4Phase = 'correct';
    scq4Done = true;
    scq4LockOptions();
    scq4ShowFeedback('correct', true);
    scq4SetBarDone('המשך', function () { scq4Continue(); });
    return;
  }

  optEl.classList.add('wrong');
  optEl.classList.remove('selected');

  if (scq4Attempts < SCQ4.maxAttempts) {
    scq4Phase = 'wrong1';
    scq4ShowFeedback('wrong1', false);
    const checkBtn = document.getElementById('scq4-check');
    checkBtn.textContent = 'צדקתי?';
    checkBtn.disabled = true;
    checkBtn.onclick = scq4Check;
    // הרמז נחשף רק אחרי ניסיון ראשון שגוי (לפי הלומדה הקודמת)
    const hintBtn = document.getElementById('scq4-hint');
    hintBtn.hidden = false;
    hintBtn.disabled = false;
  } else {
    scq4OptEl(SCQ4.correctId).classList.add('correct');
    scq4Phase = 'wrong-final';
    scq4Done = true;
    scq4LockOptions();
    scq4ShowFeedback('wrong2', false);
    scq4SetBarDone('המשך', function () { scq4Continue(); });
  }

  /* resume: שמירה סינכרונית ברגע מחויבות התשובה. השמירה המושהית שבסוף goTo()
     לא מספיקה כאן — תשובה שניתנה ואז הלשונית נהרגה לפני הניווט הבא הייתה
     נאבדת. עטוף: דיווח ושמירה לעולם לא שוברים את זרימת התשובה. */
  try { flushResumeSave(); } catch (e) {}
}

function scq4LockOptions() {
  document.querySelectorAll('#s3 .scq-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.onclick = null;
  });
}

function scq4UnlockOptions() {
  document.querySelectorAll('#s3 .scq-opt').forEach(function (el) {
    el.classList.remove('disabled');
    el.onclick = function () { scq4Select(el.dataset.id); };
  });
}

function scq4Continue() {
  goTo(4);
}

function scq4OpenHint() {
  if (scq4Done) return;
  /* xAPI: requested.1 — מוצב אחרי כל הגארדים ומיד לפני שהרמז
     באמת נחשף, כדי לא לדווח בקשה שלא קרתה. הפונקציה פותחת בלבד
     (hidden=false) ולא toggle, ולכן אין סיכון לדיווח כפול. */
  xapiRequestedHint('002', 'q1');
  document.getElementById('scq4-hint-overlay').hidden = false;
}

function scq4CloseHint() {
  document.getElementById('scq4-hint-overlay').hidden = true;
}

document.getElementById('scq4-hint-overlay').addEventListener('click', function (e) {
  if (e.target === this) scq4CloseHint();
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && !document.getElementById('scq4-hint-overlay').hidden) {
    scq4CloseHint();
  }
});

function resetScreenState3() {
  if (scq4Done || scq4Attempts > 0 || scq4Selected) return; // resume-state: שאלה שהתחילה (אפילו לא הסתיימה) לא נמחקת בחזרה למסך
  scq4Selected = null;
  scq4Attempts = 0;
  scq4Phase = 'before';
  scq4UnlockOptions();
  document.querySelectorAll('#s3 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong', 'correct');
    el.setAttribute('aria-checked', 'false');
  });
  document.getElementById('scq4-feedbox').classList.remove('visible');
  const checkBtn = document.getElementById('scq4-check');
  checkBtn.textContent = 'צדקתי?';
  checkBtn.disabled = true;
  checkBtn.onclick = scq4Check;
  const hintBtn = document.getElementById('scq4-hint');
  hintBtn.hidden = true; // מוסתר עד ניסיון ראשון שגוי (לפי הלומדה הקודמת)
  hintBtn.disabled = false;
  document.getElementById('scq4-hint-icon').src = 'assets/images/icon-hint-blue.svg';
  document.getElementById('scq4-hint-overlay').hidden = true;
}

document.querySelectorAll('#s3 .scq-opt').forEach(function (opt) {
  opt.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      scq4Select(opt.dataset.id);
    }
  });
});

/* =========================================================
   מסך 5 — Drag & Drop: ברוטו / נטו / טרה
   שני ניסיונות; אחרי ניסיון שני שגוי — חושפים את הפתרון הנכון
   ========================================================= */

const S5_ITEM_IDS = ['s5i1', 's5i2', 's5i3', 's5i4', 's5i5', 's5i6', 's5i7', 's5i8', 's5i9'];

const TEXTS5 = {
  correct: {
    title: 'מצוין!',
    body: 'ברוטו = המסה הכוללת\nנטו = מסת התכולה בלבד\nטרה = מסת האריזה'
  },
  wrong: {
    title: 'התשובה אינה נכונה.',
    body: 'זכרו:\nברוטו = המסה הכוללת\nנטו = מסת התכולה בלבד\nטרה = מסת האריזה\nשננסה שוב?'
  },
  wrongPending: {
    title: 'התשובה אינה נכונה.',
    body: 'רוצים לראות את הפתרון הנכון?'
  },
  wrongFinal: {
    title: 'התשובה אינה נכונה.',
    body: 'זכרו:\nברוטו = המסה הכוללת\nנטו = מסת התכולה בלבד\nטרה = מסת האריזה\nהנה הסידור הנכון.'
  }
};

let s5Done = false;
let s5Attempts = 0;
let s5DragId = null;
let s5LastAnswer = null;
let s5ShowingCorrect = false;

function s5AllPlaced() {
  const sourceBank = document.getElementById('s5-source-bank');
  if (!sourceBank) return false;
  return S5_ITEM_IDS.every(function (id) {
    const el = document.getElementById(id);
    return el && el.parentElement && el.parentElement.id !== 's5-source-bank';
  });
}

function s5UpdateCheckBtn() {
  document.getElementById('s5-check').disabled = !s5AllPlaced();
}

function s5ClearZoneStates() {
  ['bruto', 'neto', 'tara'].forEach(function (z) {
    document.getElementById('s5-zone-' + z).classList.remove('correct', 'wrong', 's5-drag-over');
  });
  S5_ITEM_IDS.forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('s5-item-correct', 's5-item-wrong');
  });
}

function s5DragStart(event, itemId) {
  s5DragId = itemId;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', itemId);
  setTimeout(function () {
    const el = document.getElementById(itemId);
    if (el) el.classList.add('s5-dragging');
  }, 0);
}

function s5DragEnd(itemId) {
  const el = document.getElementById(itemId);
  if (el) el.classList.remove('s5-dragging');
  s5DragId = null;
}

function s5DragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
}

function s5DragEnter(event, zoneId) {
  event.preventDefault();
  document.getElementById(zoneId).classList.add('s5-drag-over');
}

function s5DragLeave(event, zoneId) {
  const zone = document.getElementById(zoneId);
  if (zone && !zone.contains(event.relatedTarget)) {
    zone.classList.remove('s5-drag-over');
  }
}

function s5Drop(event, targetZone) {
  event.preventDefault();
  if (s5Done) return;
  const itemId = event.dataTransfer.getData('text/plain') || s5DragId;
  if (!itemId) return;
  const zoneEl = document.getElementById('s5-zone-' + targetZone);
  const itemEl = document.getElementById(itemId);
  if (zoneEl && itemEl) {
    zoneEl.classList.remove('s5-drag-over');
    if (itemEl.parentElement) itemEl.parentElement.removeChild(itemEl);
    zoneEl.appendChild(itemEl);
  }
  s5UpdateCheckBtn();
  s5ClearZoneStates();
}

function s5DropToSource(event) {
  event.preventDefault();
  if (s5Done) return;
  const itemId = event.dataTransfer.getData('text/plain') || s5DragId;
  if (!itemId) return;
  const sourceBank = document.getElementById('s5-source-bank');
  const itemEl = document.getElementById(itemId);
  if (itemEl && sourceBank && itemEl.parentElement !== sourceBank) {
    if (itemEl.parentElement) itemEl.parentElement.removeChild(itemEl);
    sourceBank.appendChild(itemEl);
  }
  s5UpdateCheckBtn();
  s5ClearZoneStates();
}

function s5ItemClick(itemId) {
  if (s5Done) return;
  const el = document.getElementById(itemId);
  const sourceBank = document.getElementById('s5-source-bank');
  if (!el || !sourceBank || el.parentElement === sourceBank) return;
  el.parentElement.removeChild(el);
  sourceBank.appendChild(el);
  s5ClearZoneStates();
  s5UpdateCheckBtn();
}

function s5ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('s5-feedbox');
  const data = TEXTS5[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition(box.id);
  box.classList.add('visible');
}

function s5RevealCorrect() {
  S5_ITEM_IDS.forEach(function (id) {
    const item = document.getElementById(id);
    const zoneEl = document.getElementById('s5-zone-' + item.dataset.correct);
    if (item.parentElement) item.parentElement.removeChild(item);
    zoneEl.appendChild(item);
    item.classList.remove('s5-item-wrong');
    item.classList.add('s5-item-correct');
  });
  ['bruto', 'neto', 'tara'].forEach(function (zoneId) {
    const zoneEl = document.getElementById('s5-zone-' + zoneId);
    zoneEl.classList.remove('wrong', 's5-drag-over');
    zoneEl.classList.add('correct');
  });
}

function s5ShowMyAnswer() {
  S5_ITEM_IDS.forEach(function (id) {
    const item = document.getElementById(id);
    const dest = s5LastAnswer[id];
    const destEl = (dest === 'source')
      ? document.getElementById('s5-source-bank')
      : document.getElementById('s5-zone-' + dest);
    if (item.parentElement) item.parentElement.removeChild(item);
    destEl.appendChild(item);
  });
  ['bruto', 'neto', 'tara'].forEach(function (zoneId) {
    const zoneEl = document.getElementById('s5-zone-' + zoneId);
    const items = zoneEl.querySelectorAll('.s5-drag-item');
    let zoneOk = items.length > 0;
    items.forEach(function (item) {
      const itemOk = item.dataset.correct === zoneId;
      if (!itemOk) zoneOk = false;
      item.classList.remove('s5-item-correct', 's5-item-wrong');
      item.classList.add(itemOk ? 's5-item-correct' : 's5-item-wrong');
    });
    zoneEl.classList.remove('wrong', 'correct', 's5-drag-over');
    zoneEl.classList.add(zoneOk ? 'correct' : 'wrong');
  });
  s5ShowFeedback('wrongPending', false);
}

function s5Reveal() {
  const revealBtn = document.getElementById('s5-reveal-btn');
  if (s5ShowingCorrect) {
    s5ShowMyAnswer();
    s5ShowingCorrect = false;
    if (revealBtn) revealBtn.textContent = 'התשובה הנכונה';
  } else {
    s5RevealCorrect();
    s5ShowFeedback('wrongFinal', false);
    s5ShowingCorrect = true;
    if (revealBtn) revealBtn.textContent = 'התשובה שלי';
  }
}

function s5Check() {
  if (s5Done) return;
  s5Attempts++;

  let allCorrect = true;
  ['bruto', 'neto', 'tara'].forEach(function (zoneId) {
    const zoneEl = document.getElementById('s5-zone-' + zoneId);
    const items = zoneEl.querySelectorAll('.s5-drag-item');
    let zoneOk = items.length > 0;
    items.forEach(function (item) {
      const itemOk = item.dataset.correct === zoneId;
      if (!itemOk) zoneOk = false;
      item.classList.remove('s5-item-correct', 's5-item-wrong');
      item.classList.add(itemOk ? 's5-item-correct' : 's5-item-wrong');
    });
    zoneEl.classList.toggle('correct', zoneOk);
    zoneEl.classList.toggle('wrong', !zoneOk);
    if (!zoneOk) allCorrect = false;
  });

  const checkBtn = document.getElementById('s5-check');
  /* xAPI: מוצב אחרי לוח הגרירה, כי allCorrect סופי רק בסוף הלופ. */
  xapiAnswered('003', 'q1', allCorrect, allCorrect || s5Attempts >= 2, xapiZoneAnswer('s5', ['bruto', 'neto', 'tara']));
  if (allCorrect) {
    s5Done = true;
    s5ShowFeedback('correct', true);
    checkBtn.textContent = 'המשך';
    checkBtn.disabled = false;
    checkBtn.onclick = s5Continue;
  } else if (s5Attempts < 2) {
    s5ShowFeedback('wrong', false);
    checkBtn.disabled = true;
  } else {
    s5Done = true;
    /* דריסה: הפתרון לא נחשף אוטומטית — רק בלחיצה על "התשובה הנכונה" */
    s5LastAnswer = {};
    S5_ITEM_IDS.forEach(function (id) {
      const el = document.getElementById(id);
      const parentId = el && el.parentElement ? el.parentElement.id : '';
      s5LastAnswer[id] = parentId.indexOf('s5-zone-') === 0 ? parentId.replace('s5-zone-', '') : 'source';
    });
    s5ShowingCorrect = false;
    s5ShowFeedback('wrongPending', false);
    const revealBtn = document.getElementById('s5-reveal-btn');
    if (revealBtn) { revealBtn.hidden = false; revealBtn.textContent = 'התשובה הנכונה'; }
    checkBtn.textContent = 'המשך';
    checkBtn.disabled = false;
    checkBtn.onclick = s5Continue;
  }

  /* resume: שמירה סינכרונית ברגע מחויבות התשובה. השמירה המושהית שבסוף goTo()
     לא מספיקה כאן — תשובה שניתנה ואז הלשונית נהרגה לפני הניווט הבא הייתה
     נאבדת. עטוף: דיווח ושמירה לעולם לא שוברים את זרימת התשובה. */
  try { flushResumeSave(); } catch (e) {}
}

function s5Continue() {
  goTo(5);
}

function resetScreenState4() {
  const checkBtn = document.getElementById('s5-check');
  if (s5Done) {
    // resume-state: התשובה כבר נענתה נכון — משאירים הצבה/משוב כפי שהיו
    checkBtn.textContent = 'המשך';
    checkBtn.disabled = false;
    checkBtn.onclick = s5Continue;
    return;
  }
  // resume-state: ניסיון שבוצע או פריטים שהוצבו כבר (אפילו בלי הגשה) לא נמחקים בחזרה למסך
  if (s5Attempts > 0 || S5_ITEM_IDS.some(function (id) {
    const el = document.getElementById(id);
    return el && el.parentElement && el.parentElement.id !== 's5-source-bank';
  })) return;
  s5Attempts = 0;
  s5DragId = null;
  s5LastAnswer = null;
  s5ShowingCorrect = false;

  const sourceBank = document.getElementById('s5-source-bank');
  S5_ITEM_IDS.forEach(function (id) {
    const el = document.getElementById(id);
    if (el && el.parentElement !== sourceBank) {
      el.parentElement.removeChild(el);
      sourceBank.appendChild(el);
    }
  });

  s5ClearZoneStates();
  document.getElementById('s5-feedbox').classList.remove('visible');

  checkBtn.textContent = 'צדקתי?';
  checkBtn.disabled = true;
  checkBtn.onclick = s5Check;
  const revealBtn = document.getElementById('s5-reveal-btn');
  if (revealBtn) { revealBtn.hidden = true; revealBtn.textContent = 'התשובה הנכונה'; }
}

/* =========================================================
   מסך 6 — מסך מעבר: דמות מלווה
   ========================================================= */

function resetScreenState5() {
  const video = document.getElementById('s6-avatar-img');
  if (video) {
    video.src = (window.lomdaState.selectedCharacter === 'green')
      ? 'assets/videos/avatar-green-come-in.mp4'
      : 'assets/videos/avatar-orange-come-in.mp4';
    video.load();
    video.play().catch(function () {});
  }
}

function s6Continue() {
  goTo(6);
}

/* =========================================================
   מסך 7 — קלף מתהפך (FlipCardsReveal)
   ========================================================= */

let s7Flipped = false;

function resetScreenState6() {
  if (s7Flipped) return; // resume-state: קלף שהתהפך כבר לא נהפך בחזרה למסך
  s7Flipped = false;
  const card = document.getElementById('s7-flip-card');
  if (card) card.classList.remove('flipped');
  const avatarArea = document.getElementById('s7-avatar-area');
  if (avatarArea) avatarArea.hidden = true;
  const btn = document.getElementById('s7-btn-continue');
  if (btn) btn.disabled = true;
  const video = document.getElementById('s7-avatar-img');
  if (video) {
    video.src = (window.lomdaState.selectedCharacter === 'green')
      ? 'assets/videos/avatar-green-questioning.mp4'
      : 'assets/videos/avatar-orange-questioning.mp4';
    video.load();
    video.play().catch(function () {});
  }
}

function s7FlipCard() {
  if (s7Flipped) return;
  s7Flipped = true;
  document.getElementById('s7-flip-card').classList.add('flipped');
  setTimeout(function () {
    document.getElementById('s7-avatar-area').hidden = false;
    document.getElementById('s7-btn-continue').disabled = false;
  }, 2000);
}

function s7CardKey(event) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    s7FlipCard();
  }
}

function s7Continue() {
  goTo(7);
}

/* =========================================================
   מסך 8 — SingleChoiceQuestion (מה הבעיה במידע שקיבלתם?)
   ========================================================= */

const SCQ8 = {
  correctId: 'c', // חסר מידע על יחידת המידה
  maxAttempts: 2,
  feedback: {
    correct: {
      title: 'מצוין!',
      body: 'המספר 150 לבדו לא מספיק.\nכדי להבין את המסה צריך לדעת גם מהי <b>יחידת המידה</b>.'
    },
    wrong1: {
      title: 'התשובה אינה נכונה.',
      body: 'לא נורא, גם מטעויות לומדים.\nננסה שוב?'
    },
    wrong2: {
      title: 'התשובה לא נכונה.',
      body: 'המספר 150 לבדו לא מספיק.\nכדי להבין את המסה צריך לדעת גם את יחידת המידה.'
    }
  }
};

let scq8Selected = null;
let scq8Attempts = 0;
let scq8Done = false;
let scq8Phase = 'before'; // 'before' | 'selected' | 'wrong1' | 'correct' | 'wrong-final'

function scq8OptEl(id) {
  return document.querySelector('#s7 .scq-opt[data-id="' + id + '"]');
}

function scq8Select(id) {
  if (scq8Done) return;
  const wasWrong1 = (scq8Phase === 'wrong1');
  document.querySelectorAll('#s7 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong');
    el.setAttribute('aria-checked', 'false');
  });
  const selectedEl = scq8OptEl(id);
  selectedEl.classList.add('selected');
  selectedEl.setAttribute('aria-checked', 'true');
  scq8Selected = id;
  scq8Phase = 'selected';
  if (wasWrong1) {
    document.getElementById('scq8-feedbox').classList.remove('visible');
  }
  const checkBtn = document.getElementById('scq8-check');
  checkBtn.textContent = 'צדקתי?';
  checkBtn.disabled = false;
  checkBtn.onclick = scq8Check;
}

function scq8ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('scq8-feedbox');
  const data = SCQ8.feedback[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition(box.id);
  box.classList.add('visible');
}

function scq8SetBarDone(label, handler) {
  const checkBtn = document.getElementById('scq8-check');
  checkBtn.textContent = label;
  checkBtn.disabled = false;
  checkBtn.onclick = handler;
  document.getElementById('scq8-hint').hidden = true;
}

function scq8Check() {
  if (!scq8Selected || scq8Done) return;
  scq8Attempts++;
  const optEl = scq8OptEl(scq8Selected);
  xapiAnswered('004', 'q1', scq8Selected === SCQ8.correctId, scq8Selected === SCQ8.correctId || scq8Attempts >= SCQ8.maxAttempts, xapiAnswerText(optEl));

  if (scq8Selected === SCQ8.correctId) {
    optEl.classList.add('correct');
    optEl.classList.remove('selected');
    scq8Phase = 'correct';
    scq8Done = true;
    scq8LockOptions();
    scq8ShowFeedback('correct', true);
    scq8SetBarDone('המשך', function () { scq8Continue(); });
    return;
  }

  optEl.classList.add('wrong');
  optEl.classList.remove('selected');

  if (scq8Attempts < SCQ8.maxAttempts) {
    scq8Phase = 'wrong1';
    scq8ShowFeedback('wrong1', false);
    const checkBtn = document.getElementById('scq8-check');
    checkBtn.textContent = 'צדקתי?';
    checkBtn.disabled = true;
    checkBtn.onclick = scq8Check;
    // הרמז נחשף רק אחרי ניסיון ראשון שגוי (לפי הלומדה הקודמת)
    const hintBtn = document.getElementById('scq8-hint');
    hintBtn.hidden = false;
  } else {
    scq8OptEl(SCQ8.correctId).classList.add('correct');
    scq8Phase = 'wrong-final';
    scq8Done = true;
    scq8LockOptions();
    scq8ShowFeedback('wrong2', false);
    scq8SetBarDone('המשך', function () { scq8Continue(); });
  }

  /* resume: שמירה סינכרונית ברגע מחויבות התשובה. השמירה המושהית שבסוף goTo()
     לא מספיקה כאן — תשובה שניתנה ואז הלשונית נהרגה לפני הניווט הבא הייתה
     נאבדת. עטוף: דיווח ושמירה לעולם לא שוברים את זרימת התשובה. */
  try { flushResumeSave(); } catch (e) {}
}

function scq8LockOptions() {
  document.querySelectorAll('#s7 .scq-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.onclick = null;
  });
}

function scq8UnlockOptions() {
  document.querySelectorAll('#s7 .scq-opt').forEach(function (el) {
    el.classList.remove('disabled');
    el.onclick = function () { scq8Select(el.dataset.id); };
  });
}

function scq8Continue() {
  goTo(8);
}

function scq8OpenHint() {
  if (scq8Done) return;
  /* xAPI: requested.1 — מוצב אחרי כל הגארדים ומיד לפני שהרמז
     באמת נחשף, כדי לא לדווח בקשה שלא קרתה. הפונקציה פותחת בלבד
     (hidden=false) ולא toggle, ולכן אין סיכון לדיווח כפול. */
  xapiRequestedHint('004', 'q1');
  document.getElementById('scq8-hint-overlay').hidden = false;
}

function scq8CloseHint() {
  document.getElementById('scq8-hint-overlay').hidden = true;
}

document.getElementById('scq8-hint-overlay').addEventListener('click', function (e) {
  if (e.target === this) scq8CloseHint();
});

function resetScreenState7() {
  if (scq8Done || scq8Attempts > 0 || scq8Selected) return; // resume-state: שאלה שהתחילה (אפילו לא הסתיימה) לא נמחקת בחזרה למסך
  scq8Selected = null;
  scq8Attempts = 0;
  scq8Phase = 'before';
  scq8UnlockOptions();
  document.querySelectorAll('#s7 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong', 'correct');
    el.setAttribute('aria-checked', 'false');
  });
  document.getElementById('scq8-feedbox').classList.remove('visible');
  const checkBtn = document.getElementById('scq8-check');
  checkBtn.textContent = 'צדקתי?';
  checkBtn.disabled = true;
  checkBtn.onclick = scq8Check;
  const hintBtn = document.getElementById('scq8-hint');
  hintBtn.hidden = true; // מוסתר עד ניסיון ראשון שגוי (לפי הלומדה הקודמת)
  hintBtn.disabled = false;
  document.getElementById('scq8-hint-icon').src = 'assets/images/icon-hint-blue.svg';
  document.getElementById('scq8-hint-overlay').hidden = true;
}

document.querySelectorAll('#s7 .scq-opt').forEach(function (opt) {
  opt.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      scq8Select(opt.dataset.id);
    }
  });
});

/* =========================================================
   מסך 9 — Drag & Drop: יחידות מידה
   ניסיונות ללא הגבלה (בדיוק כמו מסך 5 ובלומדה הקודמת)
   ========================================================= */

const S9_ITEM_IDS = ['s9-turtle', 's9-train', 's9-salt', 's9-apple'];
const S9_ZONE_IDS = ['ton', 'kg', 'gram', 'mg'];

const TEXTS9 = {
  correct: {
    title: 'מצוין!',
    body: 'לגופים שונים מתאימות יחידות מידה שונות.\nגרגר מלח גס נמדד בדרך כלל במיליגרמים (מ"ג), תפוח נמדד בדרך כלל בגרמים (ג\'), צב ענק נמדד בדרך כלל בקילוגרמים (ק"ג) וקטר נמדד בדרך כלל בטונות.'
  },
  wrong: {
    title: 'התשובה אינה נכונה.',
    body: 'לא נורא, גם מטעויות לומדים.\nננסה שוב?'
  },
  wrongPending: {
    title: 'התשובה אינה נכונה.',
    body: 'רוצים לראות את הפתרון הנכון?'
  },
  wrong2: {
    title: 'התשובה אינה נכונה.',
    body: 'לגופים שונים מתאימות יחידות מידה שונות.\nגרגר מלח גס נמדד בדרך כלל במיליגרמים (מ"ג), תפוח נמדד בדרך כלל בגרמים (ג\'), צב ענק נמדד בדרך כלל בקילוגרמים (ק"ג) וקטר נמדד בדרך כלל בטונות.'
  }
};

let s9Done = false;
let s9Attempts = 0;
let s9HintShown = false;
let s9DragId = null;
let s9LastAnswer = null;
let s9ShowingCorrect = false;

function s9AllPlaced() {
  const sourceBank = document.getElementById('s9-source-bank');
  if (!sourceBank) return false;
  return S9_ITEM_IDS.every(function (id) {
    const el = document.getElementById(id);
    return el && el.parentElement && el.parentElement.id !== 's9-source-bank';
  });
}

function s9UpdateCheckBtn() {
  document.getElementById('s9-check').disabled = !s9AllPlaced();
}

function s9ClearZoneStates() {
  S9_ZONE_IDS.forEach(function (z) {
    document.getElementById('s9-zone-' + z).classList.remove('correct', 'wrong', 's9-drag-over');
  });
  S9_ITEM_IDS.forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('s9-item-correct', 's9-item-wrong');
  });
}

function s9UpdateAvatar() {
  // משתמש בווידאו ה-"questioning" (אין קליפ "asking" נפרד — הוחלט להשתמש
  // באותה אנימציה גם למסך זה)
  const video = document.getElementById('s9-avatar-img');
  if (video) {
    video.src = (window.lomdaState.selectedCharacter === 'green')
      ? 'assets/videos/avatar-green-questioning.mp4'
      : 'assets/videos/avatar-orange-questioning.mp4';
    video.load();
    video.play().catch(function () {});
  }
}

function s9DragStart(event, itemId) {
  if (s9Done) { event.preventDefault(); return; }
  s9DragId = itemId;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', itemId);
  setTimeout(function () {
    const el = document.getElementById(itemId);
    if (el) el.classList.add('s9-dragging');
  }, 0);
}

function s9DragEnd(itemId) {
  const el = document.getElementById(itemId);
  if (el) el.classList.remove('s9-dragging');
  s9DragId = null;
}

function s9DragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
}

function s9DragEnter(event, zoneId) {
  event.preventDefault();
  if (s9Done) return;
  document.getElementById(zoneId).classList.add('s9-drag-over');
}

function s9DragLeave(event, zoneId) {
  const zone = document.getElementById(zoneId);
  if (zone && !zone.contains(event.relatedTarget)) {
    zone.classList.remove('s9-drag-over');
  }
}

function s9Drop(event, targetZone) {
  event.preventDefault();
  if (s9Done) return;
  const itemId = event.dataTransfer.getData('text/plain') || s9DragId;
  if (!itemId) return;
  const zoneEl = document.getElementById('s9-zone-' + targetZone);
  const itemEl = document.getElementById(itemId);
  if (zoneEl && itemEl) {
    zoneEl.classList.remove('s9-drag-over');
    const existing = zoneEl.querySelector('.s9-drag-item');
    if (existing && existing !== itemEl) {
      document.getElementById('s9-source-bank').appendChild(existing);
    }
    if (itemEl.parentElement) itemEl.parentElement.removeChild(itemEl);
    zoneEl.appendChild(itemEl);
  }
  s9ClearZoneStates();
  s9UpdateCheckBtn();
}

function s9DropToSource(event) {
  event.preventDefault();
  if (s9Done) return;
  const itemId = event.dataTransfer.getData('text/plain') || s9DragId;
  if (!itemId) return;
  const sourceBank = document.getElementById('s9-source-bank');
  const itemEl = document.getElementById(itemId);
  if (itemEl && sourceBank && itemEl.parentElement !== sourceBank) {
    if (itemEl.parentElement) itemEl.parentElement.removeChild(itemEl);
    sourceBank.appendChild(itemEl);
  }
  s9ClearZoneStates();
  s9UpdateCheckBtn();
}

function s9ItemClick(itemId) {
  if (s9Done) return;
  const el = document.getElementById(itemId);
  const sourceBank = document.getElementById('s9-source-bank');
  if (!el || !sourceBank || el.parentElement === sourceBank) return;
  el.parentElement.removeChild(el);
  sourceBank.appendChild(el);
  s9ClearZoneStates();
  s9UpdateCheckBtn();
}

function s9ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('s9-feedbox');
  const data = TEXTS9[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition(box.id);
  box.classList.add('visible');
}

function s9RevealCorrect() {
  S9_ITEM_IDS.forEach(function (id) {
    const item = document.getElementById(id);
    const zoneEl = document.getElementById('s9-zone-' + item.dataset.correct);
    if (item.parentElement) item.parentElement.removeChild(item);
    zoneEl.appendChild(item);
    item.classList.remove('s9-item-wrong');
    item.classList.add('s9-item-correct');
  });
  S9_ZONE_IDS.forEach(function (zoneId) {
    const zoneEl = document.getElementById('s9-zone-' + zoneId);
    zoneEl.classList.remove('wrong', 's9-drag-over');
    zoneEl.classList.add('correct');
  });
}

function s9ShowMyAnswer() {
  S9_ITEM_IDS.forEach(function (id) {
    const item = document.getElementById(id);
    const dest = s9LastAnswer[id];
    const destEl = (dest === 'source')
      ? document.getElementById('s9-source-bank')
      : document.getElementById('s9-zone-' + dest);
    if (item.parentElement) item.parentElement.removeChild(item);
    destEl.appendChild(item);
  });
  S9_ZONE_IDS.forEach(function (zoneId) {
    const zoneEl = document.getElementById('s9-zone-' + zoneId);
    const items = zoneEl.querySelectorAll('.s9-drag-item');
    let zoneOk = items.length > 0;
    items.forEach(function (item) {
      const itemOk = item.dataset.correct === zoneId;
      if (!itemOk) zoneOk = false;
      item.classList.remove('s9-item-correct', 's9-item-wrong');
      item.classList.add(itemOk ? 's9-item-correct' : 's9-item-wrong');
    });
    zoneEl.classList.remove('wrong', 'correct', 's9-drag-over');
    zoneEl.classList.add(zoneOk ? 'correct' : 'wrong');
  });
  s9ShowFeedback('wrongPending', false);
}

function s9Reveal() {
  const revealBtn = document.getElementById('s9-reveal-btn');
  if (s9ShowingCorrect) {
    s9ShowMyAnswer();
    s9ShowingCorrect = false;
    if (revealBtn) revealBtn.textContent = 'התשובה הנכונה';
  } else {
    s9RevealCorrect();
    s9ShowFeedback('wrong2', false);
    s9ShowingCorrect = true;
    if (revealBtn) revealBtn.textContent = 'התשובה שלי';
  }
}

function s9Check() {
  if (s9Done) return;
  s9Attempts++;

  let allCorrect = true;
  S9_ZONE_IDS.forEach(function (zoneId) {
    const zoneEl = document.getElementById('s9-zone-' + zoneId);
    const items = zoneEl.querySelectorAll('.s9-drag-item');
    let zoneOk = items.length > 0;
    items.forEach(function (item) {
      const itemOk = item.dataset.correct === zoneId;
      if (!itemOk) zoneOk = false;
      item.classList.remove('s9-item-correct', 's9-item-wrong');
      item.classList.add(itemOk ? 's9-item-correct' : 's9-item-wrong');
    });
    zoneEl.classList.toggle('correct', zoneOk);
    zoneEl.classList.toggle('wrong', !zoneOk);
    if (!zoneOk) allCorrect = false;
  });

  const checkBtn = document.getElementById('s9-check');
  /* xAPI: מוצב אחרי לוח הגרירה, כי allCorrect סופי רק בסוף הלופ. */
  xapiAnswered('005', 'q1', allCorrect, allCorrect || s9Attempts >= 2, xapiZoneAnswer('s9', S9_ZONE_IDS));
  if (allCorrect) {
    s9Done = true;
    S9_ITEM_IDS.forEach(function (id) {
      const el = document.getElementById(id);
      if (el) { el.draggable = false; el.classList.add('s9-locked'); }
    });
    s9ShowFeedback('correct', true);
    checkBtn.textContent = 'המשך';
    checkBtn.disabled = false;
    checkBtn.onclick = s9Continue;
  } else if (s9Attempts < 2) {
    s9ShowFeedback('wrong', false);
    checkBtn.disabled = true;
    s9HintShown = true;
    document.getElementById('s9-hint').hidden = false;
  } else {
    s9Done = true;
    /* דריסה: הפתרון לא נחשף אוטומטית — רק בלחיצה על "התשובה הנכונה" */
    s9LastAnswer = {};
    S9_ITEM_IDS.forEach(function (id) {
      const el = document.getElementById(id);
      const parentId = el && el.parentElement ? el.parentElement.id : '';
      s9LastAnswer[id] = parentId.indexOf('s9-zone-') === 0 ? parentId.replace('s9-zone-', '') : 'source';
    });
    s9ShowingCorrect = false;
    s9ShowFeedback('wrongPending', false);
    const revealBtn = document.getElementById('s9-reveal-btn');
    if (revealBtn) { revealBtn.hidden = false; revealBtn.textContent = 'התשובה הנכונה'; }
    checkBtn.textContent = 'המשך';
    checkBtn.disabled = false;
    checkBtn.onclick = s9Continue;
  }

  /* resume: שמירה סינכרונית ברגע מחויבות התשובה. השמירה המושהית שבסוף goTo()
     לא מספיקה כאן — תשובה שניתנה ואז הלשונית נהרגה לפני הניווט הבא הייתה
     נאבדת. עטוף: דיווח ושמירה לעולם לא שוברים את זרימת התשובה. */
  try { flushResumeSave(); } catch (e) {}
}

function s9OpenHint() {
  /* xAPI: requested.1 — מוצב אחרי כל הגארדים ומיד לפני שהרמז
     באמת נחשף, כדי לא לדווח בקשה שלא קרתה. הפונקציה פותחת בלבד
     (hidden=false) ולא toggle, ולכן אין סיכון לדיווח כפול. */
  xapiRequestedHint('005', 'q1');
  document.getElementById('s9-hint-overlay').hidden = false;
}

function s9CloseHint() {
  document.getElementById('s9-hint-overlay').hidden = true;
}

document.getElementById('s9-hint-overlay').addEventListener('click', function (e) {
  if (e.target === this) s9CloseHint();
});

function s9Continue() {
  goTo(9);
}

function resetScreenState8() {
  const checkBtn = document.getElementById('s9-check');
  const hintBtn = document.getElementById('s9-hint');
  s9UpdateAvatar();
  if (s9Done) {
    // resume-state: התשובה כבר נענתה נכון — משאירים הצבה/משוב כפי שהיו
    checkBtn.textContent = 'המשך';
    checkBtn.disabled = false;
    checkBtn.onclick = s9Continue;
    if (s9HintShown) hintBtn.hidden = false;
    return;
  }
  // resume-state: ניסיון שבוצע, רמז שנחשף, או פריטים שהוצבו כבר (אפילו בלי הגשה) לא נמחקים בחזרה למסך
  if (s9Attempts > 0 || s9HintShown || S9_ITEM_IDS.some(function (id) {
    const el = document.getElementById(id);
    return el && el.parentElement && el.parentElement.id !== 's9-source-bank';
  })) return;
  s9Attempts = 0;
  s9HintShown = false;
  s9DragId = null;
  s9LastAnswer = null;
  s9ShowingCorrect = false;

  const sourceBank = document.getElementById('s9-source-bank');
  S9_ITEM_IDS.forEach(function (id) {
    const el = document.getElementById(id);
    if (el && el.parentElement !== sourceBank) {
      el.parentElement.removeChild(el);
      sourceBank.appendChild(el);
    }
    if (el) { el.draggable = true; el.classList.remove('s9-locked', 's9-dragging'); }
  });

  s9ClearZoneStates();
  document.getElementById('s9-feedbox').classList.remove('visible');
  document.getElementById('s9-hint-overlay').hidden = true;

  checkBtn.textContent = 'צדקתי?';
  checkBtn.disabled = true;
  checkBtn.onclick = s9Check;
  hintBtn.hidden = true;
  const revealBtn = document.getElementById('s9-reveal-btn');
  if (revealBtn) { revealBtn.hidden = true; revealBtn.textContent = 'התשובה הנכונה'; }
}

/* =========================================================
   מסך 10 — SingleChoiceQuestion (למה לא להשתמש באותה יחידת מידה?)
   ========================================================= */

const SCQ10 = {
  correctId: 'b', // כי יחידות שונות הופכות את המדידה לנוחה וברורה יותר
  maxAttempts: 2,
  feedback: {
    correct: {
      title: 'מצוין!',
      body: 'אפשר למדוד כל גוף בכל יחידת מסה, אבל לא תמיד זה יהיה נוח.\nלדוגמה, במקום לומר שמסתו של קטר היא 150 טון, אפשר לומר שמסתו היא 150,000,000 גרם.\n\nשתי המדידות נכונות, אך הרבה יותר נוח להשתמש ביחידת המידה המתאימה למסת הגוף.\nלכן, נשתמש ביחידות מסה שונות: מיליגרם, גרם, קילוגרם וטון.'
    },
    wrong1: {
      title: 'התשובה אינה נכונה.',
      body: 'לא נורא, גם מטעויות לומדים.\nננסה שוב?'
    },
    wrong2: {
      title: 'התשובה לא נכונה.',
      body: 'אפשר למדוד כל גוף בכל יחידת מסה, אבל לא תמיד זה יהיה נוח.\nלדוגמה, במקום לומר שמסתו של קטר היא 150 טון, אפשר לומר שמסתו היא 150,000,000 גרם.\n\nשתי המדידות נכונות, אך הרבה יותר נוח להשתמש ביחידת המידה המתאימה למסת הגוף.\nלכן, נשתמש ביחידות מסה שונות: מיליגרם, גרם, קילוגרם וטון.'
    }
  }
};

let scq10Selected = null;
let scq10Attempts = 0;
let scq10Done = false;
let scq10Phase = 'before';

function scq10OptEl(id) {
  return document.querySelector('#s9 .scq-opt[data-id="' + id + '"]');
}

function scq10Select(id) {
  if (scq10Done) return;
  const wasWrong1 = (scq10Phase === 'wrong1');
  document.querySelectorAll('#s9 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong');
    el.setAttribute('aria-checked', 'false');
  });
  const selectedEl = scq10OptEl(id);
  selectedEl.classList.add('selected');
  selectedEl.setAttribute('aria-checked', 'true');
  scq10Selected = id;
  scq10Phase = 'selected';
  if (wasWrong1) {
    document.getElementById('scq10-feedbox').classList.remove('visible');
  }
  const checkBtn = document.getElementById('scq10-check');
  checkBtn.textContent = 'צדקתי?';
  checkBtn.disabled = false;
  checkBtn.onclick = scq10Check;
}

function scq10ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('scq10-feedbox');
  const data = SCQ10.feedback[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition(box.id);
  box.classList.add('visible');
}

function scq10SetBarDone(label, handler) {
  const checkBtn = document.getElementById('scq10-check');
  checkBtn.textContent = label;
  checkBtn.disabled = false;
  checkBtn.onclick = handler;
  document.getElementById('scq10-hint').hidden = true;
}

function scq10Check() {
  if (!scq10Selected || scq10Done) return;
  scq10Attempts++;
  const optEl = scq10OptEl(scq10Selected);
  xapiAnswered('006', 'q1', scq10Selected === SCQ10.correctId, scq10Selected === SCQ10.correctId || scq10Attempts >= SCQ10.maxAttempts, xapiAnswerText(optEl));

  if (scq10Selected === SCQ10.correctId) {
    optEl.classList.add('correct');
    optEl.classList.remove('selected');
    scq10Phase = 'correct';
    scq10Done = true;
    scq10LockOptions();
    scq10ShowFeedback('correct', true);
    scq10SetBarDone('המשך', function () { scq10Continue(); });
    return;
  }

  optEl.classList.add('wrong');
  optEl.classList.remove('selected');

  if (scq10Attempts < SCQ10.maxAttempts) {
    scq10Phase = 'wrong1';
    scq10ShowFeedback('wrong1', false);
    const checkBtn = document.getElementById('scq10-check');
    checkBtn.textContent = 'צדקתי?';
    checkBtn.disabled = true;
    checkBtn.onclick = scq10Check;
    // הרמז נחשף רק אחרי ניסיון ראשון שגוי (לפי הלומדה הקודמת)
    const hintBtn = document.getElementById('scq10-hint');
    hintBtn.hidden = false;
  } else {
    scq10OptEl(SCQ10.correctId).classList.add('correct');
    scq10Phase = 'wrong-final';
    scq10Done = true;
    scq10LockOptions();
    scq10ShowFeedback('wrong2', false);
    scq10SetBarDone('המשך', function () { scq10Continue(); });
  }

  /* resume: שמירה סינכרונית ברגע מחויבות התשובה. השמירה המושהית שבסוף goTo()
     לא מספיקה כאן — תשובה שניתנה ואז הלשונית נהרגה לפני הניווט הבא הייתה
     נאבדת. עטוף: דיווח ושמירה לעולם לא שוברים את זרימת התשובה. */
  try { flushResumeSave(); } catch (e) {}
}

function scq10LockOptions() {
  document.querySelectorAll('#s9 .scq-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.onclick = null;
  });
}

function scq10UnlockOptions() {
  document.querySelectorAll('#s9 .scq-opt').forEach(function (el) {
    el.classList.remove('disabled');
    el.onclick = function () { scq10Select(el.dataset.id); };
  });
}

function scq10Continue() {
  goTo(10);
}

function scq10OpenHint() {
  if (scq10Done) return;
  /* xAPI: requested.1 — מוצב אחרי כל הגארדים ומיד לפני שהרמז
     באמת נחשף, כדי לא לדווח בקשה שלא קרתה. הפונקציה פותחת בלבד
     (hidden=false) ולא toggle, ולכן אין סיכון לדיווח כפול. */
  xapiRequestedHint('006', 'q1');
  document.getElementById('scq10-hint-overlay').hidden = false;
}

function scq10CloseHint() {
  document.getElementById('scq10-hint-overlay').hidden = true;
}

document.getElementById('scq10-hint-overlay').addEventListener('click', function (e) {
  if (e.target === this) scq10CloseHint();
});

function resetScreenState9() {
  if (scq10Done || scq10Attempts > 0 || scq10Selected) return; // resume-state: שאלה שהתחילה (אפילו לא הסתיימה) לא נמחקת בחזרה למסך
  scq10Selected = null;
  scq10Attempts = 0;
  scq10Phase = 'before';
  scq10UnlockOptions();
  document.querySelectorAll('#s9 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong', 'correct');
    el.setAttribute('aria-checked', 'false');
  });
  document.getElementById('scq10-feedbox').classList.remove('visible');
  const checkBtn = document.getElementById('scq10-check');
  checkBtn.textContent = 'צדקתי?';
  checkBtn.disabled = true;
  checkBtn.onclick = scq10Check;
  const hintBtn = document.getElementById('scq10-hint');
  hintBtn.hidden = true; // מוסתר עד ניסיון ראשון שגוי (לפי הלומדה הקודמת)
  hintBtn.disabled = false;
  document.getElementById('scq10-hint-icon').src = 'assets/images/icon-hint-blue.svg';
  document.getElementById('scq10-hint-overlay').hidden = true;
}

document.querySelectorAll('#s9 .scq-opt').forEach(function (opt) {
  opt.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      scq10Select(opt.dataset.id);
    }
  });
});

document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  if (!document.getElementById('scq8-hint-overlay').hidden) scq8CloseHint();
  if (!document.getElementById('s9-hint-overlay').hidden) s9CloseHint();
  if (!document.getElementById('scq10-hint-overlay').hidden) scq10CloseHint();
  if (!document.getElementById('scq13-hint-overlay').hidden) scq13CloseHint();
  if (!document.getElementById('scq14-hint-overlay').hidden) scq14CloseHint();
});

/* =========================================================
   מסך 11 — משחק זיכרון (Memory Game)
   עודכן לפי עיצוב Figma חדש (ר' הערת CSS למעלה) — קלפים ללא תמונות,
   V/X מיובאים מ-Figma, ותג אות (א/ב/ג) בתום המשחק במקום צביעה לפי זוג.
   ההשהיה אחרי התאמה נכונה קוצרה משמעותית לפי בקשת הלקוחה (מ-2 שניות
   ל-600ms) כדי לאפשר ללומד להמשיך ללחוץ על הזוג הבא מהר יותר.
   ========================================================= */

const S11_PAIR_LETTERS = ['א', 'ב', 'ג'];

const S11_PAIRS = [
  { pairId: 0, texts: ['1 טון', '1000 קילוגרם'] },
  { pairId: 1, texts: ['1 קילוגרם', '1000 גרם'] },
  { pairId: 2, texts: ['1 גרם', '1000 מיליגרם'] }
];

let s11Cards = [];
let s11Flipped = [];
let s11Locked = false;
let s11Matches = 0;
let s11Done = false;
let s11SingleTimer = null;

function s11Init() {
  if (s11SingleTimer) { clearTimeout(s11SingleTimer); s11SingleTimer = null; }

  const all = [];
  S11_PAIRS.forEach(function (pair) {
    pair.texts.forEach(function (txt) {
      all.push({ pairId: pair.pairId, text: txt, matched: false });
    });
  });

  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = all[i]; all[i] = all[j]; all[j] = tmp;
  }
  s11Cards = all;
  s11Flipped = [];
  s11Locked = false;
  s11Matches = 0;
  s11Done = false;

  document.getElementById('s11-btn-continue').disabled = true;
  document.getElementById('s11-game-view').hidden = false;
  document.getElementById('s11-summary-view').hidden = true;

  s11UpdatePairsCounter();
  s11RenderBoard();
}

function s11UpdatePairsCounter() {
  const el = document.getElementById('s11-pairs-counter');
  if (el) el.textContent = 'זוגות שנמצאו: ' + s11Matches + ' מתוך 3';
}

function s11RenderBoard() {
  const board = document.getElementById('s11-board');
  if (!board) return;
  board.innerHTML = '';

  s11Cards.forEach(function (card, idx) {
    const el = document.createElement('div');
    el.className = 's11-card';
    el.setAttribute('data-idx', String(idx));
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', 'קלף');
    el.innerHTML =
      '<div class="s11-card-inner">' +
        '<div class="s11-card-face s11-card-back"><span class="s11-card-qmark">?</span></div>' +
        '<div class="s11-card-face s11-card-front">' +
          '<span class="s11-card-text">' + card.text + '</span>' +
          '<span class="s11-badge" aria-hidden="true"></span>' +
          '<span class="s11-pair-tag" aria-hidden="true">' + S11_PAIR_LETTERS[card.pairId] + '</span>' +
        '</div>' +
      '</div>';

    el.addEventListener('click', (function (i) {
      return function () { s11CardClick(i); };
    }(idx)));
    el.addEventListener('keydown', (function (i) {
      return function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s11CardClick(i); } };
    }(idx)));

    board.appendChild(el);
  });
}

function s11CardClick(idx) {
  if (s11Locked) return;
  const card = s11Cards[idx];
  if (!card || card.matched) return;

  const el = document.querySelector('.s11-card[data-idx="' + idx + '"]');
  if (!el || el.classList.contains('s11-flipped')) return;

  el.classList.add('s11-flipped');
  s11Flipped.push(idx);

  if (s11Flipped.length === 1) {
    s11SingleTimer = setTimeout(function () {
      if (s11Flipped.length === 1) {
        const first = document.querySelector('.s11-card[data-idx="' + s11Flipped[0] + '"]');
        if (first) first.classList.remove('s11-flipped');
        s11Flipped = [];
      }
    }, 5000);

  } else if (s11Flipped.length === 2) {
    clearTimeout(s11SingleTimer);
    s11SingleTimer = null;
    s11Locked = true;

    const idx1 = s11Flipped[0];
    const idx2 = s11Flipped[1];
    const el1 = document.querySelector('.s11-card[data-idx="' + idx1 + '"]');
    const el2 = document.querySelector('.s11-card[data-idx="' + idx2 + '"]');

    setTimeout(function () {
      if (s11Cards[idx1].pairId === s11Cards[idx2].pairId) {
        [el1, el2].forEach(function (e) { if (e) e.classList.add('s11-matched', 's11-match-flash'); });
        s11Cards[idx1].matched = true;
        s11Cards[idx2].matched = true;
        s11Flipped = [];
        s11Matches++;
        s11UpdatePairsCounter();

        if (s11Matches === 3) {
          s11Done = true;
          document.getElementById('s11-btn-continue').disabled = false;
        }

        // הבזק ירוק+וי קצר, ואז הזוג "מתיישב" למראה הסופי (לפי Figma) —
        // per-pair מיד עם ההתאמה, לא מחכה שכל 3 הזוגות יימצאו
        setTimeout(function () {
          [el1, el2].forEach(function (e) { if (e) e.classList.remove('s11-match-flash'); });
          s11Locked = false;
        }, 600);

      } else {
        if (el1) el1.classList.add('s11-nomatch');
        if (el2) el2.classList.add('s11-nomatch');

        setTimeout(function () {
          if (el1) el1.classList.remove('s11-flipped', 's11-nomatch');
          if (el2) el2.classList.remove('s11-flipped', 's11-nomatch');
          s11Flipped = [];
          s11Locked = false;
        }, 2000);
      }
    }, 400);
  }
}

function s11Continue() {
  if (!s11Done) return;
  document.getElementById('s11-game-view').hidden = true;
  document.getElementById('s11-summary-view').hidden = false;
}

function s11SumContinue() { goTo(11); }

function s11SumBack() {
  document.getElementById('s11-summary-view').hidden = true;
  document.getElementById('s11-game-view').hidden = false;
}

function resetScreenState10() {
  if (s11Done) {
    document.getElementById('s11-game-view').hidden = true;
    document.getElementById('s11-summary-view').hidden = false;
    return;
  }
  if (s11Matches > 0) return; // resume-state: זיווג שבוצע כבר לא נמחק (לוח לא מתאתחל) בחזרה למסך
  s11Init();
}

/* =========================================================
   מסך 12 — מסך מעבר: דמות מלווה
   ========================================================= */

function resetScreenState11() {
  const img = document.getElementById('s12-avatar-img');
  if (img) {
    const src = (window.lomdaState.selectedCharacter === 'green')
      ? 'assets/images/avatar-green-workout.gif'
      : 'assets/images/avatar-orange-workout.gif';
    if (!img.src.endsWith(src)) {
      img.src = src;
    }
  }
}

function s12Continue() {
  goTo(12);
}

/* =========================================================
   מסך 13 — SingleChoiceQuestion (זהו את סוג המסה)
   ========================================================= */

const SCQ13 = {
  correctId: 'b', // המים שבבקבוק
  maxAttempts: 2,
  feedback: {
    correct: {
      title: 'מצוין!',
      body: 'נטו הוא המסה של התכולה בלבד, ללא האריזה או המיכל.\nבמקרה זה, הנטו הוא המים שבתוך הבקבוק.'
    },
    wrong1: {
      title: 'התשובה אינה נכונה.',
      body: 'לא נורא, גם מטעויות לומדים.\nננסה שוב?'
    },
    wrong2: {
      title: 'התשובה אינה נכונה.',
      body: 'נטו הוא המסה של התכולה בלבד, ללא האריזה או המיכל.\nבמקרה זה, הנטו הוא המים שבתוך הבקבוק.'
    }
  }
};

let scq13Selected = null;
let scq13Attempts = 0;
let scq13Done = false;
let scq13Phase = 'before';

function scq13OptEl(id) {
  return document.querySelector('#s12 .scq-opt[data-id="' + id + '"]');
}

function scq13Select(id) {
  if (scq13Done) return;
  const wasWrong1 = (scq13Phase === 'wrong1');
  document.querySelectorAll('#s12 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong');
    el.setAttribute('aria-checked', 'false');
  });
  const selectedEl = scq13OptEl(id);
  selectedEl.classList.add('selected');
  selectedEl.setAttribute('aria-checked', 'true');
  scq13Selected = id;
  scq13Phase = 'selected';
  if (wasWrong1) {
    document.getElementById('scq13-feedbox').classList.remove('visible');
  }
  const checkBtn = document.getElementById('scq13-check');
  checkBtn.textContent = 'צדקתי?';
  checkBtn.disabled = false;
  checkBtn.onclick = scq13Check;
}

function scq13ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('scq13-feedbox');
  const data = SCQ13.feedback[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition(box.id);
  box.classList.add('visible');
}

function scq13SetBarDone(label, handler) {
  const checkBtn = document.getElementById('scq13-check');
  checkBtn.textContent = label;
  checkBtn.disabled = false;
  checkBtn.onclick = handler;
  document.getElementById('scq13-hint').hidden = true;
}

function scq13Check() {
  if (!scq13Selected || scq13Done) return;
  scq13Attempts++;
  const optEl = scq13OptEl(scq13Selected);
  xapiAnswered('008', 'q1', scq13Selected === SCQ13.correctId, scq13Selected === SCQ13.correctId || scq13Attempts >= SCQ13.maxAttempts, xapiAnswerText(optEl));

  if (scq13Selected === SCQ13.correctId) {
    optEl.classList.add('correct');
    optEl.classList.remove('selected');
    scq13Phase = 'correct';
    scq13Done = true;
    scq13LockOptions();
    scq13ShowFeedback('correct', true);
    scq13SetBarDone('המשך', function () { scq13Continue(); });
    return;
  }

  optEl.classList.add('wrong');
  optEl.classList.remove('selected');

  if (scq13Attempts < SCQ13.maxAttempts) {
    scq13Phase = 'wrong1';
    scq13ShowFeedback('wrong1', false);
    const checkBtn = document.getElementById('scq13-check');
    checkBtn.textContent = 'צדקתי?';
    checkBtn.disabled = true;
    checkBtn.onclick = scq13Check;
    const hintBtn = document.getElementById('scq13-hint');
    hintBtn.hidden = false;
    hintBtn.disabled = false;
  } else {
    scq13OptEl(SCQ13.correctId).classList.add('correct');
    scq13Phase = 'wrong-final';
    scq13Done = true;
    scq13LockOptions();
    scq13ShowFeedback('wrong2', false);
    scq13SetBarDone('המשך', function () { scq13Continue(); });
  }

  /* resume: שמירה סינכרונית ברגע מחויבות התשובה. השמירה המושהית שבסוף goTo()
     לא מספיקה כאן — תשובה שניתנה ואז הלשונית נהרגה לפני הניווט הבא הייתה
     נאבדת. עטוף: דיווח ושמירה לעולם לא שוברים את זרימת התשובה. */
  try { flushResumeSave(); } catch (e) {}
}

function scq13LockOptions() {
  document.querySelectorAll('#s12 .scq-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.onclick = null;
  });
}

function scq13UnlockOptions() {
  document.querySelectorAll('#s12 .scq-opt').forEach(function (el) {
    el.classList.remove('disabled');
    el.onclick = function () { scq13Select(el.dataset.id); };
  });
}

function scq13Continue() {
  goTo(13);
}

function scq13OpenHint() {
  if (scq13Done) return;
  /* xAPI: requested.1 — מוצב אחרי כל הגארדים ומיד לפני שהרמז
     באמת נחשף, כדי לא לדווח בקשה שלא קרתה. הפונקציה פותחת בלבד
     (hidden=false) ולא toggle, ולכן אין סיכון לדיווח כפול. */
  xapiRequestedHint('008', 'q1');
  document.getElementById('scq13-hint-overlay').hidden = false;
}

function scq13CloseHint() {
  document.getElementById('scq13-hint-overlay').hidden = true;
}

document.getElementById('scq13-hint-overlay').addEventListener('click', function (e) {
  if (e.target === this) scq13CloseHint();
});

function resetScreenState12() {
  if (scq13Done || scq13Attempts > 0 || scq13Selected) return; // resume-state: שאלה שהתחילה (אפילו לא הסתיימה) לא נמחקת בחזרה למסך
  scq13Selected = null;
  scq13Attempts = 0;
  scq13Phase = 'before';
  scq13UnlockOptions();
  document.querySelectorAll('#s12 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong', 'correct');
    el.setAttribute('aria-checked', 'false');
  });
  document.getElementById('scq13-feedbox').classList.remove('visible');
  const checkBtn = document.getElementById('scq13-check');
  checkBtn.textContent = 'צדקתי?';
  checkBtn.disabled = true;
  checkBtn.onclick = scq13Check;
  const hintBtn = document.getElementById('scq13-hint');
  hintBtn.hidden = true;
  hintBtn.disabled = false;
  document.getElementById('scq13-hint-icon').src = 'assets/images/icon-hint-blue.svg';
  document.getElementById('scq13-hint-overlay').hidden = true;
}

document.querySelectorAll('#s12 .scq-opt').forEach(function (opt) {
  opt.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      scq13Select(opt.dataset.id);
    }
  });
});

/* =========================================================
   מסך 14 — MultipleChoiceQuestion (מהי טרה?)
   ========================================================= */

const MCQ14 = {
  correctIds: ['a', 'b'], // קופסת הקרטון הריקה, פחית השתייה הריקה
  maxAttempts: 2,
  feedback: {
    correct: {
      title: 'מצוין!',
      body: 'טרה = האריזה או המיכל הריק בלבד.'
    },
    wrong1: {
      title: 'התשובה אינה נכונה.',
      body: 'ננסה שוב?'
    },
    wrong2: {
      title: 'התשובה לא נכונה.',
      body: 'טרה = האריזה או המיכל הריק בלבד.'
    }
  }
};

let scq14Selected = [];
let scq14Attempts = 0;
let scq14Done = false;
let scq14Phase = 'before';

function scq14OptEl(id) {
  return document.querySelector('#s13 .scq-opt[data-id="' + id + '"]');
}

function scq14Toggle(id) {
  if (scq14Done) return;
  const wasWrong = (scq14Phase === 'wrong1');
  if (wasWrong) {
    document.querySelectorAll('#s13 .scq-opt').forEach(function (el) {
      el.classList.remove('wrong');
    });
    document.getElementById('scq14-feedbox').classList.remove('visible');
    scq14Phase = 'before';
  }
  const el = scq14OptEl(id);
  const idx = scq14Selected.indexOf(id);
  if (idx >= 0) {
    scq14Selected.splice(idx, 1);
    el.classList.remove('selected');
    el.setAttribute('aria-checked', 'false');
  } else {
    scq14Selected.push(id);
    el.classList.add('selected');
    el.setAttribute('aria-checked', 'true');
  }
  if (scq14Selected.length > 0) scq14Phase = 'selected';
  const checkBtn = document.getElementById('scq14-check');
  checkBtn.textContent = 'צדקתי?';
  checkBtn.disabled = scq14Selected.length === 0;
  checkBtn.onclick = scq14Check;
}

function scq14ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('scq14-feedbox');
  const data = MCQ14.feedback[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition(box.id);
  box.classList.add('visible');
}

function scq14SetBarDone(label, handler) {
  const checkBtn = document.getElementById('scq14-check');
  checkBtn.textContent = label;
  checkBtn.disabled = false;
  checkBtn.onclick = handler;
  document.getElementById('scq14-hint').hidden = true;
}

function scq14Check() {
  if (scq14Selected.length === 0 || scq14Done) return;
  scq14Attempts++;
  const correct = MCQ14.correctIds;
  const isCorrect = correct.length === scq14Selected.length &&
    correct.every(function (cid) { return scq14Selected.indexOf(cid) >= 0; });
  xapiAnswered('009', 'q1', isCorrect, isCorrect || scq14Attempts >= MCQ14.maxAttempts, xapiMultiAnswer(scq14Selected, scq14OptEl));

  if (isCorrect) {
    scq14Phase = 'correct';
    scq14Done = true;
    correct.forEach(function (cid) {
      const el = scq14OptEl(cid);
      el.classList.remove('selected');
      el.classList.add('correct');
    });
    scq14LockOptions();
    scq14ShowFeedback('correct', true);
    scq14SetBarDone('המשך', function () { scq14Continue(); });
    return;
  }

  document.querySelectorAll('#s13 .scq-opt').forEach(function (el) {
    if (scq14Selected.indexOf(el.dataset.id) >= 0) {
      el.classList.remove('selected');
      el.classList.add(correct.indexOf(el.dataset.id) >= 0 ? 'correct' : 'wrong');
    }
  });
  scq14Selected = [];

  if (scq14Attempts < MCQ14.maxAttempts) {
    scq14Phase = 'wrong1';
    scq14ShowFeedback('wrong1', false);
    const checkBtn = document.getElementById('scq14-check');
    checkBtn.textContent = 'צדקתי?';
    checkBtn.disabled = true;
    checkBtn.onclick = scq14Check;
    const hintBtn = document.getElementById('scq14-hint');
    hintBtn.hidden = false;
    hintBtn.disabled = false;
  } else {
    correct.forEach(function (cid) {
      const el = scq14OptEl(cid);
      el.classList.remove('wrong');
      el.classList.add('correct');
    });
    scq14Phase = 'wrong-final';
    scq14Done = true;
    scq14LockOptions();
    scq14ShowFeedback('wrong2', false);
    scq14SetBarDone('המשך', function () { scq14Continue(); });
  }

  /* resume: שמירה סינכרונית ברגע מחויבות התשובה. השמירה המושהית שבסוף goTo()
     לא מספיקה כאן — תשובה שניתנה ואז הלשונית נהרגה לפני הניווט הבא הייתה
     נאבדת. עטוף: דיווח ושמירה לעולם לא שוברים את זרימת התשובה. */
  try { flushResumeSave(); } catch (e) {}
}

function scq14LockOptions() {
  document.querySelectorAll('#s13 .scq-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.onclick = null;
  });
}

function scq14UnlockOptions() {
  document.querySelectorAll('#s13 .scq-opt').forEach(function (el) {
    el.classList.remove('disabled');
    el.onclick = function () { scq14Toggle(el.dataset.id); };
  });
}

function scq14Continue() {
  goTo(14);
}

function scq14OpenHint() {
  if (scq14Done) return;
  /* xAPI: requested.1 — מוצב אחרי כל הגארדים ומיד לפני שהרמז
     באמת נחשף, כדי לא לדווח בקשה שלא קרתה. הפונקציה פותחת בלבד
     (hidden=false) ולא toggle, ולכן אין סיכון לדיווח כפול. */
  xapiRequestedHint('009', 'q1');
  document.getElementById('scq14-hint-overlay').hidden = false;
}

function scq14CloseHint() {
  document.getElementById('scq14-hint-overlay').hidden = true;
}

document.getElementById('scq14-hint-overlay').addEventListener('click', function (e) {
  if (e.target === this) scq14CloseHint();
});

function resetScreenState13() {
  if (scq14Done || scq14Attempts > 0 || scq14Selected.length > 0) return; // resume-state: שאלה שהתחילה (אפילו לא הסתיימה) לא נמחקת בחזרה למסך
  scq14Selected = [];
  scq14Attempts = 0;
  scq14Phase = 'before';
  scq14UnlockOptions();
  document.querySelectorAll('#s13 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong', 'correct');
    el.setAttribute('aria-checked', 'false');
  });
  document.getElementById('scq14-feedbox').classList.remove('visible');
  const checkBtn = document.getElementById('scq14-check');
  checkBtn.textContent = 'צדקתי?';
  checkBtn.disabled = true;
  checkBtn.onclick = scq14Check;
  const hintBtn = document.getElementById('scq14-hint');
  hintBtn.hidden = true;
  hintBtn.disabled = false;
  document.getElementById('scq14-hint-icon').src = 'assets/images/icon-hint-blue.svg';
  document.getElementById('scq14-hint-overlay').hidden = true;
}

document.querySelectorAll('#s13 .scq-opt').forEach(function (opt) {
  opt.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      scq14Toggle(opt.dataset.id);
    }
  });
});

/* =========================================================
   מסך 15 — מסך מעבר: דמות + בועית דיבור
   ========================================================= */

function resetScreenState14() {
  const video = document.getElementById('s15-avatar-img');
  if (video) {
    video.src = (window.lomdaState.selectedCharacter === 'green')
      ? 'assets/videos/avatar-green-clapping-hands.mp4'
      : 'assets/videos/avatar-orange-clapping-hands.mp4';
    video.load();
    video.play().catch(function () {});
  }
}

function s15Continue() {
  goTo(15);
}

/* =========================================================
   stationProgress — מעקב שאלות תחנה (מסכים 16-20, שאלות 1-5)
   סרגל ההתקדמות המשותף (updateQuestionNav) קורא מהאובייקט הזה
   ========================================================= */

let stationProgress = { q16: null, q17: null, q18: null, q19: null, q20: null };

/* מאוחד לפונקציה אחת פרמטרית — בלומדה הקודמת זה היה משוכפל 5
   פעמים (sNNUpdateProgressBar) עם קוד זהה, פרט למסך 19 שם הוטבע
   currentIdx=3 בקוד קשיח + סרגל עם 6 עיגולים במקום 5 (באג). כאן כל
   5 המסכים מחשבים את currentIdx דינמית מ-stationProgress, אחיד */
function updateQuestionNav(prefix) {
  const qs = [stationProgress.q16, stationProgress.q17, stationProgress.q18,
              stationProgress.q19, stationProgress.q20];
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
   מסך 16 — שאלה 1/5: SingleChoiceQuestion (מהו הברוטו?)
   ========================================================= */

const SCQ16 = {
  correctId: 'c', // האריזה והמתנה ביחד
  maxAttempts: 2,
  feedback: {
    correct: {
      title: 'מצוין!',
      body: 'ברוטו הוא המסה הכוללת את המתנה עצמה ואת האריזה.'
    },
    wrong1: {
      title: 'התשובה אינה נכונה.',
      body: 'ננסה שוב?'
    },
    wrong2: {
      title: 'התשובה אינה נכונה.',
      body: 'ברוטו הוא המסה הכוללת את המתנה עצמה ואת האריזה.'
    }
  }
};

let scq16Selected = null;
let scq16Attempts = 0;
let scq16Done = false;
let scq16Phase = 'before';

function scq16OptEl(id) {
  return document.querySelector('#s15 .scq-opt[data-id="' + id + '"]');
}

function scq16Select(id) {
  if (scq16Done) return;
  const wasWrong1 = (scq16Phase === 'wrong1');
  document.querySelectorAll('#s15 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong');
    el.setAttribute('aria-checked', 'false');
  });
  const selectedEl = scq16OptEl(id);
  selectedEl.classList.add('selected');
  selectedEl.setAttribute('aria-checked', 'true');
  scq16Selected = id;
  scq16Phase = 'selected';
  if (wasWrong1) {
    document.getElementById('scq16-feedbox').classList.remove('visible');
  }
  const checkBtn = document.getElementById('scq16-check');
  checkBtn.textContent = 'צדקתי?';
  checkBtn.disabled = false;
  checkBtn.onclick = scq16Check;
}

function scq16ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('scq16-feedbox');
  const data = SCQ16.feedback[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition(box.id);
  box.classList.add('visible');
}

function scq16SetBarDone(label, handler) {
  const checkBtn = document.getElementById('scq16-check');
  checkBtn.textContent = label;
  checkBtn.disabled = false;
  checkBtn.onclick = handler;
  document.getElementById('scq16-hint').hidden = true;
}

function scq16Check() {
  if (!scq16Selected || scq16Done) return;
  scq16Attempts++;
  const optEl = scq16OptEl(scq16Selected);
  xapiAnswered('010', 'q1', scq16Selected === SCQ16.correctId, scq16Selected === SCQ16.correctId || scq16Attempts >= SCQ16.maxAttempts, xapiAnswerText(optEl));

  if (scq16Selected === SCQ16.correctId) {
    optEl.classList.add('correct');
    optEl.classList.remove('selected');
    scq16Phase = 'correct';
    scq16Done = true;
    scq16LockOptions();
    scq16ShowFeedback('correct', true);
    scq16SetBarDone('המשך', function () { scq16Continue(); });
    stationProgress.q16 = 'success';
    updateQuestionNav('s16');
    return;
  }

  optEl.classList.add('wrong');
  optEl.classList.remove('selected');

  if (scq16Attempts < SCQ16.maxAttempts) {
    scq16Phase = 'wrong1';
    scq16ShowFeedback('wrong1', false);
    const checkBtn = document.getElementById('scq16-check');
    checkBtn.textContent = 'צדקתי?';
    checkBtn.disabled = true;
    checkBtn.onclick = scq16Check;
    const hintBtn = document.getElementById('scq16-hint');
    hintBtn.hidden = false;
    hintBtn.disabled = false;
  } else {
    scq16OptEl(SCQ16.correctId).classList.add('correct');
    scq16Phase = 'wrong-final';
    scq16Done = true;
    scq16LockOptions();
    scq16ShowFeedback('wrong2', false);
    scq16SetBarDone('המשך', function () { scq16Continue(); });
    stationProgress.q16 = 'fail';
    updateQuestionNav('s16');
  }

  /* resume: שמירה סינכרונית ברגע מחויבות התשובה. השמירה המושהית שבסוף goTo()
     לא מספיקה כאן — תשובה שניתנה ואז הלשונית נהרגה לפני הניווט הבא הייתה
     נאבדת. עטוף: דיווח ושמירה לעולם לא שוברים את זרימת התשובה. */
  try { flushResumeSave(); } catch (e) {}
}

function scq16LockOptions() {
  document.querySelectorAll('#s15 .scq-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.onclick = null;
  });
}

function scq16UnlockOptions() {
  document.querySelectorAll('#s15 .scq-opt').forEach(function (el) {
    el.classList.remove('disabled');
    el.onclick = function () { scq16Select(el.dataset.id); };
  });
}

function scq16Continue() {
  goTo(16);
}

function scq16OpenHint() {
  if (scq16Done) return;
  /* xAPI: requested.1 — מוצב אחרי כל הגארדים ומיד לפני שהרמז
     באמת נחשף, כדי לא לדווח בקשה שלא קרתה. הפונקציה פותחת בלבד
     (hidden=false) ולא toggle, ולכן אין סיכון לדיווח כפול. */
  xapiRequestedHint('010', 'q1');
  document.getElementById('scq16-hint-overlay').hidden = false;
}

function scq16CloseHint() {
  document.getElementById('scq16-hint-overlay').hidden = true;
}

document.getElementById('scq16-hint-overlay').addEventListener('click', function (e) {
  if (e.target === this) scq16CloseHint();
});

function resetScreenState15() {
  updateQuestionNav('s16');
  if (scq16Done || scq16Attempts > 0 || scq16Selected) return; // resume-state: שאלה שהתחילה (אפילו לא הסתיימה) לא נמחקת בחזרה למסך
  scq16Selected = null;
  scq16Attempts = 0;
  scq16Phase = 'before';
  scq16UnlockOptions();
  document.querySelectorAll('#s15 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong', 'correct');
    el.setAttribute('aria-checked', 'false');
  });
  document.getElementById('scq16-feedbox').classList.remove('visible');
  const checkBtn = document.getElementById('scq16-check');
  checkBtn.textContent = 'צדקתי?';
  checkBtn.disabled = true;
  checkBtn.onclick = scq16Check;
  const hintBtn = document.getElementById('scq16-hint');
  hintBtn.hidden = true;
  hintBtn.disabled = false;
  document.getElementById('scq16-hint-icon').src = 'assets/images/icon-hint-blue.svg';
  document.getElementById('scq16-hint-overlay').hidden = true;
}

document.querySelectorAll('#s15 .scq-opt').forEach(function (opt) {
  opt.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      scq16Select(opt.dataset.id);
    }
  });
});

/* =========================================================
   מסך 17 — שאלה 2/5: SingleChoiceQuestion (מהי הטרה?)
   ========================================================= */

const SCQ17 = {
  correctId: 'a', // הסל
  maxAttempts: 2,
  feedback: {
    correct: {
      title: 'מצוין!',
      body: 'טרה היא המסה של האריזה או המיכל בלבד.\n במקרה זה, הטרה היא הסלסילה ללא הפירות שבתוכה.'
    },
    wrong1: {
      title: 'התשובה אינה נכונה.',
      body: 'ננסה שוב?'
    },
    wrong2: {
      title: 'התשובה לא נכונה.',
      body: 'טרה היא המסה של האריזה או המיכל בלבד.\n במקרה זה, הטרה היא הסלסילה ללא הפירות שבתוכה.'
    }
  }
};

let scq17Selected = null;
let scq17Attempts = 0;
let scq17Done = false;
let scq17Phase = 'before';

function scq17OptEl(id) {
  return document.querySelector('#s16 .scq-opt[data-id="' + id + '"]');
}

function scq17Select(id) {
  if (scq17Done) return;
  const wasWrong1 = (scq17Phase === 'wrong1');
  document.querySelectorAll('#s16 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong');
    el.setAttribute('aria-checked', 'false');
  });
  const selectedEl = scq17OptEl(id);
  selectedEl.classList.add('selected');
  selectedEl.setAttribute('aria-checked', 'true');
  scq17Selected = id;
  scq17Phase = 'selected';
  if (wasWrong1) {
    document.getElementById('scq17-feedbox').classList.remove('visible');
  }
  const checkBtn = document.getElementById('scq17-check');
  checkBtn.textContent = 'צדקתי?';
  checkBtn.disabled = false;
  checkBtn.onclick = scq17Check;
}

function scq17ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('scq17-feedbox');
  const data = SCQ17.feedback[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition(box.id);
  box.classList.add('visible');
}

function scq17SetBarDone(label, handler) {
  const checkBtn = document.getElementById('scq17-check');
  checkBtn.textContent = label;
  checkBtn.disabled = false;
  checkBtn.onclick = handler;
  document.getElementById('scq17-hint').hidden = true;
}

function scq17Check() {
  if (!scq17Selected || scq17Done) return;
  scq17Attempts++;
  const optEl = scq17OptEl(scq17Selected);
  xapiAnswered('011', 'q1', scq17Selected === SCQ17.correctId, scq17Selected === SCQ17.correctId || scq17Attempts >= SCQ17.maxAttempts, xapiAnswerText(optEl));

  if (scq17Selected === SCQ17.correctId) {
    optEl.classList.add('correct');
    optEl.classList.remove('selected');
    scq17Phase = 'correct';
    scq17Done = true;
    scq17LockOptions();
    scq17ShowFeedback('correct', true);
    scq17SetBarDone('המשך', function () { scq17Continue(); });
    stationProgress.q17 = 'success';
    updateQuestionNav('s17');
    return;
  }

  optEl.classList.add('wrong');
  optEl.classList.remove('selected');

  if (scq17Attempts < SCQ17.maxAttempts) {
    scq17Phase = 'wrong1';
    scq17ShowFeedback('wrong1', false);
    const checkBtn = document.getElementById('scq17-check');
    checkBtn.textContent = 'צדקתי?';
    checkBtn.disabled = true;
    checkBtn.onclick = scq17Check;
    const hintBtn = document.getElementById('scq17-hint');
    hintBtn.hidden = false;
    hintBtn.disabled = false;
  } else {
    scq17OptEl(SCQ17.correctId).classList.add('correct');
    scq17Phase = 'wrong-final';
    scq17Done = true;
    scq17LockOptions();
    scq17ShowFeedback('wrong2', false);
    scq17SetBarDone('המשך', function () { scq17Continue(); });
    stationProgress.q17 = 'fail';
    updateQuestionNav('s17');
  }

  /* resume: שמירה סינכרונית ברגע מחויבות התשובה. השמירה המושהית שבסוף goTo()
     לא מספיקה כאן — תשובה שניתנה ואז הלשונית נהרגה לפני הניווט הבא הייתה
     נאבדת. עטוף: דיווח ושמירה לעולם לא שוברים את זרימת התשובה. */
  try { flushResumeSave(); } catch (e) {}
}

function scq17LockOptions() {
  document.querySelectorAll('#s16 .scq-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.onclick = null;
  });
}

function scq17UnlockOptions() {
  document.querySelectorAll('#s16 .scq-opt').forEach(function (el) {
    el.classList.remove('disabled');
    el.onclick = function () { scq17Select(el.dataset.id); };
  });
}

function scq17Continue() {
  goTo(17);
}

function scq17OpenHint() {
  if (scq17Done) return;
  /* xAPI: requested.1 — מוצב אחרי כל הגארדים ומיד לפני שהרמז
     באמת נחשף, כדי לא לדווח בקשה שלא קרתה. הפונקציה פותחת בלבד
     (hidden=false) ולא toggle, ולכן אין סיכון לדיווח כפול. */
  xapiRequestedHint('011', 'q1');
  document.getElementById('scq17-hint-overlay').hidden = false;
}

function scq17CloseHint() {
  document.getElementById('scq17-hint-overlay').hidden = true;
}

document.getElementById('scq17-hint-overlay').addEventListener('click', function (e) {
  if (e.target === this) scq17CloseHint();
});

function resetScreenState16() {
  updateQuestionNav('s17');
  if (scq17Done || scq17Attempts > 0 || scq17Selected) return; // resume-state: שאלה שהתחילה (אפילו לא הסתיימה) לא נמחקת בחזרה למסך
  scq17Selected = null;
  scq17Attempts = 0;
  scq17Phase = 'before';
  scq17UnlockOptions();
  document.querySelectorAll('#s16 .scq-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong', 'correct');
    el.setAttribute('aria-checked', 'false');
  });
  document.getElementById('scq17-feedbox').classList.remove('visible');
  const checkBtn = document.getElementById('scq17-check');
  checkBtn.textContent = 'צדקתי?';
  checkBtn.disabled = true;
  checkBtn.onclick = scq17Check;
  const hintBtn = document.getElementById('scq17-hint');
  hintBtn.hidden = true;
  hintBtn.disabled = false;
  document.getElementById('scq17-hint-icon').src = 'assets/images/icon-hint-blue.svg';
  document.getElementById('scq17-hint-overlay').hidden = true;
}

document.querySelectorAll('#s16 .scq-opt').forEach(function (opt) {
  opt.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      scq17Select(opt.dataset.id);
    }
  });
});

/* =========================================================
   מסך 18 — שאלה 3/5: טבלת השלמה עם אינפוטים (חשבו את המסה)
   ========================================================= */

const S18_IDS = ['s18-input-1', 's18-input-2', 's18-input-3', 's18-input-4'];
const S18_ANSWERS = { 's18-input-1': '750', 's18-input-2': '50', 's18-input-3': '6', 's18-input-4': '4' };
const TEXTS18 = {
  correct: {
    title: 'התשובה נכונה.',
    body: 'כדי להשלים את הנתונים השתמשנו בקשר בין מושגי המסה:\nנטו + טרה = ברוטו'
  },
  wrong1: {
    title: 'התשובה אינה נכונה.',
    body: 'נסו לחשב שוב את התשובות שסומנו כשגויות'
  },
  wrongPending: {
    title: 'התשובה אינה נכונה.',
    body: 'רוצים לראות את הפתרון הנכון?'
  },
  wrong2: {
    title: 'התשובה אינה נכונה.',
    body: 'כדי להשלים את הנתונים השתמשנו בקשר בין מושגי המסה:\nנטו + טרה = ברוטו'
  }
};

let s18Done = false;
let s18Attempts = 0;
let s18Phase = 'before';
let s18LastAnswer = null;
let s18ShowingCorrect = false;

function s18OnInput() {
  const allFilled = S18_IDS.every(function (id) {
    const el = document.getElementById(id);
    return el && el.value.trim() !== '';
  });
  document.getElementById('s18-check').disabled = !allFilled;
}

function s18ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('s18-feedbox');
  const data = TEXTS18[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition(box.id);
  box.classList.add('visible');
}

function s18SetBarDone(label, handler) {
  const checkBtn = document.getElementById('s18-check');
  checkBtn.textContent = label;
  checkBtn.disabled = false;
  checkBtn.onclick = handler;
  document.getElementById('s18-hint').hidden = true;
}

function s18LockInputs(revealCorrect) {
  S18_IDS.forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.disabled = true;
    if (revealCorrect) {
      el.value = S18_ANSWERS[id];
      el.classList.add('s18-input-revealed');
    }
  });
}

function s18ClearInputStateClasses() {
  S18_IDS.forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('s18-input-correct', 's18-input-wrong', 's18-input-revealed');
  });
}

function s18MarkInputs() {
  S18_IDS.forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (parseFloat(el.value) === parseFloat(S18_ANSWERS[id])) {
      el.classList.add('s18-input-correct');
    } else {
      el.classList.add('s18-input-wrong');
    }
  });
}

function s18ShowMyAnswer() {
  s18ClearInputStateClasses();
  S18_IDS.forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.value = s18LastAnswer[id];
  });
  s18MarkInputs();
  s18ShowFeedback('wrongPending', false);
}

function s18Reveal() {
  const revealBtn = document.getElementById('s18-reveal-btn');
  if (s18ShowingCorrect) {
    s18ShowMyAnswer();
    s18ShowingCorrect = false;
    if (revealBtn) revealBtn.textContent = 'התשובה הנכונה';
  } else {
    s18ClearInputStateClasses();
    s18LockInputs(true);
    s18ShowFeedback('wrong2', false);
    s18ShowingCorrect = true;
    if (revealBtn) revealBtn.textContent = 'התשובה שלי';
  }
}

function s18Check() {
  if (s18Done) return;
  s18Attempts++;
  const allCorrect = S18_IDS.every(function (id) {
    const el = document.getElementById(id);
    return el && parseFloat(el.value) === parseFloat(S18_ANSWERS[id]);
  });
  xapiAnswered('012', 'q1', allCorrect, allCorrect || s18Attempts >= 2, xapiFieldsAnswer(S18_IDS));

  if (allCorrect) {
    s18Done = true;
    s18Phase = 'correct';
    s18ClearInputStateClasses();
    s18LockInputs(false);
    s18MarkInputs();
    s18ShowFeedback('correct', true);
    s18SetBarDone('המשך', function () { s18Continue(); });
    stationProgress.q18 = 'success';
    updateQuestionNav('s18');
  } else if (s18Attempts < 2) {
    s18Phase = 'wrong1';
    s18ClearInputStateClasses();
    s18MarkInputs();
    s18ShowFeedback('wrong1', false);
    document.getElementById('s18-check').disabled = true;
    const hintBtn = document.getElementById('s18-hint');
    hintBtn.hidden = false;
    hintBtn.disabled = false;
  } else {
    s18Done = true;
    s18Phase = 'wrong-final';
    /* דריסה: הפתרון לא נחשף אוטומטית — רק בלחיצה על "התשובה הנכונה" */
    s18LastAnswer = {};
    S18_IDS.forEach(function (id) {
      const el = document.getElementById(id);
      s18LastAnswer[id] = el ? el.value : '';
    });
    s18ClearInputStateClasses();
    s18LockInputs(false);
    s18MarkInputs();
    s18ShowingCorrect = false;
    s18ShowFeedback('wrongPending', false);
    const revealBtn = document.getElementById('s18-reveal-btn');
    if (revealBtn) { revealBtn.hidden = false; revealBtn.textContent = 'התשובה הנכונה'; }
    s18SetBarDone('המשך', function () { s18Continue(); });
    stationProgress.q18 = 'fail';
    updateQuestionNav('s18');
  }

  /* resume: שמירה סינכרונית ברגע מחויבות התשובה. השמירה המושהית שבסוף goTo()
     לא מספיקה כאן — תשובה שניתנה ואז הלשונית נהרגה לפני הניווט הבא הייתה
     נאבדת. עטוף: דיווח ושמירה לעולם לא שוברים את זרימת התשובה. */
  try { flushResumeSave(); } catch (e) {}
}

function s18Continue() {
  goTo(18);
}

function s18OpenHint() {
  if (s18Done) return;
  /* xAPI: requested.1 — מוצב אחרי כל הגארדים ומיד לפני שהרמז
     באמת נחשף, כדי לא לדווח בקשה שלא קרתה. הפונקציה פותחת בלבד
     (hidden=false) ולא toggle, ולכן אין סיכון לדיווח כפול. */
  xapiRequestedHint('012', 'q1');
  document.getElementById('s18-hint-overlay').hidden = false;
}

function s18CloseHint() {
  document.getElementById('s18-hint-overlay').hidden = true;
}

document.getElementById('s18-hint-overlay').addEventListener('click', function (e) {
  if (e.target === this) s18CloseHint();
});

function resetScreenState17() {
  updateQuestionNav('s18');
  // resume-state: ניסיון שבוצע או ערך שהוקלד כבר (אפילו בלי הגשה) לא נמחקים בחזרה למסך
  if (s18Done || s18Attempts > 0 || S18_IDS.some(function (id) {
    const el = document.getElementById(id);
    return el && el.value !== '';
  })) return;
  s18Attempts = 0;
  s18Phase = 'before';
  s18LastAnswer = null;
  s18ShowingCorrect = false;
  S18_IDS.forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = '';
    el.disabled = false;
    el.className = 's18-input';
  });
  document.getElementById('s18-feedbox').classList.remove('visible');
  const checkBtn = document.getElementById('s18-check');
  checkBtn.textContent = 'צדקתי?';
  checkBtn.disabled = true;
  checkBtn.onclick = s18Check;
  const hintBtn = document.getElementById('s18-hint');
  hintBtn.hidden = true;
  hintBtn.disabled = false;
  document.getElementById('s18-hint-icon').src = 'assets/images/icon-hint-blue.svg';
  document.getElementById('s18-hint-overlay').hidden = true;
  const revealBtn = document.getElementById('s18-reveal-btn');
  if (revealBtn) { revealBtn.hidden = true; revealBtn.textContent = 'התשובה הנכונה'; }
}

/* =========================================================
   מסך 19 — שאלה 4/5: תפריטים נפתחים (בחרו יחידת מסה)
   ========================================================= */

const S19_IDS = ['s19-dd-1', 's19-dd-2', 's19-dd-3', 's19-dd-4'];
const S19_CORRECT = { 's19-dd-1': 'קילוגרם', 's19-dd-2': 'מיליגרם', 's19-dd-3': 'טון', 's19-dd-4': 'גרם' };
let s19DdValues = { 's19-dd-1': '', 's19-dd-2': '', 's19-dd-3': '', 's19-dd-4': '' };
const TEXTS19 = {
  correct: {
    title: 'מצוין!',
    body: 'כאשר מודדים מסה, חשוב לבחור יחידת מידה מתאימה:\nגופים קטנים מאוד נמדדים בדרך כלל ב<b>מיליגרמים</b>.\nגופים קטנים עד בינוניים נמדדים ב<b>גרמים</b>.\nבעלי חיים בינוניים-גדולים, אנשים וחפצים גדולים נמדדים בדרך כלל ב<b>קילוגרמים</b>.\nכלי רכב כבדים מאוד, כמו קטרים, נמדדים לעיתים ב<b>טונות</b>.'
  },
  wrong1: {
    title: 'התשובה אינה נכונה.',
    body: 'ננסה שוב?'
  },
  wrongPending: {
    title: 'התשובה אינה נכונה.',
    body: 'רוצים לראות את הפתרון הנכון?'
  },
  wrong2: {
    title: 'התשובה אינה נכונה.',
    body: 'כאשר מודדים מסה, חשוב לבחור יחידת מידה מתאימה:\nגופים קטנים מאוד נמדדים בדרך כלל ב<b>מיליגרמים</b>.\nגופים קטנים עד בינוניים נמדדים ב<b>גרמים</b>.\nבעלי חיים בינוניים-גדולים, אנשים וחפצים גדולים נמדדים בדרך כלל ב<b>קילוגרמים</b>.\nכלי רכב כבדים מאוד, כמו קטרים, נמדדים לעיתים ב<b>טונות</b>.'
  }
};

let s19Done = false;
let s19Attempts = 0;
let s19Phase = 'before';
let s19LastAnswer = null;
let s19ShowingCorrect = false;

function s19DdToggle(ddId) {
  const opts = document.getElementById(ddId + '-opts');
  const btn = document.getElementById(ddId + '-btn');
  if (!opts || !btn) return;
  const isOpen = !opts.hidden;
  S19_IDS.forEach(function (id) {
    const o = document.getElementById(id + '-opts');
    const b = document.getElementById(id + '-btn');
    if (o && o !== opts) { o.hidden = true; if (b) b.setAttribute('aria-expanded', 'false'); }
  });
  opts.hidden = isOpen;
  btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
}

function s19DdSelect(ddId, val) {
  s19DdValues[ddId] = val;
  const valEl = document.getElementById(ddId + '-val');
  if (valEl) valEl.textContent = val;
  const opts = document.getElementById(ddId + '-opts');
  const btn = document.getElementById(ddId + '-btn');
  if (opts) opts.hidden = true;
  if (btn) { btn.setAttribute('aria-expanded', 'false'); btn.classList.remove('wrong', 'correct'); }
  s19OnChange();
}

function s19OnChange() {
  const allSelected = S19_IDS.every(function (id) { return s19DdValues[id] !== ''; });
  document.getElementById('s19-check').disabled = !allSelected;
}

function s19ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('s19-feedbox');
  const data = TEXTS19[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition(box.id);
  box.classList.add('visible');
}

function s19SetBarDone(label, handler) {
  const checkBtn = document.getElementById('s19-check');
  checkBtn.textContent = label;
  checkBtn.disabled = false;
  checkBtn.onclick = handler;
  document.getElementById('s19-hint').hidden = true;
}

function s19CloseAllDropdowns() {
  S19_IDS.forEach(function (id) {
    const opts = document.getElementById(id + '-opts');
    const btn = document.getElementById(id + '-btn');
    if (opts) opts.hidden = true;
    if (btn) btn.setAttribute('aria-expanded', 'false');
  });
}

function s19LockDropdowns(revealCorrect) {
  S19_IDS.forEach(function (id) {
    const btn = document.getElementById(id + '-btn');
    const opts = document.getElementById(id + '-opts');
    const valEl = document.getElementById(id + '-val');
    if (opts) opts.hidden = true;
    if (btn) { btn.disabled = true; btn.setAttribute('aria-expanded', 'false'); }
    if (revealCorrect) {
      s19DdValues[id] = S19_CORRECT[id];
      if (valEl) valEl.textContent = S19_CORRECT[id];
    }
  });
}

function s19MarkDropdowns() {
  S19_IDS.forEach(function (id) {
    const btn = document.getElementById(id + '-btn');
    if (!btn) return;
    btn.classList.remove('wrong', 'correct');
    btn.classList.add(s19DdValues[id] === S19_CORRECT[id] ? 'correct' : 'wrong');
  });
}

function s19ShowMyAnswer() {
  S19_IDS.forEach(function (id) {
    s19DdValues[id] = s19LastAnswer[id];
    const valEl = document.getElementById(id + '-val');
    if (valEl) valEl.textContent = s19LastAnswer[id];
  });
  s19MarkDropdowns();
  s19ShowFeedback('wrongPending', false);
}

function s19Reveal() {
  const revealBtn = document.getElementById('s19-reveal-btn');
  if (s19ShowingCorrect) {
    s19ShowMyAnswer();
    s19ShowingCorrect = false;
    if (revealBtn) revealBtn.textContent = 'התשובה הנכונה';
  } else {
    s19LockDropdowns(true);
    s19MarkDropdowns();
    s19ShowFeedback('wrong2', false);
    s19ShowingCorrect = true;
    if (revealBtn) revealBtn.textContent = 'התשובה שלי';
  }
}

function s19Check() {
  if (s19Done) return;
  s19CloseAllDropdowns();
  s19Attempts++;
  const allCorrect = S19_IDS.every(function (id) { return s19DdValues[id] === S19_CORRECT[id]; });
  xapiAnswered('013', 'q1', allCorrect, allCorrect || s19Attempts >= 2, xapiFieldsAnswer(S19_IDS, s19DdValues));

  if (allCorrect) {
    s19Done = true;
    s19Phase = 'correct';
    s19LockDropdowns(false);
    s19MarkDropdowns();
    s19ShowFeedback('correct', true);
    s19SetBarDone('המשך', function () { s19Continue(); });
    stationProgress.q19 = 'success';
    updateQuestionNav('s19');
  } else if (s19Attempts < 2) {
    s19Phase = 'wrong1';
    s19MarkDropdowns();
    s19ShowFeedback('wrong1', false);
    document.getElementById('s19-check').disabled = true;
    const hintBtn = document.getElementById('s19-hint');
    hintBtn.hidden = false;
    hintBtn.disabled = false;
  } else {
    s19Done = true;
    s19Phase = 'wrong-final';
    /* דריסה: הפתרון לא נחשף אוטומטית — רק בלחיצה על "התשובה הנכונה" */
    s19LastAnswer = Object.assign({}, s19DdValues);
    s19LockDropdowns(false);
    s19MarkDropdowns();
    s19ShowingCorrect = false;
    s19ShowFeedback('wrongPending', false);
    const revealBtn = document.getElementById('s19-reveal-btn');
    if (revealBtn) { revealBtn.hidden = false; revealBtn.textContent = 'התשובה הנכונה'; }
    s19SetBarDone('המשך', function () { s19Continue(); });
    stationProgress.q19 = 'fail';
    updateQuestionNav('s19');
  }

  /* resume: שמירה סינכרונית ברגע מחויבות התשובה. השמירה המושהית שבסוף goTo()
     לא מספיקה כאן — תשובה שניתנה ואז הלשונית נהרגה לפני הניווט הבא הייתה
     נאבדת. עטוף: דיווח ושמירה לעולם לא שוברים את זרימת התשובה. */
  try { flushResumeSave(); } catch (e) {}
}

function s19Continue() {
  goTo(19);
}

function s19OpenHint() {
  if (s19Done) return;
  /* xAPI: requested.1 — מוצב אחרי כל הגארדים ומיד לפני שהרמז
     באמת נחשף, כדי לא לדווח בקשה שלא קרתה. הפונקציה פותחת בלבד
     (hidden=false) ולא toggle, ולכן אין סיכון לדיווח כפול. */
  xapiRequestedHint('013', 'q1');
  document.getElementById('s19-hint-overlay').hidden = false;
}

function s19CloseHint() {
  document.getElementById('s19-hint-overlay').hidden = true;
}

document.getElementById('s19-hint-overlay').addEventListener('click', function (e) {
  if (e.target === this) s19CloseHint();
});

function resetScreenState18() {
  updateQuestionNav('s19');
  // resume-state: ניסיון שבוצע או תפריט שנבחר כבר (אפילו בלי הגשה) לא נמחקים בחזרה למסך
  if (s19Done || s19Attempts > 0 || Object.values(s19DdValues).some(function (v) {
    return v !== '';
  })) return;
  s19Attempts = 0;
  s19Phase = 'before';
  s19LastAnswer = null;
  s19ShowingCorrect = false;
  S19_IDS.forEach(function (id) {
    s19DdValues[id] = '';
    const btn = document.getElementById(id + '-btn');
    const valEl = document.getElementById(id + '-val');
    const opts = document.getElementById(id + '-opts');
    if (btn) { btn.disabled = false; btn.className = 's19-dd-btn'; btn.setAttribute('aria-expanded', 'false'); }
    if (valEl) valEl.textContent = '';
    if (opts) opts.hidden = true;
  });
  document.getElementById('s19-feedbox').classList.remove('visible');
  const checkBtn = document.getElementById('s19-check');
  checkBtn.textContent = 'צדקתי?';
  checkBtn.disabled = true;
  checkBtn.onclick = s19Check;
  const hintBtn = document.getElementById('s19-hint');
  hintBtn.hidden = true;
  hintBtn.disabled = false;
  document.getElementById('s19-hint-overlay').hidden = true;
  const revealBtn = document.getElementById('s19-reveal-btn');
  if (revealBtn) { revealBtn.hidden = true; revealBtn.textContent = 'התשובה הנכונה'; }
}

/* =========================================================
   מסך 20 — שאלה 5/5: גרירה והשמה (זיהוי מושגים)
   ========================================================= */

const S20_ITEM_IDS = ['s20i4', 's20i5', 's20i6', 's20i7', 's20i8', 's20i9'];
const TEXTS20 = {
  correct: {
    title: 'מצוין!',
    body: 'נטו הוא המסה של התכולה בלבד.\nטרה היא המסה של האריזה בלבד.\nברוטו הוא המסה הכוללת: התכולה יחד עם האריזה.'
  },
  wrong1: {
    title: 'התשובה אינה נכונה.',
    body: 'לא נורא, גם מטעויות לומדים.\nננסה שוב?'
  },
  wrong2Pending: {
    title: 'התשובה אינה נכונה.',
    body: 'רוצים לראות את הפתרון הנכון?'
  },
  wrong2: {
    title: 'התשובה אינה נכונה.',
    body: 'ברוטו = האריזה+התכולה\nנטו = התכולה בלבד\nטרה = האריזה בלבד'
  }
};

let s20Done = false;
let s20Attempts = 0;
let s20HintShown = false;
let s20DragId = null;
let s20LastAnswer = null;
let s20ShowingCorrect = false;

function s20AllPlaced() {
  const sb = document.getElementById('s20-source-bank');
  if (!sb) return false;
  return S20_ITEM_IDS.every(function (id) {
    const el = document.getElementById(id);
    return el && el.parentElement && el.parentElement.id !== 's20-source-bank';
  });
}

function s20UpdateCheckBtn() {
  document.getElementById('s20-check').disabled = !s20AllPlaced();
}

function s20ClearZoneStates() {
  ['bruto', 'neto', 'tara'].forEach(function (z) {
    document.getElementById('s20-zone-' + z).classList.remove('correct', 'wrong', 's20-drag-over');
  });
  S20_ITEM_IDS.forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('s20-item-correct', 's20-item-wrong');
  });
}

function s20DragStart(event, itemId) {
  s20DragId = itemId;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', itemId);
  setTimeout(function () {
    const el = document.getElementById(itemId);
    if (el) el.classList.add('s20-dragging');
  }, 0);
}

function s20DragEnd(itemId) {
  const el = document.getElementById(itemId);
  if (el) el.classList.remove('s20-dragging');
  s20DragId = null;
}

function s20DragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
}

function s20DragEnter(event, zoneId) {
  event.preventDefault();
  document.getElementById(zoneId).classList.add('s20-drag-over');
}

function s20DragLeave(event, zoneId) {
  const zone = document.getElementById(zoneId);
  if (zone && !zone.contains(event.relatedTarget)) {
    zone.classList.remove('s20-drag-over');
  }
}

function s20Drop(event, targetZone) {
  event.preventDefault();
  if (s20Done) return;
  const itemId = event.dataTransfer.getData('text/plain') || s20DragId;
  if (!itemId) return;
  const zoneEl = document.getElementById('s20-zone-' + targetZone);
  const itemEl = document.getElementById(itemId);
  if (zoneEl && itemEl) {
    zoneEl.classList.remove('s20-drag-over');
    if (itemEl.parentElement) itemEl.parentElement.removeChild(itemEl);
    zoneEl.appendChild(itemEl);
  }
  s20UpdateCheckBtn();
  s20ClearZoneStates();
}

function s20DropToSource(event) {
  event.preventDefault();
  if (s20Done) return;
  const itemId = event.dataTransfer.getData('text/plain') || s20DragId;
  if (!itemId) return;
  const sourceBank = document.getElementById('s20-source-bank');
  const itemEl = document.getElementById(itemId);
  if (itemEl && sourceBank && itemEl.parentElement !== sourceBank) {
    if (itemEl.parentElement) itemEl.parentElement.removeChild(itemEl);
    sourceBank.appendChild(itemEl);
  }
  s20UpdateCheckBtn();
  s20ClearZoneStates();
}

function s20ItemClick(itemId) {
  if (s20Done) return;
  const el = document.getElementById(itemId);
  const sourceBank = document.getElementById('s20-source-bank');
  if (!el || !sourceBank || el.parentElement === sourceBank) return;
  el.parentElement.removeChild(el);
  sourceBank.appendChild(el);
  s20ClearZoneStates();
  s20UpdateCheckBtn();
}

function s20RevealCorrect() {
  S20_ITEM_IDS.forEach(function (id) {
    const item = document.getElementById(id);
    const zoneEl = document.getElementById('s20-zone-' + item.dataset.correct);
    if (item.parentElement) item.parentElement.removeChild(item);
    zoneEl.appendChild(item);
    item.classList.remove('s20-item-wrong');
    item.classList.add('s20-item-correct');
  });
  ['bruto', 'neto', 'tara'].forEach(function (zoneId) {
    const zoneEl = document.getElementById('s20-zone-' + zoneId);
    zoneEl.classList.remove('wrong', 's20-drag-over');
    zoneEl.classList.add('correct');
  });
}

function s20ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('s20-feedbox');
  const data = TEXTS20[kind];
  box.querySelector('.scq-fb-title-text').textContent = data.title;
  box.querySelector('.scq-fb-body').innerHTML = data.body.replace(/\n/g, '<br>');
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition(box.id);
  box.classList.add('visible');
}

function s20ShowMyAnswer() {
  S20_ITEM_IDS.forEach(function (id) {
    const item = document.getElementById(id);
    const dest = s20LastAnswer[id];
    const destEl = (dest === 'source')
      ? document.getElementById('s20-source-bank')
      : document.getElementById('s20-zone-' + dest);
    if (item.parentElement) item.parentElement.removeChild(item);
    destEl.appendChild(item);
  });
  ['bruto', 'neto', 'tara'].forEach(function (zoneId) {
    const zoneEl = document.getElementById('s20-zone-' + zoneId);
    const items = zoneEl.querySelectorAll('.s20-drag-item');
    let zoneOk = items.length > 0;
    items.forEach(function (item) {
      const itemOk = item.dataset.correct === zoneId;
      if (!itemOk) zoneOk = false;
      item.classList.remove('s20-item-correct', 's20-item-wrong');
      item.classList.add(itemOk ? 's20-item-correct' : 's20-item-wrong');
    });
    zoneEl.classList.remove('wrong', 'correct', 's20-drag-over');
    zoneEl.classList.add(zoneOk ? 'correct' : 'wrong');
  });
  s20ShowFeedback('wrong2Pending', false);
}

function s20Reveal() {
  const revealBtn = document.getElementById('s20-reveal-btn');
  if (s20ShowingCorrect) {
    s20ShowMyAnswer();
    s20ShowingCorrect = false;
    if (revealBtn) revealBtn.textContent = 'התשובה הנכונה';
  } else {
    s20RevealCorrect();
    s20ShowFeedback('wrong2', false);
    s20ShowingCorrect = true;
    if (revealBtn) revealBtn.textContent = 'התשובה שלי';
  }
}

function s20Check() {
  if (s20Done) return;
  s20Attempts++;

  let allCorrect = true;
  ['bruto', 'neto', 'tara'].forEach(function (zoneId) {
    const zoneEl = document.getElementById('s20-zone-' + zoneId);
    const items = zoneEl.querySelectorAll('.s20-drag-item');
    let zoneOk = items.length > 0;
    items.forEach(function (item) {
      const itemOk = item.dataset.correct === zoneId;
      if (!itemOk) zoneOk = false;
      item.classList.remove('s20-item-correct', 's20-item-wrong');
      item.classList.add(itemOk ? 's20-item-correct' : 's20-item-wrong');
    });
    zoneEl.classList.toggle('correct', zoneOk);
    zoneEl.classList.toggle('wrong', !zoneOk);
    if (!zoneOk) allCorrect = false;
  });

  const checkBtn = document.getElementById('s20-check');
  /* xAPI: מוצב אחרי לוח הגרירה, כי allCorrect סופי רק בסוף הלופ. */
  xapiAnswered('014', 'q1', allCorrect, allCorrect || s20Attempts >= 2, xapiZoneAnswer('s20', ['bruto', 'neto', 'tara']));
  if (allCorrect) {
    s20Done = true;
    s20ShowFeedback('correct', true);
    checkBtn.textContent = 'המשך';
    checkBtn.disabled = false;
    checkBtn.onclick = s20Continue;
    stationProgress.q20 = 'success';
    updateQuestionNav('s20');
  } else {
    if (s20Attempts >= 2) {
      s20Done = true;
      /* דריסה: הפתרון לא נחשף אוטומטית — רק בלחיצה על "התשובה הנכונה" */
      s20LastAnswer = {};
      S20_ITEM_IDS.forEach(function (id) {
        const el = document.getElementById(id);
        const parentId = el && el.parentElement ? el.parentElement.id : '';
        s20LastAnswer[id] = parentId.indexOf('s20-zone-') === 0 ? parentId.replace('s20-zone-', '') : 'source';
      });
      s20ShowingCorrect = false;
      s20ShowFeedback('wrong2Pending', false);
      const revealBtn = document.getElementById('s20-reveal-btn');
      if (revealBtn) { revealBtn.hidden = false; revealBtn.textContent = 'התשובה הנכונה'; }
      checkBtn.textContent = 'המשך';
      checkBtn.disabled = false;
      checkBtn.onclick = s20Continue;
      stationProgress.q20 = 'fail';
      updateQuestionNav('s20');
    } else {
      s20ShowFeedback('wrong1', false);
      checkBtn.disabled = true;
      if (!s20HintShown) {
        s20HintShown = true;
        const hintBtn = document.getElementById('s20-hint');
        hintBtn.hidden = false;
        hintBtn.disabled = false;
      }
    }
  }

  /* resume: שמירה סינכרונית ברגע מחויבות התשובה. השמירה המושהית שבסוף goTo()
     לא מספיקה כאן — תשובה שניתנה ואז הלשונית נהרגה לפני הניווט הבא הייתה
     נאבדת. עטוף: דיווח ושמירה לעולם לא שוברים את זרימת התשובה. */
  try { flushResumeSave(); } catch (e) {}
}

/* ── ציון הרכיב ──
   המכנה הוא מה שהלומד הובטח, לא מספר השאלות בקטלוג: חמש שאלות התרגול
   הסטנדרטי (מסכים 15-19, אלה שנרשמות ב-stationProgress), וסף המעבר 4 מתוך 5
   = 80%, בדיוק כפי שכתוב במסך 15 — "צריך לענות נכון על 4 שאלות (80%) לפחות".

   שמונה השאלות שלפני שלב התרגול (ההוק, שתי הקנייה, שלושת התרגולים ושתי
   שאלות החימום) מדווחות answered בנפרד ואינן נכנסות למכנה: הסף שהלומד ראה
   מתייחס לחמש בלבד. ראו REPORT-XAPI.md §5 — "the denominator should be what
   the learner was promised". */
function getPracticeScore() {
  return ['q16', 'q17', 'q18', 'q19', 'q20'].filter(function (k) {
    return stationProgress[k] === 'success';
  }).length;
}

function s20Continue() {
  /* xAPI: סוגר את הפריט הפתוח ומדווח את תוצאת הרכיב. התוצאה נשלחת במפורש
     כי הצבירה של הספרייה היא AND של "כל התשובות נכונות", מה שהיה מדווח
     success:false על 4 מתוך 5 — כלומר על מעבר. */
  var _n = getPracticeScore();
  xapiCompleteComponent({ success: _n >= 4, score: { scaled: _n / 5 } });

  /* ── ניתוב מותנה לפי הסף שהובטח ללומד ──
     מסך 15 מבטיח "צריך לענות נכון על 4 שאלות (80%) לפחות". מי שעמד בסף מדלג
     על סין 02 — שהוא תרגול מחזק — ועובר ישר למשימת הכיתה בסין 03. מי שלא,
     ממשיך לסין 02.

     זה הדפוס מלומדת המקור: `methodica-math-scale-01-01` עושה בדיוק
     `if (getQuizScore() >= 4)` ומדלג על הרכיב המחזק. הוא גם עקבי עם מה
     שהלומדה הזאת כבר עושה בסין 05 → 06 (`moedAFullyPassed()` מדלג על מועד ב').
     תואם גם למטא-דאטה: סין 02 הוא היחיד עם recommendedAfterFail → סין 01,
     כלומר הקטלוג מדגמן אותו כרכיב מחזק ולא כחלק מהמסלול הראשי.

     window.location.search נגרר בכל מעבר — הוא נושא את ?slxapi ואת
     ?registration, ובלעדיו הגדרת ה-LRS אובדת מכאן והלאה (REPORT-XAPI.md §6).

     writeForwardState: שני דברים במכה אחת.
     (א) קשת החזרה — סין 03 ניתן להגעה משני מקומות, ולכן צריך לזכור מאיפה
         הלומד באמת הגיע, אחרת כפתור "חזרה" שם ישלח את מי שדילג לתוך סין 02,
         תוכן שהוא לא ראה. המסך שממנו יוצאים הוא 20, כלומר '#screen=19'.
     (ב) מצביע הנחיתה של מסמך ה-resume מוזז ליעד **לפני** הניווט. בלעדיו
         השיגור הבא היה מחזיר את הלומד לתוך סין 01 שהוא בדיוק סיים.
     הכתיבה סינכרונית ומחמשת מחדש את ה-debounce, כדי ש-timer מיושן מה-goTo
     האחרון לא ידרוך עליה בזמן שהעמוד עוד חי. ראו unit-js/40-resume.js. */
  var _dest = practiceDestinationSlug();
  writeForwardState(_dest, '#screen=19');
  window.location.href = '../' + _dest + '/index.html' + window.location.search;
}

/* כלל הניתוב עצמו, מופרד מהניווט. מופרד כדי שיהיה ניתן לבדיקה בלי לנווט
   בפועל — location.href אינו ניתן ל-stub ב-jsdom, ובלי ההפרדה הזאת הכלל
   הזה, שקובע איזה תוכן הלומד יראה בכלל, לא היה מכוסה בבדיקות. */
function practiceDestinationSlug() {
  return (getPracticeScore() >= 4)
    ? 'methodica-science-mass-measure-02-03'   // עמד בסף — מדלג על התרגול המחזק
    : 'methodica-science-mass-measure-02-02';  // לא עמד — תרגול מחזק
}

function s20OpenHint() {
  /* xAPI: requested.1 — מוצב אחרי כל הגארדים ומיד לפני שהרמז
     באמת נחשף, כדי לא לדווח בקשה שלא קרתה. הפונקציה פותחת בלבד
     (hidden=false) ולא toggle, ולכן אין סיכון לדיווח כפול. */
  xapiRequestedHint('014', 'q1');
  document.getElementById('s20-hint-overlay').hidden = false;
}

function s20CloseHint() {
  document.getElementById('s20-hint-overlay').hidden = true;
}

document.getElementById('s20-hint-overlay').addEventListener('click', function (e) {
  if (e.target === this) s20CloseHint();
});

function resetScreenState19() {
  updateQuestionNav('s20');
  // resume-state: ניסיון שבוצע, רמז שנחשף, או פריטים שהוצבו כבר (אפילו בלי הגשה) לא נמחקים בחזרה למסך
  if (s20Done || s20Attempts > 0 || s20HintShown || S20_ITEM_IDS.some(function (id) {
    const el = document.getElementById(id);
    return el && el.parentElement && el.parentElement.id !== 's20-source-bank';
  })) return;
  s20Attempts = 0;
  s20HintShown = false;
  s20DragId = null;
  s20LastAnswer = null;
  s20ShowingCorrect = false;

  const sourceBank = document.getElementById('s20-source-bank');
  S20_ITEM_IDS.forEach(function (id) {
    const el = document.getElementById(id);
    if (el && el.parentElement !== sourceBank) {
      el.parentElement.removeChild(el);
      sourceBank.appendChild(el);
    }
  });

  s20ClearZoneStates();
  document.getElementById('s20-feedbox').classList.remove('visible');
  document.getElementById('s20-hint-overlay').hidden = true;

  const checkBtn = document.getElementById('s20-check');
  checkBtn.textContent = 'צדקתי?';
  checkBtn.disabled = true;
  checkBtn.onclick = s20Check;
  const hintBtn = document.getElementById('s20-hint');
  hintBtn.hidden = true;
  hintBtn.disabled = false;
  const revealBtn = document.getElementById('s20-reveal-btn');
  if (revealBtn) { revealBtn.hidden = true; revealBtn.textContent = 'התשובה הנכונה'; }
}

document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  if (!document.getElementById('scq16-hint-overlay').hidden) scq16CloseHint();
  if (!document.getElementById('scq17-hint-overlay').hidden) scq17CloseHint();
  if (!document.getElementById('s18-hint-overlay').hidden) s18CloseHint();
  if (!document.getElementById('s19-hint-overlay').hidden) s19CloseHint();
  if (!document.getElementById('s20-hint-overlay').hidden) s20CloseHint();
});

/* =========================================================
   הגדלת תמונה (zoom) — כל תמונת תוכן בכל שאלה (.scq-img-inner img)
   נדרש בכל שאלה עם תמונת תוכן, לפי מוסכמת התבנית
   ========================================================= */

const ZOOM_IMG_SELECTOR = '.scq-img-inner img';
const ZOOM_FRAME_SELECTOR = '.scq-img-inner';
const ZOOM_SCALE = 1.5;
const ZOOM_VIEWPORT_MARGIN = 24;
let zoomActiveImage = null;

function zoomEnsurePopup() {
  let popup = document.querySelector('.methodica-zoom-popup');
  if (popup) return popup;

  popup = document.createElement('div');
  popup.className = 'methodica-zoom-popup';
  popup.setAttribute('role', 'dialog');
  popup.setAttribute('aria-modal', 'false');

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'methodica-zoom-close';
  close.setAttribute('aria-label', 'סגירת הגדלת תמונה');
  close.innerHTML = '<img src="assets/images/icon-fb-close.png" alt="">';

  const img = document.createElement('img');
  img.className = 'methodica-zoom-popup-img';

  popup.appendChild(close);
  popup.appendChild(img);
  document.body.appendChild(popup);
  return popup;
}

function zoomAddTrigger(image) {
  const frame = image.closest(ZOOM_FRAME_SELECTOR);
  if (!frame || frame.classList.contains('no-zoom') || frame.querySelector('.methodica-zoom-trigger')) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'methodica-zoom-trigger';
  button.setAttribute('aria-label', 'הגדלת תמונה');
  button.innerHTML =
    '<span class="methodica-zoom-trigger-icon">' +
    '<img class="methodica-zoom-trigger-default" src="assets/images/magnifier-icon-default.png" alt="">' +
    '<img class="methodica-zoom-trigger-hover" src="assets/images/magnifier-icon-hover.png" alt="">' +
    '</span>';
  frame.appendChild(button);
}

function zoomCalculateRect(image) {
  const frame = image.closest(ZOOM_FRAME_SELECTOR) || image;
  const frameRect = frame.getBoundingClientRect();
  const imageRect = image.getBoundingClientRect();

  const fallbackRatio = imageRect.width && imageRect.height ? imageRect.width / imageRect.height : 1;
  const naturalRatio = image.naturalWidth && image.naturalHeight ? image.naturalWidth / image.naturalHeight : fallbackRatio;

  let width = Math.max(1, imageRect.width * ZOOM_SCALE);
  let height = Math.max(1, imageRect.height * ZOOM_SCALE);
  if (width / height > naturalRatio) {
    width = height * naturalRatio;
  } else {
    height = width / naturalRatio;
  }

  const maxWidth = Math.max(1, window.innerWidth - ZOOM_VIEWPORT_MARGIN * 2);
  const maxHeight = Math.max(1, window.innerHeight - ZOOM_VIEWPORT_MARGIN * 2);
  const fitRatio = Math.min(1, maxWidth / width, maxHeight / height);
  width = Math.round(width * fitRatio);
  height = Math.round(height * fitRatio);

  const centerX = frameRect.left + frameRect.width / 2;
  const centerY = frameRect.top + frameRect.height / 2;
  let left = Math.round(centerX - width / 2);
  let top = Math.round(centerY - height / 2);
  left = Math.max(ZOOM_VIEWPORT_MARGIN, Math.min(left, window.innerWidth - width - ZOOM_VIEWPORT_MARGIN));
  top = Math.max(ZOOM_VIEWPORT_MARGIN, Math.min(top, window.innerHeight - height - ZOOM_VIEWPORT_MARGIN));

  return { left: left, top: top, width: width, height: height };
}

function zoomOpen(image) {
  if (!image || !image.src) return;
  zoomActiveImage = image;
  const popup = zoomEnsurePopup();
  const popupImg = popup.querySelector('.methodica-zoom-popup-img');
  popupImg.src = image.currentSrc || image.src;
  popupImg.alt = image.alt || '';

  const rect = zoomCalculateRect(image);
  popup.style.left = rect.left + 'px';
  popup.style.top = rect.top + 'px';
  popup.style.width = rect.width + 'px';
  popup.style.height = rect.height + 'px';
  popup.classList.add('is-open');
}

function zoomClose() {
  const popup = document.querySelector('.methodica-zoom-popup');
  if (popup) popup.classList.remove('is-open');
  zoomActiveImage = null;
}

function initImageZoom() {
  document.querySelectorAll(ZOOM_IMG_SELECTOR).forEach(function (image) {
    zoomAddTrigger(image);
  });
}

document.addEventListener('click', function (e) {
  if (e.target.closest('.methodica-zoom-close')) {
    zoomClose();
    return;
  }
  if (e.target.closest('.methodica-zoom-popup')) return;

  const trigger = e.target.closest('.methodica-zoom-trigger');
  const frame = e.target.closest(ZOOM_FRAME_SELECTOR);
  if (frame && frame.classList.contains('no-zoom')) return;
  const image = trigger
    ? trigger.closest(ZOOM_FRAME_SELECTOR).querySelector(ZOOM_IMG_SELECTOR)
    : (frame ? frame.querySelector(ZOOM_IMG_SELECTOR) : null);
  if (image) zoomOpen(image);
});

window.addEventListener('resize', function () {
  if (zoomActiveImage) zoomOpen(zoomActiveImage);
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && zoomActiveImage) zoomClose();
});

/* =========================================================
   הגדלת תמונה v2 (img-zoom) — לפי מפרט 720-templates
   _global-components.md. מוסף למסכים שהוגרו מהמערכת הישנה
   (methodica-zoom-*) מעליה, בלי לגעת בה — שאר המסכים ממשיכים
   להשתמש בה עד שיוגרו גם הם.
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
  // the backdrop itself carries data-zoom-close too, per spec — but a click
  // that lands inside the panel (e.g. on the enlarged image) must not close
  // it just because it bubbles up to the backdrop; only the explicit close
  // button (which isn't the backdrop element) or a genuine backdrop click
  // (outside the panel) should close.
  if (closeTarget.id === 'img-zoom-modal' && e.target.closest('.img-zoom-modal__panel')) return;
  imgZoomClose();
});

document.addEventListener('keydown', function (e) {
  const modal = document.getElementById('img-zoom-modal');
  if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) imgZoomClose();
});

/* =========================================================
   מערכת פופ-אפ משוב גריר — לפי "Feedback popup system" (720-templates
   skill): גרירה מוגבלת לגבולות הקנבס, איפוס למיקום ברירת המחדל
   בכל פתיחה. אין כפתור סגירה (X) — החלטת מוצר מאושרת (2026-07-26):
   הפופאפ נסגר רק בניווט למסך אחר, בפתיחת ניסיון חדש, או בכפתור
   מעבר-מצב פנימי כמו .scq-fb-reveal-btn. מיושם על כל 13 תיבות
   המשוב בסיין 1.
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

const SCQ_FB_BOX_IDS = [
  'scq-feedbox', 'scq4-feedbox', 's5-feedbox', 'scq8-feedbox', 's9-feedbox',
  'scq10-feedbox', 'scq13-feedbox', 'scq14-feedbox', 'scq16-feedbox',
  'scq17-feedbox', 's18-feedbox', 's19-feedbox', 's20-feedbox'
];

/* אתחול */
scqUnlockOptions();
scq4UnlockOptions();
initImageZoom();
scaleApp();
resetScreenState(0);
SCQ_FB_BOX_IDS.forEach(scqFbMakeDraggable);

/* קישור בין סינים: הגעה לכאן דרך "חזרה" מהסיין הבא נכנסת ישירות למסך
   המבוקש לפי #screen=N ב-URL, במקום למסך הראשון כברירת מחדל.

   היה חסר כאן בלבד. סיין 2 מקשר אחורה ל-01/index.html#screen=19, אבל בלי
   הקורא הזה הלומד היה נוחת על מסך 0 — מסך בחירת הדמות — ולא על מסך 20.
   הבלוק זהה לזה שקיים בסינים 02–05. סיין 6 לא צריך אותו: שום דבר לא מקשר
   אליו עם hash (סיין 5 עובר אליו בלי), ולכן שם זה היה קוד מת.

   המקום נושא-משקל: הבלוק הזה חייב לרוץ לפני ../unit-js/90-boot.js, כי
   bootXAPI() מדווח את ה-initialized של הפריט לפי currentScreen — אם הקפיצה
   הייתה מתרחשת אחריו, הדיווח היה מצביע על מסך 0 במקום על המסך שהלומד
   באמת רואה. תג ה-script של 90-boot.js בא אחרי script.js, ולכן זה מובטח. */
(function jumpToLinkedScreen() {
  const m = /^#screen=(\d+)$/.exec(location.hash);
  if (m) goTo(parseInt(m[1], 10));
})();


/* ═══════════════════ xAPI (720) — קונפיגורציה של הסין ═══════════════════
   נתונים בלבד. השכבה המשותפת ב-../unit-js/ קוראת אותם בזמן call.
   ראו REPORT-XAPI.md §2 בלומדת methodica-math-scale-01. */

/* מסך -> [סיומת פריט, עמוד-בפריט]; null = אין פריט בקטלוג.
   נגזר מהתאמת הכותרת/שאלה של כל מסך ל-title ול-questionText ב-metadata/,
   ובהצלבה מול המסך שנושא כל פונקציית Check.

   שלושה זוגות שבהם פריט אחד פרוש על שני מסכים — מסך הקנייה/חשיפה ואחריו
   מסך השאלה. ההצמדה הזאת מכוונת: היא משאירה את הפריט פתוח על פני שני
   המסכים, כך שה-completed היחיד שלו נושא את התוצאה המלאה במקום לנעול ניקוד
   חלקי ברגע שהלומד דורך על מסך נרטיבי (REPORT-XAPI.md §4):
     002 = מסך 3 (למה חשוב להבחין) + מסך 4 (מהו החלק החסר?)
     004 = מסך 7 (מה משותף ל...)   + מסך 8 (מה הבעיה במידע?)
   פריט 007 (משחק הזיכרון, מסך 11) אין לו פונקציית Check — הוא מסתיים מעצמו,
   ולכן הוא מחוץ ל-XAPI_EVAL_ITEMS למרות שיש לו שאלה במטא-דאטה. */
var SCREEN_TO_SUBCONTENT = {
  0: null,
  1: ['001', 1],
  2: ['002', 1],
  3: ['002', 2],
  4: ['003', 1],
  5: null,
  6: ['004', 1],
  7: ['004', 2],
  8: ['005', 1],
  9: ['006', 1],
  10: ['007', 1],
  11: null,
  12: ['008', 1],
  13: ['009', 1],
  14: null,
  15: ['010', 1],
  16: ['011', 1],
  17: ['012', 1],
  18: ['013', 1],
  19: ['014', 1]
};

/* ⚠️ SCREEN_TO_SUBCONTENT חייב להחזיק בדיוק TOTAL_SCREENS מפתחות (20).
   מפתח חסר = מסך שלא מדווח, בשקט. _test/verify-report.js אוכף את זה. */

var XAPI_COMP_SLUG = 'methodica-science-mass-measure-02-01';
/* מזהי הרכיב והפריטים חייבים להתאים ל-metadata/*.json בית-לבית — המוסכמה
   כאן נושאת TRAILING SLASH על יחידה, רכיב ופריט (לא על שאלה). */
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';

/* פריטים שנושאים שאלה מדורגת **בקוד**. 007 חסר בכוונה: משחק הזיכרון
   במסך 11 אינו נבדק ואינו מדווח כתשובה. */
var XAPI_EVAL_ITEMS = {'001': 1, '002': 1, '003': 1, '004': 1, '005': 1, '006': 1, '008': 1, '009': 1, '010': 1, '011': 1, '012': 1, '013': 1, '014': 1};

var XAPI_METADATA_FILE = '../metadata/methodica-science-mass-measure-02-01.json';


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
  st.stations = Object.assign({}, stationProgress);

  /* ── שלב 2ב, קבוצה א — מסכי הבחירה ──
     שבעת מסכי הבחירה-היחידה שומרים את הבחירה גם אחרי טעות (scqSelect מנקה את
     הסימון, לא את המשתנה), ולכן הכל נגזר מהמשתנים ואין צורך לקרוא מה-DOM. */
  st.scq = {
    scq: { sel: scqSelected, att: scqAttempts, done: scqDone, phase: scqPhase },
    scq4: { sel: scq4Selected, att: scq4Attempts, done: scq4Done, phase: scq4Phase },
    scq8: { sel: scq8Selected, att: scq8Attempts, done: scq8Done, phase: scq8Phase },
    scq10: { sel: scq10Selected, att: scq10Attempts, done: scq10Done, phase: scq10Phase },
    scq13: { sel: scq13Selected, att: scq13Attempts, done: scq13Done, phase: scq13Phase },
    scq16: { sel: scq16Selected, att: scq16Attempts, done: scq16Done, phase: scq16Phase },
    scq17: { sel: scq17Selected, att: scq17Attempts, done: scq17Done, phase: scq17Phase }
  };

  /* ⚠️ מסך 13 (בחירה מרובה) הוא היוצא מן הכלל: scq14Check מאפס את
     scq14Selected ל-[] בכל טעות, ולכן הבחירה השגויה של הלומד **לא קיימת באף
     משתנה** — היא שרדה רק כ-class 'wrong'. נלכדת מה-DOM. */
  st.scq14 = {
    sel: scq14Selected.slice(), att: scq14Attempts, done: scq14Done, phase: scq14Phase,
    wrong: captureWrongMarks('#s13')
  };

  /* ── קבוצה ב — קלפי היפוך. אין כאן ניקוד, רק "האם הקלף הופך". ── */
  st.flip = {
    scr3a: scr3Card1Flipped, scr3b: scr3Card2Flipped, scr3Done: scr3Done,
    s7: s7Flipped
  };

  /* ── קבוצה ג — קלט ערכים (17) ורשימות נפתחות (18). שניהם נושאים טוגל, ולכן
     שניהם נושאים גם LastAnswer וגם ShowingCorrect (כלל 4 ב-CLAUDE.md).
     ערכי השדות של מסך 17 יושבים **רק ב-DOM** ולכן נקראים משם. ── */
  st.s18 = {
    att: s18Attempts, done: s18Done, phase: s18Phase,
    last: s18LastAnswer, showing: s18ShowingCorrect,
    inputs: {}
  };
  S18_IDS.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) st.s18.inputs[id] = el.value;
  });
  st.s19 = {
    vals: Object.assign({}, s19DdValues),
    att: s19Attempts, done: s19Done, phase: s19Phase,
    last: s19LastAnswer, showing: s19ShowingCorrect
  };

  /* ── קבוצה ד — שלושת מסכי הגרירה שנכתבו ביד (4, 8, 19).
     המיקום הוא parentage ב-DOM: הפריט יושב פיזית בתוך האזור, ואין שום משתנה
     שמחזיק אותו. נלכד דרך parentElement.id — אותה נגזרת בדיוק שהענף
     wrong-final עושה ל-sNNLastAnswer. ── */
  /* ── קבוצה ה — משחק הזיכרון (מסך 10).
     ⚠️ s11Cards **מעורבב ב-Fisher-Yates** בתוך s11Init(), ולכן חייב להישמר
     ולהיטען. הרצה מחדש של s11Init() מחלקת לוח **אחר** — לומד שחוזר היה מוצא
     משחק חדש במקום את זה שהתחיל, כולל הזיווגים שכבר מצא.
     s11SingleTimer לא נשמר (הוא timer, ארעי), ו-s11Locked תמיד חוזר false:
     נעילה היא חלון של מילישניות בזמן השוואת שני קלפים, ולומד שנטען מחדש
     לעולם לא אמור לחזור לתוכה. ── */
  st.s11 = {
    cards: s11Cards.map(function (c) { return { pairId: c.pairId, text: c.text, matched: !!c.matched }; }),
    matches: s11Matches, done: s11Done
  };

  st.s5  = { place: captureDragPlacement('s5',  S5_ITEM_IDS),  att: s5Attempts,  done: s5Done,  last: s5LastAnswer,  showing: s5ShowingCorrect };
  st.s9  = { place: captureDragPlacement('s9',  S9_ITEM_IDS),  att: s9Attempts,  done: s9Done,  last: s9LastAnswer,  showing: s9ShowingCorrect,  hint: s9HintShown };
  st.s20 = { place: captureDragPlacement('s20', S20_ITEM_IDS), att: s20Attempts, done: s20Done, last: s20LastAnswer, showing: s20ShowingCorrect, hint: s20HintShown };
  return st;
}

/* המיקום הנוכחי של פריטי גרירה, לפי ההורה שלהם ב-DOM. */
function captureDragPlacement(prefix, itemIds) {
  var out = {};
  var zonePrefix = prefix + '-zone-';
  itemIds.forEach(function (id) {
    var el = document.getElementById(id);
    var pid = (el && el.parentElement) ? el.parentElement.id : '';
    out[id] = (pid.indexOf(zonePrefix) === 0) ? pid.slice(zonePrefix.length) : 'source';
  });
  return out;
}

/* אילו אופציות מסומנות כרגע כשגויות. קיים בשביל מסך 13 בלבד (ראו למעלה). */
function captureWrongMarks(screenSel) {
  var out = [];
  document.querySelectorAll(screenSel + ' .scq-opt').forEach(function (el) {
    if (el.classList.contains('wrong') && el.dataset.id) out.push(el.dataset.id);
  });
  return out;
}

/* שלב 2 — החזרת משתני התשובה של הסין.
   ⚠️ אם המימוש יעבור ל-eval כמו בלומדת המקור, שם הפרמטר חייב להישאר `st`:
   ה-eval מפרש אותו לקסיקלית, ושינוי שם נכשל **בשקט** (הזריקה נבלעת
   ב-try/catch העוטף) ולוקח איתו את התשובות של הלומד. */
/* שלב 2א — מחזיר את מצב הניקוד וההסתעפות בלבד.

   למה זה חייב לקרות, ולא רק "נחמד": הניתוב קדימה נגזר מהמפות האלה, ולכן
   לומד שהמשיך אחרי resume בלעדיהן היה מנותב לפי ציון 0 — כלומר מי שעמד
   בסף נשלח לתרגול מחזק שהוא כבר דילג עליו.
   התלויות בסין הזה: getPracticeScore() → practiceDestinationSlug().

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
  if (st.stations) {
    Object.keys(st.stations).forEach(function (k) { stationProgress[k] = st.stations[k]; });
  }
  if (st.scq && st.scq.scq) { scqSelected = (typeof st.scq.scq.sel === 'string') ? st.scq.scq.sel : null; scqAttempts = st.scq.scq.att || 0; scqDone = !!st.scq.scq.done; scqPhase = st.scq.scq.phase || 'before'; }
  if (st.scq && st.scq.scq4) { scq4Selected = (typeof st.scq.scq4.sel === 'string') ? st.scq.scq4.sel : null; scq4Attempts = st.scq.scq4.att || 0; scq4Done = !!st.scq.scq4.done; scq4Phase = st.scq.scq4.phase || 'before'; }
  if (st.scq && st.scq.scq8) { scq8Selected = (typeof st.scq.scq8.sel === 'string') ? st.scq.scq8.sel : null; scq8Attempts = st.scq.scq8.att || 0; scq8Done = !!st.scq.scq8.done; scq8Phase = st.scq.scq8.phase || 'before'; }
  if (st.scq && st.scq.scq10) { scq10Selected = (typeof st.scq.scq10.sel === 'string') ? st.scq.scq10.sel : null; scq10Attempts = st.scq.scq10.att || 0; scq10Done = !!st.scq.scq10.done; scq10Phase = st.scq.scq10.phase || 'before'; }
  if (st.scq && st.scq.scq13) { scq13Selected = (typeof st.scq.scq13.sel === 'string') ? st.scq.scq13.sel : null; scq13Attempts = st.scq.scq13.att || 0; scq13Done = !!st.scq.scq13.done; scq13Phase = st.scq.scq13.phase || 'before'; }
  if (st.scq && st.scq.scq16) { scq16Selected = (typeof st.scq.scq16.sel === 'string') ? st.scq.scq16.sel : null; scq16Attempts = st.scq.scq16.att || 0; scq16Done = !!st.scq.scq16.done; scq16Phase = st.scq.scq16.phase || 'before'; }
  if (st.scq && st.scq.scq17) { scq17Selected = (typeof st.scq.scq17.sel === 'string') ? st.scq.scq17.sel : null; scq17Attempts = st.scq.scq17.att || 0; scq17Done = !!st.scq.scq17.done; scq17Phase = st.scq.scq17.phase || 'before'; }
  if (st.s11) {
    if (Array.isArray(st.s11.cards) && st.s11.cards.length) {
      s11Cards = st.s11.cards.map(function (c) { return { pairId: c.pairId, text: c.text, matched: !!c.matched }; });
    }
    s11Matches = st.s11.matches || 0;
    s11Done    = !!st.s11.done;
    s11Flipped = [];      // אין "שני קלפים באוויר" אחרי טעינה
    s11Locked  = false;   // ראו ההערה ב-capturePartPayload
  }
  if (st.s5)  { s5Attempts  = st.s5.att  || 0; s5Done  = !!st.s5.done;  s5LastAnswer  = st.s5.last  || null; s5ShowingCorrect  = !!st.s5.showing; }
  if (st.s9)  { s9Attempts  = st.s9.att  || 0; s9Done  = !!st.s9.done;  s9LastAnswer  = st.s9.last  || null; s9ShowingCorrect  = !!st.s9.showing;  s9HintShown  = !!st.s9.hint; }
  if (st.s20) { s20Attempts = st.s20.att || 0; s20Done = !!st.s20.done; s20LastAnswer = st.s20.last || null; s20ShowingCorrect = !!st.s20.showing; s20HintShown = !!st.s20.hint; }
  if (st.s18) {
    s18Attempts = st.s18.att || 0;
    s18Done = !!st.s18.done;
    s18Phase = st.s18.phase || 'before';
    s18LastAnswer = st.s18.last || null;
    s18ShowingCorrect = !!st.s18.showing;
  }
  if (st.s19) {
    /* מוטציה לפי מפתח: s19DdSelect כותב לתוך האובייקט הקיים. */
    if (st.s19.vals) Object.keys(st.s19.vals).forEach(function (k) { s19DdValues[k] = st.s19.vals[k]; });
    s19Attempts = st.s19.att || 0;
    s19Done = !!st.s19.done;
    s19Phase = st.s19.phase || 'before';
    s19LastAnswer = st.s19.last || null;
    s19ShowingCorrect = !!st.s19.showing;
  }
  if (st.flip) {
    scr3Card1Flipped = !!st.flip.scr3a;
    scr3Card2Flipped = !!st.flip.scr3b;
    scr3Done         = !!st.flip.scr3Done;
    s7Flipped        = !!st.flip.s7;
  }
  if (st.scq14) {
    scq14Selected = (st.scq14.sel || []).slice();
    scq14Attempts = st.scq14.att || 0;
    scq14Done     = !!st.scq14.done;
    scq14Phase    = st.scq14.phase || 'before';
    __scq14Wrong  = (st.scq14.wrong || []).slice();
  }
}

/* סימוני הטעות של מסך 13, שאין להם מקום במשתני המסך. */
var __scq14Wrong = [];

/* מחזיר ערכים שיושבים רק ב-DOM: הטקסט שהוקלד במסך 17, תוויות הרשימות של
   מסך 18 (ה-value המכונה שלהן נשמר בנפרד ב-s19DdValues), וסימוני הטעות של
   מסך 13. רץ **לפני** ה-painters, שנועלים ומסמנים אותם. */
function applyResumeDom(st) {
  if (!st) return;
  /* ⚠️ סימוני 'wrong' של מסך 13 חייבים לחזור ל-DOM כאן, ולא רק ל-__scq14Wrong.
     captureWrongMarks קורא אותם **מה-DOM** (ראו ההערה למעלה: scq14Check מאפס
     את scq14Selected בכל טעות, ולכן הבחירה השגויה לא קיימת באף משתנה), ואילו
     applyResumeVars מחזיר אותם רק למשתנה שה-capture לא מסתכל בו. התוצאה לפני
     התיקון: כל ניווט אחרי שחזור הריץ scheduleResumeSave → capturePartPayload
     → wrong: [] — כלומר הבחירה השגויה של הלומד נמחקה מהמסמך לתמיד, גם אם
     מעולם לא נכנס למסך 13. הציור ב-repaintScreen מכסה רק מסכים שבהם ביקר. */
  if (st.scq14 && Array.isArray(st.scq14.wrong)) {
    st.scq14.wrong.forEach(function (id) {
      var el = document.querySelector('#s13 .scq-opt[data-id="' + id + '"]');
      if (el) el.classList.add('wrong');
    });
  }
  if (st.s18 && st.s18.inputs) {
    S18_IDS.forEach(function (id) {
      if (typeof st.s18.inputs[id] !== 'string') return;
      var el = document.getElementById(id);
      if (el) el.value = st.s18.inputs[id];
    });
  }
  if (st.s19 && st.s19.vals) {
    S19_IDS.forEach(function (id) {
      var valEl = document.getElementById(id + '-val');
      if (valEl && typeof st.s19.vals[id] === 'string') valEl.textContent = st.s19.vals[id];
    });
  }
  /* מסכי הגרירה: מזיזים את הצומת עצמו, כמו sNNShowMyAnswer. */
  if (st.s5  && st.s5.place)  applyDragPlacement('s5',  S5_ITEM_IDS,  st.s5.place);
  if (st.s9  && st.s9.place)  applyDragPlacement('s9',  S9_ITEM_IDS,  st.s9.place);
  if (st.s20 && st.s20.place) applyDragPlacement('s20', S20_ITEM_IDS, st.s20.place);
}

function applyDragPlacement(prefix, itemIds, place) {
  itemIds.forEach(function (id) {
    var item = document.getElementById(id);
    if (!item) return;
    var dest = place[id];
    var destEl = (!dest || dest === 'source')
      ? document.getElementById(prefix + '-source-bank')
      : document.getElementById(prefix + '-zone-' + dest);
    if (!destEl) return;
    if (item.parentElement) item.parentElement.removeChild(item);
    destEl.appendChild(item);
  });
}

/* ציור מצב "נענה". חייב להישאר exception-safe — נקרא גם מ-applyExecutionState
   וגם מכל ניווט, ואסור לו לשבור ניווט. */
function restoreScreenUI(n) {
  try {
    if (n === 1) restoreScqUI(SCQ, '#s1', 'scq', scqOptEl, scqSelected, scqAttempts, scqDone, scqPhase,
                                scqLockOptions, scqShowFeedback, scqSetBarDone, scqCheck, function () { advanceScreen(); }, 'scq-hint');
    if (n === 3) restoreScqUI(SCQ4, '#s3', 'scq4', scq4OptEl, scq4Selected, scq4Attempts, scq4Done, scq4Phase,
                                scq4LockOptions, scq4ShowFeedback, scq4SetBarDone, scq4Check, function () { scq4Continue(); }, null);
    if (n === 7) restoreScqUI(SCQ8, '#s7', 'scq8', scq8OptEl, scq8Selected, scq8Attempts, scq8Done, scq8Phase,
                                scq8LockOptions, scq8ShowFeedback, scq8SetBarDone, scq8Check, function () { scq8Continue(); }, null);
    if (n === 9) restoreScqUI(SCQ10, '#s9', 'scq10', scq10OptEl, scq10Selected, scq10Attempts, scq10Done, scq10Phase,
                                scq10LockOptions, scq10ShowFeedback, scq10SetBarDone, scq10Check, function () { scq10Continue(); }, null);
    if (n === 12) restoreScqUI(SCQ13, '#s12', 'scq13', scq13OptEl, scq13Selected, scq13Attempts, scq13Done, scq13Phase,
                                scq13LockOptions, scq13ShowFeedback, scq13SetBarDone, scq13Check, function () { scq13Continue(); }, null);
    if (n === 15) restoreScqUI(SCQ16, '#s15', 'scq16', scq16OptEl, scq16Selected, scq16Attempts, scq16Done, scq16Phase,
                                scq16LockOptions, scq16ShowFeedback, scq16SetBarDone, scq16Check, function () { scq16Continue(); }, null);
    if (n === 16) restoreScqUI(SCQ17, '#s16', 'scq17', scq17OptEl, scq17Selected, scq17Attempts, scq17Done, scq17Phase,
                                scq17LockOptions, scq17ShowFeedback, scq17SetBarDone, scq17Check, function () { scq17Continue(); }, null);
    if (n === 2) scr3RestoreUI();
    if (n === 6) s7RestoreUI();
    if (n === 13) restoreScq14UI();
    if (n === 10) s11RestoreUI();
    if (n === 4)  restoreDragUI({ prefix: 's5',  zones: ['bruto', 'neto', 'tara'], itemIds: S5_ITEM_IDS,
                                   done: s5Done,  att: s5Attempts,  last: s5LastAnswer,  showing: s5ShowingCorrect,
                                   /* לכל מסך שמות סוגי פידבק משלו — s5 קורא לזה
                                      'wrongFinal' ולא 'wrong2'. אימות מול
                                      TEXTS5/TEXTS9/TEXTS_S20, לא ניחוש. */
                                   kindWrong1: 'wrong', kindPending: 'wrongPending', kindFinal: 'wrongFinal',
                                   showFeedback: s5ShowFeedback,  updateBtn: s5UpdateCheckBtn,
                                   checkBtnId: 's5-check',  revealBtnId: 's5-reveal-btn',
                                   continueFn: s5Continue,  hintBtnId: null,      hintShown: false });
    if (n === 8)  restoreDragUI({ prefix: 's9',  zones: S9_ZONE_IDS, itemIds: S9_ITEM_IDS,
                                   done: s9Done,  att: s9Attempts,  last: s9LastAnswer,  showing: s9ShowingCorrect,
                                   kindWrong1: 'wrong', kindPending: 'wrongPending', kindFinal: 'wrong2',
                                   showFeedback: s9ShowFeedback,  updateBtn: s9UpdateCheckBtn,
                                   checkBtnId: 's9-check',  revealBtnId: 's9-reveal-btn',
                                   continueFn: s9Continue,  hintBtnId: 's9-hint',  hintShown: s9HintShown });
    if (n === 19) restoreDragUI({ prefix: 's20', zones: ['bruto', 'neto', 'tara'], itemIds: S20_ITEM_IDS,
                                   done: s20Done, att: s20Attempts, last: s20LastAnswer, showing: s20ShowingCorrect,
                                   kindWrong1: 'wrong1', kindPending: 'wrong2Pending', kindFinal: 'wrong2',
                                   showFeedback: s20ShowFeedback, updateBtn: s20UpdateCheckBtn,
                                   checkBtnId: 's20-check', revealBtnId: 's20-reveal-btn',
                                   continueFn: s20Continue, hintBtnId: 's20-hint', hintShown: s20HintShown });
    if (n === 17) s18RestoreUI();
    if (n === 18) s19RestoreUI();
  } catch (e) { console.error('[resume] restoreScreenUI', e); }
}

/* ציור משותף לשבעת מסכי הבחירה-היחידה. שבעתם זהים במבנה ונבדלים רק בקידומת,
   ב-selector, בתשובה הנכונה ובמי שממשיך הלאה — ולכן ציור אחד ולא שבעה עותקים
   שיכולים להיסחף זה מזה.
   משקף **רק** את כתיבות ה-DOM של scqNCheck: אין שינוי state, אין xapiAnswered
   ואין נגיעה ב-stationProgress (הוא הוחזר כבר ב-applyResumeVars). */
function restoreScqUI(cfg, screenSel, prefix, optEl, selected, attempts, done, phase,
                      lockOptions, showFeedback, setBarDone, checkFn, continueFn, hintId) {
  if (!done && attempts === 0 && !selected) return;   // מסך נקי — לא נוגעים

  var correctEl = optEl(cfg.correctId);

  if (done) {
    if (phase === 'correct') {
      if (correctEl) { correctEl.classList.remove('selected'); correctEl.classList.add('correct'); }
    } else {
      /* wrong-final: הבחירה השגויה נשארת מסומנת, והנכונה מתווספת — אותו סדר
         כמו ב-check(), כך שגם אם השניים חופפים התוצאה ירוקה. */
      var wrongEl = selected ? optEl(selected) : null;
      if (wrongEl && selected !== cfg.correctId) {
        wrongEl.classList.remove('selected');
        wrongEl.classList.add('wrong');
      }
      if (correctEl) { correctEl.classList.remove('selected'); correctEl.classList.add('correct'); }
    }
    lockOptions();
    showFeedback(phase === 'correct' ? 'correct' : 'wrong2', phase === 'correct');
    setBarDone('המשך', continueFn);
    return;
  }

  /* לא נפתר. מחזירים את הבחירה ואת סימון הטעות, ואז מחשבים את הכפתור
     מ**אותו** predicate של scqNSelect — יש בחירה ⇒ פעיל. גם כשהוא מושבת אין
     כאן תקיעות: לחיצה על אופציה קוראת ל-Select, שמפעיל אותו ומנקה את הסימון,
     בדיוק כמו בזרימה החיה. */
  if (selected) {
    var selEl = optEl(selected);
    if (selEl) {
      if (phase === 'wrong1') selEl.classList.add('wrong');
      else { selEl.classList.add('selected'); selEl.setAttribute('aria-checked', 'true'); }
    }
  }
  if (phase === 'wrong1') {
    showFeedback('wrong1', false);
    if (hintId) { var hb = document.getElementById(hintId); if (hb) hb.hidden = false; }
  }
  var checkBtn = document.getElementById(prefix + '-check');
  if (checkBtn) {
    checkBtn.textContent = 'צדקתי?';
    checkBtn.onclick = checkFn;
    /* אחרי טעות הקוד החי משבית עד לבחירה חדשה; אחרת פעיל אם יש בחירה. */
    checkBtn.disabled = (phase === 'wrong1') || !selected;
  }
}

/* מסך 10 — משחק הזיכרון.
   resetScreenState10 מטפל בעצמו בשני הקצוות (סיום ⇒ מסך סיכום; אפס זיווגים
   ⇒ s11Init מחדש), אבל **לא** במצב שבאמצע: הוא יוצא מוקדם כש-s11Matches > 0,
   ואחרי טעינת עמוד זה משאיר לוח **ריק** — s11RenderBoard מעולם לא רץ.
   הציור כאן מרנדר את הלוח מ-s11Cards המשוחזר (כלומר אותו סידור בדיוק) ואז
   מחזיר את הקלפים שכבר זווגו למצבם. */
function s11RestoreUI() {
  if (s11Done) return;                       // resetScreenState10 מציג את מסך הסיכום
  if (s11Matches === 0) return;              // resetScreenState10 כבר קרא ל-s11Init
  if (!s11Cards.length) return;              // אין מה לצייר

  s11UpdatePairsCounter();
  s11RenderBoard();                          // אותו סידור — s11Cards לא עורבב מחדש

  /* הקלפים שזווגו נשארים הפוכים ומסומנים. s11-match-flash **לא** מוחזר:
     הוא אנימציית רגע ההתאמה, ולומד שחוזר כבר ראה אותה. */
  s11Cards.forEach(function (card, idx) {
    if (!card.matched) return;
    var el = document.querySelector('#s11-board .s11-card[data-idx="' + idx + '"]');
    if (el) el.classList.add('s11-flipped', 's11-matched');
  });

  /* אותו predicate של הזרימה החיה: הכפתור נפתח רק בשלושת הזיווגים. */
  var btn = document.getElementById('s11-btn-continue');
  if (btn) btn.disabled = (s11Matches !== 3);
  var game = document.getElementById('s11-game-view');
  var sum = document.getElementById('s11-summary-view');
  if (game) game.hidden = false;
  if (sum) sum.hidden = true;
}

/* ציור משותף לשלושת מסכי הגרירה שנכתבו ביד. שלושתם זהים במבנה ונבדלים רק
   בקידומת, ברשימת האזורים, בשמות סוגי הפידבק ובקיום מצב רמז — ולכן ציור אחד
   ולא שלושה עותקים שיכולים להיסחף.

   המיקום עצמו הוחזר כבר ב-applyResumeDom; כאן רק הסימון, הפידבק והכפתורים.
   משקף **רק** את כתיבות ה-DOM של sNNCheck: אין שינוי state, אין xapiAnswered
   ואין נגיעה ב-stationProgress (הוא הוחזר כבר ב-applyResumeVars).

   ⚠️ ההבחנה בין "נפתר" ל"נכשל סופית" נעשית לפי sNNLastAnswer ולא לפי הסימון:
   כשהלומד לחץ "התשובה הנכונה", sNNRevealCorrect הזיז את הפריטים לפתרון, ולכן
   הלוח **נראה** נכון בעוד התשובה שלו שרדה רק ב-LastAnswer (כלל 4 ב-CLAUDE.md). */
function restoreDragUI(cfg) {
  var anyPlaced = cfg.itemIds.some(function (id) {
    var el = document.getElementById(id);
    return el && el.parentElement && el.parentElement.id !== cfg.prefix + '-source-bank';
  });
  if (!cfg.done && cfg.att === 0 && !anyPlaced) return;   // מסך נקי

  /* אותו לופ סימון בדיוק כמו ב-sNNCheck. */
  cfg.zones.forEach(function (zoneId) {
    var zoneEl = document.getElementById(cfg.prefix + '-zone-' + zoneId);
    if (!zoneEl) return;
    var items = zoneEl.querySelectorAll('.' + cfg.prefix + '-drag-item');
    var zoneOk = items.length > 0;
    items.forEach(function (item) {
      var itemOk = item.dataset.correct === zoneId;
      if (!itemOk) zoneOk = false;
      item.classList.remove(cfg.prefix + '-item-correct', cfg.prefix + '-item-wrong');
      item.classList.add(itemOk ? cfg.prefix + '-item-correct' : cfg.prefix + '-item-wrong');
    });
    zoneEl.classList.toggle('correct', zoneOk);
    zoneEl.classList.toggle('wrong', !zoneOk);
  });

  var checkBtn = document.getElementById(cfg.checkBtnId);
  var revealBtn = cfg.revealBtnId ? document.getElementById(cfg.revealBtnId) : null;

  if (cfg.done) {
    if (!cfg.last) {
      cfg.showFeedback('correct', true);
    } else {
      cfg.showFeedback(cfg.showing ? cfg.kindFinal : cfg.kindPending, false);
      if (revealBtn) {
        revealBtn.hidden = false;
        revealBtn.textContent = cfg.showing ? 'התשובה שלי' : 'התשובה הנכונה';
      }
    }
    if (checkBtn) { checkBtn.textContent = 'המשך'; checkBtn.disabled = false; checkBtn.onclick = cfg.continueFn; }
    return;
  }

  /* ניסיון שגוי אחד, עוד לא נפתר. */
  if (cfg.att >= 1) {
    cfg.showFeedback(cfg.kindWrong1, false);
    if (cfg.hintBtnId && cfg.hintShown) {
      var hb = document.getElementById(cfg.hintBtnId);
      if (hb) { hb.hidden = false; hb.disabled = false; }
    }
  }
  /* מחשב מחדש מ**אותו** predicate של הזרימה החיה (sNNAllPlaced). הקוד החי
     משבית את הכפתור אחרי טעות והוא חוזר לפעולה רק בהצבה הבאה — אחרי טעינת
     עמוד זה היה משאיר לומד עם לוח מלא וכפתור מת. */
  cfg.updateBtn();
}

/* מסך 17 — ארבעה שדות קלט, עם טוגל "התשובה הנכונה" ⇄ "התשובה שלי".
   משקף **רק** את כתיבות ה-DOM של s18Check. הערכים עצמם הוחזרו כבר
   ב-applyResumeDom, ולכן s18LockInputs נקרא עם false גם במצב "מציג פתרון":
   קריאה עם true הייתה דורסת אותם מחדש ללא צורך. */
function s18RestoreUI() {
  if (!s18Done && s18Attempts === 0 &&
      !S18_IDS.some(function (id) { var el = document.getElementById(id); return el && el.value !== ''; })) return;

  var revealBtn = document.getElementById('s18-reveal-btn');
  s18ClearInputStateClasses();

  if (s18Done) {
    s18LockInputs(false);
    s18MarkInputs();
    if (s18Phase === 'correct') {
      s18ShowFeedback('correct', true);
    } else {
      s18ShowFeedback(s18ShowingCorrect ? 'wrong2' : 'wrongPending', false);
      if (revealBtn) {
        revealBtn.hidden = false;
        revealBtn.textContent = s18ShowingCorrect ? 'התשובה שלי' : 'התשובה הנכונה';
      }
    }
    s18SetBarDone('המשך', function () { s18Continue(); });
    return;
  }

  if (s18Attempts >= 1) {
    s18MarkInputs();
    s18ShowFeedback('wrong1', false);
    var hb = document.getElementById('s18-hint');
    if (hb) { hb.hidden = false; hb.disabled = false; }
  }
  /* מחשב מחדש מ**אותו** predicate של הזרימה החיה. s18Check משבית את הכפתור
     אחרי טעות והוא חוזר לפעולה רק דרך s18OnInput — בלי הקריאה הזאת מסך משוחזר
     עם כל השדות מלאים היה מציג כפתור מושבת בלי דרך להפעיל אותו. */
  s18OnInput();
}

/* מסך 18 — ארבע רשימות נפתחות, עם אותו טוגל. */
function s19RestoreUI() {
  if (!s19Done && s19Attempts === 0 &&
      !S19_IDS.some(function (id) { return s19DdValues[id] !== ''; })) return;

  var revealBtn = document.getElementById('s19-reveal-btn');

  if (s19Done) {
    s19LockDropdowns(false);
    s19MarkDropdowns();
    if (s19Phase === 'correct') {
      s19ShowFeedback('correct', true);
    } else {
      s19ShowFeedback(s19ShowingCorrect ? 'wrong2' : 'wrongPending', false);
      if (revealBtn) {
        revealBtn.hidden = false;
        revealBtn.textContent = s19ShowingCorrect ? 'התשובה שלי' : 'התשובה הנכונה';
      }
    }
    s19SetBarDone('המשך', function () { s19Continue(); });
    return;
  }

  if (s19Attempts >= 1) {
    s19MarkDropdowns();
    s19ShowFeedback('wrong1', false);
    var hb2 = document.getElementById('s19-hint');
    if (hb2) { hb2.hidden = false; hb2.disabled = false; }
  }
  s19OnChange();
}

/* מסך 2 — שני קלפי היפוך.
   כששניהם הופכו, resetScreenState2 כבר מצייר את המצב בעצמו (זה המסלול
   scr3Done שלו), ולכן כאן מטופל רק המצב **החלקי**: קלף אחד הופך והלומד עזב.
   בלי זה resetScreenState2 היה מאפס את שניהם, כלומר מבטל היפוך שכבר קרה. */
function scr3RestoreUI() {
  if (scr3Done) return;                                   // כבר טופל ב-reset
  if (!scr3Card1Flipped && !scr3Card2Flipped) return;      // מסך נקי
  if (scr3Card1Flipped) {
    var c1 = document.getElementById('flip-card-right');
    if (c1) c1.classList.add('flipped');
  }
  if (scr3Card2Flipped) {
    var c2 = document.getElementById('flip-card-left');
    if (c2) c2.classList.add('flipped');
  }
  /* אותו predicate של scr3FlipCard: הכפתור נפתח רק כששניהם הופכו. */
  var btn = document.getElementById('btn-s3-continue');
  if (btn) btn.disabled = !(scr3Card1Flipped && scr3Card2Flipped);
}

/* מסך 6 — קלף היפוך אחד.
   resetScreenState6 יוצא מוקדם כש-s7Flipped, ולכן אחרי טעינת עמוד ה-DOM נשאר
   נקי והציור כאן הוא מה שמחזיר אותו.
   ⚠️ ה-setTimeout של שתי השניות ב-s7FlipCard **לא** משוחזר במכוון: ההשהיה היא
   אפקט תצוגה לרגע ההיפוך עצמו, ולומד שחוזר כבר עבר אותו — השהייה חוזרת הייתה
   מקפיאה אותו מול כפתור מושבת בלי סיבה. */
function s7RestoreUI() {
  if (!s7Flipped) return;
  var card = document.getElementById('s7-flip-card');
  if (card) card.classList.add('flipped');
  var area = document.getElementById('s7-avatar-area');
  if (area) area.hidden = false;
  var btn = document.getElementById('s7-btn-continue');
  if (btn) btn.disabled = false;
}

/* מסך 13 — בחירה מרובה. נבדל משבעת האחרים בכך ש-scq14Selected מתאפס בכל טעות,
   ולכן סימוני הטעות באים מ-__scq14Wrong שנלכד מה-DOM. */
function restoreScq14UI() {
  if (!scq14Done && scq14Attempts === 0 && scq14Selected.length === 0) return;

  if (scq14Done) {
    __scq14Wrong.forEach(function (id) {
      var el = scq14OptEl(id);
      if (el) el.classList.add('wrong');
    });
    SCQ14.correctIds.forEach(function (cid) {
      var el = scq14OptEl(cid);
      if (el) { el.classList.remove('selected', 'wrong'); el.classList.add('correct'); }
    });
    scq14LockOptions();
    scq14ShowFeedback(scq14Phase === 'correct' ? 'correct' : 'wrong2', scq14Phase === 'correct');
    scq14SetBarDone('המשך', function () { scq14Continue(); });
    return;
  }

  __scq14Wrong.forEach(function (id) {
    var el = scq14OptEl(id);
    if (el) el.classList.add('wrong');
  });
  scq14Selected.forEach(function (id) {
    var el = scq14OptEl(id);
    if (el) { el.classList.add('selected'); el.setAttribute('aria-checked', 'true'); }
  });
  if (scq14Phase === 'wrong1') scq14ShowFeedback('wrong1', false);
  var btn = document.getElementById('scq14-check');
  if (btn) {
    btn.textContent = 'צדקתי?';
    btn.onclick = scq14Check;
    btn.disabled = scq14Selected.length === 0;
  }
}
