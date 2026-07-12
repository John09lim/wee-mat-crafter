import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ClipboardList, Download, Home, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { GeneratorShell } from "@/components/workspace/GeneratorShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

interface TestResult {
  docxUrl: string;
}

const PeriodicalTestGenerator = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TestResult | null>(null);
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

  const totalItems = useMemo(
    () => [form.multipleChoice, form.trueFalse, form.identification, form.essay].reduce((sum, value) => sum + (Number(value) || 0), 0),
    [form.essay, form.identification, form.multipleChoice, form.trueFalse],
  );

  useEffect(() => {
    document.title = "Periodical Test & TOS Generator - WeeLMat";
    document.querySelector('meta[name="description"]')?.setAttribute("content", "Generate an editable periodical test and Table of Specifications draft.");
  }, []);

  const handleGenerate = async () => {
    if (!form.subject || !form.competencies) {
      toast.error("Complete the subject and competencies before generating.");
      return;
    }

    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("generate-periodical-test", { body: form });
      if (error) throw error;
      if (!result?.docxUrl) throw new Error("The generator did not return a test file.");
      setData(result as TestResult);
      toast.success("Periodical test generated successfully.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to generate the test.");
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

  const updateCount = (key: "multipleChoice" | "trueFalse" | "identification" | "essay", value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <GeneratorShell
      icon={ClipboardList}
      title="Periodical Test & TOS Generator"
      description="Configure an assessment draft and its Table of Specifications from your target competencies."
      asideItems={[
        "Use only competencies already taught during the quarter.",
        "Check the balance, difficulty, language, and item distribution.",
        "Validate the answer key and TOS before administration.",
      ]}
    >
      {data ? (
        <div className="flex min-h-[28rem] flex-col items-center justify-center text-center" role="status" aria-live="polite">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
          </span>
          <h2 className="font-display mt-6 text-3xl font-semibold text-foreground">Your test and TOS draft are ready.</h2>
          <p className="mt-3 max-w-lg leading-7 text-muted-foreground">Download the DOCX and verify every item, answer, competency alignment, and distribution.</p>
          <div className="mt-8 flex w-full max-w-2xl flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={() => void downloadFile(data.docxUrl, "PeriodicalTest.docx")} className="gap-2">
              <Download className="h-4 w-4" aria-hidden="true" />
              Download test and TOS
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
            <h2 className="font-display text-2xl font-semibold text-foreground">Assessment details</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Required fields are marked with an asterisk.</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="test-subject">Subject <span aria-hidden="true">*</span></Label>
              <Input id="test-subject" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="e.g., Science" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-grade">Grade level</Label>
              <Input id="test-grade" value={form.gradeLevel} onChange={(event) => setForm({ ...form, gradeLevel: event.target.value })} placeholder="e.g., Grade 8" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-section">Section</Label>
              <Input id="test-section" value={form.section} onChange={(event) => setForm({ ...form, section: event.target.value })} placeholder="e.g., Section B" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-quarter">Quarter</Label>
              <Select value={form.quarter} onValueChange={(value) => setForm({ ...form, quarter: value })}>
                <SelectTrigger id="test-quarter" aria-label="Quarter"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1st">1st Quarter</SelectItem>
                  <SelectItem value="2nd">2nd Quarter</SelectItem>
                  <SelectItem value="3rd">3rd Quarter</SelectItem>
                  <SelectItem value="4th">4th Quarter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="test-competencies">Competencies <span aria-hidden="true">*</span></Label>
            <Textarea id="test-competencies" value={form.competencies} onChange={(event) => setForm({ ...form, competencies: event.target.value })} placeholder="Enter the competencies to cover, one per line…" rows={6} required />
            <p className="text-xs leading-5 text-muted-foreground">Keep competency wording aligned with the approved curriculum source.</p>
          </div>

          <fieldset className="rounded-xl border border-border bg-muted/35 p-5">
            <legend className="px-2 font-display text-xl font-semibold text-foreground">Question distribution</legend>
            <div className="mb-5 flex items-center justify-between border-b border-border pb-4 text-sm">
              <span className="text-muted-foreground">Current total</span>
              <strong className="font-display text-2xl text-primary">{totalItems} items</strong>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["multiple-choice", "Multiple choice", "multipleChoice"],
                ["true-false", "True / False", "trueFalse"],
                ["identification", "Identification", "identification"],
                ["essay", "Essay", "essay"],
              ].map(([id, label, key]) => (
                <div key={id} className="space-y-2">
                  <Label htmlFor={`test-${id}`}>{label}</Label>
                  <Input id={`test-${id}`} type="number" min="0" inputMode="numeric" value={form[key as keyof typeof form]} onChange={(event) => updateCount(key as "multipleChoice" | "trueFalse" | "identification" | "essay", event.target.value)} />
                </div>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2 sm:max-w-sm">
            <Label htmlFor="test-language">Language</Label>
            <Select value={form.language} onValueChange={(value) => setForm({ ...form, language: value })}>
              <SelectTrigger id="test-language" aria-label="Test language"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="English">English</SelectItem>
                <SelectItem value="Filipino">Filipino</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="ghost" onClick={() => navigate("/premium")}>Cancel</Button>
            <Button type="submit" disabled={loading} className="gap-2 sm:min-w-56">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ClipboardList className="h-4 w-4" aria-hidden="true" />}
              {loading ? "Generating test…" : "Generate test and TOS"}
            </Button>
          </div>
        </form>
      )}
    </GeneratorShell>
  );
};

export default PeriodicalTestGenerator;
