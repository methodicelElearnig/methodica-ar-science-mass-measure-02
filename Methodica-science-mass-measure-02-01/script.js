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

/* טוענים מראש (preload) את תמונות הדמות של הצבע הנבחר (אם כבר נשמר
   מביקור קודם), כדי שבכל מסך שמציג את הדמות התמונה כבר תהיה בקאש של
   הדפדפן ותצויר מיידית — בלי רגע ריק/מהבהב. במסך 1 עצמו (שם הבחירה
   נקבעת בפעם הראשונה) אין עדיין ערך שמור, אז זה רלוונטי בעיקר לחזרות. */
(function preloadCharacterAvatars() {
  const isGreen = window.lomdaState.selectedCharacter === 'green';
  const files = isGreen
    ? ['avatar-green.png', 'avatar-green-come-in.png', 'screen9_avatar_green_asking.png',
       'avatar-green-workout.gif', 'avatar-green-clapping-hands.png']
    : ['avatar-orange.png', 'avatar-orange-come-in.png', 'screen9_avatar_orange_asking.png',
       'avatar-orange-workout.gif', 'avatar-orange-clapping-hands.png'];
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
  const img = document.getElementById('s6-avatar-img');
  if (img) {
    img.src = (window.lomdaState.selectedCharacter === 'green')
      ? 'assets/images/avatar-green-come-in.png'
      : 'assets/images/avatar-orange-come-in.png';
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
  const img = document.getElementById('s7-avatar-img');
  if (img) {
    img.src = (window.lomdaState.selectedCharacter === 'green')
      ? 'assets/images/avatar-green-questioning.png'
      : 'assets/images/avatar-orange-questioning.png';
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
  const img = document.getElementById('s9-avatar-img');
  if (img) {
    img.src = (window.lomdaState.selectedCharacter === 'green')
      ? 'assets/images/screen9_avatar_green_asking.png'
      : 'assets/images/screen9_avatar_orange_asking.png';
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
}

function s9OpenHint() {
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
  const img = document.getElementById('s15-avatar-img');
  if (img) {
    img.src = (window.lomdaState.selectedCharacter === 'green')
      ? 'assets/images/avatar-green-clapping-hands.png'
      : 'assets/images/avatar-orange-clapping-hands.png';
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
}

function s18Continue() {
  goTo(18);
}

function s18OpenHint() {
  if (s18Done) return;
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
}

function s19Continue() {
  goTo(19);
}

function s19OpenHint() {
  if (s19Done) return;
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
}

function s20Continue() {
  /* קישור בין סינים: מסך אחרון בסיין 1 -> מסך ראשון בסיין 2 */
  window.location.href = '../Methodica-science-mass-measure-02-02/index.html';
}

function s20OpenHint() {
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
