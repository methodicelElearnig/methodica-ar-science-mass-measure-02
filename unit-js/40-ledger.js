'use strict';
/* ═══════════════════ יומן ה-'completed' ═══════════════════
   משותף לששת הסינים. Definition-only.

   ── למה הקובץ הזה קיים ──
   20-xapi.js קורא ל-sendCompletedOnce(), itemLedgerKey() ו-currentPartSlug().
   בלומדת המתמטיקה שלושתם יושבים בתוך 40-resume.js, 257 שורות של מנגנון
   שמירה/שחזור מצב. resume מחוץ להיקף כאן (RESUME_ENABLED=false), והעתקת כל
   המנגנון כבוי הייתה קוד מת ומלכודת. הקובץ הזה מספק את אותו API בדיוק —
   אותם שמות, אותן חתימות, אותה סמנטיקה — כך שכשיגיע resume הוא מחליף את
   הקובץ הזה בלי לגעת ב-20-xapi.js.

   ── למה בכלל צריך יומן, אם אין resume ──
   הספרייה מרשה completed אחד לכל object לכל טעינת עמוד. זה לא מספיק כאן:
   בכל אחד מהסינים 02–06 יש כפתור "חזרה" לסין הקודם, וכל חזרה כזאת היא
   טעינת עמוד חדשה. לומד שחוזר לסין שסיים וממשיך ממנו קדימה שוב היה מייצר
   completed שני לאותו רכיב ולאותם פריטים. זה לא תרחיש תיאורטי — זו זרימת
   הניווט המתוכננת של הלומדה.

   ── למה sessionStorage ──
   הוא שורד ניווט בין סינים באותה לשונית, שזה בדיוק המקרה שצריך לכסות, והוא
   לא דורש את ה-State API של Kata (שקיים רק בבילד -j ומשמש resume). הוא לא
   שורד סגירת לשונית — לומד שחוזר מאוחר יותר בשיגור חדש כן עשוי לשלוח
   completed נוסף. זה הפער המודע שנשאר עד ש-resume ייושם; לומדת המתמטיקה
   שלחה בדיוק במצב הזה לפני שהוסיפה resume.

   ── שתי אינווריאנטות מ-RESUME.md §8a שנשמרות כאן במדויק ──
   1. fail open, לעולם לא closed. היומן נשמע רק כשהוא אומר במפורש "כבר
      נשלח". אם sessionStorage לא זמין (opaque origin ב-file://, מצב פרטי,
      מכסת אחסון) — שולחים בכל מקרה. כל אתר קריאה יושב בתוך try/catch
      שמחניק, ושם drop שקט גרוע בהרבה מכפילות.
   2. 'initialized' לא מדוכא, אף פעם. הפלטפורמה מבקשת אותו בכל כניסה.
      התוצאה המקובלת היא initialized ברמת פריט בלי completed תואם כשלומד
      נכנס מחדש לסין שסיים.
   ═══════════════════════════════════════════════════════════════════ */

var LEDGER_STORAGE_KEY = 'lomda_completed_ledger::Methodica-science-mass-measure-02';

/* דגל השחזור. ב-40-resume.js הוא נדלק בזמן replay של תשובות שמורות, כדי
   שלא ידווחו מחדש. כאן אין replay, ולכן הוא תמיד false — הוא נשאר מוצהר
   כי sendCompletedOnce בודק אותו, ומימוש resume עתידי ידליק אותו. */
var _restoring = false;

/* ה-slug של הסין הנוכחי, נגזר מנתיב התיקייה. אותה נגזרת כמו במתמטיקה —
   שמות התיקיות הם מקור האמת ל-slug, ולכן זה עובד גם עם ה-M הרישית. */
function currentPartSlug() {
  var p = window.location.pathname.replace(/\/index\.html.*$/, '').replace(/\/+$/, '');
  return p.split('/').pop() || '';
}

function itemLedgerKey(item) { return currentPartSlug() + '#' + item; }

/* המסמך כולו, כפי שנקרא/נכתב לאחרונה. null פירושו "לא זמין" ולא "ריק",
   ובדיוק בגלל זה alreadySent מחזיר false במקרה כזה — fail open. */
var _ledger = null;

function _readLedger() {
  if (_ledger) return _ledger;
  try {
    var raw = window.sessionStorage.getItem(LEDGER_STORAGE_KEY);
    _ledger = raw ? JSON.parse(raw) : { done: {}, doneItems: {} };
  } catch (e) {
    /* אותו טיפול כמו בכל קריאות ה-localStorage בפרויקט: ב-file:// או
       ב-origin אטום הגישה זורקת SecurityError, ובלי העטיפה הזאת כל
       script.js היה נופל. */
    _ledger = null;
    return null;
  }
  _ledger.done = _ledger.done || {};
  _ledger.doneItems = _ledger.doneItems || {};
  return _ledger;
}

function _writeLedger() {
  if (!_ledger) return;
  try {
    window.sessionStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(_ledger));
  } catch (e) { console.error('[ledger] write', e); }
}

function alreadySent(ledger, key) {
  var doc = _readLedger();
  return !!(doc && doc[ledger] && doc[ledger][key]);
}

function markSent(ledger, key) {
  var doc = _readLedger();
  if (!doc) return;
  doc[ledger] = doc[ledger] || {};
  doc[ledger][key] = true;
  /* סינכרוני במכוון: שני אתרי קריאה שולחים בלי לנווט אחר כך (מסכי הסיום
     של סינים 05 ו-06), ולכן שום דבר אחר לא היה כותב את הסימון. */
  _writeLedger();
}

/* חתימה זהה ל-40-resume.js. שלושת הסדרים כאן נושאי-משקל:
   - יציאה מוחלטת בזמן _restoring — לא שולחים וגם לא מסמנים. סימון שנלקח
     תחת stub היה מדכא לתמיד statement שמעולם לא יצא בפועל.
   - fail open (ראו כותרת).
   - הסימון נכתב סינכרונית בתוך markSent. */
function sendCompletedOnce(ledger, key, objectType, result, opts) {
  if (_restoring) return;
  if (alreadySent(ledger, key)) return;
  sendStatement720('completed', objectType, result || null, opts);
  markSent(ledger, key);
}

/* ═══════════════════ קשתות-חזרה בין סינים ═══════════════════
   ── למה זה קיים ──
   סין 03 ניתן להגעה **משני** מקומות: מסין 02 (המסלול הרגיל) ומסין 01 ישירות
   (כשהלומד עומד בסף 4/5 ומדלג על סין 02). כפתור "חזרה" שלו היה מקובע לסין 02,
   כלומר לומד שדילג היה נשלח בחזרה לתוך תוכן שלא ראה.

   הפתרון הוא **מפת קשתות, לא מחסנית**: ניווט קדימה כותב edges[dest], וניווט
   אחורה רק קורא. אין אינווריאנטה שכתיבה חלקית יכולה לשבור, ואין מה לסנכרן.
   זה בדיוק הדפוס מלומדת המקור (`unit-js/40-resume.js` → `previousPartSlug`),
   שם הוא נדרש מאותה סיבה בדיוק — "part 03 is reachable from both 01 and 02".

   הקשת נושאת גם את ה-hash של מסך היעד, כי המסך האחרון שונה בין המקורות
   (סין 01 חוזרים למסך 20, סין 02 למסך 9).

   sessionStorage ולא localStorage: הקשת שייכת לניסיון הנוכחי. קשת שנשארת
   מניסיון קודם עלולה לשלוח לומד למסלול שהוא לא עבר בפעם הזאת. */
var NAV_EDGE_KEY = 'lomda_nav_edges::Methodica-science-mass-measure-02';

function _readEdges() {
  try {
    var raw = window.sessionStorage.getItem(NAV_EDGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}

/* נקרא מכל מנווט קדימה, מיד לפני הניווט.
     destSlug    שם התיקייה של היעד
     returnHash  ה-hash שיחזיר את הלומד למסך שממנו יצא, למשל '#screen=19' */
function recordForwardEdge(destSlug, returnHash) {
  try {
    var edges = _readEdges();
    edges[destSlug] = { from: currentPartSlug(), hash: returnHash || '' };
    window.sessionStorage.setItem(NAV_EDGE_KEY, JSON.stringify(edges));
  } catch (e) { /* אחסון חסום — ה-fallback בכפתור החזרה יטפל */ }
}

/* פתרון הקשת ל-URL. מופרד מהניווט עצמו במכוון: כך ההחלטה ניתנת לבדיקה בלי
   לנווט בפועל — location.href אינו ניתן ל-stub ב-jsdom, ובלי ההפרדה הזאת
   הכלל שקובע לאן חוזרים לא היה מכוסה בבדיקות בכלל.
   ה-fallback הוא ההתנהגות המקובעת שהייתה לפני הקשתות, כך שאם האחסון חסום או
   שלא נרשמה קשת — הכפתור מתנהג בדיוק כמו קודם. */
function previousPartHref(fallbackSlug, fallbackHash) {
  var edge = _readEdges()[currentPartSlug()];
  var slug = (edge && edge.from) || fallbackSlug;
  var hash = edge ? (edge.hash || '') : (fallbackHash || '');
  return '../' + slug + '/index.html' + window.location.search + hash;
}

/* ניווט אחורה — האפקט בלבד. */
function goBackToPreviousPart(fallbackSlug, fallbackHash) {
  window.location.href = previousPartHref(fallbackSlug, fallbackHash);
}

/* פתח יציאה ל-QA. מחוץ לפלטפורמה אין ?registration, וה-slug זהה בכל הרצה
   מקומית — כלומר אחרי מעבר אחד היומן מלא ואף completed לא נשלח שוב, מה
   שנקרא כרגרסיה קטסטרופלית למי שבודק אחר כך. ?resetLedger מתחיל מדף חלק.
   מנקה את עצמו מה-URL: כל ניווט בין סינים מעתיק את window.location.search
   מילה במילה, ולכן אם היה נשאר הוא היה מתאפס שוב בכל מעבר. */
function initLedgerResetHatch() {
  if (!/[?&]resetLedger(=|&|$)/.test(window.location.search)) return;
  try {
    window.sessionStorage.removeItem(LEDGER_STORAGE_KEY);
  } catch (e) {}
  _ledger = null;
  try {
    var q = window.location.search
      .replace(/([?&])resetLedger(=[^&]*)?(&|$)/, '$1')
      .replace(/[?&]$/, '');
    history.replaceState(null, '', window.location.pathname + q + window.location.hash);
  } catch (e) {}
  console.log('[ledger] reset');
}
