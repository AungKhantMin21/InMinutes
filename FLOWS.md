# InMinutes — Application Flows

Render with any Mermaid-compatible viewer (GitHub, VS Code + Mermaid extension, Obsidian).

---

## 1. Auth Flow

```mermaid
flowchart TD
    A([User visits any page]) --> B{Has valid JWT?}
    B -- No --> C[Redirect to /login]
    B -- Yes --> D[Load page normally]

    C --> E{Register or Login?}
    E -- Register --> F[/register\nname + email + password + jobTitle]
    E -- Login --> G[/login\nemail + password]

    F --> H[POST /api/auth/register\nCreates Employee + Person record]
    G --> I[POST /api/auth/login\nbcrypt.compare password]

    H --> J[Returns JWT token]
    I --> J

    J --> K[Store token in localStorage]
    K --> L[Redirect to /]
```

---

## 2. Upload Flow

```mermaid
flowchart TD
    A([Home /]) --> B[UploadZone\nPick file + enter title\nOptional: number of speakers]
    B --> C[POST /api/upload/presign\nCreates Meeting row — status: uploading\nReturns presigned R2 URL]
    C --> D[Browser uploads file\nDIRECTLY to Cloudflare R2\nProgress bar shown\nExpress never touches the bytes]
    D --> E[POST /api/upload/confirm/:id\nQueues BullMQ 'process' job]
    E --> F[Navigate to /meetings/:id]
    F --> G[Meeting.jsx starts polling\nevery 5 seconds]
```

---

## 3. Worker Pipeline — Transcription

```mermaid
flowchart TD
    A([BullMQ job: 'process'\nmeetingId + audioKey + audioContentType + speakersExpected]) --> B[Status → transcribing]
    B --> C[Download audio from R2\nvia presigned URL → buffer]
    C --> D[ElevenLabs Scribe v2\nNo forced language — auto-detects\nBurmese + English code-switching\nSpeaker diarization\nWord-level timestamps\nZarla keyterms]
    D --> E[Map words → utterance segments\ngrouped by speakerId\nadd originalSpeaker + speakerOverride: false]
    E --> F[detectLang per segment\nen / my / my-en]
    F --> G[Gemini: translateNonEnglishSegments\nbatches of 10\nfills translatedText]
    G --> H{Translation error?}
    H -- Yes --> I[Log error\nkeep translatedText: null\ncontinue — never fail job]
    H -- No --> J[Save Transcript row\nrawText + diarizedSegments]
    I --> J
    J --> K[Status → transcript_reviewing]
    K --> L([Polling detects →\nredirect to /meetings/:id/review])
```

---

## 4. HITL Review — Step 1: Transcript

```mermaid
flowchart TD
    A([/meetings/:id/review\nstatus: transcript_reviewing]) --> B[Load transcript\n+ fetch audio URL from R2]
    B --> C[AudioPlayer — sticky top bar\nplay/pause · progress · speed 0.75×–2×]
    C --> D[TranscriptEditor\nOne block per segment]

    D --> E{User action}

    E -- Hover speaker label --> F[Show global rename chip\nSPEAKER ▼]
    F --> G[Click ▼ → search dropdown\nSearches employees + persons\n'Use typed name' fallback]
    G --> H[Global rename\nUpdates ALL non-overridden segments\nwith same originalSpeaker\nUpdates speakerMap]

    E -- Hover → click ↻ segment --> I[Local override dropdown\nSame search UI]
    I --> J[Renames this segment only\nspeakerOverride: true\nShows '↻ reassigned × reset' chip]
    J --> K{Click × reset?}
    K -- Yes --> L[Revert to global speaker name\nspeakerOverride: false]

    E -- Click transcript text --> M[contenteditable inline edit\nBlur or Escape to save\nUpdates segment.text]
    E -- Click translation text --> N[Edit English translation\nUpdates segment.translatedText]
    E -- Click timestamp --> O[Seeks AudioPlayer to that moment]

    D --> P{Bottom bar action}
    P -- Confirm Transcript → --> Q[POST /api/meetings/:id/review/confirm-transcript\nSends full edited segments + speakerMap\nBackend: safety pass applies speakerMap\nto non-overridden segments only\nQueues 'analyze' job\nStatus → analyzing]
    Q --> R[Navigate to /meetings/:id\nPolling resumes]
    P -- Discard --> S[POST /api/meetings/:id/review/discard\nStatus → discarded\nNavigate to /]
```

---

## 5. Worker Pipeline — Analysis

```mermaid
flowchart TD
    A([BullMQ job: 'analyze'\nmeetingId + title]) --> B[Status → analyzing]
    B --> C[Read final diarizedSegments from DB\nhas human corrections from Step 1]
    C --> D[buildEnglishTranscript\nuse translatedText ?? text per segment\nformat: 'SpeakerName: text']
    D --> E[Gemini — parallel]
    E --> F[extractKeyPoints\n→ string array]
    E --> G[extractActionItems\n→ task + owner + deadline]
    F --> H[generateMinutes\nSummary · Key Points · Decisions\nAction Items · Next Steps\nno attendees or signature block]
    G --> H
    H --> I[Save Output row\nkeyPoints + actionItems + meetingMinutes]
    I --> J[Status → reviewing]
    J --> K([Polling detects →\nredirect to /meetings/:id/review])
```

---

## 6. HITL Review — Step 2: Output

```mermaid
flowchart TD
    A([/meetings/:id/review\nstatus: reviewing]) --> B[Load output + transcript\nPre-populate attendees from speaker names]

    B --> C[Attendees section\nDebounced search — employees + persons\nAdd typed name for no-match\nRemove per attendee]

    B --> D[Meeting Minutes\nAuto-growing textarea\nFully editable\nMinutes Prepared By — default: logged-in employee\nDate Prepared — default: today]

    B --> E[Action Items table\nClick any cell to edit inline\n+ Add row button\nTask / Owner / Deadline]

    B --> F[Key Points\nRead-only bulleted list]

    C --> G{Bottom bar action}
    D --> G
    E --> G
    F --> G

    G -- Confirm & Save --> H[POST /api/meetings/:id/review/confirm\nSaves attendees to Meeting.attendees\nCreates Person records for manual entries\nSaves minutesPreparedBy + datePrepared\nCreates MeetingParticipant + Person rows\nStatus → done · completedAt set]
    H --> I[Navigate to /meetings/:id]

    G -- Discard --> J[POST /api/meetings/:id/review/discard\nStatus → discarded\nNavigate to /]
```

---

## 7. Meeting Detail — Read-Only

```mermaid
flowchart TD
    A([/meetings/:id\nPolling every 5s]) --> B{status?}

    B -- uploading / transcribing / analyzing --> C[Show status badge + message\nKeep polling]
    B -- transcript_reviewing --> D[Redirect to /meetings/:id/review Step 1]
    B -- reviewing --> E[Redirect to /meetings/:id/review Step 2]
    B -- failed --> F[Show error message\nShow errorMsg if present]
    B -- discarded --> G[Show discarded state\nUpload a new recording → link]

    B -- done --> H[Fetch transcript + output in parallel]
    H --> I[4 tabs — all read-only]

    I --> J[Minutes tab\nAttendees list\nPrepared by · date\nFull minutes text\nCopy button\nExport .md button]

    I --> K[Action Items tab\nRead-only table\nTask / Owner / Deadline]

    I --> L[Key Points tab\nRead-only bulleted list]

    I --> M[Transcript tab\nSpeaker-labeled segments\nLanguage badges for non-English\nEnglish translations below Burmese segments]
```

---

## 8. Full End-to-End

```mermaid
flowchart LR
    A([Login / Register]) --> B[Home\nUpload recording]
    B --> C[(Cloudflare R2\naudio stored)]
    B --> D[(PostgreSQL\nMeeting row created)]
    D --> E([Worker — Transcription\nElevenLabs Scribe v2\n+ Gemini translation])
    E --> D
    E --> F([Review Step 1\nEdit transcript\nRename speakers])
    F --> G([Worker — Analysis\nGemini key points\naction items\nmeeting minutes])
    G --> H([Review Step 2\nAttendees · minutes\naction items])
    H --> I([Meeting Detail\nRead-only\n4 tabs])
```
