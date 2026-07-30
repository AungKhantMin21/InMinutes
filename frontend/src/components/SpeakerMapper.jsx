import { useState, useEffect, useRef } from "react";
import { searchEmployees, searchPersons } from "@/lib/api";

function SpeakerInput({ speaker, value, onChange }) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const q = query.trim();

    onChange(query);

    if (!q) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const [employees, persons] = await Promise.all([
          searchEmployees(q),
          searchPersons(q),
        ]);

        const employeeItems = employees.map((e) => ({
          name: e.name,
          subtitle: e.jobTitle ?? null,
          type: "employee",
        }));

        const employeeNames = new Set(employees.map((e) => e.name.toLowerCase()));

        const personItems = persons
          .filter((p) => !employeeNames.has(p.canonicalName.toLowerCase()))
          .map((p) => ({
            name: p.canonicalName,
            subtitle: p.jobTitle ?? null,
            type: "person",
          }));

        const merged = [...employeeItems, ...personItems];
        setResults(merged);
        setShowDropdown(merged.length > 0);
      } catch {
        setResults([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClick(e) {
      if (
        !inputRef.current?.contains(e.target) &&
        !dropdownRef.current?.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function select(name) {
    setQuery(name);
    onChange(name);
    setShowDropdown(false);
  }

  return (
    <div className="relative flex-1">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setShowDropdown(true)}
        placeholder="Search or enter name..."
        className="w-full px-3 py-1.5 border border-rule bg-white font-body text-ink text-[13px] outline-none focus:border-rule-hi placeholder:text-ink-4"
      />

      {showDropdown && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 z-20 bg-white border border-rule border-t-0 flex flex-col"
        >
          {results.map((item, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); select(item.name); }}
              className="px-3 py-2 text-left hover:bg-ground flex items-center justify-between gap-3 transition-colors duration-100"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-body text-[13px] text-ink truncate">{item.name}</span>
                {item.subtitle && (
                  <span className="font-mono text-[10px] text-ink-4 truncate">{item.subtitle}</span>
                )}
              </div>
              <span className="font-mono text-[9px] text-ink-4 shrink-0 uppercase tracking-[0.1em]">
                {item.type}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SpeakerMapper({ segments, onChange }) {
  const speakers = [...new Set(segments.map((s) => s.speaker))];

  const [speakerMap, setSpeakerMap] = useState(() =>
    Object.fromEntries(speakers.map((s) => [s, ""]))
  );

  useEffect(() => {
    onChange(speakerMap);
  }, [speakerMap]);

  function handleChange(speaker, value) {
    setSpeakerMap((prev) => ({ ...prev, [speaker]: value }));
  }

  if (speakers.length === 0) {
    return (
      <p className="font-body font-light text-ink-4 text-[13px]">
        No speakers detected in this transcript.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {speakers.map((speaker) => (
        <div key={speaker} className="flex items-center gap-4">
          <span className="font-mono text-[11px] text-ink-4 w-24 shrink-0">
            {speaker}
          </span>
          <SpeakerInput
            speaker={speaker}
            value={speakerMap[speaker]}
            onChange={(v) => handleChange(speaker, v)}
          />
        </div>
      ))}
    </div>
  );
}
