import ReactMarkdown from "react-markdown";

export function MinutesView({ minutes, title, attendees = [], minutesPreparedBy, datePrepared }) {
  function handleCopy() {
    navigator.clipboard.writeText(buildFullText());
  }

  function handleExport() {
    const blob = new Blob([buildFullText()], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}-minutes.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function buildFullText() {
    const parts = [];
    if (attendees.length > 0) {
      parts.push(`**Attendees:** ${attendees.map((a) => a.name).join(", ")}`);
    }
    parts.push(minutes);
    if (minutesPreparedBy || datePrepared) {
      parts.push(
        [
          minutesPreparedBy ? `**Minutes Prepared By:** ${minutesPreparedBy}` : null,
          datePrepared ? `**Date Prepared:** ${datePrepared}` : null,
        ]
          .filter(Boolean)
          .join("  \n")
      );
    }
    return parts.join("\n\n");
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="prose-minutes flex flex-col gap-0">
        {attendees.length > 0 && (
          <div className="mb-4 pb-4 border-b border-rule flex flex-wrap gap-x-3 gap-y-1 items-baseline">
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-ink-4 shrink-0">
              Attendees
            </span>
            {attendees.map((a, i) => (
              <span key={i} className="font-body text-[13px] text-ink-2">
                {a.name}{i < attendees.length - 1 ? "," : ""}
              </span>
            ))}
          </div>
        )}

        <ReactMarkdown
          components={{
            h1: ({ children }) => (
              <h1 className="font-body font-semibold text-ink text-[16px] mt-5 mb-2 first:mt-0">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="font-body font-semibold text-ink text-[14px] mt-4 mb-1.5 first:mt-0">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="font-body font-medium text-ink text-[13px] mt-3 mb-1 first:mt-0">
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="font-body font-light text-ink-2 text-[13px] leading-[1.8] mb-3 last:mb-0">
                {children}
              </p>
            ),
            ul: ({ children }) => (
              <ul className="flex flex-col gap-1 mb-3 pl-4 last:mb-0">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="flex flex-col gap-1 mb-3 pl-4 list-decimal last:mb-0">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="font-body font-light text-ink-2 text-[13px] leading-[1.7] list-disc">
                {children}
              </li>
            ),
            strong: ({ children }) => (
              <strong className="font-body font-semibold text-ink">{children}</strong>
            ),
            em: ({ children }) => (
              <em className="font-body font-light text-ink-2 italic">{children}</em>
            ),
            hr: () => <hr className="border-rule my-4" />,
          }}
        >
          {minutes}
        </ReactMarkdown>

        {(minutesPreparedBy || datePrepared) && (
          <div className="mt-6 pt-4 border-t border-rule flex flex-col gap-1.5">
            {minutesPreparedBy && (
              <div className="flex items-center gap-3">
                <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-ink-4 w-40 shrink-0">
                  Minutes Prepared By
                </span>
                <span className="font-body text-[13px] text-ink-2">{minutesPreparedBy}</span>
              </div>
            )}
            {datePrepared && (
              <div className="flex items-center gap-3">
                <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-ink-4 w-40 shrink-0">
                  Date Prepared
                </span>
                <span className="font-body text-[13px] text-ink-2">{datePrepared}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="font-body font-medium text-[13px] text-ink-2 px-3 py-1.5 border border-rule hover:border-rule-hi transition-colors"
        >
          Copy
        </button>
        <button
          onClick={handleExport}
          className="font-body font-medium text-[13px] text-ink-2 px-3 py-1.5 border border-rule hover:border-rule-hi transition-colors"
        >
          Export .md
        </button>
      </div>
    </div>
  );
}
