'use strict';
/* ═══════════════════ RESUME — שמירה/שחזור מצב מול Kata (xAPI State API) ═══════════════════
   משותף לששת הסינים. Definition-only: 90-boot.js קורא ל-initResumeResetHatch()
   ול-initResumeLeaveHandlers(), ו-50-loader.js מריץ את השחזור עצמו.
   העיצוב המלא: RESUME.md בלומדת methodica-math-scale-01 (המקור לדפוס הזה).

   ── מסמך אחד — אבל לא "ליחידה" במודל של Kata ──
   אומת מול Documentation/KATA/KATA-API.md (2026-08-17). דיוק שחשוב למי שיקרא
   את זה אחר כך: **ל-Kata אין מושג של "יחידה" במסמך ה-state.** המודל שלה הוא
   "מסמך אטום אחד לכל זוג לומד–רכיב" (KATA-API.md §3).

   מה שכן עובד, ולמה: הכתובת היא `?registration` **בלבד** (או לחלופין
   studentId+componentKey; שליחת שניהם היא 400). הפלטפורמה משגרת רכיב אחד —
   `POST /launcher/context` מקבל componentId יחיד ומחזיר registrationId יחיד —
   וכל מעבר בין סינים מעתיק את window.location.search מילה במילה. לכן ששת
   הסינים מציגים את אותו registration ולמעשה חולקים את **המסמך של הרכיב
   שהושגר** (סין 01), ולא מסמך יחידתי שכזה קיים.

   זה נסבל כי Kata מאמתת את הכתובת מול השיגורים של **הקבוצה** ולא מול הרכיב
   הקורא (404 = "no state yet, or the target doesn't match any launch owned by
   your group"), ולכן סין 04 מורשה לקרוא את המסמך שנפתח בשיגור של סין 01.

   ⚠️ הסיכון שנשאר, ועכשיו מאופיין במדויק: אם הפלטפורמה תשגר אי-פעם סין אחר
   ישירות (deep launch), הוא יקבל registration אחר → מסמך אחר → התקדמות
   מפוצלת לשניים. זו שאלה לשותף הפלטפורמה, לא משהו שהקוד כאן יכול לגדר.

   (window.XAPI_UNIT_ID ו-RESUME_STATE_ID מכתיבים רק את מפתח ה-fallback
   ב-localStorage, שנכנס לתמונה כשאין ?slxapi תקין.)

   ── עוד שלוש עובדות מהמסמך, שנוגעות ישירות לקוד כאן ──
   • **עמידות:** Kata "never acknowledges a write that wasn't durably saved".
     כלומר ה-true שחוזר מ-saveState720 הוא הבטחה אמיתית, וזה מה שמצדיק את
     בדיקת ה-!== false ב-persistUnitState ואת הסירוב לנווט אחורה על כתיבה
     שנכשלה.
   • **גודל:** תקרה של ~1MB (מעליה 413). המסמך כאן זעיר — מצביע מסך לכל סין
     ושני יומנים — ולכן אין חשש, גם אחרי שלב 2.
   • **שמירה בזמן:** ברירת המחדל היא ~12 חודשים מהעדכון האחרון, ואחריה GET
     מחזיר 404. לומד שחוזר אחרי יותר מזה מתחיל מאפס, בשקט. readUnitState
     מטפל ב-404/null כמו ב"מסמך חדש", ולכן זה מתנהג נכון ולא נופל.

   ── הקובץ הזה החליף את 40-ledger.js ──
   40-ledger.js סיפק את אותו API בדיוק מעל sessionStorage, כדי ש-20-xapi.js
   יעבוד לפני שה-resume קיים. הפער שהוא תיעד: sessionStorage לא שורד סגירת
   לשונית, ולכן לומד שחוזר בשיגור חדש היה שולח completed שני. היומן כאן יושב
   בתוך מסמך ה-state, ולכן שורד. כל השמות הציבוריים נשמרו — 20-xapi.js
   וקוד הסינים לא נגעו.

   ── תפרים פר-סין, נקראים בזמן call (לא בזמן טעינה) ──
     capturePartPayload()   מחזיר את ה-payload של הסין הזה, כולל currentScreen
     applyResumeVars(st)    מחזיר משתני תשובה   ← שלב 2, כרגע stub
     applyResumeDom(st)     מחזיר ערכי DOM      ← שלב 2, כרגע stub
     restoreScreenUI(n)     מצייר מסך שנענה     ← שלב 2, כרגע stub
   ═══════════════════════════════════════════════════════════════════ */

var RESUME_STATE_VERSION = 3;
var RESUME_STATE_ID      = 'execution-state';

/* לא נדלק עד הקריאה הראשונה שהצליחה (או ה-catch שלה). כל נתיבי הכתיבה
   בודקים אותו, כדי שכלום לא ייכתב לפני שידוע מה כבר יש במסמך. */
var _resumeReady       = false;

/* דלוק רק בתוך applyExecutionState. מדכא כתיבות ואת היומן — ראו שם. */
var _restoring         = false;

/* מונע מ-handlers של יציאה לדרוך על מצביע הנחיתה שנכתב רגע לפני ניווט. */
var _leavingToNextPart = false;

/* המסמך כולו, כפי שנקרא/נכתב לאחרונה. לעולם לא נשאר null אחרי
   readUnitState() — גם sendCompletedOnce וגם captureUnitState נגזרים ממנו,
   וכל אתרי הקריאה שלהם יושבים ב-try/catch שמחניק, כך שזריקה שם הייתה
   מפילה statement אמיתי בשקט. */
var _unitState = null;

/* נדלק ע"י initResumeResetHatch. הדגל נחוץ כי ה-hatch מסלק את ?resetState
   מה-URL בתחילת ה-boot, בעוד readUnitState רץ מאוחר יותר (אחרי טעינת
   הספרייה) — ואז הבדיקה על ה-query string כבר לא הייתה מוצאת כלום. */
var _resetRequested = false;

/* ה-slug של הסין הנוכחי, נגזר מנתיב התיקייה. שמות התיקיות הם מקור האמת
   ל-slug הפנימי הזה, והם כולם באותיות קטנות — כמו המזהים שב-metadata/.

   ⚠️ toLowerCase() אינו קוסמטי. ה-slug נגזר מ-location.pathname, כלומר
   מהאופן שבו הלומד *הגיע* לדף. URL שנבדל רק באות רישית היה מייצר מפתח שני
   לאותו סין — שתי רשומות נפרדות תחת parts[] — ומשם: התקדמות מפוצלת, יומן
   `done` שמחמיץ, ולכן completed כפול. הנרמול חוסם את זה בשורש.
   בדיקת רגרסיה ב-_test/verify-report.js אוסרת אות רישית בנתיבים האלה. */
function currentPartSlug() {
  var p = window.location.pathname.replace(/\/index\.html.*$/, '').replace(/\/+$/, '');
  return (p.split('/').pop() || '').toLowerCase();
}

function itemLedgerKey(item) { return currentPartSlug() + '#' + item; }

/* ═══════════════════ המסמך ═══════════════════ */

function emptyUnitState() {
  return {
    v: RESUME_STATE_VERSION,
    part: currentPartSlug(),   // על איזה סין הלומד אמור לנחות
    parts: {},                 // slug → ה-payload של אותו סין (כולל currentScreen)
    prev:  {},                 // slug → {from, hash}: מאיפה נכנסו אליו, ולאיזה מסך לחזור
    done:  {},                 // slug של רכיב (או 'unit') → ה-completed שלו נשלח
    doneItems: {}              // '<slug>#<itemId>' → ה-completed של הפריט נשלח
  };
}

/* תמיד מחזיר מסמך שמיש. אין כאן מיגרציה מ-v2: היחידה הזאת מעולם לא שיגרה
   resume, ולכן לא קיימים מסמכים בפורמט קודם בשטח. כל v שאינו הנוכחי נזרק. */
function readUnitState() {
  var doc = null;
  try {
    if (_resetRequested) {
      _unitState = emptyUnitState();
      persistUnitState(_unitState);
      console.log('[resume] state reset');
      return _unitState;
    }
    doc = (typeof window.loadState720 === 'function') ? window.loadState720(RESUME_STATE_ID) : null;
  } catch (e) { console.error('[resume] read', e); doc = null; }
  if (doc && doc.v !== RESUME_STATE_VERSION) doc = null;
  if (!doc) doc = emptyUnitState();
  doc.parts     = doc.parts     || {};
  doc.prev      = doc.prev      || {};
  doc.done      = doc.done      || {};
  doc.doneItems = doc.doneItems || {};
  _unitState = doc;
  return doc;
}

/* **מחליף** את המשבצת של הסין הזה ולא ממזג לתוכה — מיזוג היה משאיר מפתחות
   מיושנים בחיים.
   `part` לא נוגעים בו במכוון: רק writeForwardState ו-goBackToPreviousPart
   מזיזים את מצביע הנחיתה. שמירה שהייתה מאפסת אותו ל-slug הנוכחי הייתה
   מבטלת את מה שהם כתבו רגע לפני, וה-timer המושהה שהשאיר ה-goTo() האחרון
   היה נורה בתוך הניווט ומחזיר את הלומד לסין שהוא בדיוק עזב. */
function captureUnitState() {
  var doc = _unitState || emptyUnitState();
  doc.v = RESUME_STATE_VERSION;
  if (!doc.part) doc.part = currentPartSlug();
  doc.parts[currentPartSlug()] = capturePartPayload();
  _unitState = doc;
  return doc;
}

/* חימוש מחדש של ה-debounce **לפני** הכתיבה הסינכרונית הוא מה שמקבע מעבר בין
   סינים: העמוד נשאר בחיים בזמן שהמסמך הבא נטען, מספיק זמן ל-timer מיושן
   לירות ולדרוך על הכתיבה עם payload שעוד מצביע על הסין הזה.
   מחזיר אם הכתיבה הסינכרונית נחתה — מי שעומד לנווט חייב לדעת. */
function persistUnitState(doc) {
  var ok = false;
  try {
    if (typeof window.saveState720Debounced === 'function') window.saveState720Debounced(RESUME_STATE_ID, doc);
    /* !== false ולא בדיקת truthiness: הספרייה מחזירה true/false מפורש בכל
       מסלול (אומת מול 720-common-lib/xapi-720-k.js), ולעולם לא undefined.
       ‎-k לא שינה את החוזה הזה — הוא רק הוסיף לידו את הפירוט. */
    if (typeof window.saveState720 === 'function') ok = (window.saveState720(RESUME_STATE_ID, doc) !== false);
    /* אבחון: ב--j כשל כתיבה היה ביט אחד, ולכן הרצה שנכשלת מול הפלטפורמה לא
       הייתה ניתנת לפירוש — 412 מול 413 (מסמך מעל 1MB) מול 401 מול CORS נראו
       זהים. ‎-k מוסיף את stateLastResult720(); מגודר ב-typeof כדי שהיחידה
       תמשיך לרוץ גם מול -j, שאין בו את הפונקציה. */
    if (!ok && typeof window.stateLastResult720 === 'function') {
      console.error('[resume] persist failed —', window.stateLastResult720());
    }
  } catch (e) { console.error('[resume] persist', e); ok = false; }
  return ok;
}

/* אם הניווט בסוף לא קורה (offline, 404, unload שבוטל) העמוד נשאר בחיים,
   ולכן משחררים — אחרת הסין הזה לא היה יכול לשמור עד סוף הסשן. */
function armLeaving() {
  _leavingToNextPart = true;
  try { setTimeout(function () { _leavingToNextPart = false; }, 5000); } catch (e) {}
}

/* ═══════════════════ יומן ה-completed ═══════════════════
   completed אחד לכל רכיב, לכל פריט ולכל היחידה — כפתור "חזרה" הופך כל מסך
   שהושלם לנגיש מחדש, וה-dedupe של הספרייה עצמה מחזיק טעינת עמוד אחת בלבד.

   שלושת הסדרים כאן נושאי-משקל:
   1. **יציאה מוחלטת בזמן _restoring** — לא שולחים וגם לא מסמנים.
      applyExecutionState עושה stub ל-sender, ולכן סימון שנלקח שם היה מדכא
      לתמיד statement שמעולם לא יצא. כך היה נעלם ה-completed של היחידה
      כשלומד משוחזר ישר למסך הסיום.
   2. **fail open, לעולם לא closed.** היומן נשמע רק כשהוא אומר במפורש "כבר
      נשלח". אם המסמך לא זמין — שולחים בכל מקרה: כל אתר קריאה יושב בתוך
      try/catch שמחניק, ושם drop שקט גרוע בהרבה מכפילות.
   3. **הסימון נכתב סינכרונית כאן.** שני אתרי קריאה שולחים בלי לנווט אחר כך
      (מסכי הסיום של סינים 05 ו-06), ולכן שום דבר אחר לא היה כותב אותו.

   'initialized' לא מדוכא, אף פעם — הפלטפורמה מבקשת אותו בכל כניסה. */
function alreadySent(ledger, key) {
  return !!(_unitState && _unitState[ledger] && _unitState[ledger][key]);
}

function markSent(ledger, key) {
  if (!_unitState) return;
  _unitState[ledger] = _unitState[ledger] || {};
  _unitState[ledger][key] = true;
  try { persistUnitState(captureUnitState()); } catch (e) { console.error('[resume] ledger', e); }
}

function sendCompletedOnce(ledger, key, objectType, result, opts) {
  if (_restoring) return;
  if (alreadySent(ledger, key)) return;
  sendStatement720('completed', objectType, result || null, opts);
  markSent(ledger, key);
}

/* ═══════════════════ קשתות-חזרה בין סינים ═══════════════════
   ── למה זה קיים ──
   סין 03 ניתן להגעה **משני** מקומות: מסין 02 (המסלול הרגיל) ומסין 01 ישירות
   (כשהלומד עומד בסף 4/5 ומדלג על סין 02). כפתור "חזרה" מקובע היה שולח את מי
   שדילג בחזרה לתוך תוכן שלא ראה.

   הפתרון הוא **מפת קשתות, לא מחסנית**: ניווט קדימה כותב את הקשת, וניווט
   אחורה רק קורא. אין אינווריאנטה שכתיבה חלקית יכולה לשבור, ואין מה לסנכרן.

   ── שתי שכבות, במכוון ──
   1. `prev` שבמסמך — עמיד, שורד סגירת לשונית, וזה מקור האמת.
   2. מפת הקשתות ב-sessionStorage — זמינה **סינכרונית** מרגע טעינת ה-script.
      זה לא יתירות מיותרת: המסמך מגיע רק אחרי שתי סקריפטים מה-CDN וה-poll
      על המטא-דאטה, ובלומדה הזאת כפתור "חזרה" גלוי מיד. לומד שילחץ עליו
      בשנייה הראשונה היה נופל ל-fallback המקובע — כלומר בדיוק הבאג שהקשתות
      נועדו לפתור. השכבה הזאת מכסה את החלון הזה.
   3. הארגומנטים המקובעים — ההתנהגות שהייתה לפני הקשתות, למקרה ששתי
      השכבות לא זמינות (אחסון חסום, הספרייה לא נטענה).

   הקשת נושאת גם את ה-hash של מסך היעד, כי המסך האחרון שונה בין המקורות
   (מסין 01 חוזרים למסך 20, מסין 02 למסך 9).

   sessionStorage ולא localStorage בשכבה 2: הקשת שייכת לניסיון הנוכחי. קשת
   שנשארת מניסיון קודם עלולה לשלוח לומד למסלול שהוא לא עבר בפעם הזאת. */
var NAV_EDGE_KEY = 'lomda_nav_edges::methodica-science-mass-measure-02';

function _readEdges() {
  try {
    var raw = window.sessionStorage.getItem(NAV_EDGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}

/* נקרא מכל מנווט קדימה, מיד לפני הניווט. writeForwardState קורא לזה בעצמו,
   כך שהשתיים לא יכולות להיפרד.
     destSlug    שם התיקייה של היעד
     returnHash  ה-hash שיחזיר את הלומד למסך שממנו יצא, למשל '#screen=19' */
function recordForwardEdge(destSlug, returnHash) {
  try {
    var edges = _readEdges();
    edges[destSlug] = { from: currentPartSlug(), hash: returnHash || '' };
    window.sessionStorage.setItem(NAV_EDGE_KEY, JSON.stringify(edges));
  } catch (e) { /* אחסון חסום — ה-fallback בכפתור החזרה יטפל */ }
}

/* הקשת הנכנסת לסין הנוכחי, לפי סדר העדיפויות שלמעלה. */
function _incomingEdge() {
  var here = currentPartSlug();
  var fromDoc = _unitState && _unitState.prev && _unitState.prev[here];
  if (fromDoc && fromDoc.from) return fromDoc;
  return _readEdges()[here] || null;
}

/* פתרון הקשת ל-URL. מופרד מהניווט עצמו במכוון: כך ההחלטה ניתנת לבדיקה בלי
   לנווט בפועל — location.href אינו ניתן ל-stub ב-jsdom, ובלי ההפרדה הזאת
   הכלל שקובע לאן חוזרים לא היה מכוסה בבדיקות בכלל. */
function previousPartHref(fallbackSlug, fallbackHash) {
  var edge = _incomingEdge();
  var slug = (edge && edge.from) || fallbackSlug;
  var hash = edge ? (edge.hash || '') : (fallbackHash || '');
  return '../' + slug + '/index.html' + window.location.search + hash;
}

/* ניווט אחורה. מצביע את המסמך על היעד **לפני** הניווט — זה מה שמונע
   מהלואדר של היעד לראות אי-התאמה ולקפוץ מיד חזרה לכאן (ping-pong שהיה
   שולח completed מחדש בכל סבב). אם הכתיבה לא נחתה, להישאר במקום היא
   הכשל הבטוח; ניווט על כתיבה שנכשלה הוא בדיוק מה שמחזיר את ה-ping-pong. */
function goBackToPreviousPart(fallbackSlug, fallbackHash) {
  var href = previousPartHref(fallbackSlug, fallbackHash);
  var edge = _incomingEdge();
  var destSlug = (edge && edge.from) || fallbackSlug;

  if (RESUME_ENABLED && _resumeReady && destSlug) {
    var doc = captureUnitState();
    var here = doc.part;
    doc.part = destSlug;
    if (!persistUnitState(doc) && !persistUnitState(doc)) {
      console.error('[resume] back: state write failed, staying put');
      doc.part = here;
      return;
    }
    armLeaving();
  }
  /* replace() ולא href: אחרת כפתור ה-Back של הדפדפן היה מחזיר את הלומד
     לסין שעזב, שהלואדר שלו רואה מצביע נחיתה אחר ומיד קופץ קדימה — כלומר
     לחיצת Back אחת מרגישה כמו שהדף "נתקע". */
  window.location.replace(href);
}

/* מצביע את המסמך על הסין שהלומד עומד להיכנס אליו, כדי שהשיגור הבא ימשיך
   קדימה ולא יחזור לתוך הסין שהוא בדיוק סיים — ורושם את קשת החזרה.
   בניגוד ל-v2 בלומדת המקור, ה-payload של הסין שעוזבים **נשמר**
   (captureUnitState רץ ראשון). זה כל העניין: כפתור החזרה משחזר את הסין
   שממנו הלומד בא, והוא לא יכול לשחזר מה שנזרק. יעד שכבר בוקר שומר את
   ה-payload שלו גם כן, כך שמעבר קדימה שוב מחזיר אותו למקום שבו הפסיק
   ולא למסך 0. */
function writeForwardState(destSlug, returnHash) {
  /* שכבה 2 תמיד, גם כשה-resume כבוי או לא מוכן — היא ההתנהגות שהייתה
     לפני השינוי הזה, וקוד הסינים סומך עליה. */
  recordForwardEdge(destSlug, returnHash);
  if (!RESUME_ENABLED || !_resumeReady) return;
  var doc = captureUnitState();
  doc.part = destSlug;
  doc.prev[destSlug] = { from: currentPartSlug(), hash: returnHash || '' };
  if (!doc.parts[destSlug]) doc.parts[destSlug] = { currentScreen: 0 };
  persistUnitState(doc);
  armLeaving();
}

/* ═══════════════════ השחזור ═══════════════════
   שבעה שלבים, שלושה מהם נושאי-משקל ולא אינטואיטיביים.

   - **ה-stub על sendStatement720 מוחזק לרוחב כל ה-goTo** (1→6). מסכי הסיום
     של סינים 05 ו-06 שולחים completed של פריט, רכיב **ויחידה** בכניסה, וכלל
     ה-completed-אחד-לטעינת-עמוד של הספרייה לא עוזר בין טעינות עמוד. דיכוי
     רק בזמן החזרת המשתנים היה מכפיל את שלושתם בכל שחזור למסך סיום.
     ה-stub הוא גם הדבר **היחיד** שמדכא 'initialized': 20-xapi.js שולח אותו
     ישירות ולא דרך היומן, ולכן _restoring לבדו לא היה עוצר אותו.

   - **מעבר שני על המשתנים** (4). goTo() מריץ את resetScreenState(n), וזה
     *מאתחל*, לא *משחזר* — הוא מאפס בדיוק את המשתנים שהוחזרו רגע לפני.
     החזרה שנייה מנטרלת את זה בלי לגעת באף resetScreenStateN.
     (בשלב 1 ה-hooks עדיין stubs, ולכן המעבר הזה הוא no-op — אבל הוא נשאר
     כאן כדי שהוספת ה-painters בשלב 2 לא תדרוש לגעת בסדר הזה שוב.)

   - **איפוס xapiCurrentItem** (7). xapiOnScreen() יוצא מוקדם כש-
     item === xapiCurrentItem, וה-latch נשאר דלוק מתוך ה-goTo שדוכא, למרות
     שה-statement נבלע. בלי האיפוס סשן משוחזר לא היה שולח 'initialized'
     של פריט **בכלל**, והחלפת המסך הבאה הייתה סוגרת פריט שלא נפתח.

   ── screenOverride ──
   ה-hash מנצח את המסמך בבחירת **המסך**, אבל לא בשחזור **המצב**. עד 2026-08-18
   ה-loader דילג על applyExecutionState כולו כשהיה '#screen=N' ב-URL, ולכן
   הגעה דרך "חזרה" בין-סינית איבדה את כל השחזור — כולל XAPI_Q_RESULTS ו-
   stationProgress, שמהם נגזר הניתוב קדימה. לומד שעמד בסף היה נשלח לתרגול
   המחזק. עכשיו תמיד משחזרים, וה-hash קובע רק לאן נוחתים. */
function applyExecutionState(st, screenOverride) {
  if (!st) return;
  _restoring = true;
  var _origSend = window.sendStatement720;
  window.sendStatement720 = function () {};
  try {
    applyResumeVars(st);
    /* טווח נבדק מול TOTAL_SCREENS: goTo() חוסם מחוץ לטווח ו**חוזר**, כלומר
       currentScreen היה נשאר על הערך הקודם וה-painter היה מצייר מסך אחר.
       hash מיושן (סין שהתקצר) חוזר לערך שבמסמך, לא נוחת בשום מקום. */
    var _n = (typeof screenOverride === 'number' && screenOverride >= 0 &&
              screenOverride < TOTAL_SCREENS)
      ? screenOverride
      : ((typeof st.currentScreen === 'number') ? st.currentScreen : 0);
    goTo(_n);
    applyResumeVars(st);   // מבטל את האיפוס שעשה resetScreenState של המסך הזה
    applyResumeDom(st);    // לפני ה-painter, שנועל/משבית את השדות
    restoreScreenUI(currentScreen);
  } catch (e) {
    console.error('[resume] apply', e);
  } finally {
    window.sendStatement720 = _origSend;
    _restoring = false;
  }
  xapiCurrentItem = null;
  try { xapiOnScreen(currentScreen); } catch (e) {}
}

/* ═══════════════════ ציור מסך שנענה, בכל ניווט ═══════════════════
   התיקון לבאג ש-applyExecutionState לבדו לא כיסה: applyResumeVars מחזיר את
   משתני התשובה של **כל** השאלות בסין, אבל restoreScreenUI נקרא שם למסך
   הנחיתה **בלבד**. כל מסך אחר שנענה נשאר עם "המשתנים אומרים נענה, ה-DOM
   אומר ריק" — וזה חסימה מלאה, לא אי-נוחות: scqNSelect פותח ב-
   `if (scqNDone) return;` ולכן כל קליק נבלע; resetScreenStateN יוצא מוקדם על
   scqNDone ולכן לא מצייר ולא מפעיל; וה-disabled של כפתור הבדיקה מגיע
   מה-markup, כך שרק restoreScqUI או scqNCheck חי מסירים אותו. הלומד נשאר בלי
   שום שליטה קדימה — וכפתור "חזרה" של כל מסך הוא goTo(n-1), כלומר לחיצה אחת
   מנחיתה אותו על מסך תקוע נוסף. רק רענון עמוד משחרר.

   למה בלי "פעם אחת למסך": כל 20 ה-painters כבר idempotent ומוגנים ב-guard
   של מסך נקי, ושלושת המפגעים שבגללם שקלתי bookkeeping אינם ניתנים להגעה
   בניווט חוזר (resetScreenState10 יוצא על s11Matches > 0, s11RestoreUI יוצא
   על s11Matches === 0, ו-scqFbResetPosition רץ כבר בכל showFeedback חי).
   בנוסף, gating היה מסתיר את התיקון של סימוני הטעות (ראו applyResumeDom).
   ההערות בכל ששת הסינים ממילא מתארות את ההתנהגות הזאת ("נקרא גם
   מ-applyExecutionState וגם — בשלב 2 — מכל ניווט"); רק הקריאה עצמה חסרה.

   מדלגים בזמן _restoring: applyExecutionState מצייר בעצמו, ו**אחרי**
   applyResumeDom — ציור מוקדם משם היה על placement שעוד לא הוחזר. */
function repaintScreen(n) {
  if (!RESUME_ENABLED || _restoring) return;
  if (typeof restoreScreenUI !== 'function') return;
  try { restoreScreenUI(n); }
  catch (e) { console.error('[resume] repaintScreen', e); }
}

/* ═══════════════════ מתי נכתב ═══════════════════
   כולם יוצאים אם ה-resume כבוי, אם עוד לא הייתה קריאה מוצלחת, או בתוך
   שחזור — כך שכלום לא נכתב בזמן replay וכלום לא נכתב לפני הקריאה. */

/* החלפת מסך — נקודת החנק. מושהה: תוחם את האיבוד למסך אחד. */
function scheduleResumeSave() {
  if (!RESUME_ENABLED || !_resumeReady || _restoring) return;
  if (typeof window.saveState720Debounced !== 'function') return;
  try { window.saveState720Debounced(RESUME_STATE_ID, captureUnitState()); } catch (e) {}
}

/* מחויבות תשובה / סיום — סינכרוני.
   למה לא מושהה: goTo(n) מחמש שמירה מושהית; הלומד לוחץ "המשך" 200ms אחר כך;
   פונקציית הניתוב כותבת את ה-blob של היעד ומנווטת — אבל העמוד נשאר בחיים
   בזמן שהמסמך הבא נטען, מספיק זמן ל-timer המיושן לירות **אחרי** הכתיבה
   קדימה. השיגור הבא היה חוזר לתוך הסין שהסתיים. */
function flushResumeSave() {
  if (!RESUME_ENABLED || !_resumeReady || _restoring) return;
  if (typeof window.saveState720 !== 'function') return;
  try { window.saveState720(RESUME_STATE_ID, captureUnitState()); } catch (e) {}
}

/* יציאה מהעמוד. beforeunload לבדו לא מספיק: הוא לא נורה כשלשונית מובייל
   עוברת לרקע ואז נהרגת — וזו בדיוק הדרך שבה לומד עוזב באמצע. */
function flushResumeSaveOnLeave() {
  if (_leavingToNextPart) return;
  flushResumeSave();
}

/* נרשם מ-90-boot.js. */
function initResumeLeaveHandlers() {
  window.addEventListener('beforeunload', flushResumeSaveOnLeave);
  window.addEventListener('pagehide', flushResumeSaveOnLeave);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flushResumeSaveOnLeave();
  });
}

/* ═══════════════════ פתח יציאה ל-QA ═══════════════════
   מחוץ לפלטפורמה אין ?registration, ולכן ה-fallback ב-localStorage מכתיב
   לכל הרצה מקומית את **אותו** מסמך — כלומר אחרי מעבר אחד היומן מלא ואף
   completed לא נשלח שוב, מה שנקרא כרגרסיה קטסטרופלית למי שבודק אחר כך.
   ?resetState מתחיל מדף חלק.

   מנקה את עצמו מה-URL: כל ניווט בין סינים מעתיק את window.location.search
   מילה במילה, ולכן אם היה נשאר הוא היה מתאפס שוב בכל מעבר — וה-resume
   לעולם לא היה עובד. הניקוי חייב לקרות לפני שמישהו קורא את ה-query, ולכן
   90-boot.js קורא לזה ראשון; הדגל _resetRequested הוא מה שמעביר את הכוונה
   ל-readUnitState, שרץ מאוחר יותר כשה-URL כבר נקי. */
function initResumeResetHatch() {
  if (!/[?&]resetState(=|&|$)/.test(window.location.search)) return;
  _resetRequested = true;
  try { window.sessionStorage.removeItem(NAV_EDGE_KEY); } catch (e) {}
  try {
    var q = window.location.search
      .replace(/([?&])resetState(=[^&]*)?(&|$)/, '$1')
      .replace(/[?&]$/, '');
    history.replaceState(null, '', window.location.pathname + q + window.location.hash);
  } catch (e) {}
  console.log('[resume] reset requested');
}
