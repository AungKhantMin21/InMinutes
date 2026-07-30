# PHASE_1.md — InMinutes MVP Build Context

---

## What You Are Building

**Meeting Intel** — an internal meeting intelligence platform that automatically
transcribes, analyzes, and generates structured meeting minutes from uploaded
recordings.

The product solves one problem: meeting knowledge is lost. Notes are incomplete,
action items are forgotten, and attendees leave with different understandings of
what was decided. InMinutes fixes this by processing any meeting recording
into a speaker-labeled transcript, key points, action items with owners, and
professional meeting minutes — automatically, within 10–15 minutes.

**One flow in this MVP:**

Upload a meeting recording → background pipeline processes it → human reviews
and edits the output → confirms → final output saved and ready to share.

---

## Tech Stack

```
Frontend:     React 18 + Vite + React Router v6
Styling:      Tailwind CSS v3 + shadcn/ui (copy-paste components — not a dependency)
Backend:      Express.js + Node.js
Database:     PostgreSQL (Railway managed)
ORM:          Prisma
Queue:        BullMQ + Redis (Railway managed)
STT:          AssemblyAI SDK — transcription + speaker diarization
AI:           Google Gemini API — gemini-2.5-flash (all intelligence tasks)
File Storage: Cloudflare R2 (S3-compatible)
Hosting:      Vercel (frontend) + Railway (backend API + worker)
HTTP:         Axios
```

**Auth packages:**

- `bcryptjs` — password hashing
- `jsonwebtoken` — JWT generation and verification
- No Passport.js, no Auth0, no NextAuth — custom JWT only

**Dependency rules:**

- UI: shadcn/ui only — no MUI, Chakra, Radix (standalone), Ant Design, or Headless UI
- ORM: Prisma only — no Sequelize, Drizzle, Knex, or raw pg queries
- State: React useState + useEffect only — no Zustand, Redux, Jotai, or Context API
- Question every npm install before running it

---

## Why These Choices

**shadcn/ui** — not a traditional dependency. Components are copied directly
into your codebase (`src/components/ui/`). You own and can modify every line.
Tailwind-based, no bundle bloat. Gives you Tabs, Table, Badge, Button, Card,
and UploadZone primitives out of the box — saves approximately 3–4 days of
building from scratch.

**Prisma** — schema as code, type-safe queries, migrations built in. When
Phase 2 adds new columns or tables, `prisma migrate dev` handles it cleanly.
The "no ORM" approach only makes sense for learning exercises — for a
production-grade tool you want to maintain, Prisma is correct.

**No state management library** — the app has two pages. Home has a meeting
list. Meeting page has status + tabbed output. All state is local to each page.
No shared global state is needed in Phase 1. Revisit if Phase 2 adds auth.

---

## Project Structure

```
meeting-intel/
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── components.json             # shadcn/ui config
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── lib/
│       │   ├── api.js              # ALL axios calls live here — nowhere else
│       │   └── utils.js            # shadcn/ui cn() helper + shared utilities
│       ├── components/
│       │   ├── ui/                 # shadcn/ui copied components
│       │   │   ├── button.jsx
│       │   │   ├── card.jsx
│       │   │   ├── badge.jsx
│       │   │   ├── tabs.jsx
│       │   │   ├── table.jsx
│       │   │   └── input.jsx
│       │   ├── UploadZone.jsx      # drag-and-drop + file picker
│       │   ├── MeetingList.jsx     # list of past meetings
│       │   ├── StatusBadge.jsx     # wraps shadcn Badge with status logic
│       │   ├── SpeakerMapper.jsx   # speaker label → real name (autocomplete search)
│       │   ├── AttendeeList.jsx    # attendee add/remove with employee+person search
│       │   ├── TranscriptView.jsx  # speaker-labeled transcript (read-only)
│       │   ├── ActionItemsTable.jsx # wraps shadcn Table
│       │   └── MinutesView.jsx     # minutes markdown + attendees + metadata footer
│       ├── hooks/
│       │   └── useAuth.js          # auth state — employee, login, logout, register
│       └── pages/
│           ├── Login.jsx           # email + password login form
│           ├── Register.jsx        # name + email + password + job title registration
│           ├── Home.jsx            # meeting list + upload zone + sign-out
│           ├── Review.jsx          # 2-step HITL: StepTranscript + StepOutput
│           └── Meeting.jsx         # single meeting — read-only tabbed output
│
└── backend/
    ├── src/
    │   ├── index.js                # Express app entry
    │   ├── middleware/
    │   │   └── auth.js             # JWT verification middleware — protects all routes
    │   ├── routes/
    │   │   ├── auth.js             # register + login + me endpoints
    │   │   ├── upload.js           # presign + confirm endpoints
    │   │   ├── meetings.js         # CRUD + status + transcript + output + HITL review
    │   │   └── people.js           # employee search + person search endpoints
    │   ├── lib/
    │   │   ├── queue.js            # BullMQ queue definition + Redis connection
    │   │   ├── r2.js               # Cloudflare R2 — presigned upload + download URLs
    │   │   ├── assemblyai.js       # STT + speaker diarization
    │   │   └── intelligence.js     # Gemini API — key points, action items, minutes
    │   └── worker/
    │       └── index.js            # BullMQ worker — runs as separate Railway service
    └── prisma/
        └── schema.prisma           # Prisma schema — single source of truth for DB
```

---

## Environment Variables

```bash
# backend/.env
PORT=3000
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
GEMINI_API_KEY=
ASSEMBLYAI_API_KEY=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=in-minutes
FRONTEND_URL=http://localhost:5173
JWT_SECRET=                         # minimum 32 characters, random string

# frontend/.env
VITE_API_URL=http://localhost:3000
```

---

## Database Schema (Prisma)

```prisma
// backend/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Auth ────────────────────────────────────────────────────────────────────

model Employee {
  id           String    @id @default(cuid())
  name         String
  email        String    @unique
  passwordHash String
  role         String    @default("member")
  // "member" | "admin"
  // admin: can see all meetings, manage users, merge person records
  // member: can see own meetings only
  jobTitle     String?
  // e.g. "Systems Specialist", "Finance Director"
  createdAt    DateTime  @default(now())

  person       Person?   @relation(fields: [personId], references: [id])
  personId     String?   @unique
  // linked to person registry on register — auto-created

  meetings     Meeting[]
  // meetings this employee uploaded
}

// ─── Person Registry ─────────────────────────────────────────────────────────

model Person {
  id            String    @id @default(cuid())
  canonicalName String
  // the "real" name — always updated to latest confirmed spelling
  aliases       String[]
  // all name variants ever seen: ["set let", "Set-Let", "S. Let"]
  email         String?
  jobTitle      String?
  createdAt     DateTime  @default(now())

  employee      Employee?
  // linked to Employee if this person has an account
  participants  MeetingParticipant[]
}

// ─── Meetings ─────────────────────────────────────────────────────────────────

model Meeting {
  id           String    @id @default(cuid())
  title        String
  source       String    @default("upload")
  // upload | teams (Phase 2)
  audioKey     String?
  // Cloudflare R2 object key
  status       String    @default("pending")
  // pending | uploading | transcribing | transcript_reviewing | analyzing | reviewing | done | failed | discarded
  // "transcript_reviewing" = transcription done, waiting for human to review transcript
  // "reviewing"            = AI analysis done, waiting for human to review output
  // "done"                 = human confirmed, output is final and read-only
  // "discarded"            = human discarded on review — soft state, record kept
  errorMsg     String?
  attendees    Json      @default("[]")
  // [{personId: string|null, name: string}] — set by human during Step 2 review
  createdAt    DateTime  @default(now())
  completedAt  DateTime?

  uploadedBy   Employee? @relation(fields: [employeeId], references: [id])
  employeeId   String?
  // optional — null for meetings uploaded before auth was added

  transcript   Transcript?
  output       Output?
  participants MeetingParticipant[]
}

model Transcript {
  id               String   @id @default(cuid())
  meetingId        String   @unique
  meeting          Meeting  @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  rawText          String
  // plain text from AssemblyAI
  diarizedSegments Json
  // [{speaker, text, start, end}]
  // speaker labels replaced with real names after Step 1 HITL confirm
  createdAt        DateTime @default(now())
}

model Output {
  id                String   @id @default(cuid())
  meetingId         String   @unique
  meeting           Meeting  @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  keyPoints         Json
  // string[]
  actionItems       Json
  // [{task, owner, deadline}]
  meetingMinutes    String
  minutesPreparedBy String?
  // set by human during Step 2 review — defaults to logged-in employee name
  datePrepared      String?
  // set by human during Step 2 review — defaults to today's date
  createdAt         DateTime @default(now())
}

// ─── Participant linking ──────────────────────────────────────────────────────

model MeetingParticipant {
  id           String   @id @default(cuid())
  meetingId    String
  meeting      Meeting  @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  personId     String
  person       Person   @relation(fields: [personId], references: [id])
  speakerLabel String
  // "Speaker A", "Speaker B" — the original AssemblyAI label
  createdAt    DateTime @default(now())

  @@unique([meetingId, speakerLabel])
  // one person per speaker label per meeting
}
```

**Migration commands:**

```bash
# First run — creates tables from schema
npx prisma migrate dev --name init

# Generate Prisma client after any schema change
npx prisma generate

# Production — run on Railway deploy
npx prisma migrate deploy
```

---

## Infrastructure

### Services on Railway

```
Railway Project: in-minutes
├── api       → node src/index.js          (Express API server)
├── worker    → node src/worker/index.js   (BullMQ worker — long-running)
├── postgres  → managed plugin
└── redis     → managed plugin
```

### Cloudflare R2

- S3-compatible — uses AWS SDK v3
- Browser uploads direct via presigly to R2ned URL (never through Express)
- CORS must allow PUT from localhost:5173 and Vercel production domain
- Audio files stay in R2 permanently — never moved or deleted in MVP

### Upload Flow (why presigned URLs)

Express never handles raw audio bytes. Large files routed through Express
are slow and waste Railway bandwidth limits.

```
Browser → POST /api/upload/presign  → Express creates Meeting row, returns R2 presigned URL
Browser → PUT audio directly to R2  (Express not involved)
Browser → POST /api/upload/confirm/:id → Express queues the BullMQ job
Worker  → fetches audio from R2 via presigned download URL → processes → saves via Prisma
```

---

## API Contract

All endpoints prefixed `/api`.
All responses: `{ data, error }` shape.

```
── Auth (public — no token required) ──────────────────────────────────────────

POST  /api/auth/register   { name, email, password, jobTitle }
                           — hashes password, creates Employee + Person records
                           → { token, employee: { id, name, email, role } }

POST  /api/auth/login      { email, password }
                           → { token, employee: { id, name, email, role } }

GET   /api/auth/me         — requires token
                           → { employee: { id, name, email, role, jobTitle } }

── Meetings (all require Authorization: Bearer <token>) ───────────────────────

POST  /api/upload/presign                { filename, contentType, title }
                                         — creates Meeting with employeeId from token
                                         → { meetingId, uploadUrl, audioKey }

POST  /api/upload/confirm/:id            → { status: "queued" }

GET   /api/meetings                      → meetings uploaded by current employee
                                           (admin sees all)

GET   /api/meetings/:id                  → Meeting row (status, title, attendees, timestamps)
GET   /api/meetings/:id/transcript       → { rawText, diarizedSegments }
GET   /api/meetings/:id/output           → { keyPoints, actionItems, meetingMinutes,
                                             minutesPreparedBy, datePrepared }

── Two-Step HITL Review ────────────────────────────────────────────────────────

POST  /api/meetings/:id/review/confirm-transcript
                                         { speakerMap }
                                         — applies speakerMap to diarizedSegments in DB
                                         — queues BullMQ "analyze" job
                                         — status → "analyzing"
                                         → { status: "analyzing" }

POST  /api/meetings/:id/review/confirm   { speakerMap, meetingMinutes, actionItems,
                                           attendees, minutesPreparedBy, datePrepared }
                                         — attendees: [{personId, name}]
                                           creates Person records for manual entries (personId null)
                                         — saves attendees to Meeting.attendees
                                         — saves minutesPreparedBy + datePrepared to Output
                                         — creates MeetingParticipant rows per speakerMap entry
                                         — creates/links Person records per speaker
                                         — status → "done", completedAt set
                                         → { status: "done" }

POST  /api/meetings/:id/review/discard   — status → "discarded"
                                         → { status: "discarded" }

── People Search (require Authorization: Bearer <token>) ───────────────────────

GET   /api/people/employees?q=           → [{id, name, jobTitle, personId}] (max 8)
GET   /api/people/persons?q=             → [{id, canonicalName, jobTitle, email}] (max 8)
```

---

## Worker Pipeline

The worker runs as a **separate Railway service** (same repo, different start
command). It must run continuously — it cannot be a serverless function.

The worker handles two BullMQ job types dispatched on `job.name`.

**Job type: `"process"` — Transcription only**

```
Job received: { meetingId, audioKey }
      ↓
Status → "transcribing"
      ↓
getDownloadUrl(audioKey) → presigned R2 URL
      ↓
AssemblyAI: transcribeWithDiarization(audioUrl)
  → { rawText, segments: [{speaker, text, start, end}] }
      ↓
Save Transcript via Prisma
      ↓
Status → "transcript_reviewing"
      ↓
Frontend polling detects "transcript_reviewing" → redirects to /meetings/:id/review (Step 1)
```

**Job type: `"analyze"` — AI Intelligence only (queued by confirm-transcript endpoint)**

```
Job received: { meetingId, title }
      ↓
Status → "analyzing"
      ↓
Read diarizedSegments from Transcript table (already has real speaker names)
      ↓
formatTranscript(segments) → "Real Name: ...\nReal Name: ..."
      ↓
Gemini API (parallel):
  extractKeyPoints(formatted)   → string[]
  extractActionItems(formatted) → [{task, owner, deadline}]
      ↓
generateMinutes(formatted, keyPoints, actionItems, title) → string
  — prompt explicitly excludes: Attendees, Minutes Prepared By, Date Prepared
      ↓
Save Output via Prisma (draft — not yet confirmed by human)
      ↓
Status → "reviewing"
      ↓
Frontend polling detects "reviewing" → redirects to /meetings/:id/review (Step 2)
```

**On any error (either job type):**

```
Status → "failed", errorMsg = error.message
```

---

## AI Prompts

These live in `backend/src/lib/intelligence.js`.
Do not simplify. Do not genericize. Use exactly as written.

### Gemini Client Setup

```js
// backend/src/lib/intelligence.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
// Note: gemini-2.5-flash is deprecated for new API users — use gemini-2.5-flash-lite

async function generate(prompt) {
  const result = await model.generateContent(prompt);
  return result.response.text();
}
```

### Key Points Extraction

```
Extract the 5-8 most important key points from this meeting transcript.
Return ONLY a JSON array of strings. No preamble. No markdown fences.
Example: ["Point 1", "Point 2"]

Transcript:
{transcript}
```

### Action Items Extraction

```
Extract all action items, tasks, and assignments from this meeting transcript.
Return ONLY a JSON array of objects. No preamble. No markdown fences.
Format:
[{"task": "description", "owner": "person responsible or speaker label", "deadline": "deadline if mentioned or null"}]

Transcript:
{transcript}
```

### Meeting Minutes Generation

```
Generate professional meeting minutes based on the following.

Meeting Title: {title}

Key Points:
{keyPoints as bullet list}

Action Items:
{actionItems as bullet list — task | owner | deadline}

Full Transcript:
{transcript}

Format the minutes with exactly these sections and no others:
1. Meeting Summary
2. Key Points Discussed
3. Decisions Made
4. Action Items & Assignments
5. Next Steps

Rules:
- Do NOT include an Attendees section or attendees list
- Do NOT include "Minutes Prepared By", "Date Prepared", or any signature block
- Do NOT include meeting date, time, or location headers
- Professional business language. Clear and concise.
```

**Why these rules exist:** Attendees, Minutes Prepared By, and Date Prepared are
collected separately by the application during the Step 2 HITL review and stored
in structured fields. Generating them in the minutes markdown would create duplicates.

### JSON Parse Safety

Gemini sometimes wraps JSON in markdown fences despite instructions.
Always strip before parsing:

````js
function parseJSON(text) {
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}
````

---

## AssemblyAI Integration

```js
// Diarized segment shape returned from AssemblyAI
{
  speaker: "Speaker A",   // "Speaker " + utterance.speaker (A, B, C...)
  text: "...",
  start: 1234,            // milliseconds
  end: 5678               // milliseconds
}

// Config used
{
  audio_url: presignedR2Url,
  speaker_labels: true,
  speakers_expected: 4    // reasonable default for business meetings
}
```

---

## shadcn/ui Usage

shadcn/ui components are copied into `frontend/src/components/ui/` — they
are not installed as a package dependency. They are your code.

**Install shadcn/ui CLI once:**

```bash
cd frontend
npx shadcn@latest init
# Choose: Vite, Tailwind, src/components/ui, no CSS variables override
```

**Add components as needed:**

```bash
npx shadcn@latest add button card badge tabs table
```

**Components used in this app and where:**

| Component | Used in                                   |
| --------- | ----------------------------------------- |
| Button    | UploadZone, MinutesView, everywhere       |
| Card      | MeetingList cards, Meeting page container |
| Badge     | StatusBadge wrapper                       |
| Tabs      | Meeting page output tabs                  |
| Table     | ActionItemsTable                          |

**Customization rule:** Modify shadcn components freely to match the design
system. They are in your codebase — treat them as your own files.

---

## Design System

Follow this exactly. No deviations.

### Fonts

```html
<!-- frontend/index.html <head> -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap"
  rel="stylesheet"
/>
```

| Font    | Role | Usage                                               |
| ------- | ---- | --------------------------------------------------- |
| Inter   | Body | ALL UI text, headings, labels, buttons, body copy   |
| DM Mono | Mono | Timestamps, status badges, speaker labels, metadata |

**Rules — no exceptions:**

- Inter `weight 300` → body copy, descriptions
- Inter `weight 400` → default UI text
- Inter `weight 500` → section labels, card titles
- Inter `weight 600` → page headings, primary actions only
- DM Mono → ALL metadata, timestamps, speaker labels, status badges
- NEVER use system-ui, Roboto, or any unlisted font

### CSS Variables

```css
/* frontend/src/index.css */
:root {
  --surface: #f9f8f6;
  --white: #ffffff;
  --ground: #f1efea;
  --rule: #e3dfd7;
  --rule-hi: #c9c4b9;
  --ink: #141210;
  --ink-2: #3e3c38;
  --ink-3: #8d8a81;
  --ink-4: #bbb8b1;
  --signal: #1a56db;
  --signal-light: #eff4ff;
  --success: #166534;
  --success-light: #f0fdf4;
  --warning: #92400e;
  --warning-light: #fffbeb;
  --danger: #991b1b;
  --danger-light: #fef2f2;
  --font-body: "Inter", sans-serif;
  --font-mono: "DM Mono", monospace;
}

body {
  background: var(--surface);
  color: var(--ink);
  font-family: var(--font-body);
  font-weight: 400;
  font-size: 14px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

h1,
h2,
h3,
h4 {
  font-family: var(--font-body);
  font-weight: 600;
  letter-spacing: -0.01em;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes skeletonPulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}

@keyframes progressPulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}
```

### Tailwind Config

```js
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#F9F8F6",
        white: "#FFFFFF",
        ground: "#F1EFEA",
        rule: "#E3DFD7",
        "rule-hi": "#C9C4B9",
        ink: "#141210",
        "ink-2": "#3E3C38",
        "ink-3": "#8D8A81",
        "ink-4": "#BBB8B1",
        signal: "#1A56DB",
        "signal-light": "#EFF4FF",
        success: "#166534",
        "success-light": "#F0FDF4",
        warning: "#92400E",
        "warning-light": "#FFFBEB",
        danger: "#991B1B",
        "danger-light": "#FEF2F2",
      },
      fontFamily: {
        body: ["Inter", "sans-serif"],
        mono: ["DM Mono", "monospace"],
      },
    },
  },
};
```

### Component Patterns

**shadcn Card — override default styles to match design system:**

```jsx
// Sharp corners, surface background, rule border
<Card className="rounded-none border-rule bg-white">
  <CardContent className="p-4">...</CardContent>
</Card>
```

**StatusBadge — wraps shadcn Badge:**

```jsx
// Always DM Mono font
const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    className: "font-mono bg-ground text-ink-3 border-rule",
  },
  uploading: {
    label: "Uploading",
    className: "font-mono bg-ground text-ink-3 border-rule",
  },
  transcribing: {
    label: "Transcribing",
    className: "font-mono bg-signal-light text-signal border-signal/20",
    style: { animation: "progressPulse 2s ease infinite" },
  },
  analyzing: {
    label: "Analyzing",
    className: "font-mono bg-signal-light text-signal border-signal/20",
    style: { animation: "progressPulse 2s ease infinite" },
  },
  reviewing: {
    label: "Awaiting Review",
    className: "font-mono bg-warning-light text-warning border-warning/20",
    style: { animation: "progressPulse 2s ease infinite" },
  },
  done: {
    label: "Done",
    className: "font-mono bg-success-light text-success border-success/20",
  },
  failed: {
    label: "Failed",
    className: "font-mono bg-danger-light text-danger border-danger/20",
  },
  discarded: {
    label: "Discarded",
    className: "font-mono bg-ground text-ink-4 border-rule",
  },
};
```

**Speaker label (TranscriptView):**

```jsx
<span className="font-mono text-[9px] tracking-[0.14em] uppercase text-ink-4">
  Speaker A
</span>
```

**Section labels:**

```jsx
<div className="flex items-center gap-3 mb-4">
  <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-ink-4 whitespace-nowrap">
    Label
  </span>
  <div className="flex-1 h-px bg-rule" />
</div>
```

**Skeleton — skeletonPulse, never spinners:**

```jsx
<div
  className="bg-ground h-4 w-32 rounded"
  style={{ animation: "skeletonPulse 1.5s ease infinite" }}
/>
```

---

## Build Order

Build in this exact sequence.
Do not move to the next step until the current one is complete and working.

---

### 01 — Project Scaffold

```
□ Create repo with frontend/ and backend/ directories
□ Initialize React + Vite in frontend/
□ Install and configure Tailwind with the exact config above
□ Add fonts to frontend/index.html
□ Paste CSS variables and keyframes into frontend/src/index.css
□ Initialize shadcn/ui: npx shadcn@latest init
□ Add shadcn components: button card badge tabs table
□ Initialize Express in backend/
□ Install backend dependencies:
    express cors dotenv bullmq ioredis uuid
    @prisma/client prisma
    @google/generative-ai assemblyai
    @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
□ Install dev dependencies:
    nodemon (backend)
□ Create .env files for both frontend and backend
□ Initialize git — first commit
```

**Definition of done:** Both dev servers start without errors. Tailwind
classes apply. Fonts load. shadcn Button renders correctly.

---

### 02 — Database + Infrastructure

```
□ Create backend/prisma/schema.prisma with the schema above
□ Run: npx prisma migrate dev --name init
□ Run: npx prisma generate
□ Verify all 3 tables exist in Railway Postgres dashboard
□ Create Cloudflare R2 bucket: meeting-intel
□ Set R2 CORS policy:
    AllowedOrigins: [http://localhost:5173, Vercel production domain]
    AllowedMethods: [PUT]
    AllowedHeaders: [Content-Type]
□ Create backend/src/lib/r2.js — getUploadUrl + getDownloadUrl helpers
□ Create backend/src/lib/queue.js — BullMQ Queue + Redis connection
□ Verify Prisma connects: log a prisma.meeting.count() on server startup
□ Verify Redis connects: log on successful BullMQ connection
```

**Definition of done:** Server starts and logs Prisma + Redis connections.
R2 bucket exists with CORS configured. `prisma.meeting.count()` returns 0.

---

### 03 — Upload Pipeline

```
□ POST /api/upload/presign
    — validate: filename, contentType, title required
    — prisma.meeting.create({ title, audioKey, status: "uploading" })
    — getUploadUrl(audioKey, contentType) → presigned R2 URL
    — return { meetingId, uploadUrl, audioKey }

□ POST /api/upload/confirm/:id
    — prisma.meeting.update({ status: "transcribing" })
    — meetingQueue.add("process", { meetingId, audioKey, title })
    — return { status: "queued" }

□ Worker scaffold (backend/src/worker/index.js)
    — connects to BullMQ queue
    — logs job received: { meetingId }
    — prisma.meeting.update({ status: "done" }) — stub only, no real processing
    — this stub is replaced entirely in Build Order 04

□ GET /api/meetings
    — prisma.meeting.findMany({ orderBy: { createdAt: "desc" } })
□ GET /api/meetings/:id
    — prisma.meeting.findUnique({ where: { id } })

□ frontend/src/lib/api.js — axios instance with VITE_API_URL base
□ UploadZone.jsx:
    — drag and drop OR click to pick file
    — accepted: .mp4 .webm .mp3 .wav .m4a (max 500MB, validate client-side)
    — title input field
    — upload progress bar (XMLHttpRequest for progress events)
    — on complete: call confirm → navigate to /meetings/:id
□ MeetingList.jsx:
    — fetch GET /api/meetings on mount
    — render shadcn Cards: title, StatusBadge, createdAt (DM Mono)
    — click → navigate to /meetings/:id
□ Home.jsx:
    — UploadZone at top
    — section label "Recent Meetings"
    — MeetingList below
□ React Router: / → Home, /meetings/:id → Meeting (stub page for now)
```

**Definition of done:** Upload a real audio file through the UI. File
appears in R2 bucket. Meeting row in Postgres with status "done" (stub).
Meeting appears in the list. Clicking it navigates to /meetings/:id.

---

### 04 — Worker: Transcription + Intelligence

```
□ backend/src/lib/assemblyai.js
    — AssemblyAI SDK client
    — transcribeWithDiarization(audioUrl):
        config: { audio_url, speaker_labels: true, speakers_expected: 4 }
        polls until transcript.status === "completed"
        maps utterances → [{ speaker: "Speaker " + u.speaker, text, start, end }]
        returns { rawText: transcript.text, segments }

□ backend/src/lib/intelligence.js
    — Gemini client: gemini-2.5-flash
    — generate(prompt) helper with JSON fence stripping (parseJSON)
    — formatTranscript(segments) → "Speaker A: ...\nSpeaker B: ..."
    — extractKeyPoints(transcript) → string[]     (parallel in worker)
    — extractActionItems(transcript) → [{task, owner, deadline}]  (parallel)
    — generateMinutes(transcript, keyPoints, actionItems, title) → string
    — use prompts exactly as defined in the AI Prompts section above

□ Worker — replace stub with full pipeline:
    — prisma.meeting.update({ status: "transcribing" })
    — getDownloadUrl(audioKey)
    — transcribeWithDiarization(url) → { rawText, segments }
    — prisma.transcript.create({ meetingId, rawText, diarizedSegments: segments })
    — prisma.meeting.update({ status: "analyzing" })
    — formatTranscript(segments)
    — Promise.all([extractKeyPoints, extractActionItems])
    — generateMinutes(...)
    — prisma.output.create({ meetingId, keyPoints, actionItems, meetingMinutes })
    — prisma.meeting.update({ status: "reviewing" })
    — catch: prisma.meeting.update({ status: "failed", errorMsg: error.message })

□ GET /api/meetings/:id/transcript
    — prisma.transcript.findUnique({ where: { meetingId: id } })
□ GET /api/meetings/:id/output
    — prisma.output.findUnique({ where: { meetingId: id } })
```

**Definition of done:** Upload a real meeting recording (a 2-minute test
call is fine). Worker logs each step. Prisma has Transcript + Output rows.
Meeting status is "done". Verify key points, action items, and minutes
look correct by reading directly from the database.

---

### 05 — Review Page (Human-in-the-Loop) — Two-Step HITL

The HITL review is split into two steps. The worker first sets status to
`transcript_reviewing` after transcription. The user reviews and confirms
the transcript in Step 1, which triggers AI analysis. Once analysis completes
(status `reviewing`), the user is redirected back for Step 2 to review output.

```
✓ API routes in backend/src/routes/meetings.js:

    POST /api/meetings/:id/review/confirm-transcript
        — body: { speakerMap }
        — applies speakerMap to diarizedSegments in Transcript table
        — queues BullMQ "analyze" job → status "analyzing"
        — return { status: "analyzing" }

    POST /api/meetings/:id/review/confirm
        — body: { speakerMap, meetingMinutes, actionItems,
                  attendees, minutesPreparedBy, datePrepared }
        — saves attendees to Meeting.attendees (creates Person records for manual entries)
        — saves minutesPreparedBy + datePrepared to Output
        — creates MeetingParticipant rows + Person records per speaker
        — status → "done", completedAt set
        — return { status: "done" }

    POST /api/meetings/:id/review/discard
        — status → "discarded"
        — return { status: "discarded" }

✓ Review.jsx — the HITL review shell
    — Fetches meeting on mount, branches on status:
        transcript_reviewing → renders StepTranscript
        reviewing            → renders StepOutput
    — Redirects to /meetings/:id if status is "done"
    — Redirects to / if status is anything else

✓ StepTranscript (Step 1 of 2) — Transcript Review
    — Header: "STEP 1 OF 2 — Review Transcript"
    — Section 1: Speakers Detected
        — SpeakerMapper.jsx with autocomplete search
        — Each speaker row searches employees → persons as user types
        — Picks from dropdown or types manually if no match found
        — Blank = speaker label kept as-is
    — Section 2: Transcript (expanded by default)
        — Full diarized transcript, scrollable (max-height 480px)
        — Collapse/expand toggle
    — Bottom bar:
        Left: "Discard" → POST /discard → navigate to /
        Right: "Confirm Transcript →" → POST /confirm-transcript → navigate to /meetings/:id
               (Meeting.jsx polls: analyzing → reviewing → back to /review for Step 2)

✓ StepOutput (Step 2 of 2) — Output Review
    — Header: "STEP 2 OF 2 — Review Minutes & Action Items"
    — Section 1: Attendees
        — AttendeeList.jsx component
        — Pre-populated with renamed speaker names from Step 1
        — User can add more attendees or remove any
        — Search: employees first → persons → manual entry auto-creates Person on confirm
    — Section 2: Meeting Minutes
        — Editable textarea, auto-grows, min-height 200px
        — Footer below textarea (below a border-t):
            "Minutes Prepared By" input — default: logged-in employee name
            "Date Prepared" input — default: today's date (human-readable string)
    — Section 3: Action Items — inline editable table (Task | Owner | Deadline)
    — Section 4: Key Points — read-only bulleted list
    — Bottom bar:
        Left: "Discard" → POST /discard → navigate to /
        Right: "Confirm & Save" → POST /confirm → navigate to /meetings/:id

✓ SpeakerMapper.jsx
    — One row per unique speaker label derived from diarizedSegments
    — Each row: DM Mono speaker label + SpeakerInput (autocomplete)
    — SpeakerInput: debounced search (300ms) → employees → persons dropdown
    — No match found → typed text is used as manual name
    — Exposes speakerMap via onChange prop

✓ AttendeeList.jsx
    — Props: attendees [{personId, name}], onChange
    — Debounced search (300ms) across /api/people/employees then /api/people/persons
    — Employees shown first; persons already linked to employees are deduplicated
    — No results → "Add [name]" option → {personId: null, name}
    — On confirm, null personId entries create new Person records in DB
```

**Definition of done:** After upload + transcription, user lands on Step 1 to
rename speakers and review transcript. After confirming transcript, AI analysis
runs and user is returned to Step 2 to review minutes/action items/key points.
Attendees pre-filled from speaker names. Confirm saves all structured metadata
and sets status "done". Discard sets "discarded".

---

### 05b — Auth + Person Registry Foundation

Auth must be in place before the app goes to any real user. This step
also seeds the person registry automatically from employee accounts —
so Phase 3 memory features have a clean identity foundation to build on.

Build this after Step 05 (Review Page) is complete and working.

```
□ Install auth packages in backend:
    npm install bcryptjs jsonwebtoken

□ Prisma schema migration:
    — Add Employee model (as defined in schema above)
    — Add Person model (as defined in schema above)
    — Add MeetingParticipant model (as defined in schema above)
    — Add employeeId field to Meeting model
    — Run: npx prisma migrate dev --name add-auth-and-persons
    — Run: npx prisma generate

□ backend/src/routes/auth.js:

    POST /api/auth/register
        — validate: name, email, password required
        — check email not already taken
        — bcrypt.hash(password, 10) → passwordHash
        — prisma.person.create({ canonicalName: name, email })
        — prisma.employee.create({ name, email, passwordHash, jobTitle, personId })
        — sign JWT: { employeeId, email, role } with JWT_SECRET, expiresIn: "7d"
        — return { token, employee: { id, name, email, role } }

    POST /api/auth/login
        — find employee by email
        — bcrypt.compare(password, passwordHash)
        — if mismatch → 401 "Invalid email or password"
        — sign JWT same as above
        — return { token, employee: { id, name, email, role } }

    GET /api/auth/me
        — requires auth middleware
        — prisma.employee.findUnique({ where: { id: req.employee.id } })
        — return { employee: { id, name, email, role, jobTitle } }

□ backend/src/middleware/auth.js:
    — read Authorization header: "Bearer <token>"
    — jwt.verify(token, JWT_SECRET) → decoded payload
    — attach decoded employee to req.employee
    — if missing or invalid → 401 "Authentication required"
    — export as middleware function

□ Protect all existing routes:
    — import auth middleware in backend/src/index.js
    — apply to all /api/meetings/* and /api/upload/* routes
    — /api/auth/register and /api/auth/login stay public

□ Update POST /api/upload/presign:
    — extract employeeId from req.employee.id
    — prisma.meeting.create({ ..., employeeId })

□ Update GET /api/meetings:
    — if req.employee.role === "admin" → return all meetings
    — else → filter by employeeId: req.employee.id

□ Update POST /api/meetings/:id/review/confirm:
    — after saving output, create MeetingParticipant rows:
        for each entry in speakerMap ({ "Speaker A": "Real Name" }):
          — fuzzy search Person registry for "Real Name"
          — if match found (exact or close) → use existing personId
          — if no match → prisma.person.create({ canonicalName: "Real Name" })
                          add "Real Name" to aliases if variant detected
          — prisma.meetingParticipant.create({
              meetingId, personId, speakerLabel: "Speaker A"
            })

□ Add shadcn input component:
    npx shadcn@latest add input

□ frontend/src/lib/api.js:
    — add Authorization header to all requests:
        const token = localStorage.getItem("token")
        if (token) headers["Authorization"] = `Bearer ${token}`
    — add auth API functions:
        register(name, email, password, jobTitle)
        login(email, password)
        getMe()

□ frontend/src/hooks/useAuth.js:
    — stores { employee, token } in useState
    — on mount: read token from localStorage → call getMe() to verify
    — login(email, password): calls api.login → stores token → sets employee
    — logout(): clears localStorage token → clears employee state
    — exposes: { employee, loading, login, logout, isAdmin }

□ frontend/src/pages/Login.jsx:
    — centered card, max-width 400px
    — "InMinutes" wordmark at top (Inter weight 600, 20px)
    — Email input + Password input
    — "Sign in" primary button
    — "Don't have an account? Register" link → /register
    — On success → navigate to /
    — Error: "Invalid email or password." inline below button

□ frontend/src/pages/Register.jsx:
    — same card layout as Login
    — Name + Email + Password + Job Title (optional) inputs
    — "Create account" primary button
    — "Already have an account? Sign in" link → /login
    — On success → navigate to /
    — Error: "An account with this email already exists." inline

□ frontend/src/App.jsx — protected routes:
    — wrap all routes except /login and /register with auth check
    — if no valid token → redirect to /login
    — if valid token → render the route
    — Route: /login → Login.jsx (public)
    — Route: /register → Register.jsx (public)
    — Route: / → Home.jsx (protected)
    — Route: /meetings/:id → Meeting.jsx (protected)
    — Route: /meetings/:id/review → Review.jsx (protected)

□ Seed first admin account manually:
    — Register via the UI with your email
    — Run in Railway Postgres or local psql:
      UPDATE "Employee" SET role = 'admin' WHERE email = 'your@email.com';
    — Document this in README
```

**Definition of done:**

- Unauthenticated requests to /api/meetings return 401
- Can register a new account → person record auto-created in DB
- Can log in → JWT returned and stored
- Uploading a meeting links it to the logged-in employee
- Meeting list shows only the current user's meetings (admin sees all)
- Confirm flow creates MeetingParticipant rows and Person records
- Refreshing the page keeps the user logged in (token persisted)
- Logging out clears the session and redirects to /login

---

### 06 — Meeting Output UI

```
□ Meeting.jsx — status polling + read-only tabbed output
    — on mount: fetch GET /api/meetings/:id
    — poll every 5 seconds while status is not "done", "failed", or "discarded"
    — if status hits "reviewing" → redirect to /meetings/:id/review immediately
    — stop polling when terminal status reached (done / failed / discarded)
    — when "done": fetch transcript + output in parallel, render tabs

    Processing state (pending / uploading / transcribing / analyzing):
    — StatusBadge with current status
    — processing message matching status:
        transcribing → "Transcribing audio with speaker detection..."
        analyzing    → "Analyzing with AI..."
    — progressPulse animation on the status badge

    Done state — shadcn Tabs (4 tabs, all read-only):
    — Minutes (default) · Action Items · Key Points · Transcript
    — fadeIn animation on tab content switch
    — no editing on this page — output is final and confirmed

    Discarded state:
    — StatusBadge "Discarded"
    — "This meeting was discarded during review."
    — Link: "Upload a new recording →"

□ MinutesView.jsx
    — render meetingMinutes as plain preformatted text
    — shadcn Button "Copy" → navigator.clipboard.writeText
    — shadcn Button "Export .md" → Blob download
    — both use secondary (outline) button variant

□ ActionItemsTable.jsx
    — shadcn Table: Task | Owner | Deadline columns
    — DM Mono for Owner + Deadline cells
    — "Not specified" in text-ink-4 when deadline is null
    — empty state: "No action items detected in this meeting."

□ TranscriptView.jsx
    — render diarizedSegments array
    — each segment: DM Mono speaker label + Inter weight 300 text
    — group consecutive same-speaker segments visually
    — scrollable container, max-height with overflow-y-auto

□ Key Points tab
    — bulleted list from keyPoints array
    — Inter weight 400, relaxed line-height

□ Failed state
    — StatusBadge "Failed"
    — "This meeting could not be processed."
    — show errorMsg if present (human-readable only — never raw stack traces)
```

**Definition of done:** Full flow works in browser. Upload → real-time
status → all four tabs render. Copy and export work. Failed state shows
correct error message.

---

### 07 — Loading + Error + Empty States

Every screen must have all three. No exceptions.

```
□ LOADING — skeleton screens using skeletonPulse, never spinners
    — Home MeetingList: 3 skeleton cards (same card dimensions, bg-ground pulse)
    — Meeting processing: StatusBadge + animated message
    — Meeting output tabs: skeleton lines matching output structure
    — Review page loading: skeleton for each section (SpeakerMapper, textarea, table)

□ ERROR — human language + recovery action
    — Upload failure: "Upload failed. Check your connection and try again."
    — Processing failed: "This meeting could not be processed."
    — Review confirm failure: "Could not save your changes. Try again."
    — API errors: "Something went wrong — try again." + retry button
    — Never show raw error messages or stack traces to users

□ EMPTY — actionable, never blank
    — Home no meetings: "No meetings yet. Upload your first recording above."
    — ActionItemsTable no items: "No action items detected in this meeting."
    — Key points no data: "No key points were extracted."
    — Transcript no segments: "Transcript is not available."
    — Review page action items empty: show one blank row with "+ Add row"

□ File validation (UploadZone, inline errors):
    — Wrong format: "Unsupported format. Use MP4, WebM, MP3, WAV, or M4A."
    — Too large: "File too large. Maximum size is 500MB."
```

**Definition of done:** Every screen manually tested in loading, error,
and empty states. No blank screens. No raw error messages visible.

---

### 08 — Polish Pass

Do this after all features are working. Not while building features.

```
□ Animations audit
    — MeetingList cards: fadeIn staggered 40ms per card on load
    — Tab content: fadeIn 200ms on every tab switch
    — Status badge: progressPulse on transcribing/analyzing
    — Upload progress: smooth fill, no jumping
    — Hover transitions: 150ms on all interactive elements

□ Typography audit — every screen
    — headings: Inter weight 600
    — body text: Inter weight 400
    — metadata + badges + speaker labels: DM Mono
    — no rogue font weights or system font fallbacks rendering

□ Color audit
    — no hardcoded hex values — CSS variables or Tailwind tokens only
    — signal: processing states only
    — success: done badge only
    — danger: failed badge + error states only

□ shadcn override audit
    — all shadcn components match design system (font, border-radius, color)
    — no default shadcn blue/purple colors leaking through
    — Card: rounded-none, border-rule

□ Copy audit
    "Loading..."        → skeleton screen
    "Error occurred"    → "Something went wrong — try again."
    "Submit"            → Upload / Copy / Export (specific verb)
    "No results found"  → specific empty state message

□ Responsive check
    — Home page works at 768px minimum
    — Meeting tabs scroll correctly on narrow screens
    — Upload zone works on touch
```

**Definition of done:** App looks intentional at every breakpoint. No
animation jank. No placeholder copy. shadcn components fully match the
design system.

---

## Current Status

```
✓ 01 — Project Scaffold
✓ 02 — Database + Infrastructure
✓ 03 — Upload Pipeline
✓ 04 — Worker: Transcription + Intelligence
✓ 05 — Review Page (Human-in-the-Loop) — extended to 2-step HITL
✓ 05b — Auth + Person Registry Foundation
✓ 06 — Meeting Output UI
✓ 07 — Loading + Error + Empty States
✓ 08 — Polish Pass
```

---

## Definition of Phase 1 Complete

```
✓ User can upload a meeting recording (MP4, WebM, MP3, WAV, M4A — max 500MB)
✓ File uploads directly to Cloudflare R2 via presigned URL
✓ Background worker processes the recording automatically
✓ AssemblyAI transcribes audio with speaker diarization
✓ Gemini extracts key points, action items with owners, and meeting minutes
✓ Employees can register and log in — JWT auth
✓ Person record auto-created on registration — seeds the registry
✓ All routes protected — unauthenticated requests return 401
✓ Meetings linked to the uploading employee
✓ Meeting list scoped per employee (admin sees all)
✓ Worker transcription ends at "transcript_reviewing" — never skips human review
✓ User reviews and confirms transcript in Step 1 (renames speakers via autocomplete)
✓ AI analysis triggered after transcript confirmation — generates minutes/action items/key points
✓ User reviews output in Step 2 (edit minutes, action items, add attendees)
✓ Speaker labels renamed in Step 1 auto-populate the attendees list in Step 2
✓ Attendees stored as structured list (not embedded in minutes markdown)
✓ Minutes Prepared By and Date Prepared collected in Step 2 (defaults: current user + today)
✓ Gemini prompt explicitly excludes attendees/prepared-by/date from generated minutes
✓ Confirm creates MeetingParticipant rows + Person records per speaker
✓ Manual attendee entries auto-create Person records on confirm
✓ Employee and person search endpoints for autocomplete in review UI
✓ Confirm saves final output and sets status to "done"
✓ Discard sets status to "discarded" — record kept, not hard-deleted
✓ All confirmed outputs stored in own PostgreSQL database via Prisma
✓ Meeting detail page is fully read-only — shows confirmed output only
✓ Attendees, Minutes Prepared By, Date Prepared shown separately in Minutes tab
✓ All four output tabs render correctly: Minutes, Action Items, Key Points, Transcript
✓ Copy and markdown export work on confirmed meeting minutes
✓ All screens have loading, error, and empty states
□ Production deploy is live on Railway + Vercel
□ End-to-end flow tested with a real meeting recording on production
□ Proposal deck ready to present
```

---

## Never Do These Things

```
✗ Add any UI library other than shadcn/ui
✗ Use any font not in the design system (Inter and DM Mono only)
✗ Use any color not defined in CSS variables or Tailwind config
✗ Use raw pg queries — Prisma only for all database access
✗ Add Zustand, Redux, Context API, or any state management library
✗ Route audio file bytes through Express — always presigned R2 URLs
✗ Run the worker inside the API process — always a separate Railway service
✗ Show raw error messages or stack traces to users
✗ Use spinner animations — always skeleton screens for loading states
✗ Use placeholder copy anywhere — "Lorem ipsum", "Coming soon", "TODO"
✗ Build features outside the current build order step
✗ Skip loading, error, or empty states on any screen
✗ Add animations purely for decoration — every motion has meaning
✗ Change the AI provider — Google Gemini gemini-2.5-flash only
✗ Hard-delete any database row in Phase 1
```

---

## How to Use This File

**Start every Claude Code session:**

```
Read PHASE_1.md fully before doing anything.
We are currently on Build Order step [number]: [name].
Do not proceed past this step until I confirm it is complete.
```

**When Claude Code goes off-track:**

```
Stop. Re-read PHASE_1.md.
The design system and stack choices are non-negotiable.
Return to Build Order step [number] and complete it correctly.
```

**When a new idea appears mid-build:**

```
Good idea. We will add it after Phase 1 is complete.
Right now we are on step [number]. Stay focused on that.
```
