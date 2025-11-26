import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { School, Users, CheckCircle, TrendingUp, UserCircle, ExternalLink } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import DocumentViewer from "@/components/DocumentViewer";
import Footer from "@/components/layout/Footer";

import { SchoolManagement } from "@/components/SchoolManagement";

export default function SupervisorDashboard() {
  const [reports, setReports] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [teacherSubmissions, setTeacherSubmissions] = useState<any[]>([]);
  const [managedSchools, setManagedSchools] = useState<any[]>([]);

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

      if (!profileData || !profileData.district_name) {
        console.error("Supervisor profile or district not found");
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // Fetch managed schools from schools table
      const { data: managedSchoolsData } = await supabase
        .from("schools")
        .select("*")
        .eq("district_name", profileData.district_name)
        .eq("supervisor_id", user.id);
      
      setManagedSchools(managedSchoolsData || []);

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

      setReports(reportsData || []);
      setSchools(schoolsData || []);
      setTeacherSubmissions(submissionsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Group reports by school
  const schoolReports = reports.reduce((acc, report) => {
    if (!acc[report.school_name]) {
      acc[report.school_name] = [];
    }
    acc[report.school_name].push(report);
    return acc;
  }, {} as Record<string, any[]>);

  // Calculate overall statistics
  const totalSchools = Object.keys(schoolReports).length;
  const completedThisWeek = reports.filter(r => {
    const reportDate = new Date(r.week_start);
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    return reportDate >= weekStart && r.status === 'completed';
  }).length;

  const overallCompliance = reports.length > 0
    ? Math.round((reports.filter(r => r.status === 'completed').length / reports.length) * 100)
    : 0;

  const totalTeachersTracked = reports.reduce((sum, r) => sum + (r.total_teachers || 0), 0);
  const totalSubmitted = reports.reduce((sum, r) => sum + (r.submitted_teachers || 0), 0);

  // Get unique schools list
  const uniqueSchools = [...new Set(schools.map(s => s.school_name))];
  const schoolsWithReports = new Set(reports.map(r => r.school_name));
  const schoolsSubmitted = uniqueSchools.filter(s => schoolsWithReports.has(s)).length;
  const schoolsNotSubmitted = uniqueSchools.length - schoolsSubmitted;

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
  const schoolBarData = Object.entries(schoolReports).map(([schoolName, reports]) => {
    const latestReport = reports[0];
    return {
      school: schoolName.length > 15 ? schoolName.substring(0, 15) + "..." : schoolName,
      submitted: latestReport.submitted_teachers,
      total: latestReport.total_teachers,
      rate: latestReport.total_teachers > 0 
        ? Math.round((latestReport.submitted_teachers / latestReport.total_teachers) * 100)
        : 0
    };
  }).slice(0, 10);

  if (loading) {
    return (
      <div className="container py-8 flex items-center justify-center">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  // Group submissions by school and teacher
  const submissionsBySchool = teacherSubmissions.reduce((acc, sub) => {
    if (!acc[sub.school_name]) {
      acc[sub.school_name] = [];
    }
    acc[sub.school_name].push(sub);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 container py-8 max-w-7xl mx-auto">
      {/* Account Info Card */}
      {profile && (
        <Card className="p-6 mb-6" style={{ borderColor: "#236130" }}>
          <div className="flex items-start gap-4">
            <UserCircle className="h-12 w-12" style={{ color: "#236130" }} />
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2" style={{ color: "#236130" }}>
                Account Information
              </h2>
              <div className="grid md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="font-semibold">Name:</span> {profile.teacher_name}
                </div>
                <div>
                  <span className="font-semibold">Email:</span> {profile.email}
                </div>
                <div>
                  <span className="font-semibold">District:</span> {profile.district_name || "N/A"}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* School Management Section */}
      {profile && profile.district_name && (
        <div className="mb-6">
          <SchoolManagement 
            districtName={profile.district_name}
            supervisorId={profile.user_id}
            schools={managedSchools}
            onRefresh={fetchData}
          />
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: "#236130" }}>
          Supervisor Dashboard - {profile?.district_name || "District"}
        </h1>
        <p className="text-muted-foreground">
          Monitor weekly learning matrix submissions across all schools
        </p>
      </div>

      {/* Charts Section */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: "#236130" }}>
            School Compliance
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={schoolComplianceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {schoolComplianceData.map((entry, index) => (
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
            Teacher Submissions
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={teacherSubmissionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {teacherSubmissionData.map((entry, index) => (
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
            Submission Rate by School
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={schoolBarData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="school" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="rate" fill="#236130" name="Completion Rate (%)" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <School className="h-8 w-8" style={{ color: "#236130" }} />
            <div>
              <p className="text-2xl font-bold">{totalSchools}</p>
              <p className="text-sm text-muted-foreground">Schools</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{completedThisWeek}</p>
              <p className="text-sm text-muted-foreground">Completed This Week</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8" style={{ color: "#f5ca47" }} />
            <div>
              <p className="text-2xl font-bold">{overallCompliance}%</p>
              <p className="text-sm text-muted-foreground">Overall Compliance</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{totalTeachersTracked}</p>
              <p className="text-sm text-muted-foreground">Teachers Tracked</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="mb-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="by-school">By School</TabsTrigger>
          <TabsTrigger value="recent">Recent Reports</TabsTrigger>
          <TabsTrigger value="teacher-files">Teacher Files</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(schoolReports).map(([schoolName, schoolReports]) => {
              const latestReport = schoolReports[0];
              const completionRate = latestReport.total_teachers > 0
                ? Math.round((latestReport.submitted_teachers / latestReport.total_teachers) * 100)
                : 0;

              return (
                <Card key={schoolName} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-semibold text-lg">{schoolName}</h3>
                    <Badge variant={latestReport.status === 'completed' ? 'default' : 'secondary'}>
                      {latestReport.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Teachers Submitted:</span>
                      <span className="font-semibold">
                        {latestReport.submitted_teachers} / {latestReport.total_teachers}
                      </span>
                    </div>
                    
                    <Progress value={completionRate} className="h-2" />
                    
                    <div className="text-sm text-muted-foreground">
                      Week: {new Date(latestReport.week_start).toLocaleDateString()} - {new Date(latestReport.week_end).toLocaleDateString()}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {latestReport.status === 'completed' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <div className="h-4 w-4 rounded-full bg-yellow-500" />
                      )}
                      <span className="text-sm font-medium">
                        {latestReport.status === 'completed' ? 'Completed' : 'In Progress'}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="by-school" className="space-y-6">
          {Object.entries(schoolReports).map(([schoolName, schoolReports]: [string, any[]]) => (
            <Card key={schoolName} className="p-6">
              <h3 className="text-xl font-semibold mb-4" style={{ color: "#236130" }}>
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
            <Card key={report.id} className="p-4">
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
          {Object.entries(submissionsBySchool).map(([schoolName, submissions]: [string, any[]]) => (
            <Card key={schoolName} className="p-6">
              <h3 className="text-xl font-semibold mb-4" style={{ color: "#236130" }}>
                {schoolName} ({submissions.length} submissions)
              </h3>
              <div className="space-y-3">
                {submissions.map((submission) => (
                  <Card key={submission.id} className="p-4 hover:shadow-md transition-shadow">
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
                          <Button size="sm" style={{ backgroundColor: "#236130", color: "white" }}>
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
      </div>
      <Footer />
    </div>
  );
}
