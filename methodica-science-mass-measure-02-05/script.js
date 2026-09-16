'use strict';

/* =========================================================
   מנוע גלובלי — canvas scaling, ניווט מסכים, סטייט גלובלי
   ========================================================= */

const TOTAL_SCREENS = 5;
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
     את הערך אחר כך ב-adoptUnitCharacter (unit-js/50-loader.js, שלב א'),
     מאחורי #boot-cover.
     typeof: 40-resume.js שנכשל בטעינה לא אמור להפיל את כל script.js. */
  savedCharacter = (typeof getUnitCharacter === 'function')
    ? getUnitCharacter()
    : localStorage.getItem('lomda_selectedCharacter');
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
    img.src = '../unit-assets/img/' + name;   /* the list above is dancing GIFs only, and they live at unit level */
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
  /* resume: ציור מצב "נענה" של המסך הזה — applyExecutionState מצייר את מסך
     הנחיתה בלבד, וכל מסך אחר שנענה היה נשאר ריק ותקוע. לפני xapiOnScreen
     ולפני scheduleResumeSave במכוון.
     ⚠️ תלוי בתיקון restoreUI במפעל השאלות: הגרסה הקודמת קראה resetInitial()
     על `attempts === 0` ולכן קריאה מכל ניווט הייתה מוחקת גרירות שלא הוגשו.
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
  if (n === 2) resetScreenState2();
  if (n === 3) resetScreenState3();
  if (n === 4) resetScreenState4();
}

/* בדיקה משותפת: האם הלומד עבר את שני חלקי משימת השיא הזאת בהצלחה מלאה?
   נקרא מתוך dqB.onContinue כדי להחליט אם לדלג על סיין 6 (מועד ב') */
function moedAFullyPassed() {
  let a = null, b = null;
  try {
    /* v4: מהמסמך, עם נפילה ל-localStorage כשאין מסמך (ראו getUnitResult).
       ה-try/catch נשאר בדיוק כפי שהיה, והוא גם מה שמכסה 40-resume.js
       מיושן בקאש: ReferenceError כאן נבלע, a/b נשארים null, והשער מחזיר
       false — כלומר "נניח שלא עבר", בדיוק ההתנהגות הבטוחה שההערה מתארת. */
    a = getUnitResult('lomda_moedA_partA_result');
    b = getUnitResult('lomda_moedA_partB_result');
  } catch (e) { /* אחסון חסום / השכבה לא נטענה — נניח שלא עבר, כדי לא לדלג בטעות */ }
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
  /* קישור בין סינים: מסך ראשון בסיין 5 -> מסך אחרון (2) בסיין 4.
     ה-query string לפני ה-hash — ראו REPORT-XAPI.md §6.
     עובר דרך goBackToPreviousPart כדי להזיז את מצביע הנחיתה לפני הניווט;
     בלעדיו הלואדר של היעד מקפיץ את הלומד מיד חזרה לכאן. הארגומנטים הם
     ה-fallback המקובע. ראו unit-js/40-resume.js. */
  goBackToPreviousPart('methodica-science-mass-measure-02-04', '#screen=1');
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

  /* resume: האם הפתרון היה נכון. אי אפשר לגזור את זה בדיעבד מ-placement,
     כי revealCorrect() דורס אותו בפתרון הנכון — ולכן נשמר במפורש. */
  let passed = false;

  /* ── חתימת התשובה שכבר נשלחה ──
     בקוד החי check() מכבה את הכפתור, והוא חוזר רק כשהלומד גורר משהו. אחרי
     רענון אי אפשר לשחזר את ההשבתה הזאת "כמו שהיא": הצייר מחשב את הכפתור
     מ-allFilled, שהוא true כי התשובה השגויה של הלומד עדיין על הלוח — ולכן
     אותה תשובה בדיוק הייתה ניתנת לשליחה חוזרת, והניסיון השני האמיתי נשרף.
     במקום דגל disabled שלא שורד טעינה, נשמרת חתימה של מה שנשלח בפועל,
     והכפתור פעיל רק כשהמצב הנוכחי שונה ממנה. זה מייצר את אותה התנהגות בדיוק
     בחי ואחרי שחזור, ובלי להחזיר את הנעילה של §6א: כל גרירה משנה את החתימה
     ומדליקה את הכפתור מחדש. */
  let lastSubmittedSig = null;

  function sig() {
    return dragIds.map(function (d) { return d + ':' + placement[d]; }).join('|');
  }

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
    /* התשובה הנוכחית זהה לזו שכבר נשלחה → אין מה לשלוח שוב (ראו lastSubmittedSig). */
    if (btn && !done) btn.disabled = !allFilled || sig() === lastSubmittedSig;
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
    var v = passed ? 'pass' : 'fail';
    /* v4: התוצאה נכתבת למסמך ה-state ולא רק ל-localStorage — שערי המועד
       קובעים ניתוב, ולומד שהמשיך ממחשב אחר נותב לתוך מועד ב' גם כשעבר את
       מועד א' במלואו, כי המפתחות פשוט לא היו שם.
       typeof: אותו דפוס הגנה כמו בכל קריאה לשכבה המשותפת; ה-fallback הוא
       ההתנהגות שהייתה לפני v4. */
    if (typeof setUnitResult === 'function') setUnitResult(cfg.resultKey, v);
    else { try { localStorage.setItem(cfg.resultKey, v); } catch (e) {} }
  }

  function check() {
    if (done) return;
    checked = true;
    attempts++;
    /* לפני כל מוטציה: זו התשובה שנשלחת עכשיו. render() שבהמשך כבר יסתמך
       עליה כדי להשאיר את הכפתור מושבת עד לשינוי הבא. */
    lastSubmittedSig = sig();

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
    /* xAPI: מוצב כאן כי allCorrect ו-attempts סופיים רק אחרי לופ היעדים.
       אילו שאלות המופע הזה מדווח נקבע ב-cfg (xapiItem/xapiQuestions) ולא
       בפאבריקה — אותו עיקרון של תפרי-נתונים כמו בכל השכבה המשותפת.
       טקסט התשובה נבנה ממצב הפאבריקה עצמה (איזה פריט הונח בכל יעד), ולא
       דרך xapiZoneAnswer, כי היעדים כאן אינם בתבנית '<prefix>-zone-<id>'. */
    if (cfg.xapiItem) {
      var _ans = targetIds.map(function (tId) {
        var placed = null;
        dragIds.forEach(function (dId) { if (placement[dId] === tId) placed = dId; });
        return tId + '=' + (placed ? labels[placed] : '—');
      }).join(' | ');
      (cfg.xapiQuestions || ['q1']).forEach(function (q) {
        xapiAnswered(cfg.xapiItem, q, allCorrect, allCorrect || attempts >= 2, _ans);
      });
    }
    if (allCorrect) {
      done = true;
      passed = true;
      saveResult(true);
      showFeedback('correct');
      if (btn) { btn.textContent = 'המשך'; btn.disabled = false; btn.onclick = function () { cfg.onContinue(btn); }; }
    } else if (attempts >= 2) {
      done = true;
      passed = false;
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
      if (btn) { btn.textContent = 'המשך'; btn.disabled = false; btn.onclick = function () { cfg.onContinue(btn); }; }
    } else {
      showFeedback('wrong1');
      checked = false;
      render();
      const hintBtn = document.getElementById(cfg.hintBtnId);
      if (hintBtn) hintBtn.hidden = false;
      if (btn) { btn.innerHTML = '<span dir="ltr">?צדקתי</span>'; btn.disabled = true; btn.onclick = check; }
    }

    /* resume: שמירה סינכרונית ברגע מחויבות התשובה. השמירה המושהית שבסוף goTo()
       לא מספיקה כאן — תשובה שניתנה ואז הלשונית נהרגה לפני הניווט הבא הייתה
       נאבדת. עטוף: דיווח ושמירה לעולם לא שוברים את זרימת התשובה. */
    try { flushResumeSave(); } catch (e) {}
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
    /* xAPI: requested.1 — פותח בלבד (hidden=false), לא toggle, ולכן אין
       סיכון לדיווח בקשה שנייה בסגירה. */
    if (cfg.xapiItem) xapiRequestedHint(cfg.xapiItem, (cfg.xapiQuestions || ['q1'])[0]);
    document.getElementById(cfg.hintOverlayId).hidden = false;
  }
  function closeHint() {
    document.getElementById(cfg.hintOverlayId).hidden = true;
    const hintBtn = document.getElementById(cfg.hintBtnId);
    if (hintBtn) hintBtn.disabled = false;
  }

  function resetInitial() {
    done = false; checked = false; attempts = 0; dragActive = null; dropHandled = false;
    lastWrongPlacement = null; showingCorrect = false; passed = false;
    lastSubmittedSig = null;
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
    if (btn) { btn.textContent = 'המשך'; btn.disabled = false; btn.onclick = function () { cfg.onContinue(btn); }; }
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

  /* ═══════════ resume — התפר אל מצב ה-closure ═══════════
     placement / attempts / done / checked / lastWrongPlacement /
     showingCorrect / passed הם `let` פרטיים לפאבריקה, והמבנה המוחזר חשף
     עד כה רק {reset, onContinue}. בלי שני התפרים האלה אין שום דרך לשחזר
     שאלת גרירה מבחוץ — זו הסיבה שהם נוספו ולא משהו נוח בלבד. */
  function getState() {
    return {
      placement: Object.assign({}, placement),
      attempts: attempts,
      done: done,
      checked: checked,
      lastWrongPlacement: lastWrongPlacement ? Object.assign({}, lastWrongPlacement) : null,
      showingCorrect: showingCorrect,
      passed: passed,
      lastSubmittedSig: lastSubmittedSig
    };
  }

  function setState(s) {
    if (!s) return;
    if (s.placement) {
      /* מוטציה לפי מפתח ולא הצבה: showMyAnswer() מציב ל-placement אובייקט
         חדש, ולכן אין להסתמך על זהות האובייקט — אבל כן על המפתחות. */
      dragIds.forEach(function (dId) {
        placement[dId] = (typeof s.placement[dId] === 'string') ? s.placement[dId] : 'source';
      });
    }
    attempts           = s.attempts || 0;
    done               = !!s.done;
    checked            = !!s.checked;
    lastWrongPlacement = s.lastWrongPlacement || null;
    /* מסמך ישן בלי המפתח הזה → null, כלומר הכפתור מחושב כמו קודם. */
    lastSubmittedSig   = (typeof s.lastSubmittedSig === 'string') ? s.lastSubmittedSig : null;
    showingCorrect     = !!s.showingCorrect;
    passed             = !!s.passed;
  }

  /* ציור מצב "נענה" אחרי טעינת עמוד. משקף **רק** את כתיבות ה-DOM של
     check() ו-revealSolution(): אין כאן שינוי state, אין saveResult ואין
     xapiAnswered — כל אלה קרו בפעם הראשונה, וכפילות כאן הייתה מדווחת
     תשובה שנייה על אותה שאלה.

     render() נקרא אחרון בכל מסלול. הוא זה שמחשב את כפתור הבדיקה — אותו
     predicate בדיוק שהקוד החי משתמש בו — ולכן הוא מה שמונע לומד תקוע.
     במסלול "ניסיון שגוי אחד" עדיין אין כאן `disabled = true` ידני; ההשבתה
     נגזרת מ-lastSubmittedSig בתוך render(), ולכן היא נכונה גם בחי וגם אחרי
     טעינת עמוד: הלוח מלא, הכפתור מושבת כי התשובה לא השתנתה, וכל גרירה
     מדליקה אותו מחדש. הניסוח הקודם כאן השבית *לא* כלום ותיאר את זה כפשרה
     מול "לומד תקוע" — זה החזיר ללומד את היכולת לשלוח שוב בדיוק את אותה
     תשובה ולשרוף את הניסיון השני. */
  function restoreUI() {
    /* ⚠️ render() ולא resetInitial(). תוקן 2026-08-18, שלושה באגים בשורה אחת:
       (א) resetInitial() מאפס placement ל-'source' לכל פריט — כלומר לומד
           שגרר ולא לחץ "צדקתי?" היה מאבד את העבודה, גם היום במסך הנחיתה
           וגם — מאז שהציור רץ מכל ניווט — בכל מעבר מסך.
       (ב) reset() מדלג על resetInitial() כש-hasProgress, ולכן **אף אחד** לא
           קרא ל-render() במצב "יש גרירות, אין ניסיון": הלוח הוצג ריק.
       (ג) בסין 06, resetInitial() מסתיר את כפתור הרמז של מסך 3, שנשלח גלוי
           מה-markup ו-resetScreenState3 מקפיד לחשוף.
       ולא hasProgress כמו ב-reset(): הוא היה מפיל את המצב הזה לזנב הפונקציה,
       ששולח showFeedback('wrong1') — כלומר "התשובה אינה נכונה" על תשובה
       שהלומד מעולם לא הגיש. render() לבדו הוא בדיוק הנכון: הוא מצייר את
       הקלפים מ-placement ומחשב את כפתור הבדיקה מ-allFilled, אותו predicate
       של הקוד החי, בלי להמציא פידבק ובלי לגעת ברמז.
       hideFeedback() כן נשמר מ-resetInitial(): "אין ניסיונות" חייב להיראות
       ככה גם אם קופסת המשוב נשארה גלויה ממצב קודם. שורה אחת של
       classList.remove — בלי תופעות לוואי. */
    if (!done && attempts === 0) { hideFeedback(); render(); return; }

    /* סימון היעדים מול ה-placement הנוכחי — אותו לופ בדיוק כמו ב-check(). */
    targetIds.forEach(function (tId) {
      const valid = correctMap[tId];
      let placed = null;
      dragIds.forEach(function (dId) { if (placement[dId] === tId) placed = dId; });
      const ok = (placed === valid) || (placed && labels[placed] === labels[valid]);
      const zone = document.getElementById(tId);
      if (zone) { zone.classList.remove('correct', 'wrong'); zone.classList.add(ok ? 'correct' : 'wrong'); }
    });

    const btn = document.getElementById(cfg.checkBtnId);
    const hintBtn = document.getElementById(cfg.hintBtnId);
    const revealBtn = cfg.revealBtnId ? document.getElementById(cfg.revealBtnId) : null;

    if (done) {
      if (passed) {
        showFeedback('correct');
      } else if (cfg.revealBtnId) {
        /* הטוגל נשמר. showingCorrect אומר מה מוצג כרגע, ו-lastWrongPlacement
           שומר את תשובת הלומד עצמה — כלל 4 ב-CLAUDE.md. */
        showFeedback(showingCorrect ? 'wrongFinal' : 'wrongFinalPending');
        if (revealBtn) {
          revealBtn.hidden = false;
          revealBtn.textContent = showingCorrect ? 'התשובה שלי' : 'התשובה הנכונה';
        }
      } else {
        showFeedback('wrongFinal');
      }
      if (hintBtn) hintBtn.hidden = true;
      if (btn) { btn.textContent = 'המשך'; btn.disabled = false; btn.onclick = function () { cfg.onContinue(btn); }; }
      render();
      return;
    }

    /* ניסיון שגוי אחד, עוד לא נפתר — נשאר פתוח לניסיון נוסף. */
    showFeedback('wrong1');
    if (hintBtn) hintBtn.hidden = false;
    if (btn) { btn.innerHTML = '<span dir="ltr">?צדקתי</span>'; btn.onclick = check; }
    render();
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

  /* onContinue נחשף כדי שאפשר יהיה לאמת אותו: הוא נושא את ה-completed
     של הרכיב, כולל במסלול הכשל — הדבר היחיד שאם ישבר בשקט, כל ניסיון
     של לומד שלא צלח לא יירשם בכלל (REPORT-XAPI.md §5). בלי החשיפה הוא
     מגיע רק דרך btn.onclick אחרי בדיקה מוצלחת, כלומר לא ניתן לבדיקה.
     תוספת בלבד — שום קורא קיים לא נשען על צורת המבנה המוחזר. */
  return {
    reset: reset,
    onContinue: cfg.onContinue,
    /* resume (שלב 2ב): התפרים שמאפשרים ללכוד ולשחזר את מצב ה-closure. */
    getState: getState,
    setState: setState,
    restoreUI: restoreUI
  };
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
  xapiItem: '001',
  xapiQuestions: ['q1'],
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
  /* dqB מכריע גם את q2 וגם את q3 בבדיקה אחת הכל-או-כלום (ארבעה
     שדות: המספר, שני מושגי המסה ויחידת הדלק), ולכן שתי השאלות
     מקבלות את אותה תוצאה. פיצול לגרנולריות שה-UI לא מספק היה
     המצאת נתון. */
  xapiItem: '001',
  xapiQuestions: ['q2', 'q3'],
  onContinue: function (btn) {
    /* xAPI: שאלת השיא (מועד א') היא שני חלקים ושניהם חייבים לעבור — זה בדיוק
       מה ש-moedAFullyPassed() בודק, ולכן המכנה 2 והסף 2 (moedAComponentResult).

       ── מתי מדווחים (2026-09-16) ──
       Kata מסירה את הרכיב מהמסך ברגע שמגיע completed (הנחיות 2.7 עמ' 23), ולכן
       הוא חייב להיות הפעולה האחרונה של הלומד ברכיב:
       • מסלול ההצלחה: יש עוד מסך — מסך הסיום (4) עם "סיימתי". ה-completed
         עבר לשם (s4Finish). עד היום הוא נשלח כאן, "לפני ההסתעפות", וזה היה
         מעלים את מסך הסיום לפני שהלומד רואה אותו.
       • מסלול הכשל: הרכיב נגמר **כאן** — אין מסך נוסף (עד היום עבר לסין 06;
         מהיום Kata מנתבת). לכן כאן מדווחים ועוצרים. הדיווח במסלול הזה אינו
         אופציונלי: לומד שלא צלח חייב להיות מדווח, אחרת כל הניסיון לא נרשם.
       btn מגיע מ-makeDragQuestion — הכפתור שנלחץ — כדי שיושבת אחרי הדיווח. */
    if (moedAFullyPassed()) {
      /* עברו את שני חלקי משימת השיא בהצלחה מלאה — מדלגים על כל
         סיין 6 (מועד ב') ועוברים ישר למסך המעבר של הצלחה */
      goTo(4);
    } else {
      xapiEndComponent(moedAComponentResult(), btn);
      /* המעבר לסין 06 שהיה כאן חי רק ב-walkthrough מקומי (DEV_NAV). */
      if (DEV_NAV) {
        writeForwardState('methodica-science-mass-measure-02-06', '#screen=3');
        window.location.href = '../methodica-science-mass-measure-02-06/index.html' + window.location.search;
      }
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
      ? '../unit-assets/img/avatar-green-dancing.gif'
      : '../unit-assets/img/avatar-orange-dancing.gif';
  }
}
/* תוצאת הרכיב — משמשת את שני המסלולים (s4Finish, וענף הכשל של dqB). */
function moedAComponentResult() {
  var _parts = ['lomda_moedA_partA_result', 'lomda_moedA_partB_result'];
  var _passed = 0;
  try {
    _passed = _parts.filter(function (k) {
      return getUnitResult(k) === 'pass';
    }).length;
  } catch (e) { /* localStorage חסום — נשאר 0 */ }
  return { success: moedAFullyPassed(), score: { scaled: _passed / 2 } };
}

/* "סיימתי" — סיום הרכיב במסלול ההצלחה במועד א'. הלומד שהגיע לכאן צלח את
   שאלת השיא בפעם הראשונה ודילג על סין 6 כליל. זו הלחיצה האחרונה ברכיב, ולכן
   ה-completed של **הרכיב** נשלח מכאן (2026-09-16; עד אז נשלח ב-dqB לפני מסך
   הסיום). אין יותר completed ברמת היחידה — הפלטפורמה גוזרת את מצב היחידה. */
function s4Finish() {
  xapiEndComponent(moedAComponentResult(), document.getElementById('s4-finish'));
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
scqFbMakeDraggable('dqA-feedbox');
scqFbMakeDraggable('dqB-feedbox');

/* קישור בין סינים: הגעה לכאן דרך "חזרה" מהסיין הבא נכנסת ישירות למסך
   המבוקש לפי #screen=N ב-URL, במקום למסך הראשון כברירת מחדל */
(function jumpToLinkedScreen() {
  const m = /^#screen=(\d+)$/.exec(location.hash);
  if (m) goTo(parseInt(m[1], 10));
})();


/* ═══════════════════ xAPI (720) — קונפיגורציה של הסין ═══════════════════
   נתונים בלבד. השכבה המשותפת ב-../unit-js/ קוראת אותם בזמן call.
   ראו REPORT-XAPI.md §2 בלומדת methodica-math-scale-01. */

/* פריט אחד (שאלת השיא, מועד א') פרוש על מסכים 2-4: הקדמת היישומון
   ושני חלקי השאלה. ההצמדה מכוונת — היא משאירה את הפריט פתוח על פני כל
   השאלה, כך שה-completed היחיד שלו נושא את התוצאה של שני החלקים ולא של
   הראשון בלבד (REPORT-XAPI.md §4).
   מסך 5 (מעבר ההצלחה) הוא null במכוון: כך הפריט נסגר בכניסה אליו, בלי
   להיות תלוי בכך שהלומד ילחץ "סיימתי". */
var SCREEN_TO_SUBCONTENT = {
  0: null,
  1: ['001', 1],
  2: ['001', 2],
  3: ['001', 3],
  4: null
};

/* ⚠️ SCREEN_TO_SUBCONTENT חייב להחזיק בדיוק TOTAL_SCREENS מפתחות (5).
   מפתח חסר = מסך שלא מדווח, בשקט. _test/verify-report.js אוכף את זה. */

var XAPI_COMP_SLUG = 'methodica-science-mass-measure-02-05';
/* מזהי הרכיב והפריטים חייבים להתאים ל-metadata/*.json בית-לבית — המוסכמה
   כאן נושאת TRAILING SLASH על יחידה, רכיב ופריט (לא על שאלה). */
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';

var XAPI_EVAL_ITEMS = {'001': 1};

var XAPI_METADATA_FILE = '../metadata/methodica-science-mass-measure-02-05.json';


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

  /* שלב 2ב — מצב שאלות הגרירה. הוא יושב ב-closure של makeDragQuestion,
     ולכן עובר דרך getState/setState שנוספו שם במיוחד לשם כך. */
  st.dqA = dqA.getState();
  st.dqB = dqB.getState();
  /* מיקומי בועיות המשוב שנגררו (ראו fbPositions). חייב לצאת מכאן
     ולא להיכתב למסמך ממקום אחר: captureUnitState **מחליף** את
     parts[slug] בכל שמירה. */
  st.fbPos = Object.assign({}, fbPositions);
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
  /* מסמך ישן בלי המפתח → המפה נשארת ריקה, וההתנהגות זהה לקודם. */
  if (st.fbPos) Object.keys(st.fbPos).forEach(function (k) { fbPositions[k] = st.fbPos[k]; });
  if (st.qResults) {
    Object.keys(st.qResults).forEach(function (k) { XAPI_Q_RESULTS[k] = st.qResults[k]; });
  }
  if (st.dqA) dqA.setState(st.dqA);
  if (st.dqB) dqB.setState(st.dqB);
}

/* אין בסין הזה שדות קלט חופשיים — כל המצב יושב במשתנים. */
function applyResumeDom(st) {}

/* ציור מצב "נענה". חייב להישאר exception-safe — נקרא גם מ-applyExecutionState
   וגם מכל ניווט, ואסור לו לשבור ניווט. */
function restoreScreenUI(n) {
  try {
    if (n === 2) dqA.restoreUI();
    if (n === 3) dqB.restoreUI();
  } catch (e) { console.error('[resume] restoreScreenUI', e); }
}
