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

Upload a meeting recording → background pipeline processes it → receive full
structured output with transcript, key points, action items, and minutes.

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
│       │   │   └── table.jsx
│       │   ├── UploadZone.jsx      # drag-and-drop + file picker
│       │   ├── MeetingList.jsx     # list of past meetings
│       │   ├── StatusBadge.jsx     # wraps shadcn Badge with status logic
│       │   ├── TranscriptView.jsx  # speaker-labeled transcript
│       │   ├── ActionItemsTable.jsx # wraps shadcn Table
│       │   └── MinutesView.jsx     # minutes text + copy + export
│       └── pages/
│           ├── Home.jsx            # meeting list + upload zone
│           └── Meeting.jsx         # single meeting — status + tabbed output
│
└── backend/
    ├── src/
    │   ├── index.js                # Express app entry
    │   ├── routes/
    │   │   ├── upload.js           # presign + confirm endpoints
    │   │   └── meetings.js         # CRUD + status + transcript + output
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

model Meeting {
  id          String    @id @default(cuid())
  title       String
  source      String    @default("upload")
  // upload | teams (Phase 2)
  audioKey    String?
  // Cloudflare R2 object key
  status      String    @default("pending")
  // pending | uploading | transcribing | analyzing | done | failed
  errorMsg    String?
  createdAt   DateTime  @default(now())
  completedAt DateTime?

  transcript  Transcript?
  output      Output?
}

model Transcript {
  id                String   @id @default(cuid())
  meetingId         String   @unique
  meeting           Meeting  @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  rawText           String
  // plain text from AssemblyAI
  diarizedSegments  Json
  // [{speaker, text, start, end}]
  createdAt         DateTime @default(now())
}

model Output {
  id             String   @id @default(cuid())
  meetingId      String   @unique
  meeting        Meeting  @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  keyPoints      Json
  // string[]
  actionItems    Json
  // [{task, owner, deadline}]
  meetingMinutes String
  createdAt      DateTime @default(now())
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
POST  /api/upload/presign           { filename, contentType, title }
                                    → { meetingId, uploadUrl, audioKey }

POST  /api/upload/confirm/:id       → { status: "queued" }

GET   /api/meetings                 → Meeting[] ordered by createdAt DESC
GET   /api/meetings/:id             → Meeting row (status, title, timestamps)
GET   /api/meetings/:id/transcript  → { rawText, diarizedSegments }
GET   /api/meetings/:id/output      → { keyPoints, actionItems, meetingMinutes }
```

---

## Worker Pipeline

The worker runs as a **separate Railway service** (same repo, different start
command). It must run continuously — it cannot be a serverless function.

```
Job received: { meetingId, audioKey, title }
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
Status → "analyzing"
      ↓
formatTranscript(segments) → "Speaker A: ...\nSpeaker B: ..."
      ↓
Gemini API (parallel):
  extractKeyPoints(formatted)   → string[]
  extractActionItems(formatted) → [{task, owner, deadline}]
      ↓
generateMinutes(formatted, keyPoints, actionItems, title) → string
      ↓
Save Output via Prisma
      ↓
Status → "done", completedAt = NOW()

On any error:
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
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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

Format the minutes with these sections:
1. Meeting Summary
2. Key Points Discussed
3. Decisions Made
4. Action Items & Assignments
5. Next Steps

Professional business language. Clear and concise.
```

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
  done: {
    label: "Done",
    className: "font-mono bg-success-light text-success border-success/20",
  },
  failed: {
    label: "Failed",
    className: "font-mono bg-danger-light text-danger border-danger/20",
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
    — prisma.meeting.update({ status: "done", completedAt: new Date() })
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

### 05 — Meeting Output UI

```
□ Meeting.jsx — status polling + tabbed output
    — on mount: fetch GET /api/meetings/:id
    — poll every 5 seconds while status is not "done" or "failed"
    — stop polling when terminal status reached
    — when "done": fetch transcript + output in parallel

    Processing state:
    — StatusBadge with current status
    — processing message matching status:
        transcribing → "Transcribing audio with speaker detection..."
        analyzing    → "Analyzing with AI..."
    — progressPulse animation on the status badge

    Done state — shadcn Tabs (4 tabs):
    — Minutes (default) · Action Items · Key Points · Transcript
    — fadeIn animation on tab content switch

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

### 06 — Loading + Error + Empty States

Every screen must have all three. No exceptions.

```
□ LOADING — skeleton screens using skeletonPulse, never spinners
    — Home MeetingList: 3 skeleton cards (same card dimensions, bg-ground pulse)
    — Meeting processing: StatusBadge + animated message
    — Meeting output tabs: skeleton lines matching output structure

□ ERROR — human language + recovery action
    — Upload failure: "Upload failed. Check your connection and try again."
    — Processing failed: "This meeting could not be processed."
    — API errors: "Something went wrong — try again." + retry button
    — Never show raw error messages or stack traces to users

□ EMPTY — actionable, never blank
    — Home no meetings: "No meetings yet. Upload your first recording above."
    — ActionItemsTable no items: "No action items detected in this meeting."
    — Key points no data: "No key points were extracted."
    — Transcript no segments: "Transcript is not available."

□ File validation (UploadZone, inline errors):
    — Wrong format: "Unsupported format. Use MP4, WebM, MP3, WAV, or M4A."
    — Too large: "File too large. Maximum size is 500MB."
```

**Definition of done:** Every screen manually tested in loading, error,
and empty states. No blank screens. No raw error messages visible.

---

### 07 — Polish Pass

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

### 08 — Deploy

```
□ backend/ → Railway
    — Service 1 (api):    start = node src/index.js
    — Service 2 (worker): start = node src/worker/index.js
    — Add Postgres plugin → DATABASE_URL to env vars
    — Add Redis plugin    → REDIS_URL to env vars
    — Set all env vars: GEMINI_API_KEY, ASSEMBLYAI_API_KEY,
                        R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
                        R2_BUCKET_NAME, FRONTEND_URL
    — Add to api start command: npx prisma migrate deploy && node src/index.js
    — Verify both services start and connect

□ frontend/ → Vercel
    — Connect GitHub repo, root = /frontend, framework = Vite
    — Set VITE_API_URL = Railway API production URL
    — Update R2 CORS AllowedOrigins to include Vercel production domain
    — Verify build passes

□ Smoke test on production URLs:
    — Upload a real meeting recording
    — Watch status update: transcribing → analyzing → done
    — Verify all 4 tabs render correct content
    — Test copy and export
    — Verify failed state with a corrupted/unsupported file
```

**Definition of done:** Everything works on production URLs, not just
localhost. A real meeting recording produces correct output end-to-end.

---

### 09 — Proposal Prep

```
□ Test output quality on 2–3 real meeting recordings
□ Record a short demo (2–3 minutes) showing full flow
□ Build proposal deck (7 slides):
    1. Problem — manual notes are slow, incomplete, action items get lost
    2. Solution — upload any recording, full output in 10–15 minutes
    3. Architecture — simplified system flow diagram
    4. Data security — all outputs in own database;
       Phase 2 option: fully self-hosted STT
    5. Demo screenshots
    6. Roadmap:
       Phase 1 (now): file upload MVP
       Phase 2: Microsoft Graph auto-sync when Teams meeting ends
       Phase 3: self-hosted STT for full data sovereignty
    7. What we need: AssemblyAI key (~$15/month), Railway (~$20/month),
       5–10 person pilot group for 2 weeks
```

**Definition of done:** Proposal deck ready. Output quality on real content is strong enough to present to users.

---

## Current Status

```
□ 01 — Project Scaffold           ← START HERE
□ 02 — Database + Infrastructure
□ 03 — Upload Pipeline
□ 04 — Worker: Transcription + Intelligence
□ 05 — Meeting Output UI
□ 06 — Loading + Error + Empty States
□ 07 — Polish Pass
□ 08 — Deploy
□ 09 — Proposal Prep
```

---

## Definition of Phase 1 Complete

```
□ User can upload a meeting recording (MP4, WebM, MP3, WAV, M4A — max 500MB)
□ File uploads directly to Cloudflare R2 via presigned URL
□ Background worker processes the recording automatically
□ AssemblyAI transcribes audio with speaker diarization
□ Gemini extracts key points, action items with owners, and meeting minutes
□ All outputs stored in own PostgreSQL database via Prisma
□ Meeting page shows real-time status during processing
□ All four output tabs render correctly: Minutes, Action Items, Key Points, Transcript
□ Copy and markdown export work on meeting minutes
□ All screens have loading, error, and empty states
□ Production deploy is live on Railway + Vercel
□ End-to-end flow tested with a real meeting recording
□ Proposal deck ready to present to the Director
```

---

## Phase 2 (Post-MVP) — Microsoft Graph Integration

When the MVP is validated and the proposal is approved:

```
□ Register Azure app in tenant (requires Teams admin)
□ Add API permissions: OnlineMeetings.Read.All, CallRecords.Read.All
□ POST /api/webhooks/teams — receive recording.ready notification
□ Download recording from SharePoint via Graph API → upload to R2
□ Call existing confirm endpoint → same BullMQ queue → same worker pipeline
□ Add source = "teams" to Meeting record for tracking
□ Zero changes to worker, intelligence layer, or frontend output views
```

The entire Phase 1 pipeline is untouched. Graph is one new webhook
endpoint that feeds the existing queue.

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
