import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export function ActionItemsTable({ actionItems }) {
  if (!actionItems || actionItems.length === 0) {
    return (
      <p className="font-body font-light text-ink-3 text-sm py-4">
        No action items detected in this meeting.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-rule">
          <TableHead className="font-body font-medium text-ink text-xs uppercase tracking-wide">
            Task
          </TableHead>
          <TableHead className="font-body font-medium text-ink text-xs uppercase tracking-wide">
            Owner
          </TableHead>
          <TableHead className="font-body font-medium text-ink text-xs uppercase tracking-wide">
            Deadline
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {actionItems.map((item, i) => (
          <TableRow key={i} className="border-rule">
            <TableCell className="font-body text-sm text-ink whitespace-normal">
              {item.task}
            </TableCell>
            <TableCell className="font-mono text-xs text-ink-2">
              {item.owner}
            </TableCell>
            <TableCell className="font-mono text-xs">
              {item.deadline ? (
                <span className="text-ink-2">{item.deadline}</span>
              ) : (
                <span className="text-ink-4">Not specified</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
