import { Badge } from "@/components/ui/badge";
import type { EmiStatus, LoanStatus, CustomerStatus, VisitStatus } from "@/types";
import { cn } from "@/lib/utils";

type AnyStatus = EmiStatus | LoanStatus | CustomerStatus | VisitStatus | string;

const statusConfig: Record<string, { className: string; label?: string }> = {
  // EMI statuses
  Paid: { className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400" },
  Partial: { className: "bg-orange-500/15 text-orange-700 border-orange-500/30 dark:text-orange-400" },
  Due: { className: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400" },
  Upcoming: { className: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400" },
  Overdue: { className: "bg-destructive/15 text-destructive border-destructive/30" },
  // Loan statuses
  Active: { className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400" },
  Closed: { className: "bg-muted text-muted-foreground border-border" },
  "Closed Early": { className: "bg-purple-500/15 text-purple-700 border-purple-500/30 dark:text-purple-400" },
  // Customer statuses
  Inactive: { className: "bg-muted text-muted-foreground border-border" },
  Blocked: { className: "bg-destructive/15 text-destructive border-destructive/30" },
  // Visit statuses
  Planned: { className: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400" },
  Visited: { className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400" },
  "Partially Paid": { className: "bg-orange-500/15 text-orange-700 border-orange-500/30 dark:text-orange-400" },
  "Not Paid": { className: "bg-destructive/15 text-destructive border-destructive/30" },
  // Receipt/other
  Issued: { className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400" },
  Cancelled: { className: "bg-destructive/15 text-destructive border-destructive/30" },
  "Cancelled - Early Closure": { className: "bg-slate-500/15 text-slate-700 border-slate-400/30 dark:text-slate-400" },
  Suspended: { className: "bg-destructive/15 text-destructive border-destructive/30" },
};

interface StatusBadgeProps {
  status: AnyStatus;
  className?: string;
  size?: "xs" | "sm";
}

export function StatusBadge({ status, className, size = "xs" }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { className: "bg-muted text-muted-foreground" };
  return (
    <Badge
      variant="outline"
      className={cn(
        config.className,
        size === "xs" ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5",
        className
      )}
    >
      {config.label ?? status}
    </Badge>
  );
}
