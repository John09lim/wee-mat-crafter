import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { School, Users, CheckCircle, TrendingUp, UserCircle, ExternalLink, Upload, ArrowRight, Pencil, Save, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import DocumentViewer from "@/components/DocumentViewer";

import { SchoolManagement } from "@/components/SchoolManagement";
import { PrincipalDashboardView } from "@/components/PrincipalDashboardView";
import {
  BACONG_DISTRICT_NAME,
  BACONG_DISTRICT_SCHOOLS,
  belongsToDistrict,
  canonicalDistrictName,
  canonicalSchoolName,
  classifySchoolLevel,
  isBacongDistrict,
  isOfficialBacongSchool,
  isSameSchoolName,
  schoolIdentityKey,
} from "@/lib/districtReporting";
import { teacherHasSubmission } from "@/lib/submissionTracking";
import { collapseTeacherAssignments } from "@/lib/teacherClassification";
import { isMissingSchoolIdentityValue } from "@/lib/schoolIdentity";

interface WeeklyReport {
  id: string;
  school_name: string;
  week_start: string;
  week_end: string;
  created_at: string;
  status: string;
  submitted_teachers: number;
  total_teachers: number;
  district_name?: string | null;
}

interface SchoolAssignment {
  id?: string | null;
  user_id: string | null;
  school_name: string;
  teacher_name?: string | null;
  teacher_email?: string | null;
  grade_level?: string | null;
  section?: string | null;
  profile_image_url?: string | null;
  district_name?: string | null;
}

interface ManagedSchool {
  id: string;
  school_name: string;
  principal_name?: string | null;
  district_name?: string | null;
}

interface TeacherSubmission {
  id: string;
  user_id: string | null;
  school_name: string;
  teacher_name: string;
  subject: string;
  grade_level: string;
  section?: string | null;
  week_start: string;
  week_end: string;
  created_at: string;
  status: string;
  file_url: string;
  district_name?: string | null;
}

interface SupervisorProfile {
  user_id: string;
  district_name?: string | null;
  teacher_name?: string | null;
  email?: string | null;
  profile_image_url?: string | null;
}

interface SupervisorAccountDraft {
  teacher_name: string;
  district_name: string;
}

const emptySupervisorAccountDraft: SupervisorAccountDraft = {
  teacher_name: "",
  district_name: "",
};

interface SchoolWeeklyRow {
  schoolName: string;
  submitted: number;
  notSubmitted: number;
  total: number;
  rate: number;
  level: "elementary" | "secondary" | "other";
  principalName: string | null;
  latestReport?: WeeklyReport;
}

function SchoolGroup({
  title,
  description,
  schools,
  onSelect,
}: {
  title: string;
  description: string;
  schools: SchoolWeeklyRow[];
  onSelect: (schoolName: string) => void;
}) {
  if (schools.length === 0) return null;

  return (
    <section className="space-y-4" aria-labelledby={`${title.replace(/\s+/g, "-").toLowerCase()}-heading`}>
      <div>
        <h3
          id={`${title.replace(/\s+/g, "-").toLowerCase()}-heading`}
          className="font-display text-2xl font-semibold text-[#173F2A]"
        >
          {title}
        </h3>
        <p className="mt-1 text-sm text-[#526159]">{description}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {schools.map((school) => (
          <button
            key={school.schoolName}
            type="button"
            className="flex min-h-60 flex-col rounded-xl border border-[#D8D0C4] bg-[#FFFCF7] p-5 text-left shadow-[0_8px_22px_rgba(20,32,25,0.04)] outline-none transition-all duration-200 hover:-translate-y-0.5 hover:border-[#A8B6A7] hover:shadow-[0_14px_30px_rgba(20,32,25,0.09)] focus-visible:ring-2 focus-visible:ring-[#236130] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F6F0E7]"
            onClick={() => onSelect(school.schoolName)}
            aria-label={`View teachers and submissions for ${school.schoolName}`}
          >
            <div className="flex w-full items-start justify-between gap-3">
              <h4 className="font-display text-xl font-semibold leading-tight text-[#173F2A]">
                {school.schoolName}
              </h4>
              <Badge
                variant="outline"
                className={
                  school.total === 0
                    ? "shrink-0 border-[#CFC6B9] text-[#526159]"
                    : school.rate === 100
                      ? "shrink-0 border-[#8FC09B] bg-[#EAF3EB] text-[#17613A]"
                      : "shrink-0 border-[#E1BD75] bg-[#FBF2DC] text-[#76500A]"
                }
              >
                {school.total === 0 ? "No teachers" : `${school.rate}%`}
              </Badge>
            </div>

            <div className="mt-5 w-full space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#526159]">Submitted this week</span>
                <span className="font-semibold tabular-nums text-[#173F2A]">
                  {school.submitted} / {school.total}
                </span>
              </div>
              <Progress value={school.rate} className="h-2" />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-[#EAF3EB] px-3 py-2 text-[#17613A]">
                  <span className="block font-semibold tabular-nums">{school.submitted}</span>
                  Submitted
                </div>
                <div className="rounded-lg bg-[#FAECE8] px-3 py-2 text-[#A83224]">
                  <span className="block font-semibold tabular-nums">{school.notSubmitted}</span>
                  Not submitted
                </div>
              </div>
              <p className="text-xs text-[#526159]">
                Principal: {school.principalName || "Not linked yet"}
              </p>
            </div>

            <span className="mt-auto flex min-h-11 w-full items-center justify-between rounded-lg border border-[#236130] px-3 text-sm font-semibold text-[#173F2A]">
              View teachers <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function SupervisorDashboard() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [schools, setSchools] = useState<SchoolAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<SupervisorProfile | null>(null);
  const [teacherSubmissions, setTeacherSubmissions] = useState<TeacherSubmission[]>([]);
  const [managedSchools, setManagedSchools] = useState<ManagedSchool[]>([]);
  const [unassignedRecordCount, setUnassignedRecordCount] = useState(0);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [accountDraft, setAccountDraft] = useState<SupervisorAccountDraft>(emptySupervisorAccountDraft);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileError) throw profileError;
      if (!profileData) throw new Error("Supervisor profile not found.");

      // Fetch once, then normalize district aliases in the client. The matching
      // database migration uses the same canonical identity for RLS and writes.
      const [managedSchoolsResult, reportsResult, assignmentsResult, submissionsResult] = await Promise.all([
        supabase.from("schools").select("*"),
        supabase.from("principal_weekly_reports").select("*").order("created_at", { ascending: false }),
        supabase.from("school_assignments").select("*"),
        supabase.from("teacher_submissions").select("*").order("created_at", { ascending: false }),
      ]);

      const queryError =
        managedSchoolsResult.error ||
        reportsResult.error ||
        assignmentsResult.error ||
        submissionsResult.error;
      if (queryError) throw queryError;

      const allManagedSchools = (managedSchoolsResult.data || []) as ManagedSchool[];
      const allReports = (reportsResult.data || []) as WeeklyReport[];
      const allAssignments = (assignmentsResult.data || []) as SchoolAssignment[];
      const allSubmissions = (submissionsResult.data || []) as TeacherSubmission[];

      const profileDistrict = canonicalDistrictName(profileData.district_name);
      const hasBacongEvidence = [
        ...allManagedSchools,
        ...allReports,
        ...allAssignments,
        ...allSubmissions,
      ].some((row) =>
        isBacongDistrict(row.district_name) ||
        isOfficialBacongSchool(row.school_name),
      );
      const effectiveDistrict =
        profileDistrict || (hasBacongEvidence ? BACONG_DISTRICT_NAME : "");

      setProfile({
        ...(profileData as SupervisorProfile),
        district_name: effectiveDistrict,
      });
      if (!effectiveDistrict) {
        setManagedSchools([]);
        setReports([]);
        setSchools([]);
        setTeacherSubmissions([]);
        setUnassignedRecordCount(0);
        return;
      }

      const districtManagedSchools = allManagedSchools.filter((row) => belongsToDistrict(row, effectiveDistrict));
      const districtReports = allReports.filter((row) => belongsToDistrict(row, effectiveDistrict));
      const districtAssignments = allAssignments.filter((row) => belongsToDistrict(row, effectiveDistrict));
      const districtSubmissions = allSubmissions.filter((row) => belongsToDistrict(row, effectiveDistrict));
      const isReportable = (row: {
        school_name?: string | null;
        district_name?: string | null;
      }) =>
        !isMissingSchoolIdentityValue(row.school_name) &&
        !isMissingSchoolIdentityValue(row.district_name);

      setUnassignedRecordCount([
        ...districtManagedSchools,
        ...districtReports,
        ...districtAssignments,
        ...districtSubmissions,
      ].filter((row) => !isReportable(row)).length);
      setManagedSchools(districtManagedSchools.filter(isReportable));
      setReports(districtReports.filter(isReportable));
      setSchools(districtAssignments.filter(isReportable));
      setTeacherSubmissions(districtSubmissions.filter(isReportable));
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error(error instanceof Error ? error.message : "Unable to load district reporting.");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileImageUpload = async (file: File) => {
    try {
      setUploadingProfile(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/supervisor-profile/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('weelmat')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('weelmat')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_image_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, profile_image_url: publicUrl });
      toast.success("Profile image updated successfully!");
    } catch (error: unknown) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload profile image");
    } finally {
      setUploadingProfile(false);
    }
  };

  const resetAccountDraft = () => {
    if (!profile) return;

    setAccountDraft({
      teacher_name: String(profile.teacher_name || ""),
      district_name: canonicalDistrictName(profile.district_name),
    });
  };

  const handleCancelAccountEdit = () => {
    resetAccountDraft();
    setIsEditingAccount(false);
  };

  const handleSaveAccount = async () => {
    const supervisorName = accountDraft.teacher_name.trim();
    const districtName = canonicalDistrictName(accountDraft.district_name);

    if (!supervisorName || !districtName) {
      toast.error("Supervisor name and a valid district are required.");
      return;
    }

    try {
      setSavingAccount(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: updatedProfile, error } = await supabase
        .from("profiles")
        .update({
          teacher_name: supervisorName,
          district_name: districtName,
        })
        .eq("user_id", user.id)
        .select("*")
        .single();

      if (error) throw error;

      setProfile(updatedProfile as SupervisorProfile);
      setAccountDraft({
        teacher_name: supervisorName,
        district_name: districtName,
      });
      setIsEditingAccount(false);
      toast.success("Supervisor account information updated.");
      await fetchData();
    } catch (error: unknown) {
      console.error("Supervisor account update error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save the account information.");
    } finally {
      setSavingAccount(false);
    }
  };

  // Group reports under one canonical school spelling, deduplicating via
  // schoolIdentityKey so variant spellings (e.g. case differences) merge.
  const schoolReports = reports.reduce((acc, report) => {
    const canonical = canonicalSchoolName(report.school_name);
    if (!canonical) return acc;
    const key = schoolIdentityKey(canonical);
    if (!acc[key]) {
      acc[key] = { displayName: canonical, reports: [] };
    }
    acc[key].reports.push(report);
    return acc;
  }, {} as Record<string, { displayName: string; reports: WeeklyReport[] }>);

  const getInstructionalMonday = (date: Date) => {
    const value = new Date(date);
    const day = value.getDay();
    if (day === 6) value.setDate(value.getDate() + 2);
    else if (day === 0) value.setDate(value.getDate() + 1);
    value.setDate(value.getDate() + (1 - value.getDay()));
    value.setHours(0, 0, 0, 0);
    return value;
  };
  const toDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const currentMonday = getInstructionalMonday(new Date());
  const currentMondayKey = toDateKey(currentMonday);
  const currentFriday = new Date(currentMonday);
  currentFriday.setDate(currentFriday.getDate() + 4);
  const currentWeekSubmissions = teacherSubmissions.filter((submission) => String(submission.week_start).substring(0, 10) === currentMondayKey);

  // Bacong supervisors always see the complete official school roster, including
  // schools with no linked principal or teachers yet. Other districts remain data-driven.
  const discoveredSchoolNames = [
    ...managedSchools.map((school) => school.school_name),
    ...schools.map((school) => school.school_name),
    ...teacherSubmissions.map((submission) => submission.school_name),
    ...reports.map((report) => report.school_name),
  ]
    .map(canonicalSchoolName)
    .filter(Boolean);
  const seededSchoolNames = isBacongDistrict(profile?.district_name)
    ? BACONG_DISTRICT_SCHOOLS.map((school) => school.name)
    : [];
  const districtSchoolNames = Array.from(
    new Map(
      [...seededSchoolNames, ...discoveredSchoolNames].map((schoolName) => [
        schoolIdentityKey(schoolName),
        schoolName,
      ]),
    ).values(),
  ).sort((left, right) => left.localeCompare(right));

  const schoolWeeklyRows = districtSchoolNames.map((schoolName) => {
    const schoolTeachers = collapseTeacherAssignments(
      schools
        .filter((teacher) => isSameSchoolName(teacher.school_name, schoolName))
        .filter((teacher): teacher is SchoolAssignment & { teacher_name: string } => Boolean(teacher.teacher_name?.trim())),
    );
    const schoolSubmissions = currentWeekSubmissions.filter((submission) =>
      isSameSchoolName(submission.school_name, schoolName),
    );
    const submitted = schoolTeachers.filter((teacher) =>
      teacherHasSubmission(teacher, schoolSubmissions),
    ).length;
    const total = schoolTeachers.length;
    const managedSchool = managedSchools.find((school) =>
      isSameSchoolName(school.school_name, schoolName),
    );
    const latestReport = reports.find((report) =>
      isSameSchoolName(report.school_name, schoolName),
    );
    return {
      schoolName,
      submitted,
      notSubmitted: Math.max(total - submitted, 0),
      total,
      rate: total > 0 ? Math.round((submitted / total) * 100) : 0,
      level: classifySchoolLevel(schoolName),
      principalName: managedSchool?.principal_name || null,
      latestReport,
    };
  });

  const totalSchools = districtSchoolNames.length;
  const completedThisWeek = schoolWeeklyRows.filter((school) => school.total > 0 && school.rate === 100).length;
  const totalTeachersTracked = schoolWeeklyRows.reduce((sum, school) => sum + school.total, 0);
  const totalSubmitted = schoolWeeklyRows.reduce((sum, school) => sum + school.submitted, 0);
  const overallCompliance = totalTeachersTracked > 0
    ? Math.round((totalSubmitted / totalTeachersTracked) * 100)
    : 0;
  const schoolsSubmitted = schoolWeeklyRows.filter((school) => school.submitted > 0).length;
  const schoolsNotSubmitted = Math.max(totalSchools - schoolsSubmitted, 0);
  const elementarySchoolRows = schoolWeeklyRows.filter((school) => school.level === "elementary");
  const secondarySchoolRows = schoolWeeklyRows.filter((school) => school.level === "secondary");
  const otherSchoolRows = schoolWeeklyRows.filter((school) => school.level === "other");
  const districtDisplayName = profile?.district_name || "District";

  // Data for charts
  const schoolComplianceData = [
    { name: "Submitted", value: schoolsSubmitted, color: "#10b981" },
    { name: "Not Submitted", value: schoolsNotSubmitted, color: "#ef4444" }
  ];

  const teacherSubmissionData = [
    { name: "Submitted", value: totalSubmitted, color: "#10b981" },
    { name: "Not Submitted", value: totalTeachersTracked - totalSubmitted, color: "#ef4444" }
  ];

  // Bar chart data for schools
  const schoolBarData = schoolWeeklyRows.map((school) => ({
    school: school.schoolName.length > 15 ? school.schoolName.substring(0, 15) + "..." : school.schoolName,
    submitted: school.submitted,
    total: school.total,
    rate: school.rate,
  }));

  if (loading) {
    return (
      <main className="min-h-[calc(100dvh-4rem)] bg-[#F6F0E7]" aria-busy="true">
        <div className="container max-w-7xl py-10">
          <div className="animate-pulse space-y-6" role="status" aria-label="Loading supervisor dashboard">
            <div className="h-12 w-80 rounded-lg bg-[#D8D0C4]/70" />
            <div className="h-24 rounded-xl border border-[#D8D0C4] bg-[#FFFCF7]" />
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((item) => <div key={item} className="h-64 rounded-xl border border-[#D8D0C4] bg-[#FFFCF7]" />)}
            </div>
            <span className="sr-only">Loading district data…</span>
          </div>
        </div>
      </main>
    );
  }

  // Group submissions by school and teacher, deduplicating via
  // schoolIdentityKey so variant spellings merge into one card.
  const submissionsBySchool = teacherSubmissions.reduce((acc, sub) => {
    const canonical = canonicalSchoolName(sub.school_name);
    if (!canonical) return acc;
    const key = schoolIdentityKey(canonical);
    if (!acc[key]) {
      acc[key] = { displayName: canonical, submissions: [] };
    }
    acc[key].submissions.push(sub);
    return acc;
  }, {} as Record<string, { displayName: string; submissions: TeacherSubmission[] }>);

  return (
    <main id="supervisor-dashboard-main" className="min-h-[calc(100dvh-4rem)] bg-[#F6F0E7] text-[#142019]">
      <div className="container mx-auto flex max-w-7xl flex-col px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header className="mb-7 border-b border-[#D8D0C4] pb-7">
        <p className="mb-2 text-sm font-semibold text-[#526159]">{profile?.district_name || "District"} · Administrative oversight</p>
        <h1 className="font-display text-4xl font-semibold tracking-[-0.035em] text-[#173F2A] sm:text-5xl">
          District submission overview
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[#526159]">
          Monitor weekly learning matrix submissions, review school-level progress, and identify where follow-up is needed.
        </p>
        <Button asChild className="mt-5 min-h-12 bg-[#236130] px-5 text-white hover:bg-[#173F2A]">
          <a href="#manage-schools"><School className="mr-2 h-4 w-4" />Manage schools</a>
        </Button>
      </header>

      {/* Overview Stats */}
      <section className="mb-7 grid overflow-hidden rounded-xl border border-[#D8D0C4] bg-[#FFFCF7] shadow-[0_8px_26px_rgba(20,32,25,0.05)] sm:grid-cols-2 lg:grid-cols-4" aria-label="District summary">
        <div className="border-b border-[#D8D0C4] p-4 sm:border-r lg:border-b-0 sm:p-5">
          <div className="flex items-center gap-3">
            <School className="h-8 w-8" style={{ color: "#236130" }} />
            <div>
              <p className="font-display text-2xl font-semibold tabular-nums text-[#173F2A]">{totalSchools}</p>
              <p className="text-sm text-[#526159]">Schools reporting</p>
            </div>
          </div>
        </div>
        
        <div className="border-b border-[#D8D0C4] p-4 lg:border-b-0 lg:border-r sm:p-5">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <p className="font-display text-2xl font-semibold tabular-nums text-[#173F2A]">{completedThisWeek}</p>
              <p className="text-sm text-[#526159]">Completed this week</p>
            </div>
          </div>
        </div>
        
        <div className="border-b border-[#D8D0C4] p-4 sm:border-b-0 sm:border-r sm:p-5">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8" style={{ color: "#f5ca47" }} />
            <div>
              <p className="font-display text-2xl font-semibold tabular-nums text-[#173F2A]">{overallCompliance}%</p>
              <p className="text-sm text-[#526159]">Overall compliance</p>
            </div>
          </div>
        </div>
        
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            <div>
              <p className="font-display text-2xl font-semibold tabular-nums text-[#173F2A]">{totalTeachersTracked}</p>
              <p className="text-sm text-[#526159]">Teachers tracked</p>
            </div>
          </div>
        </div>
      </section>

      {unassignedRecordCount > 0 && (
        <Card className="mb-7 border-[#E1BD75] bg-[#FBF2DC] p-4 shadow-none sm:p-5" role="status">
          <div className="flex items-start gap-3">
            <School className="mt-0.5 h-5 w-5 shrink-0 text-[#76500A]" aria-hidden="true" />
            <div>
              <h2 className="font-semibold text-[#5F430D]">School assignment needed</h2>
              <p className="mt-1 text-sm leading-6 text-[#76500A]">
                “Unknown School” is not a real school. {unassignedRecordCount} legacy {unassignedRecordCount === 1 ? "record is" : "records are"} missing a valid school or district. Each unresolved record is excluded from every school report and district total. The School Head should save the correct School and District in Account Information; linked teacher records will then synchronize automatically.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Tabs defaultValue="overview" className="mb-7">
        <div className="mb-4">
          <h2 className="font-display text-2xl font-semibold text-[#173F2A]">{districtDisplayName} schools</h2>
          <p className="mt-1 text-sm text-[#526159]">Open any school to see submitted and not-submitted teachers, files, and completion percentage.</p>
        </div>
        <div className="overflow-x-auto pb-1">
          <TabsList className="h-auto min-w-max border border-[#D8D0C4] bg-[#EEE8DE] p-1">
            <TabsTrigger className="min-h-11 px-4 data-[state=active]:bg-[#173F2A] data-[state=active]:text-white" value="overview">Overview</TabsTrigger>
            <TabsTrigger className="min-h-11 px-4 data-[state=active]:bg-[#173F2A] data-[state=active]:text-white" value="by-school">By school</TabsTrigger>
            <TabsTrigger className="min-h-11 px-4 data-[state=active]:bg-[#173F2A] data-[state=active]:text-white" value="recent">Recent reports</TabsTrigger>
            <TabsTrigger className="min-h-11 px-4 data-[state=active]:bg-[#173F2A] data-[state=active]:text-white" value="teacher-files">Teacher files</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          {selectedSchool ? (
            <PrincipalDashboardView
              schoolName={selectedSchool}
              districtName={profile?.district_name || ""}
              onClose={() => setSelectedSchool(null)}
            />
          ) : (
            <div className="space-y-9">
              <SchoolGroup
                title="Elementary Schools"
                description={`${districtDisplayName} elementary and central schools, arranged alphabetically.`}
                schools={elementarySchoolRows}
                onSelect={setSelectedSchool}
              />
              <SchoolGroup
                title="Secondary Schools"
                description={`${districtDisplayName} high schools and integrated schools, arranged alphabetically.`}
                schools={secondarySchoolRows}
                onSelect={setSelectedSchool}
              />
              <SchoolGroup
                title="Other Schools"
                description="Additional district schools that are not yet classified as elementary or secondary."
                schools={otherSchoolRows}
                onSelect={setSelectedSchool}
              />

              {districtSchoolNames.length === 0 && (
                <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-[#CFC6B9] bg-[#FFFCF7] px-6 py-10 text-center text-[#526159]">
                  <School className="h-10 w-10 text-[#236130]" aria-hidden="true" />
                  <p className="font-display mt-3 text-xl font-semibold text-[#173F2A]">No schools added yet</p>
                  <p className="mt-2 max-w-md text-sm leading-6">Use Manage Schools below to add the first school in this district.</p>
                </div>
              )}

              <section
                className="rounded-xl border border-[#1E5733] bg-[#173F2A] p-5 text-white shadow-[0_12px_30px_rgba(23,63,42,0.14)] sm:p-6"
                aria-labelledby="overall-district-heading"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#F3C957]">Overall</p>
                    <h3 id="overall-district-heading" className="font-display mt-2 text-3xl font-semibold">
                      {districtDisplayName} completion
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#D9E5DC]">
                      Weighted across every teacher linked to the schools above for the current school week.
                    </p>
                  </div>
                  <p className="font-display text-5xl font-semibold tabular-nums text-[#F3C957]">{overallCompliance}%</p>
                </div>
                <div className="mt-6 grid overflow-hidden rounded-lg border border-white/20 sm:grid-cols-4">
                  <div className="border-b border-white/20 p-4 sm:border-b-0 sm:border-r">
                    <p className="text-2xl font-semibold tabular-nums">{totalSchools}</p>
                    <p className="text-sm text-[#D9E5DC]">Schools</p>
                  </div>
                  <div className="border-b border-white/20 p-4 sm:border-b-0 sm:border-r">
                    <p className="text-2xl font-semibold tabular-nums">{totalTeachersTracked}</p>
                    <p className="text-sm text-[#D9E5DC]">Teachers tracked</p>
                  </div>
                  <div className="border-b border-white/20 p-4 sm:border-b-0 sm:border-r">
                    <p className="text-2xl font-semibold tabular-nums text-[#98D6A9]">{totalSubmitted}</p>
                    <p className="text-sm text-[#D9E5DC]">Submitted</p>
                  </div>
                  <div className="p-4">
                    <p className="text-2xl font-semibold tabular-nums text-[#F2A393]">
                      {Math.max(totalTeachersTracked - totalSubmitted, 0)}
                    </p>
                    <p className="text-sm text-[#D9E5DC]">Not submitted</p>
                  </div>
                </div>
              </section>
            </div>
          )}
        </TabsContent>

        <TabsContent value="by-school" className="space-y-6">
          {Object.values(schoolReports).map((group) => (
            <Card key={group.displayName} className="border-[#D8D0C4] bg-[#FFFCF7] p-5 shadow-none sm:p-6">
              <h3 className="font-display mb-4 text-xl font-semibold text-[#173F2A]">
                {group.displayName}
              </h3>
              <div className="space-y-3">
                {group.reports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">
                        Week: {new Date(report.week_start).toLocaleDateString()} - {new Date(report.week_end).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {report.submitted_teachers} / {report.total_teachers} teachers submitted
                      </p>
                    </div>
                    <Badge variant={report.status === 'completed' ? 'default' : 'secondary'}>
                      {report.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          {reports.slice(0, 20).map((report) => (
            <Card key={report.id} className="border-[#D8D0C4] bg-[#FFFCF7] p-4 shadow-none sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">{canonicalSchoolName(report.school_name) || report.school_name}</h4>
                  <p className="text-sm text-muted-foreground">
                    Week: {new Date(report.week_start).toLocaleDateString()} - {new Date(report.week_end).toLocaleDateString()}
                  </p>
                  <p className="text-sm">
                    {report.submitted_teachers} / {report.total_teachers} teachers ({Math.round((report.submitted_teachers / report.total_teachers) * 100)}%)
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={report.status === 'completed' ? 'default' : 'secondary'}>
                    {report.status}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(report.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="teacher-files" className="space-y-6">
          {Object.values(submissionsBySchool).map((group) => (
            <Card key={group.displayName} className="border-[#D8D0C4] bg-[#FFFCF7] p-5 shadow-none sm:p-6">
              <h3 className="font-display mb-4 text-xl font-semibold text-[#173F2A]">
                {group.displayName} ({group.submissions.length} submissions)
              </h3>
              <div className="space-y-3">
                {group.submissions.map((submission) => (
                  <Card key={submission.id} className="border-[#E4DDD2] bg-white p-4 shadow-none transition-colors hover:bg-[#FFFCF7]">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold">{submission.teacher_name}</h4>
                        <p className="text-sm">{submission.subject} - {submission.grade_level} ({submission.section})</p>
                        <p className="text-sm text-muted-foreground">
                          Week: {new Date(submission.week_start).toLocaleDateString()} to {new Date(submission.week_end).toLocaleDateString()}
                        </p>
                        <Badge variant={submission.status === 'accepted' ? 'default' : 'secondary'} className="mt-2">
                          {submission.status}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(submission.file_url)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button className="min-h-11 bg-[#236130] text-white hover:bg-[#173F2A]">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open in New Tab
                          </Button>
                        </a>
                        <DocumentViewer 
                          fileUrl={submission.file_url}
                          fileName={`${submission.teacher_name}_${submission.subject}`}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
      <div className="mb-4">
        <p className="text-sm font-semibold text-[#526159]">Week of {currentMonday.toLocaleDateString("en-US", { month: "long", day: "numeric" })} – {currentFriday.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
        <h2 className="font-display mt-1 text-2xl font-semibold text-[#173F2A]">Weekly submission dashboard</h2>
      </div>
      {/* Charts Section */}
      <section className="mb-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3" aria-label="District charts">
        <Card className="border-[#D8D0C4] bg-[#FFFCF7] p-5 shadow-none sm:p-6">
          <h2 className="font-display mb-4 text-xl font-semibold text-[#173F2A]">
            Submission Status Distribution
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={schoolComplianceData}
                cx="50%"
                cy="45%"
                labelLine={true}
                label={({ name, percent, cx, cy, midAngle, outerRadius, index }) => {
                  if (percent === 0) return null;
                  
                  const RADIAN = Math.PI / 180;
                  const radius = outerRadius * 1.5;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  
                  return (
                    <text
                      x={x}
                      y={y}
                      fill={schoolComplianceData[index].color}
                      textAnchor={x > cx ? 'start' : 'end'}
                      dominantBaseline="central"
                      fontSize={14}
                      fontWeight="600"
                    >
                      {`${name}: ${(percent * 100).toFixed(0)}%`}
                    </text>
                  );
                }}
                outerRadius={70}
                fill="#8884d8"
                dataKey="value"
              >
                {schoolComplianceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="border-[#D8D0C4] bg-[#FFFCF7] p-5 shadow-none sm:p-6">
          <h2 className="font-display mb-4 text-xl font-semibold text-[#173F2A]">
            Teacher Submission Status
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={teacherSubmissionData}
                cx="50%"
                cy="45%"
                labelLine={true}
                label={({ name, percent, cx, cy, midAngle, outerRadius, index }) => {
                  if (percent === 0) return null;
                  
                  const RADIAN = Math.PI / 180;
                  const radius = outerRadius * 1.5;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  
                  return (
                    <text
                      x={x}
                      y={y}
                      fill={teacherSubmissionData[index].color}
                      textAnchor={x > cx ? 'start' : 'end'}
                      dominantBaseline="central"
                      fontSize={14}
                      fontWeight="600"
                    >
                      {`${name}: ${(percent * 100).toFixed(0)}%`}
                    </text>
                  );
                }}
                outerRadius={70}
                fill="#8884d8"
                dataKey="value"
              >
                {teacherSubmissionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="border-[#D8D0C4] bg-[#FFFCF7] p-5 shadow-none sm:p-6 md:col-span-2 xl:col-span-1">
          <h2 className="font-display mb-4 text-xl font-semibold text-[#173F2A]">
            School Completion Rate
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={schoolBarData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="school" 
                angle={-45} 
                textAnchor="end" 
                height={120}
                interval={0}
                tick={{ fontSize: 11 }}
              />
              <YAxis 
                label={{ value: 'Completion Rate (%)', angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ fontSize: 12 }}
                formatter={(value: number | string) => `${value}%`}
              />
              <Bar dataKey="rate" fill="#236130" name="Completion Rate (%)" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </section>

      {/* School Management Section */}
      {profile && profile.district_name && (
        <section id="manage-schools" className="mb-6 scroll-mt-24" aria-label="School management">
          <SchoolManagement 
            districtName={profile.district_name}
            supervisorId={profile.user_id}
            schools={managedSchools}
            onRefresh={fetchData}
          />
        </section>
      )}

      {/* Account Info Card */}
      {profile && (
        <Card className="mb-6 border-[#D8D0C4] bg-[#FFFCF7] p-5 shadow-none sm:p-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row">
            <div className="relative">
              <div className="w-20 h-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-border">
                {profile.profile_image_url ? (
                  <img 
                    src={profile.profile_image_url} 
                    alt={profile.teacher_name || "Supervisor"} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserCircle className="h-12 w-12" style={{ color: "#236130" }} />
                )}
              </div>
              <label 
                htmlFor="supervisorProfileImage" 
                className="absolute -bottom-2 -right-2 flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border-4 border-[#FFFCF7] bg-[#236130] text-white shadow-md transition-colors hover:bg-[#173F2A] focus-within:ring-2 focus-within:ring-[#D6A73D]"
                aria-label="Upload supervisor profile photo"
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
              </label>
              <input
                id="supervisorProfileImage"
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingProfile}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleProfileImageUpload(file);
                }}
              />
            </div>
            <div className="w-full min-w-0 flex-1">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-display text-xl font-semibold text-[#173F2A]">
                    Account Information
                  </h2>
                  <p className="mt-1 text-sm text-[#526159]">
                    Keep your supervisor name and official district accurate for school-level reporting.
                  </p>
                </div>
                {!isEditingAccount && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetAccountDraft();
                      setIsEditingAccount(true);
                    }}
                    className="h-11 gap-2 border-[#236130] text-[#173F2A] hover:bg-[#EAF1E6] sm:shrink-0"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Edit information
                  </Button>
                )}
              </div>

              {isMissingSchoolIdentityValue(profile.district_name) && !isEditingAccount && (
                <div className="mb-5 rounded-xl border border-[#D6A73D]/45 bg-[#FFF7DF] p-4" role="status">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#9A6A00]">
                      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-semibold text-[#5E4300]">Complete your district information</p>
                      <p className="mt-1 text-sm leading-6 text-[#765D1B]">
                        Enter the official district name to connect the correct schools, teachers, and weekly reports to this dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isEditingAccount ? (
                <div className="rounded-xl border border-[#D8D0C4] bg-[#F7F1E8] p-4 sm:p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="supervisorName">Supervisor name</Label>
                      <Input
                        id="supervisorName"
                        value={accountDraft.teacher_name}
                        onChange={(event) => setAccountDraft((current) => ({
                          ...current,
                          teacher_name: event.target.value,
                        }))}
                        placeholder="Enter the supervisor's full name"
                        className="h-11 bg-[#FFFCF7]"
                        autoComplete="name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supervisorEmail">Email</Label>
                      <Input
                        id="supervisorEmail"
                        value={profile.email || ""}
                        disabled
                        className="h-11 bg-[#EEE9E1]"
                      />
                      <p className="text-xs text-[#526159]">Your sign-in email cannot be changed here.</p>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="supervisorDistrict">District</Label>
                      <Input
                        id="supervisorDistrict"
                        value={accountDraft.district_name}
                        onChange={(event) => setAccountDraft((current) => ({
                          ...current,
                          district_name: event.target.value,
                        }))}
                        placeholder="e.g., Bacong District"
                        className="h-11 bg-[#FFFCF7] md:max-w-xl"
                        required
                      />
                      <p className="text-xs leading-5 text-[#526159]">
                        Use the official district name shared by the schools under your supervision.
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelAccountEdit}
                      disabled={savingAccount}
                      className="h-11 gap-2"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSaveAccount}
                      disabled={savingAccount}
                      className="h-11 gap-2 bg-[#236130] text-white hover:bg-[#173F2A]"
                    >
                      <Save className="h-4 w-4" aria-hidden="true" />
                      {savingAccount ? "Saving…" : "Save changes"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-x-8 gap-y-4 text-sm md:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#526159]">Name</p>
                    <p className="mt-1 font-medium text-[#173F2A]">{profile.teacher_name || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#526159]">Email</p>
                    <p className="mt-1 break-all font-medium text-[#173F2A]">{profile.email || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#526159]">District</p>
                    <p className="mt-1 font-medium text-[#173F2A]">
                      {canonicalDistrictName(profile.district_name) || "Needs setup"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}


      </div>
    </main>
  );
}
