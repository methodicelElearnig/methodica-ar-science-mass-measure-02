'use strict';
/* ═══════════════════ BOOT ═══════════════════
   הקובץ היחיד ב-unit-js/ שיש לו side effects ברמת top-level, ותג ה-script
   האחרון בכל עמוד — אחרי script.js של הסין, כך שכל hook פר-סיני שהוא קורא
   כבר קיים.

   ── למה קובץ נפרד, ולא כמה שורות בתחתית script.js ──
   נסיון ראשון כן הוסיף את הקריאות האלה לבלוק ה"אתחול" שבתחתית כל script.js.
   הרצה headless על ששת הסינים הראתה למה זו טעות: זריקה ברמת top-level בקוד
   האתחול הקיים (בסינים 02/05/06 זה היה video.play().catch על סביבה שבה play()
   לא ממומש) מפילה את *שאר* אותו script — כלומר מודאל הדיווח והדיווחיות לא
   היו מאותחלים בכלל, בשקט. תג script נפרד מריץ קונטקסט נפרד: זריקה
   ב-script.js לא נוגעת בו. זו בדיוק הסיבה שלומדת המתמטיקה מחזיקה 90-boot.js
   נפרד, ולא כמה שורות בסוף כל סין.

   ── הסדר נושא-משקל ──
     1. initLedgerResetHatch() ראשון — הוא עשוי לנקות את היומן ולשנות את ה-URL
        (הסרת ?resetLedger), ולכן חייב לרוץ לפני שמישהו קורא או כותב ליומן.
     2. initReportModal() — כפתור הדגל, ה-select המותאם, שלושת הדיאלוגים.
     3. bootXAPI() אחרון. הוא טוען שני סקריפטים מה-CDN ומדווח את ה-initialized
        של הרכיב, ובמימוש resume עתידי הוא גם עשוי לעשות
        window.location.replace() לסין אחר — ואז שום דבר אחריו לא היה רץ.

   שתי הראשונות עטופות ב-try/catch כל אחת בנפרד, כדי שכשל באחת לא ימנע את
   האחרות. bootXAPI() עוטף כבר את עצמו פנימה.

   אין צורך ב-DOMContentLoaded: התג הזה יושב מיד לפני </body>, ולכן ה-DOM שלם. */
(function boot() {
  try { initLedgerResetHatch(); } catch (e) { console.error('[boot] initLedgerResetHatch', e); }
  try { initReportModal(); }     catch (e) { console.error('[boot] initReportModal', e); }
  bootXAPI();
})();
