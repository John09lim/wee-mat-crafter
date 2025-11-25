import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { School, Users, CheckCircle, TrendingUp } from "lucide-react";

export default function SupervisorDashboard() {
  const [reports, setReports] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch principal weekly reports
      const { data: reportsData, error: reportsError } = await supabase
        .from("principal_weekly_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (reportsError) throw reportsError;

      // Fetch school assignments
      const { data: schoolsData, error: schoolsError } = await supabase
        .from("school_assignments")
        .select("*");

      if (schoolsError) throw schoolsError;

      setReports(reportsData || []);
      setSchools(schoolsData || []);
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

  if (loading) {
    return (
      <div className="container py-8 flex items-center justify-center">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: "#236130" }}>
          Supervisor Dashboard - Bacong District
        </h1>
        <p className="text-muted-foreground">
          Monitor weekly learning matrix submissions across all schools
        </p>
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
      </Tabs>
    </div>
  );
}
