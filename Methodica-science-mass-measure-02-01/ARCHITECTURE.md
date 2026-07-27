# ARCHITECTURE.md — לומדת "מדידת מסה"

## Canvas ומנוע
- קנבס עבודה יחיד: **1280 × 710px**, לפי תבנית `SingleChoiceQuestion` (מסך 2, Figma
  נטו). מסך 1 עוצב ב-Figma על קנבס **1920 × 1080** (קובץ workshop נפרד) — כל המדידות
  שלו יומרו לקנבס 1280×710 ביחס אחיד **scale = 1280/1920 = 0.6667** (הפרש הגובה
  התוצאתי, 720 מול 710, הוא 10px בלבד — סטייה מקובלת בתקן ה-canvas של 720).
- `#app { width:1280px; height:710px; position:absolute; transform-origin:top left }`
  + `scaleApp()` ב-JS שמתאים לגודל ה-viewport (1280/1366/1920 ועוד).
- `html, body { direction: rtl; overflow:hidden; font-family:'Assistant', sans-serif }`.
- ניווט מסכים: `.screen { display:none }` → `.screen.active { display:block }`,
  דרך `goTo(n)` / `TOTAL_SCREENS = 2` (בשלב זה).
- `window.lomdaState = { selectedCharacter: null }` — סטייט גלובלי לכל משך הסשן.

## מסך 1 — TwoOptionSelection (בחירת דמות)

### מיפוי Figma → סטייטים
| Figma frame | State ID | תיאור |
|---|---|---|
| `1:132` | before | לפני אינטראקציה — שתי כרטיסיות ניטרליות, כפתור המשך disabled |
| `1:141` | hover | הדגמת hover על כרטיס כחול (מסגרת מקווקוות כחולה) |
| `1:150` | selected | כרטיס כחול נבחר (מסגרת כחולה מלאה) + כפתור המשך enabled |

כל שלושת ה-frames הם **אותו מסך** עם 3 מצבי אינטראקציה — לא 3 מסכים נפרדים.
Frames "Screen 2 - State X" באותו קובץ (`1:176`, `1:203`, `56:161`, `1:578`) **אינם
בהיקף** — שייכים ליחידת המשך עתידית (מסך "במה נצפה?" / וידאו).

### מבנה (`#s0`)
```html
<section class="screen active" data-screen="0" id="s0">
  <div class="select-content">
    <div class="select-head">
      <h1 class="select-title">בחרו מי תצעד לצידכם:</h1>
      <p class="select-subtitle">לאורך היחידה תלווה אתכם דמות.<br>איך היא תראה?</p>
    </div>
    <div class="option-cards" role="radiogroup" aria-label="בחירת דמות מלווה">
      <div class="option-card" role="radio" aria-checked="false" tabindex="0"
           data-value="blue" onclick="selectOption(this)">
        <div class="option-card-img"><img src="assets/images/character-blue.png" alt=""></div>
      </div>
      <div class="option-card" role="radio" aria-checked="false" tabindex="0"
           data-value="green" onclick="selectOption(this)">
        <div class="option-card-img"><img src="assets/images/character-green.png" alt=""></div>
      </div>
    </div>
  </div>
  <div class="s0-bar">
    <button class="s0-continue-btn" id="s0-continue" disabled onclick="advanceFromS0()">בחרתי</button>
  </div>
</section>
```
אין `.option-card-labels` (שם/תיאור) — ב-Figma של המסך הזה אין טקסט מתחת לכרטיס,
רק הדמות עצמה בתוך "קשת" (arch) לבנה עם צל.

### CSS — נקודות מפתח (ערכים מומרים ל-scale 0.6667 מה-Figma של 1920×1080)
- `.option-cards { gap: 83px }` (125px × 0.6667), `align-items:center`.
- כרטיס "קשת" (`.option-card`): מלבן עם פינות עליונות מעוגלות מאוד + תחתונות כמעט
  ישרות (border-radius גדול למעלה, קטן למטה), רקע לבן, `box-shadow` עדין — **נבנה
  ב-CSS**, לא כתמונה (הרקע ב-Figma הוא צורה גיאומטרית פשוטה ללא טקסט/פרטים).
- מצב **hover**: מסגרת מקווקוות כחולה (`border: 2px dashed #1CB0F6` או הצבע המדויק
  מה-Figma — ננעל בזמן המימוש מתוך design tokens).
- מצב **selected**: מסגרת כחולה **מלאה** (לא מקווקוות), ללא מילוי כחול (הרקע נשאר
  לבן — כך מוצג בפועל ב-frame `1:150`, בשונה מברירת המחדל התיעודית `#eaf6ff` של
  תבנית `TwoOptionSelection.md` — הוחלט ללכת לפי Figma).
- **החלטת ייצוא (עודכנה בזמן ה-QA)**: "טבעת" ה-hover/selected ב-Figma מיוצאת
  כתמונות PNG נפרדות (`GreenCharacter-Hover-Icon`, `Character-Down`). בבדיקה בפועל
  (הורדת ה-assets והצגתם בדפדפן אמיתי) התברר ששתי התמונות האלה מגיעות עם **מילוי
  אפור אטום על כל שטח הקשת** (לא רק קו המתאר השקוף שנראה בתצוגה המקדימה) — שימוש
  בהן כשכבה מעל הדמות מכסה אותה לגמרי. **הוחלט לוותר על ה-PNG-ים לגמרי** ולצייר
  את הטבעת ישירות ב-CSS: `border` בצבע ובסגנון מתאים (מקווקוו לכחול בהיר ב-hover,
  רציף בכחול כהה ב-selected) + `border-radius` שמדמה את צורת הקשת, ישירות על
  `.option-card-photo`. זה גם פותר את בעיית ה-fill האטום וגם שומר על גבול חד בכל
  רזולוציה. אומת חזותית מול Figma ב-Chrome headless.
- כפתור המשך — **קנה מידה עצמאי, ייחודי למסך 1** (לא הכפתור הקטן של פס הפעולה
  התחתון הגלובלי): `.s0-continue-btn`, רוחב 180px / גובה 56px (270×84 × 0.6667),
  `border-radius:999px`.
  - Disabled: `background:#bfbfbf; color:#404040`, `box-shadow:0 6px 5px 1px rgba(0,0,0,.25)`.
  - Enabled: גרדיאנט `linear-gradient(#005fbe 9%, #003971)` (טוקן זהה לכפתורי
    ה-NavButton של מסך 2 — **נבנה ב-CSS**, לא כתמונה), טקסט לבן.
  - שים לב: גופן/גודל הטקסט שונה מעט בין המצבים ב-Figma (Regular 32 disabled /
    Bold 36 enabled) — ייושם כפי שמוגדר, לאחר סבב scale.
- **אין כפתור "חזרה"** במסך הראשון (הוא המסך הראשון ביחידה).

### JS — נקודות מפתח
- `selectOption(cardEl)` — בחירה יחידה, `window.lomdaState.selectedCharacter = cardEl.dataset.value`,
  מפעילה `#s0-continue`.
- `resetScreenState(0)` — משחזר `.selected` מ-`lomdaState.selectedCharacter` בחזרה למסך.
- מקלדת: Enter/Space על כרטיס פוקוס בוחר אותו (a11y, תואם `role="radio"`).
- `advanceFromS0()` → `goTo(1)`.

## מסך 2 — SingleChoiceQuestion (שאלת בחירה יחידה)

### מיפוי Figma → סטייטים (מסך אחד, JS מניע את כל הסטייטים)
| Figma frame | State ID | תיאור |
|---|---|---|
| `196:3320` | before | לפני בחירה — `צדקתי?` disabled, `אפשר רמז?` enabled |
| `196:3445` | selected | נבחרה אפשרות (עיגול כחול מלא), `צדקתי?` enabled |
| `196:3497` | correct | תשובה נכונה — פאנל ירוק, אפשרות נכונה מסומנת ✓, כפתור ראשי → "שנמשיך?", נעול |
| `196:3510` | wrong-1 | ניסיון 1 שגוי — פאנל אדום, אפשרות שנבחרה מסומנת ✗, **אין** חשיפת הנכונה, מתאפשר ניסיון נוסף |
| `578:9624` | wrong-2 | ניסיון 2 שגוי (סופי) — פאנל אדום + חשיפת האפשרות הנכונה (✓ ירוק) לצד השגויה (✗ אדום), נעול |
| `196:3319` | (component) | מצב ה-bar התחתון בפני עצמו (כפתורים) |
| `579:9740` | hint-popup | פופ-אפ רמז |

### פער מול Figma שהוכרע — **תמונת השאלה נשארת קבועה בכל הסטייטים**
בכל שלושת ה-frames של משוב (`196:3497`, `196:3510`, `578:9624`) אין node של תמונה
כלל (ה-"question" instance שם הוא רכיב אחר, ללא `img` בכלל), בעוד ב-`196:3320`
וב-`196:3445` יש placeholder תמונה 380×380 בצד ימין-עליון של הבלוק. זה סותר את
מוסכמת התבנית הגנרית (`SingleChoiceQuestion.md`) שבה תמונת השאלה קבועה בכל הסטייטים.
**הוכרע (באישור המשתמש):** מסגרת התמונה **נשארת קבועה בכל הסטייטים** (גם אחרי
בדיקה) — פאנל המשוב מופיע בפינה שמאל-תחתונה ואינו חופף לאזור התמונה (ימין-עליון),
כך שנשמרת עקביות חזותית וניצול המסך, ותואם את ההתנהגות המתועדת/מאומתת בפרויקטים
קודמים. זו סטייה מודעת מהליטרליות של ה-Figma frames של מצבי המשוב הספציפיים בלבד,
ולא מהעיצוב הבסיסי של השאלה.

### מבנה (`#s1`)
```html
<section class="screen" data-screen="1" id="s1">
  <div class="scq-question">
    <div class="scq-img"><div class="scq-img-inner"><!-- <img> יוזרק כשתסופק תמונה --></div></div>
    <div class="scq-content">
      <div class="scq-qtext">
        <p class="scq-qtitle">…</p>
        <p class="scq-qbody">…</p>
        <p class="scq-qbold">…</p>
      </div>
      <div class="scq-answers" role="radiogroup">
        <div class="scq-opt" role="radio" data-id="a" onclick="scqSelect('a')">
          <span class="scq-opt-text">…</span><span class="scq-radio"></span>
        </div>
        <!-- × 4 -->
      </div>
    </div>
  </div>
  <div id="scq-feedbox" class="scq-fb-box">
    <div class="scq-fb" data-fb="correct">…</div>
    <div class="scq-fb" data-fb="wrong1">…</div>
    <div class="scq-fb" data-fb="wrong2">…</div>
  </div>
  <div class="scq-bar">
    <div class="scq-bar-left">
      <button id="scq-check" onclick="scqCheck()" disabled>צדקתי?</button>
      <button id="scq-hint" onclick="scqOpenHint()">אפשר רמז? <img class="scq-hint-icon" …></button>
    </div>
    <button id="scq-back" class="scq-back" onclick="goTo(0)">חזרה</button>
  </div>
</section>
<div id="scq-hint-overlay"><!-- מחוץ ל-.screen, ישירות ב-#app -->
  <div class="scq-hint-popup">
    <div class="scq-hint-title">…<img class="scq-hint-bulb"></div>
    <p class="scq-hint-body">…</p>
    <button class="scq-hint-close" onclick="scqCloseHint()">חזרה לשאלה</button>
  </div>
</div>
<div class="flag-btn"><!-- global issue button, per _global-components.md --></div>
```

### פער מול Figma שהוכרע — **פס ניווט שאלות (breadcrumb "שאלה 1–6") מושמט בשלב זה**
ב-Figma של מסך 2 מופיע לרוחב, מעל השאלה, פס ניווט עם 6 עיגולים ("שאלה 1"–"שאלה 6")
המציג את השאלה הנוכחית (4) כפעילה, שאלות 1–3 כ"הושלמו" (✓ כחול, אחת מהן ✗ = נענתה
לא נכון), ושאלות 5–6 כ"טרם התחילו" (אפור). רכיב זה **לא מוזכר בכלל** בתבנית
`SingleChoiceQuestion.md` (שם צוין מפורש "No progress bar"), אבל **קיים בפועל**
ב-Figma הזה. **הוכרע (באישור המשתמש): הפס מושמט כליל בשלב זה** — כדי לא לרמז
על שאלות 1,2,3,5,6 שאינן קיימות עדיין ביחידה. ייבנה/יתווסף כשתתווספנה שאלות
נוספות ליחידה (מחוץ להיקף הנוכחי). המבנה מטה (`#s1`) לכן **אינו כולל** breadcrumb.

### CSS — נקודות מפתח (design tokens, מתוך Figma)
| טוקן | ערך |
|---|---|
| Blue/70 | `#019DE5` |
| Blue/75 | `#007AC6` |
| Green/80 | `#609E12` |
| Green/5 | `#EDF8ED` |
| Red/100 | `#B20010` |
| Red/5 | `#FFF0F4` |
| Red/10 | `#FFDBDC` |
| טקסט בסיס | `#222222` / `#303030` |
| Gray/100 | `#AEAEAE` |

- `.scq-question` — `top:139px` (מומר: אין scale פה, זה כבר קנבס 1280×710 מקורי).
- `.scq-img` — 380×380, `border:1px solid rgba(174,174,174,.5)`, `border-radius:16px`.
  **ריק כברירת מחדל** (אין תמונה אמיתית ב-Figma עדיין) — `object-fit:contain` כש-`<img>` תסופק.
- `.scq-opt` — פילס (`border-radius:999px`), `border:2px solid #019DE5`; רדיו יושב
  **בצד ימין** של הפיל (RTL) דרך `order:-1`.
  - `.selected` → עיגול כחול מלא (ללא רקע/מסגרת אדום/ירוק).
  - `.correct` → `background:#EDF8ED; border-color:#609E12` + עיגול ירוק + סימן ✓.
  - `.wrong` → `background:#FFF0F4; border-color:#B20010` + עיגול אדום + סימן ✗.
- `#scq-feedbox` — פאנל בפינה שמאל-תחתונה (`bottom:87px; left:16px; width:426px`),
  `border-radius:12px`, כפתור X עגול לקיפול/פתיחה (`.scq-fb-toggle`), רקע ירוק/אדום
  לפי `.is-correct` / `.is-wrong`.
- `.scq-bar` — 74px, `border-top:.4px solid #AEAEAE`, `direction:ltr` פנימי (כמו
  בתבנית הקיימת) כדי לשמור סדר כפתורים תואם RTL-reading-start.
- כפתור "אפשר רמז?" — `border:1px solid #AEAEAE`, טקסט+אייקון אפורים כש-disabled
  (אחרי שימוש), כחולים כש-enabled.
- פופ-אפ רמז (`#scq-hint-overlay`) — `background:#019DE5; border-radius:48px;
  padding:40px`, כותרת Bold 32 לבן + אייקון נורה, גוף Regular 24 לבן, כפתור לבן
  "חזרה לשאלה" (`background:#fff; color:#303030; border-radius:999px`).
  **תואם 1:1** למה שכבר מתועד ב-`SingleChoiceQuestion.md` (hint popup) — אין סתירה כאן.

### JS — נקודות מפתח
- `SCQ = { correctId: '<לפי הנכונה בפועל>', maxAttempts: 2 }`.
- State: `scqSelected`, `scqAttempts`, `scqAnswered`, `scqHintUsed`, `scqDone`.
- `scqSelect(id)` — בחירה יחידה, מפעיל `#scq-check`.
- `scqCheck()`:
  - ניסיון 1 שגוי → `.wrong` על הנבחרת בלבד, פאנל אדום `wrong1`, השאלה נשארת ניתנת
    לעריכה (ללא חשיפת הנכונה), `scqAttempts++`.
  - נכון (בכל ניסיון) → `.correct` על הנבחרת, פאנל ירוק, כפתור ראשי → "שנמשיך?",
    `scqDone = true`, נעילה.
  - ניסיון 2 שגוי → `.wrong` על הנבחרת + `.correct` על האפשרות הנכונה, פאנל אדום
    `wrong2`, כפתור ראשי → "שנמשיך?", `scqDone = true`, נעילה.
- `scqOpenHint()` / `scqCloseHint()` — Esc + קליק על הרקע סוגרים; משבית את כפתור
  הרמז לאחר שימוש (לפי מוסכמת התבנית: hint disables after use).
- `scqToggleFeedbox()` — קיפול/פתיחה של פאנל המשוב (chevron / X).
- `resetScreenState(1)` → משחזר למצב `before` **רק אם** `!scqDone` (חוק "resume
  state" — לא ניתן ניסיון נוסף אחרי חזרה למסך שכבר נענה).
- `goTo(0)` מ-`#scq-back`.

#### הבהרת התנהגות — כפתור "שנמשיך?" אחרי ניסיון 1 שגוי
ב-Figma, בר הפעולה בכל שלושת סטייטי המשוב (נכון / טעות 1 / טעות 2) מציג **אותו**
כפתור יחיד "שנמשיך?" (ללא "אפשר רמז?"), ללא הבדל חזותי בין "טעות עם ניסיון נוסף"
ל"טעות סופית". כדי ליישב זאת עם הדרישה ל-2 ניסיונות מענה, ה-JS מבחין ביניהם
**לפי ההתנהגות בלחיצה**, לא לפי התווית:
- אחרי ניסיון 1 שגוי: "שנמשיך?" קורא ל-`scqRetry()` — מנקה את סימון הטעות,
  מאפשר בחירה נוספת (רמז לא חוזר — הוא כבר "נוצל" עם הבדיקה הראשונה).
- אחרי ניסיון 2 שגוי או תשובה נכונה: "שנמשיך?" קורא ל-`advanceScreen()` (כרגע
  no-op, יחובר כשיתווסף מסך הבא).

## רכיבים גלובליים (`_global-components.md`)
- `.flag-btn` ("מצאתם בעיה?") — פינה שמאל-עליונה, `top:16px; left:16px; z-index:30`,
  מחוץ לכל `.screen`, בתוך `#app`. שני מצבים (default/hover) מיוצאים כתמונות PNG
  שלמות (עיגול+דגל), תואם מוסכמת הפרויקטים הקודמים.
- כללי RTL: ניווט "הבא" = צד שמאל, "הקודם"/"חזרה" = צד ימין. `flex-start` = ימין
  פיזי בתוך קונטיינר `direction:rtl`.

#### מלכודת RTL שנתפסה ב-QA: `align-items` בעמודת flex
בקונטיינר `flex-direction:column; direction:rtl`, הציר הרוחבי (cross-axis)
מתהפך: `align-items:flex-end` מיישר לצד **שמאל** הפיזי (לא ימין כפי שניתן היה
לצפות אינטואיטיבית), ו-`flex-start` הוא זה שמיישר לימין הפיזי. הבאג הזה נתפס
בפועל ב-QA חזותי (Chrome headless): `.scq-content`, `.scq-qtext`, `.scq-answers`
ו-`.scq-hint-popup` יושמו תחילה עם `flex-end` וגרמו לבלוק התשובות להיצמד לצד
שמאל ולחפוף חלקית את פאנל המשוב — תוקן ל-`flex-start` בכל הארבעה. יש לזכור זאת
בכל בלוק RTL עתידי מסוג column.

## רכיבים גלובליים (`_global-components.md`)
- `.flag-btn` ("מצאתם בעיה?") — פינה שמאל-עליונה, `top:16px; left:16px; z-index:30`,
  מחוץ לכל `.screen`, בתוך `#app`. שני מצבים (default/hover) מיוצאים כתמונות PNG
  שלמות (עיגול+דגל), תואם מוסכמת הפרויקטים הקודמים.
- כללי RTL: ניווט "הבא" = צד שמאל, "הקודם"/"חזרה" = צד ימין. `flex-start` = ימין
  פיזי בתוך קונטיינר `direction:rtl`.
- מעברים: `transition:none` בכל שינויי מצב (שינוי מיידי, כמו ב-Figma).

## רשימת Assets מתוכננת לייצוא (`assets/images/`)
| קובץ | מקור Figma | הערה |
|---|---|---|
| `character-blue.png` | BlueCharacter1 (transparent) | דמות בלבד, ללא מסגרת/רקע |
| `character-green.png` | GreenCharacter1 (transparent) | דמות בלבד |
| `icon-flag-default.png` | IssueIcon state=Default | עיגול+דגל, 38×38 |
| `icon-flag-hover.png` | IssueIcon state=hover | עיגול+דגל כחול, 38×38 |
| `icon-idea-blue.svg`/png | Iocn property1=idea\blue | נורה כחולה קטנה (~26×24) |
| `icon-idea-gray.svg`/png | Iocn property1=idea\gray | נורה אפורה (מצב disabled) |
| `icon-check-white.svg` | Circle/correct → Group | סימן ✓ בתוך עיגול ירוק |
| `icon-x-white.svg` | Circle/wrong → Group | סימן ✗ בתוך עיגול אדום |
| `icon-fb-close.svg` | FeedbackButton → XIcon | X לקיפול/סגירת פאנל המשוב (16×16) |
| `icon-idea-white-lg.svg` | hint popup → Group | נורה לבנה גדולה בכותרת הפופ-אפ |

(אייקוני ה-breadcrumb "nav icons" **לא** נכללים ברשימה — הפס הושמט מהיקף הבנייה, ראו סעיף הפערים.)

**לא** מיוצאים: רקע כרטיס הדמות (נבנה ב-CSS), טבעות hover/selected (נבנה ב-CSS),
רקע כפתור ה"המשך"/NavButton (גרדיאנט ב-CSS), תמונת השאלה (placeholder ריק —
תסופק תמונה אמיתית בעתיד).

**כל הטקסט הבא בכל שני המסכים הוא HTML חי** — כותרות, תת-כותרות, טקסט שאלה,
טקסטי אפשרויות (כרגע placeholder "טקסט טקסט..." ב-Figma — ידרוש תוכן אמיתי
מהלקוח/מסמך תוכן בהמשך, לא קיים כרגע), טקסטי פידבק, טקסט פופ-אפ רמז, כל הכפתורים.

⚠️ **הערת תוכן**: טקסטי השאלה, האפשרויות והמשוב ב-Figma הם placeholder גנרי
("טקסט טקסט טקסט...") ולא תוכן לימודי אמיתי. בשלב הבנייה נזדקק לתוכן אמיתי
(שאלה + 4 אפשרויות + טקסטי משוב + טקסט רמז) — אם לא יסופק, ייבנה עם ה-placeholder
כפי שמופיע ב-Figma, מתויג בבירור להחלפה.

## החלטות שהוכרעו (אושרו ע"י המשתמש)
1. **תמונת השאלה** נשארת קבועה בכל הסטייטים של מסך 2 (גם אחרי בדיקה), חורגת
   מהליטרליות של frames המשוב הספציפיים ב-Figma.
2. **breadcrumb שאלות 1–6** מושמט כליל בשלב זה — יתווסף עם שאלות נוספות בעתיד.

## סיכונים/הערות נוספות (לתשומת לב בזמן הבנייה, לא דורשות אישור נוסף)
3. **חוסר תוכן לימודי אמיתי** (שאלה/תשובות/משוב/רמז) — placeholder בלבד כרגע;
   ייבנה עם הטקסט הגנרי מה-Figma ("טקסט טקסט...") עד לקבלת תוכן אמיתי.
4. **קנה מידה שונה בין שני קבצי ה-Figma** (1920×1080 מול 1280×710) — נפתר ע"י scale
   אחיד 0.6667 למסך 1 בלבד.
5. **צבע selected בכרטיס הדמות** שונה מברירת המחדל התיעודית של התבנית (`#eaf6ff`
   מול לבן+מסגרת כחולה בפועל) — הולכים לפי Figma.
6. שם המפתח ב-`lomdaState` (`selectedCharacter`) ייקבע סופית לפי שמות הרכיבים
   בפועל ("blue"/"green") — לא "purple"/"turquoise" כמו הדוגמה הגנרית.

## סדר בנייה מתוכנן
1. שלד קבצים: `index.html`, `styles.css`, `script.js`, `index_dev.html`, `assets/*`.
2. מנוע גלובלי: canvas, `scaleApp`, `goTo`/`resetScreenState`, `lomdaState`, גשר
   dev ל-`index_dev.html`.
3. רכיב גלובלי `.flag-btn`.
4. מסך 1 (TwoOptionSelection) מלא — מבנה, CSS, JS, 3 מצבים, QA מול Figma.
   → עדכון `index_dev.html` בסיום.
5. ייצוא assets למסך 2 (אייקונים בלבד — כאמור, אין תמונת שאלה אמיתית).
6. מסך 2 (SingleChoiceQuestion) מלא — מבנה, CSS, JS, כל 5 הסטייטים + פופ-אפ רמז,
   QA מול Figma. → עדכון `index_dev.html` בסיום.
7. QA כוללת: RTL בכל הרוחבים (1280/1366/1920), console נקי מ-404, resume-state
   לשאלה, ניגודיות/פוקוס מקלדת בכרטיסי הבחירה.
