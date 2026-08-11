'use strict';

/* =========================================================
   מנוע גלובלי — canvas scaling, ניווט מסכים, סטייט גלובלי
   ========================================================= */

const TOTAL_SCREENS = 5;
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
   resetScreenState0/4 יקבעו את ה-src הנכון, התמונה כבר תהיה בקאש
   של הדפדפן ותצויר מיידית — בלי רגע ריק/מהבהב בכניסה הראשונה למסך. */
(function preloadCharacterAvatars() {
  const isGreen = window.lomdaState.selectedCharacter === 'green';
  const imageFiles = isGreen ? ['avatar-green-dancing.gif'] : ['avatar-orange-dancing.gif'];
  const videoFiles = isGreen ? ['avatar-green-warming-muscles.mp4'] : ['avatar-orange-warming-muscles.mp4'];
  imageFiles.forEach(function (name) {
    const img = new Image();
    img.src = 'assets/images/' + name;
  });
  videoFiles.forEach(function (name) {
    const video = document.createElement('video');
    video.muted = true;
    video.preload = 'auto';
    video.src = 'assets/video/' + name;
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
}

/* בדיקה משותפת: האם הלומד עבר את שני חלקי משימת השיא הזאת בהצלחה מלאה?
   נקרא מתוך dqB.onContinue כדי להחליט אם לדלג על סיין 6 (מועד ב') */
function moedAFullyPassed() {
  let a = null, b = null;
  try {
    a = localStorage.getItem('lomda_moedA_partA_result');
    b = localStorage.getItem('lomda_moedA_partB_result');
  } catch (e) { /* localStorage חסום — נניח שלא עבר, כדי לא לדלג בטעות */ }
  return a === 'pass' && b === 'pass';
}

/* =========================================================
   מסך 1 — מסך מעבר: כל הכבוד! (פתיח למועד א של משימת השיא)
   ========================================================= */

function resetScreenState0() {
  const video = document.getElementById('s0-avatar-img');
  if (video) {
    video.src = (window.lomdaState.selectedCharacter === 'green')
      ? 'assets/video/avatar-green-warming-muscles.mp4'
      : 'assets/video/avatar-orange-warming-muscles.mp4';
    video.load();
    video.play().catch(function () {});
  }
}

function s0Continue() { goTo(1); }
function s0Back() {
  /* קישור בין סינים: מסך ראשון בסיין 5 -> מסך אחרון (2) בסיין 4 */
  window.location.href = '../Methodica-science-mass-measure-02-04/index.html#screen=1';
}

/* =========================================================
   מסך 2 — הקדמת יישומון: עזרו לטיסה להמריא (עותק ממסך 40
   בלומדת המקור; placeholder ריק במקום יישומון אמיתי)
   ========================================================= */

function resetScreenState1() { /* מסך סטטי — אין state לאפס */ }

function s1Continue() { goTo(2); }

/* =========================================================
   מסכים 3-4 — שאלת גרירה: דוח מסות המטוס (חלק א' / חלק ב')
   Factory משותף — 2 ניסיונות, רמז מוסתר עד לטעות ראשונה,
   ניסיון שני שגוי חושף את התשובות הנכונות (זהה למסך 41/42
   בלומדת המקור). תוצאת כל חלק (הצליח/נכשל) נשמרת ב-localStorage
   כדי שמסך תוצאה עתידי יוכל להחליט אם דרוש מועד ב.
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
    /* אחרת: יש התקדמות (הוצב קלף ו/או בוצע ניסיון) — לא מאפסים,
       משאירים את ה-DOM/state כמו שהלומד עזב אותם */
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

const TEXTS_DQ_A = {
  correct: { title: 'כל הכבוד!', body: 'השלמת את הטקסט בהצלחה' },
  wrong1: { title: 'התשובה אינה נכונה.', body: 'שננסה שוב?' },
  wrongFinalPending: { title: 'התשובה אינה נכונה.', body: 'רוצים לראות את הפתרון הנכון?' },
  wrongFinal: { title: 'התשובה אינה נכונה.', body: 'התשובות הנכונות מופיעות כעת.' }
};

const dqA = makeDragQuestion({
  prefix: 'dqA',
  screenSelector: '.screen-5',
  panelId: 'dqA-question-panel',
  checkBtnId: 'dqA-btn-check',
  hintBtnId: 'dqA-btn-hint',
  hintOverlayId: 'hint-popup-dqA',
  feedboxId: 'dqA-feedbox',
  revealBtnId: 'dqA-reveal-btn',
  resultKey: 'lomda_moedA_partA_result',
  onContinue: function () { goTo(3); },
  labels: {
    'dqA-drag-41': '41',
    'dqA-drag-38': '38',
    'dqA-drag-neto': 'נטו',
    'dqA-drag-tara': 'טרה',
    /* מסיחים מטעים — לא תשובות נכונות לאף יעד, רק כדי שהלומד יחשוב */
    'dqA-drag-bruto': 'ברוטו',
    'dqA-drag-53': '53',
    'dqA-drag-78': '78'
  },
  correctMap: {
    'dqA-target-1': 'dqA-drag-41',
    'dqA-target-2': 'dqA-drag-tara',
    'dqA-target-3': 'dqA-drag-38',
    'dqA-target-4': 'dqA-drag-neto'
  },
  texts: TEXTS_DQ_A
});

function resetScreenState2() { dqA.reset(); }

const TEXTS_DQ_B = {
  correct: { title: 'כל הכבוד!', body: 'המטוס קיבל אישור המראה! הצלחתם לזהות ולחשב נכון את מושגי המסה ואת יחידות המידה המתאימות.' },
  wrong1: { title: 'התשובה אינה נכונה.', body: 'שננסה שוב?' },
  wrongFinalPending: { title: 'התשובה אינה נכונה.', body: 'רוצים לראות את הפתרון הנכון?' },
  wrongFinal: { title: 'התשובה אינה נכונה.', body: 'התשובות הנכונות מופיעות כעת.' }
};

const dqB = makeDragQuestion({
  prefix: 'dqB',
  screenSelector: '.screen-6',
  panelId: 'dqB-question-panel',
  checkBtnId: 'dqB-btn-check',
  hintBtnId: 'dqB-btn-hint',
  hintOverlayId: 'hint-popup-dqB',
  feedboxId: 'dqB-feedbox',
  revealBtnId: 'dqB-reveal-btn',
  resultKey: 'lomda_moedA_partB_result',
  onContinue: function () {
    if (moedAFullyPassed()) {
      /* עברו את שני חלקי משימת השיא בהצלחה מלאה — מדלגים על כל
         סיין 6 (מועד ב') ועוברים ישר למסך המעבר של הצלחה */
      goTo(4);
    } else {
      /* לא עברו בהצלחה מלאה — ממשיכים לסיין 6 (מועד ב') */
      window.location.href = '../Methodica-science-mass-measure-02-06/index.html';
    }
  },
  labels: {
    'dqB-drag-79': '79',
    'dqB-drag-bruto': 'ברוטו',
    'dqB-drag-ton': 'טון',
    'dqB-drag-tara': 'טרה',
    /* מסיחים מטעים — לא תשובות נכונות לאף יעד, רק כדי שהלומד יחשוב */
    'dqB-drag-neto': 'נטו',
    'dqB-drag-53': '53',
    'dqB-drag-41': '41'
  },
  correctMap: {
    'dqB-target-1': 'dqB-drag-79',
    'dqB-target-2': 'dqB-drag-bruto',
    'dqB-target-3': 'dqB-drag-ton',
    'dqB-target-4': 'dqB-drag-tara'
  },
  texts: TEXTS_DQ_B
});

function resetScreenState3() { dqB.reset(); }

/* =========================================================
   מסך 5 — מסך מעבר: הצלחה (בלי בועית דיבור)
   מוצג רק אם עברו את שני חלקי משימת השיא בהצלחה מלאה בניסיון
   הראשון (moedAFullyPassed) — במקרה כזה מדלגים על סיין 6 כליל.
   ========================================================= */

function resetScreenState4() {
  const img = document.getElementById('s4t-avatar-img');
  if (img) {
    img.src = (window.lomdaState.selectedCharacter === 'green')
      ? 'assets/images/avatar-green-dancing.gif'
      : 'assets/images/avatar-orange-dancing.gif';
  }
}
/* TODO: "סיימתי" — אין עדיין פעולה מוגדרת (סוף היקף הבנייה הנוכחי) */
function s4Finish() {
  console.log('TODO: כפתור "סיימתי" (מסך 5) — לחבר לפעולת סיום הלומדה כשתיבנה.');
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
   בכל פתיחה. אין כפתור סגירה (X) — הפופ-אפ נסגר רק בניווט למסך
   אחר, בתחילת ניסיון חדש, או בלחיצה על כפתור המעבר
   "התשובה הנכונה"/"התשובה שלי". מיושם על כל תיבות המשוב בסיין 5:
   dqA-feedbox, dqB-feedbox.
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

/* אתחול */
scaleApp();
resetScreenState(0);
scqFbMakeDraggable('dqA-feedbox');
scqFbMakeDraggable('dqB-feedbox');

/* קישור בין סינים: הגעה לכאן דרך "חזרה" מהסיין הבא נכנסת ישירות למסך
   המבוקש לפי #screen=N ב-URL, במקום למסך הראשון כברירת מחדל */
(function jumpToLinkedScreen() {
  const m = /^#screen=(\d+)$/.exec(location.hash);
  if (m) goTo(parseInt(m[1], 10));
})();
