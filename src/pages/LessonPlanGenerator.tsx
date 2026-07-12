import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Download, GraduationCap, Home, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { GeneratorShell } from "@/components/workspace/GeneratorShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

interface LessonPlanResult {
  docxUrl: string;
}

const LessonPlanGenerator = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LessonPlanResult | null>(null);
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
    document.title = "Lesson Plan Generator - WeeLMat";
    document.querySelector('meta[name="description"]')?.setAttribute("content", "Generate an editable lesson-plan draft with WeeLMat.");
  }, []);

  const handleGenerate = async () => {
    if (!form.subject || !form.topic || !form.competencies) {
      toast.error("Complete the subject, lesson title, and competencies before generating.");
      return;
    }

    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("generate-lesson-plan", { body: form });
      if (error) throw error;
      if (!result?.docxUrl) throw new Error("The generator did not return a lesson-plan file.");
      setData(result as LessonPlanResult);
      toast.success("Lesson plan generated successfully.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to generate the lesson plan.");
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success("Download started.");
    } catch {
      toast.error("The file could not be downloaded. Please try again.");
    }
  };

  return (
    <GeneratorShell
      icon={GraduationCap}
      title="Lesson Plan Generator"
      description="Create an editable lesson-plan draft from your class details and target competencies."
      asideItems={[
        "Enter the exact topic and competencies for this lesson.",
        "Check activities, assessment, pacing, and differentiation.",
        "Edit the downloaded document before classroom use.",
      ]}
    >
      {data ? (
        <div className="flex min-h-[28rem] flex-col items-center justify-center text-center" role="status" aria-live="polite">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
          </span>
          <h2 className="font-display mt-6 text-3xl font-semibold text-foreground">Your lesson-plan draft is ready.</h2>
          <p className="mt-3 max-w-lg leading-7 text-muted-foreground">Download the DOCX, review every section, and adjust it for your learners and school context.</p>
          <div className="mt-8 flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={() => void downloadFile(data.docxUrl, "LessonPlan.docx")} className="gap-2">
              <Download className="h-4 w-4" aria-hidden="true" />
              Download lesson plan
            </Button>
            <Button variant="outline" onClick={() => setData(null)} className="gap-2">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Create another
            </Button>
            <Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-2">
              <Home className="h-4 w-4" aria-hidden="true" />
              Dashboard
            </Button>
          </div>
        </div>
      ) : (
        <form
          className="space-y-7"
          onSubmit={(event) => {
            event.preventDefault();
            void handleGenerate();
          }}
          aria-busy={loading}
        >
          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground">Lesson details</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Required fields are marked with an asterisk.</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lesson-subject">Subject <span aria-hidden="true">*</span></Label>
              <Input id="lesson-subject" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="e.g., Mathematics" autoComplete="off" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesson-grade">Grade level</Label>
              <Input id="lesson-grade" value={form.gradeLevel} onChange={(event) => setForm({ ...form, gradeLevel: event.target.value })} placeholder="e.g., Grade 7" autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesson-section">Section</Label>
              <Input id="lesson-section" value={form.section} onChange={(event) => setForm({ ...form, section: event.target.value })} placeholder="e.g., Section A" autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesson-duration">Duration</Label>
              <Input id="lesson-duration" value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })} placeholder="e.g., 60 minutes" autoComplete="off" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lesson-topic">Topic or lesson title <span aria-hidden="true">*</span></Label>
            <Input id="lesson-topic" value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })} placeholder="e.g., Introduction to Algebra" autoComplete="off" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lesson-competencies">Learning competencies <span aria-hidden="true">*</span></Label>
            <Textarea id="lesson-competencies" value={form.competencies} onChange={(event) => setForm({ ...form, competencies: event.target.value })} placeholder="Enter the target learning competencies…" rows={6} required />
            <p className="text-xs leading-5 text-muted-foreground">Use the wording from your approved curriculum guide or instructional plan.</p>
          </div>

          <div className="space-y-2 sm:max-w-sm">
            <Label htmlFor="lesson-language">Language</Label>
            <Select value={form.language} onValueChange={(value) => setForm({ ...form, language: value })}>
              <SelectTrigger id="lesson-language" aria-label="Lesson plan language"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="English">English</SelectItem>
                <SelectItem value="Filipino">Filipino</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="ghost" onClick={() => navigate("/premium")}>Cancel</Button>
            <Button type="submit" disabled={loading} className="gap-2 sm:min-w-56">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <GraduationCap className="h-4 w-4" aria-hidden="true" />}
              {loading ? "Generating lesson plan…" : "Generate lesson plan"}
            </Button>
          </div>
        </form>
      )}
    </GeneratorShell>
  );
};

export default LessonPlanGenerator;
