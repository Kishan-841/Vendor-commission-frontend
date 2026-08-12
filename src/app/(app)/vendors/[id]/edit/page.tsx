"use client";

import { useParams } from "next/navigation";
import { useVendor } from "@/hooks/use-vendors";
import { VendorEditor } from "@/components/vendors/vendor-editor";

export default function EditVendorPage() {
  const { id } = useParams<{ id: string }>();
  const { data: vendor, isLoading } = useVendor(id);

  if (isLoading || !vendor) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="mt-6 h-10 w-64 rounded bg-muted" />
        <div className="mt-4 h-4 w-96 max-w-full rounded bg-muted" />
      </div>
    );
  }

  // key forces a fresh editor instance once the vendor has loaded.
  return <VendorEditor key={vendor.id} vendor={vendor} />;
}
