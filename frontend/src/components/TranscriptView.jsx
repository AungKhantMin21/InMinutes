function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function TranscriptView({ segments }) {
  if (!segments || segments.length === 0) {
    return (
      <p className="font-body font-light text-ink-4 text-[13px] text-center py-4">
        Transcript is not available.
      </p>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-rule overflow-y-auto" style={{ maxHeight: "480px" }}>
      {segments.map((seg, i) => (
        <div key={i} className="py-3">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-[9px] tracking-[0.14em] uppercase text-ink-4">
              {seg.speaker}
            </span>
            {seg.originalLang && seg.originalLang !== "en" && (
              <span className="font-mono text-[8px] tracking-[0.12em] uppercase text-ink-4 bg-ground px-1 py-0.5 border border-rule">
                {seg.originalLang}
              </span>
            )}
            <span className="font-mono text-[9px] text-ink-4 ml-auto">
              {formatTime(seg.start)}
            </span>
          </div>

          <p className="font-body font-light text-[13px] text-ink-2 leading-[1.7]">
            {seg.text}
          </p>

          {seg.translatedText && (
            <div className="flex gap-2 mt-1.5 items-start">
              <span className="font-mono text-[9px] tracking-[0.12em] text-ink-4 shrink-0 mt-0.5">
                EN
              </span>
              <p className="font-body font-light text-[13px] text-ink-3 leading-[1.7] italic">
                {seg.translatedText}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
