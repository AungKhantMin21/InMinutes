import { Button } from "@/components/ui/button";

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
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Button variant="outline" onClick={handleCopy} className="font-body font-medium text-sm">
          Copy
        </Button>
        <Button variant="outline" onClick={handleExport} className="font-body font-medium text-sm">
          Export .md
        </Button>
      </div>
      <pre className="font-body font-light text-ink text-sm leading-relaxed whitespace-pre-wrap">
        {minutes}
      </pre>
    </div>
  );
}
