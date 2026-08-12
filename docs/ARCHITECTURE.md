# ארכיטקטורה - אתר FLY Productions

## מחסנית טכנולוגית

| שכבה | טכנולוגיה | תפקיד |
|---|---|---|
| Frontend | Next.js (Pages Router) + TypeScript | עמודים ציבוריים סטטיים + לוח בקרה דינמי |
| Backend/DB | Supabase (Postgres) | משתמשים, הרשאות, נתונים, אחסון קבצים |
| Auth | Supabase Auth | OTP (קוד חד פעמי), לא סיסמה |
| סליקה | Grow או PayPlus | דף/iframe מאוחסן, ללא מגע בפרטי אשראי |
| Hosting | Vercel | תומך native ב-Next.js, כולל build אוטומטי |

**כלל מנחה:** עמודים ציבוריים (בית, תחרות ספציפית) = `getStaticProps`, נבנים מראש כ-HTML, מהירים ונראים לגוגל.
לוח בקרה (אחרי התחברות) = React רגיל, client-side, בדיוק כמו SPA.

---

## מבנה תיקיות (Next.js Pages Router)

```
/pages
  index.tsx                    → עמוד בית (static)
  competitions/
    [slug].tsx                 → עמוד תחרות ספציפית (static, dynamic route)
  login.tsx                    → כניסת מנהלת להקה (OTP)
  register.tsx                 → הרשמת מנהלת להקה
  dashboard/
    index.tsx                  → לוח בקרה מנהלת - התחרויות שלה
    [competitionId].tsx        → פרטי הרשמה + תשלום לתחרות ספציפית
  admin/
    index.tsx                  → טבלת אישורי משתמשים חדשים
    studios.tsx                → טבלת כל הלהקות הרשומות
    competitions/[id].tsx      → טבלת משתתפים + סטטוס תשלום (צבעים)
  api/
    payment-webhook.ts         → קליטת אישור תשלום מ-Grow/PayPlus

/components
  home/                        → קרוסלת תחרויות, קרוסלת המלצות, וכו'
  competition/                 → כרטיס תחרות, גלריית תמונות
  dashboard/
  admin/
  shared/                      → תפריט, פוטר, כפתורים

/lib
  supabase.ts                  → יצירת קליינט Supabase
  auth.ts                      → helpers להרשאות
  payments.ts                  → helpers לתקשורת עם ספק הסליקה

/types
  competition.ts
  user.ts
  registration.ts
```

---

## סכמת טבלאות ב-Supabase

### `competitions`
| שדה | טיפוס | הערות |
|---|---|---|
| id | uuid | PK |
| name | text | לדוגמה "Art Fantasy" |
| slug | text | לURL, unique |
| location | text | |
| dates | daterange / text | |
| description | text | |
| video_url | text | |
| images | text[] | קישורים ל-Supabase Storage |
| is_religious | boolean | לצורך הנחות תחרויות דתיות |
| price_tiers | jsonb | מחירים לפי טווחי תאריכים (המחיר עולה חודשיים לפני) |
| judges | jsonb | רשימת שופטים (שלב אחרי MVP) |

### `studio_managers` (מנהלות להקה)
| שדה | טיפוס | הערות |
|---|---|---|
| id | uuid | FK ל-auth.users |
| studio_name | text | |
| phone | text | |
| email | text | |
| status | text | 'pending' / 'approved' / 'rejected' |
| referral_source | text | "מאיפה שמעת עלינו" |
| preferred_competition_type | text | דתי / רגיל |

### `registrations` (הרשמות ראשוניות + מדויקות)
| שדה | טיפוס | הערות |
|---|---|---|
| id | uuid | PK |
| studio_manager_id | uuid | FK |
| competition_id | uuid | FK |
| stage | text | 'soft' (שמירת מקום) / 'confirmed' (מדויקת) |
| participants_estimate | int | |
| participants_final | int | nullable עד לאישור סופי |
| payment_status | text | 'unpaid' / 'paid' → קובע צבע בטבלת אדמין |
| payment_due_date | date | |

### `audience_registrations` (משתמש לא רשום - כניסה לאולם)
| שדה | טיפוס | הערות |
|---|---|---|
| id | uuid | |
| competition_id | uuid | FK |
| competition_date | date | יום ספציפי מתוך התחרות |
| name / phone | text | |

**RLS (Row Level Security) - קווים מנחים:**
- `competitions.price_tiers` → נראה רק ל-`studio_managers` עם `status = 'approved'`
- `registrations` → מנהלת רואה רק שורות שלה; אדמין רואה הכל
- `studio_managers` → מנהלת רואה/עורכת רק את השורה שלה; אדמין רואה הכל

---

## זרימת הרשאות (Auth Flow)

1. **הרשמה:** מנהלת ממלאת טופס → נוצרת שורה ב-`studio_managers` עם `status='pending'` → מקבלת הודעה "ממתין לאישור מנהל"
2. **אישור:** אדמין רואה טבלת ממתינים → מאשר/דוחה → `status` מתעדכן
3. **כניסה:** רק לאחר `status='approved'`, המנהלת יכולה להתחבר עם OTP (Supabase Auth תומך ב-`signInWithOtp`) ולראות מחירים
4. **הרשמה לתחרות:** לחיצה על "הרשמה כללית" יוצרת שורה ב-`registrations` עם `stage='soft'` — ללא התחייבות, רק שמירת מקום
5. **תשלום:** כשמגיע הזמן (2-3 חודשים לפני) — מתגלה כפתור תשלום, מעדכן ל-`stage='confirmed'` ומפעיל את זרימת הסליקה

---

## זרימת תשלום

1. מנהלת לוחצת "שלם" → הצד שלנו יוצר בקשת תשלום מול Grow/PayPlus (סכום + מזהה הרשמה)
2. מנהלת מועברת לדף המאוחסן של הספק, ממלאת פרטי אשראי **שם**, לא אצלנו
3. הספק שולח webhook ל-`/api/payment-webhook` עם אישור תשלום
4. המערכת מעדכנת `registrations.payment_status = 'paid'` → הצבע בטבלת האדמין הופך לירוק

---

## סדר בנייה מומלץ (שלבים)

**שלב 1 — עמודים ציבוריים (בלי backend בכלל)**
- עמוד בית לפי העיצוב שלך (תפריט, הירו, קרוסלת תחרויות, סרטון, המלצות, פרסומת, יצירת קשר)
- עמוד תחרות ספציפית (dynamic route, נתונים זמניים/מדומים בקוד)
- מטרה: לראות את העיצוב חי ומהיר

**שלב 2 — חיבור לנתונים אמיתיים**
- הקמת טבלת `competitions` ב-Supabase
- `getStaticProps` שמושך תחרויות מ-Supabase במקום נתונים מדומים

**שלב 3 — הרשמה והתחברות**
- טופס הרשמת מנהלת + OTP login
- טבלת אישורים לאדמין

**שלב 4 — לוח בקרה מנהלת**
- מחירים מותנים הרשאה, הרשמה כללית (soft)

**שלב 5 — תשלומים**
- אינטגרציית Grow/PayPlus + webhook + עדכון סטטוס

**שלב 6 — לוח בקרה אדמין**
- טבלת ביקוש כללית, טבלאות תחרויות עם צבעים, תזכורות תשלום

**מעבר ל-MVP הבא (לא עכשיו):** הזמנות וידאו/סטילס, תוכנייה אוטומטית, הצגת שופטים.

---

## החלטות פתוחות שצריך לסגור לפני שלב 5
- איזה ספק סליקה בפועל (Grow / PayPlus) — תלוי בעמלות ותמיכה בעברית
- מנגנון תזכורות תשלום (Supabase Edge Function + cron, או שירות חיצוני כמו SendGrid/Twilio ל-SMS)
