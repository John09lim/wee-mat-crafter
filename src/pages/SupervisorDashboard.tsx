import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { School, Users, CheckCircle, TrendingUp, UserCircle, ExternalLink, Upload, ArrowRight, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import DocumentViewer from "@/components/DocumentViewer";

import { SchoolManagement } from "@/components/SchoolManagement";
import { PrincipalDashboardView } from "@/components/PrincipalDashboardView";

interface WeeklyReport {
  id: string;
  school_name: string;
  week_start: string;
  week_end: string;
  created_at: string;
  status: string;
  submitted_teachers: number;
  total_teachers: number;
}

interface SchoolAssignment {
  user_id: string | null;
  school_name: string;
  teacher_name?: string | null;
}

interface ManagedSchool {
  id: string;
  school_name: string;
  principal_name?: string | null;
}

interface TeacherSubmission {
  id: string;
  user_id: string;
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

export default function SupervisorDashboard() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [schools, setSchools] = useState<SchoolAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<SupervisorProfile | null>(null);
  const [teacherSubmissions, setTeacherSubmissions] = useState<TeacherSubmission[]>([]);
  const [managedSchools, setManagedSchools] = useState<ManagedSchool[]>([]);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [accountDraft, setAccountDraft] = useState<SupervisorAccountDraft>({
    teacher_name: "",
    district_name: "",
  });
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Get supervisor's profile to filter by their district
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!profileData) {
        console.error("Supervisor profile not found");
        return;
      }

      setProfile(profileData as SupervisorProfile);

      if (!profileData.district_name) {
        setManagedSchools([]);
        setReports([]);
        setSchools([]);
        setTeacherSubmissions([]);
        return;
      }

      // Fetch managed schools from schools table
      const { data: managedSchoolsData } = await supabase
        .from("schools")
        .select("*")
        .eq("district_name", profileData.district_name);
      
      setManagedSchools((managedSchoolsData || []) as ManagedSchool[]);

      // Fetch ONLY reports from supervisor's district
      const { data: reportsData, error: reportsError } = await supabase
        .from("principal_weekly_reports")
        .select("*")
        .eq("district_name", profileData.district_name)
        .order("created_at", { ascending: false });

      if (reportsError) throw reportsError;

      // Fetch ONLY school assignments in supervisor's district
      const { data: schoolsData, error: schoolsError } = await supabase
        .from("school_assignments")
        .select("*")
        .eq("district_name", profileData.district_name);

      if (schoolsError) throw schoolsError;

      // Fetch teacher submissions from this district
      const { data: submissionsData, error: submissionsError } = await supabase
        .from("teacher_submissions")
        .select("*")
        .eq("district_name", profileData.district_name)
        .order("created_at", { ascending: false });

      if (submissionsError) throw submissionsError;

      setReports((reportsData || []) as WeeklyReport[]);
      setSchools((schoolsData || []) as SchoolAssignment[]);
      setTeacherSubmissions((submissionsData || []) as TeacherSubmission[]);
    } catch (error) {
      console.error("Error fetching data:", error);
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

  const startAccountEdit = () => {
    if (!profile) return;

    setAccountDraft({
      teacher_name: profile.teacher_name?.trim() || "",
      district_name: profile.district_name?.trim() || "",
    });
    setIsEditingAccount(true);
  };

  const cancelAccountEdit = () => {
    setIsEditingAccount(false);
  };

  const handleSaveAccount = async () => {
    const supervisorName = accountDraft.teacher_name.trim();
    const districtName = accountDraft.district_name.trim();

    if (!supervisorName || !districtName) {
      toast.error("Supervisor name and district are required.");
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
      setIsEditingAccount(false);
      toast.success("Supervisor account information updated.");
      await fetchData();
    } catch (error: unknown) {
      console.error("Supervisor account update error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save account information.");
    } finally {
      setSavingAccount(false);
    }
  };

  // Group reports by school
  const schoolReports = reports.reduce((acc, report) => {
    if (!acc[report.school_name]) {
      acc[report.school_name] = [];
    }
    acc[report.school_name].push(report);
    return acc;
  }, {} as Record<string, WeeklyReport[]>);

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

  // Include schools discovered through any district data source. This keeps legacy
  // principal-created schools visible even when their supervisor_id was not backfilled.
  const districtSchoolNames = [...new Set([
    ...managedSchools.map((school) => school.school_name),
    ...schools.map((school) => school.school_name),
    ...teacherSubmissions.map((submission) => submission.school_name),
  ].filter(Boolean))].sort();

  const schoolWeeklyRows = districtSchoolNames.map((schoolName) => {
    const schoolTeachers = schools.filter((teacher) => teacher.school_name === schoolName);
    const teacherKeys = new Set(schoolTeachers.map((teacher) => teacher.user_id || teacher.teacher_name?.trim().toLowerCase()).filter(Boolean));
    const schoolSubmissions = currentWeekSubmissions.filter((submission) => submission.school_name === schoolName);
    const submittedKeys = new Set(schoolSubmissions.map((submission) => submission.user_id || submission.teacher_name.trim().toLowerCase()).filter(Boolean));
    const submitted = [...teacherKeys].filter((key) => submittedKeys.has(key)).length;
    const total = teacherKeys.size;
    return { schoolName, submitted, total, rate: total > 0 ? Math.round((submitted / total) * 100) : 0 };
  });

  const totalSchools = districtSchoolNames.length;
  const completedThisWeek = schoolWeeklyRows.filter((school) => school.total > 0 && school.rate === 100).length;
  const overallCompliance = schoolWeeklyRows.length > 0
    ? Math.round(schoolWeeklyRows.reduce((sum, school) => sum + school.rate, 0) / schoolWeeklyRows.length)
    : 0;
  const totalTeachersTracked = schoolWeeklyRows.reduce((sum, school) => sum + school.total, 0);
  const totalSubmitted = schoolWeeklyRows.reduce((sum, school) => sum + school.submitted, 0);
  const schoolsSubmitted = schoolWeeklyRows.filter((school) => school.submitted > 0).length;
  const schoolsNotSubmitted = Math.max(totalSchools - schoolsSubmitted, 0);

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
  })).slice(0, 10);

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

  // Group submissions by school and teacher
  const submissionsBySchool = teacherSubmissions.reduce((acc, sub) => {
    if (!acc[sub.school_name]) {
      acc[sub.school_name] = [];
    }
    acc[sub.school_name].push(sub);
    return acc;
  }, {} as Record<string, TeacherSubmission[]>);

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

      <Tabs defaultValue="overview" className="mb-7">
        <div className="mb-4">
          <h2 className="font-display text-2xl font-semibold text-[#173F2A]">Schools requiring attention</h2>
          <p className="mt-1 text-sm text-[#526159]">Open a school to review teachers, files, and recent reporting history.</p>
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
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {districtSchoolNames.map((schoolName) => {
                const school = managedSchools.find((item) => item.school_name === schoolName) || { id: schoolName, school_name: schoolName, principal_name: null };
                const schoolReportsForSchool = reports.filter(r => r.school_name === school.school_name);
                const latestReport = schoolReportsForSchool[0];
                
                // Get teacher count from school_assignments
                const teachersInSchool = schools.filter(s => s.school_name === school.school_name);
                const teacherCount = teachersInSchool.length;
                
                // Get submissions for this school this week
                const today = new Date();
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                
                const thisWeekSubmissions = teacherSubmissions.filter(sub => {
                  const subDate = new Date(sub.created_at);
                  return sub.school_name === school.school_name && subDate >= startOfWeek;
                });
                
                const submittedCount = new Set(thisWeekSubmissions.map(s => s.user_id)).size;
                const completionRate = teacherCount > 0
                  ? Math.round((submittedCount / teacherCount) * 100)
                  : 0;

                return (
                  <button
                    key={school.id} 
                    type="button"
                    className="min-h-64 cursor-pointer rounded-xl border border-[#D8D0C4] bg-[#FFFCF7] p-5 text-left shadow-[0_8px_22px_rgba(20,32,25,0.04)] outline-none transition-all duration-200 hover:-translate-y-0.5 hover:border-[#A8B6A7] hover:shadow-[0_14px_30px_rgba(20,32,25,0.09)] focus-visible:ring-2 focus-visible:ring-[#236130] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F6F0E7]"
                    onClick={() => setSelectedSchool(school.school_name)}
                    aria-label={`View ${school.school_name} school details`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="font-display text-xl font-semibold text-[#173F2A]">{school.school_name}</h3>
                      <Badge variant={latestReport?.status === 'completed' ? 'default' : 'secondary'}>
                        {latestReport?.status || 'No Reports'}
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Teachers Submitted:</span>
                        <span className="font-semibold">
                          {submittedCount} / {teacherCount}
                        </span>
                      </div>
                      
                      <Progress value={completionRate} className="h-2" />
                      
                      {latestReport && (
                        <div className="text-sm text-muted-foreground">
                          Last Report: {new Date(latestReport.week_start).toLocaleDateString()}
                        </div>
                      )}
                      
                      <div className="text-xs text-muted-foreground">
                        Principal: {school.principal_name || "Not assigned"}
                      </div>
                      
                      <span className="mt-3 flex min-h-11 w-full items-center justify-between rounded-lg border border-[#236130] px-3 text-sm font-semibold text-[#173F2A]">
                        View teachers <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </div>
                  </button>
                );
              })}
              {districtSchoolNames.length === 0 && (
                <div className="col-span-full flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-[#CFC6B9] bg-[#FFFCF7] px-6 py-10 text-center text-[#526159]">
                  <School className="h-10 w-10 text-[#236130]" aria-hidden="true" />
                  <p className="font-display mt-3 text-xl font-semibold text-[#173F2A]">No schools added yet</p>
                  <p className="mt-2 max-w-md text-sm leading-6">Use Manage Schools below to add the first school in this district.</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="by-school" className="space-y-6">
          {Object.entries(schoolReports).map(([schoolName, schoolReports]) => (
            <Card key={schoolName} className="border-[#D8D0C4] bg-[#FFFCF7] p-5 shadow-none sm:p-6">
              <h3 className="font-display mb-4 text-xl font-semibold text-[#173F2A]">
                {schoolName}
              </h3>
              <div className="space-y-3">
                {schoolReports.map((report) => (
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
                  <h4 className="font-semibold">{report.school_name}</h4>
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
          {Object.entries(submissionsBySchool).map(([schoolName, submissions]) => (
            <Card key={schoolName} className="border-[#D8D0C4] bg-[#FFFCF7] p-5 shadow-none sm:p-6">
              <h3 className="font-display mb-4 text-xl font-semibold text-[#173F2A]">
                {schoolName} ({submissions.length} submissions)
              </h3>
              <div className="space-y-3">
                {submissions.map((submission) => (
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
                    Keep your supervisor name and district accurate for school reporting.
                  </p>
                </div>
                {!isEditingAccount && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={startAccountEdit}
                    className="h-11 gap-2 border-[#236130] text-[#173F2A] hover:bg-[#EAF1E6] sm:shrink-0"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Edit information
                  </Button>
                )}
              </div>

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
                      onClick={cancelAccountEdit}
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
                    <p className="mt-1 font-medium text-[#173F2A]">{profile.district_name || "Needs setup"}</p>
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
