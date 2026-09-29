'use strict';
/* ═══════════════════ xAPI (720) — identity ═══════════════════
   משותף לששת הסינים של methodica-ar-science-mass-measure-02. נטען ראשון.

   התחילית הקנונית של היחידה. כל מזהה שהלומדה מדווחת נבנה ממנה, והיא חייבת
   להתאים ל-metadata/*.json בית-לבית — כולל ה-trailing slash שהמוסכמה נושאת.

   ── שתי מוסכמות שאומתו מול metadata/ (2026-08-12), ושתיהן היו הפוכות בהשערה ──
   1. **trailing slash: כן.** על היחידה, הרכיב והפריט (לא על השאלה).
      ההשערה הראשונית הייתה שאין, על סמך METADATA-FIXES.md:182 בלומדת
      המתמטיקה, שמתעד ש"יחידות מדעים אינן נושאות trailing slash". התיעוד ההוא
      מתייחס ל-mass-measure-01; היחידה הזאת דווקא נושאת אותו, בדיוק כמו
      המתמטיקה. המוסכמה אינה אחידה בין יחידות — יש לבדוק, לא להסיק.
   2. **אותיות קטנות, בכל מקום.** `methodica-...` — גם ב-slug המדווח, גם
      בשמות התיקיות על הדיסק, וגם במפתחות הפנימיים. Kata גוזרת uniqueKey
      מהמקטע האחרון של ה-id, ולכן במזהה המדווח זה משנה; וה-slug עוקב אחרי
      metadata/, לא אחרי שם התיקייה.

      ⚠️ **היסטוריה — לא להחזיר.** עד 2026-08-17 כל נתיב בין-סיני בקוד היה
      כתוב באות ראשונה רישית בזמן שהתיקיות עצמן היו באותיות
      קטנות, וגם ההערה כאן *תיעדה* את זה כמוסכמה מכוונת. זו הייתה טעות בשתי
      רמות: על שרת case-sensitive כל מעבר בין סינים היה מחזיר 404, ומכיוון
      ש-currentPartSlug() נגזר מ-location.pathname, URL עם אות רישית היה
      מפצל את מסמך ה-state לשני מפתחות לאותו סין. תוקן בכל הקוד, במפתחות
      האחסון ובהרנס הבדיקה; בדיקת רגרסיה ב-_test/verify-report.js אוסרת
      אות רישית בנתיבים האלה מעכשיו.

   הבדיקה אינה ידנית: 50-loader.js משווה את XAPI_COMP_ID מול window.METADATA.id
   בכל טעינה של כל סין, וזועק לקונסול על אי-התאמה. */
var XAPI_ID_PREFIX = 'https://lomdot.education.gov.il/metodica/720/ar/science/mass-measure/02/';

/* מזהה היחידה = התחילית + slug היחידה + '/'. שווה בדיוק ל-id ב-
   metadata/methodica-ar-science-mass-measure-02_unit.json.
   התחילית לבדה היא רק שם התיקייה, ו-Kata הייתה גוזרת ממנה uniqueKey = "02" —
   מפתח שמתנגש עם כל יחידה 02 בכל מקצוע. ראו METADATA-FIXES.md §1: זו טעות
   שקרתה בפועל ביחידת המתמטיקה. */
window.XAPI_UNIT_ID = XAPI_ID_PREFIX + 'methodica-ar-science-mass-measure-02/';

/* המקטע האחרון של מזהה קנוני — ה-slug הקצר שטופס דיווח הבעיות רושם. */
function shortId(u) { return String(u || '').replace(/\/+$/, '').split('/').pop(); }

/* Resume (KATA State API) — **פעיל**.
   true גם מוביל את 50-loader.js לטעון xapi-720-k.js (הבילד שנושא את שכבת
   ה-State) במקום xapi-720-i.js. כלומר הדגל הזה משנה גם את הדיווחיות, לא רק
   את השחזור — ראו 50-loader.js.

   ── מה מיושם ──
   מסמך state יחידתי אחד (unit-js/40-resume.js), מצביע נחיתה בין סינים, מצביע
   מסך בתוך הסין, ויומן ה-completed שעבר מ-sessionStorage לתוך המסמך — כלומר
   הוא שורד סגירת לשונית, מה ש-40-ledger.js לא יכול היה.

   ⚠️ ההערה שהייתה כאן תיארה את שלב 2 כלא-בנוי ("applyResumeVars /
   applyResumeDom / restoreScreenUI הם stubs", "אין לפרוס לייצור לפני שלב 2").
   זה **מיושן**: שלב 2 הושלם ב-2026-08-18/19 בכל ששת הסינים, מצב התשובות כן
   משוחזר, ו-stationProgress ו-XAPI_Q_RESULTS חוזרים יחד איתו — ולכן גם הניתוב
   קדימה שנגזר מהם (getPracticeScore בסין 01, getBasicPracticeScore /
   getStandardPracticeScore בסין 02, getMoedBScore בסין 06) נכון אחרי resume.
   applyResumeDom נשאר ריק בסינים 03/05/06 כי אין בהם ערכים שיושבים רק ב-DOM,
   לא כי הוא לא מומש. ראו RESUME.md §6 להיסטוריה המלאה. */
var RESUME_ENABLED = true;

/* ── ניווט בין סינים: כבוי בייצור, פתוח רק ל-walkthrough מקומי (2026-09-16) ──
   הפלטפורמה (Kata) היא שמחליטה מה הרכיב הבא. היא משגרת כל רכיב בנפרד
   (launcher/context מקבל מפתח רכיב ומחזיר launchUrl + registration לרכיב הזה),
   קוראת את ה-completed שלנו ומנתבת לפי הקטלוג. ה-registration של Kata הוא
   **לרכיב**, וכל מעבר פנימי גרר את window.location.search — כלומר לומד שעבר
   01→02→03 בתוך היחידה דיווח את שלושת הרכיבים תחת ה-registration של 01.
   לכן כל ניווט בין סינים (קדימה מהמסך האחרון, "חזרה" מהמסך הראשון, קפיצת
   ה-resume בלואדר) מותנה בדגל הזה, והוא true רק כשמתקיימים **שניהם**:
     1. ?dev=1 בכתובת — רק index_dev.html והמפתח מציבים אותו;
     2. **אין** ?registration — כל שיגור של Kata נושא registration, ולכן כתובת
        שיש בה registration היא סשן אמיתי של לומד, וגם ?dev=1 לא פותח בה ניווט.
   ה-completed של הרכיב לעולם אינו מותנה בדגל: הוא נשלח בלחיצה האחרונה במסך
   האחרון, והכפתור מושבת אחריה. ראו REPORT-XAPI.md §10. */
var DEV_NAV = false;
try {
  var _devQ = new URLSearchParams(location.search);
  DEV_NAV = _devQ.get('dev') === '1' && !_devQ.has('registration');
} catch (e) {}
