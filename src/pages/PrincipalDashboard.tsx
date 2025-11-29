import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, CheckCircle, Users, BookOpen, Calendar, UserCircle, CheckCircle2, XCircle, Bell, ExternalLink, Upload } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import DocumentViewer from "@/components/DocumentViewer";
import Footer from "@/components/layout/Footer";

import { TeacherManagement } from "@/components/TeacherManagement";

export default function PrincipalDashboard() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [profile, setProfile] = useState<any>(null);
  const [allTeachers, setAllTeachers] = useState<any[]>([]);
  const [newSubmissionsCount, setNewSubmissionsCount] = useState(0);
  const initialLoadComplete = useRef(false);
  const [managedTeachers, setManagedTeachers] = useState<any[]>([]);
  const [uploadingProfile, setUploadingProfile] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  // Realtime subscription for new submissions
  useEffect(() => {
    if (!profile?.school) return;

    const channel = supabase
      .channel('teacher-submissions-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'teacher_submissions',
          filter: `school_name=eq.${profile.school}`
        },
        (payload) => {
          if (initialLoadComplete.current) {
            const newSubmission = payload.new;
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
  }, [profile?.school]);

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

      setProfile(profileData);

      // Fetch managed teachers from school_assignments
      const { data: managedTeachersData } = await supabase
        .from("school_assignments")
        .select("*")
        .eq("school_name", profileData.school)
        .eq("principal_id", user.id);
      
      setManagedTeachers(managedTeachersData || []);

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

        const enrichedTeachers = teachersData.map(t => {
          const profile = teacherProfiles?.find(p => p.user_id === t.user_id);
          return {
            ...t,
            teacher_name: profile?.teacher_name || "Unknown Teacher"
          };
        });
        setAllTeachers(enrichedTeachers || []);
      } else {
        setAllTeachers([]);
      }

      // Query ONLY submissions from principal's school
      const { data, error } = await supabase
        .from("teacher_submissions")
        .select("*")
        .eq("school_name", profileData.school)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error:", error);
        toast.error("Failed to load submissions");
      } else {
        setSubmissions(data || []);
        initialLoadComplete.current = true;
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Failed to load submissions");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string, notes?: string) => {
    const updateData: any = { status: newStatus };
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

      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const { error } = await supabase
        .from("principal_weekly_reports")
        .insert({
          principal_id: user.id,
          school_name: profile.school,
          district_name: profile.district_name,
          week_start: startOfWeek.toISOString().split('T')[0],
          week_end: endOfWeek.toISOString().split('T')[0],
          status: "completed",
          total_teachers: submissions.length,
          submitted_teachers: submissions.filter(s => s.status === 'accepted').length
        });

      if (error) throw error;
      toast.success("Weekly report sent to Supervisor!");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Failed to mark week as complete");
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
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Failed to upload profile image");
    } finally {
      setUploadingProfile(false);
    }
  };

  const groupedByTeacher = submissions.reduce((acc, sub) => {
    if (!acc[sub.teacher_name]) acc[sub.teacher_name] = [];
    acc[sub.teacher_name].push(sub);
    return acc;
  }, {} as Record<string, any[]>);

  const groupedBySubject = submissions.reduce((acc, sub) => {
    if (!acc[sub.subject]) acc[sub.subject] = [];
    acc[sub.subject].push(sub);
    return acc;
  }, {} as Record<string, any[]>);

  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    accepted: submissions.filter(s => s.status === 'accepted').length,
    returned: submissions.filter(s => s.status === 'returned').length,
  };

  // Calculate current week's submissions
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const currentWeekSubmissions = submissions.filter(s => 
    new Date(s.created_at) >= startOfWeek
  );
  
  const submittedTeacherIds = new Set(currentWeekSubmissions.map(s => s.user_id));
  const submittedTeachers = allTeachers.filter(t => submittedTeacherIds.has(t.user_id));
  const notSubmittedTeachers = allTeachers.filter(t => !submittedTeacherIds.has(t.user_id));

  // Data for charts
  const statusChartData = [
    { name: "Accepted", value: stats.accepted, color: "#10b981" },
    { name: "Pending", value: stats.pending, color: "#f59e0b" },
    { name: "Returned", value: stats.returned, color: "#ef4444" }
  ];

  const submissionCompletionData = [
    { name: "Submitted", value: submittedTeachers.length, color: "#10b981" },
    { name: "Not Submitted", value: notSubmittedTeachers.length, color: "#ef4444" }
  ];

  if (loading) {
    return (
      <div className="container py-8 flex items-center justify-center">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 container py-8 max-w-7xl mx-auto">
      {/* Account Info Card */}
      {profile && (
        <Card className="p-6 mb-6" style={{ borderColor: "#236130" }}>
          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
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
                className="absolute -bottom-1 -right-1 cursor-pointer"
              >
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: "#236130" }}
                >
                  <Upload className="w-4 h-4 text-white" />
                </div>
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
              <h2 className="text-xl font-bold mb-2" style={{ color: "#236130" }}>
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

      {/* Teacher Management Section */}
      {profile && (
        <div className="mb-6">
          <TeacherManagement 
            schoolName={profile.school}
            districtName={profile.district_name || ""}
            principalId={profile.user_id}
            teachers={managedTeachers}
            onRefresh={fetchSubmissions}
          />
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold" style={{ color: "#236130" }}>Principal Dashboard</h1>
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
                style={{ borderColor: "#236130", color: "#236130" }}
              >
                Clear
              </Button>
            </div>
          )}
        </div>
        <Button 
          onClick={markWeekComplete}
          style={{ backgroundColor: "#f5ca47", color: "#236130" }}
          className="hover:opacity-90"
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Mark This Week as Completed
        </Button>
      </div>

      {/* Teacher Tracking for Current Week */}
      <Card className="p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: "#236130" }}>
          This Week's Teacher Submissions
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold">Submitted ({submittedTeachers.length})</h4>
            </div>
            <div className="space-y-2">
              {submittedTeachers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No submissions yet</p>
              ) : (
                submittedTeachers.map((teacher) => (
                  <div key={teacher.user_id} className="flex items-center gap-2 text-sm p-2 bg-green-50 rounded">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>{teacher.teacher_name}</span>
                  </div>
                ))
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
              ) : (
                notSubmittedTeachers.map((teacher) => (
                  <div key={teacher.user_id} className="flex items-center gap-2 text-sm p-2 bg-red-50 rounded">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span>{teacher.teacher_name}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          <strong>Completion Rate:</strong> {allTeachers.length > 0 
            ? Math.round((submittedTeachers.length / allTeachers.length) * 100) 
            : 0}%
        </div>
      </Card>

      {/* Charts Section */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: "#236130" }}>
            Submission Status Distribution
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: "#236130" }}>
            Teacher Completion Rate
          </h3>
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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8" style={{ color: "#236130" }} />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Submissions</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">Pending Review</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{stats.accepted}</p>
              <p className="text-sm text-muted-foreground">Accepted</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{Object.keys(groupedByTeacher).length}</p>
              <p className="text-sm text-muted-foreground">Teachers</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All Submissions</TabsTrigger>
          <TabsTrigger value="by-teacher">By Teacher</TabsTrigger>
          <TabsTrigger value="by-subject">By Subject</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {submissions.map((sub) => (
            <SubmissionCard 
              key={sub.id} 
              submission={sub} 
              onStatusUpdate={updateStatus}
            />
          ))}
        </TabsContent>

        <TabsContent value="by-teacher" className="space-y-6">
          {Object.entries(groupedByTeacher).map(([teacher, subs]: [string, any[]]) => (
            <div key={teacher}>
              <h3 className="text-xl font-semibold mb-3" style={{ color: "#236130" }}>
                {teacher} ({subs.length} submissions)
              </h3>
              <div className="space-y-4">
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
          {Object.entries(groupedBySubject).map(([subject, subs]: [string, any[]]) => (
            <div key={subject}>
              <h3 className="text-xl font-semibold mb-3" style={{ color: "#236130" }}>
                {subject} ({subs.length} submissions)
              </h3>
              <div className="space-y-4">
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
      </Tabs>
      </div>
      <Footer />
    </div>
  );
}

function SubmissionCard({ submission, onStatusUpdate }: { submission: any; onStatusUpdate: (id: string, status: string, notes?: string) => void }) {
  const [notes, setNotes] = useState(submission.principal_notes || "");
  const [showNotes, setShowNotes] = useState(false);

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{submission.teacher_name}</h3>
          <p className="text-sm font-medium">{submission.subject} - {submission.grade_level} ({submission.section})</p>
          <p className="text-sm text-muted-foreground">
            Week: {new Date(submission.week_start).toLocaleDateString()} to {new Date(submission.week_end).toLocaleDateString()}
          </p>
          <p className="text-sm text-muted-foreground">
            Submitted: {new Date(submission.created_at).toLocaleDateString()}
          </p>
          
          {showNotes && (
            <div className="mt-3">
              <Textarea
                placeholder="Add notes for the teacher..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mb-2"
              />
              <Button 
                size="sm" 
                onClick={() => {
                  onStatusUpdate(submission.id, submission.status, notes);
                  setShowNotes(false);
                }}
                style={{ backgroundColor: "#236130", color: "white" }}
              >
                Save Notes
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex flex-col gap-2 min-w-[200px]">
          <Select
            value={submission.status}
            onValueChange={(value) => onStatusUpdate(submission.id, value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="returned">Returned</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex gap-2">
            <Button size="sm" style={{ backgroundColor: "#236130", color: "white" }} asChild>
              <a
                href={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(submission.file_url)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Open
              </a>
            </Button>
            <DocumentViewer 
              fileUrl={submission.file_url}
              fileName={`${submission.teacher_name}_${submission.subject}`}
            />
            <Button size="sm" variant="outline" asChild className="flex-1">
              <a href={submission.file_url} target="_blank" rel="noopener noreferrer" download>
                <Download className="h-4 w-4" />
              </a>
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setShowNotes(!showNotes)}
              className="flex-1"
            >
              Notes
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
