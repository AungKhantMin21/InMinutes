export function TranscriptView({ segments }) {
  if (!segments || segments.length === 0) {
    return (
      <p className="font-body font-light text-ink-3 text-sm py-4">
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
    <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto pr-2">
      {grouped.map((group, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] tracking-[0.14em] uppercase text-ink-4">
              {group.speaker}
            </span>
            <span className="font-mono text-[9px] text-ink-4">
              {formatTime(group.start)}
            </span>
          </div>
          <p className="font-body font-light text-ink text-sm leading-relaxed">
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
