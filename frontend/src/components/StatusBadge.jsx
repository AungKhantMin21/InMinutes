import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    className: "font-mono bg-ground text-ink-3 border-rule",
  },
  uploading: {
    label: "Uploading",
    className: "font-mono bg-ground text-ink-3 border-rule",
  },
  transcribing: {
    label: "Transcribing",
    className: "font-mono bg-signal-light text-signal border-signal/20",
    style: { animation: "progressPulse 2s ease infinite" },
  },
  analyzing: {
    label: "Analyzing",
    className: "font-mono bg-signal-light text-signal border-signal/20",
    style: { animation: "progressPulse 2s ease infinite" },
  },
  done: {
    label: "Done",
    className: "font-mono bg-success-light text-success border-success/20",
  },
  failed: {
    label: "Failed",
    className: "font-mono bg-danger-light text-danger border-danger/20",
  },
};

export function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <Badge className={config.className} style={config.style ?? {}}>
      {config.label}
    </Badge>
  );
}
