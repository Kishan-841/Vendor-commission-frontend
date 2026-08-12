"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import toast from "react-hot-toast";
import { useUploadZones } from "@/hooks/use-zones";
import { ExcelDropzone } from "./excel-dropzone";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Single master-zone upload. New/Renewal + commission % are set per vendor later.
export function ZoneUploadCard({ count }: { count?: number }) {
  const [file, setFile] = useState<File | null>(null);
  const [replace, setReplace] = useState(false);
  const upload = useUploadZones();

  const onUpload = () => {
    if (!file) return toast.error("Choose an Excel file");
    upload.mutate(
      { file, replace },
      {
        onSuccess: (r) => {
          toast.success(`Imported ${r.rowCount} zone(s)`);
          setFile(null);
          setReplace(false);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Upload failed"),
      },
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">Upload zones</CardTitle>
          <p className="text-sm text-muted-foreground">
            One master sheet — each row becomes a zone. Assign type &amp; commission % per vendor.
          </p>
        </div>
        {count !== undefined && (
          <span className="text-sm text-muted-foreground">{count} in master</span>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <ExcelDropzone file={file} onFile={setFile} disabled={upload.isPending} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Switch id="replace-zones" checked={replace} onCheckedChange={setReplace} />
            <Label htmlFor="replace-zones" className="text-sm">Replace all existing zones</Label>
          </div>
          <Button onClick={onUpload} disabled={upload.isPending || !file}>
            <Upload className="h-4 w-4" />
            {upload.isPending ? "Uploading…" : "Upload"}
          </Button>
        </div>
        {replace && (
          <p className="text-sm text-warning">
            Replace will delete the entire master zone list (and vendor assignments) first.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
