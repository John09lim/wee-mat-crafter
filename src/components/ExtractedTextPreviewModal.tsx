import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, FileCheck2, RotateCcw } from "lucide-react";

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
      <DialogContent className="max-h-[calc(100dvh-1.5rem)] border-warm-border bg-paper sm:max-w-3xl">
        <DialogHeader className="pr-8">
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-success/10 text-success">
            <FileCheck2 aria-hidden="true" className="h-5 w-5" />
          </div>
          <DialogTitle className="flex items-center gap-2">
            File content is ready to review
          </DialogTitle>
          <DialogDescription>
            Check the text extracted from <strong className="font-semibold text-ink">{fileName}</strong> before
            it is used to generate your WeeLMat.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea
          aria-label={`Extracted text from ${fileName}`}
          className="h-[min(27rem,48dvh)] w-full rounded-xl border border-warm-border bg-cream/45"
        >
          <div className="whitespace-pre-wrap p-4 font-mono text-sm leading-6 text-ink sm:p-5">
            {extractedText || "No text was extracted from the file."}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 border-t border-warm-border pt-4 sm:gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="gap-2 border-warm-border bg-paper text-forest hover:bg-primary/5 hover:text-forest"
          >
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            Choose another file
          </Button>
          <Button
            onClick={onConfirm}
            className="gap-2 bg-forest text-paper hover:bg-primary"
          >
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            Use this text
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
