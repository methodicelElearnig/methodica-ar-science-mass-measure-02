'use strict';
/* ═══════════════════ xAPI (720) — identity ═══════════════════
   משותף לששת הסינים של Methodica-science-mass-measure-02. נטען ראשון.

   התחילית הקנונית של היחידה. כל מזהה שהלומדה מדווחת נבנה ממנה, והיא חייבת
   להתאים ל-metadata/*.json בית-לבית — כולל ה-trailing slash שהמוסכמה נושאת.

   ── שתי מוסכמות שאומתו מול metadata/ (2026-08-12), ושתיהן היו הפוכות בהשערה ──
   1. **trailing slash: כן.** על היחידה, הרכיב והפריט (לא על השאלה).
      ההשערה הראשונית הייתה שאין, על סמך METADATA-FIXES.md:182 בלומדת
      המתמטיקה, שמתעד ש"יחידות מדעים אינן נושאות trailing slash". התיעוד ההוא
      מתייחס ל-mass-measure-01; היחידה הזאת דווקא נושאת אותו, בדיוק כמו
      המתמטיקה. המוסכמה אינה אחידה בין יחידות — יש לבדוק, לא להסיק.
   2. **אותיות קטנות ב-slug.** `methodica-...`, למרות ששמות התיקיות הם
      `Methodica-...` ב-M רישית. Kata גוזרת uniqueKey מהמקטע האחרון של ה-id,
      ולכן זה משנה. ה-slug עוקב אחרי metadata/, **לא** אחרי שם התיקייה.
      (currentPartSlug() ב-40-ledger.js כן נגזר משם התיקייה, אבל הוא מפתח
      פנימי של היומן ולא מזהה מדווח — ההבדל שם לא מזיק.)

   הבדיקה אינה ידנית: 50-loader.js משווה את XAPI_COMP_ID מול window.METADATA.id
   בכל טעינה של כל סין, וזועק לקונסול על אי-התאמה. */
var XAPI_ID_PREFIX = 'https://lomdot.education.gov.il/metodica/720active/science/mass-measure/02/';

/* מזהה היחידה = התחילית + slug היחידה + '/'. שווה בדיוק ל-id ב-
   metadata/methodica-science-mass-measure-02_unit.json.
   התחילית לבדה היא רק שם התיקייה, ו-Kata הייתה גוזרת ממנה uniqueKey = "02" —
   מפתח שמתנגש עם כל יחידה 02 בכל מקצוע. ראו METADATA-FIXES.md §1: זו טעות
   שקרתה בפועל ביחידת המתמטיקה. */
window.XAPI_UNIT_ID = XAPI_ID_PREFIX + 'methodica-science-mass-measure-02/';

/* המקטע האחרון של מזהה קנוני — ה-slug הקצר שטופס דיווח הבעיות רושם. */
function shortId(u) { return String(u || '').replace(/\/+$/, '').split('/').pop(); }

/* Resume (KATA State API) — מחוץ להיקף הנוכחי במכוון.
   false גם מוביל את 50-loader.js לטעון xapi-720-i.js (גרסת הייצור) ולא -j,
   שנושאת את שכבת ה-State שרק resume צריך.
   ⚠️ אין להפוך ל-true בלי לממש קודם את ה-hooks הפר-סיניים
   (capturePartPayload / applyResumeVars / applyResumeDom / restoreScreenUI)
   ולהחליף את 40-ledger.js ב-40-resume.js המלא. ראו RESUME.md בלומדת המתמטיקה. */
var RESUME_ENABLED = false;
