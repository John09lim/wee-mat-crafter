import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, UserCircle, ArrowLeft, ExternalLink } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import DocumentViewer from "@/components/DocumentViewer";

interface PrincipalDashboardViewProps {
  schoolName: string;
  districtName: string;
  onClose: () => void;
}

export function PrincipalDashboardView({ schoolName, districtName, onClose }: PrincipalDashboardViewProps) {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [displayMode, setDisplayMode] = useState<'text' | 'image'>('text');

  // Hardcoded to December 1-5, 2025 to match other components
  const currentMonday = new Date(2025, 11, 1);
  currentMonday.setHours(0, 0, 0, 0);
  
  const currentFriday = new Date(currentMonday);
  currentFriday.setDate(currentMonday.getDate() + 4);
  currentFriday.setHours(23, 59, 59, 999);

  useEffect(() => {
    fetchSchoolData();
  }, [schoolName]);

  const fetchSchoolData = async () => {
    try {
      // Fetch school info
      const { data: schoolData } = await supabase
        .from("schools")
        .select("*")
        .eq("school_name", schoolName)
        .eq("district_name", districtName)
        .maybeSingle();

      setSchoolInfo(schoolData);

      // Fetch all teachers from this school
      const { data: teachersData, error: teachersError } = await supabase
        .from("school_assignments")
        .select("*")
        .eq("school_name", schoolName)
        .eq("district_name", districtName);

      if (teachersError) throw teachersError;
      setTeachers(teachersData || []);

      // Fetch submissions for current week
      const weekStartStr = currentMonday.toISOString().split('T')[0];
      const weekEndStr = currentFriday.toISOString().split('T')[0];

      const { data: submissionsData, error: submissionsError } = await supabase
        .from("teacher_submissions")
        .select("*")
        .eq("school_name", schoolName)
        .gte("week_start", weekStartStr)
        .lte("week_end", weekEndStr)
        .order("created_at", { ascending: false });

      if (submissionsError) throw submissionsError;
      setSubmissions(submissionsData || []);

    } catch (error) {
      console.error("Error fetching school data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Calculate submission status
  const submittedUserIds = new Set(submissions.map(s => s.user_id));
  const submittedTeachers = teachers.filter(t => submittedUserIds.has(t.user_id));
  const notSubmittedTeachers = teachers.filter(t => !submittedUserIds.has(t.user_id));

  // Chart data
  const submissionCompletionData = [
    { name: "Submitted", value: submittedTeachers.length, color: "#1eba83" },
    { name: "Not Submitted", value: notSubmittedTeachers.length, color: "#ef4444" }
  ];

  const statusChartData = [
    { name: "Reviewed", value: submissions.filter(s => s.status === 'reviewed').length, color: "#1eba83" },
    { name: "Pending", value: submissions.filter(s => s.status === 'pending').length, color: "#f59e0b" },
    { name: "Returned", value: submissions.filter(s => s.status === 'returned').length, color: "#ef4444" }
  ];

  if (loading) {
    return (
      <Card className="p-6">
        <p>Loading school dashboard...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onClose} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to District View
        </Button>
      </div>

      {/* School Info Card */}
      <Card className="p-6" style={{ borderColor: "#236130" }}>
        <h2 className="text-2xl font-bold mb-2" style={{ color: "#236130" }}>
          {schoolName}
        </h2>
        <p className="text-muted-foreground mb-2">{districtName}</p>
        {schoolInfo?.principal_name && (
          <p className="text-sm">
            <span className="font-semibold">Principal:</span> {schoolInfo.principal_name}
          </p>
        )}
        <div className="mt-4 flex gap-4 text-sm">
          <Badge variant="outline" className="text-base px-3 py-1">
            {teachers.length} Teachers
          </Badge>
          <Badge className="text-base px-3 py-1 bg-[#1eba83]">
            {submittedTeachers.length} Submitted
          </Badge>
          <Badge variant="destructive" className="text-base px-3 py-1">
            {notSubmittedTeachers.length} Not Submitted
          </Badge>
        </div>
      </Card>

      {/* Charts Section */}
      <div className="grid md:grid-cols-2 gap-6">
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
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: "#236130" }}>
            This Week's Teacher Submissions (Dec 1-5, 2025)
          </h3>
          <div className="flex gap-2">
            <Button
              variant={displayMode === 'text' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDisplayMode('text')}
              style={displayMode === 'text' ? { backgroundColor: "#236130" } : { borderColor: "#236130", color: "#236130" }}
            >
              Text
            </Button>
            <Button
              variant={displayMode === 'image' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDisplayMode('image')}
              style={displayMode === 'image' ? { backgroundColor: "#236130" } : { borderColor: "#236130", color: "#236130" }}
            >
              Image
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Submitted Teachers */}
          <div className="border rounded-lg p-4 bg-green-50 border-green-200">
            <h4 className="font-semibold text-[#1eba83] mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Submitted ({submittedTeachers.length})
            </h4>
            <div className={displayMode === 'image' ? "flex flex-wrap gap-3" : "space-y-2"}>
              {submittedTeachers.map((teacher) => {
                const submission = submissions.find(s => s.user_id === teacher.user_id);
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
                  <div key={teacher.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#1eba83]" />
                      <span className="text-sm font-medium">{teacher.teacher_name}</span>
                      <Badge variant="outline" className="text-xs">{teacher.grade_level}</Badge>
                    </div>
                    {submission && (
                      <div className="flex gap-2">
                        <DocumentViewer fileUrl={submission.file_url} fileName={`${teacher.teacher_name}_submission`} />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const encodedUrl = encodeURIComponent(submission.file_url);
                            window.open(`https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`, "_blank");
                          }}
                        >
                          <ExternalLink className="h-3 w-3" />
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
          <div className="border rounded-lg p-4 bg-red-50 border-red-200">
            <h4 className="font-semibold text-red-500 mb-3 flex items-center gap-2">
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
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: "#236130" }}>
          Recent Submissions
        </h3>
        <div className="space-y-3">
          {submissions.slice(0, 10).map((sub) => (
            <div key={sub.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">{sub.teacher_name}</p>
                <p className="text-sm text-muted-foreground">
                  {sub.subject} • {sub.grade_level} • Section {sub.section}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge 
                  variant={sub.status === 'reviewed' ? 'default' : sub.status === 'returned' ? 'destructive' : 'secondary'}
                  className={sub.status === 'reviewed' ? 'bg-[#1eba83]' : ''}
                >
                  {sub.status}
                </Badge>
                <DocumentViewer fileUrl={sub.file_url} fileName={`${sub.teacher_name}_${sub.subject}`} />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const encodedUrl = encodeURIComponent(sub.file_url);
                    window.open(`https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`, "_blank");
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {submissions.length === 0 && (
            <p className="text-center text-muted-foreground py-4">No submissions found for this week.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
