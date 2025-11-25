import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, CheckCircle, Clock, XCircle, Eye, FileText } from "lucide-react";

export default function TeacherSubmission() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    teacherName: "",
    gradeLevel: "",
    section: "",
    subject: "",
    weekStart: "",
    weekEnd: "",
    principalId: ""
  });

  useEffect(() => {
    checkAuth();
    fetchSubmissions();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchSubmissions = async () => {
    const { data, error } = await supabase
      .from("teacher_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching submissions:", error);
    } else {
      setSubmissions(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a file to upload");
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const submitFormData = new FormData();
      submitFormData.append("file", file);
      submitFormData.append("teacherName", formData.teacherName);
      submitFormData.append("gradeLevel", formData.gradeLevel);
      submitFormData.append("section", formData.section);
      submitFormData.append("subject", formData.subject);
      submitFormData.append("weekStart", formData.weekStart);
      submitFormData.append("weekEnd", formData.weekEnd);
      submitFormData.append("principalId", formData.principalId);

      const response = await fetch(
        `https://velpueasbsrptocrjljg.supabase.co/functions/v1/submit-weelmat`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: submitFormData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Submission failed");
      }

      toast.success("Your WeeLMat has been submitted to the Principal for tracking!");
      setFile(null);
      setFormData({
        teacherName: "",
        gradeLevel: "",
        section: "",
        subject: "",
        weekStart: "",
        weekEnd: "",
        principalId: ""
      });
      fetchSubmissions();
    } catch (error: any) {
      console.error("Submission error:", error);
      toast.error(error.message || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "accepted": return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "pending": return <Clock className="h-5 w-5 text-yellow-600" />;
      case "returned": return <XCircle className="h-5 w-5 text-red-600" />;
      case "reviewed": return <Eye className="h-5 w-5 text-blue-600" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <div className="container py-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6" style={{ color: "#236130" }}>Submit Weekly Learning Matrix</h1>
      
      <Card className="p-6 mb-8 border-2" style={{ borderColor: "#f5ca47" }}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Teacher Name</Label>
              <Input
                value={formData.teacherName}
                onChange={(e) => setFormData({ ...formData, teacherName: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Grade Level</Label>
              <Input
                value={formData.gradeLevel}
                onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Section</Label>
              <Input
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Subject</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Week Start</Label>
              <Input
                type="date"
                value={formData.weekStart}
                onChange={(e) => setFormData({ ...formData, weekStart: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Week End</Label>
              <Input
                type="date"
                value={formData.weekEnd}
                onChange={(e) => setFormData({ ...formData, weekEnd: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label>Upload WeeLMat (DOCX or PDF)</Label>
            <Input
              type="file"
              accept=".docx,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
            />
            <p className="text-sm text-muted-foreground mt-1">Maximum file size: 10MB</p>
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            style={{ backgroundColor: "#236130", color: "white" }}
            className="hover:opacity-90"
          >
            <Upload className="mr-2 h-4 w-4" />
            {loading ? "Submitting..." : "Submit to Principal"}
          </Button>
        </form>
      </Card>

      <div>
        <h2 className="text-2xl font-semibold mb-4" style={{ color: "#236130" }}>My Submissions</h2>
        <div className="space-y-4">
          {submissions.length === 0 ? (
            <p className="text-muted-foreground">No submissions yet</p>
          ) : (
            submissions.map((sub) => (
              <Card key={sub.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{sub.subject} - {sub.grade_level}</h3>
                    <p className="text-sm text-muted-foreground">
                      Section {sub.section} | Week: {new Date(sub.week_start).toLocaleDateString()} to {new Date(sub.week_end).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Submitted: {new Date(sub.created_at).toLocaleDateString()}
                    </p>
                    {sub.principal_notes && (
                      <p className="text-sm mt-2 p-2 bg-muted rounded">
                        <strong>Principal's Note:</strong> {sub.principal_notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {getStatusIcon(sub.status)}
                    <span className="text-sm capitalize font-medium">{sub.status}</span>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
