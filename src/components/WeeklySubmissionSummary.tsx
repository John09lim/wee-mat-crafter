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
  managedTeachers: any[];
  submissions: any[];
  schoolName?: string;
}

export function WeeklySubmissionSummary({ managedTeachers, submissions, schoolName }: WeeklySubmissionSummaryProps) {
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [selectedWeekIndices, setSelectedWeekIndices] = useState<Set<number>>(new Set());

  // Generate all weeks from Aug 11, 2025 to current week
  const weeks = useMemo(() => {
    const startDate = new Date(2025, 7, 11);
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

    let weekMonday = new Date(startDate);
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

    // Create PDF in landscape
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    // Title
    doc.setFontSize(14);
    doc.setTextColor(35, 97, 48); // #236130
    doc.text("Weekly Submission Summary", 14, 15);

    if (schoolName) {
      doc.setFontSize(11);
      doc.setTextColor(80, 80, 80);
      doc.text(`School: ${schoolName}`, 14, 22);
    }

    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    const dateRange = `${selectedWeeks[0].label}, ${selectedWeeks[0].monday.getFullYear()} — ${selectedWeeks[selectedWeeks.length - 1].label}, ${selectedWeeks[selectedWeeks.length - 1].monday.getFullYear()}`;
    doc.text(`Period: ${dateRange}`, 14, schoolName ? 28 : 22);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, 14, schoolName ? 33 : 27);

    // Build table data
    const headers = ["No.", "Teacher Name", "Grade/Section", ...selectedWeeks.map(w => w.label)];

    const body = sortedTeachers.map((teacher, idx) => {
      const key = teacher.user_id || teacher.teacher_name;
      const teacherWeeks = submissionLookup.get(key);
      const weekCells = selectedWeeks.map(week => teacherWeeks?.has(week.weekStart) ? "✓" : "✗");
      return [
        (idx + 1).toString(),
        teacher.teacher_name || "",
        `${teacher.grade_level || ""} - ${teacher.section || ""}`,
        ...weekCells,
      ];
    });

    // Totals row
    body.push([
      "",
      "TOTAL SUBMITTED",
      "",
      ...selectedTotals.map(t => `${t}/${sortedTeachers.length}`),
    ]);

    autoTable(doc, {
      head: [headers],
      body,
      startY: schoolName ? 36 : 30,
      theme: "grid",
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        halign: "center",
        valign: "middle",
      },
      headStyles: {
        fillColor: [35, 97, 48],
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        1: { halign: "left", cellWidth: 40 },
        2: { halign: "left", cellWidth: 30 },
      },
      didParseCell: (data) => {
        // Style the totals row
        if (data.row.index === sortedTeachers.length) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [240, 240, 240];
        }
        // Color ✓ and ✗ cells
        if (data.section === "body" && data.column.index >= 3 && data.row.index < sortedTeachers.length) {
          if (data.cell.raw === "✓") {
            data.cell.styles.textColor = [30, 186, 131]; // green
            data.cell.styles.fontStyle = "bold";
          } else if (data.cell.raw === "✗") {
            data.cell.styles.textColor = [239, 68, 68]; // red
          }
        }
      },
    });

    const fileName = `Weekly_Submission_Summary_${schoolName?.replace(/\s+/g, '_') || 'Report'}.pdf`;
    doc.save(fileName);
    toast.success("PDF downloaded successfully!");
    setShowDownloadDialog(false);
  };

  if (sortedTeachers.length === 0) return null;

  return (
    <>
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold" style={{ color: "#236130" }}>
              Weekly Submission Summary
            </h3>
            <p className="text-sm text-muted-foreground">
              {sortedTeachers.length} teachers • {weeks.length} weeks (starting Aug 11, 2025)
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenDownload}
            className="gap-2"
            style={{ borderColor: "#236130", color: "#236130" }}
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="min-w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-10 bg-background min-w-[180px] border-r font-semibold" style={{ color: "#236130" }}>
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
                    <TableRow key={teacher.id || key}>
                      <TableCell className="sticky left-0 z-10 bg-background border-r font-medium text-sm">
                        <div>{teacher.teacher_name}</div>
                        <div className="text-xs text-muted-foreground">{teacher.grade_level} - {teacher.section}</div>
                      </TableCell>
                      {weeks.map((week, i) => {
                        const submitted = teacherWeeks?.has(week.weekStart);
                        return (
                          <TableCell key={i} className="text-center px-2">
                            {submitted ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-400 mx-auto" />
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
                <TableRow className="border-t-2 font-semibold">
                  <TableCell className="sticky left-0 z-10 bg-background border-r text-sm" style={{ color: "#236130" }}>
                    Total Submitted
                  </TableCell>
                  {weekTotals.map((total, i) => (
                    <TableCell key={i} className="text-center text-sm">
                      <span className={total === sortedTeachers.length ? "text-green-600 font-bold" : total === 0 ? "text-red-500" : "text-yellow-600"}>
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
        <DialogContent className="max-w-md max-h-[80vh]">
          <DialogHeader>
            <DialogTitle style={{ color: "#236130" }}>Download Weekly Summary PDF</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Select the weeks you want to include in the PDF report.</p>

          <div className="flex items-center gap-2 mb-2">
            <Checkbox
              id="select-all"
              checked={selectedWeekIndices.size === weeks.length}
              onCheckedChange={selectAllWeeks}
            />
            <label htmlFor="select-all" className="text-sm font-semibold cursor-pointer">
              Select All ({weeks.length} weeks)
            </label>
          </div>

          <ScrollArea className="h-[300px] border rounded-md p-3">
            <div className="space-y-2">
              {weeks.map((week, i) => (
                <div key={i} className="flex items-center gap-2">
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
            <Button variant="outline" onClick={() => setShowDownloadDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDownloadPDF}
              disabled={selectedWeekIndices.size === 0}
              style={{ backgroundColor: "#236130" }}
              className="text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
