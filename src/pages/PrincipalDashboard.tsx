import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, CheckCircle, Users, Calendar, UserCircle, CheckCircle2, XCircle, Bell, ExternalLink, Upload, Share2, Copy, Printer, FileText } from "lucide-react";
import { SubmissionsReportModal } from "@/components/SubmissionsReportModal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import DocumentViewer from "@/components/DocumentViewer";

import { TeacherManagement } from "@/components/TeacherManagement";
import WeeklySubmissionCalendar from "@/components/WeeklySubmissionCalendar";
import { WeeklySubmissionSummary } from "@/components/WeeklySubmissionSummary";
import { normalizeTeacherName, normalizeWeekStart, teacherHasSubmission } from "@/lib/submissionTracking";

interface Submission {
  id: string;
  user_id: string;
  teacher_name: string;
  subject: string;
  grade_level: string;
  section?: string | null;
  week_start: string;
  week_end: string;
  created_at: string;
  status: string;
  file_url?: string | null;
  principal_notes?: string | null;
}

interface PrincipalProfile {
  user_id: string;
  school: string;
  district_name?: string | null;
  teacher_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  profile_image_url?: string | null;
}

interface ManagedTeacher {
  user_id: string;
  teacher_name: string;
  teacher_email?: string | null;
  grade_level?: string | null;
  section?: string | null;
  profile_image_url?: string | null;
}

interface SupervisorInfo {
  teacher_name?: string | null;
  email?: string | null;
  profile_image_url?: string | null;
}

export default function PrincipalDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [profile, setProfile] = useState<PrincipalProfile | null>(null);
  const [allTeachers, setAllTeachers] = useState<ManagedTeacher[]>([]);
  const [newSubmissionsCount, setNewSubmissionsCount] = useState(0);
  const initialLoadComplete = useRef(false);
  const [managedTeachers, setManagedTeachers] = useState<ManagedTeacher[]>([]);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [supervisorInfo, setSupervisorInfo] = useState<SupervisorInfo | null>(null);
  const [displayMode, setDisplayMode] = useState<'text' | 'image'>('text');
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  // Realtime subscription for submissions addressed to this principal.
  useEffect(() => {
    if (!profile?.user_id) return;

    const channel = supabase
      .channel('teacher-submissions-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'teacher_submissions',
          filter: `principal_id=eq.${profile.user_id}`
        },
        (payload) => {
          if (initialLoadComplete.current) {
            const newSubmission = payload.new as Submission;
            toast.success(
              `New submission from ${newSubmission.teacher_name}`,
              {
                description: `${newSubmission.subject} - ${newSubmission.grade_level}`,
              }
            );
            setNewSubmissionsCount(prev => prev + 1);
            setSubmissions(prev => [newSubmission, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.user_id]);

  const fetchSubmissions = async () => {
    try {
      // Get principal's profile to filter by their school
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        setLoading(false);
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!profileData) {
        toast.error("Profile not found");
        setLoading(false);
        return;
      }

      setProfile(profileData as PrincipalProfile);

      // Fetch supervisor information
      const { data: schoolData } = await supabase
        .from("schools")
        .select("supervisor_id")
        .eq("principal_id", user.id)
        .maybeSingle();

      if (schoolData?.supervisor_id) {
        const { data: supervisorProfile } = await supabase
          .from("profiles")
          .select("teacher_name, email, profile_image_url")
          .eq("user_id", schoolData.supervisor_id)
          .maybeSingle();
        
        setSupervisorInfo(supervisorProfile as SupervisorInfo | null);
      }

      // Fetch managed teachers from school_assignments
      const { data: managedTeachersData } = await supabase
        .from("school_assignments")
        .select("*")
        .eq("principal_id", user.id);
      
      const uniqueManagedTeachers = Array.from(
        new Map(
          ((managedTeachersData || []) as ManagedTeacher[]).map((teacher) => [
            teacher.teacher_email?.trim().toLocaleLowerCase() ||
              teacher.user_id ||
              normalizeTeacherName(teacher.teacher_name),
            teacher,
          ]),
        ).values(),
      );
      setManagedTeachers(uniqueManagedTeachers);

      // Fetch all teachers from this school with their profiles
      const { data: teachersData } = await supabase
        .from("school_assignments")
        .select("user_id, school_name")
        .eq("school_name", profileData.school);

      // Fetch teacher profiles to get names
      if (teachersData && teachersData.length > 0) {
        const teacherIds = teachersData.map(t => t.user_id);
        const { data: teacherProfiles } = await supabase
          .from("profiles")
          .select("user_id, teacher_name")
          .in("user_id", teacherIds);

        const enrichedTeachers = managedTeachersData?.map(t => ({
          user_id: t.user_id,
          teacher_name: t.teacher_name || "Teacher",
          grade_level: t.grade_level,
          section: t.section
        })) || [];
        setAllTeachers(enrichedTeachers as ManagedTeacher[]);
      } else {
        setAllTeachers([]);
      }

      // principal_id is the authoritative routing key. School names remain
      // display metadata and must not hide a valid teacher submission.
      const { data, error } = await supabase
        .from("teacher_submissions")
        .select("*")
        .eq("principal_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error:", error);
        toast.error("Failed to load submissions");
      } else {
        setSubmissions((data || []) as Submission[]);
        initialLoadComplete.current = true;
      }
    } catch (error: unknown) {
      console.error("Error:", error);
      toast.error("Failed to load submissions");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string, notes?: string) => {
    const updateData: { status: string; principal_notes?: string } = { status: newStatus };
    if (notes !== undefined) {
      updateData.principal_notes = notes;
    }

    const { error } = await supabase
      .from("teacher_submissions")
      .update(updateData)
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success("Status updated successfully");
      fetchSubmissions();
    }
  };

  const markWeekComplete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Fetch principal's profile for school and district information
      const { data: profile } = await supabase
        .from("profiles")
        .select("school, district_name")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        toast.error("Profile not found");
        return;
      }

      // Dynamically calculate current week (Monday-Friday)
      const getMondayOfWeek = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        d.setDate(d.getDate() + diff);
        d.setHours(0, 0, 0, 0);
        return d;
      };
      const currentMonday = getMondayOfWeek(new Date());
      
      const currentFriday = new Date(currentMonday);
      currentFriday.setDate(currentMonday.getDate() + 4);
      currentFriday.setHours(23, 59, 59, 999);

      const { error } = await supabase
        .from("principal_weekly_reports")
        .insert({
          principal_id: user.id,
          school_name: profile.school,
          district_name: profile.district_name,
          week_start: currentMonday.toISOString().split('T')[0],
          week_end: currentFriday.toISOString().split('T')[0],
          status: "completed",
          total_teachers: submissions.length,
          submitted_teachers: submissions.filter(s => s.status === 'reviewed').length
        });

      if (error) throw error;
      toast.success("Weekly report sent to Supervisor!");
    } catch (error: unknown) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to mark week as complete");
    }
  };

  const handleProfileImageUpload = async (file: File) => {
    try {
      setUploadingProfile(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/principal-profile/${fileName}`;

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

  const handleShareStatus = async () => {
    if (!profile?.school) {
      toast.error("School information not available");
      return;
    }

    const shareUrl = `${window.location.origin}/school-status/${encodeURIComponent(profile.school)}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const groupedByTeacher = submissions.reduce((acc, sub) => {
    if (!acc[sub.teacher_name]) acc[sub.teacher_name] = [];
    acc[sub.teacher_name].push(sub);
    return acc;
  }, {} as Record<string, Submission[]>);

  const groupedBySubject = submissions.reduce((acc, sub) => {
    if (!acc[sub.subject]) acc[sub.subject] = [];
    acc[sub.subject].push(sub);
    return acc;
  }, {} as Record<string, Submission[]>);

  // Calculate current week's submissions and bounds (Monday-Friday)
  const getMondayOfWeekCalc = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    // Weekend submissions belong to the upcoming instructional week,
    // matching the label and calendar shown elsewhere on this dashboard.
    if (day === 6) d.setDate(d.getDate() + 2);
    else if (day === 0) d.setDate(d.getDate() + 1);
    const normalizedDay = d.getDay();
    const diff = normalizedDay === 0 ? -6 : 1 - normalizedDay;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const currentMonday = getMondayOfWeekCalc(new Date());
  
  const currentFriday = new Date(currentMonday);
  currentFriday.setDate(currentMonday.getDate() + 4);
  currentFriday.setHours(23, 59, 59, 999);

  const toLocalDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const currentMondayKey = toLocalDateKey(currentMonday);

  const currentWeekSubmissions = submissions.filter(s => {
    const weekStartKey = normalizeWeekStart(s.week_start);
    return weekStartKey === currentMondayKey;
  });
  
  const submittedTeachers = managedTeachers.filter((teacher) => teacherHasSubmission(teacher, currentWeekSubmissions));
  const notSubmittedTeachers = managedTeachers.filter((teacher) => !teacherHasSubmission(teacher, currentWeekSubmissions));

  const getInitials = (name: string) => {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Weekly stats for charts (current week only)
  const weeklyStats = {
    total: currentWeekSubmissions.length,
    pending: currentWeekSubmissions.filter(s => s.status === 'pending' || s.status === 'submitted').length,
    reviewed: currentWeekSubmissions.filter(s => s.status === 'reviewed').length,
    returned: currentWeekSubmissions.filter(s => s.status === 'returned').length,
  };

  // Data for charts - using weekly stats
  const statusChartData = [
    { name: "Reviewed", value: weeklyStats.reviewed, color: "#17613A" },
    { name: "Pending", value: weeklyStats.pending, color: "#D6A73D" },
    { name: "Returned", value: weeklyStats.returned, color: "#A83224" }
  ];

  const submissionCompletionData = [
    { name: "Submitted", value: submittedTeachers.length, color: "#17613A" },
    { name: "Not Submitted", value: notSubmittedTeachers.length, color: "#A83224" }
  ];

  const currentWeekLabel = `${currentMonday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${currentFriday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  const attentionSubmissions = submissions.filter((submission) =>
    submission.status === "pending" || submission.status === "submitted" || submission.status === "returned"
  );

  if (loading) {
    return (
      <main className="min-h-[calc(100dvh-4rem)] bg-[#F6F0E7]" aria-busy="true">
        <div className="container max-w-7xl py-10 sm:py-14">
          <div className="animate-pulse space-y-6" role="status" aria-label="Loading principal dashboard">
            <div className="h-12 w-72 rounded-lg bg-[#D8D0C4]/70" />
            <div className="h-24 rounded-xl border border-[#D8D0C4] bg-[#FFFCF7]" />
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="h-80 rounded-xl border border-[#D8D0C4] bg-[#FFFCF7]" />
              <div className="h-80 rounded-xl border border-[#D8D0C4] bg-[#FFFCF7]" />
            </div>
            <span className="sr-only">Loading dashboard data…</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main id="principal-dashboard-main" className="min-h-[calc(100dvh-4rem)] bg-[#F6F0E7] text-[#142019]">
      <div className="container mx-auto flex max-w-7xl flex-col px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header className="mb-7 flex flex-col gap-5 border-b border-[#D8D0C4] pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold text-[#526159]">{profile?.school || "School workspace"} · {currentWeekLabel}</p>
          <div className="flex flex-wrap items-center gap-4">
          <h1 className="font-display text-4xl font-semibold tracking-[-0.035em] text-[#173F2A] sm:text-5xl">Weekly submission overview</h1>
          {newSubmissionsCount > 0 && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bell className="h-6 w-6" style={{ color: "#236130" }} />
                <Badge 
                  className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0"
                  style={{ backgroundColor: "#f5ca47", color: "#236130" }}
                >
                  {newSubmissionsCount}
                </Badge>
              </div>
              <Button 
                size="sm"
                variant="outline"
                onClick={() => setNewSubmissionsCount(0)}
                className="min-h-11 border-[#D8D0C4] bg-[#FFFCF7] text-[#173F2A] hover:bg-white"
              >
                Clear alert
              </Button>
            </div>
          )}
          </div>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#526159]">Review this week’s WeeLMat submissions, follow up on revisions, and keep your school’s reporting current.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button asChild variant="outline" className="min-h-12 border-[#236130] text-[#173F2A] hover:bg-[#E8EFE8]">
            <a href="#manage-teachers"><Users className="mr-2 h-4 w-4" />Manage teachers</a>
          </Button>
          <Button
            onClick={markWeekComplete}
            className="min-h-12 bg-[#236130] px-5 text-white shadow-[0_10px_24px_rgba(23,63,42,0.16)] hover:bg-[#173F2A]"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Mark This Week as Completed
          </Button>
        </div>
      </header>

      {/* Stats Cards */}
      <section className="mb-7 grid overflow-hidden rounded-xl border border-[#D8D0C4] bg-[#FFFCF7] shadow-[0_8px_26px_rgba(20,32,25,0.05)] sm:grid-cols-2 lg:grid-cols-4" aria-label="This week’s submission summary">
        <div className="border-b border-[#D8D0C4] p-4 sm:border-r lg:border-b-0 sm:p-5">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-[#236130]" aria-hidden="true" />
            <div>
              <p className="font-display text-2xl font-semibold tabular-nums text-[#173F2A]">{managedTeachers.length}</p>
              <p className="text-sm text-[#526159]">Teachers</p>
            </div>
          </div>
        </div>
        <div className="border-b border-[#D8D0C4] p-4 lg:border-b-0 lg:border-r sm:p-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-[#17613A]" aria-hidden="true" />
            <div>
              <p className="font-display text-2xl font-semibold tabular-nums text-[#173F2A]">{submittedTeachers.length}</p>
              <p className="text-sm text-[#526159]">Submitted this week</p>
            </div>
          </div>
        </div>
        <div className="border-b border-[#D8D0C4] p-4 sm:border-b-0 sm:border-r sm:p-5">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-[#8A5A00]" aria-hidden="true" />
            <div>
              <p className="font-display text-2xl font-semibold tabular-nums text-[#173F2A]">{weeklyStats.pending}</p>
              <p className="text-sm text-[#526159]">Pending review</p>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <XCircle className="h-8 w-8 text-[#A83224]" aria-hidden="true" />
            <div>
              <p className="font-display text-2xl font-semibold tabular-nums text-[#173F2A]">{weeklyStats.returned}</p>
              <p className="text-sm text-[#526159]">Needs revision</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6" aria-labelledby="requires-attention-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="requires-attention-heading" className="font-display text-2xl font-semibold text-[#173F2A]">Requires attention</h2>
            <p className="mt-1 text-sm text-[#526159]">Submissions waiting for review or revision follow-up.</p>
          </div>
          <span className="inline-flex min-h-8 items-center rounded-full bg-[#F1E2BC] px-3 text-sm font-bold text-[#76500A]" aria-label={`${attentionSubmissions.length} submissions require attention`}>
            {attentionSubmissions.length}
          </span>
        </div>
        <div className="overflow-hidden rounded-xl border border-[#D8D0C4] bg-[#FFFCF7] shadow-[0_8px_24px_rgba(20,32,25,0.05)]">
          {attentionSubmissions.length === 0 ? (
            <div className="flex min-h-28 items-center gap-3 px-5 py-6 text-[#526159]">
              <CheckCircle2 className="h-6 w-6 text-[#17613A]" aria-hidden="true" />
              <div><p className="font-semibold text-[#173F2A]">You’re all caught up.</p><p className="mt-1 text-sm">No submissions currently need review or revision.</p></div>
            </div>
          ) : (
            attentionSubmissions.slice(0, 4).map((submission) => (
              <SubmissionCard key={`attention-${submission.id}`} submission={submission} onStatusUpdate={updateStatus} compact />
            ))
          )}
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-7" style={{ order: 4 }}>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-[#173F2A]">Recent submissions</h2>
            <p className="mt-1 text-sm text-[#526159]">Open a record to review the file, update its status, or leave notes.</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowReportModal(true)}
            className="min-h-11 gap-2 border-[#236130] text-[#173F2A] hover:bg-[#E8EFE8]"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            Print report
          </Button>
        </div>
        <div className="overflow-x-auto pb-1">
          <TabsList className="h-auto min-w-max border border-[#D8D0C4] bg-[#EEE8DE] p-1">
            <TabsTrigger className="min-h-11 px-4 data-[state=active]:bg-[#173F2A] data-[state=active]:text-white" value="all">All submissions</TabsTrigger>
            <TabsTrigger className="min-h-11 px-4 data-[state=active]:bg-[#173F2A] data-[state=active]:text-white" value="by-teacher">By teacher</TabsTrigger>
            <TabsTrigger className="min-h-11 px-4 data-[state=active]:bg-[#173F2A] data-[state=active]:text-white" value="by-subject">By learning area</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="mt-3 overflow-hidden rounded-xl border border-[#D8D0C4] bg-[#FFFCF7] shadow-[0_8px_24px_rgba(20,32,25,0.05)]">
          {submissions.length === 0 ? <DashboardEmptyState /> : submissions.map((sub) => (
            <SubmissionCard 
              key={sub.id} 
              submission={sub} 
              onStatusUpdate={updateStatus}
            />
          ))}
        </TabsContent>

        <TabsContent value="by-teacher" className="space-y-6">
          {Object.entries(groupedByTeacher).map(([teacher, subs]) => (
            <div key={teacher}>
              <h3 className="font-display mb-3 text-xl font-semibold text-[#173F2A]">
                {teacher} ({subs.length} submissions)
              </h3>
              <div className="overflow-hidden rounded-xl border border-[#D8D0C4] bg-[#FFFCF7]">
                {subs.map((sub) => (
                  <SubmissionCard 
                    key={sub.id} 
                    submission={sub} 
                    onStatusUpdate={updateStatus}
                  />
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="by-subject" className="space-y-6">
          {Object.entries(groupedBySubject).map(([subject, subs]) => (
            <div key={subject}>
              <h3 className="font-display mb-3 text-xl font-semibold text-[#173F2A]">
                {subject} ({subs.length} submissions)
              </h3>
              <div className="overflow-hidden rounded-xl border border-[#D8D0C4] bg-[#FFFCF7]">
                {subs.map((sub) => (
                  <SubmissionCard 
                    key={sub.id} 
                    submission={sub} 
                    onStatusUpdate={updateStatus}
                  />
                ))}
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>      {/* Teacher Tracking for Current Week */}
      <Card className="mb-6 border-[#D8D0C4] bg-[#FFFCF7] p-5 shadow-none sm:p-6" style={{ order: 1 }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="font-display text-xl font-semibold text-[#173F2A]">
            This Week's Teacher Submissions ({(() => {
              const today = new Date();
              const day = today.getDay();
              // If Saturday (6) or Sunday (0), advance to next week
              const targetDate = day === 6 ? new Date(today.setDate(today.getDate() + 2)) : 
                                 day === 0 ? new Date(today.setDate(today.getDate() + 1)) : today;
              const monday = new Date(targetDate);
              const mondayDay = monday.getDay();
              const diff = mondayDay === 0 ? -6 : 1 - mondayDay;
              monday.setDate(monday.getDate() + diff);
              const friday = new Date(monday);
              friday.setDate(monday.getDate() + 4);
              const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              return `${formatDate(monday).replace(/, /g, ' ').replace(' 2025', '')}-${friday.getDate()}, ${friday.getFullYear()}`;
            })()})
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 border rounded-md p-1">
              <Button
                variant={displayMode === 'text' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDisplayMode('text')}
                className="min-h-11 px-4 text-sm"
              >
                Text
              </Button>
              <Button
                variant={displayMode === 'image' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDisplayMode('image')}
                className="min-h-11 px-4 text-sm"
              >
                Image
              </Button>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-11 gap-2 border-[#236130] text-[#173F2A]"
                >
                  <Share2 className="w-4 h-4" />
                  Share Status
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end">
                <Button
                  onClick={handleShareStatus}
                  variant="ghost"
                  size="sm"
                  className="min-h-11 w-full justify-start gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy Link
                </Button>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold">Submitted ({submittedTeachers.length})</h4>
            </div>
            <div className="space-y-2">
              {submittedTeachers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No submissions yet</p>
              ) : displayMode === 'text' ? (
                submittedTeachers.map((teacher) => (
                  <div key={teacher.user_id} className="flex items-center gap-2 text-sm p-2 bg-green-50 rounded">
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span className="truncate">{teacher.teacher_name}</span>
                  </div>
                ))
              ) : (
                <div className="flex flex-wrap gap-2">
                  {submittedTeachers.map((teacher) => (
                    <div key={teacher.user_id} className="flex flex-col items-center gap-1" title={teacher.teacher_name}>
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
                      <span className="text-xs truncate max-w-[48px]">{teacher.teacher_name?.split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <XCircle className="h-5 w-5 text-red-600" />
              <h4 className="font-semibold">Not Yet Submitted ({notSubmittedTeachers.length})</h4>
            </div>
            <div className="space-y-2">
              {notSubmittedTeachers.length === 0 ? (
                <p className="text-sm text-muted-foreground">All teachers have submitted!</p>
              ) : displayMode === 'text' ? (
                notSubmittedTeachers.map((teacher) => (
                  <div key={teacher.user_id} className="flex items-center gap-2 text-sm p-2 bg-red-50 rounded">
                    <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    <span className="truncate">{teacher.teacher_name}</span>
                  </div>
                ))
              ) : (
                <div className="flex flex-wrap gap-2">
                  {notSubmittedTeachers.map((teacher) => (
                    <div key={teacher.user_id} className="flex flex-col items-center gap-1" title={teacher.teacher_name}>
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
                      <span className="text-xs truncate max-w-[48px]">{teacher.teacher_name?.split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          <strong>Completion Rate:</strong> {managedTeachers.length > 0 
            ? Math.round((submittedTeachers.length / managedTeachers.length) * 100) 
            : 0}%
        </div>
      </Card>

      {/* Weekly Submission Calendar */}
      {profile && (
        <section className="mb-6" style={{ order: 2 }} aria-label="Weekly submission calendar">
          <WeeklySubmissionCalendar
            schoolName={profile.school}
            managedTeachers={managedTeachers}
            submissions={submissions}
          />
        </section>
      )}

      {/* Weekly Submission Summary Grid */}
      {managedTeachers.length > 0 && (
        <section style={{ order: 3 }} aria-label="Weekly submission summary">
          <WeeklySubmissionSummary
            managedTeachers={managedTeachers}
            submissions={submissions}
            schoolName={profile?.school || ""}
          />
        </section>
      )}

      {/* Charts Section */}
      <section className="mb-6 grid gap-6 md:grid-cols-2" style={{ order: 5 }} aria-label="Submission charts">
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
                  // Only show label if value > 0
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
                      textAnchor={x > cx ? 'start' : 'end'}
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
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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

      {/* Account Info Card */}
      {profile && (
        <Card className="order-6 mb-6 border-[#D8D0C4] bg-[#FFFCF7] p-5 shadow-[0_10px_30px_rgba(20,32,25,0.06)] sm:p-6">
          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="w-20 h-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-border">
                {profile.profile_image_url ? (
                  <img 
                    src={profile.profile_image_url} 
                    alt={profile.teacher_name || "Principal"} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserCircle className="h-12 w-12" style={{ color: "#236130" }} />
                )}
              </div>
              <label 
                htmlFor="principalProfileImage" 
                className="absolute -bottom-2 -right-2 flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border-4 border-[#FFFCF7] bg-[#236130] text-white shadow-md transition-colors hover:bg-[#173F2A] focus-within:ring-2 focus-within:ring-[#D6A73D]"
                aria-label="Upload principal profile photo"
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
              </label>
              <input
                id="principalProfileImage"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleProfileImageUpload(file);
                }}
                disabled={uploadingProfile}
              />
            </div>
            <div className="flex-1">
              <h2 className="font-display mb-2 text-xl font-semibold text-[#173F2A]">
                Account Information
              </h2>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-semibold">Name:</span> {profile.teacher_name}
                </div>
                <div>
                  <span className="font-semibold">Email:</span> {profile.email}
                </div>
                <div>
                  <span className="font-semibold">School:</span> {profile.school}
                </div>
                <div>
                  <span className="font-semibold">District:</span> {profile.district_name || "N/A"}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Supervisor Info Card */}
      {supervisorInfo && (
        <Card className="order-7 mb-6 border-[#D8D0C4] bg-[#FFFCF7] p-5 shadow-none sm:p-6">
          <h2 className="font-display mb-3 text-lg font-semibold text-[#173F2A]">
            Your District Supervisor
          </h2>
          <div className="flex items-center gap-4">
            <div className="w-20 h-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-border">
              {supervisorInfo.profile_image_url ? (
                <img 
                  src={supervisorInfo.profile_image_url} 
                  alt={supervisorInfo.teacher_name || "Supervisor"} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserCircle className="h-12 w-12" style={{ color: "#236130" }} />
              )}
            </div>
            <div>
              <p className="font-semibold text-lg">{supervisorInfo.teacher_name}</p>
              <p className="text-sm text-muted-foreground">{supervisorInfo.email}</p>
              <p className="text-xs text-muted-foreground mt-1">District Supervisor</p>
            </div>
          </div>
        </Card>
      )}

      {/* Teacher Management Section */}
      {profile && (
        <section id="manage-teachers" className="order-8 mb-6 scroll-mt-24" aria-label="Teacher management">
          <TeacherManagement 
            schoolName={profile.school}
            districtName={profile.district_name || ""}
            principalId={profile.user_id}
            teachers={managedTeachers}
            onRefresh={fetchSubmissions}
          />
        </section>
      )}


      </div>

      <SubmissionsReportModal
        open={showReportModal}
        onOpenChange={setShowReportModal}
        submissions={submissions}
        schoolName={profile?.school || ""}
        principalName={profile?.full_name || ""}
      />
      
    </main>
  );
}

function DashboardEmptyState() {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E8EFE8] text-[#236130]">
        <FileText className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="font-display mt-4 text-xl font-semibold text-[#173F2A]">No submissions yet</p>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#526159]">New teacher submissions will appear here as soon as they are received.</p>
    </div>
  );
}

type SubmissionCardProps = {
  submission: Submission;
  onStatusUpdate: (id: string, status: string, notes?: string) => void;
  compact?: boolean;
};

function SubmissionCard({ submission, onStatusUpdate, compact = false }: SubmissionCardProps) {
  const [notes, setNotes] = useState(submission.principal_notes || "");
  const [showNotes, setShowNotes] = useState(false);

  const statusStyles = submission.status === "reviewed"
    ? "bg-[#E3EFE5] text-[#17613A]"
    : submission.status === "returned"
      ? "bg-[#F7E3DE] text-[#A83224]"
      : "bg-[#F7ECD1] text-[#8A5A00]";

  const statusLabel = submission.status === "reviewed"
    ? "Reviewed"
    : submission.status === "returned"
      ? "Needs revision"
      : "For review";

  return (
    <article className={`border-b border-[#E4DDD2] bg-[#FFFCF7] p-4 transition-colors last:border-b-0 hover:bg-white sm:p-5 ${compact ? "" : ""}`}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,auto)] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-[#142019] sm:text-lg">{submission.teacher_name}</h3>
            <span className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-bold ${statusStyles}`}>{statusLabel}</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-[#35443B]">{submission.subject} · {submission.grade_level} ({submission.section})</p>
          <div className={`mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs leading-5 text-[#526159] ${compact ? "sm:text-sm" : ""}`}>
            <span className="tabular-nums">Week: {new Date(submission.week_start).toLocaleDateString()} – {new Date(submission.week_end).toLocaleDateString()}</span>
            <span className="tabular-nums">Submitted: {new Date(submission.created_at).toLocaleDateString()}</span>
          </div>
          
          {showNotes && (
            <div className="mt-4 rounded-lg border border-[#D8D0C4] bg-[#F8F3EB] p-3">
              <label htmlFor={`notes-${submission.id}`} className="mb-2 block text-sm font-semibold text-[#173F2A]">Notes for {submission.teacher_name}</label>
              <Textarea
                id={`notes-${submission.id}`}
                placeholder="Add notes for the teacher..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mb-3 min-h-28 border-[#CFC6B9] bg-white focus-visible:ring-[#236130]"
              />
              <Button 
                onClick={() => {
                  onStatusUpdate(submission.id, submission.status, notes);
                  setShowNotes(false);
                }}
                className="min-h-11 bg-[#236130] text-white hover:bg-[#173F2A]"
              >
                Save Notes
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex min-w-0 flex-col gap-3">
          <Select
            value={submission.status}
            onValueChange={(value) => onStatusUpdate(submission.id, value)}
          >
            <SelectTrigger className="min-h-11 border-[#CFC6B9] bg-white text-[#142019]" aria-label={`Update status for ${submission.teacher_name}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="returned">Returned</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button className="min-h-11 bg-[#236130] px-4 text-white hover:bg-[#173F2A]" asChild>
              <a
                href={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(submission.file_url)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${submission.teacher_name}'s submission in a new tab`}
              >
                <ExternalLink className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Open
              </a>
            </Button>
            <DocumentViewer 
              fileUrl={submission.file_url}
              fileName={`${submission.teacher_name}_${submission.subject}`}
            />
            <Button variant="outline" asChild className="min-h-11 min-w-11 border-[#CFC6B9] text-[#173F2A]">
              <a href={submission.file_url} target="_blank" rel="noopener noreferrer" download aria-label={`Download ${submission.teacher_name}'s submission`}>
                <Download className="h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
            <Button 
              variant="outline"
              onClick={() => setShowNotes(!showNotes)}
              className="min-h-11 border-[#CFC6B9] text-[#173F2A]"
              aria-expanded={showNotes}
              aria-controls={`notes-${submission.id}`}
            >
              Notes
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
