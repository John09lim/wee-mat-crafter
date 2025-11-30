import { useState, useEffect } from "react";
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

export default function WeeklySubmissionCalendar({
  schoolName,
  managedTeachers,
}: WeeklySubmissionCalendarProps) {
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedWeek, setSelectedWeek] = useState<WeekData | null>(null);
  const [weekDetail, setWeekDetail] = useState<WeekDetail | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const weeksPerPage = 4;

  // Helper to get Monday of the week
  const getMondayOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Handle Sunday as -6, else 1 - day
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Helper to get Friday of the week
  const getFridayOfWeek = (monday: Date) => {
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    friday.setHours(23, 59, 59, 999);
    return friday;
  };

  useEffect(() => {
    fetchWeeklyData();
  }, [schoolName, managedTeachers]);

  const fetchWeeklyData = async () => {
    const weeksData: WeekData[] = [];
    const today = new Date();

    // Fetch last 12 weeks of data
    for (let i = 0; i < 12; i++) {
      const weekDate = addWeeks(today, -i);
      const monday = getMondayOfWeek(weekDate);
      const friday = getFridayOfWeek(monday);

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

      weeksData.push({
        weekStart: monday,
        weekEnd: friday,
        submittedCount,
        totalCount,
        percentage,
      });
    }

    setWeeks(weeksData.reverse()); // Show oldest to newest
  };

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
    if (percentage >= 80) return "bg-green-500/20 border-green-500 text-green-700";
    if (percentage >= 50) return "bg-yellow-500/20 border-yellow-500 text-yellow-700";
    return "bg-red-500/20 border-red-500 text-red-700";
  };

  const displayedWeeks = weeks.slice(
    currentPage * weeksPerPage,
    (currentPage + 1) * weeksPerPage
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Weekly Submission History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {displayedWeeks.map((week, idx) => (
              <button
                key={idx}
                onClick={() => handleWeekClick(week)}
                className={`p-4 rounded-lg border-2 transition-all hover:scale-105 cursor-pointer ${getColorClass(
                  week.percentage
                )}`}
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

          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Earlier
            </Button>
            <span className="text-sm text-muted-foreground">
              Showing weeks {currentPage * weeksPerPage + 1}-
              {Math.min((currentPage + 1) * weeksPerPage, weeks.length)} of {weeks.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={(currentPage + 1) * weeksPerPage >= weeks.length}
            >
              Later
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedWeek &&
                `Week of ${format(selectedWeek.weekStart, "MMM dd")} - ${format(
                  selectedWeek.weekEnd,
                  "MMM dd, yyyy"
                )}`}
            </DialogTitle>
          </DialogHeader>

          {weekDetail && selectedWeek && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{selectedWeek.percentage}%</div>
                <div className="text-sm text-muted-foreground">
                  {selectedWeek.submittedCount} / {selectedWeek.totalCount} teachers
                  submitted
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Card className="border-green-500/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-[#1eba83]">
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
                            <CheckCircle2 className="w-4 h-4 text-[#1eba83]" />
                            <span>{teacher}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-red-500/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-500">
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
                            <XCircle className="w-4 h-4 text-red-500" />
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
