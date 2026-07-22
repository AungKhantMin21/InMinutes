import ReactMarkdown from "react-markdown";

export function MinutesView({ minutes, title }) {
  function handleCopy() {
    navigator.clipboard.writeText(minutes);
  }

  function handleExport() {
    const blob = new Blob([minutes], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}-minutes.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="prose-minutes">
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
