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
      <pre className="font-body font-light text-ink-2 text-[13px] whitespace-pre-wrap leading-[1.8]">
        {minutes}
      </pre>
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
