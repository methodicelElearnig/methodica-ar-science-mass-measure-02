# מדריך הטמעה: דיווחיות 720 בלומדה חדשה

מדריך עבודה מלא להטמעת דיווחיות xAPI ופיצ'ר "מצאתם בעיה?" בלומדת 720 קיימת.

**המדריך עומד בפני עצמו.** הוא נכתב מתוך ההטמעה בפועל על
`Methodica-science-mass-measure-02`, שבתורה נגזרה מ-`methodica-math-scale-01`.
אין צורך בגישה לאף אחת מהן: כל מה שצריך לדעת נמצא כאן, וכל קוד שצריך להעתיק
מופיע כאן במלואו או מתואר במדויק מספיק כדי לכתוב מחדש.

> **מה כן נדרש:** גישה ל-`metadata/` של היחידה החדשה, וכתובת טופס הדיווח.
> שניהם מפורטים בשלב 0.

**הערכת זמן:** יחידה בת 6 רכיבים ו-47 מסכים לקחה בערך יומיים, מתוכם כמחצית
במיפוי ובאימות ולא בכתיבת קוד. זה היחס הנכון.

---

## איך משתמשים במדריך הזה על לומדה חדשה

### מה להעתיק מיחידה שכבר עברה את התהליך

| מה | לאן | מה לשנות |
|---|---|---|
| `HOWTO-720-REPORTING.md` | שורש היחידה החדשה | כלום |
| `unit-js/` (6 קבצים) | שורש | **4 שורות בלבד** — ראו למטה |
| `unit-css/25-report.css` | שורש | רק צבעי הנושא, אם המקצוע שונה |
| `index.html` | שורש | שורה אחת — יעד ההפניה |
| `_test/verify-report.js` | שורש | ה-slug ורשימת הרכיבים |
| `_test/statement-flow.js` | שורש | **נכתב מחדש** — הוא מריץ את הפונקציות של הרכיבים עצמם |
| `.gitignore` | שורש | כלום |

### ארבע השורות

```js
// unit-js/10-identity.js
var XAPI_ID_PREFIX = '…/720active/<נושא>/<תת-נושא>/<NN>/';        // ← §3
window.XAPI_UNIT_ID = XAPI_ID_PREFIX + '<unit-slug>';              // ← §3

// unit-js/40-ledger.js
var LEDGER_STORAGE_KEY = 'lomda_completed_ledger::<unit-slug>';    // ← מפריד בין יחידות
var NAV_EDGE_KEY       = 'lomda_nav_edges::<unit-slug>';           // ← אותו דבר
```

בנוסף, **רק אם טופס הדיווח שונה**: `REPORT_FORM_ACTION` ו-`REPORT_FIELDS`
ב-`unit-js/25-report.js` (§9.4).

> שני מפתחות האחסון חייבים לשאת את ה-slug. שתי יחידות שחולקות מפתח יחלקו יומן
> `completed` — כלומר יחידה אחת תדכא דיווחים של השנייה, בשקט.

כל השאר ב-`unit-js/` ו-`unit-css/` **נייטרלי ליחידה** ועובר כמות שהוא.

### ההנחיה לפתיחת עבודה

```
יש כאן לומדת 720 בת N רכיבים שצריך להטמיע בה דיווחיות.
המדריך המלא נמצא ב-HOWTO-720-REPORTING.md — עבוד לפיו.
המטא-דאטה ב-metadata/. טופס הדיווח: <כתובת, או "משותף כמו ביחידה הקודמת">.

התחל משלב 2 (מיפוי) והצג לי את טבלת האינוונטר לפני שאתה כותב קוד.
```

**להתעקש על השלב הזה.** המיפוי לפני הקוד הוא מה שמונע את רוב הטעויות
היקרות — ראו §2 ו-§11.

---

## תוכן

| שלב | מה | תלוי במטא-דאטה? |
|---|---|---|
| [0](#0) | דרישות מקדימות | — |
| [1](#1) | הארכיטקטורה — מה יושב איפה ולמה | לא |
| [2](#2) | מיפוי הלומדה לפני שכותבים שורת קוד | לא |
| [3](#3) | מוסכמת המזהים — לגזור, לא להניח | **כן** |
| [4](#4) | השכבה המשותפת | חלקית |
| [5](#5) | קונפיגורציה פר-רכיב | **כן** |
| [6](#6) | אינסטרומנטציה של אתרי התשובות והרמזים | **כן** |
| [7](#7) | ניקוד | **כן** |
| [8](#8) | מניעת דיווח כפול | לא |
| [9](#9) | הצינור מסביב — כניסה, query string, קשתות חזרה | לא |
| [10](#10) | אימות | **כן** |
| [11](#11) | קטלוג מלכודות | — |
| [12](#12) | רשימת תיוג לפני מסירה | — |

---

<a name="0"></a>
## 0. דרישות מקדימות

### שתי תכונות עצמאיות

| תכונה | תלויה ב- | ניתנת לבדיקה מחוץ לפלטפורמה? |
|---|---|---|
| **דיווחיות xAPI** | ספריית 720 מה-CDN + `?slxapi` + `metadata/` | לא במלואה |
| **"מצאתם בעיה?"** | `window.METADATA` בלבד | **כן, במלואה** |

הן חולקות תלות אחת — `window.METADATA` — ותו לא. אפשר ולרוב כדאי לבנות את
השנייה קודם: היא נותנת משוב מיידי ומאמתת שהשכבה המשותפת נטענת נכון.

### מה חייב להיות בידיים לפני שמתחילים

1. **`metadata/`** — JSON אחד לכל רכיב + אחד ליחידה. **זהו מקור האמת לכל מזהה
   שהקוד ידווח.** בלעדיו אי אפשר להתחיל את שלב 3 והלאה. אם אין — לעצור ולבקש.
2. **כתובת טופס הדיווח** — ה-`action` של טופס Google עם `/formResponse` בסוף,
   ומפתחות ה-`entry.*` שלו. ראו §9.4 לגבי טופס משותף מול ייעודי.
3. **גישה ל-CDN** — `https://lomdot.education.gov.il/metodica/720active/common/`.
   הספרייה נטענת בזמן ריצה; **שום קובץ ספרייה לא נשמר בריפו.**

### מה לא צריך

- אין צורך ב-build, ב-npm, או ב-framework. הלומדות האלה הן HTML/CSS/JS וניל.
- אין צורך ב-resume. הוא פיצ'ר נפרד וגדול בהרבה; המדריך הזה מניח
  `RESUME_ENABLED = false` ומסביר בדיוק איפה נמצא התפר להוספתו בהמשך.

---

<a name="1"></a>
## 1. הארכיטקטורה

### מה יושב איפה

```
<שורש היחידה>/
  index.html              ← נקודת כניסה, מפנה לרכיב הראשון עם ה-query string
  metadata/               ← מקור האמת למזהים (מסופק, לא נכתב כאן)
  unit-css/
    25-report.css         ← עיצוב מודאל הדיווח, עותק אחד
  unit-js/                ← השכבה המשותפת, עותק אחד לכל הרכיבים
    10-identity.js        ← תחילית המזהים, XAPI_UNIT_ID, shortId, RESUME_ENABLED
    20-xapi.js            ← היקף פריטים, מזהי שאלות, והעוזרים
    25-report.js          ← כל שכבת "מצאתם בעיה?"
    40-ledger.js          ← יומן ה-completed + קשתות חזרה
    50-loader.js          ← טעינת ה-CDN, אימות מזהים, bootXAPI()
    90-boot.js            ← **הקובץ היחיד עם side effects**
  _test/
    verify-report.js      ← מבנה, שער רגרסיה, מודאל, התאמת מזהים
    statement-flow.js     ← הזרימה בפועל
  <רכיב>-01/ … -0N/
    index.html            ← + markup המודאל + תגי ה-script
    script.js             ← + קונפיגורציה + אתרי דיווח
```

### סדר הטעינה בכל `index.html`

```html
<head>
  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="../unit-css/25-report.css?v=1">
</head>
…
</div>                                              <!-- סוגר את #app -->
<script src="../unit-js/10-identity.js?v=1"></script>
<script src="../unit-js/20-xapi.js?v=1"></script>
<script src="../unit-js/25-report.js?v=1"></script>
<script src="../unit-js/40-ledger.js?v=1"></script>
<script src="../unit-js/50-loader.js?v=1"></script>
<script src="script.js"></script>                   <!-- הרכיב: הגדרות בלבד -->
<script src="../unit-js/90-boot.js?v=1"></script>   <!-- ה-side effects היחידים -->
</body>
```

**שתי המוסכמות היחידות שנושאות משקל:**

1. **`script.js` לפני `90-boot.js`.** ה-boot קורא ל-hooks שהרכיב מגדיר.
2. **`90-boot.js` אחרון, ובתג נפרד.** ראו למטה.

בין `10-` ל-`50-` הסדר כמעט שרירותי — כולם definition-only, ופונקציות עולות
(hoisting). המספור קיים כדי שסדר הטעינה יהיה כתוב ליד הקוד ולא רק בתוך N
קבצי HTML נפרדים. הקפיצות של 5 ו-10 משאירות מקום להוסיף קובץ בלי למספר מחדש.

> ### ⚠️ למה `90-boot.js` חייב להיות קובץ נפרד
>
> זו לא אסתטיקה. **זריקה ברמת top-level ב-`script.js` מפילה את כל שאר אותו
> קובץ** — כולל שורות אתחול שנמצאות בסופו. אם קריאות האתחול של הדיווחיות
> יושבות שם, הן פשוט לא ירוצו, **בשקט**.
>
> זה קרה בפועל: `video.play().catch(...)` זרק בסביבה שבה `play()` לא ממומש,
> ומודאל הדיווח לא אותחל כלל בשלושה רכיבים. תג `<script>` נפרד מריץ קונטקסט
> נפרד — זריקה באחד לא נוגעת באחר.

תוכן `90-boot.js` במלואו:

```js
'use strict';
(function boot() {
  try { initLedgerResetHatch(); } catch (e) { console.error('[boot] ledger', e); }
  try { initReportModal(); }     catch (e) { console.error('[boot] report', e); }
  bootXAPI();   // אחרון: טוען מה-CDN, ובעתיד עשוי גם לנווט
})();
```

הסדר: פתח ה-QA של היומן ראשון (הוא עשוי לשנות את ה-URL), המודאל אחריו,
ו-`bootXAPI()` אחרון. שתי הראשונות עטופות בנפרד כדי שכשל באחת לא ימנע את
האחרת.

אין צורך ב-`DOMContentLoaded`: התג יושב מיד לפני `</body>`.

---

<a name="2"></a>
## 2. מיפוי הלומדה — לפני שכותבים שורת קוד

**אל תדלגו על השלב הזה.** רוב הטעויות שעולות ביוקר מקורן בהנחה על מבנה הלומדה
במקום בבדיקה. השלב הזה לוקח שעה ומחזיר אותה כמה פעמים.

### 2.1 אינוונטר בסיסי

```bash
for d in <רכיב>-0*; do
  echo "--- $d"
  grep -n "TOTAL_SCREENS\|^let currentScreen\|^var currentScreen\|^const currentScreen" "$d/script.js" | head -3
  grep -c "data-screen=" "$d/index.html"
done
```

מה לרשום לכל רכיב: מספר מסכים, `TOTAL_SCREENS`, ו**איך `currentScreen` מוצהר**.

> ### ⚠️ `let` / `const` מול `var` — התנגשות היא `SyntaxError` רועש
>
> אם ברכיב כתוב `let currentScreen` וקובץ משותף מצהיר `var currentScreen` —
> **הלומדה לא נטענת בכלל.** בדקו לפני, לא אחרי.
>
> הכיוון ההפוך בטוח: `let` ברמת top-level של classic script נכנס לסביבה
> הלקסיקלית הגלובלית המשותפת, ולכן קובץ משותף **כן** יכול לקרוא אותו — אבל
> רק בזמן call, לא בזמן טעינה (אז הוא עוד ב-TDZ).
>
> המסקנה המעשית: **אל תעבירו את `goTo`/`currentScreen` לשכבה המשותפת** אם הם
> כבר קיימים ברכיבים. הזריקו קריאה אחת לתוך ה-`goTo` הקיים (§5.3).

### 2.2 צורת ה-`goTo` וסדר הפעולות בו

```bash
grep -n -A14 "^function goTo" <רכיב>-01/script.js
```

**לשמר את הסדר הקיים.** בלומדות רבות `resetScreenState(n)` רץ **לפני**
`classList.add('active')` במכוון — זה מה שמונע הבהוב של תמונת הדמות. שינוי
הסדר הוא רגרסיה ויזואלית שלא תיתפס באף בדיקה אוטומטית.

### 2.3 אתרי הבדיקה, הרמזים והיציאות

```bash
# פונקציות בדיקה, לפי המסך שנושא אותן
python - <<'PY'
import io,re
for comp in ['01','02','03','04','05','06']:
    s=io.open('<רכיב>-%s/index.html'%comp,encoding='utf-8').read()
    parts=re.split(r'(<section[^>]*class="[^"]*screen[^"]*"[^>]*>)',s)
    print('=== '+comp)
    for i in range(1,len(parts),2):
        n=re.search(r'data-screen="(\d+)"',parts[i])
        fns=sorted(set(re.findall(r'on(?:click|blur)="([A-Za-z0-9_]+)\(',parts[i+1])))
        chk=[f for f in fns if re.search(r'Check|Submit|Answer',f)]
        hint=[f for f in fns if 'Hint' in f]
        print('  screen %-3s check=%-28s hint=%s' % (n.group(1) if n else '?', ','.join(chk) or '-', ','.join(hint) or '-'))
PY

# ניווט בין רכיבים ונקודות סיום
grep -rn "location.href = '\.\./" <רכיב>-0*/script.js
grep -rn "TODO\|console.log" <רכיב>-0*/script.js | grep -i "סיימתי\|finish"
```

> **שאלות שנשענות על factory לא יופיעו בסריקה הזאת.** אם יש
> `makeDragQuestion(cfg)` או דומה, הכפתור מחווט מתוך הפאבריקה
> (`btn.onclick = …`) ולא ב-`onclick` ב-HTML. חפשו גם:
> `grep -n "makeDragQuestion\|checkBtnId" <רכיב>-0*/script.js`

### 2.4 מה לרשום בסוף השלב

טבלה אחת שתלווה את כל העבודה:

| רכיב | מסכים | פונקציות בדיקה (ומסך) | רמזים | יציאה | נקודת סיום יחידה |
|---|---|---|---|---|---|
| 01 | 20 | `scqCheck`@1 … `s20Check`@19 | 12 | `s20Continue()` | — |
| … | | | | | |

---

<a name="3"></a>
## 3. מוסכמת המזהים — לגזור מהמטא-דאטה, לעולם לא להניח

מזהים הם URL קנוניים. הם חייבים להתאים ל-`metadata/` **בית-לבית**. אי-התאמה של
slash אחד או אות רישית אחת פירושה שכל statement מצביע על object שלא קיים
בקטלוג — וזה **כשל שקט לחלוטין**: הספרייה תשלח בשמחה מזהה שגוי ו-Kata תקבל אותו.

### 3.1 ההיררכיה

| רמה | מבנה |
|---|---|
| יחידה | `<prefix><unit-slug>` |
| רכיב | `<prefix><unit-slug>-0N` |
| פריט | `<component-id><unit-slug>-0N-NNN` |
| שאלה | `<item-id>qN` |

היחידה והרכיבים הם **אחים** שחולקים את התחילית. הרכיבים **אינם** מקוננים תחת
מזהה היחידה.

### 3.2 שתי המוסכמות שחייבים לגזור

```bash
python - <<'PY'
import json,io,glob
u=json.load(io.open(glob.glob('metadata/*_unit.json')[0],encoding='utf-8-sig'))
print('unit id      :', u['id'])
print('trailing "/" :', u['id'].endswith('/'))
c=json.load(io.open(sorted(glob.glob('metadata/*-01.json'))[0],encoding='utf-8-sig'))
print('component id :', c['id'])
print('item id      :', c['subContent'][0]['id'])
print('question id  :', c['subContent'][0].get('questions',[{}])[0].get('questionId','(אין)'))
print()
print('slug         :', u['id'].rstrip('/').split('/')[-1])
print('אותיות קטנות?:', u['id'].rstrip('/').split('/')[-1].islower())
PY
```

> ### ⚠️ שתי המלכודות, שתיהן פגעו בפועל
>
> **1. `trailing slash` אינו אחיד בין יחידות.** תיעוד של יחידה אחת אינו תקף
> לאחרת. יחידת מדעים אחת נושאת אותו ואחרת לא. **לבדוק, לא להסיק.**
>
> **2. ה-slug עוקב אחרי `metadata/`, לא אחרי שם התיקייה.** תיקיות יכולות
> להיקרא `Methodica-...` ב-M רישית בעוד המטא-דאטה אומרת `methodica-...`.
> Kata גוזרת `uniqueKey` מהמקטע האחרון של ה-id — ההבדל משנה.
>
> **3. מזהה היחידה חייב לכלול את ה-slug.** אם הוא נעצר בתחילית (תיקיית
> היחידה), Kata תגזור `uniqueKey = "02"` — מפתח שמתנגש עם כל יחידה 02 בכל
> מקצוע. זה נראה תמים ושובר את הקטלוג.

### 3.3 השער שהופך את זה לבדיקה ולא לתקווה

ב-`50-loader.js`, אחרי שהמטא-דאטה נטענת:

```js
try {
  var _metaId = window.METADATA && window.METADATA.id;
  if (_metaId && typeof XAPI_COMP_ID !== 'undefined' && _metaId !== XAPI_COMP_ID) {
    console.error('[xAPI] ID MISMATCH — הקוד ישלח מזהה שלא קיים בקטלוג.\n' +
      '  metadata/ אומר: ' + _metaId + '\n' +
      '  הקוד שולח:      ' + XAPI_COMP_ID);
  }
} catch (e) {}
```

**אזהרה, לא זריקה** — דיווח שגוי עדיף על לומדה שנופלת.

---

<a name="4"></a>
## 4. השכבה המשותפת

הדרך המהירה: להעתיק את `unit-js/` ו-`unit-css/` מיחידה שכבר עברה את התהליך,
ולשנות את מה שמפורט למטה. אם אין מאיפה להעתיק — הסעיפים הבאים מתארים כל קובץ
במלואו.

### 4.1 `10-identity.js` — הקובץ היחיד שמשתנה בין יחידות

```js
'use strict';
/* התחילית הקנונית. חייבת להתאים ל-metadata/*.json בית-לבית.
   ⚠️ trailing slash ואותיות רישיות — לגזור, לא להניח. ראו §3. */
var XAPI_ID_PREFIX = 'https://lomdot.education.gov.il/metodica/720active/<נושא>/<תת-נושא>/<NN>/';

/* מזהה היחידה = תחילית + slug היחידה. חייב לכלול את ה-slug. */
window.XAPI_UNIT_ID = XAPI_ID_PREFIX + '<unit-slug>';   // + '/' אם המוסכמה נושאת

/* המקטע האחרון של מזהה קנוני — ה-slug הקצר שטופס הדיווח רושם. */
function shortId(u) { return String(u || '').replace(/\/+$/, '').split('/').pop(); }

/* resume מחוץ להיקף. false גם מוביל את הלואדר לטעון xapi-720-i.js.
   ⚠️ אין להפוך ל-true בלי לממש את ה-hooks הפר-רכיביים ולהחליף את
   40-ledger.js ב-40-resume.js המלא. */
var RESUME_ENABLED = false;
```

### 4.2 `20-xapi.js` — היקף פריטים והעוזרים

הקובץ מכיל שני חלקים. הראשון הוא מכונת היקף הפריטים; העתיקו אותו כמות שהוא
פרט לשורה אחת:

```js
/* ⚠️ המקום היחיד שתלוי במוסכמת ה-slash. עם slash: */
function xapiItemId(suffix) { return XAPI_COMP_ID + XAPI_COMP_SLUG + '-' + suffix + '/'; }
/* בלי slash:  return XAPI_COMP_ID + '/' + XAPI_COMP_SLUG + '-' + suffix; */
```

ובהתאם, ההצמדה ב-`xapiQ`: עם slash `itemId + qid`, בלעדיו `itemId + '/' + qid`.

הפונקציות המרכזיות:

| פונקציה | תפקיד |
|---|---|
| `xapiItemId(suffix)` | בניית מזהה פריט |
| `xapiQ(suffix, qKey)` | מחזיר `{questionId, parentId}` — **שולף את מזהה השאלה מ-`window.METADATA`**, לא מהרכבה בקוד |
| `xapiOnScreen(screen)` | זוגות `initialized`/`completed` ברמת הפריט, מונע מ-`goTo` |
| `xapiFinishItems()` | סוגר את הפריט הפתוח — לפני כל `completed` של רכיב |
| `xapiAnswerText(el)` | טקסט התשובה הגלוי; משכפל את האלמנט ומסיר tooltips |
| `XAPI_Q_RESULTS` | מפה `'<item>/<q>' → bool` |

**החלק השני — ארבעת העוזרים.** הם מה שהופך כל אתר דיווח לשורה אחת במקום בלוק
של 8 שורות משוכפל עשרות פעמים:

```js
/* ⚠️ הכתיבה ל-XAPI_Q_RESULTS לפני ה-try/catch ומחוצה לו. כך "כשל דיווח לא
   מקלקל ניקוד" נאכף במקום אחד, ולא תלוי בכך שכל אתר קריאה יזכור. */
function xapiAnswered(item, qKey, correct, isLast, answer) {
  XAPI_Q_RESULTS[item + '/' + qKey] = !!correct;
  if (!window.XAPI_USING_G || typeof sendStatement720 !== 'function') return;
  try {
    sendStatement720(isLast ? 'answered.last' : 'answered', 'question',
      { success: !!correct, score: { scaled: correct ? 1 : 0 },
        extensions: { student_answer: [answer == null ? '' : String(answer)] } },
      xapiQ(item, qKey));
  } catch (e) { console.error('[xAPI] answered ' + item + '/' + qKey, e); }
}

function xapiRequestedHint(item, qKey) {
  if (!window.XAPI_USING_G || typeof sendStatement720 !== 'function') return;
  try { sendStatement720('requested.1', 'question', null, xapiQ(item, qKey)); } catch (e) {}
}

function xapiCompleteComponent(result) {
  try { xapiFinishItems(); } catch (e) {}
  try { sendCompletedOnce('done', currentPartSlug(), 'onlinelesson', result || null); }
  catch (e) { console.error('[xAPI] completed component', e); }
}

function xapiCompleteUnit(result) {
  try {
    sendCompletedOnce('done', 'unit', 'onlinelesson', result || null,
      { objectId: window.XAPI_UNIT_ID });
  } catch (e) { console.error('[xAPI] completed unit', e); }
}
```

**שלושה בוני טקסט-תשובה** לשאלות שאינן בחירה בודדת. אלה גנריים — אותה תבנית
markup חוזרת בלומדות רבות:

```js
/* לוח גרירה: 'ton: קטר | kg: צב ענק' */
function xapiZoneAnswer(prefix, zoneIds) { … }
/* קבוצת שדות/נפתחים: 's18-input-1=1400 | s18-input-2=900' */
function xapiFieldsAnswer(ids, values) { … }
/* בחירה מרובה: התוויות של האפשרויות שנבחרו */
function xapiMultiAnswer(ids, optElFn) { … }
```

### 4.3 `40-ledger.js` — יומן ה-`completed`

ראו §8 להסבר מלא. הליבה:

```js
var LEDGER_STORAGE_KEY = 'lomda_completed_ledger::<unit-slug>';
var _restoring = false;   // תמיד false בלי resume; resume עתידי ידליק

function currentPartSlug() {
  var p = window.location.pathname.replace(/\/index\.html.*$/, '').replace(/\/+$/, '');
  return p.split('/').pop() || '';
}
function itemLedgerKey(item) { return currentPartSlug() + '#' + item; }

function sendCompletedOnce(ledger, key, objectType, result, opts) {
  if (_restoring) return;
  if (alreadySent(ledger, key)) return;
  sendStatement720('completed', objectType, result || null, opts);
  markSent(ledger, key);
}
```

`alreadySent` / `markSent` קוראים וכותבים ל-`sessionStorage` בעטיפת `try/catch`,
ו**נכשלים פתוח**: אם האחסון לא זמין — שולחים.

### 4.4 `50-loader.js` — טעינת ה-CDN

```js
function bootXAPI() {
  var CDN = 'https://lomdot.education.gov.il/metodica/720active/common/';

  /* שער 1: בלי התפר הפר-רכיבי, getXAPIParameters מקבל undefined ו-
     jsXAPI_MetadataReady לעולם לא נדלק — לופ טיימרים אין-סופי בלי שגיאה. */
  if (typeof XAPI_METADATA_FILE === 'undefined' || !XAPI_METADATA_FILE) {
    console.warn('[xAPI] XAPI_METADATA_FILE לא מוגדר — הדיווחיות כבויה.');
    return;
  }

  /* שער 2: פולינג חסום בזמן. מקור נפוץ מפולל לנצח; קובץ מטא-דאטה חסר
     או 404 הוא תרחיש דפלוימנט אמיתי. */
  var METADATA_POLL_MAX = 50;   // ×200ms = 10 שניות

  /* ⚠️ window.XAPI_USING_G — ה-regex חייב למנות כל אות ספרייה שתומכת
     בסטייטמנטים ברמת פריט. אם ה-CDN יעבור לאות חדשה ולא נרחיב כאן,
     דיווח הפריטים והווידאו משתתק בלי שום שגיאה. */
  var LIB720 = CDN + (RESUME_ENABLED ? 'xapi-720-j.js' : 'xapi-720-i.js');
  window.XAPI_USING_G = /xapi-720-[ghij]\.js/.test(LIB720);
  …
}
```

אחרי שהמטא-דאטה מוכנה: `changeConfig` → **שער אימות המזהים (§3.3)** →
`initialized` של הרכיב → `xapiWireVideos()` → `xapiOnScreen(currentScreen)` →
`onXapiReady()` אם הוגדר.

> **`xapiOnScreen(currentScreen)` כאן אינו מיותר.** ברוב הלומדות מסך הפתיחה
> **לא עובר דרך `goTo`** — ה-`.active` מקובע ב-HTML ובלוק האתחול קורא
> ל-`resetScreenState(0)` ישירות. זו הקריאה היחידה שפותחת את הפריט הראשון.

### 4.5 `25-report.js` + `25-report.css`

ראו §9.4. שני דברים שכמעט תמיד צריך להתאים:

**1. חיווט כפתור הדגל ב-delegation.** בדקו כמה מופעים יש:

```bash
for d in <רכיב>-0*; do printf "%s: %s\n" "$d" "$(grep -c 'class="flag-btn"' $d/index.html)"; done
```

אם יש יותר מאחד לרכיב (נפוץ — כפתור לכל מסך), `onclick` בודד או
`getElementById` יחווט אחד בשקט וישאיר את השאר מתים:

```js
document.addEventListener('click', function (e) {
  if (e.target.closest && e.target.closest('.flag-btn')) {
    e.preventDefault();
    openReportModal();
  }
});
```

**2. `transition` גלובלי.** בדקו:

```bash
grep -rn "transition: *none *!important" <רכיב>-0*/styles.css
```

אם קיים `* { transition: none !important; }` — הצהרות ה-transition ב-CSS
המועתק מתות ממילא. **להסיר אותן ולא להילחם עם `!important`**; זו החלטת עיצוב
מכוונת של הפרויקט.

---

<a name="5"></a>
## 5. קונפיגורציה פר-רכיב

בתחתית כל `script.js`, **נתונים בלבד**:

```js
/* מסך -> [סיומת פריט, עמוד-בפריט]; null = אין פריט בקטלוג */
var SCREEN_TO_SUBCONTENT = {
  0: null,            // מסך מעבר
  1: ['001', 1],
  2: ['002', 1],      // מסך הקנייה
  3: ['002', 2],      // מסך השאלה — אותו פריט
  …
};

var XAPI_COMP_SLUG = '<unit-slug>-0N';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';   // או בלי '/'
var XAPI_EVAL_ITEMS = { '001': 1, '002': 1, … };
var XAPI_METADATA_FILE = '../metadata/<unit-slug>-0N.json';
```

### 5.1 איך בונים את `SCREEN_TO_SUBCONTENT`

**המיפוי נעשה בהצלבה, לא בניחוש.** שלושה מקורות:

1. כותרת/שאלה של כל מסך ב-`index.html`
2. `title` ו-`questionText` של כל פריט ב-`metadata/`
3. איזה מסך נושא איזו פונקציית בדיקה (מ-§2.3)

```bash
# טקסט מייצג לכל מסך
python - <<'PY'
import io,re
s=io.open('<רכיב>-01/index.html',encoding='utf-8').read()
parts=re.split(r'(<section[^>]*class="[^"]*screen[^"]*"[^>]*>)',s)
for i in range(1,len(parts),2):
    n=re.search(r'data-screen="(\d+)"',parts[i])
    t=[x.strip() for x in re.findall(r'>([^<>]{8,110})<',parts[i+1][:9000]) if x.strip()]
    print('s%-3s %s' % (n.group(1) if n else '?', ' | '.join(t[:3])[:150]))
PY

# פריטים ושאלות מהמטא-דאטה
python - <<'PY'
import json,io
d=json.load(io.open('metadata/<unit-slug>-01.json',encoding='utf-8-sig'))
for sc in d['subContent']:
    suf=sc['id'].rstrip('/').split('-')[-1]
    print('[%s] %s' % (suf, sc.get('title','')))
    for q in sc.get('questions',[]):
        print('     %s  %s' % (q['questionId'].split('/')[-1], str(q.get('questionText',''))[:80]))
PY
```

### 5.2 שלושה כללי מיפוי

**א. פריט אחד יכול לפרוש על כמה מסכים.** מסך הקנייה/חשיפה ואחריו מסך השאלה
שייכים לרוב לאותו פריט. **זו הצמדה רצויה**: היא משאירה את הפריט פתוח, כך
שה-`completed` היחיד שלו נושא את התוצאה המלאה במקום לנעול ניקוד חלקי ברגע
שהלומד דרך על מסך נרטיבי.

**ב. מסכי סיום עדיף למפות ל-`null`.** כך הפריט נסגר בכניסה אליהם ולא תלוי בכך
שהלומד ילחץ על כפתור הסיום.

**ג. `XAPI_EVAL_ITEMS` = מדורג **בקוד**, לא במטא-דאטה.** פריט שיש לו שאלה
במטא-דאטה אבל אין לו פונקציית בדיקה (משחק זיכרון, מסך חשיפה) — **מחוץ** לרשימה,
ולא מדווח `answered`. זהו פער אמיתי שיש **לדווח** (§11), לא לטשטש.

### 5.3 הזרקת `xapiOnScreen` ל-`goTo` הקיים

```js
function goTo(n) {
  …
  resetScreenState(n);
  target.classList.add('active');
  /* xAPI: מוצב אחרון — אחרי ה-.active כדי שקריאת רשת לא תעכב את ה-paint,
     ואחרי currentScreen = n שממנו submitReport והיומן קוראים.
     עטוף ב-try/catch: דיווח לעולם לא יעצור ניווט. */
  try { xapiOnScreen(n); } catch (e) {}
}
```

**אין להחליף את `goTo` בגרסה משותפת** אם הרכיבים כבר מגדירים אותו — ראו
האזהרה ב-§2.1 וב-§2.2.

---

<a name="6"></a>
## 6. אינסטרומנטציה

### 6.1 הכלל המרכזי: הזרקה אחת לפונקציה

**לא** שלוש הזרקות לשלושת הענפים (נכון / שגוי-ראשון / שגוי-סופי), אלא **אחת**,
מיד אחרי שהנכונות מחושבת:

```js
function scqCheck() {
  if (!scqSelected || scqDone) return;
  scqAttempts++;
  const optEl = scqOptEl(scqSelected);
  xapiAnswered('001', 'q1',
    scqSelected === SCQ.correctId,                                    // correct
    scqSelected === SCQ.correctId || scqAttempts >= SCQ.maxAttempts,  // isLast
    xapiAnswerText(optEl));
  if (scqSelected === SCQ.correctId) { … }
}
```

פחות עריכות, עוגן אחד לכל פונקציה, וההחלטה בין `answered` ל-`answered.last`
יושבת בביטוי אחד במקום להתפזר על שלושה ענפים.

### 6.2 שלושת כללי המיקום

| סוג שאלה | להזריק | למה |
|---|---|---|
| בחירה בודדת / מרובה | אחרי `const optEl = …` או אחרי בלוק `const isCorrect = …` | שם הנכונות כבר ידועה |
| **לוח גרירה** | **אחרי לופ האזורים** | `allCorrect` סופי רק בסוף הלופ |
| שדות / נפתחים | אחרי `const allCorrect = …every(…)` | אותה סיבה |
| **רמז** | **אחרי כל ה-guards, מיד לפני החשיפה** | אחרת מדווחים בקשה שלא קרתה |

> ### ⚠️ שתי טעויות שקרו בפועל ועברו `node --check`
>
> **1. הזרקה לתוך לופ הגרירה.** אם ההזרקה נכנסת לפני
> `if (!zoneOk) allCorrect = false;` היא יורה **פעם לכל אזור**, עם `allCorrect`
> שעדיין לא סופי. הקוד מתקמפל ורץ; הדיווח שגוי.
>
> **2. הזרקת רמז מעל ה-guard.** `function xOpenHint() { if (xDone) return; … }` —
> הזרקה מעל ה-`return` מדווחת בקשת רמז גם כשהרמז לא נפתח.

### 6.3 עוגן ההזרקה חייב להיות ייחודי

```bash
grep -c "const checkBtn = document.getElementById('s5-check');" <רכיב>-01/script.js
```

אם התוצאה גדולה מ-1 — לרוב מפני שאותה שורה מופיעה גם ב-`resetScreenStateN()` —
**העוגן פסול.** הרחיבו אותו כך שיכלול הקשר ייחודי, למשל את זנב הלופ שלפניו:

```
    if (!zoneOk) allCorrect = false;
  });

  const checkBtn = document.getElementById('s5-check');
```

בסקריפט הזרקה, **תמיד לאמת ייחודיות לפני כתיבה**:

```python
assert s.count(anchor) == 1, ('anchor not unique', s.count(anchor), anchor[:70])
```

זה מה שעוצר הזרקה שקטה למקום הלא נכון.

### 6.4 רמזים: toggle או פתיחה בלבד?

```bash
grep -n -A4 "function .*OpenHint" <רכיב>-01/script.js | grep "hidden = "
```

- `hidden = false` → **בטוח**, `xapiRequestedHint` בתוכו לא ידווח פעמיים.
- `hidden = !hidden` → **toggle**. חייבים להזריק בענף "נפתח כרגע" בלבד, אחרת
  כל סגירה תדווח בקשה נוספת.

### 6.5 שאלה אחת בקוד שהיא כמה שאלות במטא-דאטה

שני מקרים הפוכים, ולשניהם פתרון שונה:

**המטא-דאטה מפרקת והקוד יודע להפריד** — למשל 4 סעיפי נכון/לא-נכון על מסך אחד,
כשהקוד מחזיק את נכונות כל שורה. **לדווח כל אחת בנפרד**:

```js
['r1','r2','r3','r4'].forEach(function (r, i) {
  xapiAnswered('004', 'q' + (i + 1),
    sq5Selected[r] === TF_SQ5_CORRECT[r],
    allCorrect || sq5Attempts >= TF_SQ5.maxAttempts,
    String(sq5Selected[r]));
});
```

**המטא-דאטה מפרקת והקוד בודק הכל-או-כלום** — למשל שאלת גרירה אחת שמכסה שתי
שאלות. **לדווח את שתיהן עם אותה תוצאה**, ולתעד: פיצול לגרנולריות שה-UI לא
מספק הוא המצאת נתון.

### 6.6 שאלות שנבנות ב-factory

מזריקים **לפאבריקה פעם אחת**, ומעבירים את מה שכל מופע מדווח דרך ה-`cfg`:

```js
// בתוך check() של הפאבריקה, אחרי שה-allCorrect סופי:
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

// ובכל מופע:
makeDragQuestion({ …, xapiItem: '001', xapiQuestions: ['q1'] });
```

> **חשיפת `onContinue` לצורך בדיקה.** אם הפאבריקה מחזירה `{ reset: reset }`
> בלבד, ה-`onContinue` — שנושא את ה-`completed` של הרכיב — מגיע רק דרך
> `btn.onclick` אחרי בדיקה מוצלחת, כלומר **בלתי בדיק**. להוסיף:
> `return { reset: reset, onContinue: cfg.onContinue };`
> תוספת בלבד; אף קורא לא נשען על צורת המבנה המוחזר.

---

<a name="7"></a>
## 7. ניקוד

### 7.1 שלושת הכללים

**א. תמיד לספק `result` מפורש ב-`completed`.** הצבירה של הספרייה היא AND של
"כל התשובות נכונות", ולכן תדווח `success:false` על כל מעבר חלקי.

**ב. המכנה הוא מה שהלומד הובטח, לא מספר השאלות בקטלוג.** אם המסך אומר
"4 מתוך 5" — המכנה 5, גם אם במטא-דאטה 11 שאלות.

**ג. המכנה סופר תרגילים, לא רשומות שאלה.** אם תרגיל אחד נושא 4 תת-שאלות,
`XAPI_Q_RESULTS` יחזיק 4 רשומות אבל התרגיל נספר כאחד. ספירה עיוורת של רשומות
תיתן ציון גדול מ-1.

### 7.2 כמה ספים

כשהמסך מצהיר יותר מסף אחד, **`success` דורש את כולם**:

```js
success: getBasicScore() >= 4 && getAdvancedScore() >= 2,
score:   { scaled: (getBasicScore() + getAdvancedScore()) / 7 }
```

### 7.3 לדווח `completed` גם במסלולי כשל

**זו הטעות היקרה ביותר בסעיף הזה.** רכיב שהלומד לא צלח חייב להיות מדווח, אחרת
**כל הניסיון שלו לא נרשם**. ניתוב לומד שנכשל הוא תפקיד הפלטפורמה, דרך
`recommendedAfterFail` של הרכיב.

בפרט: אם היציאה מהרכיב מסתעפת, **לדווח לפני ההסתעפות**:

```js
onContinue: function () {
  xapiCompleteComponent({ success: passed, score: { scaled: n / 2 } });  // בשני המסלולים
  if (passed) { goTo(4); } else { window.location.href = '…-06/index.html' + window.location.search; }
}
```

### 7.4 רכיב בלי שאלות

משימת כיתה מחוץ למחשב, מסך מעבר וכדומה:

```js
xapiCompleteComponent({ success: true });   // בלי score — אין מה לדרג
```

---

<a name="8"></a>
## 8. מניעת דיווח כפול

### 8.1 הבעיה

הספרייה מרשה `completed` אחד לכל object **לכל טעינת עמוד**. זה לא מספיק ברגע
שיש כפתורי "חזרה" בין רכיבים — כל חזרה היא טעינת עמוד חדשה, ולומד שחוזר וממשיך
קדימה שוב יפלוט `completed` שני.

### 8.2 הפתרון בהיקף הזה: יומן ב-`sessionStorage`

```js
function alreadySent(ledger, key) { … }   // קורא מ-sessionStorage
function markSent(ledger, key)   { … }   // כותב, סינכרונית
```

**שתי אינווריאנטות שאסור לשבור:**

1. **נכשל פתוח, לעולם לא סגור.** היומן נשמע רק כשהוא אומר במפורש "כבר נשלח".
   אם האחסון לא זמין — שולחים. כל אתר קריאה יושב בתוך `try/catch` שמחניק,
   ושם drop שקט גרוע בהרבה מכפילות.
2. **`initialized` לא מדוכא, אף פעם.** הפלטפורמה מבקשת אותו בכל כניסה. התוצאה
   המקובלת היא `initialized` ברמת פריט בלי `completed` תואם כשלומד נכנס מחדש
   לרכיב שסיים.

### 8.3 הפער המודע

`sessionStorage` שורד ניווט בין רכיבים באותה לשונית — **המקרה שצריך לכסות** —
אבל לא סגירת לשונית. לומד שחוזר בשיגור חדש עשוי לשלוח `completed` נוסף. לסגירה
מלאה נדרש ה-State API, כלומר resume.

**תעדו את זה במפורש** כדי שלא ייקרא כפספוס.

### 8.4 פתח QA

מחוץ לפלטפורמה אין `?registration`, וה-slug זהה בכל הרצה מקומית — כלומר אחרי
מעבר אחד היומן מלא ואף `completed` לא נשלח שוב, מה שנקרא כרגרסיה קטסטרופלית
למי שבודק אחר כך.

```js
function initLedgerResetHatch() {
  if (!/[?&]resetLedger(=|&|$)/.test(window.location.search)) return;
  try { window.sessionStorage.removeItem(LEDGER_STORAGE_KEY); } catch (e) {}
  /* ⚠️ להסיר את עצמו מה-URL: כל ניווט בין רכיבים מעתיק את
     window.location.search מילה במילה, ולכן אם יישאר הוא יאפס בכל מעבר. */
  try {
    var q = window.location.search.replace(/([?&])resetLedger(=[^&]*)?(&|$)/, '$1').replace(/[?&]$/, '');
    history.replaceState(null, '', window.location.pathname + q + window.location.hash);
  } catch (e) {}
}
```

---

<a name="9"></a>
## 9. הצינור מסביב

### 9.1 `index.html` בשורש

```html
<script>
  function toFirstComponent(){
    window.location.replace('./<unit-slug>-01/index.html' + window.location.search);
  }
  toFirstComponent();
</script>
```

הפלטפורמה משגרת לשורש עם `?slxapi` ו-`?registration`. בלי ההפניה הזאת אין
נקודת כניסה שמעבירה אותם פנימה.

### 9.2 `window.location.search` בכל קפיצה — בלי יוצא מן הכלל

```bash
grep -rn "location.href = '\.\./" <רכיב>-0*/script.js | grep -v "window.location.search"
```

התוצאה חייבת להיות ריקה. **קפיצה אחת שנשכחה מאבדת את הגדרת ה-LRS מאותה נקודה
והלאה, וכל הרכיבים אחריה מדווחים כלום — בשקט.**

```js
// בלי hash
window.location.href = '../<slug>-0N/index.html' + window.location.search;
// עם hash — הסדר קריטי: query לפני hash
window.location.href = '../<slug>-0N/index.html' + window.location.search + '#screen=19';
```

### 9.3 קשתות חזרה — רק אם יש ניתוב מותנה

אם רכיב אחד ניתן להגעה **מיותר ממקום אחד** (למשל בגלל דילוג מותנה), כפתור
"חזרה" מקובע ישלח חלק מהלומדים לתוכן שלא ראו.

**הפתרון הוא מפת קשתות, לא מחסנית**: ניווט קדימה כותב `edges[dest]`, ניווט
אחורה רק קורא. אין אינווריאנטה שכתיבה חלקית יכולה לשבור.

```js
function recordForwardEdge(destSlug, returnHash) { … }   // לפני כל ניווט קדימה
function previousPartHref(fallbackSlug, fallbackHash) { … }   // מחזיר URL
function goBackToPreviousPart(f, h) { window.location.href = previousPartHref(f, h); }
```

**ה-fallback הוא ההתנהגות שהייתה קודם**, כך שאחסון חסום מחזיר את הכפתור למצבו
הישן ולא שובר אותו.

> **הפרדת ההחלטה מהאפקט.** `previousPartHref` מחזיר URL ו-`goBackToPreviousPart`
> מנווט. זה לא סגנון — `location.href` אינו ניתן ל-stub ב-jsdom, ובלי ההפרדה
> הכלל שקובע לאן חוזרים **לא ניתן לבדיקה בכלל**. אותו שיקול חל על כלל ניתוב
> מותנה: להוציא אותו לפונקציה שמחזירה slug.

### 9.4 טופס הדיווח

**לברר אם הטופס ייעודי ליחידה או משותף לכל היחידות.** שתי התצורות תקינות, אבל
המשמעות שונה:

| | ייעודי | משותף |
|---|---|---|
| הגיליון | רק היחידה הזאת | כל היחידות יחד — סינון לפי עמודת slug היחידה הוא חלק מהתהליך |
| שינוי `REPORT_FIELDS` | משפיע על יחידה אחת | **שובר את כל היחידות** |
| slug ריק (מטא-דאטה לא נטענה) | שורה בלי הקשר | **שורה שלא ניתן לשייך לאף יחידה** |

> ### ⚠️ כתובת מושאלת בשוגג
>
> אם משאילים כתובת **בלי כוונה**, הדיווחים של היחידה הזאת נוחתים בגיליון של
> יחידה אחרת ו**שום דבר ב-UI או בקונסול לא מספר על כך**. זה קרה בפועל בין
> שתי יחידות 720.
>
> מה שהופך שיתוף מכוון לתקין הוא ששדות ה-slug נשלחים בכל שליחה, מ-
> `window.METADATA` ולא מקובעים בקוד. **לאמת שהם מאוכלסים** — ראו §10.

עד שהכתובת ידועה, `REPORT_FORM_ACTION = null` עם שגיאה רועשת עדיף על כתובת
מושאלת: `null` נכשל ברעש, כתובת שגויה נכשלת בשקט.

---

<a name="10"></a>
## 10. אימות

### 10.1 שתי חבילות, שני דברים שונים

| חבילה | מוכיחה |
|---|---|
| `verify-report.js` | **מבנה** — שער הרגרסיה, המודאל, התאמת מזהים, כיסוי מטא-דאטה, `?v=` |
| `statement-flow.js` | **התנהגות** — אילו statements באמת יוצאים, עם אילו מזהים וציונים |

הראשונה מוכיחה שהקוד מחובר נכון; השנייה שהוא **מדווח** נכון. שתיהן נחוצות.

### 10.2 שער הרגרסיה — הבדיקה החשובה ביותר

בלי `?slxapi` הספרייה לא נטענת, `sendStatement720` לא קיים, וכל מסלול דיווח הוא
no-op שקט. **הלומדה חייבת להתנהג בדיוק כמו לפני ההטמעה.**

שימו לב מה בדיוק מובטח: `XAPI_USING_G` **כן** יהיה `true` (הוא רק מציין שאות
הספרייה תומכת בסטייטמנטים ברמת פריט). ההבטחה היא שאף statement לא יכול לזרום,
כי כל מסלול שליחה מגודר גם ב-`typeof sendStatement720 === 'function'`.

### 10.3 הרצה

jsdom, **מותקן מחוץ לתיקיית הפרויקט**:

```bash
mkdir -p /tmp/lomda-test && cd /tmp/lomda-test && npm install jsdom
cd <שורש היחידה>
NODE_PATH=/tmp/lomda-test/node_modules node _test/verify-report.js
NODE_PATH=/tmp/lomda-test/node_modules node _test/statement-flow.js
```

> ⚠️ אם תיקיית הפרויקט מסונכרנת (OneDrive/Drive), התקנה מקומית תסנכרן ~26MB
> לחינם. להוסיף `node_modules/` ל-`.gitignore` בכל מקרה.
>
> ⚠️ בתיקייה בלי `package.json`, `npm install X --no-save` עלול **להסיר**
> חבילה שהותקנה קודם. להתקין הכל בפקודה אחת.

### 10.4 שלוש מלכודות בכתיבת ההרנס

**1. אסור להריץ את קבצי הלומדה ב-`eval`.** כולם מתחילים ב-`'use strict'`,
והצהרות בתוך eval במצב strict **נשארות בתחום ה-eval** ולא הופכות לגלובליות.
להזריק תגי `<script>` אמיתיים:

```js
const exec = (code) => {
  const s = w.document.createElement('script');
  s.textContent = code; w.document.body.appendChild(s); s.remove();
};
```

**2. `let`/`const` ברמת קובץ לא מגיעים ל-`window`.** לקריאת `currentScreen`,
`TOTAL_SCREENS` או פונקציות ניתוב — להזריק ביטוי ולהחזיר את הערך:

```js
const val = (expr) => {
  exec('window.__V = (function(){ try { return (' + expr + '); } catch (e) { return "__THREW__" + e.message; } })();');
  return w.__V;
};
```

**3. jsdom לא מממש `HTMLMediaElement`.** `play()` מחזיר `undefined`, ולכן
`video.play().catch(…)` זורק. זה פער של jsdom ולא באג בלומדה:

```js
w.HTMLMediaElement.prototype.load = function () {};
w.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
```

### 10.5 מה לאמת סטטית מול המטא-דאטה

כל אלה זולים ותופסים מחלקת שגיאות שלמה:

- מזהה היחידה, כל הרכיבים, כל הפריטים וכל השאלות — **בית-לבית**
- `SCREEN_TO_SUBCONTENT` בגודל `TOTAL_SCREENS` בדיוק, מפתחות `0..N-1` ללא חורים
- **כיסוי דו-כיווני**: אין פריט ממופה שלא קיים במטא-דאטה, ואין פריט בקטלוג
  שאף מסך לא מצביע אליו
- `XAPI_EVAL_ITEMS` ⊆ פריטי המטא-דאטה
- `?v=` זהה בכל ה-`index.html` לכל קובץ משותף

### 10.6 סריקת התנגשות מזהים

```bash
node -e "
const fs=require('fs');const shared=new Map();
fs.readdirSync('unit-js').filter(f=>f.endsWith('.js')).forEach(f=>{
  fs.readFileSync('unit-js/'+f,'utf8').split('\n').forEach(l=>{
    const m=l.match(/^(?:function|var|let|const)\s+([A-Za-z0-9_\$]+)/); if(m) shared.set(m[1],f); }); });
['01','02','03','04','05','06'].forEach(p=>{
  const hits=[];
  fs.readFileSync('<slug>-'+p+'/script.js','utf8').split('\n').forEach((l,i)=>{
    const m=l.match(/^(?:function|var|let|const)\s+([A-Za-z0-9_\$]+)/);
    if(m&&shared.has(m[1])) hits.push(m[1]+'@'+(i+1)); });
  console.log(p+': '+(hits.length?hits.join(', '):'clean')); });
"
```

`var`/`function` מתנגש = דריסה שקטה, האחרון מנצח — ו-`script.js` נטען **אחרי**
המשותפים, כלומר עותק ישן שנשאר ברכיב מנצח וההעתקה נראית מוצלחת בזמן שנשלח קוד ישן.

### 10.7 בדיקת מוטציה — לוודא שלבדיקה יש שיניים

אחרי שמתקנים באג ומוסיפים בדיקה, **לוודא שהיא נכשלת בלי התיקון**. להריץ את
אותה בדיקה על גרסה שבה התיקון מוסר (למשל בהסרת הבלוק מטקסט הקובץ בזיכרון).
בדיקה שעוברת בשני המצבים אינה בדיקה.

### 10.8 אימות טופס הדיווח מקצה לקצה

מ-Node **אין** מגבלת `no-cors`, ולכן ניתן לקרוא את קוד ה-HTTP האמיתי — דבר
שהדפדפן לא יכול. סקריפט שליחה צריך:

- **לשלוף את הכתובת ואת מפתחות ה-`entry.*` מתוך `25-report.js` עצמו**, לא
  להעתיק אותם — כך נבדקת הקונפיגורציה שנשלחת בפועל
- לקחת את ה-slug-ים מקבצי המטא-דאטה האמיתיים
- להריץ `--dry` קודם ולהדפיס את הגוף
- לסמן את הטקסט החופשי בבירור כבדיקה למחיקה, עם חותמת זמן ייחודית

**מה שזה מוכיח:** הכתובת חיה ומקבלת את המבנה. **מה שזה לא מוכיח:** שהשורות
נחתו בגיליון — לזה נדרשת פתיחה ידנית של הגיליון.

---

<a name="11"></a>
## 11. קטלוג מלכודות

לפי שכיחות × עלות.

| # | תסמין | סיבה | מניעה |
|---|---|---|---|
| 1 | הכל נראה תקין, Kata ריקה | `window.location.search` נשכח בקפיצה אחת | §9.2, grep |
| 2 | statements מצביעים על object שלא קיים | slash או אות רישית ב-`XAPI_ID_PREFIX` | §3, שער האימות |
| 3 | הלומדה לא נטענת בכלל | `var currentScreen` משותף מול `let` ברכיב | §2.1 |
| 4 | דיווחיות ומודאל לא אותחלו, בשקט | קריאות האתחול בסוף `script.js`, וזריקה קודמת הפילה אותו | §1, `90-boot.js` נפרד |
| 5 | `completed` כפול | אין יומן; חזרה בין רכיבים = טעינת עמוד חדשה | §8 |
| 6 | ניסיון של לומד שנכשל לא נרשם | `completed` רק במסלול ההצלחה | §7.3 |
| 7 | ציון גדול מ-1 | ספירת רשומות שאלה במקום תרגילים | §7.1ג |
| 8 | `answered` יורה 3 פעמים | הזרקה בתוך לופ האזורים | §6.2 |
| 9 | `requested` על רמז שלא נפתח | הזרקה מעל ה-guard | §6.2 |
| 10 | הזרקה נחתה בפונקציה הלא נכונה | עוגן לא ייחודי (`resetScreenStateN`) | §6.3 |
| 11 | לופ טיימרים אין-סופי | פולינג מטא-דאטה בלי תקרה, קובץ 404 | §4.4 |
| 12 | דיווח פריט וּוידאו משתתקים | `XAPI_USING_G` regex לא כולל את אות הספרייה החדשה | §4.4 |
| 13 | כפתור דגל עובד רק במסך אחד | `onclick` בודד מול מופע לכל מסך | §4.5 |
| 14 | אנימציות במודאל לא עובדות | `* { transition: none !important }` גלובלי | §4.5 |
| 15 | הבהוב תמונת הדמות | שינוי הסדר `resetScreenState` → `.active` | §2.2 |
| 16 | "חזרה" שולחת לתוכן שלא נראה | ניתוב מותנה בלי קשתות חזרה | §9.3 |
| 17 | דיווחים בגיליון של יחידה אחרת | כתובת מושאלת בשוגג | §9.4 |
| 18 | ההרנס מדווח שהכל undefined | `eval` על קבצי `'use strict'` | §10.4 |
| 19 | QA: "אף `completed` לא נשלח!" | היומן מלא מהרצה קודמת | §8.4, `?resetLedger` |

### שלוש טעויות ברמת התהליך, לא ברמת הקוד

**א. להסיק מוסכמת מזהים מתיעוד של יחידה אחרת.** תיעוד של יחידה אחת אינו תקף
לאחרת. **לגזור מהמטא-דאטה בכל פעם מחדש.**

**ב. לדווח משהו כבאג בלי לקרוא את ההערה שמעליו.** לוגיקת מעבר שנראית חסרה
מתבררת לא פעם כמכוונת ומתועדת, כשהיא משחזרת התנהגות של לומדת מקור. **לקרוא
את ההערות בקוד לפני שקוראים למשהו באג.**

**ג. `node --check` אינו אימות.** שלוש הטעויות היקרות ביותר עברו קומפילציה
בשלמות. **לקרוא את הקוד שהוזרק**, לא רק לוודא שהוא מתפרסר.

---

<a name="12"></a>
## 12. רשימת תיוג לפני מסירה

### מכני

- [ ] `node --check` על כל `script.js` וכל `unit-js/*.js`
- [ ] סריקת התנגשות מזהים — נקייה (§10.6)
- [ ] `?v=` זהה בכל ה-`index.html` לכל קובץ משותף
- [ ] `SCREEN_TO_SUBCONTENT` בגודל `TOTAL_SCREENS` בכל רכיב
- [ ] אין קפיצה בין רכיבים בלי `window.location.search` (§9.2)
- [ ] כל המזהים תואמים ל-`metadata/` בית-לבית
- [ ] כיסוי דו-כיווני מול המטא-דאטה, והפערים **מדווחים** ולא מוסתרים

### התנהגותי

- [ ] **שער רגרסיה**: בלי `?slxapi` הלומדה מתנהגת בדיוק כמו קודם, בכל רכיב
- [ ] `initialized` בכניסה לפריט; דפדוף **בתוך** פריט לא משדר כלום
- [ ] `answered` עם טקסט התשובה העברי האמיתי ו-`parentId` שמצביע על הפריט
- [ ] `requested` רק בפתיחת רמז
- [ ] כל סף ניקוד נבדק בשני צדדיו — מעל ומתחת
- [ ] `completed` של רכיב נשלח **גם** במסלולי כשל
- [ ] `completed` של יחידה נשלח פעם אחת, מכל נקודת סיום
- [ ] מסלול מלא + "חזרה" + קדימה שוב → אין `completed` כפול

### דיווח בעיה

- [ ] דיווח מכל רכיב מגיע לגיליון **הנכון**
- [ ] slug יחידה זהה בכולם; slug רכיב שונה בין רכיב לרכיב
- [ ] מזהה פריט ועמוד תואמים למסך, כולל ממסך לא-ממופה (מספר מסך גלמי)
- [ ] סוג הבעיה מגיע כתווית עברית, לא כמפתח פנימי
- [ ] עובד בלי `?slxapi`
- [ ] כשל רשת מאולץ סוגר את המודאל ולא עוצר את הלומד

### לפני שחרור

- [ ] **הרצה מול Kata אמיתי** עם `?slxapi` + `?registration`. stubs מוכיחים
      צורת payload, **לא הגעה**. זה הפריט האחרון ואין לו תחליף.
- [ ] אימות חזותי של המודאל בדפדפן אמיתי
- [ ] מחיקת שורות הבדיקה מגיליון הדיווחים
- [ ] `_test/` ו-`node_modules/` **לא** בחבילת השחרור

---

## נספח: סדר עבודה מומלץ

1. **מיפוי** (§2) — בלי לכתוב קוד. מסתיים בטבלת האינוונטר.
2. **תשתית ללא מטא-דאטה** (§4, §9.1, §9.2) — שכבה משותפת, מודאל דיווח,
   `index.html` בשורש, תיקון ה-query string. **בדיקה: המודאל עובד.**
3. **מטא-דאטה** (§3, §5) — לגזור את המוסכמת, לבנות את מפות המסכים.
   **בדיקה: כל המזהים תואמים בית-לבית.**
4. **אינסטרומנטציה** (§6) — רכיב אחד קודם, לאמת זרימה מלאה, ורק אז השאר.
5. **ניקוד ו-`completed`** (§7, §8).
6. **אימות** (§10) והשלמת רשימת התיוג.

שלב 2 עצמאי לגמרי משלב 3 — אם המטא-דאטה מתעכבת, אפשר להתקדם.

**הכלל החשוב ביותר לאורך כל הדרך:** ברגע שהאינסטרומנטציה של הרכיב הראשון
מוכנה, **להריץ אותו ולהסתכל על ה-statements שיוצאים בפועל.** לא לקרוא את הקוד
ולהניח. כל שלוש הטעויות היקרות בהטמעה הזאת נתפסו בדיוק שם, ואף אחת מהן לא
הייתה נתפסת בקריאה.
