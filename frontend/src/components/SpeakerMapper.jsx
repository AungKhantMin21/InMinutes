import { useState, useEffect } from "react";

export function SpeakerMapper({ segments, onChange }) {
  const speakers = [...new Set(segments.map((s) => s.speaker))];

  const [speakerMap, setSpeakerMap] = useState(() =>
    Object.fromEntries(speakers.map((s) => [s, ""]))
  );

  useEffect(() => {
    onChange(speakerMap);
  }, [speakerMap]);

  function handleChange(speaker, value) {
    const updated = { ...speakerMap, [speaker]: value };
    setSpeakerMap(updated);
  }

  return (
    <div className="flex flex-col gap-2">
      {speakers.map((speaker) => (
        <div key={speaker} className="flex items-center gap-4">
          <span className="font-mono text-[11px] text-ink-4 w-24 shrink-0">
            {speaker}
          </span>
          <input
            type="text"
            value={speakerMap[speaker]}
            onChange={(e) => handleChange(speaker, e.target.value)}
            placeholder="Enter name..."
            className="flex-1 px-3 py-1.5 border border-rule bg-white font-body text-ink text-sm outline-none focus:border-rule-hi placeholder:text-ink-4"
          />
        </div>
      ))}
    </div>
  );
}
