import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PayoutStatus } from "@/lib/types";

const STYLES: Record<PayoutStatus, { label: string; cls: string }> = {
  PENDING: { label: "Pending", cls: "bg-warning/15 text-warning" },
  PARTIAL: { label: "Partial", cls: "bg-cyan/15 text-cyan" },
  PAID: { label: "Paid", cls: "bg-success/15 text-success" },
};

export function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
  const s = STYLES[status];
  return (
    <Badge variant="outline" className={cn("border-transparent", s.cls)}>
      {s.label}
    </Badge>
  );
}
