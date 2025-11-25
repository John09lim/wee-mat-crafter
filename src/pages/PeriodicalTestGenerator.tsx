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
import { ClipboardList, Loader2, Download, ArrowLeft, Home } from "lucide-react";

const PeriodicalTestGenerator = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [form, setForm] = useState({
    subject: "",
    gradeLevel: "",
    section: "",
    quarter: "1st",
    competencies: "",
    multipleChoice: "20",
    trueFalse: "10",
    identification: "10",
    essay: "5",
    language: "English",
  });

  useEffect(() => {
    document.title = "Periodical Test Generator - Premium";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", "Generate periodical tests and TOS with AI");
    }
  }, []);

  const handleGenerate = async () => {
    if (!form.subject || !form.competencies) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    
    try {
      const { data: result, error } = await supabase.functions.invoke("generate-periodical-test", {
        body: form,
      });

      if (error) throw error;
      if (!result?.docxUrl) throw new Error("Invalid response");

      setData(result);
      toast.success("Periodical test generated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate test");
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
          <Button variant="ghost" onClick={() => navigate("/premium")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Premium
          </Button>
        </div>

        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <ClipboardList className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold">Periodical Test & TOS Generator</h1>
          </div>
          <p className="text-muted-foreground">Generate assessments with Table of Specifications</p>
        </div>

        {!data ? (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Generate Periodical Test & TOS</CardTitle>
              <CardDescription>Configure your test parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Subject *</Label>
                  <Input 
                    value={form.subject}
                    onChange={(e) => setForm({...form, subject: e.target.value})}
                    placeholder="e.g., Science"
                  />
                </div>
                <div>
                  <Label>Grade Level *</Label>
                  <Input 
                    value={form.gradeLevel}
                    onChange={(e) => setForm({...form, gradeLevel: e.target.value})}
                    placeholder="e.g., Grade 8"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Section</Label>
                  <Input 
                    value={form.section}
                    onChange={(e) => setForm({...form, section: e.target.value})}
                    placeholder="e.g., Section B"
                  />
                </div>
                <div>
                  <Label>Quarter</Label>
                  <Select value={form.quarter} onValueChange={(v) => setForm({...form, quarter: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1st">1st Quarter</SelectItem>
                      <SelectItem value="2nd">2nd Quarter</SelectItem>
                      <SelectItem value="3rd">3rd Quarter</SelectItem>
                      <SelectItem value="4th">4th Quarter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Competencies *</Label>
                <Textarea 
                  value={form.competencies}
                  onChange={(e) => setForm({...form, competencies: e.target.value})}
                  placeholder="Enter the competencies to cover (one per line)..."
                  rows={4}
                />
              </div>
              <div className="border rounded-lg p-4 space-y-3">
                <Label className="text-base font-semibold">Question Distribution</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Multiple Choice</Label>
                    <Input 
                      type="number"
                      value={form.multipleChoice}
                      onChange={(e) => setForm({...form, multipleChoice: e.target.value})}
                      min="0"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">True/False</Label>
                    <Input 
                      type="number"
                      value={form.trueFalse}
                      onChange={(e) => setForm({...form, trueFalse: e.target.value})}
                      min="0"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Identification</Label>
                    <Input 
                      type="number"
                      value={form.identification}
                      onChange={(e) => setForm({...form, identification: e.target.value})}
                      min="0"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Essay</Label>
                    <Input 
                      type="number"
                      value={form.essay}
                      onChange={(e) => setForm({...form, essay: e.target.value})}
                      min="0"
                    />
                  </div>
                </div>
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
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ClipboardList className="w-4 h-4 mr-2" />}
                Generate Test & TOS
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                Periodical Test Ready
              </CardTitle>
              <CardDescription>Your test and TOS have been generated successfully</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={() => downloadFile(data.docxUrl, "PeriodicalTest.docx")} className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Download Test & TOS
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
                <Button variant="outline" onClick={() => navigate("/premium")} className="flex-1">
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

export default PeriodicalTestGenerator;
