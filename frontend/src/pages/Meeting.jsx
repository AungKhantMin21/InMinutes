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
  uploading: "Preparing your recording...",
  transcribing: "Transcribing audio with speaker detection...",
  analyzing: "Analyzing with AI...",
  pending: "Waiting to process...",
};

function SkeletonLine({ width = "w-full" }) {
  return (
    <div
      className={`bg-ground h-4 ${width} rounded`}
      style={{ animation: "skeletonPulse 1.5s ease infinite" }}
    />
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
          if (TERMINAL.includes(s)) {
            clearInterval(intervalId);
          }
        }, 5000);
      }
    }

    startPolling();
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-6">
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
      <div className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-3">
        <p className="font-body text-sm text-danger">{error}</p>
        <button
          onClick={() => navigate("/")}
          className="font-body text-sm text-signal underline underline-offset-4 text-left"
        >
          Back to home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-6">
      <button
        onClick={() => navigate("/")}
        className="font-mono text-xs text-ink-4 hover:text-ink-3 transition-colors text-left w-fit"
      >
        ← Back
      </button>

      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-body font-semibold text-ink text-xl">{meeting.title}</h1>
          <StatusBadge status={meeting.status} />
        </div>
        <p className="font-mono text-[11px] text-ink-4">
          {new Date(meeting.createdAt).toLocaleString()}
        </p>
      </div>

      {meeting.status === "failed" && (
        <div className="flex flex-col gap-1 p-4 border border-danger/20 bg-danger-light">
          <p className="font-body font-medium text-danger text-sm">
            This meeting could not be processed.
          </p>
          {meeting.errorMsg && (
            <p className="font-body font-light text-danger/80 text-sm">
              {meeting.errorMsg}
            </p>
          )}
        </div>
      )}

      {!TERMINAL.includes(meeting.status) && (
        <div className="flex flex-col gap-3 py-4">
          <p
            className="font-body font-light text-ink-3 text-sm"
            style={{ animation: "progressPulse 2s ease infinite" }}
          >
            {PROCESSING_MESSAGES[meeting.status] ?? "Processing..."}
          </p>
        </div>
      )}

      {meeting.status === "done" && (
        <>
          {outputLoading ? (
            <div className="flex flex-col gap-3">
              <SkeletonLine />
              <SkeletonLine width="w-3/4" />
              <SkeletonLine width="w-1/2" />
            </div>
          ) : (
            <Tabs defaultValue="minutes" style={{ animation: "fadeIn 200ms ease both" }}>
              <TabsList className="bg-ground rounded-none border border-rule w-full justify-start">
                <TabsTrigger value="minutes" className="font-body text-sm rounded-none">
                  Minutes
                </TabsTrigger>
                <TabsTrigger value="action-items" className="font-body text-sm rounded-none">
                  Action Items
                </TabsTrigger>
                <TabsTrigger value="key-points" className="font-body text-sm rounded-none">
                  Key Points
                </TabsTrigger>
                <TabsTrigger value="transcript" className="font-body text-sm rounded-none">
                  Transcript
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="minutes"
                className="mt-4"
                style={{ animation: "fadeIn 200ms ease both" }}
              >
                <MinutesView
                  minutes={output?.meetingMinutes ?? ""}
                  title={meeting.title}
                />
              </TabsContent>

              <TabsContent
                value="action-items"
                className="mt-4"
                style={{ animation: "fadeIn 200ms ease both" }}
              >
                <ActionItemsTable actionItems={output?.actionItems ?? []} />
              </TabsContent>

              <TabsContent
                value="key-points"
                className="mt-4"
                style={{ animation: "fadeIn 200ms ease both" }}
              >
                {output?.keyPoints?.length ? (
                  <ul className="flex flex-col gap-2">
                    {output.keyPoints.map((point, i) => (
                      <li key={i} className="flex gap-2 items-start">
                        <span className="font-mono text-ink-4 text-xs mt-0.5">—</span>
                        <span className="font-body text-sm text-ink leading-relaxed">
                          {point}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="font-body font-light text-ink-3 text-sm py-4">
                    No key points were extracted.
                  </p>
                )}
              </TabsContent>

              <TabsContent
                value="transcript"
                className="mt-4"
                style={{ animation: "fadeIn 200ms ease both" }}
              >
                <TranscriptView segments={transcript?.diarizedSegments ?? []} />
              </TabsContent>
            </Tabs>
          )}
        </>
      )}
    </div>
  );
}
