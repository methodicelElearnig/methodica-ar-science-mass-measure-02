'use strict';

/* =========================================================
   מנוע גלובלי — canvas scaling, ניווט מסכים, סטייט גלובלי
   ========================================================= */

const TOTAL_SCREENS = 9;
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

/* טוענים מראש (preload) את תמונות הדמות של הצבע הנבחר, כדי שכש-
   resetScreenState0/7/8 יקבעו את ה-src הנכון, התמונה כבר תהיה בקאש
   של הדפדפן ותצויר מיידית — בלי רגע ריק/מהבהב בכניסה הראשונה למסך. */
(function preloadCharacterAvatars() {
  const isGreen = window.lomdaState.selectedCharacter === 'green';
  const files = isGreen
    ? ['avatar-green-waving-v.jpg', 'avatar-green-thank-you.jpg', 'avatar-green-dancing.gif']
    : ['avatar-orange-waving-v.jpg', 'avatar-orange-thank-you.jpg', 'avatar-orange-dancing.gif'];
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
}

/* בדיקה: האם הלומד עבר את שני חלקי מועד ב' בהצלחה מלאה?
   (חלק א' = מסך 3/tbl9 — תואם למנגנון peakPartAStatus בלומדת המקור,
   שנקבע רק ע"י מסך 34/הטבלה, לא ע"י מסך 35/המשפטים;
   חלק ב' = מסך 7/s12 — תואם ל-peakPartBStatus, נקבע ע"י מסך 38) */
function moedBFullyPassed() {
  let a = null, b = null;
  try {
    a = localStorage.getItem('lomda_moedB_partA_step1_result');
    b = localStorage.getItem('lomda_moedB_partB_result');
  } catch (e) { /* localStorage חסום — נניח שלא עבר */ }
  return a === 'pass' && b === 'pass';
}

/* =========================================================
   מסך 1 — מסך מעבר: פתיח מועד ב' (משימת שיא 2)
   רפרנס עיצובי: מסך המעבר הראשון בסיין 5 (.s1-content/.transition-* —
   בלי סימולציה)
   ========================================================= */

function resetScreenState0() {
  const img = document.getElementById('s6-avatar-img');
  if (img) {
    img.src = (window.lomdaState.selectedCharacter === 'green')
      ? 'assets/images/avatar-green-waving-v.jpg'
      : 'assets/images/avatar-orange-waving-v.jpg';
  }
}
function s6Continue() { goTo(1); }
function s6Back() {
  /* קישור בין סינים: מסך ראשון בסיין 6 -> חלק ב' (מסך 4) בסיין 5,
     נקודת ההסתעפות שממנה נכנסים לסיין 6 (מועד ב') כשלא עוברים בהצלחה מלאה */
  window.location.href = '../Methodica-science-mass-measure-02-05/index.html#screen=3';
}

/* =========================================================
   מסך 2 — הידעת? (Frame - text with img, פיגמה)
   מסך סטטי — ללא אינטראקציה, תמונה = צילום פסולת פלסטיק בחוף
   ========================================================= */

function resetScreenState1() {
  const btn = document.getElementById('s8-continue-btn');
  if (!btn) return;
  btn.hidden = true;
  setTimeout(function () { btn.hidden = false; }, 5000);
}
function s7Continue() { goTo(2); }

/* =========================================================
   מסך 3 — השלמת כותרות טבלה בגרירה (עותק מסך 34 בלומדת המקור)
   מנגנון: makeDragQuestion המשותף (2 ניסיונות, חשיפת תשובה
   נכונה אחרי ניסיון שני שגוי). רמז גלוי+מופעל מההתחלה (btn-hint
   ללא hidden), בדיוק כמו מסך 34 המקורי (class="btn-hint enabled")
   ========================================================= */

function makeDragQuestion(cfg) {
  const P = cfg.prefix;
  const labels = cfg.labels;
  const correctMap = cfg.correctMap;
  const dragIds = Object.keys(labels);
  const targetIds = Object.keys(correctMap);
  let placement = {};
  dragIds.forEach(function (id) { placement[id] = 'source'; });

  let dragActive = null;
  let dropHandled = false;
  let checked = false;
  let attempts = 0;
  let done = false;
  let lastWrongPlacement = null;
  let showingCorrect = false;

  function render() {
    dragIds.forEach(function (dragId) {
      const slot = document.getElementById('slot-' + dragId);
      if (!slot) return;
      slot.innerHTML = '';
      const card = document.createElement('div');
      card.className = 'dq-drag-card';
      card.id = dragId;
      if (placement[dragId] === 'source') {
        card.textContent = labels[dragId];
        if (!checked) {
          card.draggable = true;
          card.ondragstart = function (e) { dragStart(e, dragId); };
          card.ondragend = dragEnd;
        } else {
          card.classList.add('locked');
        }
      } else {
        card.classList.add('ghost');
        card.textContent = labels[dragId];
      }
      slot.appendChild(card);
    });

    targetIds.forEach(function (targetId) {
      const zone = document.getElementById(targetId);
      if (!zone) return;
      let placedId = null;
      dragIds.forEach(function (dId) { if (placement[dId] === targetId) placedId = dId; });
      zone.innerHTML = '';
      if (placedId) {
        zone.classList.add('occupied');
        const placed = document.createElement('div');
        placed.className = 'dq-placed-card';
        placed.textContent = labels[placedId];
        if (!checked) {
          placed.draggable = true;
          placed.addEventListener('dragstart', function (e) { placedDragStart(e, placedId); });
          placed.addEventListener('dragend', dragEnd);
        } else {
          placed.classList.add('locked');
        }
        zone.appendChild(placed);
      } else {
        zone.classList.remove('occupied');
      }
    });

    const allFilled = targetIds.every(function (tId) {
      return dragIds.some(function (dId) { return placement[dId] === tId; });
    });
    const btn = document.getElementById(cfg.checkBtnId);
    if (btn && !done) btn.disabled = !allFilled;
  }

  function dragStart(e, dragId) {
    if (checked) { e.preventDefault(); return; }
    dragActive = dragId;
    dropHandled = false;
    e.dataTransfer.setData('text/plain', dragId);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(function () {
      const card = document.getElementById(dragId);
      if (card) card.classList.add('dragging');
    }, 0);
  }

  function placedDragStart(e, dragId) {
    if (checked) { e.preventDefault(); return; }
    dragActive = dragId;
    dropHandled = false;
    e.dataTransfer.setData('text/plain', dragId);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(function () {
      const oldZoneId = placement[dragId];
      placement[dragId] = 'source';
      const oldZone = document.getElementById(oldZoneId);
      if (oldZone) oldZone.classList.remove('correct', 'wrong');
      render();
      const card = document.getElementById(dragId);
      if (card) card.classList.add('dragging');
    }, 0);
  }

  function dragEnd() {
    if (!dropHandled && dragActive) {
      placement[dragActive] = 'source';
      render();
    }
    dragActive = null;
    dropHandled = false;
    document.querySelectorAll(cfg.screenSelector + ' .drag-over').forEach(function (z) {
      z.classList.remove('drag-over');
    });
  }

  function dragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
  function dragEnter(e, targetId) {
    e.preventDefault();
    const zone = document.getElementById(targetId);
    if (zone) zone.classList.add('drag-over');
  }
  function dragLeave(e, targetId) {
    const zone = document.getElementById(targetId);
    if (zone) zone.classList.remove('drag-over');
  }

  function drop(e, targetId) {
    e.preventDefault();
    const zone = document.getElementById(targetId);
    if (zone) zone.classList.remove('drag-over', 'correct', 'wrong');
    if (!dragActive) return;
    dropHandled = true;
    dragIds.forEach(function (dId) {
      if (placement[dId] === targetId && dId !== dragActive) placement[dId] = 'source';
    });
    placement[dragActive] = targetId;
    dragActive = null;
    render();
  }

  function dropToBank(e) {
    e.preventDefault();
    if (!dragActive) return;
    dropHandled = true;
    placement[dragActive] = 'source';
    dragActive = null;
    render();
  }

  function showFeedback(kind) {
    const box = document.getElementById(cfg.feedboxId);
    box.querySelector('.scq-fb-title-text').textContent = cfg.texts[kind].title;
    box.querySelector('.scq-fb-body').textContent = cfg.texts[kind].body;
    box.classList.remove('is-correct', 'is-wrong');
    box.classList.add(kind === 'correct' ? 'is-correct' : 'is-wrong');
    scqFbResetPosition(cfg.feedboxId);
    box.classList.add('visible');
  }
  function hideFeedback() { document.getElementById(cfg.feedboxId).classList.remove('visible'); }

  function revealCorrect() {
    dragIds.forEach(function (dId) { placement[dId] = 'source'; });
    targetIds.forEach(function (tId) {
      const dId = correctMap[tId];
      placement[dId] = tId;
      const zone = document.getElementById(tId);
      if (zone) { zone.classList.remove('wrong'); zone.classList.add('correct'); }
    });
    checked = true;
    render();
  }

  function saveResult(passed) {
    try { localStorage.setItem(cfg.resultKey, passed ? 'pass' : 'fail'); } catch (e) {}
  }

  function check() {
    if (done) return;
    checked = true;
    attempts++;

    let allCorrect = true;
    targetIds.forEach(function (tId) {
      const valid = correctMap[tId];
      let placed = null;
      dragIds.forEach(function (dId) { if (placement[dId] === tId) placed = dId; });
      const ok = (placed === valid) || (placed && labels[placed] === labels[valid]);
      if (!ok) allCorrect = false;
      const zone = document.getElementById(tId);
      if (zone) { zone.classList.remove('correct', 'wrong'); zone.classList.add(ok ? 'correct' : 'wrong'); }
    });

    render();

    const btn = document.getElementById(cfg.checkBtnId);
    if (allCorrect) {
      done = true;
      saveResult(true);
      showFeedback('correct');
      if (btn) { btn.textContent = 'המשך'; btn.disabled = false; btn.onclick = cfg.onContinue; }
    } else if (attempts >= 2) {
      done = true;
      saveResult(false);
      if (cfg.revealBtnId) {
        /* דריסה: הפתרון לא נחשף אוטומטית — רק בלחיצה על "התשובה הנכונה" */
        lastWrongPlacement = Object.assign({}, placement);
        showingCorrect = false;
        showFeedback('wrongFinalPending');
        const revealBtn = document.getElementById(cfg.revealBtnId);
        if (revealBtn) { revealBtn.hidden = false; revealBtn.textContent = 'התשובה הנכונה'; }
      } else {
        revealCorrect();
        showFeedback('wrongFinal');
      }
      if (btn) { btn.textContent = 'המשך'; btn.disabled = false; btn.onclick = cfg.onContinue; }
    } else {
      showFeedback('wrong1');
      checked = false;
      render();
      const hintBtn = document.getElementById(cfg.hintBtnId);
      if (hintBtn) hintBtn.hidden = false;
      if (btn) { btn.innerHTML = '<span dir="ltr">?צדקתי</span>'; btn.disabled = true; btn.onclick = check; }
    }
  }

  function showMyAnswer() {
    placement = Object.assign({}, lastWrongPlacement);
    targetIds.forEach(function (tId) {
      const valid = correctMap[tId];
      let placed = null;
      dragIds.forEach(function (dId) { if (placement[dId] === tId) placed = dId; });
      const ok = (placed === valid) || (placed && labels[placed] === labels[valid]);
      const zone = document.getElementById(tId);
      if (zone) { zone.classList.remove('correct', 'wrong'); zone.classList.add(ok ? 'correct' : 'wrong'); }
    });
    render();
    showFeedback('wrongFinalPending');
  }

  function revealSolution() {
    if (!cfg.revealBtnId) return;
    const revealBtn = document.getElementById(cfg.revealBtnId);
    if (showingCorrect) {
      showMyAnswer();
      showingCorrect = false;
      if (revealBtn) revealBtn.textContent = 'התשובה הנכונה';
    } else {
      revealCorrect();
      showFeedback('wrongFinal');
      showingCorrect = true;
      if (revealBtn) revealBtn.textContent = 'התשובה שלי';
    }
  }

  function openHint() {
    const hintBtn = document.getElementById(cfg.hintBtnId);
    if (hintBtn) hintBtn.disabled = true;
    document.getElementById(cfg.hintOverlayId).hidden = false;
  }
  function closeHint() {
    document.getElementById(cfg.hintOverlayId).hidden = true;
    const hintBtn = document.getElementById(cfg.hintBtnId);
    if (hintBtn) hintBtn.disabled = false;
  }

  function resetInitial() {
    done = false; checked = false; attempts = 0; dragActive = null; dropHandled = false;
    lastWrongPlacement = null; showingCorrect = false;
    dragIds.forEach(function (dId) { placement[dId] = 'source'; });
    targetIds.forEach(function (tId) {
      const zone = document.getElementById(tId);
      if (zone) zone.classList.remove('correct', 'wrong', 'occupied', 'drag-over');
    });
    hideFeedback();
    const hintBtn = document.getElementById(cfg.hintBtnId);
    if (hintBtn) { hintBtn.hidden = true; hintBtn.disabled = false; }
    document.getElementById(cfg.hintOverlayId).hidden = true;
    if (cfg.revealBtnId) {
      const revealBtn = document.getElementById(cfg.revealBtnId);
      if (revealBtn) { revealBtn.hidden = true; revealBtn.textContent = 'התשובה הנכונה'; }
    }
    const btn = document.getElementById(cfg.checkBtnId);
    if (btn) { btn.innerHTML = '<span dir="ltr">?צדקתי</span>'; btn.disabled = true; btn.onclick = check; }
    const panel = document.getElementById(cfg.panelId);
    if (panel) panel.scrollTop = 0;
    render();
  }

  function restoreFinal() {
    const btn = document.getElementById(cfg.checkBtnId);
    if (btn) { btn.textContent = 'המשך'; btn.disabled = false; btn.onclick = cfg.onContinue; }
    const hintBtn = document.getElementById(cfg.hintBtnId);
    if (hintBtn) hintBtn.hidden = true;
    render();
  }

  function reset() {
    const hasProgress = attempts > 0 || Object.values(placement).some(function (v) { return v !== 'source'; });
    if (done) restoreFinal();
    else if (!hasProgress) resetInitial();
    /* else: יש התקדמות (ניסיון או פריט מוצב) — לא מאפסים, משאירים כמו שהלומד השאיר */
  }

  window[P + 'DragOver'] = dragOver;
  window[P + 'DragEnter'] = dragEnter;
  window[P + 'DragLeave'] = dragLeave;
  window[P + 'Drop'] = drop;
  window[P + 'DropToBank'] = dropToBank;
  window[P + 'Check'] = check;
  window[P + 'OpenHint'] = openHint;
  window[P + 'CloseHint'] = closeHint;
  window[P + 'Reveal'] = revealSolution;
  window[P + 'Reset'] = reset;

  return { reset: reset };
}

const TEXTS_TBL9 = {
  correct: { title: 'מצוין!', body: 'אתם מבינים בדיוק מהו כל אחד מהמושגים: ברוטו, טרה ונטו.' },
  wrong1: { title: 'התשובה אינה נכונה.', body: 'שננסה שוב?' },
  wrongFinalPending: { title: 'התשובה לא נכונה.', body: 'רוצים לראות את הפתרון הנכון?' },
  wrongFinal: { title: 'התשובה לא נכונה.', body: 'נסו לחזור ולהיזכר מהו כל אחד מהמושגים: ברוטו, טרה ונטו.' }
};

const tbl9Q = makeDragQuestion({
  prefix: 'tbl9',
  screenSelector: '#s8',
  panelId: 'tbl9-scroll-area',
  checkBtnId: 'tbl9-check',
  hintBtnId: 'tbl9-hint',
  hintOverlayId: 'tbl9-hint-overlay',
  feedboxId: 'tbl9-feedbox',
  revealBtnId: 'tbl9-reveal-btn',
  resultKey: 'lomda_moedB_partA_step1_result',
  onContinue: function () { goTo(3); },
  labels: {
    'tbl9-drag-bruto': 'ברוטו',
    'tbl9-drag-neto': 'נטו',
    'tbl9-drag-tara': 'טרה',
    'tbl9-drag-masa': 'מסה'
  },
  correctMap: {
    'tbl9-target-bruto': 'tbl9-drag-bruto',
    'tbl9-target-tara': 'tbl9-drag-tara',
    'tbl9-target-neto': 'tbl9-drag-neto'
  },
  texts: TEXTS_TBL9
});
function resetScreenState2() {
  tbl9Q.reset();
}

/* =========================================================
   מסך 4 — השלמת משפטים בגרירה (עותק מסך 35 בלומדת המקור)
   ========================================================= */

const TEXTS_PARA10 = {
  correct: { title: 'כל הכבוד!', body: 'השלמת את הטקסט בהצלחה' },
  wrong1: { title: 'התשובה אינה נכונה.', body: 'שננסה שוב?' },
  wrongFinalPending: { title: 'התשובה לא נכונה.', body: 'רוצים לראות את הפתרון הנכון?' },
  wrongFinal: { title: 'התשובה לא נכונה.', body: 'התשובות הנכונות מוצגות כעת.' }
};

const para10Q = makeDragQuestion({
  prefix: 'para10',
  screenSelector: '#s9',
  panelId: 'para10-scroll-area',
  checkBtnId: 'para10-check',
  hintBtnId: 'para10-hint',
  hintOverlayId: 'para10-hint-overlay',
  feedboxId: 'para10-feedbox',
  revealBtnId: 'para10-reveal-btn',
  resultKey: 'lomda_moedB_partA_step2_result',
  onContinue: function () { goTo(4); },
  labels: {
    'para10-drag-bruto': 'ברוטו',
    'para10-drag-neto': 'נטו',
    'para10-drag-tara-1': 'טרה',
    'para10-drag-tara-2': 'טרה',
    'para10-drag-masa': 'מסה',
    'para10-drag-shinua': 'שינוע',
    'para10-drag-psholet': 'פסולת',
    'para10-drag-nmuka': 'נמוכה',
    'para10-drag-ton': 'טון',
    'para10-drag-kilogram': 'קילוגרם',
    'para10-drag-ariza': 'אריזה',
    'para10-drag-tochn': 'תוכן'
  },
  correctMap: {
    'para10-target-1': 'para10-drag-neto',
    'para10-target-2': 'para10-drag-tara-1',
    'para10-target-3': 'para10-drag-bruto',
    'para10-target-4': 'para10-drag-tara-2',
    'para10-target-5': 'para10-drag-nmuka',
    'para10-target-6': 'para10-drag-masa',
    'para10-target-7': 'para10-drag-shinua',
    'para10-target-8': 'para10-drag-psholet'
  },
  texts: TEXTS_PARA10
});
function para10OpenHint() { document.getElementById('para10-hint-overlay').hidden = false; }
function para10CloseHint() { document.getElementById('para10-hint-overlay').hidden = true; }

function resetScreenState3() {
  para10Q.reset();
  const hb = document.getElementById('para10-hint');
  if (hb) hb.hidden = false;
}

/* =========================================================
   מסך 5 — טבלה בלבד (עותק מסך 36; פוצל ממסך אחד למסך טבלה
   + מסך שיח נפרד, לפי בקשת המשתמש)
   ========================================================= */

function resetScreenState4() { /* מסך סטטי — אין state לאפס */ }

function s10Continue() { goTo(5); }

/* =========================================================
   מסך 6 — טבלה מוקטנת + שיח דמויות בהופעה מושהית (פוצל ממסך 5)
   (השהיה חדשה — לא קיימת בלומדת המקור; המשך מופיע רק אחרי
   שהדמויות+בועיות הדיבור נחשפות)
   ========================================================= */

const S11_REVEAL_DELAY_MS = 2500;
let s11RevealTimer = null;

function resetScreenState5() {
  const dlg = document.getElementById('s11-dialogue');
  const btn = document.getElementById('s10b-continue');
  if (dlg) dlg.classList.remove('revealed');
  if (btn) btn.hidden = true;
  if (s11RevealTimer) clearTimeout(s11RevealTimer);
  s11RevealTimer = setTimeout(function () {
    if (dlg) dlg.classList.add('revealed');
    if (btn) btn.hidden = false;
  }, S11_REVEAL_DELAY_MS);
}

function s10bContinue() { goTo(6); }

/* =========================================================
   מסך 7 — שאלת בחירה יחידה: סעיף ג של מועד ב' (עותק מסך 38)
   כפתור "הזכירו לי את הנתונים בטבלה" פותח פופ-אפ עם טבלת הנתונים
   (לפי שקפים 156-160 — שונה ממנגנון הרמז הגנרי של מסך 38 המקורי)
   ========================================================= */

const S12_CORRECT_ID = 's12-opt-c';
const TEXTS_S12 = {
  correct: { title: 'נכון מאוד.', body: 'במקרה זה שני הטיעונים נכונים. מצד אחד יש יתרון לשימוש בפלסטיק (פחות מסה לשינוע ופחות פליטות CO2), ומצד שני, קיים גם חיסרון שהוא מייצר יותר פסולת בסביבה.' },
  wrong1: { title: 'התשובה אינה נכונה.', body: 'ננסה שוב?' },
  wrongFinal: { title: 'התשובה אינה נכונה.', body: 'במקרה זה שני הטיעונים נכונים. מצד אחד יש יתרון לשימוש בפלסטיק (פחות מסה לשינוע ופחות פליטות CO2), ומצד שני, קיים גם חיסרון שהוא מייצר יותר פסולת בסביבה.' }
};

let s12Selected = null;
let s12Attempts = 0;
let s12Done = false;

function s12Select(id) {
  if (s12Done) return;
  document.querySelectorAll('#s11 .s12-opt.selected').forEach(function (el) {
    el.classList.remove('selected');
    el.setAttribute('aria-checked', 'false');
  });
  const opt = document.getElementById(id);
  if (!opt || opt.classList.contains('locked')) return;
  s12Selected = id;
  opt.classList.add('selected');
  opt.setAttribute('aria-checked', 'true');
  const btn = document.getElementById('s12-check');
  if (btn) btn.disabled = false;
}

function s12ShowFeedback(kind, isCorrect) {
  const box = document.getElementById('s12-feedbox');
  box.querySelector('.scq-fb-title-text').textContent = TEXTS_S12[kind].title;
  box.querySelector('.scq-fb-body').textContent = TEXTS_S12[kind].body;
  box.classList.remove('is-correct', 'is-wrong');
  box.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  scqFbResetPosition('s12-feedbox');
  box.classList.add('visible');
}

function s12Check() {
  if (s12Done || !s12Selected) return;
  s12Attempts++;
  const isCorrect = (s12Selected === S12_CORRECT_ID);
  const btn = document.getElementById('s12-check');

  if (isCorrect) {
    s12Done = true;
    try { localStorage.setItem('lomda_moedB_partB_result', 'pass'); } catch (e) {}
    const el = document.getElementById(S12_CORRECT_ID);
    if (el) { el.classList.remove('selected'); el.classList.add('correct', 'locked'); }
    document.querySelectorAll('#s11 .s12-opt').forEach(function (o) {
      if (!o.classList.contains('correct')) o.classList.add('locked');
    });
    s12ShowFeedback('correct', true);
    if (btn) { btn.textContent = 'המשך'; btn.disabled = false; btn.onclick = s12Continue; }
  } else if (s12Attempts >= 2) {
    s12Done = true;
    try { localStorage.setItem('lomda_moedB_partB_result', 'fail'); } catch (e) {}
    const wrongEl = document.getElementById(s12Selected);
    if (wrongEl) { wrongEl.classList.remove('selected'); wrongEl.classList.add('wrong', 'locked'); }
    const corEl = document.getElementById(S12_CORRECT_ID);
    if (corEl) corEl.classList.add('correct', 'locked');
    document.querySelectorAll('#s11 .s12-opt').forEach(function (o) {
      if (!o.classList.contains('correct') && !o.classList.contains('wrong')) o.classList.add('locked');
    });
    s12ShowFeedback('wrongFinal', false);
    if (btn) { btn.textContent = 'המשך'; btn.disabled = false; btn.onclick = s12Continue; }
  } else {
    const wrongEl = document.getElementById(s12Selected);
    if (wrongEl) wrongEl.classList.add('wrong');
    s12Selected = null;
    s12ShowFeedback('wrong1', false);
    if (btn) { btn.disabled = true; }
    setTimeout(function () { if (wrongEl) wrongEl.classList.remove('wrong', 'selected'); }, 800);
  }
}

/* בהגעה למסך זה, מועד א' כבר ידוע ככושל (אחרת היינו מדלגים על כל
   סיין 6 דרך dqB.onContinue בסיין 5) — לכן ההכרעה כאן היא רק לפי
   מועד ב': הצליח בו במלואו → מסך 9 (הצלחה כוללת, "או" מועד א' או
   מועד ב'). נכשל גם בו → מסך 8 (נכשל בשני המועדים). */
function s12Continue() {
  if (moedBFullyPassed()) {
    goTo(8); // מסך 9 — הצלחה
  } else {
    goTo(7); // מסך 8 — לא הצליח באף מועד
  }
}

function s12Back() { goTo(5); }

function s12OpenHint() { document.getElementById('s12-hint-overlay').hidden = false; }
function s12CloseHint() { document.getElementById('s12-hint-overlay').hidden = true; }

function resetScreenState6() {
  if (s12Done || s12Attempts > 0 || s12Selected) return;
  s12Selected = null;
  s12Attempts = 0;
  document.querySelectorAll('#s11 .s12-opt').forEach(function (el) {
    el.className = 's12-opt';
    el.setAttribute('aria-checked', 'false');
  });
  document.getElementById('s12-feedbox').classList.remove('visible');
  const btn = document.getElementById('s12-check');
  if (btn) { btn.innerHTML = '<span dir="ltr">?צדקתי</span>'; btn.disabled = true; btn.onclick = s12Check; }
  document.getElementById('s12-hint-overlay').hidden = true;
}

/* =========================================================
   מסך 8 — מסך מעבר: לא הצליח באף מועד (בלי בועית דיבור)
   מסך 9 — מסך מעבר: הצלחה (בלי בועית דיבור)
   שני המסכים הם מסכי סיום — כפתור "סיימתי" במקום "המשך"
   ========================================================= */

function resetScreenState7() {
  const img = document.getElementById('s12t-avatar-img');
  if (img) {
    img.src = (window.lomdaState.selectedCharacter === 'green')
      ? 'assets/images/avatar-green-thank-you.jpg'
      : 'assets/images/avatar-orange-thank-you.jpg';
  }
}
/* TODO: "סיימתי" — אין עדיין פעולה מוגדרת (סוף היקף הבנייה הנוכחי) */
function s13Finish() {
  console.log('TODO: כפתור "סיימתי" (מסך 8) — לחבר לפעולת סיום הלומדה כשתיבנה.');
}

function resetScreenState8() {
  const img = document.getElementById('s13t-avatar-img');
  if (img) {
    img.src = (window.lomdaState.selectedCharacter === 'green')
      ? 'assets/images/avatar-green-dancing.gif'
      : 'assets/images/avatar-orange-dancing.gif';
  }
}
function s14Finish() {
  console.log('TODO: כפתור "סיימתי" (מסך 9) — לחבר לפעולת סיום הלומדה כשתיבנה.');
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
   בכל פתיחה, כפתור סגירה (X) שלא נוגע בסטייט התשובה. מיושם על כל
   תיבות המשוב בסיין 6: tbl9-feedbox, para10-feedbox, s12-feedbox.
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

/* =========================================================
   הגדלת תמונה (img-zoom) — לפי מפרט 720-templates
   _global-components.md. רכיב גלובלי יחיד, משותף לכל תמונות
   התוכן בסיין (תמונת "הידעת?" ב-.s8-img-inner ותמונת שאלת
   s11 ב-.scq-img-inner) — לא מוגבל לפריים ספציפי, כי הכפתור
   תמיד יושב ישירות בתוך ה-wrapper של התמונה (ראו מפרט המרקאפ).
   ========================================================= */

function imgZoomOpen(trigger) {
  const modal = document.getElementById('img-zoom-modal');
  const stage = modal && modal.querySelector('.img-zoom-modal__stage');
  const frame = trigger.parentElement;
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

/* אתחול */
scaleApp();
resetScreenState(0);
scqFbMakeDraggable('tbl9-feedbox');
scqFbMakeDraggable('para10-feedbox');
scqFbMakeDraggable('s12-feedbox');
