import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, FileText, GraduationCap } from "lucide-react";

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Download WeeLMat</DialogTitle>
          <DialogDescription>
            Choose how you'd like to download or share your WeeLMat
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-3 py-4">
          <Button
            onClick={() => {
              onDownloadTeacher();
              onOpenChange(false);
            }}
            className="h-auto py-4 flex-col items-start gap-2"
            style={{ backgroundColor: "#236130", color: "white" }}
          >
            <div className="flex items-center gap-2 w-full">
              <FileText className="h-5 w-5" />
              <span className="font-semibold">Download for Teacher</span>
            </div>
            <span className="text-xs text-left opacity-90 font-normal">
              Full version with answer keys and teacher notes
            </span>
          </Button>

          <Button
            onClick={() => {
              onDownloadStudent();
              onOpenChange(false);
            }}
            variant="outline"
            className="h-auto py-4 flex-col items-start gap-2"
            style={{ borderColor: "#236130", color: "#236130" }}
          >
            <div className="flex items-center gap-2 w-full">
              <GraduationCap className="h-5 w-5" />
              <span className="font-semibold">Download for Student</span>
            </div>
            <span className="text-xs text-left opacity-70 font-normal">
              Simplified version without answer keys
            </span>
          </Button>

          <Button
            onClick={() => {
              onShare();
              onOpenChange(false);
            }}
            variant="secondary"
            className="h-auto py-4 flex-col items-start gap-2"
            style={{ backgroundColor: "#f5ca47", color: "#236130" }}
          >
            <div className="flex items-center gap-2 w-full">
              <Share2 className="h-5 w-5" />
              <span className="font-semibold">Share</span>
            </div>
            <span className="text-xs text-left opacity-70 font-normal">
              Share student version via messaging apps or email
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};