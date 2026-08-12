"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useLogs, useLogFilterOptions, type LogFilters } from "@/hooks/use-logs";
import { useDebounce } from "@/hooks/use-debounce";
import { useRole } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { ActionBadge, humanizeAction } from "@/components/logs/action-badge";
import { LogDetailSheet } from "@/components/logs/log-detail-sheet";
import { formatDateTime } from "@/lib/format";
import type { AuditLogEntry } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE = 25;
const ALL = "__all__"; // shadcn Select can't use "" as an item value

// One-line summary for the table's Details column.
function summarize(log: AuditLogEntry): string {
  const meta = log.metadata ?? {};
  const changes = meta.changes;
  if (changes && typeof changes === "object" && Object.keys(changes).length > 0) {
    return `Changed: ${Object.keys(changes).join(", ")}`;
  }
  if (typeof meta.email === "string") return String(meta.email);
  const first = Object.entries(meta).find(([, v]) => typeof v !== "object");
  return first ? `${first[0]}: ${String(first[1])}` : "—";
}

export default function LogsPage() {
  const isAdmin = useRole() === "ADMIN";
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState(ALL);
  const [action, setAction] = useState(ALL);
  const [entityType, setEntityType] = useState(ALL);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 350);
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);

  // Any filter change resets pagination.
  useEffect(() => {
    setPage(1);
  }, [userId, action, entityType, dateFrom, dateTo, search]);

  const filters: LogFilters = {
    page,
    pageSize: PAGE_SIZE,
    userId: userId === ALL ? undefined : userId,
    action: action === ALL ? undefined : action,
    entityType: entityType === ALL ? undefined : entityType,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    search: search || undefined,
  };

  const logs = useLogs(filters);
  const options = useLogFilterOptions();

  const hasFilters =
    userId !== ALL || action !== ALL || entityType !== ALL || !!dateFrom || !!dateTo || !!searchInput;

  const clearFilters = () => {
    setUserId(ALL);
    setAction(ALL);
    setEntityType(ALL);
    setDateFrom("");
    setDateTo("");
    setSearchInput("");
  };

  const columns = useMemo<ColumnDef<AuditLogEntry, unknown>[]>(
    () => [
      {
        header: "Time",
        size: 170,
        cell: ({ row }) => (
          <span className="text-sm whitespace-nowrap">{formatDateTime(row.original.createdAt)}</span>
        ),
      },
      {
        header: "User",
        size: 150,
        cell: ({ row }) => (
          <span className="font-medium">{row.original.user?.name ?? "System"}</span>
        ),
      },
      {
        header: "Action",
        size: 180,
        cell: ({ row }) => <ActionBadge action={row.original.action} />,
      },
      {
        header: "Entity",
        size: 130,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.entityType ?? "—"}</span>
        ),
      },
      {
        header: "IP",
        size: 130,
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.ip ?? "—"}</span>
        ),
      },
      {
        header: "Details",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{summarize(row.original)}</span>
        ),
      },
    ],
    [],
  );

  if (!isAdmin) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        System logs are only visible to administrators.
      </div>
    );
  }

  const meta = logs.data?.meta;

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Logs"
        description="Every action in the system — who did it, when, and from where."
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select value={userId} onValueChange={setUserId}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="User" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All users</SelectItem>
            {options.data?.users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-[190px]">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All actions</SelectItem>
            {options.data?.actions.map((a) => (
              <SelectItem key={a} value={a}>
                {humanizeAction(a)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All entities</SelectItem>
            {options.data?.entityTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-[150px]"
          aria-label="From date"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-[150px]"
          aria-label="To date"
        />
        <Input
          placeholder="Search action, entity, IP, user…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-[230px]"
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear all
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={logs.data?.items ?? []}
        isLoading={logs.isLoading}
        emptyMessage="No log entries match these filters."
        page={meta?.page}
        pageSize={meta?.pageSize}
        total={meta?.total}
        totalPages={meta?.totalPages}
        onPageChange={setPage}
        onRowClick={setSelected}
      />

      <LogDetailSheet log={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
