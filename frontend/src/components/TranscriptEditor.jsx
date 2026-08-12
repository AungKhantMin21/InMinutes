import { useState, useEffect, useRef, useCallback } from "react";
import { searchEmployees, searchPersons } from "@/lib/api";

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function useDebouncedCallback(fn, delay) {
  const timer = useRef(null);
  return useCallback(
    (...args) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay]
  );
}

function SpeakerDropdown({ onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const search = useDebouncedCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    try {
      const [employees, persons] = await Promise.all([
        searchEmployees(q),
        searchPersons(q),
      ]);
      const employeePersonIds = new Set(employees.map((e) => e.personId).filter(Boolean));
      const merged = [
        ...employees.map((e) => ({ id: e.id, name: e.name, subtitle: e.jobTitle, type: "employee" })),
        ...persons
          .filter((p) => !employeePersonIds.has(p.id))
          .map((p) => ({ id: p.id, name: p.canonicalName, subtitle: p.jobTitle || p.email, type: "person" })),
      ];
      setResults(merged);
    } catch {
      setResults([]);
    }
  }, 300);

  function handleInput(e) {
    const val = e.target.value;
    setQuery(val);
    search(val);
  }

  return (
    <div
      ref={containerRef}
      className="absolute left-0 top-full mt-1 z-30 bg-white border border-rule shadow-sm w-64"
      style={{ animation: "fadeIn 120ms ease" }}
    >
      <div className="p-2 border-b border-rule">
        <input
          ref={inputRef}
          value={query}
          onChange={handleInput}
          onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
          placeholder="Search name..."
          className="w-full font-body text-[13px] text-ink outline-none placeholder:text-ink-4 bg-transparent"
        />
      </div>
      <div className="max-h-48 overflow-y-auto">
        {results.map((r) => (
          <button
            key={r.id}
            onMouseDown={(e) => { e.preventDefault(); onSelect(r.name); }}
            className="w-full text-left px-3 py-2 hover:bg-ground transition-colors duration-100"
          >
            <span className="font-body text-[13px] text-ink block">{r.name}</span>
            {r.subtitle && (
              <span className="font-mono text-[10px] text-ink-4 block">{r.subtitle}</span>
            )}
          </button>
        ))}
        {query.trim() && (
          <button
            onMouseDown={(e) => { e.preventDefault(); onSelect(query.trim()); }}
            className="w-full text-left px-3 py-2 hover:bg-ground transition-colors duration-100 border-t border-rule"
          >
            <span className="font-body text-[13px] text-ink-3">
              Use &ldquo;{query.trim()}&rdquo;
            </span>
          </button>
        )}
        {results.length === 0 && !query.trim() && (
          <p className="px-3 py-2 font-body text-[13px] text-ink-4">Type to search</p>
        )}
      </div>
    </div>
  );
}

function SegmentBlock({
  segment,
  displaySpeaker,
  isActive,
  onGlobalRename,
  onLocalOverride,
  onResetOverride,
  onTextChange,
  onTranslationChange,
  onSeek,
}) {
  const [hovered, setHovered] = useState(false);
  const [globalDropdownOpen, setGlobalDropdownOpen] = useState(false);
  const [localDropdownOpen, setLocalDropdownOpen] = useState(false);
  const [editingText, setEditingText] = useState(false);
  const [editingTranslation, setEditingTranslation] = useState(false);
  const textRef = useRef(null);
  const translationRef = useRef(null);

  function handleTextBlur() {
    setEditingText(false);
    const val = textRef.current?.innerText ?? "";
    if (val !== segment.text) onTextChange(val);
  }

  function handleTranslationBlur() {
    setEditingTranslation(false);
    const val = translationRef.current?.innerText ?? "";
    if (val !== segment.translatedText) onTranslationChange(val);
  }

  function handleTextKey(e) {
    if (e.key === "Escape" || e.key === "Enter") { e.preventDefault(); textRef.current?.blur(); }
  }

  function handleTranslationKey(e) {
    if (e.key === "Escape" || e.key === "Enter") { e.preventDefault(); translationRef.current?.blur(); }
  }

  const showControls = hovered && !editingText && !editingTranslation;

  return (
    <div
      className="py-3 px-3 border-l-2 transition-all duration-150"
      style={{
        borderLeftColor: isActive ? "var(--signal)" : "transparent",
        backgroundColor: isActive ? "rgba(239, 244, 255, 0.3)" : "transparent",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        if (!globalDropdownOpen && !localDropdownOpen) setHovered(false);
      }}
    >
      <div className="flex items-center gap-2 mb-1.5 relative">

        {/* Speaker label — global rename on hover */}
        <div className="relative">
          {showControls || globalDropdownOpen ? (
            <button
              onClick={() => { setGlobalDropdownOpen((o) => !o); setLocalDropdownOpen(false); }}
              className="font-mono text-[9px] tracking-[0.14em] uppercase text-ink-4 hover:text-ink-3 transition-colors duration-150 flex items-center gap-1"
            >
              {displaySpeaker}
              <span className="text-[8px]">▾</span>
            </button>
          ) : (
            <span className="font-mono text-[9px] tracking-[0.14em] uppercase text-ink-4">
              {displaySpeaker}
            </span>
          )}
          {globalDropdownOpen && (
            <SpeakerDropdown
              onSelect={(name) => { onGlobalRename(name); setGlobalDropdownOpen(false); setHovered(false); }}
              onClose={() => { setGlobalDropdownOpen(false); setHovered(false); }}
            />
          )}
        </div>

        {/* Local override button — only on hover */}
        {(showControls || localDropdownOpen) && (
          <div className="relative">
            <button
              onClick={() => { setLocalDropdownOpen((o) => !o); setGlobalDropdownOpen(false); }}
              title="Reassign this segment only"
              className="font-mono text-[9px] text-ink-4 hover:text-ink-3 transition-colors duration-150"
            >
              ↻
            </button>
            {localDropdownOpen && (
              <SpeakerDropdown
                onSelect={(name) => { onLocalOverride(name); setLocalDropdownOpen(false); setHovered(false); }}
                onClose={() => { setLocalDropdownOpen(false); setHovered(false); }}
              />
            )}
          </div>
        )}

        {/* Reassigned indicator */}
        {segment.speakerOverride && (
          <span className="font-mono text-[9px] text-ink-4 flex items-center gap-1">
            · reassigned
            <button
              onClick={onResetOverride}
              className="text-ink-4 hover:text-danger transition-colors duration-150"
            >
              × reset
            </button>
          </span>
        )}

        {segment.originalLang && segment.originalLang !== "en" && (
          <span className="font-mono text-[8px] tracking-[0.12em] uppercase text-ink-4 bg-ground px-1 py-0.5 border border-rule">
            {segment.originalLang}
          </span>
        )}

        <button
          onClick={() => onSeek(segment.start / 1000)}
          className="font-mono text-[10px] text-ink-4 hover:text-ink-3 transition-colors duration-150 ml-auto"
        >
          {formatTime(segment.start)}
        </button>
      </div>

      <div
        ref={textRef}
        contentEditable
        suppressContentEditableWarning
        onFocus={() => setEditingText(true)}
        onBlur={handleTextBlur}
        onKeyDown={handleTextKey}
        className={`font-body text-[13px] leading-[1.7] outline-none cursor-text ${
          editingText ? "text-ink" : "text-ink-2"
        }`}
      >
        {segment.text}
      </div>

      {segment.translatedText != null && (
        <div className="flex gap-2 mt-1.5 items-start">
          <span className="font-mono text-[9px] tracking-[0.12em] text-ink-4 shrink-0 mt-0.5">
            EN
          </span>
          <div
            ref={translationRef}
            contentEditable
            suppressContentEditableWarning
            onFocus={() => setEditingTranslation(true)}
            onBlur={handleTranslationBlur}
            onKeyDown={handleTranslationKey}
            className={`font-body font-light text-[13px] leading-[1.7] outline-none cursor-text ${
              editingTranslation ? "text-ink-2" : "text-ink-3"
            }`}
          >
            {segment.translatedText}
          </div>
        </div>
      )}
    </div>
  );
}

export function TranscriptEditor({
  segments: initialSegments,
  speakerMap,
  audioCurrentTime,
  onSegmentsChange,
  onSpeakerMapChange,
  onSeek,
}) {
  const [segments, setSegments] = useState(initialSegments);

  useEffect(() => {
    setSegments(initialSegments);
  }, [initialSegments]);

  const notifyChange = useDebouncedCallback((segs) => {
    onSegmentsChange?.(segs);
  }, 500);

  function handleGlobalRename(index, newName) {
    const seg = segments[index];
    const originalSpeaker = seg.originalSpeaker ?? seg.speaker;

    const newMap = { ...(speakerMap ?? {}), [originalSpeaker]: newName };
    onSpeakerMapChange?.(newMap);

    const updated = segments.map((s) => {
      if ((s.originalSpeaker ?? s.speaker) !== originalSpeaker) return s;
      if (s.speakerOverride) return s;
      return { ...s, speaker: newName };
    });
    setSegments(updated);
    notifyChange(updated);
  }

  function handleLocalOverride(index, newName) {
    const updated = segments.map((s, i) =>
      i === index ? { ...s, speaker: newName, speakerOverride: true } : s
    );
    setSegments(updated);
    notifyChange(updated);
  }

  function handleResetOverride(index) {
    const seg = segments[index];
    const originalSpeaker = seg.originalSpeaker ?? seg.speaker;
    const resetName = (speakerMap ?? {})[originalSpeaker] ?? originalSpeaker;
    const updated = segments.map((s, i) =>
      i === index ? { ...s, speaker: resetName, speakerOverride: false } : s
    );
    setSegments(updated);
    notifyChange(updated);
  }

  function handleTextChange(index, newText) {
    const updated = segments.map((s, i) => (i === index ? { ...s, text: newText } : s));
    setSegments(updated);
    notifyChange(updated);
  }

  function handleTranslationChange(index, newText) {
    const updated = segments.map((s, i) =>
      i === index ? { ...s, translatedText: newText } : s
    );
    setSegments(updated);
    notifyChange(updated);
  }

  function getDisplaySpeaker(seg) {
    if (seg.speakerOverride) return seg.speaker;
    const originalSpeaker = seg.originalSpeaker ?? seg.speaker;
    return (speakerMap ?? {})[originalSpeaker] ?? originalSpeaker;
  }

  function isActiveSegment(seg) {
    if (audioCurrentTime == null) return false;
    return audioCurrentTime >= seg.start / 1000 && audioCurrentTime < seg.end / 1000;
  }

  return (
    <div className="flex flex-col divide-y divide-rule">
      {segments.map((seg, i) => (
        <SegmentBlock
          key={i}
          segment={seg}
          displaySpeaker={getDisplaySpeaker(seg)}
          isActive={isActiveSegment(seg)}
          onGlobalRename={(name) => handleGlobalRename(i, name)}
          onLocalOverride={(name) => handleLocalOverride(i, name)}
          onResetOverride={() => handleResetOverride(i)}
          onTextChange={(text) => handleTextChange(i, text)}
          onTranslationChange={(text) => handleTranslationChange(i, text)}
          onSeek={onSeek}
        />
      ))}
    </div>
  );
}
