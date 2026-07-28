import { UploadZone } from "@/components/UploadZone";
import { MeetingList } from "@/components/MeetingList";
import { useAuth } from "@/hooks/useAuth";

export function Home() {
  const { employee, logout } = useAuth();

  function handleLogout() {
    logout();
    window.location.href = "/login";
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-body font-semibold text-ink text-xl">InMinutes</h1>
          <p className="font-body font-light text-ink-3 text-sm">
            Upload a meeting recording and receive a full transcript, key points, and minutes.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="font-body text-[13px] text-ink-2">{employee?.name}</span>
          <button
            onClick={handleLogout}
            className="font-mono text-[11px] text-ink-4 hover:text-ink-3 transition-colors duration-150"
          >
            Sign out
          </button>
        </div>
      </div>

      <UploadZone />

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-ink-4 whitespace-nowrap">
            Recent Meetings
          </span>
          <div className="flex-1 h-px bg-rule" />
        </div>
        <MeetingList />
      </div>
    </div>
  );
}
