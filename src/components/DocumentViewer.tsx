import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink, X } from "lucide-react";

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

  const openInNewTab = () => {
    window.open(getMicrosoftViewerUrl(), '_blank');
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={openInNewTab}
        className="gap-2"
      >
        <ExternalLink className="h-4 w-4" />
        View in Modal
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{fileName}</DialogTitle>
              <div className="flex items-center gap-2">
                <div className="flex gap-1 text-xs">
                  <button
                    onClick={() => setViewerType("microsoft")}
                    className={`px-2 py-1 rounded ${
                      viewerType === "microsoft"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    Microsoft
                  </button>
                  <button
                    onClick={() => setViewerType("google")}
                    className={`px-2 py-1 rounded ${
                      viewerType === "google"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    Google
                  </button>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsOpen(false);
                    onClose?.();
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 border rounded-lg overflow-hidden">
            <iframe
              src={viewerUrl}
              className="w-full h-full"
              title={`Document Viewer: ${fileName}`}
            />
          </div>

          <div className="flex justify-between items-center text-xs text-muted-foreground pt-2">
            <p>Viewing via {viewerType === "microsoft" ? "Microsoft Office Online" : "Google Docs Viewer"}</p>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline flex items-center gap-1"
              style={{ color: "#236130" }}
            >
              Open in new tab
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
