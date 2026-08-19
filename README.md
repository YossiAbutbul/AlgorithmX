# AlgorithmX

אתר לימוד עברי (RTL) לתשעה אלגוריתמים על גרפים, עם הרצה אינטראקטיבית צעד אחר צעד על גרף מצויר,
לצד מבני הנתונים ומערכי העזר שמתעדכנים בזמן אמת.

סדר הטאבים לפי תלות לוגית:
`BFS -> DFS -> Dijkstra -> Bellman-Ford -> Floyd-Warshall -> Prim -> Kruskal -> Ford-Fulkerson -> Edmonds-Karp`,
ואחריהם טבלת השוואה מסכמת ומצב השוואה זו לצד זו.

## הרצה

```bash
npm install
npm run dev
```

פקודות נוספות:

```bash
npm run build        # בנייה סטטית לתיקיית dist
npm run preview      # הצגת הבנייה
npm test             # בדיקות vitest
npm run check:dashes # נכשל אם נמצא em-dash או en-dash
npm run verify       # שלושתם יחד: מקפים, טיפוסים, בדיקות
```

אין backend. התוצר הוא אתר סטטי לחלוטין.

## הארכיטקטורה בשורה אחת

כל אלגוריתם הוא **פונקציה טהורה** שמקבלת גרף ומחזירה מערך של `Frame`, וה-UI רק מציג frame לפי
אינדקס. מכאן שהצעד קדימה, הצעד אחורה, הגרירה על פס הצעדים וההשוואה זו לצד זו עובדים בלי קוד נוסף.

```
src/
  algorithms/   types.ts, engine.ts, validate.ts, מודול לכל אלגוריתם, index.ts כרגיסטרי
  content/      הטקסטים בעברית, הפסאודו-קוד, ההוכחה, המלכודות ושאלות התרגול
  graphs/       presets.ts (הגרפים המוכנים), storage.ts (localStorage וייצוא JSON)
  components/   GraphCanvas, GraphEditor, StepControls, StepTimeline, panels/*, Section, Quiz
  pages/        AlgorithmPage, ComparisonTablePage, ComparePage
  theme/        tokens.css
```

## איך מוסיפים אלגוריתם חדש

1. **תוכן**: צור `src/content/<id>.content.ts` שמייצא אובייקט `AlgorithmContent`: רעיון, מתי
   משתמשים, מבני נתונים, יעילות, מלכודות, שורה תחתונה, טיפים למבחן, פסאודו-קוד, הוכחה ושאלות תרגול.
2. **גרפים**: הוסף ל-`src/graphs/presets.ts` פונקציה שמחזירה `GraphModel` דרך `buildGraph`. תן
   מיקומים קבועים שאין בהם חיתוכי צלעות.
3. **מנוע**: צור `src/algorithms/<id>.ts` עם שתי פונקציות. אחת טהורה לחישוב התוצאה בלבד, לשימוש
   הבדיקות, ואחת `run(graph, opts): Frame[]` שבונה frames דרך `FrameBuilder`:

   ```ts
   const b = new FrameBuilder(graph);
   b.setNode(u, 'current');
   b.setEdge(edge.id, 'tree');
   b.emit({ event: 'discover', message: '...', aux: [...], codeLine: 7 });
   return b.build();
   ```

   כל frame חייב לכלול מצב לכל צומת ולכל צלע, וה-frame האחרון חייב להיות `done`.
4. **מודול**: ייצא `AlgorithmModule` עם `id`, `titleHe`, `requires`, `graphKind`, `presetGraphs`
   ו-`content`.
5. **רגיסטרי**: הוסף אותו ל-`ALGORITHMS` ב-`src/algorithms/index.ts`, במקום הנכון לפי סדר התלות.
6. **בדיקה**: הוסף ל-`src/algorithms/algorithms.test.ts` בדיקה שמאמתת את התוצאה הצפויה. בדיקת
   המסגרת הכללית תרוץ עליו אוטומטית.
7. **טבלת ההשוואה**: הוסף שורה ב-`src/content/comparison.ts`, ואם רלוונטי גם זוג ל-`COMPARE_PAIRS`.

## כללי כתיבה

- **אסור** להשתמש בתו em-dash (U+2014) או en-dash (U+2013) בשום מקום: לא בקוד, לא בהערות, לא
  בטקסט העברי ולא ב-commit messages. השתמש במקף רגיל, בפסיק, בנקודתיים או במשפט נפרד.
  `npm run check:dashes` נכשל אם נמצא אחד מהם.
- כל תוכן המשתמש בעברית, וכל שמות המשתנים והקוד באנגלית.
- שמות אלגוריתמים, מבני נתונים ומונחי סיבוכיות נשארים באנגלית גם בתוך טקסט עברי.

## דטרמיניזם

בכל מקום שיש בו חופש בחירה, ההחלטה קבועה ומוצהרת בטאב עצמו: סריקת שכנים בסדר אלפביתי, שוויון
מפתחות בתור עדיפויות נשבר לפי המזהה הקטן, מיון צלעות ב-Kruskal לפי משקל ואז לפי מזהה הצלע, ובחירת
מסלול הגדלה לפי סדר רשימת הצלעות (קודם ישירות ואחר כך אחוריות).

## שפת הצבע

ארבעה מצבים, אותה משמעות בכל תשעת האלגוריתמים, ולכל מצב יש גם צורה או תווית ולא רק צבע:

| מצב | משמעות | סימון |
| --- | --- | --- |
| `idle` | לא נתגלה | לבן עם קו אפור |
| `frontier` | ממתין במבנה הנתונים | ענבר עם נקודה |
| `current` | מטופל עכשיו | אדום ורוד עם טבעת כפולה |
| `done` | סופי | טורקיז עם סימן וי |
| `rejected` | נבדק ונדחה | אפור מקווקו עם איקס |

הסגול שמור לזהות האתר ולפעולות בלבד, ולעולם לא למצבי גרף.

## נגישות

`dir="rtl"` ברמת הדף, תכונות לוגיות במקום left ו-right, מיקוד מקלדת נראה, `aria-live` על שורת
הסבר הצעד, טאבים תקניים לפי `role="tablist"`, וכיבוי מלא של ניגון אוטומטי ושל transitions כאשר
המשתמש ביקש `prefers-reduced-motion`.
