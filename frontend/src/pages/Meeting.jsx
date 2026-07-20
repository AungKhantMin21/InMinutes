import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { StatusBadge } from "@/components/StatusBadge";
import { getMeeting } from "@/lib/api";

export function Meeting() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchMeeting() {
      try {
        const data = await getMeeting(id);
        setMeeting(data);
      } catch (err) {
        setError("Meeting not found.");
      } finally {
        setLoading(false);
      }
    }
    fetchMeeting();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-4">
        <div
          className="bg-ground h-6 w-64 rounded"
          style={{ animation: "skeletonPulse 1.5s ease infinite" }}
        />
        <div
          className="bg-ground h-4 w-24 rounded"
          style={{ animation: "skeletonPulse 1.5s ease infinite" }}
        />
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
      <p className="font-body font-light text-ink-3 text-sm">
        Full output view coming in Step 05.
      </p>
    </div>
  );
}
