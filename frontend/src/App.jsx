import { Button } from "@/components/ui/button";

function App() {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="font-body font-semibold text-ink text-2xl">InMinutes</h1>
      <p className="font-body font-light text-ink-3">
        Meeting intelligence platform — scaffold verified
      </p>
      <div className="flex gap-3">
        <Button>Primary Button</Button>
        <Button variant="outline">Secondary Button</Button>
      </div>
      <div className="flex gap-4 items-center">
        <span className="font-mono text-xs text-ink-4">DM Mono — timestamp</span>
        <div className="h-4 w-px bg-rule" />
        <span className="font-body text-sm text-ink-2">Inter — body text</span>
      </div>
      <div
        className="bg-ground h-4 w-48 rounded"
        style={{ animation: "skeletonPulse 1.5s ease infinite" }}
      />
      <div className="flex gap-2">
        <span className="font-mono text-xs px-2 py-1 bg-signal-light text-signal border border-signal/20 rounded-sm">
          Transcribing
        </span>
        <span className="font-mono text-xs px-2 py-1 bg-success-light text-success border border-success/20 rounded-sm">
          Done
        </span>
        <span className="font-mono text-xs px-2 py-1 bg-danger-light text-danger border border-danger/20 rounded-sm">
          Failed
        </span>
      </div>
    </div>
  );
}

export default App;
