import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { SpeakerMapper } from "@/components/SpeakerMapper";
import { AttendeeList } from "@/components/AttendeeList";
import { useAuth } from "@/hooks/useAuth";
import {
  getMeeting,
  getMeetingTranscript,
  getMeetingOutput,
  confirmTranscript,
  confirmReview,
  discardReview,
} from "@/lib/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function todayString() {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function Skeleton({ width = "w-full", height = "h-3" }) {
  return (
    <div
      className={`bg-ground ${height} ${width} rounded`}
      style={{ animation: "skeletonPulse 1.5s ease infinite" }}
    />
  );
}

function SectionLabel({ label }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-ink-4 whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-rule" />
    </div>
  );
}

function ReviewSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Skeleton width="w-48" height="h-5" />
        <Skeleton width="w-32" height="h-3" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton width="w-36" height="h-3" />
        <Skeleton width="w-full" height="h-8" />
        <Skeleton width="w-full" height="h-8" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton width="w-36" height="h-3" />
        <Skeleton width="w-full" height="h-4" />
        <Skeleton width="w-5/6" height="h-4" />
        <Skeleton width="w-4/5" height="h-4" />
        <Skeleton width="w-full" height="h-4" />
        <Skeleton width="w-3/4" height="h-4" />
      </div>
    </div>
  );
}

function EditableCell({ value, onChange, mono = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    setEditing(false);
    onChange(draft);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
        className={`w-full bg-transparent outline-none border-b border-rule-hi ${
          mono ? "font-mono text-[11px] text-ink-3" : "font-body text-[13px] text-ink"
        }`}
      />
    );
  }

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      className={`cursor-text block w-full min-h-[20px] ${
        mono ? "font-mono text-[11px] text-ink-3" : "font-body text-[13px] text-ink"
      }`}
    >
      {value || <span className="text-ink-4">—</span>}
    </span>
  );
}

// ─── Step 1 — Transcript Review ───────────────────────────────────────────────

function StepTranscript({ meeting, transcript, onConfirm, onDiscard }) {
  const [speakerMap, setSpeakerMap] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [error, setError] = useState("");
  const [transcriptExpanded, setTranscriptExpanded] = useState(true);

  const segments = transcript?.diarizedSegments ?? [];

  const grouped = segments.reduce((acc, seg) => {
    const last = acc[acc.length - 1];
    if (last && last.speaker === seg.speaker) {
      last.texts.push(seg.text);
    } else {
      acc.push({ speaker: seg.speaker, texts: [seg.text], start: seg.start });
    }
    return acc;
  }, []);

  const visibleGroups = transcriptExpanded ? grouped : grouped.slice(0, 3);

  async function handleConfirm() {
    setConfirming(true);
    setError("");
    const filteredMap = Object.fromEntries(
      Object.entries(speakerMap).filter(([, v]) => v.trim() !== "")
    );
    try {
      await onConfirm({ speakerMap: filteredMap });
    } catch {
      setError("Could not confirm transcript. Try again.");
      setConfirming(false);
    }
  }

  async function handleDiscard() {
    setDiscarding(true);
    try {
      await onDiscard();
    } catch {
      setError("Could not discard this meeting. Try again.");
      setDiscarding(false);
    }
  }

  return (
    <div className="max-w-[720px] mx-auto px-6 py-10 pb-28 flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-ink-4 tracking-[0.1em]">STEP 1 OF 2</span>
        </div>
        <h1 className="font-body font-semibold text-ink text-[18px] leading-snug">
          Review Transcript
        </h1>
        <p className="font-body font-medium text-ink text-[14px]">{meeting.title}</p>
        <span className="font-mono text-ink-4 text-[12px]">
          {new Date(meeting.createdAt).toLocaleString()}
        </span>
      </div>

      <section>
        <SectionLabel label="Speakers Detected" />
        <SpeakerMapper segments={segments} onChange={setSpeakerMap} />
      </section>

      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-ink-4 whitespace-nowrap">
            Transcript
          </span>
          <div className="flex-1 h-px bg-rule" />
          <button
            onClick={() => setTranscriptExpanded((v) => !v)}
            className="font-mono text-[10px] text-ink-4 hover:text-ink-3 transition-colors duration-150 shrink-0"
          >
            {transcriptExpanded ? "Collapse" : "Expand"}
          </button>
        </div>

        {segments.length === 0 ? (
          <p className="font-body font-light text-ink-4 text-[13px]">
            Transcript is not available.
          </p>
        ) : (
          <div
            className={`flex flex-col gap-4 ${transcriptExpanded ? "overflow-y-auto pr-1" : ""}`}
            style={transcriptExpanded ? { maxHeight: "480px" } : undefined}
          >
            {visibleGroups.map((group, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] tracking-widest uppercase text-ink-4">
                    {group.speaker}
                  </span>
                  <span className="font-mono text-[9px] text-ink-4">
                    {formatTime(group.start)}
                  </span>
                </div>
                <p className="font-body font-light text-[13px] text-ink-2 leading-[1.6]">
                  {group.texts.join(" ")}
                </p>
              </div>
            ))}
            {!transcriptExpanded && grouped.length > 3 && (
              <button
                onClick={() => setTranscriptExpanded(true)}
                className="font-body text-[13px] text-signal hover:text-signal/80 transition-colors duration-150 text-left"
              >
                Show full transcript ({grouped.length} blocks)
              </button>
            )}
          </div>
        )}
      </section>

      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-rule px-6 py-4">
        <div className="max-w-[720px] mx-auto w-full flex items-center justify-between gap-4">
          {error ? (
            <p className="font-body text-[13px] text-danger">{error}</p>
          ) : (
            <p className="font-body font-light text-ink-4 text-[13px]">
              Rename speakers above, then confirm to run AI analysis.
            </p>
          )}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleDiscard}
              disabled={discarding || confirming}
              className="font-body font-medium text-[13px] text-ink-3 px-4 py-2 border border-rule hover:border-rule-hi transition-colors duration-150 disabled:opacity-50"
            >
              {discarding ? "Discarding..." : "Discard"}
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirming || discarding}
              className="font-body font-medium text-[13px] text-white bg-ink px-4 py-2 hover:bg-ink-2 transition-colors duration-150 disabled:opacity-50"
            >
              {confirming ? "Confirming..." : "Confirm Transcript →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 2 — Output Review ───────────────────────────────────────────────────

function StepOutput({ meeting, output, employee, initialAttendees, onConfirm, onDiscard }) {
  const [minutes, setMinutes] = useState(output?.meetingMinutes ?? "");
  const [actionItems, setActionItems] = useState(
    output?.actionItems?.length > 0
      ? output.actionItems
      : [{ task: "", owner: "", deadline: null }]
  );
  const [attendees, setAttendees] = useState(initialAttendees ?? []);
  const [minutesPreparedBy, setMinutesPreparedBy] = useState(employee?.name ?? "");
  const [datePrepared, setDatePrepared] = useState(todayString());
  const [saving, setSaving] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [error, setError] = useState("");

  const textareaRef = useRef(null);

  const keyPoints = output?.keyPoints ?? [];

  function autoGrow(el) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  function updateActionItem(rowIndex, field, value) {
    setActionItems((prev) =>
      prev.map((item, i) => (i === rowIndex ? { ...item, [field]: value } : item))
    );
  }

  function addRow() {
    setActionItems((prev) => [...prev, { task: "", owner: "", deadline: null }]);
  }

  async function handleConfirm() {
    setSaving(true);
    setError("");
    try {
      await onConfirm({
        speakerMap: {},
        meetingMinutes: minutes,
        actionItems,
        attendees,
        minutesPreparedBy,
        datePrepared,
      });
    } catch {
      setError("Could not save your changes. Try again.");
      setSaving(false);
    }
  }

  async function handleDiscard() {
    setDiscarding(true);
    try {
      await onDiscard();
    } catch {
      setError("Could not discard this meeting. Try again.");
      setDiscarding(false);
    }
  }

  return (
    <div className="max-w-[720px] mx-auto px-6 py-10 pb-28 flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-ink-4 tracking-[0.1em]">STEP 2 OF 2</span>
        </div>
        <h1 className="font-body font-semibold text-ink text-[18px] leading-snug">
          Review Minutes & Action Items
        </h1>
        <p className="font-body font-medium text-ink text-[14px]">{meeting.title}</p>
        <span className="font-mono text-ink-4 text-[12px]">
          {new Date(meeting.createdAt).toLocaleString()}
        </span>
      </div>

      <section>
        <SectionLabel label="Attendees" />
        <AttendeeList attendees={attendees} onChange={setAttendees} />
      </section>

      <section>
        <SectionLabel label="Meeting Minutes" />
        <textarea
          ref={textareaRef}
          value={minutes}
          onChange={(e) => {
            setMinutes(e.target.value);
            autoGrow(e.target);
          }}
          onInput={(e) => autoGrow(e.target)}
          className="w-full px-3 py-2.5 border border-rule bg-white font-body font-light text-ink-2 text-[13px] leading-[1.8] outline-none focus:border-rule-hi resize-none overflow-hidden"
          style={{ minHeight: "200px" }}
        />

        <div className="mt-4 border-t border-rule pt-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <label className="font-body text-[13px] text-ink-2 w-40 shrink-0">
              Minutes Prepared By
            </label>
            <input
              type="text"
              value={minutesPreparedBy}
              onChange={(e) => setMinutesPreparedBy(e.target.value)}
              className="flex-1 px-2 py-1 border border-rule bg-white font-body text-ink text-[13px] outline-none focus:border-rule-hi"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="font-body text-[13px] text-ink-2 w-40 shrink-0">
              Date Prepared
            </label>
            <input
              type="text"
              value={datePrepared}
              onChange={(e) => setDatePrepared(e.target.value)}
              className="flex-1 px-2 py-1 border border-rule bg-white font-body text-ink text-[13px] outline-none focus:border-rule-hi"
            />
          </div>
        </div>
      </section>

      <section>
        <SectionLabel label="Action Items" />
        <Table>
          <TableHeader>
            <TableRow className="border-rule">
              <TableHead className="font-body font-medium text-ink text-[13px] px-0 pb-2">
                Task
              </TableHead>
              <TableHead className="font-body font-medium text-ink text-[13px] px-3 pb-2">
                Owner
              </TableHead>
              <TableHead className="font-body font-medium text-ink text-[13px] px-3 pb-2">
                Deadline
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {actionItems.length === 0 ? (
              <TableRow className="border-rule">
                <TableCell colSpan={3} className="px-0 py-3">
                  <p className="font-body font-light text-ink-4 text-[13px]">
                    No action items. Add one below.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              actionItems.map((item, i) => (
                <TableRow key={i} className="border-rule align-top">
                  <TableCell className="px-0 py-3 align-top">
                    <EditableCell
                      value={item.task}
                      onChange={(v) => updateActionItem(i, "task", v)}
                    />
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top">
                    <EditableCell
                      value={item.owner}
                      onChange={(v) => updateActionItem(i, "owner", v)}
                      mono
                    />
                  </TableCell>
                  <TableCell className="px-3 py-3 align-top">
                    <EditableCell
                      value={item.deadline ?? ""}
                      onChange={(v) => updateActionItem(i, "deadline", v || null)}
                      mono
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <button
          onClick={addRow}
          className="mt-3 font-body text-[13px] text-signal hover:text-signal/80 transition-colors duration-150"
        >
          + Add row
        </button>
      </section>

      <section>
        <SectionLabel label="Key Points — Read Only" />
        {keyPoints.length === 0 ? (
          <p className="font-body font-light text-ink-4 text-[13px]">
            No key points were extracted.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {keyPoints.map((point, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span
                  className="bg-ink-4 shrink-0 mt-[6px]"
                  style={{ width: "3px", height: "3px" }}
                />
                <span className="font-body text-[13px] text-ink-2 leading-[1.7]">
                  {point}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-rule px-6 py-4">
        <div className="max-w-[720px] mx-auto w-full flex items-center justify-between gap-4">
          {error ? (
            <p className="font-body text-[13px] text-danger">{error}</p>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleDiscard}
              disabled={discarding || saving}
              className="font-body font-medium text-[13px] text-ink-3 px-4 py-2 border border-rule hover:border-rule-hi transition-colors duration-150 disabled:opacity-50"
            >
              {discarding ? "Discarding..." : "Discard"}
            </button>
            <button
              onClick={handleConfirm}
              disabled={saving || discarding}
              className="font-body font-medium text-[13px] text-white bg-ink px-4 py-2 hover:bg-ink-2 transition-colors duration-150 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Confirm & Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Review page shell ────────────────────────────────────────────────────────

export function Review() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { employee } = useAuth();

  const [meeting, setMeeting] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [output, setOutput] = useState(null);
  const [initialAttendees, setInitialAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const m = await getMeeting(id);

        if (m.status === "done") {
          navigate(`/meetings/${id}`);
          return;
        }

        if (m.status === "transcript_reviewing") {
          const t = await getMeetingTranscript(id);
          setMeeting(m);
          setTranscript(t);
        } else if (m.status === "reviewing") {
          const [o, t] = await Promise.all([
            getMeetingOutput(id),
            getMeetingTranscript(id),
          ]);
          setMeeting(m);
          setOutput(o);

          // Pre-populate attendees from renamed speaker names in the confirmed transcript
          const segments = t?.diarizedSegments ?? [];
          const uniqueNames = [...new Set(segments.map((s) => s.speaker))].filter(Boolean);
          setInitialAttendees(uniqueNames.map((name) => ({ personId: null, name })));
        } else {
          navigate("/");
        }
      } catch {
        setError("Could not load this meeting. Try again.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  async function handleConfirmTranscript({ speakerMap }) {
    await confirmTranscript(id, { speakerMap });
    navigate(`/meetings/${id}`);
  }

  async function handleConfirmOutput(payload) {
    await confirmReview(id, payload);
    navigate(`/meetings/${id}`);
  }

  async function handleDiscard() {
    await discardReview(id);
    navigate("/");
  }

  if (loading) {
    return (
      <div className="max-w-[720px] mx-auto px-6 py-10">
        <ReviewSkeleton />
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="max-w-[720px] mx-auto px-6 py-10 flex flex-col gap-3">
        <p className="font-body text-[13px] text-danger">
          {error || "Meeting not found."}
        </p>
        <button
          onClick={() => navigate("/")}
          className="font-body text-[13px] text-signal underline underline-offset-4 text-left"
        >
          Back to home
        </button>
      </div>
    );
  }

  if (meeting.status === "transcript_reviewing") {
    return (
      <StepTranscript
        meeting={meeting}
        transcript={transcript}
        onConfirm={handleConfirmTranscript}
        onDiscard={handleDiscard}
      />
    );
  }

  return (
    <StepOutput
      meeting={meeting}
      output={output}
      employee={employee}
      initialAttendees={initialAttendees}
      onConfirm={handleConfirmOutput}
      onDiscard={handleDiscard}
    />
  );
}
