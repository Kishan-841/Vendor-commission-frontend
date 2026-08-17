"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// A document fetched (with auth) as a Blob, ready to preview in-app.
export interface ViewerDoc {
  title: string;
  fileName: string; // used when downloading from inside the viewer
  blob: Blob;
}

// Large in-app preview: <iframe> for PDFs (browsers render them natively),
// <img> for image attachments. The object URL lives exactly as long as the
// dialog is open.
export function DocumentViewerDialog({
  doc,
  onOpenChange,
}: {
  doc: ViewerDoc | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!doc) return;
    const u = URL.createObjectURL(doc.blob);
    setUrl(u);
    return () => {
      URL.revokeObjectURL(u);
      setUrl(null);
    };
  }, [doc]);

  const isImage = doc?.blob.type.startsWith("image/") ?? false;

  const download = () => {
    if (!doc || !url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.fileName;
    a.click();
  };

  return (
    <Dialog open={!!doc} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] flex-col sm:max-w-[900px]">
        <DialogHeader className="flex-row items-center justify-between space-y-0 pr-8">
          <DialogTitle className="truncate">{doc?.title}</DialogTitle>
          <Button variant="outline" size="sm" onClick={download}>
            <Download className="h-4 w-4" /> Download
          </Button>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-border bg-muted/30">
          {url &&
            doc &&
            (isImage ? (
              <div className="flex h-full items-start justify-center overflow-auto p-4">
                {/* eslint-disable-next-line @next/next/no-img-element -- blob URL, next/image can't optimize it */}
                <img src={url} alt={doc.title} className="max-w-full" />
              </div>
            ) : (
              <iframe src={url} title={doc.title} className="h-full w-full" />
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
