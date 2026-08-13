'use strict';
/* ═══════════════════ xAPI (720) — item scope + question ids ═══════════════════
   משותף לששת הסינים. Definition-only: אין כאן שום side effect ברמת top-level,
   והאתחול מונע מבלוק ה"אתחול" שבתחתית כל script.js (שקורא ל-bootXAPI() אחרון).

   מקור: methodica-math-scale-01-vadimr-1/unit-js/20-xapi.js. הועתק verbatim,
   פרט לסלקטורים ב-xapiAnswerText שהותאמו למחלקות של הפרויקט הזה.

   התפרים הפר-סיניים, כולם נקראים בזמן CALL ולא בזמן טעינה (וזו הסיבה
   ש-script.js יכול להיטען אחרי הקבצים המשותפים):
     SCREEN_TO_SUBCONTENT   מסך -> [סיומת פריט, עמוד-בפריט]; null = אין פריט בקטלוג
     XAPI_COMP_SLUG         למשל 'methodica-science-mass-measure-02-02'
     XAPI_COMP_ID           XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/'
     XAPI_EVAL_ITEMS        פריטים שנושאים שאלה מדורגת בקוד (לא רק במטא-דאטה)
     XAPI_ITEM_RESULT       אופציונלי; סיומת פריט -> פונקציה שמחזירה result מפורש
   כל קריאה מגודרת ב-typeof, כדי שסין שלא הגדיר אחד מהאופציונליים יתדרדר
   לערך הנייטרלי במקום לזרוק בתוך מסלול של statement — שם ה-try/catch העוטף
   היה מחניק את השגיאה וה-statement היה נעלם בשקט. */

/* מוסכמת ה-slash של היחידה הזאת, כפי שאומתה מול metadata/ (ראו 10-identity.js):
   יחידה, רכיב ופריט נושאים trailing slash; שאלה לא. XAPI_COMP_ID כבר מסתיים
   ב-'/', ולכן הפריט הוא <רכיב><slug>-NNN/ .
   xapiQ() מנרמל slashes לפני ההשוואה בכל מקרה, כך שהתאמת הפריטים עמידה
   לשינוי מוסכמה; מה שלא עמיד לכך הוא ה-id שנשלח בפועל, ולכן הוא חייב להתאים
   ל-metadata/ בית-לבית. */
function xapiItemId(suffix) { return XAPI_COMP_ID + XAPI_COMP_SLUG + '-' + suffix + '/'; }
function _xapiTrim(u) { return String(u == null ? '' : u).replace(/\/+$/, ''); }

/* טקסט התשובה הגלוי, ל-result.response. משכפל קודם כדי לא לגעת ב-DOM החי,
   ומסיר את צמתי ה-tooltip שאחרת textContent היה משרבב לאמצע התווית.
   הסלקטורים כאן הם של הפרויקט הזה (.scq-*), לא של המתמטיקה. */
function xapiAnswerText(el) {
  if (!el) return '';
  var c = el.cloneNode(true);
  var drop = c.querySelectorAll('.scq-info, .scq-tooltip, .scq-hint-popup, .img-zoom-btn, .methodica-zoom-trigger');
  for (var i = 0; i < drop.length; i++) { drop[i].remove(); }
  return c.textContent.replace(/\s+/g, ' ').trim();
}

/* הקשר השאלה. metadata/<component>.json הוא מקור האמת היחיד למזהי שאלות:
   מאתרים subContent[<suffix>].questions[<qKey>] ומחזירים את אותו questionId
   כמו שהוא כשהוא כבר אבסולוטי. התאמת הפריט היא לפי סיומת '-NNN' כשה-slashes
   מנורמלים, כך שסנכרון מחדש של המטא-דאטה מ-Kata יכול לשנות את התחילית בלי
   לגעת בקוד. */
function xapiQ(suffix, qKey) {
  var itemId = xapiItemId(suffix);
  var qid = null;
  try {
    var sc = (window.METADATA && window.METADATA.subContent) || [];
    for (var i = 0; i < sc.length; i++) {
      if (_xapiTrim(sc[i].id).slice(-(suffix.length + 1)) !== '-' + suffix) continue;
      var qs = sc[i].questions || [];
      for (var j = 0; j < qs.length; j++) {            // התאמת המפתח, חשוף או בצורת URL
        var v = _xapiTrim(qs[j].questionId);
        if (v === qKey || v.slice(-(qKey.length + 1)) === '/' + qKey) { qid = qs[j].questionId; break; }
      }
      if (qid == null) {                               // נפילה לאחור: מיקומי, 'q3' -> אינדקס 2
        var n = parseInt(String(qKey).replace(/\D/g, ''), 10);
        if (n >= 1 && n <= qs.length) qid = qs[n - 1].questionId;
      }
      break;
    }
  } catch (e) {}
  if (qid == null) { console.warn('[xAPI] no metadata question', suffix, qKey); qid = qKey; }
  /* itemId מסתיים ב-'/', ולכן ההצמדה היא ישירה — בלי מפריד נוסף. */
  return { questionId: /^https?:\/\//.test(qid) ? qid : itemId + qid, parentId: itemId };
}

/* תוצאה פר-שאלה, במפתח '<item>/<q>'. נכתבת בכל אתר answered — תמיד מחוץ
   ל-try/catch שלו, כדי שכשל דיווח לא יקלקל את הניקוד — ונקראת כשמורכב
   ה-completed של הרכיב. הצבירה של הספרייה עצמה היא AND של "כל התשובות
   נכונות", מה שהיה מדווח success:false על כל מעבר חלקי, ולכן רכיב שצריך
   ניקוד חלקי מספק את ה-result שלו במפורש. */
var XAPI_Q_RESULTS = {};
function xapiCorrectCount() {
  return Object.keys(XAPI_Q_RESULTS).filter(function (k) { return XAPI_Q_RESULTS[k]; }).length;
}

var xapiCurrentItem = null;

/* result מפורש ל-completed של פריט, כשה-AND של הספרייה שגוי עבורו.
   סין שלא מגדיר XAPI_ITEM_RESULT מקבל null — בדיוק מה שהיה מועבר literal. */
function xapiItemResult(item) {
  var map = (typeof XAPI_ITEM_RESULT !== 'undefined') ? XAPI_ITEM_RESULT : null;
  var f = map && map[item];
  return f ? f() : null;
}

function _xapiIsEval(item) {
  return (typeof XAPI_EVAL_ITEMS !== 'undefined') && !!XAPI_EVAL_ITEMS[item];
}

/* זוגות initialized/completed ברמת הפריט, מונעים מ-goTo(). דפדוף בתוך אותו
   פריט לא משדר כלום; הפריט נסגר כשהלומד נכנס למסך ששייך לפריט אחר. */
function xapiOnScreen(screen) {
  if (!window.XAPI_USING_G || typeof sendStatement720 !== 'function') return;
  var map = (typeof SCREEN_TO_SUBCONTENT !== 'undefined') ? SCREEN_TO_SUBCONTENT[screen] : null;
  var item = map ? map[0] : null;
  if (item === xapiCurrentItem) return;
  if (xapiCurrentItem) {
    try { sendCompletedOnce('doneItems', itemLedgerKey(xapiCurrentItem), 'question', xapiItemResult(xapiCurrentItem), { objectId: xapiItemId(xapiCurrentItem), expectsAnswer: _xapiIsEval(xapiCurrentItem) }); } catch (e) {}
  }
  xapiCurrentItem = item;
  if (item) {
    try { sendStatement720('initialized', 'question', null, { objectId: xapiItemId(item), isEvaluationItem: _xapiIsEval(item) }); } catch (e) {}
  }
}

/* סוגר את הפריט הפתוח האחרון — נקרא מיד לפני כל completed של רכיב. */
function xapiFinishItems() {
  if (!window.XAPI_USING_G || typeof sendStatement720 !== 'function') return;
  if (xapiCurrentItem) {
    try { sendCompletedOnce('doneItems', itemLedgerKey(xapiCurrentItem), 'question', xapiItemResult(xapiCurrentItem), { objectId: xapiItemId(xapiCurrentItem), expectsAnswer: _xapiIsEval(xapiCurrentItem) }); } catch (e) {}
    /* מתאפס בין אם ה-statement דוכא ובין אם לא: latch שנשאר דלוק היה גורם
       ל-xapiOnScreen הבא לנסות לסגור את אותו פריט שוב. */
    xapiCurrentItem = null;
  }
}

/* ═══════════════════ שלושת העוזרים שאתרי הקריאה משתמשים בהם ═══════════════════
   בלומדת המתמטיקה כל אתר answered הוא בלוק של 6–8 שורות, משוכפל 26 פעמים על
   פני חמישה קבצים. בלומדה הזאת יש 26 אתרים בעלי מבנה כמעט זהה
   (sNNCheck עם ענף נכון / שגוי-ראשון / שגוי-סופי), ולכן העוזרים האלה הופכים כל
   אתר לשורה אחת. פחות שכפול פירושו פחות מקומות שבהם אפשר לטעות — וזו בדיוק
   מחלקת הטעויות שה-try/catch השקטים היו מסתירים.

   ⚠️ הכתיבה ל-XAPI_Q_RESULTS קורית **לפני** ה-try/catch ומחוצה לו, לא בתוכו.
   זו אינווריאנטה מ-REPORT-XAPI.md §2: כשל דיווח לא יכול לקלקל את הניקוד.
   כאן היא נאכפת במקום אחד במקום להסתמך על 26 אתרי קריאה שיזכרו אותה. */

/* ── שני בוני טקסט-תשובה, לסוגי השאלות שאינם בחירה בודדת ──
   result.response אמור לשאת את מה שהלומד באמת ענה. בבחירה בודדת זה
   xapiAnswerText(optEl); בשאלות גרירה ובשאלות שדות צריך לתאר מצב, ולא
   אלמנט אחד. שניהם גנריים במכוון — אותה תבנית markup חוזרת בסינים
   01, 02, 04, 05 ו-06. */

/* לוח גרירה: לכל אזור, הפריטים שהלומד הניח בו.
   'ton: קטר | kg: צב ענק | gram: תפוח, גרגר מלח' */
function xapiZoneAnswer(prefix, zoneIds) {
  try {
    return zoneIds.map(function (z) {
      var el = document.getElementById(prefix + '-zone-' + z);
      var items = el ? el.querySelectorAll('[class*="drag-item"], [class*="placed-card"]') : [];
      var names = [];
      for (var i = 0; i < items.length; i++) names.push(xapiAnswerText(items[i]));
      return z + ': ' + (names.join(', ') || '—');
    }).join(' | ');
  } catch (e) { return ''; }
}

/* קבוצת שדות או נפתחים. values אופציונלי — בלעדיו נקרא .value מה-DOM.
   's18-input-1=1400 | s18-input-2=900' */
function xapiFieldsAnswer(ids, values) {
  try {
    return ids.map(function (id) {
      var v = values ? values[id] : (document.getElementById(id) || {}).value;
      return id + '=' + (v == null || v === '' ? '—' : v);
    }).join(' | ');
  } catch (e) { return ''; }
}

/* בחירה מרובה: התוויות של האפשרויות שנבחרו, דרך פונקציית האיתור של המסך. */
function xapiMultiAnswer(ids, optElFn) {
  try {
    return (ids || []).map(function (id) {
      return xapiAnswerText(optElFn(id)) || String(id);
    }).join(', ');
  } catch (e) { return ''; }
}

/* דיווח תשובה מדורגת אחת.
     item      סיומת הפריט, למשל '003'
     qKey      מפתח השאלה, למשל 'q1'
     correct   האם התשובה נכונה
     isLast    האם זו התשובה האחרונה על השאלה (נכונה, או שנגמרו הניסיונות).
               רק 'answered.last' נכנס למכנה של ניקוד הרכיב.
     answer    טקסט התשובה של הלומד, כפי שהוא רואה אותה */
function xapiAnswered(item, qKey, correct, isLast, answer) {
  XAPI_Q_RESULTS[item + '/' + qKey] = !!correct;
  if (!window.XAPI_USING_G || typeof sendStatement720 !== 'function') return;
  try {
    sendStatement720(isLast ? 'answered.last' : 'answered', 'question',
      { success: !!correct,
        score: { scaled: correct ? 1 : 0 },
        extensions: { student_answer: [answer == null ? '' : String(answer)] } },
      xapiQ(item, qKey));
  } catch (e) { console.error('[xAPI] answered ' + item + '/' + qKey, e); }
}

/* בקשת רמז. ⚠️ להציב רק בענף "הרמז נפתח כרגע". רמזים כאן הם לרוב overlay
   ש-hidden שלו מתהפך, ומיקום הקריאה על ה-toggle היה מדווח בקשה שנייה בכל
   סגירה. ראו REPORT-XAPI.md §4. */
function xapiRequestedHint(item, qKey) {
  if (!window.XAPI_USING_G || typeof sendStatement720 !== 'function') return;
  try { sendStatement720('requested.1', 'question', null, xapiQ(item, qKey)); } catch (e) {}
}

/* ה-completed של הרכיב. סוגר קודם את הפריט הפתוח, ואז מדווח דרך היומן.
   ⚠️ יש לקרוא לזה גם במסלולי כשל. רכיב שהלומד לא צלח חייב להיות מדווח, אחרת
   כל הניסיון שלו לא נרשם — ניתוב לומד שנכשל הוא תפקיד הפלטפורמה, דרך
   recommendedAfterFail של הרכיב. ראו REPORT-XAPI.md §5. */
function xapiCompleteComponent(result) {
  try { xapiFinishItems(); } catch (e) {}
  try {
    sendCompletedOnce('done', currentPartSlug(), 'onlinelesson', result || null);
  } catch (e) { console.error('[xAPI] completed component', e); }
}

/* ה-completed של היחידה. נשלח פעם אחת בלבד לכל ניסיון, מהמסך המסיים.
   ליחידה הזאת יש שלוש נקודות סיום (סין 05 מסך 5, וסין 06 מסכים 8 ו-9), ולכן
   היומן הוא מה שמונע שלושה דיווחי יחידה. */
function xapiCompleteUnit(result) {
  try {
    sendCompletedOnce('done', 'unit', 'onlinelesson', result || null,
      { objectId: window.XAPI_UNIT_ID });
  } catch (e) { console.error('[xAPI] completed unit', e); }
}

/* played/paused ל-<video> של HTML5. בלומדה הזאת יש וידאו דמות בכמה סינים. */
function xapiWireVideos() {
  if (!window.XAPI_USING_G || typeof sendStatement720 !== 'function') return;
  document.querySelectorAll('video').forEach(function (v) {
    if (v.__xapiWired) return; v.__xapiWired = true;
    var pausedOnce = false;
    v.addEventListener('pause', function () { if (v.ended || v.currentTime === 0) return; pausedOnce = true; try { sendStatement720('paused', 'question', null, { time: v.currentTime }); } catch (e) {} });
    v.addEventListener('play', function () { if (!pausedOnce) return; try { sendStatement720('played', 'question', null, { time: v.currentTime }); } catch (e) {} });
  });
}
