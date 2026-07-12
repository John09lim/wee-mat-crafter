import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addWeeks, startOfWeek, endOfWeek } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, XCircle } from "lucide-react";

interface WeekData {
  weekStart: Date;
  weekEnd: Date;
  submittedCount: number;
  totalCount: number;
  percentage: number;
}

interface WeekDetail {
  submitted: string[];
  notSubmitted: string[];
}

interface WeeklySubmissionCalendarProps {
  schoolName: string;
  managedTeachers: Array<{ teacher_name: string; user_id: string | null }>;
}

const WEEKS_PER_PAGE = 4;
// Official reporting boundary for School Year 2026-2027.
const CALENDAR_START_DATE = new Date(2026, 5, 8);

function getMondayOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getFridayOfWeek(monday: Date) {
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);
  return friday;
}

function isCurrentWeek(monday: Date) {
  return monday.getTime() === getMondayOfWeek(new Date()).getTime();
}

export default function WeeklySubmissionCalendar({
  schoolName,
  managedTeachers,
}: WeeklySubmissionCalendarProps) {
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedWeek, setSelectedWeek] = useState<WeekData | null>(null);
  const [weekDetail, setWeekDetail] = useState<WeekDetail | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentWeekData, setCurrentWeekData] = useState<WeekData | null>(null);

  const fetchWeeklyData = useCallback(async () => {
    const weeksData: WeekData[] = [];
    
    // Dynamically calculate current week based on today's date
    const today = new Date();
    const day = today.getDay();
    // If Saturday (6) or Sunday (0), advance to next week
    const targetDate = day === 6 ? new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000) : 
                       day === 0 ? new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000) : today;
    const currentMonday = getMondayOfWeek(targetDate);
    
    const startMonday = getMondayOfWeek(CALENDAR_START_DATE);

    // Calculate weeks from startDate to 4 weeks into the future from current week
    let currentWeek = new Date(startMonday);
    const futureLimit = addWeeks(currentMonday, 4);
    let currentWeekIndex = -1;
    let thisWeekData: WeekData | null = null;

    while (currentWeek <= futureLimit) {
      const monday = new Date(currentWeek);
      const friday = getFridayOfWeek(monday);

      // Track the index of current week
      const isCurrent = monday.getTime() === currentMonday.getTime();

      // Query submissions for this week
      const { data: submissions } = await supabase
        .from("teacher_submissions")
        .select("user_id")
        .eq("school_name", schoolName)
        .gte("week_start", format(monday, "yyyy-MM-dd"))
        .lte("week_end", format(friday, "yyyy-MM-dd"));

      const submittedUserIds = new Set(submissions?.map((s) => s.user_id) || []);
      const submittedCount = managedTeachers.filter((t) =>
        t.user_id ? submittedUserIds.has(t.user_id) : false
      ).length;

      const totalCount = managedTeachers.length;
      const percentage =
        totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0;

      const weekData = {
        weekStart: monday,
        weekEnd: friday,
        submittedCount,
        totalCount,
        percentage,
      };

      if (isCurrent) {
        thisWeekData = weekData;
        currentWeekIndex = weeksData.length;
      } else {
        weeksData.push(weekData);
      }

      // Move to next week
      currentWeek = addWeeks(currentWeek, 1);
    }

    setWeeks(weeksData);
    setCurrentWeekData(thisWeekData);

    // Set current page to show weeks after current week
    if (currentWeekIndex >= 0) {
      setCurrentPage(Math.floor(currentWeekIndex / WEEKS_PER_PAGE));
    }
  }, [managedTeachers, schoolName]);

  useEffect(() => {
    fetchWeeklyData();

    // Keep an already-open dashboard aligned with the new school week.
    const now = new Date();
    const nextMonday = getMondayOfWeek(now);
    nextMonday.setDate(nextMonday.getDate() + 7);
    nextMonday.setHours(0, 0, 5, 0);
    let weeklyInterval: number | undefined;
    const timeout = window.setTimeout(() => {
      fetchWeeklyData();
      weeklyInterval = window.setInterval(fetchWeeklyData, 7 * 24 * 60 * 60 * 1000);
    }, nextMonday.getTime() - now.getTime());

    return () => {
      window.clearTimeout(timeout);
      if (weeklyInterval) window.clearInterval(weeklyInterval);
    };
  }, [fetchWeeklyData]);

  const handleWeekClick = async (week: WeekData) => {
    setSelectedWeek(week);

    // Fetch detailed submission data for this week
    const { data: submissions } = await supabase
      .from("teacher_submissions")
      .select("user_id")
      .eq("school_name", schoolName)
      .gte("week_start", format(week.weekStart, "yyyy-MM-dd"))
      .lte("week_end", format(week.weekEnd, "yyyy-MM-dd"));

    const submittedUserIds = new Set(submissions?.map((s) => s.user_id) || []);

    const submitted: string[] = [];
    const notSubmitted: string[] = [];

    managedTeachers.forEach((teacher) => {
      if (teacher.user_id && submittedUserIds.has(teacher.user_id)) {
        submitted.push(teacher.teacher_name);
      } else {
        notSubmitted.push(teacher.teacher_name);
      }
    });

    setWeekDetail({ submitted, notSubmitted });
    setDialogOpen(true);
  };

  const getColorClass = (percentage: number) => {
    if (percentage === 100) return "bg-[#E3EFE5] border-[#17613A] text-[#17613A]";
    if (percentage >= 50) return "bg-[#F7ECD1] border-[#D6A73D] text-[#76500A]";
    return "bg-[#F7E3DE] border-[#A83224] text-[#A83224]";
  };

  const displayedWeeks = weeks.slice(
    currentPage * WEEKS_PER_PAGE,
    (currentPage + 1) * WEEKS_PER_PAGE
  );

  return (
    <>
      <Card className="border-[#D8D0C4] bg-[#FFFCF7] shadow-none">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2 text-2xl text-[#173F2A]">
            <Calendar className="h-5 w-5 text-[#236130]" aria-hidden="true" />
            Weekly Submission History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Color Legend */}
          <div className="mb-6 flex flex-wrap items-center justify-start gap-x-6 gap-y-3 text-sm text-[#526159]" aria-label="Submission percentage legend">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border border-[#A83224] bg-[#F7E3DE]"></div>
              <span>0-49% Submitted</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border border-[#D6A73D] bg-[#F7ECD1]"></div>
              <span>50-99% Submitted</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border border-[#17613A] bg-[#E3EFE5]"></div>
              <span>100% Submitted</span>
            </div>
          </div>

          {/* This Week - Prominent Display */}
          {currentWeekData && (
            <div className="mb-6">
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => handleWeekClick(currentWeekData)}
                  className={`min-h-44 w-full max-w-md cursor-pointer rounded-xl border-2 p-6 shadow-sm outline-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#236130] focus-visible:ring-offset-2 ${getColorClass(
                    currentWeekData.percentage
                  )}`}
                  aria-label={`View submission details for this week, ${currentWeekData.percentage} percent complete`}
                >
                  <div className="text-center mb-3">
                    <span className="inline-flex min-h-8 items-center rounded-full bg-[#D6A73D] px-4 py-1.5 text-sm font-bold text-[#173F2A]">
                      THIS WEEK
                    </span>
                  </div>
                  <div className="text-xl font-bold mb-3">
                    {format(currentWeekData.weekStart, "MMMM d")} -{" "}
                    {format(currentWeekData.weekEnd, "MMMM d, yyyy")}
                  </div>
                  <div className="text-4xl font-bold mb-2">
                    {currentWeekData.percentage}%
                  </div>
                  <div className="text-base font-medium">
                    {currentWeekData.submittedCount}/{currentWeekData.totalCount}{" "}
                    teachers submitted
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Other Weeks Grid */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-[#526159]">
              Other Weeks
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {displayedWeeks.map((week, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleWeekClick(week)}
                  className={`min-h-36 cursor-pointer rounded-lg border-2 p-4 outline-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-[#236130] focus-visible:ring-offset-2 ${getColorClass(
                    week.percentage
                  )}`}
                  aria-label={`View week of ${format(week.weekStart, "MMM d")}, ${week.percentage} percent complete`}
                >
                  <div className="text-sm font-medium mb-2">
                    {format(week.weekStart, "MMM d")} - {format(week.weekEnd, "MMM d")}
                  </div>
                  <div className="text-2xl font-bold mb-1">{week.percentage}%</div>
                  <div className="text-xs">
                    {week.submittedCount}/{week.totalCount} teachers
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <Button
              variant="outline"
              className="min-h-11 w-full border-[#CFC6B9] text-[#173F2A] sm:w-auto"
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Week {currentPage * WEEKS_PER_PAGE + 1}-
              {Math.min((currentPage + 1) * WEEKS_PER_PAGE, weeks.length)} of {weeks.length}
            </span>
            <Button
              variant="outline"
              className="min-h-11 w-full border-[#CFC6B9] text-[#173F2A] sm:w-auto"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={(currentPage + 1) * WEEKS_PER_PAGE >= weeks.length}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-2xl overflow-y-auto border-[#D8D0C4] bg-[#FFFCF7] sm:max-h-[85dvh]">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-[#173F2A]">
              {selectedWeek &&
                `Week of ${format(selectedWeek.weekStart, "MMM dd")} - ${format(
                  selectedWeek.weekEnd,
                  "MMM dd, yyyy"
                )}`}
            </DialogTitle>
          </DialogHeader>

          {weekDetail && selectedWeek && (
            <div className="space-y-4">
              <div className="rounded-lg border border-[#D8D0C4] bg-[#F8F3EB] p-4 text-center">
                <div className="font-display text-3xl font-semibold tabular-nums text-[#173F2A]">{selectedWeek.percentage}%</div>
                <div className="text-sm text-[#526159]">
                  {selectedWeek.submittedCount} / {selectedWeek.totalCount} teachers
                  submitted
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Card className="border-[#B9D1BE] bg-[#EAF3EB] shadow-none">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-[#17613A]">
                      <CheckCircle2 className="w-5 h-5" />
                      Submitted ({weekDetail.submitted.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {weekDetail.submitted.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No submissions</p>
                    ) : (
                      <ul className="space-y-2">
                        {weekDetail.submitted.map((teacher, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-[#17613A]" />
                            <span>{teacher}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-[#E0B8AE] bg-[#FAECE8] shadow-none">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-[#A83224]">
                      <XCircle className="w-5 h-5" />
                      Not Submitted ({weekDetail.notSubmitted.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {weekDetail.notSubmitted.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        All teachers submitted!
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {weekDetail.notSubmitted.map((teacher, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm">
                            <XCircle className="h-4 w-4 text-[#A83224]" />
                            <span>{teacher}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
