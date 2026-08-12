# AttendEase — Event Check-In System

> **Job Application Submission** · Built as part of a take-home technical assessment.

---

## 🔗 Links

| | |
|---|---|
| **Live URL** | [attend-ease-vert.vercel.app](https://attend-ease-vert.vercel.app) |
| **GitHub Repo** | [github.com/asrnb/attend-ease](https://github.com/asrnb/attend-ease) |

---

## ✅ Task Requirements

| Requirement | Status |
|---|---|
| Enter phone number → tap button → see `Checked in: [Name]` | ✅ Done |
| Running count goes up by 1 on each new check-in | ✅ Done |
| Real backend (Supabase) — not localStorage | ✅ Done |
| **Bonus:** Unknown phone → ask for name → add as new attendee | ✅ Done |
| **Extra:** Block duplicate check-ins for the same attendee | ✅ Done |

---

## 🛠️ Tech Stack

| Layer | Choice | Why |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Easy Vercel deployment, React component model, no extra config needed |
| **Styling** | CSS Modules (Vanilla CSS) | Zero dependencies, scoped styles, full control over neo-brutalist design |
| **Backend/DB** | Supabase (PostgreSQL) | Instant REST API, real-time ready, free tier, no server setup |
| **Deployment** | Vercel | One-click deploy from GitHub, auto-detects Next.js, handles env vars |
| **Font** | Inter (Google Fonts) | Clean, modern, works great at heavy weights |

---

## 🗄️ Database Design

Two tables in Supabase (PostgreSQL):

```sql
-- Stores unique attendees
CREATE TABLE attendees (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL UNIQUE,   -- enforces one record per phone number
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Stores each individual check-in event
CREATE TABLE checkins (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attendee_id   UUID REFERENCES attendees(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ DEFAULT now()
);
```

Row Level Security (RLS) is enabled on both tables with a permissive public policy, keeping the app stateless and credential-free on the frontend (just the anon key).

---

## 🔄 Project Flow & Architecture

### User Flow

```
User enters phone number
        │
        ▼
 Search attendees table by phone
        │
   ┌────┴────┐
 Found     Not found
   │             │
   ▼             ▼
Already      Show name
checked in?  input field
   │             │
 Yes    No       ▼
  │      │   Create attendee record
  │      │   + first check-in record
  │      ▼       │
  │   Create     │
  │   check-in ◄─┘
  │   record
  │      │
  ▼      ▼
"Already  "Checked in:
 checked   [Name]" ✅
 in" ⚠️
        │
        ▼
   Count updates
   (unique attendees
    who checked in)
```

### UI States

The app has **4 distinct UI states**, each with its own visual treatment:

| State | Trigger | Visual |
|---|---|---|
| `phone` | Initial / reset | Phone input + yellow CTA button |
| `newuser` | Phone not found | Blue banner + name input + register button |
| `success` | Successful check-in | Green badge + attendee name + confetti feel |
| `already` | Duplicate attempt | Yellow clock badge + warning message |

### Component Structure

```
app/
├── layout.js          → Root layout, SEO metadata, global font
├── page.js            → Single-page React component (all 4 states)
├── page.module.css    → Scoped CSS (neo-brutalist design system)
└── globals.css        → CSS reset + dot-grid background

lib/
└── supabase.js        → Supabase client singleton (reads env vars)
```

All Supabase logic is in plain async functions at the top of `page.js` — no extra abstraction layers needed for a project this size:

```js
findAttendee(phone)      // SELECT by phone
hasCheckedIn(attendeeId) // COUNT checkins for this attendee
createCheckIn(attendeeId)// INSERT into checkins
registerAttendee(name, phone) // INSERT into attendees
fetchCount()             // COUNT unique attendee_ids in checkins
```

---

## 🎨 Design Approach

I chose a **Neo-Brutalist** aesthetic:

- Off-white / cream background (`#FAFAF0`) with a subtle CSS dot grid
- `3–4px solid black` borders on every interactive element
- Hard offset box-shadows (`6px 6px 0 #000`) instead of blur-based shadows
- Sharp corners — zero `border-radius` throughout
- Heavy typography — Inter 900 weight, uppercase labels
- Accent palette: **yellow** (primary CTA), **green** (success), **pink** (error), **blue** (new user)
- Floating geometric shapes (squares, circles, rectangles) in the background with independent CSS animations — each shape floats, tilts, drifts, or spins to give the page life while staying true to the design language

Button interactions use a physical "press" metaphor — hovering lifts the element (`translate(-2px, -2px)` + larger shadow), clicking pushes it down (`translate(2px, 2px)` + smaller shadow).

---

## 🚧 Problems Encountered & How I Fixed Them

### 1. Interpreting "running count"

**Problem:** The task says the count should "go up by 1" on check-in. The ambiguity was: does the count represent *total check-in button presses* or *unique people who have checked in*?

**Decision:** I went with **unique attendees checked in**, not total attempts. This makes more practical sense for an event — you want to know how many distinct people are in the room, not how many times someone tapped the button.

**Implementation:** Instead of `SELECT COUNT(*) FROM checkins`, I fetch all `attendee_id` values and deduplicate them client-side using a JavaScript `Set`:

```js
const { data } = await supabase.from('checkins').select('attendee_id');
const unique = new Set(data.map(r => r.attendee_id));
return unique.size;
```

This also means even if a bug somehow created a duplicate record, the count stays accurate.

---

### 2. Preventing duplicate check-ins

**Problem:** The original spec only mentioned checking in an existing user — it didn't explicitly say what happens if they try to check in *again*. Showing a generic error felt bad UX.

**Solution:** Added a dedicated `already` UI state with its own visual treatment (yellow clock badge, clear message, "Try another number" button). The check is a simple `COUNT` query against the `checkins` table filtered by `attendee_id`.

```js
async function hasCheckedIn(attendeeId) {
  const { count } = await supabase
    .from('checkins')
    .select('*', { count: 'exact', head: true })
    .eq('attendee_id', attendeeId);
  return count > 0;
}
```

---

### 3. Environment variable exposure

**Problem:** When I initially wired up Supabase credentials, I hardcoded them directly in `app.js` (the original plain HTML version). This is a security anti-pattern — anyone who views source can see your keys.

**Solution:** In the Next.js version, credentials live in `.env.local` (which is gitignored by default) and are referenced as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Vercel reads them from the project dashboard at deploy time — the actual values never touch the repository.

---

### 4. Started with plain HTML, then migrated to Next.js

**Problem:** I initially built the project as a plain `index.html` + `style.css` + `app.js` — fast to prototype, but not ideal for GitHub + Vercel deployment (no build step, no env var handling, CDN Supabase client).

**Solution:** Migrated to Next.js mid-project. The migration was clean because all logic was already separated into pure async functions — I moved them directly into `page.js` with minimal changes. CSS was ported to CSS Modules (scoped, no class name conflicts). The Supabase CDN import became a proper npm package (`@supabase/supabase-js`).

---

### 5. RLS blocking public queries

**Problem:** After creating the Supabase tables, queries returned empty results even though data existed. The issue was Row Level Security (RLS) being enabled with no policies — it blocks all access by default.

**Solution:** Added permissive `FOR ALL` policies to both tables:

```sql
CREATE POLICY "Allow all" ON attendees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON checkins  FOR ALL USING (true) WITH CHECK (true);
```

For a production system I would tighten this with authenticated user policies, but for a public event kiosk the anon key + permissive RLS is appropriate.

---

## ⚙️ Local Development

```bash
# 1. Clone the repo
git clone https://github.com/asrnb/attend-ease.git
cd attend-ease

# 2. Install dependencies
npm install

# 3. Set up environment variables
# Create a .env.local file with:
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# 4. Run Supabase SQL (in Supabase SQL Editor):
# See Database Design section above

# 5. Start dev server
npm run dev
# → http://localhost:3000
```

---

## 🚀 Deployment (Vercel)

1. Push repo to GitHub
2. Import project at [vercel.com/new](https://vercel.com/new)
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy — Vercel auto-detects Next.js, no config needed

---

## 📝 Notes

- The `phone` field is stored as `TEXT` (not `INT`) to preserve leading zeros common in Philippine mobile numbers (e.g., `09171234567`)
- The `attendees.phone` column has a `UNIQUE` constraint enforced at the database level — the app also handles the `23505` Postgres error code for a graceful duplicate message
- All 4 UI states animate in with a subtle `fadeInUp` — the only animation that isn't a floating background shape

---

*Built in ~1.5 hours as part of a technical assessment.*
