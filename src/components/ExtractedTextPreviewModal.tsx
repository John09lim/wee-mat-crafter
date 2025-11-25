import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, XCircle } from "lucide-react";

interface ExtractedTextPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extractedText: string;
  fileName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ExtractedTextPreviewModal = ({
  open,
  onOpenChange,
  extractedText,
  fileName,
  onConfirm,
  onCancel,
}: ExtractedTextPreviewModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            File Content Extracted Successfully
          </DialogTitle>
          <DialogDescription>
            Review the extracted text from <strong>{fileName}</strong> before proceeding with auto-fill.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] w-full rounded-md border p-4">
          <div className="whitespace-pre-wrap text-sm font-mono">
            {extractedText || "No text was extracted from the file."}
          </div>
        </ScrollArea>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onCancel}
            className="gap-2"
          >
            <XCircle className="h-4 w-4" />
            Cancel & Try Another File
          </Button>
          <Button
            onClick={onConfirm}
            className="gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Proceed with Auto-Fill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
