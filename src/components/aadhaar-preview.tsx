"use client";

import { useState } from "react";
import { Download, FileText, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function isPdf(url: string) {
  return /\.pdf($|\?)/i.test(url) || url.startsWith("blob:");
}

/**
 * Vercel Blob serves a stored file inline. Adding `download=1` makes it come
 * back as an attachment so the browser saves it instead of opening a tab.
 */
function downloadUrl(url: string) {
  if (url.startsWith("blob:")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}download=1`;
}

/**
 * Shows an Aadhaar scan inline, next to the number it belongs to. The dialog
 * previews images directly and embeds PDFs, so the owner does not have to leave
 * the application page to check a document.
 */
export function AadhaarPreview({
  url,
  label = "Aadhaar scan",
}: {
  url: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const pdf = isPdf(url);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-8">
            <Maximize2 className="size-3.5" />
            Preview
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[75dvh] overflow-auto rounded-lg border border-border bg-muted/40">
            {pdf ? (
              <iframe
                src={url}
                title={label}
                className="h-[75dvh] w-full border-0"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={label} className="mx-auto max-h-[75dvh] object-contain" />
            )}
          </div>
          <a
            href={downloadUrl(url)}
            target="_blank"
            rel="noopener noreferrer"
            className="-mx-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <FileText className="size-3.5" />
            Open in a new tab
          </a>
        </DialogContent>
      </Dialog>
      <Button asChild variant="outline" size="sm" className="h-8">
        <a href={downloadUrl(url)} download rel="noopener noreferrer">
          <Download className="size-3.5" />
          Download
        </a>
      </Button>
    </div>
  );
}
