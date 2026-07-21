import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/StatusBadge";
import { MinutesView } from "@/components/MinutesView";
import { ActionItemsTable } from "@/components/ActionItemsTable";
import { TranscriptView } from "@/components/TranscriptView";
import { getMeeting, getMeetingTranscript, getMeetingOutput } from "@/lib/api";

const TERMINAL = ["done", "failed"];

const PROCESSING_MESSAGES = {
  uploading: "Uploading recording...",
  transcribing: "Transcribing audio with speaker detection...",
  analyzing: "Analyzing with AI...",
  pending: "Queued for processing...",
};

function SkeletonLine({ width = "w-full" }) {
  return (
    <div
      className={`bg-ground h-4 ${width} rounded`}
      style={{ animation: "skeletonPulse 1.5s ease infinite" }}
    />
  );
}

function KeyPointsList({ keyPoints }) {
  if (!keyPoints || keyPoints.length === 0) {
    return (
      <p className="font-body font-light text-ink-4 text-[13px] text-center py-4">
        No key points were extracted.
      </p>
    );
  }
  return (
    <ul className="flex flex-col" style={{ gap: "8px" }}>
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
  );
}

export function Meeting() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(true);
  const [outputLoading, setOutputLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let intervalId;

    async function fetchMeeting() {
      try {
        const data = await getMeeting(id);
        setMeeting(data);

        if (data.status === "done") {
          setOutputLoading(true);
          const [t, o] = await Promise.all([
            getMeetingTranscript(id),
            getMeetingOutput(id),
          ]);
          setTranscript(t);
          setOutput(o);
          setOutputLoading(false);
        }

        return data.status;
      } catch (err) {
        setError("Meeting not found.");
        return "failed";
      } finally {
        setLoading(false);
      }
    }

    async function startPolling() {
      const status = await fetchMeeting();
      if (!TERMINAL.includes(status)) {
        intervalId = setInterval(async () => {
          const s = await fetchMeeting();
          if (TERMINAL.includes(s)) clearInterval(intervalId);
        }, 5000);
      }
    }

    startPolling();
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-[720px] mx-auto px-6 py-10 flex flex-col gap-6">
        <SkeletonLine width="w-16" />
        <div className="flex flex-col gap-3">
          <SkeletonLine width="w-64" />
          <SkeletonLine width="w-32" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[720px] mx-auto px-6 py-10 flex flex-col gap-3">
        <p className="font-body text-[13px] text-danger">{error}</p>
        <button
          onClick={() => navigate("/")}
          className="font-body text-[13px] text-signal underline underline-offset-4 text-left"
        >
          Back to home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[720px] mx-auto px-6 py-10 flex flex-col gap-5">
      <button
        onClick={() => navigate("/")}
        className="font-mono text-[12px] text-ink-4 hover:text-ink-3 transition-colors text-left w-fit"
      >
        ← Back
      </button>

      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-body font-semibold text-ink text-[18px] leading-snug">
            {meeting.title}
          </h1>
          <StatusBadge status={meeting.status} />
        </div>
        <span className="font-mono text-ink-4 text-[12px]">
          {new Date(meeting.createdAt).toLocaleString()}
        </span>
      </div>

      {!TERMINAL.includes(meeting.status) && (
        <div className="flex flex-col items-center gap-3 py-8">
          <StatusBadge status={meeting.status} />
          <p className="font-body font-light text-ink-3 text-[13px]">
            {PROCESSING_MESSAGES[meeting.status] ?? "Processing..."}
          </p>
        </div>
      )}

      {meeting.status === "failed" && (
        <div className="flex flex-col gap-1">
          <p className="font-body text-[13px] text-ink-2">
            This meeting could not be processed.
          </p>
          {meeting.errorMsg && (
            <p className="font-body font-light text-[13px] text-ink-3">
              {meeting.errorMsg}
            </p>
          )}
        </div>
      )}

      {meeting.status === "done" && (
        outputLoading ? (
          <div className="flex flex-col gap-3">
            <SkeletonLine />
            <SkeletonLine width="w-3/4" />
            <SkeletonLine width="w-1/2" />
          </div>
        ) : (
          <Tabs
            defaultValue="minutes"
            className="flex-col gap-0"
          >
            <div className="border-b border-rule">
              <TabsList
                variant="line"
                className="w-full justify-start rounded-none bg-transparent p-0 h-auto gap-0"
              >
                {[
                  { value: "minutes", label: "Minutes" },
                  { value: "action-items", label: "Action Items" },
                  { value: "key-points", label: "Key Points" },
                  { value: "transcript", label: "Transcript" },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="font-body font-medium text-[13px] text-ink-3 data-active:text-ink rounded-none px-4 py-2.5 h-auto border-0 bg-transparent hover:text-ink-2 transition-colors after:bottom-[-1px]"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent
              value="minutes"
              className="mt-0 pt-5"
              style={{ animation: "fadeIn 200ms ease" }}
            >
              <MinutesView
                minutes={output?.meetingMinutes ?? ""}
                title={meeting.title}
              />
            </TabsContent>

            <TabsContent
              value="action-items"
              className="mt-0 pt-5"
              style={{ animation: "fadeIn 200ms ease" }}
            >
              <ActionItemsTable actionItems={output?.actionItems ?? []} />
            </TabsContent>

            <TabsContent
              value="key-points"
              className="mt-0 pt-5"
              style={{ animation: "fadeIn 200ms ease" }}
            >
              <KeyPointsList keyPoints={output?.keyPoints ?? []} />
            </TabsContent>

            <TabsContent
              value="transcript"
              className="mt-0 pt-5"
              style={{ animation: "fadeIn 200ms ease" }}
            >
              <TranscriptView segments={transcript?.diarizedSegments ?? []} />
            </TabsContent>
          </Tabs>
        )
      )}
    </div>
  );
}
