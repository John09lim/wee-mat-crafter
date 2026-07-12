import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  XCircle,
  School,
  User,
  BookOpen,
  Calendar,
  Users,
  CheckCircle,
  ExternalLink,
  Download,
  ChevronLeft,
  ChevronRight,
  Mail,
  MapPin,
} from "lucide-react";
import { format, addWeeks } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface TeacherStatus {
  teacher_name: string;
  submitted: boolean;
  user_id: string | null;
  grade_level?: string;
  section?: string;
  profile_image_url?: string;
}

interface Submission {
  id: string;
  user_id: string;
  teacher_name: string;
  subject: string;
  grade_level: string;
  section: string;
  status: string;
  file_url: string;
  file_type: string;
  week_start: string;
  week_end: string;
  created_at: string;
  principal_notes?: string;
}

interface WeekData {
  weekStart: string;
  weekEnd: string;
  submittedCount: number;
  totalTeachers: number;
  percentage: number;
}

interface SchoolInfo {
  school_name: string;
  district_name: string | null;
  principal_name: string | null;
  principal_email?: string | null;
  principal_profile_image_url?: string | null;
}

interface Stats {
  total: number;
  pending: number;
  reviewed: number;
  returned: number;
}

// Helper function to get dynamic current week
const getDynamicCurrentWeek = () => {
  const today = new Date();
  const day = today.getDay();
  // If Saturday (6) or Sunday (0), advance to next week
  const targetDate = day === 6 ? new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000) : 
                     day === 0 ? new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000) : today;
  const monday = new Date(targetDate);
  const mondayDay = monday.getDay();
  const diff = mondayDay === 0 ? -6 : 1 - mondayDay;
  monday.setDate(monday.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);
  
  return {
    monday,
    friday,
    weekStart: format(monday, "yyyy-MM-dd"),
    weekEnd: format(friday, "yyyy-MM-dd"),
    displayText: `${format(monday, "MMM d")}-${format(friday, "d, yyyy")}`
  };
};

export default function PublicSchoolStatus() {
  const { schoolName } = useParams<{ schoolName: string }>();
  const [searchParams] = useSearchParams();
  const filterParam = searchParams.get("filter") || "all";

  const [teachers, setTeachers] = useState<TeacherStatus[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [pastWeeks, setPastWeeks] = useState<WeekData[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, reviewed: 0, returned: 0 });
  const [displayMode, setDisplayMode] = useState<"text" | "image">("text");
  const [activeTab, setActiveTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState(filterParam);
  
  // Calendar state
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedWeek, setSelectedWeek] = useState<WeekData | null>(null);
  const [weekDetail, setWeekDetail] = useState<{ submitted: string[]; notSubmitted: string[] } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const weeksPerPage = 4;

  // Dynamic current week
  const currentWeek = useMemo(() => getDynamicCurrentWeek(), []);

  useEffect(() => {
    const fetchSchoolStatus = async () => {
      if (!schoolName) return;

      try {
        const decodedSchoolName = decodeURIComponent(schoolName);

        const response = await fetch(
          `https://velpueasbsrptocrjljg.supabase.co/functions/v1/get-school-status?school=${encodeURIComponent(
            decodedSchoolName
          )}&weekStart=${currentWeek.weekStart}&weekEnd=${currentWeek.weekEnd}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch school status");
        }

        const result = await response.json();

        if (result.school) {
          setSchoolInfo(result.school);
        }

        if (result.teachers) {
          setTeachers(result.teachers);
        }

        if (result.submissions) {
          setSubmissions(result.submissions);
        }

        if (result.pastWeeks) {
          setPastWeeks(result.pastWeeks);
        }

        if (result.stats) {
          setStats(result.stats);
        }
      } catch (error) {
        console.error("Error fetching school status:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchoolStatus();
  }, [currentWeek.weekEnd, currentWeek.weekStart, schoolName]);

  const submittedTeachers = teachers.filter((t) => t.submitted);
  const notSubmittedTeachers = teachers.filter((t) => !t.submitted);

  const getInitials = (name: string) => {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Filter submissions based on status
  const filteredSubmissions = statusFilter === "all" 
    ? submissions 
    : submissions.filter(s => s.status === statusFilter);

  // Group submissions
  const groupedByTeacher = filteredSubmissions.reduce((acc, sub) => {
    if (!acc[sub.teacher_name]) acc[sub.teacher_name] = [];
    acc[sub.teacher_name].push(sub);
    return acc;
  }, {} as Record<string, Submission[]>);

  const groupedBySubject = filteredSubmissions.reduce((acc, sub) => {
    if (!acc[sub.subject]) acc[sub.subject] = [];
    acc[sub.subject].push(sub);
    return acc;
  }, {} as Record<string, Submission[]>);

  // Group submissions by week
  const groupedByWeek = filteredSubmissions.reduce((acc, sub) => {
    const weekKey = `${sub.week_start}_${sub.week_end}`;
    if (!acc[weekKey]) {
      acc[weekKey] = {
        weekStart: sub.week_start,
        weekEnd: sub.week_end,
        submissions: []
      };
    }
    acc[weekKey].submissions.push(sub);
    return acc;
  }, {} as Record<string, { weekStart: string; weekEnd: string; submissions: Submission[] }>);

  // Sort weeks descending (latest first) and filter from Aug 11, 2025
  const sortedWeeks = Object.values(groupedByWeek)
    .filter(week => new Date(week.weekStart) >= new Date(2025, 7, 11)) // August 11, 2025
    .sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime());

  // Chart data
  const statusChartData = [
    { name: "Reviewed", value: stats.reviewed, color: "#17613A" },
    { name: "Pending", value: stats.pending, color: "#D6A73D" },
    { name: "Returned", value: stats.returned, color: "#A83224" },
  ];

  const submissionCompletionData = [
    { name: "Submitted", value: submittedTeachers.length, color: "#17613A" },
    { name: "Not Submitted", value: notSubmittedTeachers.length, color: "#A83224" },
  ];

  // Weekly calendar helpers - filter from August 11, 2025
  const filteredPastWeeks = pastWeeks.filter(w => new Date(w.weekStart) >= new Date(2025, 7, 11));
  
  const currentWeekData = filteredPastWeeks.find(
    (w) => w.weekStart === currentWeek.weekStart
  );

  const otherWeeks = filteredPastWeeks.filter((w) => w.weekStart !== currentWeek.weekStart);

  const displayedWeeks = otherWeeks.slice(
    currentPage * weeksPerPage,
    (currentPage + 1) * weeksPerPage
  );

  const getColorClass = (percentage: number) => {
    if (percentage === 100) return "bg-[#E3EFE5] border-[#17613A] text-[#17613A]";
    if (percentage >= 50) return "bg-[#F7ECD1] border-[#D6A73D] text-[#76500A]";
    return "bg-[#F7E3DE] border-[#A83224] text-[#A83224]";
  };

  const handleWeekClick = (week: WeekData) => {
    setSelectedWeek(week);

    // Calculate submitted/not submitted for this week
    const weekSubmissions = submissions.filter(
      (s) => s.week_start >= week.weekStart && s.week_end <= week.weekEnd
    );
    const submittedUserIds = new Set(weekSubmissions.map((s) => s.user_id));

    const submitted: string[] = [];
    const notSubmitted: string[] = [];

    teachers.forEach((teacher) => {
      if (teacher.user_id && submittedUserIds.has(teacher.user_id)) {
        submitted.push(teacher.teacher_name);
      } else {
        notSubmitted.push(teacher.teacher_name);
      }
    });

    setWeekDetail({ submitted, notSubmitted });
    setDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "reviewed":
        return <Badge className="bg-[#E3EFE5] text-[#17613A] hover:bg-[#E3EFE5]">Reviewed</Badge>;
      case "pending":
        return <Badge className="bg-[#F7ECD1] text-[#76500A] hover:bg-[#F7ECD1]">For review</Badge>;
      case "returned":
        return <Badge className="bg-[#F7E3DE] text-[#A83224] hover:bg-[#F7E3DE]">Needs revision</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <main className="min-h-[calc(100dvh-4rem)] bg-[#F6F0E7]" aria-busy="true">
        <div className="container max-w-7xl py-10">
          <div className="animate-pulse space-y-6" role="status" aria-label="Loading public school status">
            <div className="h-12 w-80 rounded-lg bg-[#D8D0C4]/70" />
            <div className="h-24 rounded-xl border border-[#D8D0C4] bg-[#FFFCF7]" />
            <div className="h-80 rounded-xl border border-[#D8D0C4] bg-[#FFFCF7]" />
            <span className="sr-only">Loading school status…</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main id="public-school-status-main" className="min-h-[calc(100dvh-4rem)] bg-[#F6F0E7] text-[#142019]">
      <div className="container mx-auto flex max-w-7xl flex-col px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <header className="order-1 mb-7 border-b border-[#D8D0C4] pb-7">
          <p className="mb-2 text-sm font-semibold text-[#526159]">Public school status · Read-only view</p>
          <h1 className="font-display text-4xl font-semibold tracking-[-0.035em] text-[#173F2A] sm:text-5xl">{schoolInfo?.school_name || decodeURIComponent(schoolName || "School status")}</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#526159]">Follow weekly WeeLMat submission progress and view the learning matrices shared by the school.</p>
        </header>
        {/* Account Information Card */}
        <Card className="order-6 mb-6 border-[#D8D0C4] bg-[#FFFCF7] p-5 shadow-none sm:p-6">
          <h2 className="font-display mb-4 text-xl font-semibold text-[#173F2A]">
            School contact
          </h2>
          <div className="flex items-start gap-6">
            <div className="w-24 h-28 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-border">
              {schoolInfo?.principal_profile_image_url ? (
                <img
                  src={schoolInfo.principal_profile_image_url}
                  alt={schoolInfo.principal_name || "Principal"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="h-12 w-12" style={{ color: "#236130" }} />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-display mb-3 text-xl font-semibold text-[#173F2A]">
                {schoolInfo?.principal_name || "School Head"}
              </h3>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{schoolInfo?.principal_email || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <School className="h-4 w-4 text-muted-foreground" />
                  <span>{schoolInfo?.school_name || decodeURIComponent(schoolName || "")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{schoolInfo?.district_name || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{teachers.length} Teachers</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Manage Teachers Section (Read-Only) */}
        <Card className="order-7 mb-6 border-[#D8D0C4] bg-[#FFFCF7] p-5 shadow-none sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5" style={{ color: "#236130" }} />
            <h2 className="font-display text-xl font-semibold text-[#173F2A]">
              Teachers ({teachers.length})
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {teachers.map((teacher, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center gap-2 p-3 rounded-lg border bg-card"
              >
                {teacher.profile_image_url ? (
                  <div className="w-16 h-20 rounded-lg overflow-hidden border-2 border-border">
                    <img
                      src={teacher.profile_image_url}
                      alt={teacher.teacher_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className="w-16 h-20 rounded-lg flex items-center justify-center text-white font-bold text-lg border-2 border-border"
                    style={{ backgroundColor: "#236130" }}
                  >
                    {getInitials(teacher.teacher_name)}
                  </div>
                )}
                <div className="text-center">
                  <p className="text-sm font-medium truncate max-w-[100px]" title={teacher.teacher_name}>
                    {teacher.teacher_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {teacher.grade_level || "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {teacher.section || "N/A"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* This Week's Teacher Submissions */}
        <Card className="order-3 mb-7 border-[#D8D0C4] bg-[#FFFCF7] p-5 shadow-[0_8px_24px_rgba(20,32,25,0.05)] sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="font-display text-2xl font-semibold text-[#173F2A]">
              This Week's Teacher Submissions ({currentWeek.displayText})
            </h2>
            <div className="flex items-center gap-1 border rounded-md p-1">
              <Button
                variant={displayMode === "text" ? "default" : "ghost"}
                size="sm"
                onClick={() => setDisplayMode("text")}
                className="min-h-11 px-4 text-sm"
              >
                Text
              </Button>
              <Button
                variant={displayMode === "image" ? "default" : "ghost"}
                size="sm"
                onClick={() => setDisplayMode("image")}
                className="min-h-11 px-4 text-sm"
              >
                Image
              </Button>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold">
                  Submitted ({submittedTeachers.length})
                </h4>
              </div>
              <div className="space-y-2">
                {submittedTeachers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No submissions yet
                  </p>
                ) : displayMode === "text" ? (
                  submittedTeachers.map((teacher, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-sm p-2 bg-green-50 rounded"
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="truncate">{teacher.teacher_name}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {submittedTeachers.map((teacher, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col items-center gap-1"
                        title={teacher.teacher_name}
                      >
                        {teacher.profile_image_url ? (
                          <div className="w-12 h-14 rounded-lg overflow-hidden border-2 border-green-600">
                            <img
                              src={teacher.profile_image_url}
                              alt={teacher.teacher_name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div
                            className="w-12 h-14 rounded-lg flex items-center justify-center text-white font-bold text-sm border-2 border-green-600"
                            style={{ backgroundColor: "#1eba83" }}
                          >
                            {getInitials(teacher.teacher_name)}
                          </div>
                        )}
                        <span className="text-xs truncate max-w-[48px]">
                          {teacher.teacher_name?.split(" ")[0]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="h-5 w-5 text-red-600" />
                <h4 className="font-semibold">
                  Not Yet Submitted ({notSubmittedTeachers.length})
                </h4>
              </div>
              <div className="space-y-2">
                {notSubmittedTeachers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    All teachers have submitted!
                  </p>
                ) : displayMode === "text" ? (
                  notSubmittedTeachers.map((teacher, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-sm p-2 bg-red-50 rounded"
                    >
                      <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                      <span className="truncate">{teacher.teacher_name}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {notSubmittedTeachers.map((teacher, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col items-center gap-1"
                        title={teacher.teacher_name}
                      >
                        {teacher.profile_image_url ? (
                          <div className="w-12 h-14 rounded-lg overflow-hidden border-2 border-red-600">
                            <img
                              src={teacher.profile_image_url}
                              alt={teacher.teacher_name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div
                            className="w-12 h-14 rounded-lg flex items-center justify-center text-white font-bold text-sm border-2 border-red-600"
                            style={{ backgroundColor: "#ef4444" }}
                          >
                            {getInitials(teacher.teacher_name)}
                          </div>
                        )}
                        <span className="text-xs truncate max-w-[48px]">
                          {teacher.teacher_name?.split(" ")[0]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            <strong>Completion Rate:</strong>{" "}
            {teachers.length > 0
              ? Math.round((submittedTeachers.length / teachers.length) * 100)
              : 0}
            %
          </div>
        </Card>

        {/* Weekly Submission History Calendar */}
        <Card className="order-8 mb-6 border-[#D8D0C4] bg-[#FFFCF7] shadow-none">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2 text-2xl text-[#173F2A]">
              <Calendar className="w-5 h-5" />
              Weekly Submission History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Color Legend */}
            <div className="flex items-center justify-center gap-6 mb-6 text-sm flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500"></div>
                <span>0-49% Submitted</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-500"></div>
                <span>50-99% Submitted</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500"></div>
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
                  >
                    <div className="text-center mb-3">
                      <span className="inline-flex min-h-8 items-center rounded-full bg-[#D6A73D] px-4 py-1.5 text-sm font-bold text-[#173F2A]">
                        THIS WEEK
                      </span>
                    </div>
                    <div className="text-xl font-bold mb-3">
                      {format(new Date(currentWeekData.weekStart), "MMMM d")} - {format(new Date(currentWeekData.weekEnd), "MMMM d, yyyy")}
                    </div>
                    <div className="text-4xl font-bold mb-2">
                      {currentWeekData.percentage}%
                    </div>
                    <div className="text-base font-medium">
                      {currentWeekData.submittedCount}/{currentWeekData.totalTeachers}{" "}
                      teachers submitted
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Other Weeks Grid */}
            {otherWeeks.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground text-center">
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
                    >
                      <div className="text-sm font-medium mb-2">
                        {format(new Date(week.weekStart), "MMM d")} -{" "}
                        {format(new Date(week.weekEnd), "MMM d")}
                      </div>
                      <div className="text-2xl font-bold mb-1">
                        {week.percentage}%
                      </div>
                      <div className="text-xs">
                        {week.submittedCount}/{week.totalTeachers} teachers
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex justify-between items-center mt-4">
                  <Button
                    variant="outline"
                    className="min-h-11 border-[#CFC6B9] text-[#173F2A]"
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Week {currentPage * weeksPerPage + 1}-
                    {Math.min((currentPage + 1) * weeksPerPage, otherWeeks.length)}{" "}
                    of {otherWeeks.length}
                  </span>
                  <Button
                    variant="outline"
                    className="min-h-11 border-[#CFC6B9] text-[#173F2A]"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={(currentPage + 1) * weeksPerPage >= otherWeeks.length}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts Section */}
        <section className="order-9 mb-6 grid gap-6 md:grid-cols-2" aria-label="Submission charts">
          <Card className="border-[#D8D0C4] bg-[#FFFCF7] p-5 shadow-none sm:p-6">
            <h2 className="font-display mb-4 text-xl font-semibold text-[#173F2A]">
              Submission Status Distribution
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="40%"
                  labelLine={false}
                  label={({ name, percent, cx, cy, midAngle, outerRadius, index }) => {
                    if (percent === 0) return null;
                    const RADIAN = Math.PI / 180;
                    const radius = outerRadius * 1.4;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    return (
                      <text
                        x={x}
                        y={y}
                        fill={statusChartData[index].color}
                        textAnchor={x > cx ? "start" : "end"}
                        dominantBaseline="central"
                        fontSize={12}
                      >
                        {`${name}: ${(percent * 100).toFixed(0)}%`}
                      </text>
                    );
                  }}
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card className="border-[#D8D0C4] bg-[#FFFCF7] p-5 shadow-none sm:p-6">
            <h2 className="font-display mb-4 text-xl font-semibold text-[#173F2A]">
              Teacher Completion Rate
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={submissionCompletionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {submissionCompletionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </section>

        {/* Stats Cards */}
        <section className="order-2 mb-7 grid overflow-hidden rounded-xl border border-[#D8D0C4] bg-[#FFFCF7] shadow-[0_8px_26px_rgba(20,32,25,0.05)] sm:grid-cols-2 lg:grid-cols-4" aria-label="School submission summary">
          <div className="border-b border-[#D8D0C4] p-4 sm:border-r lg:border-b-0 sm:p-5">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8" style={{ color: "#236130" }} />
              <div>
                <p className="font-display text-2xl font-semibold tabular-nums text-[#173F2A]">{stats.total}</p>
                <p className="text-sm text-[#526159]">Total submissions</p>
              </div>
            </div>
          </div>
          <div className="border-b border-[#D8D0C4] p-4 lg:border-b-0 lg:border-r sm:p-5">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="font-display text-2xl font-semibold tabular-nums text-[#173F2A]">{stats.pending}</p>
                <p className="text-sm text-[#526159]">Pending review</p>
              </div>
            </div>
          </div>
          <div className="border-b border-[#D8D0C4] p-4 sm:border-b-0 sm:border-r sm:p-5">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-display text-2xl font-semibold tabular-nums text-[#173F2A]">{stats.reviewed}</p>
                <p className="text-sm text-[#526159]">Reviewed</p>
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="font-display text-2xl font-semibold tabular-nums text-[#173F2A]">{teachers.length}</p>
                <p className="text-sm text-[#526159]">Teachers</p>
              </div>
            </div>
          </div>
        </section>

        {/* Status Filter */}
        <Card className="order-4 mb-4 border-[#D8D0C4] bg-[#FFFCF7] p-4 shadow-none">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label htmlFor="public-status-filter" className="font-semibold text-sm text-[#173F2A]">Filter by status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="public-status-filter" className="min-h-11 w-full border-[#CFC6B9] bg-white sm:w-48" aria-label="Filter submissions by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              Showing {filteredSubmissions.length} submissions
            </span>
          </div>
        </Card>

        {/* Tabbed Submissions View */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="order-5 mb-6">
          <div className="overflow-x-auto pb-1">
            <TabsList className="h-auto min-w-max border border-[#D8D0C4] bg-[#EEE8DE] p-1">
              <TabsTrigger className="min-h-11 px-4 data-[state=active]:bg-[#173F2A] data-[state=active]:text-white" value="all">All submissions</TabsTrigger>
              <TabsTrigger className="min-h-11 px-4 data-[state=active]:bg-[#173F2A] data-[state=active]:text-white" value="by-teacher">By teacher</TabsTrigger>
              <TabsTrigger className="min-h-11 px-4 data-[state=active]:bg-[#173F2A] data-[state=active]:text-white" value="by-subject">By learning area</TabsTrigger>
              <TabsTrigger className="min-h-11 px-4 data-[state=active]:bg-[#173F2A] data-[state=active]:text-white" value="by-week">By week</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="mt-3 overflow-hidden rounded-xl border border-[#D8D0C4] bg-[#FFFCF7] shadow-[0_8px_24px_rgba(20,32,25,0.05)]">
            {filteredSubmissions.length === 0 ? (
              <PublicEmptyState message="No submissions match this status filter." />
            ) : (
              filteredSubmissions.map((sub) => (
                <SubmissionCard key={sub.id} submission={sub} getStatusBadge={getStatusBadge} />
              ))
            )}
          </TabsContent>

          <TabsContent value="by-teacher" className="space-y-6">
            {Object.entries(groupedByTeacher).map(
              ([teacher, subs]: [string, Submission[]]) => (
                <div key={teacher}>
                  <h3 className="font-display mb-3 text-xl font-semibold text-[#173F2A]">
                    {teacher} ({subs.length} submissions)
                  </h3>
                  <div className="overflow-hidden rounded-xl border border-[#D8D0C4] bg-[#FFFCF7]">
                    {subs.map((sub) => (
                      <SubmissionCard key={sub.id} submission={sub} getStatusBadge={getStatusBadge} />
                    ))}
                  </div>
                </div>
              )
            )}
          </TabsContent>

          <TabsContent value="by-subject" className="space-y-6">
            {Object.entries(groupedBySubject).map(
              ([subject, subs]: [string, Submission[]]) => (
                <div key={subject}>
                  <h3 className="font-display mb-3 text-xl font-semibold text-[#173F2A]">
                    {subject} ({subs.length} submissions)
                  </h3>
                  <div className="overflow-hidden rounded-xl border border-[#D8D0C4] bg-[#FFFCF7]">
                    {subs.map((sub) => (
                      <SubmissionCard key={sub.id} submission={sub} getStatusBadge={getStatusBadge} />
                    ))}
                  </div>
                </div>
              )
            )}
          </TabsContent>

          <TabsContent value="by-week" className="space-y-6">
            {sortedWeeks.length === 0 ? (
              <PublicEmptyState message="No weekly submissions are available yet." />
            ) : (
              sortedWeeks.map(({ weekStart, weekEnd, submissions: weekSubs }) => (
                <div key={`${weekStart}_${weekEnd}`}>
                  <h3 className="font-display mb-3 text-xl font-semibold text-[#173F2A]">
                    Week of {format(new Date(weekStart), "MMM d")} - {format(new Date(weekEnd), "MMM d, yyyy")} ({weekSubs.length} submissions)
                  </h3>
                  <div className="overflow-hidden rounded-xl border border-[#D8D0C4] bg-[#FFFCF7]">
                    {weekSubs.map((sub) => (
                      <SubmissionCard key={sub.id} submission={sub} getStatusBadge={getStatusBadge} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Read-only notice */}
        <div className="order-10 mb-4 mt-8 text-center text-xs text-[#526159]">
          <p>This is a read-only view of the school's dashboard.</p>
        </div>
      </div>

      {/* Week Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-2xl overflow-y-auto border-[#D8D0C4] bg-[#FFFCF7] sm:max-h-[85dvh]">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-[#173F2A]">
              {selectedWeek &&
                `Week of ${format(
                  new Date(selectedWeek.weekStart),
                  "MMM dd"
                )} - ${format(new Date(selectedWeek.weekEnd), "MMM dd, yyyy")}`}
            </DialogTitle>
          </DialogHeader>

          {weekDetail && selectedWeek && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">
                  {selectedWeek.percentage}%
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedWeek.submittedCount} / {selectedWeek.totalTeachers}{" "}
                  teachers submitted
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
                      <p className="text-sm text-muted-foreground">
                        No submissions
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {weekDetail.submitted.map((teacher, idx) => (
                          <li
                            key={idx}
                            className="flex items-center gap-2 text-sm"
                          >
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
                          <li
                            key={idx}
                            className="flex items-center gap-2 text-sm"
                          >
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

    </main>
  );
}

function PublicEmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E8EFE8] text-[#236130]">
        <BookOpen className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="font-display mt-4 text-xl font-semibold text-[#173F2A]">Nothing to show yet</p>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#526159]">{message}</p>
    </div>
  );
}

function SubmissionCard({
  submission,
  getStatusBadge,
}: {
  submission: Submission;
  getStatusBadge: (status: string) => JSX.Element;
}) {
  return (
    <article className="border-b border-[#E4DDD2] bg-[#FFFCF7] p-4 transition-colors last:border-b-0 hover:bg-white sm:p-5">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-[#142019] sm:text-lg">{submission.teacher_name}</h3>
            {getStatusBadge(submission.status)}
          </div>
          <p className="text-sm font-semibold text-[#35443B]">
            {submission.subject} · {submission.grade_level} ({submission.section})
          </p>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs leading-5 text-[#526159]">
            <span className="tabular-nums">Week: {new Date(submission.week_start).toLocaleDateString()} – {new Date(submission.week_end).toLocaleDateString()}</span>
            <span className="tabular-nums">Submitted: {new Date(submission.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            className="min-h-11 bg-[#236130] text-white hover:bg-[#173F2A]"
            asChild
          >
            <a
              href={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
                submission.file_url
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View ${submission.teacher_name}'s submission`}
            >
              <ExternalLink className="mr-1.5 h-4 w-4" aria-hidden="true" />
              View
            </a>
          </Button>
          <Button variant="outline" className="min-h-11 min-w-11 border-[#CFC6B9] text-[#173F2A]" asChild>
            <a
              href={submission.file_url}
              target="_blank"
              rel="noopener noreferrer"
              download
              aria-label={`Download ${submission.teacher_name}'s submission`}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
        </div>
      </div>
    </article>
  );
}
