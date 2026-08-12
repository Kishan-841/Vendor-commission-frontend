import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// "VENDOR_UPDATED" -> "Vendor Updated"
export function humanizeAction(action: string): string {
  return action
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

// Order matters: FAILED before LOGIN so USER_LOGIN_FAILED reads as danger.
function tone(action: string): "danger" | "success" | "neutral" {
  if (/FAILED|DELETED/.test(action)) return "danger";
  if (/CREATED|LOGIN|LOGOUT|UPLOADED|GENERATED|RECORDED|APPROVED/.test(action)) return "success";
  return "neutral"; // updates, exports, downloads, submissions…
}

const TONE_CLASSES = {
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-transparent",
  danger: "bg-red-500/15 text-red-700 dark:text-red-400 border-transparent",
  neutral: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-transparent",
} as const;

export function ActionBadge({ action }: { action: string }) {
  return (
    <Badge variant="outline" className={cn("font-normal", TONE_CLASSES[tone(action)])}>
      {humanizeAction(action)}
    </Badge>
  );
}
