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
      <p className="font-body font-light text-ink-4 text-[13px] text-center py-4">
        No action items detected in this meeting.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-rule">
          <TableHead className="font-body font-medium text-ink text-[13px] px-0 pb-2">
            Task
          </TableHead>
          <TableHead className="font-body font-medium text-ink text-[13px] px-3 pb-2">
            Owner
          </TableHead>
          <TableHead className="font-body font-medium text-ink text-[13px] px-3 pb-2">
            Deadline
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {actionItems.map((item, i) => (
          <TableRow key={i} className="border-rule align-top">
            <TableCell className="font-body text-[13px] text-ink whitespace-normal px-0 py-3 align-top">
              {item.task}
            </TableCell>
            <TableCell className="font-mono text-[11px] text-ink-3 px-3 py-3 align-top">
              {item.owner}
            </TableCell>
            <TableCell className="font-mono text-[11px] px-3 py-3 align-top">
              {item.deadline ? (
                <span className="text-ink-3">{item.deadline}</span>
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
