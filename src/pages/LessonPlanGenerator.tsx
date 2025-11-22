import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GraduationCap, Loader2, Download, ArrowLeft, Home } from "lucide-react";

const LessonPlanGenerator = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [form, setForm] = useState({
    subject: "",
    gradeLevel: "",
    section: "",
    topic: "",
    competencies: "",
    duration: "",
    language: "English",
  });

  useEffect(() => {
    document.title = "Lesson Plan Generator - Premium";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", "Generate comprehensive lesson plans with AI");
    }
  }, []);

  const handleGenerate = async () => {
    if (!form.subject || !form.topic || !form.competencies) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    
    try {
      const { data: result, error } = await supabase.functions.invoke("generate-lesson-plan", {
        body: form,
      });

      if (error) throw error;
      if (!result?.docxUrl) throw new Error("Invalid response");

      setData(result);
      toast.success("Lesson plan generated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate lesson plan");
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success("Download started!");
    } catch (error) {
      toast.error("Failed to download file");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/weelmatgeneratorpremium")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Premium
          </Button>
        </div>

        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <GraduationCap className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold">Lesson Plan Generator</h1>
          </div>
          <p className="text-muted-foreground">Create comprehensive lesson plans following DepEd format</p>
        </div>

        {!data ? (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Generate Lesson Plan</CardTitle>
              <CardDescription>Fill in the details to create your lesson plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Subject *</Label>
                  <Input 
                    value={form.subject}
                    onChange={(e) => setForm({...form, subject: e.target.value})}
                    placeholder="e.g., Mathematics"
                  />
                </div>
                <div>
                  <Label>Grade Level *</Label>
                  <Input 
                    value={form.gradeLevel}
                    onChange={(e) => setForm({...form, gradeLevel: e.target.value})}
                    placeholder="e.g., Grade 7"
                  />
                </div>
              </div>
              <div>
                <Label>Section</Label>
                <Input 
                  value={form.section}
                  onChange={(e) => setForm({...form, section: e.target.value})}
                  placeholder="e.g., Section A"
                />
              </div>
              <div>
                <Label>Topic/Lesson Title *</Label>
                <Input 
                  value={form.topic}
                  onChange={(e) => setForm({...form, topic: e.target.value})}
                  placeholder="e.g., Introduction to Algebra"
                />
              </div>
              <div>
                <Label>Learning Competencies *</Label>
                <Textarea 
                  value={form.competencies}
                  onChange={(e) => setForm({...form, competencies: e.target.value})}
                  placeholder="Enter the learning competencies..."
                  rows={4}
                />
              </div>
              <div>
                <Label>Duration</Label>
                <Input 
                  value={form.duration}
                  onChange={(e) => setForm({...form, duration: e.target.value})}
                  placeholder="e.g., 1 hour"
                />
              </div>
              <div>
                <Label>Language</Label>
                <Select value={form.language} onValueChange={(v) => setForm({...form, language: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Filipino">Filipino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleGenerate} disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <GraduationCap className="w-4 h-4 mr-2" />}
                Generate Lesson Plan
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                Lesson Plan Ready
              </CardTitle>
              <CardDescription>Your lesson plan has been generated successfully</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={() => downloadFile(data.docxUrl, "LessonPlan.docx")} className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Download Lesson Plan
                </Button>
                <Button variant="outline" onClick={() => navigate("/dashboard")}>
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="secondary" onClick={() => setData(null)} className="flex-1">
                  Generate Another
                </Button>
                <Button variant="outline" onClick={() => navigate("/weelmatgeneratorpremium")} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Premium
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LessonPlanGenerator;
