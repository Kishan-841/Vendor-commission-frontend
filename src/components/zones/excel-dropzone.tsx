"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileSpreadsheet, X } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const ACCEPT = ".xlsx,.xls,.csv";
const VALID = /\.(xlsx|xls|csv)$/i;

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ExcelDropzone({
  file,
  onFile,
  disabled = false,
}: {
  file: File | null;
  onFile: (file: File | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const accept = useCallback(
    (f: File | undefined | null) => {
      if (!f) return;
      if (!VALID.test(f.name)) {
        toast.error("Only .xlsx, .xls or .csv files are allowed");
        return;
      }
      onFile(f);
    },
    [onFile],
  );

  const openPicker = () => !disabled && inputRef.current?.click();

  return (
    <div>
      {/* Hidden native input drives the actual file selection. */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          accept(e.target.files?.[0]);
          // reset so selecting the same file again re-fires onChange
          e.target.value = "";
        }}
      />

      {file ? (
        // ── Selected-file card ────────────────────────────────────────────
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-success/10 text-success">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">{humanSize(file.size)} · ready to import</p>
          </div>
          <button
            type="button"
            onClick={() => onFile(null)}
            disabled={disabled}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        // ── Empty dropzone ────────────────────────────────────────────────
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={openPicker}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openPicker();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!disabled) accept(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
            disabled
              ? "cursor-not-allowed opacity-60"
              : "cursor-pointer hover:border-primary/50 hover:bg-muted/40",
            dragging ? "border-primary bg-primary/5" : "border-border",
          )}
        >
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full transition-transform",
              "bg-primary/10 text-primary",
              dragging && "scale-110",
            )}
          >
            <UploadCloud className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {dragging ? "Drop to upload" : "Drag & drop your Excel file here"}
            </p>
            <p className="text-sm text-muted-foreground">
              or <span className="font-medium text-primary">click to browse</span>
            </p>
          </div>
          <p className="text-xs text-muted-foreground">.xlsx, .xls or .csv · up to 10&nbsp;MB</p>
        </div>
      )}
    </div>
  );
}
