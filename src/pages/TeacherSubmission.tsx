import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Clock3, Eye, FileText, Loader2, ShieldCheck, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

interface SubmissionRecord {
  id: string;
  subject: string;
  grade_level: string;
  section: string;
  week_start: string;
  week_end: string;
  created_at: string;
  status: string;
  principal_notes?: string | null;
}

const initialForm = {
  teacherName: "",
  schoolHeadName: "",
  schoolName: "",
  districtName: "",
  gradeLevel: "",
  section: "",
  subject: "",
  weekStart: "",
  weekEnd: "",
  principalId: "",
};

const statusMeta = (status: string) => {
  switch (status) {
    case "accepted":
    case "reviewed":
      return { icon: CheckCircle2, label: status === "accepted" ? "Accepted" : "Reviewed", className: "border-success/25 bg-success/10 text-success" };
    case "returned":
      return { icon: XCircle, label: "Returned", className: "border-destructive/25 bg-destructive/10 text-destructive" };
    case "submitted":
      return { icon: Eye, label: "Submitted", className: "border-info/25 bg-info/10 text-info" };
    case "pending":
      return { icon: Clock3, label: "For review", className: "border-warning/25 bg-warning/10 text-warning" };
    default:
      return { icon: FileText, label: status || "Submitted", className: "border-border bg-muted text-foreground" };
  }
};

export default function TeacherSubmission() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState(initialForm);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) navigate("/auth");
  };

  const fetchSubmissions = async () => {
    const { data, error } = await supabase.from("teacher_submissions").select("*").order("created_at", { ascending: false });
    if (error) console.error("Error fetching submissions:", error);
    else setSubmissions((data as SubmissionRecord[]) || []);
  };

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profileData } = await supabase.from("profiles").select("school, district_name, teacher_name").eq("user_id", user.id).single();
      if (profileData) {
        setFormData((current) => ({
          ...current,
          teacherName: (profileData.teacher_name || "").toUpperCase(),
          schoolName: (profileData.school || "").toUpperCase(),
          districtName: (profileData.district_name || "").toUpperCase(),
        }));
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  useEffect(() => {
    void Promise.all([checkAuth(), fetchSubmissions(), fetchUserProfile()]);
    // Bootstrap the authenticated teacher view once; mutations refresh their own data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUppercaseInput = (field: keyof typeof initialForm, value: string) => {
    setFormData((current) => ({ ...current, [field]: value.toUpperCase() }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      toast.error("Select a DOCX or PDF WeeLMat file before submitting.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("The file is larger than 10 MB. Choose a smaller DOCX or PDF.");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Your session expired. Sign in and try again.");

      const submitFormData = new FormData();
      submitFormData.append("file", file);
      Object.entries(formData).forEach(([key, value]) => submitFormData.append(key, value));

      const response = await fetch("https://velpueasbsrptocrjljg.supabase.co/functions/v1/submit-weelmat", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: submitFormData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Submission failed");

      toast.success("Your WeeLMat was submitted for principal review.");
      setFile(null);
      setFormData(initialForm);
      await fetchUserProfile();
      await fetchSubmissions();
    } catch (error: unknown) {
      console.error("Submission error:", error);
      toast.error(error instanceof Error ? error.message : "Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-background py-8 sm:py-12">
      <div className="container max-w-7xl">
        <header className="grid gap-6 border-b border-border pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">Submit a Weekly Learning Matrix</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">Send a completed DOCX or PDF to your principal for review and weekly tracking.</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/my-account")}>Back to my workspace</Button>
        </header>

        <nav aria-label="Submission steps" className="mt-7 overflow-x-auto border-b border-border">
          <ol className="flex min-w-[34rem]">
            {["01  Details", "02  File", "03  Confirm"].map((step, index) => (
              <li key={step} className={`flex-1 border-b-2 px-3 pb-4 text-sm font-semibold ${index === 0 ? "border-secondary text-primary" : "border-transparent text-muted-foreground"}`}>{step}</li>
            ))}
          </ol>
        </nav>

        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-[0_18px_50px_-42px_rgba(20,32,25,.55)] sm:p-7" aria-labelledby="new-submission-heading">
            <div className="flex items-start gap-3 border-b border-border pb-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Upload className="h-5 w-5" aria-hidden="true" /></span>
              <div><h2 id="new-submission-heading" className="font-display text-2xl font-semibold text-foreground">New submission</h2><p className="mt-1 text-sm text-muted-foreground">Required fields are marked by the browser when incomplete.</p></div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-7" aria-busy={loading}>
              <fieldset>
                <legend className="font-display text-xl font-semibold text-foreground">Teacher and school</legend>
                <div className="mt-4 grid gap-5 md:grid-cols-2">
                  {[
                    ["teacher-name", "Teacher name", "teacherName", "ENTER YOUR NAME"],
                    ["school-head", "School head or principal", "schoolHeadName", "ENTER COMPLETE NAME"],
                    ["school-name", "School name", "schoolName", "ENTER SCHOOL NAME"],
                    ["district-name", "District name", "districtName", "ENTER DISTRICT NAME"],
                  ].map(([id, label, field, placeholder]) => (
                    <div key={id} className="space-y-2">
                      <Label htmlFor={`submission-${id}`}>{label}</Label>
                      <Input id={`submission-${id}`} value={formData[field as keyof typeof formData]} onChange={(event) => handleUppercaseInput(field as keyof typeof initialForm, event.target.value)} placeholder={placeholder} required />
                    </div>
                  ))}
                </div>
              </fieldset>

              <fieldset className="border-t border-border pt-6">
                <legend className="font-display text-xl font-semibold text-foreground">Class and week</legend>
                <div className="mt-4 grid gap-5 md:grid-cols-3">
                  {[
                    ["grade", "Grade level", "gradeLevel", "GRADE 7"],
                    ["section", "Section", "section", "SECTION A"],
                    ["subject", "Learning area", "subject", "MATHEMATICS"],
                  ].map(([id, label, field, placeholder]) => (
                    <div key={id} className="space-y-2">
                      <Label htmlFor={`submission-${id}`}>{label}</Label>
                      <Input id={`submission-${id}`} value={formData[field as keyof typeof formData]} onChange={(event) => handleUppercaseInput(field as keyof typeof initialForm, event.target.value)} placeholder={placeholder} required />
                    </div>
                  ))}
                  <div className="space-y-2 md:col-span-1">
                    <Label htmlFor="submission-week-start">Week begins</Label>
                    <Input id="submission-week-start" type="date" value={formData.weekStart} onChange={(event) => setFormData({ ...formData, weekStart: event.target.value })} required />
                  </div>
                  <div className="space-y-2 md:col-span-1">
                    <Label htmlFor="submission-week-end">Week ends</Label>
                    <Input id="submission-week-end" type="date" value={formData.weekEnd} onChange={(event) => setFormData({ ...formData, weekEnd: event.target.value })} required />
                  </div>
                </div>
              </fieldset>

              <fieldset className="border-t border-border pt-6">
                <legend className="font-display text-xl font-semibold text-foreground">WeeLMat file</legend>
                <div className="mt-4 rounded-xl border border-dashed border-primary/35 bg-primary/5 p-5">
                  <Label htmlFor="submission-file">DOCX or PDF file</Label>
                  <Input id="submission-file" className="mt-2" type="file" accept=".docx,.pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} required />
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">Maximum size: 10 MB. Confirm that the selected file contains no unintended personal information.</p>
                  {file && <p className="mt-3 rounded-lg bg-card px-3 py-2 text-sm font-medium text-foreground" role="status">Selected: {file.name}</p>}
                </div>
              </fieldset>

              <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" onClick={() => navigate("/my-account")}>Cancel</Button>
                <Button type="submit" disabled={loading} className="gap-2 sm:min-w-56">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
                  {loading ? "Submitting WeeLMat…" : "Submit for review"}
                </Button>
              </div>
            </form>
          </section>

          <aside className="rounded-2xl border border-primary/15 bg-primary p-6 text-primary-foreground lg:sticky lg:top-24">
            <ShieldCheck className="h-7 w-7 text-secondary" aria-hidden="true" />
            <h2 className="font-display mt-4 text-2xl font-semibold">Before you submit</h2>
            <ol className="mt-6 space-y-5 text-sm leading-6 text-primary-foreground/85">
              <li className="grid grid-cols-[2rem_1fr] gap-3"><span className="text-secondary">01</span><span>Review competencies, activities, dates, and expected outputs.</span></li>
              <li className="grid grid-cols-[2rem_1fr] gap-3"><span className="text-secondary">02</span><span>Use the principal and school details assigned to your account.</span></li>
              <li className="grid grid-cols-[2rem_1fr] gap-3"><span className="text-secondary">03</span><span>Keep the file below 10 MB and retain your own editable copy.</span></li>
            </ol>
          </aside>
        </div>

        <section className="mt-12" aria-labelledby="submission-history-heading">
          <div className="flex items-end justify-between gap-4 border-b border-border pb-5">
            <div><h2 id="submission-history-heading" className="font-display text-3xl font-semibold text-foreground">Submission history</h2><p className="mt-2 text-sm text-muted-foreground">Follow principal review status and notes.</p></div>
            <span className="text-sm text-muted-foreground">{submissions.length} total</span>
          </div>
          {submissions.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center"><FileText className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" /><p className="mt-4 font-medium text-foreground">No submissions yet</p><p className="mt-1 text-sm text-muted-foreground">Your first submitted WeeLMat will appear here.</p></div>
          ) : (
            <div className="mt-6 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {submissions.map((submission) => {
                const meta = statusMeta(submission.status);
                const StatusIcon = meta.icon;
                return (
                  <article key={submission.id} className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-start sm:p-6">
                    <div className="min-w-0">
                      <h3 className="font-display text-xl font-semibold text-foreground">{submission.subject} · {submission.grade_level}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Section {submission.section} · {new Date(submission.week_start).toLocaleDateString()} – {new Date(submission.week_end).toLocaleDateString()}</p>
                      <p className="mt-2 text-xs text-muted-foreground">Submitted {new Date(submission.created_at).toLocaleDateString()}</p>
                      {submission.principal_notes && <div className="mt-4 rounded-lg border border-secondary/30 bg-secondary/10 p-3 text-sm leading-6"><strong className="text-foreground">Principal note:</strong> {submission.principal_notes}</div>}
                    </div>
                    <span className={`inline-flex min-h-9 w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${meta.className}`}><StatusIcon className="h-4 w-4" aria-hidden="true" />{meta.label}</span>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
