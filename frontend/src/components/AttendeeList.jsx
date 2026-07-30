import { useState, useEffect, useRef } from "react";
import { searchEmployees, searchPersons } from "@/lib/api";

export function AttendeeList({ attendees, onChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const q = query.trim();
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
          personId: e.personId,
          name: e.name,
          subtitle: e.jobTitle ?? null,
          type: "employee",
        }));

        const employeePersonIds = new Set(employees.map((e) => e.personId).filter(Boolean));

        const personItems = persons
          .filter((p) => !employeePersonIds.has(p.id))
          .map((p) => ({
            personId: p.id,
            name: p.canonicalName,
            subtitle: p.jobTitle ?? null,
            type: "person",
          }));

        setResults([...employeeItems, ...personItems]);
        setShowDropdown(true);
      } catch {
        setResults([]);
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

  function addAttendee(item) {
    const alreadyAdded = attendees.some(
      (a) => (a.personId && a.personId === item.personId) || a.name === item.name
    );
    if (alreadyAdded) {
      setQuery("");
      setShowDropdown(false);
      return;
    }
    onChange([...attendees, { personId: item.personId, name: item.name }]);
    setQuery("");
    setShowDropdown(false);
  }

  function addManual() {
    const name = query.trim();
    if (!name) return;
    const alreadyAdded = attendees.some((a) => a.name.toLowerCase() === name.toLowerCase());
    if (!alreadyAdded) {
      onChange([...attendees, { personId: null, name }]);
    }
    setQuery("");
    setShowDropdown(false);
  }

  function removeAttendee(index) {
    onChange(attendees.filter((_, i) => i !== index));
  }

  const hasNoResults = results.length === 0 && query.trim().length > 0;

  return (
    <div className="flex flex-col gap-2">
      {attendees.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {attendees.map((a, i) => (
            <div key={i} className="flex items-center justify-between gap-2 py-1">
              <span className="font-body text-[13px] text-ink">{a.name}</span>
              <button
                type="button"
                onClick={() => removeAttendee(i)}
                className="font-mono text-[13px] text-ink-4 hover:text-danger transition-colors duration-150 leading-none"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {attendees.length === 0 && (
        <p className="font-body font-light text-ink-4 text-[13px]">
          No attendees added yet.
        </p>
      )}

      <div className="relative mt-1">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setShowDropdown(true)}
          placeholder="Add attendee..."
          className="w-full px-3 py-2 border border-rule bg-white font-body text-ink text-[13px] outline-none focus:border-rule-hi placeholder:text-ink-4"
        />

        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 z-20 bg-white border border-rule border-t-0 flex flex-col"
          >
            {results.map((item, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); addAttendee(item); }}
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

            {hasNoResults && (
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); addManual(); }}
                className="px-3 py-2 text-left font-body text-[13px] text-signal hover:bg-ground transition-colors duration-100"
              >
                Add &ldquo;{query.trim()}&rdquo;
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
