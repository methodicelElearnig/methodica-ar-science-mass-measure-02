'use strict';
/* ═══════════════════ xAPI — loader / init ═══════════════════
   משותף לששת הסינים. Definition-only. bootXAPI() נקרא אחרון מבלוק ה"אתחול"
   שבתחתית כל script.js, כי זה השלב שעשוי לנווט הלאה (ב-resume; כרגע לא).

   התפרים הפר-סיניים:
     XAPI_METADATA_FILE   חובה — '../metadata/<component>.json'
     onXapiReady()        אופציונלי — רץ אחרי ה-initialized של הרכיב ואחרי
                          ה-init של הפריט במסך הנחיתה. סינים 01 ו-06 משתמשים
                          בו לטעינת מטא-דאטת היחידה.

   מקור: methodica-math-scale-01-vadimr-1/unit-js/50-loader.js. בלוק ה-resume
   hop הוסר במקום להישאר מגודר-בדגל, כי אין כאן readUnitState() לקרוא לו. */

function bootXAPI() {
  var CDN = 'https://lomdot.education.gov.il/metodica/720active/common/';

  /* ── שער 1: התפר הפר-סיני חייב להיות מוגדר ──
     בלי XAPI_METADATA_FILE, getXAPIParameters מקבל undefined, לא מצליח להביא
     מטא-דאטה, ו-jsXAPI_MetadataReady לעולם לא נדלק — כלומר pollMetadataReady
     היה נכנס ללופ טיימרים אין-סופי בלי שום שגיאה גלויה. סין שלא הגדיר את
     התפר מקבל הודעה רועשת ויציאה נקייה במקום.
     זה גם מה שמאפשר לבלוק האתחול לקרוא ל-bootXAPI() בכל הסינים לפני
     שהוגדרה הקונפיגורציה הפר-סינית — הלומדה פשוט רצה בלי דיווחיות. */
  if (typeof XAPI_METADATA_FILE === 'undefined' || !XAPI_METADATA_FILE) {
    console.warn('[xAPI] XAPI_METADATA_FILE לא מוגדר בסין הזה — הדיווחיות כבויה. ' +
      'זה המצב הצפוי עד להשלמת הקונפיגורציה הפר-סינית (REPORT-XAPI.md §2).');
    return;
  }

  function loadScript(src, cb) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = cb;
    s.onerror = function () { console.error('[xAPI] failed to load', src); cb(); };
    document.head.appendChild(s);
  }

  /* ── שער 2: הפולינג חסום בזמן ──
     המקור במתמטיקה מפולל לנצח. אם קובץ המטא-דאטה חסר או מחזיר 404 —
     תרחיש דפלוימנט אמיתי לגמרי — זה לופ טיימרים שקט לכל אורך הסשן.
     50 נסיונות × 200ms = 10 שניות, ואז שגיאה שמסבירה מה לבדוק. */
  var METADATA_POLL_MAX = 50;
  function pollMetadataReady(cb, tries) {
    tries = tries || 0;
    if (window.jsXAPI_MetadataReady) { cb(); return; }
    if (tries >= METADATA_POLL_MAX) {
      console.error('[xAPI] מטא-דאטה לא נטענה תוך ' + (METADATA_POLL_MAX * 200 / 1000) + 's — ' +
        'הדיווחיות כבויה בסין הזה. לבדוק שהקובץ קיים ונגיש: ' + XAPI_METADATA_FILE);
      return;
    }
    setTimeout(function () { pollMetadataReady(cb, tries + 1); }, 200);
  }

  /* -i הוא בילד הייצור (הנחיות 720 v2.4); -j הוא -i בתוספת שכבת ה-State API
     שרק resume צריך. RESUME_ENABLED=false ולכן נטען -i.
     ב-localhost בלבד, ?xapiLib=<נתיב same-origin> יכול לעקוף לבדיקת בילד מקומי.

     ⚠️ window.XAPI_USING_G אומר לסינים אם statements ברמת פריט זמינים בכלל.
     ה-regex חייב למנות כל אות ספרייה שתומכת בהם — אם ה-CDN יעבור לאות חדשה
     ולא נרחיב כאן, xapiOnScreen ודיווח הווידאו משתתקים בלי שום שגיאה. */
  var LIB720 = CDN + (RESUME_ENABLED ? 'xapi-720-j.js' : 'xapi-720-i.js');
  try {
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
      var _ovr = new URLSearchParams(location.search).get('xapiLib');
      if (_ovr && /^(\.\.?\/|\/)[^:]*$/.test(_ovr)) LIB720 = _ovr;   // same-origin יחסי בלבד
    }
  } catch (e) {}
  window.XAPI_USING_G = /xapi-720-[ghij]\.js/.test(LIB720);

  loadScript(CDN + 'xapiwrapper.min.js', function () {
    loadScript(LIB720, function () {
      try {
        getXAPIParameters(XAPI_METADATA_FILE);
        pollMetadataReady(function () {
          try {
            try { ADL.XAPIWrapper.changeConfig({ endpoint: window.slxapi.endpoint, auth: window.slxapi.auth }); } catch (e) {}

            /* ── שער האימות של המזהים ──
               XAPI_ID_PREFIX הוא הערך היחיד בשכבה המשותפת שנקבע בהשערה
               (ראו 10-identity.js). כאן הוא נבדק מול מקור האמת בכל טעינה של
               כל סין: window.METADATA.id הוא ה-id של הרכיב הזה כפי שהוא
               כתוב ב-metadata/, ו-XAPI_COMP_ID הוא מה שהקוד ישלח בפועל.
               אי-התאמה כאן — כולל הבדל של trailing slash אחד או של אות
               רישית אחת — פירושה שכל statement שהרכיב ישלח מצביע על object
               שלא קיים בקטלוג. זה כשל שקט לחלוטין בלי הבדיקה הזאת: הספרייה
               תשלח בשמחה מזהה שגוי ו-Kata תקבל אותו.
               אזהרה, לא זריקה: דיווח שגוי עדיף על לומדה שנופלת. */
            try {
              var _metaId = window.METADATA && window.METADATA.id;
              if (_metaId && typeof XAPI_COMP_ID !== 'undefined' && _metaId !== XAPI_COMP_ID) {
                console.error('[xAPI] ID MISMATCH — הקוד ישלח מזהה שלא קיים בקטלוג.\n' +
                  '  metadata/ אומר: ' + _metaId + '\n' +
                  '  הקוד שולח:      ' + XAPI_COMP_ID + '\n' +
                  '  תקנו את XAPI_ID_PREFIX ב-unit-js/10-identity.js או את XAPI_COMP_SLUG בסין הזה.');
              }
            } catch (e) {}

            try { sendStatement720('initialized', 'onlinelesson'); } catch (e) {}
            try { xapiWireVideos(); } catch (e) {}
            /* init ברמת הפריט עבור מסך הנחיתה. בלומדה הזאת מסך הפתיחה לא
               עובר דרך goTo() בכלל — ה-.active מקובע ב-HTML ובלוק האתחול
               קורא ל-resetScreenState(0) ישירות — ולכן זו הקריאה היחידה
               שפותחת את הפריט של המסך הראשון. */
            try { xapiOnScreen(currentScreen); } catch (e) {}
            if (typeof onXapiReady === 'function') {
              try { onXapiReady(); } catch (e) { console.error('[xAPI] ready hook', e); }
            }
          } catch (e) { console.error('[xAPI] init', e); }
        });
      } catch (e) { console.error('[xAPI] load', e); }
    });
  });
}
