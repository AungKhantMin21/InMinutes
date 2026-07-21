export function TranscriptView({ segments }) {
  if (!segments || segments.length === 0) {
    return (
      <p className="font-body font-light text-ink-4 text-[13px] text-center py-4">
        Transcript is not available.
      </p>
    );
  }

  const grouped = segments.reduce((acc, segment) => {
    const last = acc[acc.length - 1];
    if (last && last.speaker === segment.speaker) {
      last.texts.push(segment.text);
    } else {
      acc.push({ speaker: segment.speaker, texts: [segment.text], start: segment.start });
    }
    return acc;
  }, []);

  return (
    <div
      className="flex flex-col overflow-y-auto pr-1"
      style={{ gap: "16px", maxHeight: "480px" }}
    >
      {grouped.map((group, i) => (
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
    </div>
  );
}

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
