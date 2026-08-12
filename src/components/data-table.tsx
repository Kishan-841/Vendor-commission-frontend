"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Per-column extras. `className` styles both header + body cells (e.g.
// "text-right" for money columns); `headerClassName` overrides the header only.
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends unknown, TValue> {
    className?: string;
    headerClassName?: string;
  }
}

export interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  // Server-side pagination (all optional — omit to hide the footer).
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  // When set, data rows become clickable (e.g. to open a detail panel).
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyMessage = "No results found.",
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onRowClick,
}: DataTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  const colCount = columns.length;
  const showFooter = total !== undefined && !!onPageChange;
  const currentPage = page ?? 1;
  const pages = totalPages ?? 1;

  return (
    // gap-0 removes shadcn Card's default flex gap-6 (which left blank space —
    // with no dividers — between the table and the footer). overflow-hidden keeps
    // the header background inside the card's rounded corners.
    <Card className="p-0 gap-0 overflow-hidden">
      <div className="overflow-x-auto">
        {/* Fixed layout so column widths are predictable and long cells
            truncate (with ellipsis) inside their column instead of bleeding
            into neighbours. min-w keeps columns readable; wrapper scrolls when
            there are many columns. */}
        <Table className="table-fixed min-w-[720px]">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              // Distinct gray header background so column names read apart from rows.
              <TableRow
                key={headerGroup.id}
                className="bg-muted/60 hover:bg-muted/60 border-b border-border"
              >
                {headerGroup.headers.map((header, i) => {
                  const meta = header.column.columnDef.meta;
                  return (
                    <TableHead
                      key={header.id}
                      style={
                        header.column.columnDef.size
                          ? { width: header.column.columnDef.size }
                          : undefined
                      }
                      className={cn(
                        "h-11 whitespace-nowrap font-medium text-foreground",
                        i < colCount - 1 && "border-r border-border",
                        meta?.className,
                        meta?.headerClassName,
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={colCount}
                  className="py-10 text-center text-muted-foreground"
                >
                  Loading…
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colCount}
                  className="py-10 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {row.getVisibleCells().map((cell, i) => {
                    const meta = cell.column.columnDef.meta;
                    const isRight = meta?.className?.includes("text-right");
                    const raw = cell.getValue();
                    const title =
                      typeof raw === "string" || typeof raw === "number" ? String(raw) : undefined;
                    return (
                      <TableCell
                        key={cell.id}
                        title={title}
                        className={cn(
                          i < colCount - 1 && "border-r border-border",
                          meta?.className,
                        )}
                      >
                        {/* Every cell's content lives in a block-level truncate
                            container so long text ellipsizes inside its
                            fixed-width column instead of bleeding into
                            neighbours. (text-overflow is unreliable applied to a
                            <td> directly.) Right-aligned columns keep alignment;
                            flex action rows are unaffected by the wrapper. */}
                        <div className={cn("truncate", isRight && "text-right")}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {showFooter && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {pages} · {total} total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage >= pages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
