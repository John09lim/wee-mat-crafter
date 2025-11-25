import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, CheckCircle, Clock, XCircle, Eye, FileText } from "lucide-react";
import Footer from "@/components/layout/Footer";

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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f9f0eb" }}>
      <main className="flex-1 py-12">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-3" style={{ color: "#236130" }}>
              Submit Weekly Learning Matrix
            </h1>
            <p className="text-muted-foreground">
              Upload your completed WeeLMat for principal review and tracking
            </p>
          </div>
          
          <Card className="p-8 mb-8 shadow-lg" style={{ borderColor: "#236130", borderWidth: "2px" }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "#236130" }}>
                <Upload className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold" style={{ color: "#236130" }}>New Submission</h2>
                <p className="text-sm text-muted-foreground">Fill in the details below</p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
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
                size="lg"
                className="w-full text-base"
                style={{ backgroundColor: "#236130", color: "white" }}
              >
                <Upload className="mr-2 h-5 w-5" />
                {loading ? "Submitting..." : "Submit to Principal"}
              </Button>
            </form>
          </Card>

          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6" style={{ color: "#236130" }}>
              Submission History
            </h2>
            <div className="space-y-4">
            {submissions.length === 0 ? (
              <Card className="p-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No submissions yet</p>
              </Card>
            ) : (
              submissions.map((sub) => (
                <Card key={sub.id} className="p-6 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#f5ca47" }}>
                          <FileText className="h-5 w-5" style={{ color: "#236130" }} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg" style={{ color: "#236130" }}>
                            {sub.subject} - {sub.grade_level}
                          </h3>
                          <p className="text-sm text-muted-foreground">Section {sub.section}</p>
                        </div>
                      </div>
                      <div className="ml-13 space-y-1">
                        <p className="text-sm text-muted-foreground">
                          <strong>Week:</strong> {new Date(sub.week_start).toLocaleDateString()} to {new Date(sub.week_end).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <strong>Submitted:</strong> {new Date(sub.created_at).toLocaleDateString()}
                        </p>
                        {sub.principal_notes && (
                          <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: "#f5ca47", opacity: 0.2 }}>
                            <p className="text-sm">
                              <strong style={{ color: "#236130" }}>Principal's Note:</strong> {sub.principal_notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {getStatusIcon(sub.status)}
                      <span className="text-sm capitalize font-semibold">{sub.status}</span>
                    </div>
                  </div>
                </Card>
              ))
            )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
