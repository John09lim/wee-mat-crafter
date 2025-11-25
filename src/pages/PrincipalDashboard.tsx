import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Download, CheckCircle, Users, BookOpen, Calendar } from "lucide-react";

export default function PrincipalDashboard() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      // Get principal's profile to filter by their school
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("school, district_name")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        toast.error("Profile not found");
        setLoading(false);
        return;
      }

      // Query ONLY submissions from principal's school
      const { data, error } = await supabase
        .from("teacher_submissions")
        .select("*")
        .eq("school_name", profile.school)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error:", error);
        toast.error("Failed to load submissions");
      } else {
        setSubmissions(data || []);
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

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold" style={{ color: "#236130" }}>Principal Dashboard</h1>
        <Button 
          onClick={markWeekComplete}
          style={{ backgroundColor: "#f5ca47", color: "#236130" }}
          className="hover:opacity-90"
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Mark This Week as Completed
        </Button>
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
