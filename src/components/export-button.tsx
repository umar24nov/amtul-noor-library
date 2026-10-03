import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * A plain link styled as a button. Downloads the spreadsheet, so it has to be a
 * real navigation rather than a form submit or a fetch.
 */
export function ExportButton({
  href,
  label,
  description,
  size = "lg",
  variant = "outline",
  className,
}: {
  href: string;
  label: string;
  description?: string;
  size?: "default" | "lg" | "sm" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost";
  className?: string;
}) {
  return (
    <Button asChild size={size} variant={variant} className={className} title={description}>
      <a href={href} download aria-label={description ?? label}>
        <Download className="size-4" aria-hidden="true" />
        {label}
      </a>
    </Button>
  );
}