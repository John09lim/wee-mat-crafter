import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink, Eye, FileText } from "lucide-react";

interface DocumentViewerProps {
  fileUrl: string;
  fileName: string;
  onClose?: () => void;
}

export default function DocumentViewer({ fileUrl, fileName, onClose }: DocumentViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewerType, setViewerType] = useState<"microsoft" | "google">("microsoft");

  const getMicrosoftViewerUrl = () => {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
  };

  const getGoogleViewerUrl = () => {
    return `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
  };

  const viewerUrl = viewerType === "microsoft" ? getMicrosoftViewerUrl() : getGoogleViewerUrl();

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) onClose?.();
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="gap-2 border-warm-border bg-paper text-forest hover:bg-primary/5 hover:text-forest"
      >
        <Eye aria-hidden="true" className="h-4 w-4" />
        Preview document
      </Button>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="flex h-[min(54rem,calc(100dvh-1.5rem))] max-w-6xl flex-col gap-0 overflow-hidden border-warm-border bg-paper p-0 sm:rounded-2xl">
          <DialogHeader className="border-b border-warm-border bg-cream px-5 py-4 pr-14 text-left sm:px-6 sm:py-5 sm:pr-16">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest text-paper">
                <FileText aria-hidden="true" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="truncate">{fileName}</DialogTitle>
                <DialogDescription className="mt-1">
                  Preview the generated document before opening the original file.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-col gap-3 border-b border-warm-border bg-paper px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div
              aria-label="Document viewer service"
              className="grid grid-cols-2 gap-1 rounded-lg border border-warm-border bg-cream p-1"
              role="group"
            >
              <Button
                aria-pressed={viewerType === "microsoft"}
                className="min-h-10 rounded-md px-3"
                onClick={() => setViewerType("microsoft")}
                size="sm"
                variant={viewerType === "microsoft" ? "default" : "ghost"}
              >
                Microsoft viewer
              </Button>
              <Button
                aria-pressed={viewerType === "google"}
                className="min-h-10 rounded-md px-3"
                onClick={() => setViewerType("google")}
                size="sm"
                variant={viewerType === "google" ? "default" : "ghost"}
              >
                Google viewer
              </Button>
            </div>

            <a
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              href={fileUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              Open original file
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
            </a>
          </div>

          <div className="min-h-0 flex-1 bg-cream p-2 sm:p-4">
            <div className="h-full overflow-hidden rounded-xl border border-warm-border bg-paper shadow-sm">
              <iframe
                className="h-full w-full"
                src={viewerUrl}
                title={`Document preview: ${fileName}`}
              />
            </div>
          </div>

          <p className="border-t border-warm-border bg-paper px-5 py-3 text-xs text-muted-foreground sm:px-6">
            Viewing through {viewerType === "microsoft" ? "Microsoft Office Online" : "Google Docs Viewer"}.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
