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
     1. initResumeResetHatch() ראשון — הוא משנה את ה-URL (הסרת ?resetState)
        ומדליק את דגל האיפוס, ולכן חייב לרוץ לפני שמישהו קורא את ה-query או
        נוגע במסמך ה-state.
     2. initResumeLeaveHandlers() — beforeunload / pagehide / visibilitychange.
        נרשם מוקדם במכוון: הוא הרשת שתופסת לומד שעוזב לפני שהגיע לניווט מסודר.
        אין צורך לגדר אותו ב-RESUME_ENABLED — flushResumeSave בודק את הדגל
        בעצמו, ולכן ה-handlers פשוט אינרטיים כשה-resume כבוי.
     3. initReportModal() — כפתור הדגל, ה-select המותאם, שלושת הדיאלוגים.
     4. bootXAPI() אחרון. הוא טוען שני סקריפטים מה-CDN, מדווח את ה-initialized
        של הרכיב, ובמסלול ה-resume עשוי לעשות window.location.replace() לסין
        אחר — ואז שום דבר אחריו לא היה רץ.

   שלוש הראשונות עטופות ב-try/catch כל אחת בנפרד, כדי שכשל באחת לא ימנע את
   האחרות. bootXAPI() עוטף כבר את עצמו פנימה.

   אין צורך ב-DOMContentLoaded: התג הזה יושב מיד לפני </body>, ולכן ה-DOM שלם. */
(function boot() {
  try { initResumeResetHatch(); }    catch (e) { console.error('[boot] initResumeResetHatch', e); }
  try { initResumeLeaveHandlers(); } catch (e) { console.error('[boot] initResumeLeaveHandlers', e); }
  try { initReportModal(); }         catch (e) { console.error('[boot] initReportModal', e); }
  bootXAPI();
})();
