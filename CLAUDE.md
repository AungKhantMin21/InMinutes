# CLAUDE.md — InMinutes

This file is read by Claude Code at the start of every session.
Read it fully before doing anything. No exceptions.

---

## What This Project Is

**InMinutes** — an internal meeting intelligence platform for online and offline meetings. Employees upload meeting recordings and receive a speaker-labeled transcript, key points, action items with owners, and professional meeting minutes within 10–15 minutes.

---

## The Current Build Phase

**Phase 1 — MVP.** Full spec lives in `PHASE_1.md`.

Read `PHASE_1.md` before writing any code.
Check the Current Status section to find which Build Order step is active.
Do not proceed past the active step without explicit confirmation.

---

## Stack — Non-Negotiable

```
Frontend:     React 18 + Vite + React Router v6
Styling:      Tailwind CSS v3 + shadcn/ui
Backend:      Express.js + Node.js
Database:     PostgreSQL via Prisma ORM
Queue:        BullMQ + Redis
STT:          AssemblyAI SDK
AI:           Google Gemini API (gemini-2.5-flash)
Storage:      Cloudflare R2
Hosting:      Vercel (frontend) + Railway (api + worker)
HTTP:         Axios
```

If you are about to install a package not on this list, stop and ask first.

---

## Repository Layout

```
InMinutes/
├── frontend/         # React + Vite — deploys to Vercel
├── backend/          # Express + Worker — deploys to Railway
│   └── prisma/       # schema.prisma lives here
├── PHASE_1.md        # full build spec — read this first
└── CLAUDE.md         # this file
```

The frontend and backend are separate deployable units.
Never mix frontend and backend code into the same directory.

---

## How to Run Locally

```bash
# Backend API
cd backend
npm install
npx prisma generate
npm run dev           # nodemon src/index.js — port 3000

# Worker (separate terminal)
cd backend
node src/worker/index.js

# Frontend
cd frontend
npm install
npm run dev           # Vite — port 5173
```

Both backend services (api + worker) share the same `backend/` codebase
and the same `.env` file. They are separated only by their start commands.

---

## Architecture Rules

**Presigned uploads — always.**
The browser uploads audio directly to Cloudflare R2 via a presigned URL.
Express never handles raw audio bytes. Never change this.

**Worker is always separate.**
The BullMQ worker runs as its own process. Never import or call worker
logic from inside the Express API. They communicate only through the
Redis-backed queue.

**Prisma for all database access.**
Never write raw SQL or use the pg client directly. All database reads and
writes go through the Prisma client. If you need a query Prisma can't
express, ask before reaching for raw SQL.

**All API calls through `frontend/src/lib/api.js`.**
Never call axios or fetch directly from a component or page. All HTTP
calls live in `api.js`. Components call the functions exported from there.

**React state only.**
No Zustand, Redux, Context API, or any external state management. All
state is local to the component or page that owns it. If you feel the
urge to add a state library, stop and ask first.

---

## Coding Standards

### General

- Write clean, readable code — this is a production-quality codebase
- No extra `console.log` left in production code paths
- No commented-out code blocks
- No TODO comments — either build it now or put it in PHASE_1.md post-MVP
- Every function should do one thing
- Name things clearly — no abbreviations that need decoding

### Error Handling

- All Express routes wrapped in try/catch
- All worker pipeline steps wrapped in try/catch with status update on failure
- Errors returned to frontend as `{ error: "human-readable message" }`
- Never expose stack traces, internal error messages, or database errors to users
- User-facing error messages in plain English — not "Internal Server Error"

### API Responses

Always return this shape:

```js
// Success
res.json({ data: result })

// Error
res.status(4xx or 5xx).json({ error: "Human-readable message" })
```

Never return raw data without the `{ data }` wrapper.
Never return `{ success: true }` without a data payload.

### Async/Await

- Always use async/await — never .then() chains
- Always handle errors with try/catch — never unhandled promise rejections
- Use Promise.all() for independent parallel operations (extractKeyPoints +
  extractActionItems run in parallel — never sequentially)

### Prisma

- Use Prisma client singleton from `backend/src/lib/db.js` — never
  instantiate a new PrismaClient in route files or the worker
- Always handle Prisma errors in try/catch
- Never select more fields than needed — use `select` to limit payload size

### Gemini API

- All Gemini calls go through `backend/src/lib/intelligence.js` — never
  call the Gemini SDK directly from routes or the worker
- Always strip markdown fences before JSON.parse — Gemini sometimes wraps
  JSON output in ```json blocks despite instructions
- If Gemini returns malformed JSON, catch and re-throw with a descriptive error
- Use `gemini-2.5-flash` — do not change the model

### AssemblyAI

- All AssemblyAI calls go through `backend/src/lib/assemblyai.js`
- Always poll until status === "completed" — never assume instant results
- Map utterances to the standard segment shape:
  `{ speaker: "Speaker " + u.speaker, text, start, end }`

---

## Frontend Standards

### Component Rules

- One component per file
- Component filename matches export name — `UploadZone.jsx` exports `UploadZone`
- shadcn/ui components live in `src/components/ui/` — do not modify their
  internal logic, only their className overrides
- Custom components live in `src/components/`
- Pages live in `src/pages/`

### State Rules

- No prop drilling more than 2 levels — restructure instead
- No global state — if two sibling components need the same data, lift to parent
- Polling intervals always cleared on component unmount (useEffect cleanup)

### Styling Rules

- Tailwind utility classes only — no inline `style={{}}` except for
  animation keyframe references (`style={{ animation: "..." }}`)
- CSS variables defined in `index.css` — never hardcode hex values
- All text sizes from Tailwind scale — no arbitrary `text-[13px]`
- DM Mono (`font-mono`) for ALL: timestamps, status labels, speaker labels,
  metadata, badges
- Inter weight 600 for headings, 400 for body, 300 for descriptions

### shadcn/ui Override Rules

- Always override shadcn defaults to match design system
- Card: `rounded-none border-rule` — never default rounded corners
- Badge: always add `font-mono` class
- Button variants must use design system colors — not shadcn default blue
- If a shadcn component resists overriding cleanly, copy and rewrite it

---

## Design Rules

**No spinners. Ever.** Loading states use skeleton screens with `skeletonPulse`
animation. If you are about to add a spinner, stop and use a skeleton instead.

**No blank states. Ever.** Every empty state has a message and an action.
"No meetings yet. Upload your first recording above." — not blank.

**No raw errors shown to users.** Catch everything. Translate to plain English.

**Every animation has meaning.**

- `fadeIn` — content appearing (tabs, cards loading in)
- `skeletonPulse` — loading state
- `progressPulse` — active processing (transcribing, analyzing badges)
- No animations added for decoration

**Exact font mapping — check before writing any text element:**

| Content type   | Font class                            |
| -------------- | ------------------------------------- |
| Page headings  | `font-body font-semibold` (Inter 600) |
| Body text      | `font-body` (Inter 400)               |
| Descriptions   | `font-body font-light` (Inter 300)    |
| Timestamps     | `font-mono` (DM Mono)                 |
| Status badges  | `font-mono` (DM Mono)                 |
| Speaker labels | `font-mono` (DM Mono)                 |
| Metadata       | `font-mono` (DM Mono)                 |
| Button labels  | `font-body font-medium` (Inter 500)   |

---

## File-by-File Responsibilities

| File                              | Owns                                 |
| --------------------------------- | ------------------------------------ |
| `frontend/src/lib/api.js`         | All HTTP calls to backend            |
| `backend/src/lib/intelligence.js` | All Gemini API calls                 |
| `backend/src/lib/assemblyai.js`   | All AssemblyAI calls                 |
| `backend/src/lib/r2.js`           | All Cloudflare R2 operations         |
| `backend/src/lib/queue.js`        | BullMQ queue + Redis connection      |
| `backend/src/lib/db.js`           | Prisma client singleton              |
| `backend/src/worker/index.js`     | Full processing pipeline             |
| `backend/prisma/schema.prisma`    | Single source of truth for DB schema |

Never put logic that belongs in one of these files anywhere else.

---

## What To Do When Stuck

1. Re-read `PHASE_1.md` — the answer is usually there
2. Check the File-by-File Responsibilities above — make sure logic is in
   the right place
3. Check the Never Do list in `PHASE_1.md` — you may be about to do
   something explicitly blocked
4. If genuinely unclear, ask — do not guess and implement something wrong

---

## Never Do

```
✗ Read PHASE_1.md partially — read it fully before any session
✗ Skip ahead in the Build Order without confirmation
✗ Install packages not in the approved stack without asking
✗ Write raw SQL or use pg directly — Prisma only
✗ Call axios or fetch from a component — use api.js
✗ Call Gemini SDK from routes or worker — use intelligence.js
✗ Route audio bytes through Express — presigned R2 URLs always
✗ Run worker logic inside the API process
✗ Add Zustand, Redux, or any state management library
✗ Add any UI library other than shadcn/ui
✗ Hardcode hex values — CSS variables always
✗ Use spinners — skeleton screens always
✗ Leave blank screens — empty states always
✗ Show raw errors to users — human-readable messages always
✗ Leave console.log in production code paths
✗ Leave TODO comments in code
✗ Change the AI model from gemini-2.5-flash
✗ Build anything outside the active Build Order step
```

---

## Session Start Checklist

Every Claude Code session begins with:

```
1. Read CLAUDE.md fully
2. Read PHASE_1.md fully
3. Check Current Status in PHASE_1.md
4. Confirm active Build Order step with the developer
5. Only then: start writing code
```

If you skip any of these steps, stop and go back.
