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
STT:          ElevenLabs Scribe v2 — Burmese + English transcription, speaker diarization,
              word-level timestamps, keyterm prompting — single API call
AI:           Google Gemini API — gemini-2.5-flash (transcription + translation + intelligence)
File Storage: Cloudflare R2 (S3-compatible)
Hosting:      Vercel (frontend) + Railway (backend API + worker)
HTTP:         Axios
```

**Auth packages:**

- `bcryptjs` — password hashing
- `jsonwebtoken` — JWT generation and verification
- No Passport.js, no Auth0, no NextAuth — custom JWT only

**Why ElevenLabs Scribe v2 over AssemblyAI:**
AssemblyAI cannot transcribe Burmese — it misidentifies it as Japanese, Vietnamese,
or Chinese. Scribe v2 explicitly supports Burmese (`mya`) with industry-leading
accuracy, speaker diarization, and word-level timestamps in a single API call.
It is also cheaper: $0.22/hour vs AssemblyAI's $0.72/hour ($0.012/min × 60).

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
│       │   ├── AudioPlayer.jsx     # persistent audio player synced to transcript
│       │   ├── TranscriptEditor.jsx # editable transcript with audio sync + lang badges
│       │   ├── TranscriptView.jsx  # speaker-labeled transcript (read-only, Meeting page)
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
    │   │   ├── elevenlabs.js       # ElevenLabs Scribe v2 — transcription + diarization + timestamps
    │   │   └── intelligence.js     # Gemini API — translation, key points, action items, minutes
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
ELEVENLABS_API_KEY=
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
  audioKey         String?
  // Cloudflare R2 object key
  audioContentType String?
  // MIME type of uploaded file: "video/mp4" | "audio/mpeg" | "audio/wav" | "audio/mp4" | "video/webm"
  // stored at upload time — used by AudioPlayer to set correct <source type>
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
  // ElevenLabs Scribe v2 output — single-pass transcription + diarization:
  // [{
  //   speaker: string,              // current display name — may be real name after HITL
  //   originalSpeaker: string,      // original Scribe label ("speaker_0") — never changes
  //   speakerOverride: boolean,     // true = manually reassigned for this segment only
  //                                 // false = follows global speaker rename
  //   text: string,                 // original text (Burmese, English, or mixed)
  //   originalLang: string,         // "en" | "my" | "my-en"
  //   translatedText: string|null,  // English translation — null if already English
  //   start: number,                // milliseconds — from Scribe word-level timestamps
  //   end: number                   // milliseconds — from Scribe word-level timestamps
  // }]
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
- Browser uploads directly to R2 via presigned URL (never through Express)
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

GET   /api/meetings/:id/audio-url        → { url, contentType }
                                           url: presigned R2 URL (2hr expiry)
                                           contentType: stored MIME type of original upload

── Two-Step HITL Review ────────────────────────────────────────────────────────

POST  /api/meetings/:id/review/confirm-transcript
                                         { speakerMap, diarizedSegments }
                                         — diarizedSegments: full edited segments including
                                           speaker, originalSpeaker, speakerOverride,
                                           text, originalLang, translatedText, start, end
                                         — applies speakerMap as safety pass on non-overridden
                                           segments (speakerOverride: false only)
                                         — overridden segments (speakerOverride: true) untouched
                                         — saves final diarizedSegments to Transcript table
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

### Why ElevenLabs Scribe v2

Previous approach (Option B) used AssemblyAI for diarization and Gemini File
API for transcription, merged by timestamp alignment. This was complex and
fragile. Scribe v2 replaces both with a single API call:

- Burmese language support (`mya`) — explicitly supported, not misidentified
- Intra-sentence Burmese-English code-switching handled natively
- Speaker diarization built in — no separate diarization service needed
- Word-level timestamps — no alignment step needed
- Keyterm prompting — feed company/product names to improve accuracy
- Cheaper than AssemblyAI: $0.22/hour vs $0.72/hour

The pipeline is now clean and single-pass again.

---

**Job type: `"process"` — Transcription (Scribe v2)**

```
Job received: { meetingId, audioKey, audioContentType, speakersExpected }
      ↓
Status → "transcribing"
      ↓
getDownloadUrl(audioKey) → presigned R2 URL
Download audio from R2 → buffer
      ↓
ElevenLabs Scribe v2: transcribeAudio(buffer, audioContentType, speakersExpected)
  Config: {
    model_id: "scribe_v2",
    language_code: "mya",            // Burmese primary — handles EN/MY mixing
    diarize: true,                   // speaker diarization enabled
    timestamps_granularity: "word",  // word-level timestamps
    keyterms: ZARLA_KEYTERMS,        // company/product names (see below)
    num_speakers: speakersExpected ?? undefined  // null → auto-detect
  }
  → Scribe JSON response with words array and speaker labels
      ↓
Map Scribe response → segments:
  Group consecutive words by speaker into utterance segments
  [{
    speaker: "speaker_0",     // Scribe speaker label
    text: utteranceText,      // concatenated words for this speaker turn
    originalLang: detectLang(utteranceText),  // "en" | "my" | "my-en"
    translatedText: null,     // filled in next step
    start: firstWord.start * 1000,  // convert seconds → milliseconds
    end: lastWord.end * 1000
  }]
      ↓
Gemini: translateNonEnglishSegments(segments)
  — for each segment where originalLang !== "en":
      translate text to English → set translatedText
  — batches of 10 to avoid rate limits
  — on error: log, set translatedText: null, continue (never fail job)
      ↓
prisma.transcript.create({
  meetingId,
  rawText: segments.map(s => s.text).join(" "),
  diarizedSegments: segments
})
      ↓
Status → "transcript_reviewing"
Frontend polling detects → redirects to /meetings/:id/review (Step 1)
```

**Zarla keyterms — defined as a constant in elevenlabs.js:**

```js
const ZARLA_KEYTERMS = [
  "JARVIS",
  "Bahozay",
  "Cannopy",
  "InFlow",
  "InMinutes",
  "InKnow",
  "Inductiv",
  "Argent Blue",
  "Zarla",
  "Cho Cho",
  "LangGraph",
  "Kafka",
  "Debezium",
  "ClickHouse",
  // add more as the product evolves
];
```

**Language detection heuristic — no external library:**

```js
function detectLang(text) {
  const hasBurmese = /[\u1000-\u109F]/.test(text);
  const hasLatin = /[a-zA-Z]{3,}/.test(text); // 3+ Latin chars = real English word
  if (hasBurmese && hasLatin) return "my-en"; // intra-sentence mixed
  if (hasBurmese) return "my";
  return "en";
}
```

---

**Job type: `"analyze"` — AI Intelligence (queued by confirm-transcript)**

```
Job received: { meetingId, title }
      ↓
Status → "analyzing"
      ↓
Read diarizedSegments from Transcript table
  (has real speaker names + human corrections from HITL Step 1)
      ↓
buildEnglishTranscript(segments):
  — for each segment: translatedText ?? text
  — format: "Real Name: [English text]\nReal Name: [English text]"
  — always English-only content for intelligence layer
      ↓
Gemini API (parallel):
  extractKeyPoints(englishTranscript)   → string[]
  extractActionItems(englishTranscript) → [{task, owner, deadline}]
      ↓
generateMinutes(englishTranscript, keyPoints, actionItems, title) → string
  — prompt excludes: Attendees, Minutes Prepared By, Date Prepared
      ↓
prisma.output.create({ meetingId, keyPoints, actionItems, meetingMinutes })
      ↓
Status → "reviewing"
Frontend polling detects → redirects to /meetings/:id/review (Step 2)
```

---

**On any error (either job type):**

```
Status → "failed", errorMsg = error.message
```

**Graceful degradation — translation failure:**
If Gemini translation fails for a batch, log the error and continue with
`translatedText: null` for those segments. The HITL editor shows the original
Burmese text and the user can correct it. Never fail the whole job.

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
// Gemini File API no longer needed — Scribe v2 handles transcription

async function generate(prompt) {
  const result = await model.generateContent(prompt);
  return result.response.text();
}
```

### Segment Translation Prompt

Used in the `"process"` worker job to translate non-English segments to English
before saving. Gemini translates Burmese and mixed segments so the intelligence
layer always receives English-only content.

```
Translate the following meeting transcript segments to English.
Each segment is on its own line in the format: [INDEX] text
Return ONLY the translations in the same format: [INDEX] translated text
No preamble. No explanation. Preserve speaker names if mentioned.

Segments:
{segments formatted as [0] text\n[1] text\n...}
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

## ElevenLabs Scribe v2 Integration

Single API call replacing the previous two-pass AssemblyAI + Gemini pipeline.
Handles Burmese, English, and intra-sentence code-switching natively.

```js
// backend/src/lib/elevenlabs.js
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });

const ZARLA_KEYTERMS = [
  "JARVIS",
  "Bahozay",
  "Cannopy",
  "InFlow",
  "InMinutes",
  "InKnow",
  "Inductiv",
  "Argent Blue",
  "Zarla",
  "Cho Cho",
  "LangGraph",
  "Kafka",
  "Debezium",
  "ClickHouse",
];

export async function transcribeAudio(audioBuffer, mimeType, speakersExpected) {
  const blob = new Blob([audioBuffer], { type: mimeType });

  const response = await client.speechToText.convert({
    audio: blob,
    model_id: "scribe_v2",
    language_code: "mya", // Burmese primary + EN/MY mixing
    diarize: true, // speaker diarization
    timestamps_granularity: "word", // word-level timestamps
    keyterms: ZARLA_KEYTERMS,
    ...(speakersExpected ? { num_speakers: speakersExpected } : {}),
    // omit num_speakers → auto-detect
  });

  return mapScribeResponse(response);
}

function mapScribeResponse(response) {
  // Group consecutive words by speaker into utterance segments
  const segments = [];
  let current = null;

  for (const word of response.words) {
    if (word.type === "spacing") continue;

    if (!current || current.speaker !== word.speaker_id) {
      if (current) segments.push(current);
      current = {
        speaker: word.speaker_id ?? "speaker_0",
        text: word.text,
        start: Math.round(word.start * 1000), // seconds → milliseconds
        end: Math.round(word.end * 1000),
      };
    } else {
      current.text += " " + word.text;
      current.end = Math.round(word.end * 1000);
    }
  }
  if (current) segments.push(current);

  // Add language detection + speakerOverride fields
  return segments.map((seg) => ({
    ...seg,
    originalSpeaker: seg.speaker, // preserve original Scribe label — never mutated
    speakerOverride: false, // false = follows global rename
    originalLang: detectLang(seg.text),
    translatedText: null, // filled by translation step in worker
  }));
}

function detectLang(text) {
  const hasBurmese = /[\u1000-\u109F]/.test(text);
  const hasLatin = /[a-zA-Z]{3,}/.test(text);
  if (hasBurmese && hasLatin) return "my-en";
  if (hasBurmese) return "my";
  return "en";
}
```

**Install:**

```bash
cd backend
npm install @elevenlabs/elevenlabs-js
```

**What Scribe v2 returns (relevant fields):**

```js
{
  text: "full transcript string",
  words: [
    {
      text: "Let's",
      type: "word",           // "word" | "spacing" | "audio_event"
      start: 0.24,            // seconds (float)
      end: 0.48,
      speaker_id: "speaker_0" // null if diarize: false
    },
    ...
  ]
}
```

**Note on `language_code: "mya"`:** Setting Burmese as the primary language
does not prevent English transcription — Scribe v2 handles multilingual audio
natively. Setting `mya` tells Scribe to expect Burmese as dominant and improves
accuracy on Burmese segments. English words within Burmese sentences are still
transcribed correctly in Latin script.

---

## HITL Review — Upgraded UX (Sonix-Inspired)

The review page implements four upgrades inspired by Sonix's editor experience.

### Upgrade 1 — Persistent Audio Player (AudioPlayer.jsx)

A fixed audio player bar at the top of the Step 1 review page.
Audio is fetched via a presigned R2 download URL when the review page loads.

```
┌─────────────────────────────────────────────────────────────┐
│  ▶  00:02:14 ──────────────────────────────── 45:32  [1×▼] │
└─────────────────────────────────────────────────────────────┘
```

- HTML `<audio>` element with custom controls (no browser default UI)
- Playback position exposed via `currentTime` ref — used by TranscriptEditor
  to highlight the active segment during playback
- Speed control: 0.75×, 1×, 1.25×, 1.5×, 2×
- Clicking a segment in TranscriptEditor seeks audio to that segment's start time
- Player stays visible while scrolling (sticky top, z-index above content)

### Upgrade 2 — Inline Speaker Rename on Transcript (SpeakerMapper integrated into TranscriptEditor)

Speaker renaming happens directly on the speaker label in the transcript,
not in a separate section above it.

```
┌─────────────────────────────────────────┐
│ [SPEAKER A ▼]  00:00:12                 │  ← click label → dropdown appears
│ Let's start with the Q3 numbers.        │
└─────────────────────────────────────────┘
```

- Each unique speaker label is a clickable element
- Clicking opens an inline dropdown with:
  - Search input (debounced, searches employees then persons)
  - Dropdown results from /api/people/employees and /api/people/persons
  - "Use [typed name]" option if no match
- Selecting a name renames ALL instances of that speaker label simultaneously
- Speaker labels update visually everywhere in the transcript in real time
- speakerMap state held in Review.jsx, passed down to TranscriptEditor

### Upgrade 3 — Editable Transcript (TranscriptEditor.jsx)

The transcript in Step 1 is fully editable. Replaces the read-only
TranscriptView in the review context.

```
┌─────────────────────────────────────────────────────────────┐
│ [Aung Khant ▼]  [my]  00:00:28                             │
│ ကောင်းပါပြီ၊ ဒီနှစ် budget က ဘယ်လောက်လဲ                    │  ← click to edit
│ [EN] Okay, what is this year's budget?                      │  ← click to edit translation
└─────────────────────────────────────────────────────────────┘
```

**Each segment displays:**

- Speaker label (clickable → rename dropdown per Upgrade 2)
- Language badge: `[en]` or `[my]` — DM Mono, 9px, ink-4 (shown only when
  segment language differs from previous segment or is non-English)
- Timestamp: DM Mono, ink-4 (formatted as MM:SS)
- Original text — click to edit inline (contenteditable div)
- Translation row (only shown when translatedText is not null):
  `[EN]` prefix in DM Mono ink-4, then editable translation text

**Editing behaviour:**

- Click any text → it becomes editable (contenteditable, no separate input)
- Click away or press Escape → saves edit to local segment state
- Segment state held in TranscriptEditor, synced up to Review.jsx on every change
- Clicking timestamp seeks audio player to that segment's start time
- Active segment (audio position falls within start/end) gets a subtle
  left border highlight (2px, signal color) during playback

**On confirm-transcript:**

- Full edited diarizedSegments array sent in POST body
  each segment includes speakerOverride flag and originalSpeaker
- Backend applies speakerMap only to non-overridden segments (speakerOverride: false)
- Overridden segments (speakerOverride: true) saved as-is — human correction respected
- AI analysis (analyze job) uses each segment's final speaker name
  and translatedText for English content — all corrections respected

### Upgrade 4 — Always-Mixed Multilingual Pipeline

No language selector on the upload form. Always configured as mixed.
Scribe v2 always runs with `language_code: "mya"` — handles Burmese, English,
and intra-sentence code-switching natively in a single API call.
Translation step always runs in the worker for non-English segments.
Gemini intelligence always receives English-only content via buildEnglishTranscript().

The user-facing signal is the language badge on each segment in TranscriptEditor.
No other UI changes required for multilingual support.

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
npx shadcn@latest add button card badge tabs table input
```

**Components used in this app and where:**

| Component | Used in                                            |
| --------- | -------------------------------------------------- |
| Button    | UploadZone, MinutesView, everywhere                |
| Card      | MeetingList cards, Meeting page container          |
| Badge     | StatusBadge wrapper, language badges in transcript |
| Tabs      | Meeting page output tabs                           |
| Table     | ActionItemsTable                                   |
| Input     | Login, Register, SpeakerMapper search              |

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

| Font    | Role | Usage                                                                |
| ------- | ---- | -------------------------------------------------------------------- |
| Inter   | Body | ALL UI text, headings, labels, buttons, body copy                    |
| DM Mono | Mono | Timestamps, status badges, speaker labels, metadata, language badges |

**Rules — no exceptions:**

- Inter `weight 300` → body copy, descriptions
- Inter `weight 400` → default UI text
- Inter `weight 500` → section labels, card titles
- Inter `weight 600` → page headings, primary actions only
- DM Mono → ALL metadata, timestamps, speaker labels, status badges, language badges ([en], [my])
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
  transcript_reviewing: {
    label: "Awaiting Transcript Review",
    className: "font-mono bg-warning-light text-warning border-warning/20",
  },
  reviewing: {
    label: "Awaiting Review",
    className: "font-mono bg-warning-light text-warning border-warning/20",
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

**Language badge (TranscriptEditor segments):**

```jsx
// Shown per segment when originalLang is not "en" or when language changes
<span className="font-mono text-[8px] tracking-[0.12em] uppercase text-ink-4 bg-ground px-1 py-0.5 border border-rule">
  my
</span>
```

**Speaker label (TranscriptView — read-only Meeting page):**

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
□ Add shadcn components: button card badge tabs table input
□ Initialize Express in backend/
□ Install backend dependencies:
    express cors dotenv bullmq ioredis uuid
    @prisma/client prisma
    @google/generative-ai
    @elevenlabs/elevenlabs-js
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
□ Verify all tables exist in Railway Postgres dashboard
□ Create Cloudflare R2 bucket: in-minutes
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
    — prisma.meeting.create({
        title, audioKey,
        audioContentType: contentType,   // store original MIME type
        status: "uploading"
      })
    — getUploadUrl(audioKey, contentType) → presigned R2 URL
    — return { meetingId, uploadUrl, audioKey }

□ POST /api/upload/confirm/:id
    — prisma.meeting.update({ status: "transcribing" })
    — meetingQueue.add("process", { meetingId, audioKey })
    — return { status: "queued" }

□ Worker scaffold (backend/src/worker/index.js)
    — connects to BullMQ queue
    — logs job received: { meetingId }
    — prisma.meeting.update({ status: "transcript_reviewing" }) — stub only
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
    — NO language selector — always mixed multilingual mode
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
appears in R2 bucket. Meeting row in Postgres with status "transcript_reviewing"
(stub). Meeting appears in the list. Clicking it navigates to /meetings/:id.

---

### 04 — Worker: Transcription + Intelligence (Scribe v2)

```
□ Install ElevenLabs SDK in backend:
    npm install @elevenlabs/elevenlabs-js

□ backend/src/lib/elevenlabs.js
    — ElevenLabsClient with ELEVENLABS_API_KEY
    — ZARLA_KEYTERMS constant (product/company names)
    — transcribeAudio(audioBuffer, mimeType, speakersExpected):
        calls client.speechToText.convert with:
          model_id: "scribe_v2"
          language_code: "mya"
          diarize: true
          timestamps_granularity: "word"
          keyterms: ZARLA_KEYTERMS
          num_speakers: speakersExpected (omit if null)
        maps words array → utterance segments
        returns [{speaker, text, originalLang, translatedText: null, start, end}]
    — detectLang(text) → "en" | "my" | "my-en" (Unicode heuristic)
    — mapScribeResponse(response) → segments array

□ backend/src/lib/intelligence.js — add these functions:
    — translateNonEnglishSegments(segments):
        filters where originalLang !== "en"
        batches of 10 → Gemini segment translation prompt
        sets translatedText per segment
        on error: logs, keeps translatedText: null, continues
        returns updated segments
    — buildEnglishTranscript(segments):
        for each segment: translatedText ?? text
        format: "speaker: [English text]\n"
        returns English-only string
    — formatTranscript already handles real names after HITL Step 1

□ Worker — job type "process" (Scribe v2 single-pass):
    — status → "transcribing"
    — getDownloadUrl(audioKey) → presigned R2 URL
    — download audio from R2 → buffer
        (use node-fetch: const res = await fetch(url); buffer = await res.buffer())
    — transcribeAudio(buffer, audioContentType, speakersExpected) → segments
    — translateNonEnglishSegments(segments) → segments with translatedText
    — prisma.transcript.create({
        meetingId,
        rawText: segments.map(s => s.text).join(" "),
        diarizedSegments: segments
      })
    — status → "transcript_reviewing"

□ Worker — job type "analyze" (triggered by confirm-transcript):
    — read diarizedSegments from Transcript table
      (has real speaker names + human corrections from HITL Step 1)
    — buildEnglishTranscript(segments) → English-only string
    — Promise.all([extractKeyPoints, extractActionItems])
    — generateMinutes(...)
    — prisma.output.create({ meetingId, keyPoints, actionItems, meetingMinutes })
    — status → "reviewing"

□ Worker dispatches on job.name:
    "process"  → Scribe v2 transcription pipeline
    "analyze"  → Gemini intelligence pipeline

□ GET /api/meetings/:id/transcript
□ GET /api/meetings/:id/output
```

**Definition of done:**

- Upload a real meeting recording with Burmese + English speech
- Worker logs: download → Scribe v2 → segments mapped → translation → saved
- Transcript table has diarizedSegments with correct Burmese Myanmar script
- Burmese segments: `originalLang: "my"` or `"my-en"`, `translatedText` in English
- English segments: `originalLang: "en"`, `translatedText: null`
- Status is `"transcript_reviewing"`
- Burmese text appears as Myanmar script — NOT Japanese/Vietnamese/Chinese characters

---

### 05 — Review Page (Human-in-the-Loop) — Two-Step HITL

The HITL review is split into two steps. The worker first sets status to
`transcript_reviewing` after transcription. The user reviews and confirms
the transcript in Step 1, which triggers AI analysis. Once analysis completes
(status `reviewing`), the user is redirected back for Step 2 to review output.

```
□ API routes in backend/src/routes/meetings.js:

    POST /api/meetings/:id/review/confirm-transcript
        — body: { speakerMap, diarizedSegments }
        — diarizedSegments includes: speaker, originalSpeaker, speakerOverride,
          text, originalLang, translatedText, start, end per segment
        — safety pass on received segments:
            for each segment where speakerOverride === false:
              if speakerMap[segment.originalSpeaker] exists:
                segment.speaker = speakerMap[segment.originalSpeaker]
            for each segment where speakerOverride === true:
              leave segment.speaker untouched — human correction respected
        — saves final diarizedSegments to Transcript table
        — queues BullMQ job.name "analyze" → status "analyzing"
        — return { status: "analyzing" }

    POST /api/meetings/:id/review/confirm
        — body: { speakerMap, meetingMinutes, actionItems,
                  attendees, minutesPreparedBy, datePrepared }
        — saves attendees to Meeting.attendees
          (creates Person records for entries where personId is null)
        — saves minutesPreparedBy + datePrepared to Output
        — creates MeetingParticipant rows + Person records per speaker
        — status → "done", completedAt set
        — return { status: "done" }

    POST /api/meetings/:id/review/discard
        — status → "discarded"
        — return { status: "discarded" }

□ GET /api/meetings/:id/audio-url
    — getDownloadUrl(meeting.audioKey) → presigned R2 URL
    — expires in 2 hours (long enough for review session)
    — return { url, contentType: meeting.audioContentType ?? "audio/mpeg" }
    — contentType used by AudioPlayer to set correct <source type> attribute
    — fallback "audio/mpeg" covers legacy meetings without stored contentType

□ Review.jsx — the HITL review shell
    — Fetches meeting + audio URL on mount
    — Branches on status:
        transcript_reviewing → renders StepTranscript
        analyzing            → renders processing state (polling continues)
        reviewing            → renders StepOutput
    — Redirects to /meetings/:id if status is "done"
    — Redirects to / if status is "discarded" or "failed"

□ AudioPlayer.jsx
    — Props: audioUrl, contentType, onTimeUpdate (fires with currentTime every 250ms)
    — HTML <audio> element, no browser default controls (controls={false})
    — Source element uses contentType prop directly:
        <audio ref={audioRef} preload="metadata">
          <source src={audioUrl} type={contentType} />
        </audio>
    — contentType matches whatever was uploaded:
        MP4  → "video/mp4"   (browser plays audio track, video track ignored)
        MP3  → "audio/mpeg"
        WAV  → "audio/wav"
        M4A  → "audio/mp4"
        WebM → "video/webm"
    — No conversion, no transcoding — browser handles all formats natively
    — Custom control bar:
        play/pause button (▶/⏸)
        current time display (MM:SS — DM Mono)
        progress bar (click to seek)
        duration display (MM:SS — DM Mono)
        speed selector (0.75× 1× 1.25× 1.5× 2×)
    — Exposes seekTo(seconds) via ref for TranscriptEditor to call
    — Sticky top of Step 1 page, z-index above content

□ TranscriptEditor.jsx
    — Props: segments, speakerMap, audioCurrentTime, onSegmentsChange,
             onSpeakerMapChange, onSeek (calls AudioPlayer.seekTo)
    — Renders each segment as an editable block
    — Manages two types of speaker editing: global rename and local override

        ── Segment states ──────────────────────────────────────────────────

        DEFAULT (not overridden, not hovered):
        ┌─────────────────────────────────────────────────────────┐
        │ AUNG NAING  [my]  00:02:14                             │
        │ ကောင်းပါပြီ၊ ဒီနှစ် budget က ဘယ်လောက်လဲ                │
        │ [EN] Okay, what is this year's budget?                  │
        └─────────────────────────────────────────────────────────┘

        HOVERED (show interactive affordances):
        ┌─────────────────────────────────────────────────────────┐
        │ [AUNG NAING ▼]  [↻]  [my]  00:02:14                   │
        │ ကောင်းပါပြီ၊ ဒီနှစ် budget က ဘယ်လောက်လဲ                │
        │ [EN] Okay, what is this year's budget?                  │
        └─────────────────────────────────────────────────────────┘
              ↑                ↑
        global rename    local override
        (all non-         (this segment
        overridden         only)
        segments)

        LOCALLY OVERRIDDEN (speakerOverride: true):
        ┌─────────────────────────────────────────────────────────┐
        │ SET LET  [my]  00:02:14  · reassigned                  │
        │ ကောင်းပါပြီ၊ ဒီနှစ် budget က ဘယ်လောက်လဲ                │
        │ [EN] Okay, what is this year's budget?                  │
        └─────────────────────────────────────────────────────────┘
                                    ↑
                            DM Mono, 9px, ink-4
                            signals human correction

        ── Global rename (click speaker label [▼]) ──────────────────────────

        — Dropdown: search input (debounced 300ms)
        — Searches /api/people/employees then /api/people/persons
        — "Use [typed name]" option at bottom
        — On select:
            update speakerMap: { [originalSpeaker]: selectedName }
            update ALL segments where:
              segment.originalSpeaker === this originalSpeaker
              AND segment.speakerOverride === false
            overridden segments (speakerOverride: true) are SKIPPED
            they have been manually corrected — global rename never touches them
        — Updates speakerMap state in parent via onSpeakerMapChange

        ── Local override (click reassign icon [↻]) ────────────────────────

        — Only visible on hover
        — Same search dropdown as global rename
        — On select:
            update THIS segment only:
              segment.speaker = selectedName
              segment.speakerOverride = true
            speakerMap is NOT updated — this is a per-segment correction
        — "· reassigned" indicator appears on the segment after override
        — Calls onSegmentsChange with updated segments

        ── Resetting an override ────────────────────────────────────────────

        — On hover of an overridden segment: reassign icon [↻] still shown
        — Also show a small "× reset" link next to "· reassigned"
        — Clicking "× reset":
            segment.speakerOverride = false
            segment.speaker = speakerMap[segment.originalSpeaker] ?? segment.originalSpeaker
            (reverts to whatever the global rename for this speaker label is)
            "· reassigned" indicator disappears

        ── Other segment fields ─────────────────────────────────────────────

        Language badge: shown only when originalLang !== "en"
          — DM Mono, 8px, ink-4, bg-ground, border-rule
        Timestamp: DM Mono, ink-4
          — Clicking seeks AudioPlayer to segment.start / 1000
        Original text: contenteditable div
          — Click to edit, click away or Escape to save
          — Updates segment.text in local state
        Translation row: shown only when translatedText is not null
          — "[EN]" prefix (DM Mono, ink-4) + editable translation text
          — Click to edit, click away to save
          — Updates segment.translatedText in local state
        Active segment highlight: when audioCurrentTime falls within
          segment.start/1000 and segment.end/1000:
          left border: 2px solid signal color
          background: signal-light at 30% opacity

    — Calls onSegmentsChange on every edit (debounced 500ms)
    — Calls onSpeakerMapChange when global rename applied

□ StepTranscript (Step 1 of 2) — Transcript Review
    — Header: "STEP 1 OF 2 — Review Transcript"
    — Sub-header: "Rename speakers, correct the transcript, then confirm."
    — AudioPlayer.jsx (sticky top)
    — Section: "Transcript" — TranscriptEditor.jsx (full, no collapse)
    — Bottom bar (sticky):
        Left: "Discard" (secondary button)
        Right: "Confirm Transcript →" (primary button)
    — On Confirm:
        POST /confirm-transcript with { speakerMap, diarizedSegments }
        Navigate to /meetings/:id
        Meeting.jsx polls: analyzing → reviewing → redirects back to /review
          for Step 2

□ StepOutput (Step 2 of 2) — Output Review
    — Header: "STEP 2 OF 2 — Review Minutes & Action Items"
    — Section 1: Attendees (AttendeeList.jsx)
        Pre-populated with renamed speaker names from Step 1
    — Section 2: Meeting Minutes
        Editable textarea, auto-grows, min-height 200px
        Footer below textarea (border-t):
          "Minutes Prepared By" input — default: logged-in employee name
          "Date Prepared" input — default: today's date
    — Section 3: Action Items — inline editable table (Task | Owner | Deadline)
    — Section 4: Key Points — read-only bulleted list
    — Bottom bar (sticky):
        Left: "Discard"
        Right: "Confirm & Save"

□ SpeakerMapper.jsx
    — Used inside TranscriptEditor for inline speaker rename
    — Standalone version no longer needed as a separate section
    — Exposes: speakerMap via onSpeakerMapChange

□ AttendeeList.jsx
    — Props: attendees [{personId, name}], onChange
    — Debounced search (300ms): /api/people/employees → /api/people/persons
    — "Add [name]" for no-match manual entries
    — Remove button per attendee
```

**Definition of done:** Step 1 loads audio player + editable transcript with
language badges. Speaker rename works inline. Text edits save to segment state.
Translation edits save. Confirm-transcript sends edited segments + speakerMap.
Worker analyze job runs. Step 2 loads with pre-populated attendees. Minutes
and action items editable. Confirm saves all and sets "done".

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
    — Employee, Person, MeetingParticipant models already in schema above
    — Run: npx prisma migrate dev --name add-auth-and-persons
    — Run: npx prisma generate

□ backend/src/routes/auth.js:

    POST /api/auth/register
        — validate: name, email, password required
        — check email not already taken
        — bcrypt.hash(password, 10) → passwordHash
        — prisma.person.create({ canonicalName: name, email })
        — prisma.employee.create({ name, email, passwordHash, jobTitle, personId })
        — sign JWT: { employeeId, email, role } — JWT_SECRET, expiresIn: "7d"
        — return { token, employee: { id, name, email, role } }

    POST /api/auth/login
        — find employee by email
        — bcrypt.compare(password, passwordHash)
        — if mismatch → 401 "Invalid email or password"
        — sign JWT, return { token, employee: { id, name, email, role } }

    GET /api/auth/me
        — requires auth middleware
        — return { employee: { id, name, email, role, jobTitle } }

□ backend/src/middleware/auth.js:
    — read Authorization: Bearer <token>
    — jwt.verify(token, JWT_SECRET) → decoded
    — attach to req.employee
    — missing/invalid → 401

□ Protect all existing routes:
    — all /api/meetings/* and /api/upload/* require auth
    — /api/auth/register and /api/auth/login stay public

□ backend/src/routes/people.js:
    GET /api/people/employees?q=
        — prisma.employee.findMany where name contains q (case-insensitive)
        — return [{id, name, jobTitle, personId}] max 8
    GET /api/people/persons?q=
        — prisma.person.findMany where canonicalName contains q
        — return [{id, canonicalName, jobTitle, email}] max 8

□ Update POST /api/upload/presign:
    — prisma.meeting.create({ ..., employeeId: req.employee.id })

□ Update GET /api/meetings:
    — admin: return all
    — member: filter by employeeId

□ frontend/src/lib/api.js:
    — add Authorization header: Bearer token from localStorage
    — add: register, login, getMe, searchEmployees, searchPersons
    — getAudioUrl(meetingId) → { url, contentType }
      used by Review.jsx to pass both to AudioPlayer

□ frontend/src/hooks/useAuth.js:
    — { employee, loading, login, logout }
    — on mount: read token → call getMe() to verify
    — logout: clears token, clears state

□ frontend/src/pages/Login.jsx + Register.jsx:
    — standard auth forms, centered card max-width 400px
    — "InMinutes" wordmark at top

□ frontend/src/App.jsx — protected routes:
    — /login, /register: public
    — all other routes: redirect to /login if no valid token

□ Seed first admin:
    UPDATE "Employee" SET role = 'admin' WHERE email = 'your@email.com';
```

**Definition of done:** Unauthenticated requests return 401. Register creates
Employee + Person. Login returns JWT. Meetings scoped by employee. People search
endpoints return results. Auth persists across page refresh.

---

### 06 — Meeting Output UI

```
□ Meeting.jsx — status polling + read-only tabbed output
    — on mount: fetch GET /api/meetings/:id
    — poll every 5 seconds while status not terminal
    — terminal: done | failed | discarded
    — if status is "transcript_reviewing" or "reviewing" → redirect to /review
    — when "done": fetch transcript + output in parallel, render tabs

    Processing states and messages:
        uploading            → "Uploading recording..."
        transcribing         → "Transcribing audio with speaker detection..."
        transcript_reviewing → redirect to /review (Step 1)
        analyzing            → "Analyzing with AI..."
        reviewing            → redirect to /review (Step 2)

    Done state — shadcn Tabs (4 tabs, all read-only):
    — Minutes (default) · Action Items · Key Points · Transcript
    — No editing on this page — output is final

    Discarded state:
    — StatusBadge "Discarded"
    — "This meeting was discarded during review."
    — Link: "Upload a new recording →"

□ MinutesView.jsx
    — Attendees section at top (above minutes text):
        renders Meeting.attendees as a comma-separated list
        "Attendees: Name 1, Name 2, Name 3"
    — Minutes Prepared By + Date Prepared below attendees:
        "Prepared by [minutesPreparedBy] · [datePrepared]"
        DM Mono, ink-4, 11px
    — meetingMinutes rendered as plain preformatted text
    — "Copy" button → copies full output including attendees + metadata
    — "Export .md" button → Blob download with attendees + metadata prepended

□ ActionItemsTable.jsx — read-only on this page
□ TranscriptView.jsx — read-only, shows diarizedSegments
    — For non-English segments: show original text + translation below
    — Language badge per segment when originalLang !== "en"
□ Key Points tab — read-only bulleted list

□ Failed state:
    — "This meeting could not be processed."
    — show errorMsg if present
```

**Definition of done:** Done meetings show all four tabs with correct data.
Minutes tab shows attendees and prepared-by metadata. Transcript tab shows
language badges and translations for non-English segments. Copy and export
include full metadata.

---

### 07 — Loading + Error + Empty States

Every screen must have all three. No exceptions.

```
□ LOADING — skeleton screens using skeletonPulse, never spinners
    — Home MeetingList: 3 skeleton cards
    — Meeting processing: StatusBadge + animated message
    — Meeting output tabs: skeleton lines
    — Review Step 1: skeleton for AudioPlayer + transcript segments
    — Review Step 2: skeleton for attendees list + textarea + table

□ ERROR — human language + recovery action
    — Upload failure: "Upload failed. Check your connection and try again."
    — Processing failed: "This meeting could not be processed."
    — Alignment failure: worker continues with "Unknown" speaker — never fails job
    — Translation failure: worker continues with translatedText: null — never fails job
    — Gemini file upload failure: status → "failed", errorMsg shown to user
    — Review confirm failure: "Could not save your changes. Try again."
    — Never show raw errors or stack traces

□ EMPTY — actionable, never blank
    — Home: "No meetings yet. Upload your first recording above."
    — ActionItemsTable: "No action items detected in this meeting."
    — Key points: "No key points were extracted."
    — Transcript: "Transcript is not available."
    — Attendees in MinutesView: "No attendees recorded." (not blank)

□ File validation (UploadZone):
    — Wrong format: "Unsupported format. Use MP4, WebM, MP3, WAV, or M4A."
    — Too large: "File too large. Maximum size is 500MB."
```

**Definition of done:** Every screen tested in all three states.
Translation failures degrade gracefully — meeting still processes.

---

### 08 — Polish Pass

Do this after all features are working. Not while building features.

```
□ Animations audit
    — MeetingList cards: fadeIn staggered 40ms per card
    — Tab content: fadeIn 200ms on tab switch
    — Status badge: progressPulse on transcribing/analyzing
    — Active segment in TranscriptEditor: smooth border transition (150ms)
    — Hover transitions: 150ms on all interactive elements

□ Typography audit
    — headings: Inter 600
    — body: Inter 400
    — metadata + badges + language badges + speaker labels: DM Mono

□ Color audit
    — no hardcoded hex — CSS variables or Tailwind tokens only

□ shadcn override audit
    — Card: rounded-none, border-rule
    — no default shadcn blue/purple leaking through

□ Copy audit
    — no placeholder copy anywhere
    — all empty states are specific and actionable

□ Responsive check
    — Home: 768px minimum
    — Review page: TranscriptEditor readable at 768px
    — Audio player controls usable on touch
    — Meeting tabs scroll correctly at narrow widths
```

**Definition of done:** No animation jank. No rogue fonts. No hardcoded colors.
Audio player usable on touch. TranscriptEditor segments readable at 768px.

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
✓ ElevenLabs Scribe v2 transcribes audio in a single API call
✓ Burmese, English, and intra-sentence code-switching handled natively
✓ Speaker diarization and word-level timestamps from Scribe v2 — no separate service
✓ Zarla keyterms fed to Scribe for improved accuracy on product/company names
✓ Non-English segments translated to English by Gemini before AI analysis
✓ Translation failures degrade gracefully — null translatedText, job continues
✓ Burmese script preserved exactly in original text field
✓ Gemini extracts key points, action items, and meeting minutes from English transcript
✓ Employees can register and log in — JWT auth
✓ Person record auto-created on registration — seeds the registry
✓ All routes protected — unauthenticated requests return 401
✓ Meetings linked to the uploading employee
✓ Meeting list scoped per employee (admin sees all)
✓ Worker transcription ends at "transcript_reviewing" — never skips Step 1
✓ Step 1 HITL: audio player synced to transcript, editable segments,
  inline speaker rename via dropdown, language badges, translation editing
✓ Global speaker rename: clicking label renames all non-overridden segments at once
✓ Local speaker override: reassign icon [↻] on hover changes one segment only
✓ Overridden segments show "· reassigned" indicator and can be reset
✓ Global rename never touches locally overridden segments
✓ Transcript edits (text + translation + speaker corrections) sent to backend
✓ AI analysis runs on confirmed English transcript — respects human corrections
✓ Step 2 HITL: attendees, editable minutes, editable action items, prepared-by metadata
✓ Confirm creates MeetingParticipant rows + Person records per speaker
✓ Manual attendee entries auto-create Person records on confirm
✓ Meeting detail is fully read-only — all four tabs correct
✓ Minutes tab shows attendees + prepared-by metadata separately from markdown
✓ Transcript tab shows language badges + translations for non-English segments
✓ Copy and export include attendees + metadata
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
✗ Change the AI provider — Google Gemini gemini-2.5-flash-lite only
✗ Hard-delete any database row in Phase 1
✗ Use AssemblyAI — replaced by ElevenLabs Scribe v2 entirely
✗ Use Gemini File API for transcription — Scribe v2 handles all transcription
✗ Skip deleteGeminiFile — no longer applicable, Scribe v2 has no file cleanup
✗ Fail the whole job because of translation errors — log and continue with null translatedText
✗ Add a language selector to the upload form — always-mixed, always Burmese primary
✗ Set meeting status directly to "done" from the worker — always goes through HITL
✗ Allow editing on the Meeting detail page — review is the only edit surface
✗ Use browser default audio controls — always custom AudioPlayer.jsx
✗ Change the STT provider from ElevenLabs Scribe v2 without updating this file
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
