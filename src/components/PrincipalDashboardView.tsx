import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, UserCircle, ArrowLeft, ExternalLink } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import DocumentViewer from "@/components/DocumentViewer";
import { teacherHasSubmission } from "@/lib/submissionTracking";
import {
  formatReportingWeek,
  getReportingWeekStart,
  normalizeReportingWeekKey,
  parseLocalDateKey,
  toLocalDateKey,
} from "@/lib/reportingWeek";
import {
  belongsToDistrict,
  canonicalSchoolName,
  isSameSchoolName,
} from "@/lib/districtReporting";

interface PrincipalDashboardViewProps {
  schoolName: string;
  districtName: string;
  weekStart: string;
  onClose: () => void;
}

interface SchoolTeacher {
  id: string;
  user_id: string | null;
  teacher_name: string;
  grade_level?: string | null;
  profile_image_url?: string | null;
  school_name?: string | null;
  district_name?: string | null;
}

interface SchoolSubmission {
  id: string;
  user_id: string | null;
  teacher_name: string;
  subject: string;
  grade_level: string;
  section?: string | null;
  status: string;
  file_url: string;
  week_start: string;
  week_end: string;
  created_at: string;
  school_name?: string | null;
  district_name?: string | null;
}

interface SchoolInfo {
  principal_name?: string | null;
  school_name?: string | null;
  district_name?: string | null;
}

export function PrincipalDashboardView({ schoolName, districtName, weekStart, onClose }: PrincipalDashboardViewProps) {
  const [teachers, setTeachers] = useState<SchoolTeacher[]>([]);
  const [submissions, setSubmissions] = useState<SchoolSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [displayMode, setDisplayMode] = useState<'text' | 'image'>('text');

  const fetchSchoolData = useCallback(async () => {
    try {
      // RLS scopes these reads to the supervisor. Matching client-side lets
      // legacy school/district spellings resolve to the same official school.
      const [schoolsResult, teachersResult, submissionsResult] = await Promise.all([
        supabase.from("schools").select("*"),
        supabase.from("school_assignments").select("*"),
        supabase.from("teacher_submissions").select("*").order("created_at", { ascending: false }),
      ]);

      const queryError = schoolsResult.error || teachersResult.error || submissionsResult.error;
      if (queryError) throw queryError;

      const schoolData = ((schoolsResult.data || []) as SchoolInfo[]).find(
        (school) =>
          belongsToDistrict(school, districtName) &&
          isSameSchoolName(school.school_name, schoolName),
      );
      setSchoolInfo(schoolData || null);

      const teachersData = ((teachersResult.data || []) as SchoolTeacher[]).filter(
        (teacher) =>
          belongsToDistrict(teacher, districtName) &&
          isSameSchoolName(teacher.school_name, schoolName),
      );
      const uniqueTeachers = Array.from(
        new Map(
          teachersData.map((teacher) => [
            teacher.user_id || teacher.teacher_name.trim().replace(/\s+/g, " ").toLocaleLowerCase(),
            { ...teacher, school_name: canonicalSchoolName(teacher.school_name) },
          ]),
        ).values(),
      );
      setTeachers(uniqueTeachers);

      // Keep recent submissions available while the selected week controls the
      // submitted/not-submitted roster and completion statistics.
      const submissionsData = ((submissionsResult.data || []) as SchoolSubmission[])
        .filter(
          (submission) =>
            belongsToDistrict(submission, districtName) &&
            isSameSchoolName(submission.school_name, schoolName),
        )
        .map((submission) => ({
          ...submission,
          school_name: canonicalSchoolName(submission.school_name),
        }));
      setSubmissions(submissionsData);

    } catch (error) {
      console.error("Error fetching school data:", error);
    } finally {
      setLoading(false);
    }
  }, [districtName, schoolName]);

  useEffect(() => {
    fetchSchoolData();
  }, [fetchSchoolData]);

  const getInitials = (name: string) => {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const selectedWeekDate = parseLocalDateKey(weekStart) || getReportingWeekStart(new Date());
  const selectedWeekKey = toLocalDateKey(selectedWeekDate);
  const currentWeekKey = toLocalDateKey(getReportingWeekStart(new Date()));
  const selectedWeekSubmissions = submissions.filter(
    (submission) => normalizeReportingWeekKey(submission.week_start) === selectedWeekKey,
  );

  // Calculate submission status for the selected Monday–Friday week.
  const submittedTeachers = teachers.filter((teacher) =>
    teacherHasSubmission(teacher, selectedWeekSubmissions),
  );
  const notSubmittedTeachers = teachers.filter((teacher) =>
    !teacherHasSubmission(teacher, selectedWeekSubmissions),
  );
  const completionRate = teachers.length > 0
    ? Math.round((submittedTeachers.length / teachers.length) * 100)
    : 0;

  // Chart data
  const submissionCompletionData = [
    { name: "Submitted", value: submittedTeachers.length, color: "#17613A" },
    { name: "Not Submitted", value: notSubmittedTeachers.length, color: "#A83224" }
  ];

  const statusChartData = [
    { name: "Reviewed", value: selectedWeekSubmissions.filter(s => s.status === 'reviewed').length, color: "#17613A" },
    { name: "Pending", value: selectedWeekSubmissions.filter(s => s.status === 'pending').length, color: "#D6A73D" },
    { name: "Returned", value: selectedWeekSubmissions.filter(s => s.status === 'returned').length, color: "#A83224" }
  ];

  if (loading) {
    return (
      <div className="animate-pulse space-y-4" role="status" aria-label={`Loading ${schoolName} dashboard`}>
        <div className="h-12 w-56 rounded-lg bg-[#D8D0C4]/70" />
        <div className="h-32 rounded-xl border border-[#D8D0C4] bg-[#FFFCF7]" />
        <div className="h-72 rounded-xl border border-[#D8D0C4] bg-[#FFFCF7]" />
        <span className="sr-only">Loading school dashboard…</span>
      </div>
    );
  }

  return (
    <section className="space-y-6" aria-labelledby="school-detail-heading">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onClose} className="min-h-11 gap-2 border-[#CFC6B9] bg-[#FFFCF7] text-[#173F2A] hover:bg-white">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to district view
        </Button>
      </div>

      {/* School Info Card */}
      <Card className="border-[#D8D0C4] bg-[#FFFCF7] p-5 shadow-[0_8px_24px_rgba(20,32,25,0.05)] sm:p-6">
        <h2 id="school-detail-heading" className="font-display mb-2 text-3xl font-semibold text-[#173F2A]">
          {schoolName}
        </h2>
        <p className="mb-2 text-[#526159]">{districtName}</p>
        <div className="mb-3 inline-flex items-center rounded-full border border-[#D6A73D]/45 bg-[#FFF7DF] px-3 py-1 text-sm font-semibold text-[#76500A]">
          {selectedWeekKey === currentWeekKey ? "This week" : "Selected week"} · {formatReportingWeek(selectedWeekDate)}
        </div>
        {schoolInfo?.principal_name && (
          <p className="text-sm">
            <span className="font-semibold">Principal:</span> {schoolInfo.principal_name}
          </p>
        )}
        <div className="mt-5 grid overflow-hidden rounded-lg border border-[#D8D0C4] sm:grid-cols-2 lg:grid-cols-4">
          <div className="border-b border-[#D8D0C4] p-3 sm:border-b-0 sm:border-r">
            <p className="font-display text-xl font-semibold tabular-nums text-[#173F2A]">{teachers.length}</p><p className="text-sm text-[#526159]">Teachers</p>
          </div>
          <div className="border-b border-[#D8D0C4] p-3 sm:border-b-0 sm:border-r">
            <p className="font-display text-xl font-semibold tabular-nums text-[#17613A]">{submittedTeachers.length}</p><p className="text-sm text-[#526159]">Submitted</p>
          </div>
          <div className="border-b border-[#D8D0C4] p-3 sm:border-b-0 sm:border-r">
            <p className="font-display text-xl font-semibold tabular-nums text-[#A83224]">{notSubmittedTeachers.length}</p><p className="text-sm text-[#526159]">Not submitted</p>
          </div>
          <div className="p-3">
            <p className="font-display text-xl font-semibold tabular-nums text-[#D39F24]">{completionRate}%</p><p className="text-sm text-[#526159]">Completion</p>
          </div>
          {/* Preserve the original metrics while presenting them as one summary strip. */}
          <Badge variant="outline" className="sr-only">
            {teachers.length} Teachers
          </Badge>
          <Badge className="sr-only">
            {submittedTeachers.length} Submitted
          </Badge>
          <Badge variant="destructive" className="sr-only">
            {notSubmittedTeachers.length} Not Submitted
          </Badge>
        </div>
      </Card>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-[#D8D0C4] bg-[#FFFCF7] p-5 shadow-none sm:p-6">
          <h3 className="font-display mb-4 text-xl font-semibold text-[#173F2A]">
            Teacher Completion Rate
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={submissionCompletionData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => percent > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : null}
                outerRadius={70}
                fill="#8884d8"
                dataKey="value"
              >
                {submissionCompletionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="border-[#D8D0C4] bg-[#FFFCF7] p-5 shadow-none sm:p-6">
          <h3 className="font-display mb-4 text-xl font-semibold text-[#173F2A]">
            Submission Status Distribution
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusChartData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => percent > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : null}
                outerRadius={70}
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
      </div>

      {/* This Week's Submissions */}
      <Card className="border-[#D8D0C4] bg-[#FFFCF7] p-5 shadow-none sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-display text-2xl font-semibold text-[#173F2A]">
            {selectedWeekKey === currentWeekKey ? "This Week's" : "Selected Week's"} Teacher Submissions
          </h3>
          <div className="flex gap-2">
            <Button
              variant={displayMode === 'text' ? 'default' : 'outline'}
              className="min-h-11 px-4"
              onClick={() => setDisplayMode('text')}
              style={displayMode === 'text' ? { backgroundColor: "#236130" } : { borderColor: "#236130", color: "#236130" }}
            >
              Text
            </Button>
            <Button
              variant={displayMode === 'image' ? 'default' : 'outline'}
              className="min-h-11 px-4"
              onClick={() => setDisplayMode('image')}
              style={displayMode === 'image' ? { backgroundColor: "#236130" } : { borderColor: "#236130", color: "#236130" }}
            >
              Image
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Submitted Teachers */}
          <div className="rounded-lg border border-[#B9D1BE] bg-[#EAF3EB] p-4">
            <h4 className="mb-3 flex items-center gap-2 font-semibold text-[#17613A]">
              <CheckCircle2 className="h-5 w-5" />
              Submitted ({submittedTeachers.length})
            </h4>
            <div className={displayMode === 'image' ? "flex flex-wrap gap-3" : "space-y-3"}>
              {submittedTeachers.map((teacher) => {
                const submission = selectedWeekSubmissions.find((candidate) =>
                  teacherHasSubmission(teacher, [candidate]),
                );
                return displayMode === 'image' ? (
                  <div key={teacher.id} className="flex flex-col items-center">
                    <div className="w-12 h-14 rounded-lg bg-muted flex items-center justify-center overflow-hidden border-2 border-[#1eba83]">
                      {teacher.profile_image_url ? (
                        <img src={teacher.profile_image_url} alt={teacher.teacher_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold" style={{ color: "#236130" }}>
                          {getInitials(teacher.teacher_name || '')}
                        </span>
                      )}
                    </div>
                    <span className="text-xs mt-1 text-center max-w-[60px] truncate">{teacher.teacher_name?.split(' ')[0]}</span>
                  </div>
                ) : (
                  <div key={teacher.id} className="flex flex-col gap-2 border-b border-[#C9DDCD] pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#1eba83]" />
                      <span className="text-sm font-medium">{teacher.teacher_name}</span>
                      <Badge variant="outline" className="text-xs">{teacher.grade_level}</Badge>
                    </div>
                    {submission && (
                      <div className="flex gap-2">
                        <DocumentViewer fileUrl={submission.file_url} fileName={`${teacher.teacher_name}_submission`} />
                        <Button
                          variant="outline"
                          className="min-h-11 min-w-11 border-[#9FB5A3] text-[#173F2A]"
                          onClick={() => {
                            const encodedUrl = encodeURIComponent(submission.file_url);
                            window.open(`https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`, "_blank");
                          }}
                        >
                          <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
              {submittedTeachers.length === 0 && (
                <p className="text-sm text-muted-foreground">No submissions yet</p>
              )}
            </div>
          </div>

          {/* Not Submitted Teachers */}
          <div className="rounded-lg border border-[#E0B8AE] bg-[#FAECE8] p-4">
            <h4 className="mb-3 flex items-center gap-2 font-semibold text-[#A83224]">
              <XCircle className="h-5 w-5" />
              Not Submitted ({notSubmittedTeachers.length})
            </h4>
            <div className={displayMode === 'image' ? "flex flex-wrap gap-3" : "space-y-2"}>
              {notSubmittedTeachers.map((teacher) => (
                displayMode === 'image' ? (
                  <div key={teacher.id} className="flex flex-col items-center">
                    <div className="w-12 h-14 rounded-lg bg-muted flex items-center justify-center overflow-hidden border-2 border-red-300">
                      {teacher.profile_image_url ? (
                        <img src={teacher.profile_image_url} alt={teacher.teacher_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-red-500">
                          {getInitials(teacher.teacher_name || '')}
                        </span>
                      )}
                    </div>
                    <span className="text-xs mt-1 text-center max-w-[60px] truncate">{teacher.teacher_name?.split(' ')[0]}</span>
                  </div>
                ) : (
                  <div key={teacher.id} className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium">{teacher.teacher_name}</span>
                    <Badge variant="outline" className="text-xs">{teacher.grade_level}</Badge>
                  </div>
                )
              ))}
              {notSubmittedTeachers.length === 0 && (
                <p className="text-sm text-muted-foreground">All teachers have submitted!</p>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Recent Submissions Table */}
      <Card className="border-[#D8D0C4] bg-[#FFFCF7] p-5 shadow-none sm:p-6">
        <h3 className="font-display mb-4 text-2xl font-semibold text-[#173F2A]">
          Recent Submissions
        </h3>
        <div className="space-y-3">
          {submissions.slice(0, 10).map((sub) => (
            <div key={sub.id} className="flex flex-col gap-3 border-b border-[#E4DDD2] py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{sub.teacher_name}</p>
                <p className="text-sm text-muted-foreground">
                  {sub.subject} • {sub.grade_level} • Section {sub.section}
                </p>
                <p className="mt-1 text-xs text-[#526159]">
                  Week of {formatReportingWeek(parseLocalDateKey(normalizeReportingWeekKey(sub.week_start)) || selectedWeekDate)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Badge 
                  variant={sub.status === 'reviewed' ? 'default' : sub.status === 'returned' ? 'destructive' : 'secondary'}
                  className={sub.status === 'reviewed' ? 'bg-[#E3EFE5] text-[#17613A]' : sub.status === 'returned' ? 'bg-[#F7E3DE] text-[#A83224]' : 'bg-[#F7ECD1] text-[#76500A]'}
                >
                  {sub.status}
                </Badge>
                <DocumentViewer fileUrl={sub.file_url} fileName={`${sub.teacher_name}_${sub.subject}`} />
                <Button
                  variant="outline"
                  className="min-h-11 min-w-11 border-[#CFC6B9] text-[#173F2A]"
                  onClick={() => {
                    const encodedUrl = encodeURIComponent(sub.file_url);
                    window.open(`https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`, "_blank");
                  }}
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))}
          {submissions.length === 0 && (
            <p className="text-center text-muted-foreground py-4">No recent submissions found for this school.</p>
          )}
        </div>
      </Card>
    </section>
  );
}
