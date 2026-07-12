import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Download } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface WeeklySubmissionSummaryProps {
  managedTeachers: Array<{
    user_id?: string | null;
    teacher_name: string;
    grade_level?: string | null;
  }>;
  submissions: Array<{
    user_id?: string | null;
    teacher_name: string;
    week_start: string;
  }>;
  schoolName?: string;
}

export function WeeklySubmissionSummary({ managedTeachers, submissions, schoolName }: WeeklySubmissionSummaryProps) {
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [selectedWeekIndices, setSelectedWeekIndices] = useState<Set<number>>(new Set());

  // School Year 2026-2027 begins on Monday, June 8, 2026.
  const weeks = useMemo(() => {
    const startDate = new Date(2026, 5, 8);
    const today = new Date();

    const padZero = (n: number) => n.toString().padStart(2, '0');
    const toLocalDateStr = (d: Date) => `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`;

    const getMondayOfWeek = (date: Date) => {
      const d = new Date(date);
      const day = d.getDay();
      if (day === 6) d.setDate(d.getDate() + 2);
      else if (day === 0) d.setDate(d.getDate() + 1);
      else {
        const diff = 1 - day;
        d.setDate(d.getDate() + diff);
      }
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const currentMonday = getMondayOfWeek(today);
    const result: { monday: Date; friday: Date; label: string; weekStart: string; weekEnd: string }[] = [];

    const weekMonday = new Date(startDate);
    while (weekMonday <= currentMonday) {
      const friday = new Date(weekMonday);
      friday.setDate(weekMonday.getDate() + 4);

      const formatShort = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const label = `${formatShort(weekMonday)} - ${formatShort(friday)}`;

      result.push({
        monday: new Date(weekMonday),
        friday: new Date(friday),
        label,
        weekStart: toLocalDateStr(weekMonday),
        weekEnd: toLocalDateStr(friday),
      });

      weekMonday.setDate(weekMonday.getDate() + 7);
    }

    return result;
  }, []);

  const submissionLookup = useMemo(() => {
    const lookup = new Map<string, Set<string>>();
    for (const sub of submissions) {
      const key = sub.user_id || sub.teacher_name;
      if (!lookup.has(key)) lookup.set(key, new Set());
      const weekStart = typeof sub.week_start === 'string' ? sub.week_start.substring(0, 10) : sub.week_start;
      lookup.get(key)!.add(weekStart);
    }
    return lookup;
  }, [submissions]);

  const weekTotals = useMemo(() => {
    return weeks.map(week => {
      let count = 0;
      for (const teacher of managedTeachers) {
        const key = teacher.user_id || teacher.teacher_name;
        const teacherWeeks = submissionLookup.get(key);
        if (teacherWeeks?.has(week.weekStart)) count++;
      }
      return count;
    });
  }, [weeks, managedTeachers, submissionLookup]);

  const sortedTeachers = useMemo(() => {
    const gradeOrder = (grade: string | null): number => {
      if (!grade) return 999;
      const g = grade.toLowerCase().trim();
      if (g === 'kinder') return 1;
      if (g === 'sped') return 2;
      const elemMatch = g.match(/^grade\s+(\d+)$/i);
      if (elemMatch) {
        const num = parseInt(elemMatch[1]);
        if (num >= 1 && num <= 6) return 10 + num;
        if (num >= 7 && num <= 12) return 30 + num;
      }
      if (g === 'subject teacher') return 20;
      return 50;
    };
    return [...managedTeachers].sort((a, b) => gradeOrder(a.grade_level) - gradeOrder(b.grade_level));
  }, [managedTeachers]);

  const toggleWeek = (index: number) => {
    setSelectedWeekIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const selectAllWeeks = () => {
    if (selectedWeekIndices.size === weeks.length) {
      setSelectedWeekIndices(new Set());
    } else {
      setSelectedWeekIndices(new Set(weeks.map((_, i) => i)));
    }
  };

  const handleOpenDownload = () => {
    setSelectedWeekIndices(new Set(weeks.map((_, i) => i)));
    setShowDownloadDialog(true);
  };

  const handleDownloadPDF = () => {
    if (selectedWeekIndices.size === 0) {
      toast.error("Please select at least one week");
      return;
    }

    const selectedWeeks = weeks.filter((_, i) => selectedWeekIndices.has(i));
    const selectedTotals = weekTotals.filter((_, i) => selectedWeekIndices.has(i));

    // Split weeks into chunks that fit on a page (max ~8 week columns per page for readability)
    const MAX_WEEKS_PER_PAGE = 8;
    const weekChunks: typeof selectedWeeks[] = [];
    const totalChunks: number[][] = [];
    for (let i = 0; i < selectedWeeks.length; i += MAX_WEEKS_PER_PAGE) {
      weekChunks.push(selectedWeeks.slice(i, i + MAX_WEEKS_PER_PAGE));
      totalChunks.push(selectedTotals.slice(i, i + MAX_WEEKS_PER_PAGE));
    }

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    const dateRange = `${selectedWeeks[0].label}, ${selectedWeeks[0].monday.getFullYear()} — ${selectedWeeks[selectedWeeks.length - 1].label}, ${selectedWeeks[selectedWeeks.length - 1].monday.getFullYear()}`;
    const generatedDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    weekChunks.forEach((chunkWeeks, chunkIdx) => {
      if (chunkIdx > 0) doc.addPage();

      // Title
      doc.setFontSize(14);
      doc.setTextColor(35, 97, 48);
      doc.text("Weekly Submission Summary", 14, 15);

      if (schoolName) {
        doc.setFontSize(11);
        doc.setTextColor(80, 80, 80);
        doc.text(`School: ${schoolName}`, 14, 22);
      }

      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(`Period: ${dateRange}`, 14, schoolName ? 28 : 22);
      doc.text(`Generated: ${generatedDate}`, 14, schoolName ? 33 : 27);
      if (weekChunks.length > 1) {
        doc.text(`Page ${chunkIdx + 1} of ${weekChunks.length}`, 260, schoolName ? 33 : 27);
      }

      // Format week headers as multi-line for readability
      const weekHeaders = chunkWeeks.map(w => {
        const mon = w.monday;
        const fri = w.friday;
        const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `${fmt(mon)} -\n${fmt(fri)},\n${mon.getFullYear()}`;
      });

      const headers = ["No.", "Teacher Name", "Grade/Section", ...weekHeaders];

      const body = sortedTeachers.map((teacher, idx) => {
        const key = teacher.user_id || teacher.teacher_name;
        const teacherWeeks = submissionLookup.get(key);
        const weekCells = chunkWeeks.map(week => teacherWeeks?.has(week.weekStart) ? "submitted" : "missing");
        return [
          (idx + 1).toString(),
          teacher.teacher_name || "",
          `${teacher.grade_level || ""} - ${teacher.section || ""}`,
          ...weekCells,
        ];
      });

      body.push([
        "",
        "TOTAL SUBMITTED",
        "",
        ...totalChunks[chunkIdx].map(t => `${t}/${sortedTeachers.length}`),
      ]);

      autoTable(doc, {
        head: [headers],
        body,
        startY: schoolName ? 36 : 30,
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 2,
          halign: "center",
          valign: "middle",
          lineWidth: 0.3,
        },
        headStyles: {
          fillColor: [35, 97, 48],
          textColor: [255, 255, 255],
          fontSize: 7,
          fontStyle: "bold",
          cellPadding: 2,
          minCellHeight: 14,
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          1: { halign: "left", cellWidth: 45 },
          2: { halign: "left", cellWidth: 35 },
        },
        didParseCell: (data) => {
          if (data.row.index === sortedTeachers.length) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [240, 240, 240];
          }
          if (data.section === "body" && data.column.index >= 3 && data.row.index < sortedTeachers.length) {
            if (data.cell.raw === "submitted") {
              data.cell.styles.fillColor = [34, 139, 34];
              data.cell.styles.textColor = [34, 139, 34];
              data.cell.styles.fontSize = 1;
            } else if (data.cell.raw === "missing") {
              data.cell.styles.fillColor = [220, 38, 38];
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fontSize = 1;
            }
          }
        },
      });
    });

    const fileName = `Weekly_Submission_Summary_${schoolName?.replace(/\s+/g, '_') || 'Report'}.pdf`;
    doc.save(fileName);
    toast.success("PDF downloaded successfully!");
    setShowDownloadDialog(false);
  };

  if (sortedTeachers.length === 0) return null;

  return (
    <>
      <Card className="mb-6 border-[#D8D0C4] bg-[#FFFCF7] p-5 shadow-none sm:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-2xl font-semibold text-[#173F2A]">
              Weekly Submission Summary
            </h3>
            <p className="mt-1 text-sm text-[#526159]">
              School Year 2026–2027 • Reporting begins June 8, 2026 • {sortedTeachers.length} teachers • {weeks.length} weeks
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleOpenDownload}
            className="min-h-11 gap-2 border-[#236130] text-[#173F2A] hover:bg-[#E8EFE8]"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download PDF
          </Button>
        </div>

        <div className="space-y-4 md:hidden" aria-label="Weekly submission summary by teacher">
          {sortedTeachers.map((teacher) => {
            const key = teacher.user_id || teacher.teacher_name;
            const teacherWeeks = submissionLookup.get(key);
            return (
              <article key={`mobile-${teacher.id || key}`} className="rounded-xl border border-[#D8D0C4] bg-white p-4">
                <h4 className="font-semibold text-[#142019]">{teacher.teacher_name}</h4>
                <p className="mt-1 text-sm text-[#526159]">{teacher.grade_level} · {teacher.section}</p>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {weeks.map((week, index) => {
                    const submitted = teacherWeeks?.has(week.weekStart);
                    return (
                      <div key={index} className={`rounded-lg border p-2.5 ${submitted ? "border-[#B9D1BE] bg-[#EAF3EB]" : "border-[#E0B8AE] bg-[#FAECE8]"}`}>
                        <p className="text-xs font-semibold tabular-nums text-[#526159]">{week.label}</p>
                        <p className={`mt-1 flex items-center gap-1.5 text-xs font-bold ${submitted ? "text-[#17613A]" : "text-[#A83224]"}`}>
                          {submitted ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <XCircle className="h-4 w-4" aria-hidden="true" />}
                          {submitted ? "Submitted" : "Missing"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>

        <ScrollArea className="hidden w-full whitespace-nowrap rounded-xl border border-[#D8D0C4] md:block">
          <div className="min-w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-10 min-w-[180px] border-r border-[#D8D0C4] bg-[#F8F3EB] font-semibold text-[#173F2A]">
                    Teacher Name
                  </TableHead>
                  {weeks.map((week, i) => (
                    <TableHead key={i} className="text-center min-w-[120px] text-xs px-2">
                      <div className="font-semibold">{week.label}</div>
                      <div className="text-muted-foreground font-normal">{week.monday.getFullYear()}</div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTeachers.map((teacher) => {
                  const key = teacher.user_id || teacher.teacher_name;
                  const teacherWeeks = submissionLookup.get(key);
                  return (
                    <TableRow key={teacher.id || key} className="hover:bg-[#FAF7F1]">
                      <TableCell className="sticky left-0 z-10 border-r border-[#D8D0C4] bg-[#FFFCF7] text-sm font-medium">
                        <div>{teacher.teacher_name}</div>
                        <div className="text-xs text-muted-foreground">{teacher.grade_level} - {teacher.section}</div>
                      </TableCell>
                      {weeks.map((week, i) => {
                        const submitted = teacherWeeks?.has(week.weekStart);
                        return (
                          <TableCell key={i} className="text-center px-2">
                            {submitted ? (
                              <CheckCircle2 className="mx-auto h-5 w-5 text-[#17613A]" aria-label="Submitted" />
                            ) : (
                              <XCircle className="mx-auto h-5 w-5 text-[#A83224]" aria-label="Missing" />
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
                <TableRow className="border-t-2 font-semibold">
                  <TableCell className="sticky left-0 z-10 border-r border-[#D8D0C4] bg-[#F8F3EB] text-sm font-semibold text-[#173F2A]">
                    Total Submitted
                  </TableCell>
                  {weekTotals.map((total, i) => (
                    <TableCell key={i} className="text-center text-sm">
                      <span className={total === sortedTeachers.length ? "font-bold text-[#17613A]" : total === 0 ? "text-[#A83224]" : "text-[#8A5A00]"}>
                        {total}/{sortedTeachers.length}
                      </span>
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </Card>

      {/* Week Selection Dialog */}
      <Dialog open={showDownloadDialog} onOpenChange={setShowDownloadDialog}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-md border-[#D8D0C4] bg-[#FFFCF7] sm:max-h-[85dvh]">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-[#173F2A]">Download Weekly Summary PDF</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Select the weeks you want to include in the PDF report.</p>

          <div className="mb-2 flex min-h-11 items-center gap-3 rounded-lg border border-[#D8D0C4] bg-[#F8F3EB] px-3">
            <Checkbox
              id="select-all"
              checked={selectedWeekIndices.size === weeks.length}
              onCheckedChange={selectAllWeeks}
            />
            <label htmlFor="select-all" className="text-sm font-semibold cursor-pointer">
              Select All ({weeks.length} weeks)
            </label>
          </div>

          <ScrollArea className="h-[min(300px,42dvh)] rounded-md border border-[#D8D0C4] bg-white p-3">
            <div className="space-y-2">
              {weeks.map((week, i) => (
                <div key={i} className="flex min-h-11 items-center gap-3 rounded-md px-1 hover:bg-[#F8F3EB]">
                  <Checkbox
                    id={`week-${i}`}
                    checked={selectedWeekIndices.has(i)}
                    onCheckedChange={() => toggleWeek(i)}
                  />
                  <label htmlFor={`week-${i}`} className="text-sm cursor-pointer flex-1">
                    {week.label}, {week.monday.getFullYear()}
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {weekTotals[i]}/{sortedTeachers.length}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>

          <p className="text-xs text-muted-foreground">
            {selectedWeekIndices.size} week{selectedWeekIndices.size !== 1 ? 's' : ''} selected • Landscape A4 PDF
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDownloadDialog(false)} className="min-h-11 border-[#CFC6B9]">
              Cancel
            </Button>
            <Button
              onClick={handleDownloadPDF}
              disabled={selectedWeekIndices.size === 0}
              className="min-h-11 bg-[#236130] text-white hover:bg-[#173F2A]"
            >
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
