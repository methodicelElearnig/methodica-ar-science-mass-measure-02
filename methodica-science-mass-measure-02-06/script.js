'use strict';

/* =========================================================
   מנוע גלובלי — canvas scaling, ניווט מסכים, סטייט גלובלי
   ========================================================= */

const TOTAL_SCREENS = 9;
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
   resetScreenState0/7/8 יקבעו את ה-src הנכון, התמונה כבר תהיה בקאש
   של הדפדפן ותצויר מיידית — בלי רגע ריק/מהבהב בכניסה הראשונה למסך. */
(function preloadCharacterAvatars() {
  const isGreen = window.lomdaState.selectedCharacter === 'green';
  const imageFiles = isGreen ? ['avatar-green-dancing.gif'] : ['avatar-orange-dancing.gif'];
  const videoFiles = isGreen
    ? ['avatar-green-waving-v.mp4', 'avatar-green-thank-you.mp4']
    : ['avatar-orange-waving-v.mp4', 'avatar-orange-thank-you.mp4'];
  imageFiles.forEach(function (name) {
    const img = new Image();
    img.src = '../unit-assets/img/' + name;   /* the list above is dancing GIFs only, and they live at unit level */
  });
  videoFiles.forEach(function (name) {
    const video = document.createElement('video');
    video.muted = true;
    video.preload = 'auto';
    video.src = 'assets/Video/' + name;
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
     ⚠️ תלוי בתיקון restoreUI במפעל השאלות: resetInitial() גם מוחק גרירות
     שלא הוגשו וגם מסתיר את כפתור הרמז של מסך 3, שנשלח גלוי מה-markup.
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
    /* v4: מהמסמך, עם נפילה ל-localStorage כשאין מסמך (ראו getUnitResult).
       ⚠️ נקרא כאן step1 בלבד, **במכוון** — ראו ההערה שמעל הפונקציה. השינוי
       ל-v4 לא נוגע בשאלה אילו מפתחות השער קורא, רק מאיפה הם נקראים.
       ה-try/catch מכסה גם 40-resume.js מיושן בקאש: ReferenceError נבלע
       והשער מחזיר false. */
    a = getUnitResult('lomda_moedB_partA_step1_result');
    b = getUnitResult('lomda_moedB_partB_result');
  } catch (e) { /* אחסון חסום / השכבה לא נטענה — נניח שלא עבר */ }
  return a === 'pass' && b === 'pass';
}

/* =========================================================
   מסך 1 — מסך מעבר: פתיח מועד ב' (משימת שיא 2)
   רפרנס עיצובי: מסך המעבר הראשון בסיין 5 (.s1-content/.transition-* —
   בלי סימולציה)
   ========================================================= */

function resetScreenState0() {
  const video = document.getElementById('s6-avatar-img');
  if (video) {
    video.src = (window.lomdaState.selectedCharacter === 'green')
      ? 'assets/Video/avatar-green-waving-v.mp4'
      : 'assets/Video/avatar-orange-waving-v.mp4';
    video.load();
    video.play().catch(function () {});
  }
}
function s6Continue() { goTo(1); }
function s6Back() {
  /* קישור בין סינים: מסך ראשון בסיין 6 -> חלק ב' (מסך 4) בסיין 5,
     נקודת ההסתעפות שממנה נכנסים לסיין 6 (מועד ב') כשלא עוברים בהצלחה מלאה.
     ה-query string לפני ה-hash — ראו REPORT-XAPI.md §6.
     עובר דרך goBackToPreviousPart כדי להזיז את מצביע הנחיתה לפני הניווט;
     בלעדיו הלואדר של היעד מקפיץ את הלומד מיד חזרה לכאן. הארגומנטים הם
     ה-fallback המקובע. ראו unit-js/40-resume.js. */
  goBackToPreviousPart('methodica-science-mass-measure-02-05', '#screen=3');
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
      if (btn) { btn.textContent = 'המשך'; btn.disabled = false; btn.onclick = cfg.onContinue; }
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
      if (btn) { btn.textContent = 'המשך'; btn.disabled = false; btn.onclick = cfg.onContinue; }
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
       (ג) resetInitial() מסתיר את כפתור הרמז (para10-hint במסך 3 נשלח **גלוי**
           מה-markup, ו-resetScreenState3 מקפיד לחשוף אותו) — כלומר הרמז היה
           נעלם ללומד משוחזר.
       ולא hasProgress כמו ב-reset(): הוא היה מפיל את המצב הזה לזנב הפונקציה,
       ששולח showFeedback('wrong1') — כלומר "התשובה אינה נכונה" על תשובה
       שהלומד מעולם לא הגיש. render() לבדו הוא בדיוק הנכון: הוא מצייר את
       הקלפים מ-placement ומחשב את כפתור הבדיקה מ-allFilled, אותו predicate
       של הקוד החי, בלי להמציא פידבק ובלי לגעת ברמז.
       hideFeedback() כן נשמר מ-resetInitial(): "אין ניסיונות" חייב להיראות
       ככה גם אם קופסת המשוב נשארה גלויה ממצב קודם. שורה אחת של
       classList.remove — בלי תופעות לוואי.
       הפונקציה חייבת להישאר זהה לזו שבסין 05. */
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
      if (btn) { btn.textContent = 'המשך'; btn.disabled = false; btn.onclick = cfg.onContinue; }
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
  xapiItem: '001',
  xapiQuestions: ['q1'],
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
  xapiItem: '001',
  xapiQuestions: ['q2'],
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
   מסך 6 — טבלה מוקטנת + שיח דמויות (פוצל ממסך 5)
   ========================================================= */

function resetScreenState5() {
  const btn = document.getElementById('s10b-continue');
  if (btn) btn.hidden = false;
}

function s10bContinue() { goTo(6); }

/* =========================================================
   מסך 7 — שאלת בחירה יחידה: סעיף ג של מועד ב' (עותק מסך 38)
   כפתור "הזכירו לי את הנתונים בטבלה" פותח פופ-אפ עם טבלת הנתונים
   (לפי שקפים 156-160 — שונה ממנגנון הרמז הגנרי של מסך 38 המקורי)
   ========================================================= */

const S12_CORRECT_ID = 's12-opt-c';
const TEXTS_S12 = {
  correct: { title: 'נכון מאוד.', body: 'במקרה זה שני הטיעונים נכונים. מצד אחד יש יתרון לשימוש בפלסטיק (פחות מסה לשינוע ופחות פליטות פחמן דו-חמצני), ומצד שני, קיים גם חיסרון שהוא מייצר יותר פסולת בסביבה.' },
  wrong1: { title: 'התשובה אינה נכונה.', body: 'ננסה שוב?' },
  wrongFinal: { title: 'התשובה אינה נכונה.', body: 'במקרה זה שני הטיעונים נכונים. מצד אחד יש יתרון לשימוש בפלסטיק (פחות מסה לשינוע ופחות פליטות פחמן דו-חמצני), ומצד שני, קיים גם חיסרון שהוא מייצר יותר פסולת בסביבה.' }
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
  xapiAnswered('001', 'q3', isCorrect, isCorrect || s12Attempts >= 2,
    xapiAnswerText(document.getElementById(s12Selected)));

  if (isCorrect) {
    s12Done = true;
    if (typeof setUnitResult === 'function') setUnitResult('lomda_moedB_partB_result', 'pass');
    else { try { localStorage.setItem('lomda_moedB_partB_result', 'pass'); } catch (e) {} }
    const el = document.getElementById(S12_CORRECT_ID);
    if (el) { el.classList.remove('selected'); el.classList.add('correct', 'locked'); }
    document.querySelectorAll('#s11 .s12-opt').forEach(function (o) {
      if (!o.classList.contains('correct')) o.classList.add('locked');
    });
    s12ShowFeedback('correct', true);
    if (btn) { btn.textContent = 'המשך'; btn.disabled = false; btn.onclick = s12Continue; }
  } else if (s12Attempts >= 2) {
    s12Done = true;
    if (typeof setUnitResult === 'function') setUnitResult('lomda_moedB_partB_result', 'fail');
    else { try { localStorage.setItem('lomda_moedB_partB_result', 'fail'); } catch (e) {} }
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

  /* resume: שמירה סינכרונית ברגע מחויבות התשובה. השמירה המושהית שבסוף goTo()
     לא מספיקה כאן — תשובה שניתנה ואז הלשונית נהרגה לפני הניווט הבא הייתה
     נאבדת. עטוף: דיווח ושמירה לעולם לא שוברים את זרימת התשובה. */
  try { flushResumeSave(); } catch (e) {}
}

/* בהגעה למסך זה, מועד א' כבר ידוע ככושל (אחרת היינו מדלגים על כל
   סיין 6 דרך dqB.onContinue בסיין 5) — לכן ההכרעה כאן היא רק לפי
   מועד ב': הצליח בו במלואו → מסך 9 (הצלחה כוללת, "או" מועד א' או
   מועד ב'). נכשל גם בו → מסך 8 (נכשל בשני המועדים). */
/* ── ציון הרכיב ──
   שלוש שאלות מדורגות בקוד: הטבלה (q1), השלמת המשפטים (q2) והשאלה המסכמת
   (q3). המכנה 3, והציון נלקח מ-XAPI_Q_RESULTS כדי שיהיה בהכרח זהה למה שדווח
   ב-answered.

   ה-success נקבע לפי moedBFullyPassed() — כלומר לפי מסך הסיום שהלומד באמת
   רואה, ולא לפי חישוב עצמאי. זה מה שהופך את הדיווח לנאמן לחוויה.

   שימו לב שהמכנה (3) רחב מהסט שמכריע את המעבר (2): moedBFullyPassed() בודק
   את הטבלה (q1) ואת השאלה המסכמת (q3) בלבד, ולא את השלמת המשפטים (q2).
   זו **התנהגות מכוונת** ולא השמטה — ראו ההערה מעל moedBFullyPassed(): היא
   משחזרת את מנגנון peakPartAStatus בלומדת המקור, שנקבע שם רק ע"י מסך הטבלה.
   לכן q2 מדווחת ב-answered ונכנסת ל-score (הלומד כן נבחן בה), אבל לא
   משפיעה על success. */
function getMoedBScore() {
  return ['001/q1', '001/q2', '001/q3'].filter(function (k) {
    return XAPI_Q_RESULTS[k];
  }).length;
}

/* תוצאת הרכיב — מחושבת פעם אחת, מדווחת מהכפתור האחרון. */
function moedBComponentResult() {
  return { success: moedBFullyPassed(), score: { scaled: getMoedBScore() / 3 } };
}

function s12Continue() {
  /* xAPI: עד 2026-09-16 ה-completed של הרכיב נשלח **כאן**, "כי כאן תוצאת
     הרכיב מוכרעת — ואז היא נרשמת גם אם הלומד לא ילחץ 'סיימתי'". זה התהפך:
     Kata מסירה את הרכיב מהמסך ברגע שמגיע completed (הנחיות 2.7 עמ' 23), ולכן
     שליחה כאן הייתה מעלימה את מסך הסיום לפני שהלומד רואה אותו. ה-completed
     עבר ל-s13Finish / s14Finish — הלחיצה האחרונה. העלות המכוונת: לומד שסוגר
     את הלשונית במסך הסיום בלי ללחוץ אינו נרשם. ראו REPORT-XAPI.md §10. */
  if (moedBFullyPassed()) {
    goTo(8); // מסך 9 — הצלחה
  } else {
    goTo(7); // מסך 8 — לא הצליח באף מועד
  }
}

function s12Back() { goTo(5); }

function s12OpenHint() {
  /* xAPI: requested.1 — פותח בלבד, לא toggle. */
  xapiRequestedHint('001', 'q3');
  document.getElementById('s12-hint-overlay').hidden = false;
}
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
  const video = document.getElementById('s12t-avatar-img');
  if (video) {
    video.src = (window.lomdaState.selectedCharacter === 'green')
      ? 'assets/Video/avatar-green-thank-you.mp4'
      : 'assets/Video/avatar-orange-thank-you.mp4';
    video.load();
    video.play().catch(function () {});
  }
}
/* "סיימתי" — סיום הרכיב במסלול שבו לא נצלח אף מועד. מדווח את ה-completed של
   **הרכיב** (success:false) כלחיצה האחרונה, ומשבית את הכפתור. אין יותר completed
   ברמת היחידה (2026-09-16) — הפלטפורמה גוזרת את מצב היחידה בעצמה. */
function s13Finish() {
  xapiEndComponent(moedBComponentResult(), document.getElementById('s13-finish'));
}

function resetScreenState8() {
  const img = document.getElementById('s13t-avatar-img');
  if (img) {
    img.src = (window.lomdaState.selectedCharacter === 'green')
      ? '../unit-assets/img/avatar-green-dancing.gif'
      : '../unit-assets/img/avatar-orange-dancing.gif';
  }
}
/* "סיימתי" — סיום הרכיב במסלול ההצלחה במועד ב'. אותו דיווח, אותו כלל. */
function s14Finish() {
  xapiEndComponent(moedBComponentResult(), document.getElementById('s14-finish'));
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
   בכל פתיחה. אין כפתור סגירה (X) — הפופ-אפ נעלם רק במעבר מסך,
   בתחילת ניסיון חדש, או בלחיצה על כפתור החלפת מצב (scq-fb-reveal-btn),
   בהתאם להחלטת מוצר. מיושם על כל תיבות המשוב בסיין 6:
   tbl9-feedbox, para10-feedbox, s12-feedbox.
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


/* ═══════════════════ xAPI (720) — קונפיגורציה של הסין ═══════════════════
   נתונים בלבד. השכבה המשותפת ב-../unit-js/ קוראת אותם בזמן call.
   ראו REPORT-XAPI.md §2 בלומדת methodica-math-scale-01. */

/* פריט אחד (שאלת השיא, מועד ב') פרוש על מסכים 2-7: הידעת?, טבלה,
   השלמת משפטים, הצגת הנתונים, השיחה, והשאלה המסכמת.
   שני מסכי הסיום (8 ו-9) הם null במכוון: כך הפריט נסגר בכניסה אליהם ולא
   תלוי בלחיצה על "סיימתי". */
var SCREEN_TO_SUBCONTENT = {
  0: null,
  1: ['001', 1],
  2: ['001', 2],
  3: ['001', 3],
  4: ['001', 4],
  5: ['001', 5],
  6: ['001', 6],
  7: null,
  8: null
};

/* ⚠️ SCREEN_TO_SUBCONTENT חייב להחזיק בדיוק TOTAL_SCREENS מפתחות (9).
   מפתח חסר = מסך שלא מדווח, בשקט. _test/verify-report.js אוכף את זה. */

var XAPI_COMP_SLUG = 'methodica-science-mass-measure-02-06';
/* מזהי הרכיב והפריטים חייבים להתאים ל-metadata/*.json בית-לבית — המוסכמה
   כאן נושאת TRAILING SLASH על יחידה, רכיב ופריט (לא על שאלה). */
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';

var XAPI_EVAL_ITEMS = {'001': 1};

var XAPI_METADATA_FILE = '../metadata/methodica-science-mass-measure-02-06.json';


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
  st.tbl9Q = tbl9Q.getState();
  st.para10Q = para10Q.getState();
  /* מסך 7 — שאלת הבחירה היחידה בסין. s12Selected שורד את מסלול
     ה-wrong-final (רק הענף הבינוני מאפס אותו), ולכן הוא גם מה שקובע
     נכון/שגוי בציור — בדיוק כמו ב-s12Check. */
  st.s12 = { selected: s12Selected, attempts: s12Attempts, done: s12Done };
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
  if (st.tbl9Q) tbl9Q.setState(st.tbl9Q);
  if (st.para10Q) para10Q.setState(st.para10Q);
  if (st.s12) {
    s12Selected = (typeof st.s12.selected === 'string') ? st.s12.selected : null;
    s12Attempts = st.s12.attempts || 0;
    s12Done     = !!st.s12.done;
  }
}

/* אין בסין הזה שדות קלט חופשיים — כל המצב יושב במשתנים. */
function applyResumeDom(st) {}

/* ציור מצב "נענה". חייב להישאר exception-safe — נקרא גם מ-applyExecutionState
   וגם מכל ניווט, ואסור לו לשבור ניווט. */
function restoreScreenUI(n) {
  try {
    if (n === 2) tbl9Q.restoreUI();
    if (n === 3) para10Q.restoreUI();
    if (n === 6) s12RestoreUI();
  } catch (e) { console.error('[resume] restoreScreenUI', e); }
}
/* מסך 7 — משקף **רק** את כתיבות ה-DOM של s12Check. הנכונות נגזרת מהבחירה
   ולא ממספר הניסיונות, בדיוק כמו בקוד החי. */
function s12RestoreUI() {
  const btn = document.getElementById('s12-check');

  if (s12Done) {
    const isCorrect = (s12Selected === S12_CORRECT_ID);
    if (isCorrect) {
      const el = document.getElementById(S12_CORRECT_ID);
      if (el) { el.classList.remove('selected'); el.classList.add('correct', 'locked'); }
      document.querySelectorAll('#s11 .s12-opt').forEach(function (o) {
        if (!o.classList.contains('correct')) o.classList.add('locked');
      });
      s12ShowFeedback('correct', true);
    } else {
      const wrongEl = s12Selected ? document.getElementById(s12Selected) : null;
      if (wrongEl) { wrongEl.classList.remove('selected'); wrongEl.classList.add('wrong', 'locked'); }
      const corEl = document.getElementById(S12_CORRECT_ID);
      if (corEl) corEl.classList.add('correct', 'locked');
      document.querySelectorAll('#s11 .s12-opt').forEach(function (o) {
        if (!o.classList.contains('correct') && !o.classList.contains('wrong')) o.classList.add('locked');
      });
      s12ShowFeedback('wrongFinal', false);
    }
    if (btn) { btn.textContent = 'המשך'; btn.disabled = false; btn.onclick = s12Continue; }
    return;
  }

  if (s12Attempts >= 1) s12ShowFeedback('wrong1', false);
  /* הבחירה עצמה מוחזרת, והכפתור מחושב מ**אותו** predicate של s12Select.
     כשאין בחירה הכפתור נשאר מושבת, ולחיצה על אופציה היא הדרך קדימה.

     ⚠️ onclick מוצב כאן במפורש, וזה לא עודף — זה התיקון ל-QA 2026-08-20 שקף 8
     ("כפתור צדקתי דלוק אבל לא מגיב"). הכפתור הזה הוא **היחיד** ביחידה שאין לו
     onclick ב-markup (כל 21 כפתורי הבדיקה בסינים 01/02/04 נושאים
     onclick="sNNCheck()", ושתי שאלות הפאבריקה בסין הזה מקבלות אותו מ-restoreUI
     של הפאבריקה). לכן רק כאן החיווט תלוי לגמרי ב-JS.
     ומי שהיה אמור לחווט — resetScreenState6 — יוצא מוקדם על
     `s12Attempts > 0` **לפני** שורת ה-onclick שלו. בשחזור applyResumeVars מחזיר
     את s12Attempts לפני ה-goTo, ולכן השומר תמיד תופס: הכפתור חזר בלי handler,
     לחיצה על מסיח הדליקה אותו (s12Select כותב disabled=false בלבד), והלומד קיבל
     כפתור דלוק שלא מגיב — נעילה מלאה בשאלה האחרונה של מועד ב', שרק רענון נוסף
     שחרר. ההערה הקודמת כאן טענה "וזה נכון ולא תקוע"; זה היה שגוי.
     ההערה על הסדר ב-resetScreenState6 נשארת נכונה — אין לסמוך עליו כאן. */
  if (s12Selected) {
    const opt = document.getElementById(s12Selected);
    if (opt) { opt.classList.add('selected'); opt.setAttribute('aria-checked', 'true'); }
  }
  if (btn) { btn.onclick = s12Check; btn.disabled = !s12Selected; }
}
