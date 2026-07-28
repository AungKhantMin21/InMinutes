import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { getMeetings } from "@/lib/api";

function SkeletonCard() {
  return (
    <Card className="rounded-none border-rule bg-white cursor-pointer">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div
            className="bg-ground h-4 w-48 rounded"
            style={{ animation: "skeletonPulse 1.5s ease infinite" }}
          />
          <div
            className="bg-ground h-3 w-24 rounded"
            style={{ animation: "skeletonPulse 1.5s ease infinite" }}
          />
        </div>
        <div
          className="bg-ground h-5 w-16 rounded"
          style={{ animation: "skeletonPulse 1.5s ease infinite" }}
        />
      </CardContent>
    </Card>
  );
}

export function MeetingList() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function fetchMeetings() {
    setError("");
    setLoading(true);
    try {
      const data = await getMeetings();
      setMeetings(data);
    } catch (err) {
      setError("Something went wrong — try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMeetings();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 py-4">
        <p className="font-body text-sm text-danger">{error}</p>
        <button
          onClick={fetchMeetings}
          className="font-body text-sm text-signal underline underline-offset-4"
        >
          Try again
        </button>
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <p className="font-body font-light text-ink-3 text-sm py-4">
        No meetings yet. Upload your first recording above.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {meetings.map((meeting, i) => (
        <Card
          key={meeting.id}
          onClick={() => navigate(`/meetings/${meeting.id}`)}
          className="rounded-none border-rule bg-white cursor-pointer hover:border-rule-hi transition-colors duration-150"
          style={{ animation: `fadeIn 200ms ease both`, animationDelay: `${i * 40}ms` }}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <p className="font-body font-medium text-ink text-sm">{meeting.title}</p>
              <p className="font-mono text-[11px] text-ink-4">
                {new Date(meeting.createdAt).toLocaleString()}
              </p>
            </div>
            <StatusBadge status={meeting.status} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
