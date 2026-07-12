import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Printer, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SubmissionsReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submissions: Array<{
    id: string;
    teacher_name: string;
    subject: string;
    grade_level: string;
    week_start: string;
    week_end: string;
    created_at: string;
    file_url?: string | null;
  }>;
  schoolName: string;
  principalName: string;
}

export function SubmissionsReportModal({
  open,
  onOpenChange,
  submissions,
  schoolName,
  principalName,
}: SubmissionsReportModalProps) {
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [generating, setGenerating] = useState(false);

  // Get unique weeks from submissions
  const availableWeeks = useMemo(() => {
    const weeksMap = new Map<string, { weekStart: string; weekEnd: string; label: string }>();
    
    submissions.forEach((sub) => {
      if (sub.week_start && sub.week_end) {
        const key = `${sub.week_start}_${sub.week_end}`;
        if (!weeksMap.has(key)) {
          const start = new Date(sub.week_start);
          const end = new Date(sub.week_end);
          const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
          const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
          const year = end.getFullYear();
          
          let label;
          if (startMonth === endMonth) {
            label = `${startMonth} ${start.getDate()}-${end.getDate()}, ${year}`;
          } else {
            label = `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${year}`;
          }
          
          weeksMap.set(key, {
            weekStart: sub.week_start,
            weekEnd: sub.week_end,
            label,
          });
        }
      }
    });
    
    return Array.from(weeksMap.values()).sort((a, b) => 
      new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime()
    );
  }, [submissions]);

  // Filter submissions by selected week
  const filteredSubmissions = useMemo(() => {
    if (!selectedWeek) return [];
    const [weekStart, weekEnd] = selectedWeek.split("_");
    return submissions.filter(
      (sub) => sub.week_start === weekStart && sub.week_end === weekEnd
    );
  }, [submissions, selectedWeek]);

  const handleDownload = async () => {
    if (!selectedWeek) {
      toast.error("Please select a week first");
      return;
    }

    const [weekStart, weekEnd] = selectedWeek.split("_");
    
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Not authenticated");
        return;
      }

      const response = await fetch(
        `https://velpueasbsrptocrjljg.supabase.co/functions/v1/generate-submission-report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            schoolName,
            principalName,
            weekStart,
            weekEnd,
            submissions: filteredSubmissions.map((sub) => ({
              teacherName: sub.teacher_name,
              subject: sub.subject,
              gradeLevel: sub.grade_level,
              fileName: sub.file_url?.split("/").pop() || "WeeLMat.docx",
              submittedDate: sub.created_at,
            })),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `WeeLMat_Submissions_${schoolName.replace(/\s+/g, "_")}_${weekStart}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Report downloaded successfully!");
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Error generating report:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!selectedWeek) {
      toast.error("Please select a week first");
      return;
    }

    const [weekStart, weekEnd] = selectedWeek.split("_");
    const weekLabel = availableWeeks.find(w => w.weekStart === weekStart && w.weekEnd === weekEnd)?.label || "";

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>WeeLMat Submission Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #236130; text-align: center; margin-bottom: 5px; }
          h2 { text-align: center; color: #666; margin-top: 5px; }
          .header { text-align: center; margin-bottom: 20px; }
          .school-name { font-size: 18px; font-weight: bold; }
          .principal { font-size: 14px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #236130; color: white; padding: 10px; text-align: left; }
          td { border: 1px solid #ddd; padding: 8px; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .footer { text-align: right; margin-top: 20px; font-style: italic; color: #666; font-size: 12px; }
          .summary { margin: 15px 0; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="school-name">${schoolName}</div>
          <div class="principal">Principal: ${principalName || 'N/A'}</div>
        </div>
        <h1>Weekly WeeLMat Submission Report</h1>
        <h2>Week of ${weekLabel}</h2>
        <div class="summary">Total Submissions: ${filteredSubmissions.length}</div>
        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th>Teacher Name</th>
              <th>Subject</th>
              <th>Grade</th>
              <th>File Name</th>
              <th>Submitted Date</th>
            </tr>
          </thead>
          <tbody>
            ${filteredSubmissions.map((sub, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${sub.teacher_name}</td>
                <td>${sub.subject}</td>
                <td>${sub.grade_level}</td>
                <td>${sub.file_url?.split("/").pop() || "WeeLMat.docx"}</td>
                <td>${new Date(sub.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <div class="footer">Report generated on ${new Date().toLocaleString()}</div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto border-[#D8D0C4] bg-[#FFFCF7] sm:max-h-[85dvh] sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2 text-2xl text-[#173F2A]">
            <FileText className="h-5 w-5 text-[#236130]" aria-hidden="true" />
            Download Submissions Report
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label htmlFor="submission-report-week" className="mb-2 block text-sm font-semibold text-[#173F2A]">Select week</label>
            <Select value={selectedWeek} onValueChange={setSelectedWeek}>
              <SelectTrigger id="submission-report-week" className="min-h-11 border-[#CFC6B9] bg-white" aria-label="Select a week for the submissions report">
                <SelectValue placeholder="Choose a week..." />
              </SelectTrigger>
              <SelectContent>
                {availableWeeks.map((week) => (
                  <SelectItem key={`${week.weekStart}_${week.weekEnd}`} value={`${week.weekStart}_${week.weekEnd}`}>
                    {week.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedWeek && (
            <div className="rounded-lg border border-[#D8D0C4] bg-[#F8F3EB] p-4">
              <p className="text-sm font-medium mb-2">
                {filteredSubmissions.length} teacher{filteredSubmissions.length !== 1 ? "s" : ""} submitted during this week
              </p>
              <div className="max-h-[200px] overflow-y-auto space-y-1">
                {filteredSubmissions.map((sub) => (
                  <div key={sub.id} className="flex min-h-10 items-center justify-between gap-3 border-b border-[#E4DDD2] py-2 text-sm last:border-b-0">
                    <span>{sub.teacher_name}</span>
                    <span className="text-muted-foreground">{sub.subject}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button
              onClick={handleDownload}
              disabled={!selectedWeek || generating}
              className="min-h-11 flex-1 bg-[#236130] text-white hover:bg-[#173F2A]"
            >
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              {generating ? "Generating..." : "Download DOCX"}
            </Button>
            <Button
              onClick={handlePrint}
              disabled={!selectedWeek}
              variant="outline"
              className="min-h-11 flex-1 border-[#236130] text-[#173F2A] hover:bg-[#E8EFE8]"
            >
              <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
              Print Preview
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
