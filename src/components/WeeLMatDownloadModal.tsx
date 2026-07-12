import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, GraduationCap, Share2 } from "lucide-react";

interface WeeLMatDownloadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownloadTeacher: () => void;
  onDownloadStudent: () => void;
  onShare: () => void;
}

export const WeeLMatDownloadModal = ({
  open,
  onOpenChange,
  onDownloadTeacher,
  onDownloadStudent,
  onShare,
}: WeeLMatDownloadModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-warm-border bg-paper sm:max-w-lg">
        <DialogHeader className="pr-8">
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-forest text-paper">
            <FileText aria-hidden="true" className="h-5 w-5" />
          </div>
          <DialogTitle>Choose a WeeLMat copy</DialogTitle>
          <DialogDescription>
            Download the complete teacher copy, prepare a learner-ready copy, or share the
            learner document securely.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 pt-2">
          <Button
            onClick={() => {
              onDownloadTeacher();
              onOpenChange(false);
            }}
            className="h-auto min-h-20 w-full items-start justify-start gap-3 rounded-xl bg-forest px-4 py-4 text-left text-paper shadow-sm hover:bg-primary"
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper/12">
              <FileText aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="min-w-0 whitespace-normal">
              <span className="block font-semibold">Teacher copy</span>
              <span className="mt-1 block text-xs font-normal leading-5 text-paper/80">
                Full weekly matrix with answer keys and teacher notes.
              </span>
            </span>
          </Button>

          <Button
            onClick={() => {
              onDownloadStudent();
              onOpenChange(false);
            }}
            variant="outline"
            className="h-auto min-h-20 w-full items-start justify-start gap-3 rounded-xl border-warm-border bg-paper px-4 py-4 text-left text-forest hover:border-primary/40 hover:bg-primary/5 hover:text-forest"
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <GraduationCap aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="min-w-0 whitespace-normal">
              <span className="block font-semibold">Learner copy</span>
              <span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">
                A clear classroom copy without answer keys.
              </span>
            </span>
          </Button>

          <Button
            onClick={() => {
              onShare();
              onOpenChange(false);
            }}
            variant="secondary"
            className="h-auto min-h-20 w-full items-start justify-start gap-3 rounded-xl border border-secondary/45 bg-secondary/16 px-4 py-4 text-left text-forest hover:bg-secondary/25"
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary/28">
              <Share2 aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="min-w-0 whitespace-normal">
              <span className="block font-semibold">Share learner copy</span>
              <span className="mt-1 block text-xs font-normal leading-5 text-forest/70">
                Send the learner document through supported apps or copy its link.
              </span>
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
