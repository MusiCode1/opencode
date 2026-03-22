<div dir="rtl">

# יומן פיתוח — תרגום עברית ותמיכת RTL ל-OpenCode

## סקירה כללית

פרויקט זה מוסיף תרגום מלא לעברית וממשק RTL לאפליקציית הווב של OpenCode, כולל פריסה ל-GitHub Pages ואפשרות להפעלת שרת מותאם אישית.

## ענף `dev` — שינויים ל-upstream PR

### 1. תרגום לעברית (`feat(i18n): add Hebrew translation`)
- **`packages/ui/src/i18n/he.ts`** — 162 מפתחות תרגום לרכיבי UI
- **`packages/app/src/i18n/he.ts`** — 946 מפתחות תרגום לאפליקציה
- **`packages/app/src/context/language.tsx`** — רישום השפה העברית + הגדרת `dir="rtl"` על ה-document
- **`packages/app/src/i18n/en.ts`** — הוספת תווית `language.he`
- **`packages/app/src/i18n/parity.test.ts`** — הוספת עברית לבדיקת שלמות התרגום

### 2. תיקוני CSS ל-RTL (`fix(ui): use CSS logical properties for RTL support`)
החלפת 84 מופעים של CSS properties פיזיים (left/right) בלוגיים (inline-start/end) ב-20 קבצי CSS:
- `padding-left/right` → `padding-inline-start/end`
- `margin-left/right` → `margin-inline-start/end`
- `left/right` (positioning) → `inset-inline-start/end`
- `border-left/right` → `border-inline-start/end`
- `text-align: left/right` → `text-align: start/end`
- `border-radius` corners → logical equivalents

**חריג מכוון:** `direction: rtl; text-align: left` עבור truncate-start של נתיבי קבצים.

### 3. תיקוני Tailwind ו-dir attributes (`fix(app): use logical Tailwind classes and dir attributes for RTL`)
- החלפת Tailwind classes פיזיים (`pl-`/`pr-`/`ml-`/`mr-`/`left-`/`right-`) בלוגיים (`ps-`/`pe-`/`ms-`/`me-`/`start-`/`end-`) ב-40 קבצי TSX
- הוספת `dir="auto"` לאלמנטים עם תוכן משתמש/סוכן (הודעות, inputs, רשימות, dropdowns, sidebar titles)
- הוספת `dir="ltr"` לבלוקי קוד, טרמינל, ו-switch controls
- שימוש ב-`ltr:`/`rtl:` Tailwind variants לאנימציות sidebar

### 4. הוספת `dir="auto"` לרכיבים נוספים (`fix(ui): add dir="auto" to tooltips, toasts, and inline inputs for RTL`)
- Tooltip content
- Toast notifications
- Inline inputs
- Session new view (פרטי פרויקט, branch)
- Worktree path display
- Inline editor

### 5. בדיקות RTL (`test(app): add RTL protection lint and layout tests`)
- **`packages/app/src/rtl/css-rtl-lint.test.ts`** — סורק קבצי CSS ומתריע על properties פיזיים
- **`packages/app/src/rtl/tailwind-rtl-lint.test.ts`** — סורק קבצי TSX ומתריע על Tailwind classes פיזיים
- **`packages/app/e2e/rtl/rtl-layout.spec.ts`** — בדיקות Playwright שמוודאות:
  - Sidebar ממוקם בצד הנכון ב-LTR וב-RTL
  - Switch controls שומרים על `dir="ltr"`

### 6. README בעברית (`docs: add Hebrew README translation`)
- **`README.he.md`** — תרגום מלא של ה-README

---

## ענף `gh-pages-deploy` — פריסה ותשתית

כולל את כל השינויים מ-`dev` ובנוסף:

### 7. פריסה ל-GitHub Pages
- **`.github/workflows/gh-pages.yml`** — workflow שבונה את `packages/app` ופורס ל-Pages
- **`packages/app/vite.config.ts`** — תמיכה ב-`VITE_BASE_PATH` env var
- **`packages/app/src/app.tsx`** — העברת `import.meta.env.BASE_URL` ל-SolidJS Router base prop
- **404.html** — fallback ל-SPA routing

**כתובת:** https://musicode1.github.io/opencode/

### 8. README ראשי בעברית
- **`README.md`** → עברית (כולל מדריך UI מרוחק)
- **`README.en.md`** → אנגלית
- עדכון קישורי שפות בשני הקבצים

### 9. תיקוני שרת
- **`packages/opencode/src/server/server.ts`**:
  - `credentials: true` ב-CORS middleware — מאפשר שליחת cookies cross-origin
  - `OPENCODE_APP_URL` env var — מאפשר להחליף את ה-UI proxy מ-`app.opencode.ai` ל-URL מותאם אישית
- **`.github/workflows/build-server.yml`** — workflow לבניית בינארי linux-x64

### 10. תשתית שרת מרוחק
- Service file ב-systemd: `/home/user/.config/systemd/user/opencode-web.service`
- קובץ env: `/home/user/.config/opencode/.env`
- בינארי מותאם: `/home/user/.opencode/custom-opencode`
- הגדרת CORS ל-`https://musicode1.github.io`

### 11. הגדרת GitHub Pages
- הפעלת Pages דרך GitHub API (`gh api repos/.../pages -X POST`)
- הוספת deployment branch policy עבור `gh-pages-deploy`
- שינוי ה-default branch של ה-fork ל-`gh-pages-deploy` כדי שמבקרים יראו את ה-README בעברית

### 12. הגדרת Git remotes
- הוספת remote `myfork` → `https://github.com/MusiCode1/opencode.git`
- `origin` נשאר על upstream (`anomalyco/opencode`) לצורך PR
- הגדרת upstream tracking: `dev` ו-`gh-pages-deploy` עוקבים אחרי `myfork`

### 13. Cloudflare Access ו-CORS
- הגדרת CORS settings ב-Cloudflare Zero Trust: origin, methods, headers
- **בעיה שהתגלתה:** Cloudflare Access מיירט preflight (OPTIONS) ומחזיר תשובה בלי CORS headers של השרת
- **בעיה שהתגלתה:** Cloudflare Tunnel/Access מסיר את ה-`Authorization` header מבקשות — גם אחרי ביטול Access, ה-Basic Auth לא מגיע לשרת
- הגדרת "Bypass options requests to origin" ו-"Access-Control-Allow-Credentials" ב-Cloudflare
- ביטול Access על הדומיין — הסתמכות על Basic Auth של OpenCode בלבד

### 14. credentials: include — ניסיון וחזרה
- הוספת `credentials: "include"` ל-fetch wrapper כדי לשלוח cookies של Cloudflare Access cross-origin
- **הבנה:** זה דורש `Access-Control-Allow-Credentials: true` מהשרת, מה ששובר שרתים רגילים של opencode שלא מחזירים את זה
- **החלטה:** הוסר. לא כדאי גם בגרסה מותנית (cross-origin בלבד), כי השרת חייב לתמוך

### 15. מדריך שימוש ב-UI מרוחק
- **`tmp/remote-ui-guide.md`** — מדריך מפורט בעברית:
  - הפעלת שרת עם CORS
  - חיבור מה-UI (4 שדות: URL, Name, Username, Password)
  - פתרון בעיות (CORS, Mixed Content, שרת לא נגיש)
  - Origins מובנים שלא דורשים הגדרה
  - תיעוד באג ה-wildcard

---

## באג ידוע: `--cors *` לא עובד

בקוד (`server.ts:121`):
```typescript
if (opts?.cors?.includes(input)) {
  return input
}
```
`["*"].includes("https://example.com")` → `false`. Wildcard לא מטופל.

**תיקון מוצע:**
```typescript
if (opts?.cors?.includes("*") || opts?.cors?.includes(input)) {
  return input
}
```

---

## איך להשתמש

### UI מרוחק (GitHub Pages)
```bash
opencode serve --port 4096 --cors https://musicode1.github.io
```
גלוש ל-https://musicode1.github.io/opencode/ והוסף שרת.

### UI מותאם אישית (עם OPENCODE_APP_URL)
```bash
OPENCODE_APP_URL=https://musicode1.github.io/opencode opencode serve --port 4096
```
גלוש ל-http://localhost:4096/ — ה-UI המתורגם יוגש ישירות.

</div>
