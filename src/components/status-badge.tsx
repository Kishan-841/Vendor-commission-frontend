import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CalculationStatus, Status, ZoneType } from "@/lib/types";

const CALC_STYLES: Record<CalculationStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground border-transparent",
  SUBMITTED: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  APPROVED: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  REJECTED: "bg-red-500/15 text-red-500 border-red-500/30",
};

export function CalcStatusBadge({ status }: { status: CalculationStatus }) {
  return (
    <Badge variant="outline" className={cn("text-sm font-medium", CALC_STYLES[status])}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </Badge>
  );
}

// New = blue (primary), Renewal = cyan (secondary) — from the app palette.
export function ZoneTypeBadge({ type }: { type: ZoneType }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-sm font-medium",
        type === "NEW"
          ? "bg-primary/15 text-primary border-primary/30"
          : "bg-cyan/15 text-cyan border-cyan/30",
      )}
    >
      {type === "NEW" ? "New" : "Renewal"}
    </Badge>
  );
}

export function VendorStatusBadge({ status }: { status: Status }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-sm font-medium",
        status === "ACTIVE"
          ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
          : "bg-muted text-muted-foreground border-transparent",
      )}
    >
      {status === "ACTIVE" ? "Active" : "Inactive"}
    </Badge>
  );
}
