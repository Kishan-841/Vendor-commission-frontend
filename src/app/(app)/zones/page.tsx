"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2, Pencil, Search, Plus } from "lucide-react";
import toast from "react-hot-toast";
import type { ColumnDef } from "@tanstack/react-table";
import {
  useZones,
  useMasterZones,
  useCreateZone,
  useRenameZone,
  useDeleteZone,
} from "@/hooks/use-zones";
import { useDebounce } from "@/hooks/use-debounce";
import { useRole } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { ZoneUploadCard } from "@/components/zones/zone-upload-card";
import { ApiError } from "@/lib/api";
import type { Zone } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PAGE_SIZE = 15;

export default function ZonesPage() {
  const isAdmin = useRole() === "ADMIN";
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 350);
  const [page, setPage] = useState(1);
  const [renaming, setRenaming] = useState<Zone | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createName, setCreateName] = useState("");

  useEffect(() => {
    setPage(1);
  }, [search]);

  const zones = useZones({ search, page, pageSize: PAGE_SIZE });
  const master = useMasterZones();
  const create = useCreateZone();
  const rename = useRenameZone();
  const del = useDeleteZone();

  const submitCreate = () => {
    const name = createName.trim();
    if (!name) return toast.error("Enter a zone name");
    create.mutate(name, {
      onSuccess: () => {
        toast.success("Zone created");
        setCreating(false);
        setCreateName("");
      },
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to create zone"),
    });
  };

  const submitRename = () => {
    if (!renaming) return;
    rename.mutate(
      { id: renaming.id, name: newName },
      {
        onSuccess: () => {
          toast.success("Zone renamed");
          setRenaming(null);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Rename failed"),
      },
    );
  };

  const onDelete = (z: Zone) => {
    del.mutate(z.id, {
      onSuccess: () => toast.success("Zone deleted"),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Delete failed"),
    });
  };

  // Extra columns come from the imported spreadsheet's headers (up to 5).
  const dataKeys = useMemo(() => {
    const first = zones.data?.items[0];
    if (!first) return [] as string[];
    return Object.keys(first.zoneData)
      .filter((c) => c.toLowerCase() !== "zone")
      .slice(0, 5);
  }, [zones.data]);

  const columns = useMemo<ColumnDef<Zone, unknown>[]>(() => {
    const cols: ColumnDef<Zone, unknown>[] = [
      {
        header: "Zone",
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      ...dataKeys.map<ColumnDef<Zone, unknown>>((key) => ({
        id: `zoneData.${key}`,
        header: key,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {String(row.original.zoneData[key] ?? "—")}
          </span>
        ),
      })),
    ];

    if (isAdmin) {
      cols.push({
        id: "actions",
        header: "Actions",
        size: 96,
        meta: { className: "text-right" },
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setRenaming(row.original);
                setNewName(row.original.name);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(row.original)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ),
      });
    }

    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKeys, isAdmin]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Zone Master"
        description="Upload all zones once, or add them one at a time. Assign New/Renewal type and commission % per vendor when creating a vendor."
      >
        {isAdmin && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New zone
          </Button>
        )}
      </PageHeader>

      {isAdmin && <ZoneUploadCard count={master.data?.length} />}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search zones by name…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
        />
      </div>

      <DataTable
        columns={columns}
        data={zones.data?.items ?? []}
        isLoading={zones.isLoading}
        emptyMessage="No zones yet. Upload a sheet above."
        page={zones.data?.meta.page ?? page}
        pageSize={zones.data?.meta.pageSize ?? PAGE_SIZE}
        total={zones.data?.meta.total ?? 0}
        totalPages={zones.data?.meta.totalPages ?? 1}
        onPageChange={setPage}
      />

      <Dialog open={creating} onOpenChange={(o) => { if (!o) { setCreating(false); setCreateName(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New zone</DialogTitle>
          </DialogHeader>
          <Input
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitCreate()}
            placeholder="e.g. RB Megapolis"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreating(false); setCreateName(""); }}>
              Cancel
            </Button>
            <Button onClick={submitCreate} disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create zone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename zone</DialogTitle>
          </DialogHeader>
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Zone name" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button onClick={submitRename} disabled={rename.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
