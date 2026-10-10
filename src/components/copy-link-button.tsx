"use client";

import { Link2 } from "lucide-react";
import { toast } from "sonner";

/** Copies a link to the clipboard for pasting into WhatsApp or the like. */
export function CopyLinkButton({
  text,
  label = "Copy the link",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Link copied.");
    } catch {
      toast.error("Could not copy the link.");
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={className}
      aria-label={label}
      title={label}
    >
      <Link2 className="size-4" />
    </button>
  );
}