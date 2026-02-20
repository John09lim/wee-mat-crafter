import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface WeeklySubmissionSummaryProps {
  managedTeachers: any[];
  submissions: any[];
}

export function WeeklySubmissionSummary({ managedTeachers, submissions }: WeeklySubmissionSummaryProps) {
  // Generate all weeks from Aug 11, 2025 to current week
  const weeks = useMemo(() => {
    const startDate = new Date(2025, 7, 11); // Aug 11, 2025
    const today = new Date();
    
    const padZero = (n: number) => n.toString().padStart(2, '0');
    const toLocalDateStr = (d: Date) => `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`;
    
    // Calculate current Monday (advance to next week if Sat/Sun)
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

  // Build a lookup: teacher_name or user_id -> Set of week_start dates they submitted
  const submissionLookup = useMemo(() => {
    const lookup = new Map<string, Set<string>>();
    for (const sub of submissions) {
      const key = sub.user_id || sub.teacher_name;
      if (!lookup.has(key)) lookup.set(key, new Set());
      // Normalize week_start: take only the YYYY-MM-DD part
      const weekStart = typeof sub.week_start === 'string' ? sub.week_start.substring(0, 10) : sub.week_start;
      lookup.get(key)!.add(weekStart);
    }
    return lookup;
  }, [submissions]);

  // Calculate totals per week
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

  // Sort teachers by grade level hierarchy
  const sortedTeachers = useMemo(() => {
    const gradeOrder = (grade: string | null): number => {
      if (!grade) return 999;
      const g = grade.toLowerCase().trim();
      if (g === 'kinder') return 1;
      if (g === 'sped') return 2;
      // Elementary grades 1-6
      const elemMatch = g.match(/^grade\s+(\d+)$/i);
      if (elemMatch) {
        const num = parseInt(elemMatch[1]);
        if (num >= 1 && num <= 6) return 10 + num; // 11-16
        if (num >= 7 && num <= 12) return 30 + num; // 37-42
      }
      // Subject Teacher - check if elementary or HS by looking at section/other clues
      if (g === 'subject teacher') return 20; // between elem and HS
      return 50;
    };
    return [...managedTeachers].sort((a, b) => gradeOrder(a.grade_level) - gradeOrder(b.grade_level));
  }, [managedTeachers]);

  if (sortedTeachers.length === 0) return null;

  return (
    <Card className="p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4" style={{ color: "#236130" }}>
        Weekly Submission Summary
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {sortedTeachers.length} teachers • {weeks.length} weeks (starting Aug 11, 2025)
      </p>
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
              {/* Totals row */}
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
  );
}
