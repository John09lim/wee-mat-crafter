import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Eye, FileText, Loader2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface WeeLMatMatrix {
  id: string;
  subject: string;
  grade_level: string;
  section: string;
  date_from: string;
  date_to: string;
  docx_url: string | null;
  student_docx_url: string | null;
  ai_json: {
    competency?: Record<string, string>;
    examType?: Record<string, string>;
    questions?: Record<string, number | string>;
    code?: string;
    customInstructions?: string;
    language?: "English" | "Filipino";
  } | null;
  created_at: string;
}

const formatDate = (value: string) => new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));

const WeeLMatHistory = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<WeeLMatMatrix[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("");

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("weelmat_matrices")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHistory((data as WeeLMatMatrix[]) || []);
    } catch (error) {
      console.error("Error fetching history:", error);
      toast.error("Your WeeLMat history could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchHistory();
    // Initial history load only; the explicit Refresh action handles later reloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredHistory = useMemo(() => history.filter((item) => {
    if (subjectFilter !== "all" && item.subject !== subjectFilter) return false;
    if (gradeFilter !== "all" && item.grade_level !== gradeFilter) return false;
    if (sectionFilter && !item.section.toLowerCase().includes(sectionFilter.toLowerCase())) return false;
    return true;
  }), [gradeFilter, history, sectionFilter, subjectFilter]);

  const uniqueSubjects = useMemo(() => Array.from(new Set(history.map((item) => item.subject))).sort(), [history]);
  const uniqueGrades = useMemo(() => Array.from(new Set(history.map((item) => item.grade_level))).sort(), [history]);

  const handleViewPreview = (matrixId: string) => {
    navigate(`/premium/weelmat/result?matrixId=${matrixId}`);
  };

  const handleDownload = async (url: string | null, filename: string) => {
    if (!url) {
      toast.error("This file is not available yet.");
      return;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("The file could not be downloaded. Please try again.");
    }
  };

  const handleRegenerate = (matrix: WeeLMatMatrix) => {
    if (!matrix.ai_json) {
      toast.error("The original matrix data is unavailable, so this file cannot be reused.");
      return;
    }

    const aiData = matrix.ai_json;
    const questionCount = (key: string) => Number(aiData.questions?.[key]) || 5;
    const prefillData = {
      subject: matrix.subject,
      gradeLevel: matrix.grade_level,
      section: matrix.section,
      dateFrom: matrix.date_from,
      dateTo: matrix.date_to,
      language: aiData.language || "English",
      code: aiData.code || "",
      customInstructions: aiData.customInstructions || "",
      mondayCompetency: aiData.competency?.mon || "",
      mondayExamType: aiData.examType?.mon || "Multiple Choice",
      mondayQuestionCount: questionCount("mon"),
      tuesdayCompetency: aiData.competency?.tue || "",
      tuesdayExamType: aiData.examType?.tue || "Multiple Choice",
      tuesdayQuestionCount: questionCount("tue"),
      wednesdayCompetency: aiData.competency?.wed || "",
      wednesdayExamType: aiData.examType?.wed || "Multiple Choice",
      wednesdayQuestionCount: questionCount("wed"),
      thursdayCompetency: aiData.competency?.thu || "",
      thursdayExamType: aiData.examType?.thu || "Multiple Choice",
      thursdayQuestionCount: questionCount("thu"),
      fridayCompetency: aiData.competency?.fri || "",
      fridayExamType: aiData.examType?.fri || "Multiple Choice",
      fridayQuestionCount: questionCount("fri"),
    };

    navigate("/dashboard", { state: { prefillData } });
  };

  const fileName = (item: WeeLMatMatrix, audience: "Teacher" | "Learner") =>
    `WeeLMat_${audience}_${item.subject}_${item.grade_level}_${item.section}.docx`;

  if (loading) {
    return (
      <main className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-background" aria-busy="true">
        <div className="text-center" role="status" aria-live="polite">
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-primary" aria-hidden="true" />
          <p className="mt-4 font-medium text-foreground">Loading your WeeLMat files…</p>
          <p className="mt-1 text-sm text-muted-foreground">This should only take a moment.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-background py-8 sm:py-12">
      <div className="container max-w-7xl">
        <header className="grid gap-6 border-b border-border pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">My WeeLMat files</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">Preview, download, filter, or reuse your previous Weekly Learning Matrices.</p>
          </div>
          <Button onClick={() => navigate("/dashboard")} className="gap-2">
            <FileText className="h-4 w-4" aria-hidden="true" />
            Create a WeeLMat
          </Button>
        </header>

        {history.length === 0 ? (
          <section className="mt-8 flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-primary/30 bg-card px-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary"><FileText className="h-7 w-7" aria-hidden="true" /></span>
            <h2 className="font-display mt-6 text-3xl font-semibold text-foreground">No WeeLMat files yet</h2>
            <p className="mt-3 max-w-md leading-7 text-muted-foreground">Create your first weekly matrix. It will appear here for future preview, download, and reuse.</p>
            <Button className="mt-6" onClick={() => navigate("/dashboard")}>Create your first WeeLMat</Button>
          </section>
        ) : (
          <>
            <section className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="history-filters-heading">
              <div className="flex flex-col gap-2 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 id="history-filters-heading" className="font-display text-2xl font-semibold text-foreground">Find a matrix</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Showing {filteredHistory.length} of {history.length} files.</p>
                </div>
                <Button variant="ghost" onClick={() => void fetchHistory()} className="gap-2 self-start sm:self-auto">
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Refresh
                </Button>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="history-subject">Learning area</Label>
                  <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                    <SelectTrigger id="history-subject"><SelectValue placeholder="All learning areas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All learning areas</SelectItem>
                      {uniqueSubjects.map((subject) => <SelectItem key={subject} value={subject}>{subject}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="history-grade">Grade level</Label>
                  <Select value={gradeFilter} onValueChange={setGradeFilter}>
                    <SelectTrigger id="history-grade"><SelectValue placeholder="All grades" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All grades</SelectItem>
                      {uniqueGrades.map((grade) => <SelectItem key={grade} value={grade}>{grade}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="history-section">Section</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input id="history-section" className="pl-9" placeholder="Search section" value={sectionFilter} onChange={(event) => setSectionFilter(event.target.value)} />
                  </div>
                </div>
              </div>
            </section>

            {filteredHistory.length === 0 ? (
              <section className="mt-6 rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
                <Search className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden="true" />
                <h2 className="font-display mt-4 text-2xl font-semibold text-foreground">No files match these filters</h2>
                <p className="mt-2 text-muted-foreground">Clear one or more filters to see your other WeeLMat files.</p>
                <Button variant="outline" className="mt-5" onClick={() => { setSubjectFilter("all"); setGradeFilter("all"); setSectionFilter(""); }}>Clear filters</Button>
              </section>
            ) : (
              <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card" aria-labelledby="history-list-heading">
                <h2 id="history-list-heading" className="sr-only">WeeLMat file list</h2>
                <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <caption className="sr-only">Your saved Weekly Learning Matrix files</caption>
                    <TableHeader>
                      <TableRow className="bg-muted/45">
                        <TableHead>WeeLMat</TableHead>
                        <TableHead>Grade & section</TableHead>
                        <TableHead>Week</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHistory.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell><p className="font-semibold text-foreground">{item.subject}</p><p className="mt-1 text-xs text-muted-foreground">Weekly Learning Matrix</p></TableCell>
                          <TableCell>{item.grade_level} · {item.section}</TableCell>
                          <TableCell>{formatDate(item.date_from)} – {formatDate(item.date_to)}</TableCell>
                          <TableCell>{formatDate(item.created_at)}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" aria-label={`Preview ${item.subject} WeeLMat`} title="Preview" onClick={() => handleViewPreview(item.id)}><Eye className="h-4 w-4" aria-hidden="true" /></Button>
                              <Button size="icon" variant="ghost" aria-label={`Download teacher file for ${item.subject}`} title="Download teacher file" onClick={() => void handleDownload(item.docx_url, fileName(item, "Teacher"))}><Download className="h-4 w-4" aria-hidden="true" /></Button>
                              <Button size="icon" variant="ghost" aria-label={`Download learner file for ${item.subject}`} title="Download learner file" onClick={() => void handleDownload(item.student_docx_url, fileName(item, "Learner"))}><FileText className="h-4 w-4" aria-hidden="true" /></Button>
                              <Button size="icon" variant="ghost" aria-label={`Reuse ${item.subject} WeeLMat details`} title="Reuse details" onClick={() => handleRegenerate(item)}><RefreshCw className="h-4 w-4" aria-hidden="true" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="divide-y divide-border md:hidden">
                  {filteredHistory.map((item) => (
                    <article key={item.id} className="p-5">
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileText className="h-5 w-5" aria-hidden="true" /></span>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-display text-xl font-semibold text-foreground">{item.subject}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{item.grade_level} · {item.section}</p>
                        </div>
                      </div>
                      <dl className="mt-4 grid gap-2 text-sm">
                        <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Week</dt><dd className="text-right">{formatDate(item.date_from)} – {formatDate(item.date_to)}</dd></div>
                        <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Created</dt><dd>{formatDate(item.created_at)}</dd></div>
                      </dl>
                      <div className="mt-5 grid grid-cols-2 gap-2">
                        <Button variant="outline" onClick={() => handleViewPreview(item.id)} className="gap-2"><Eye className="h-4 w-4" aria-hidden="true" />Preview</Button>
                        <Button variant="outline" onClick={() => void handleDownload(item.docx_url, fileName(item, "Teacher"))} className="gap-2"><Download className="h-4 w-4" aria-hidden="true" />Teacher file</Button>
                        <Button variant="outline" onClick={() => void handleDownload(item.student_docx_url, fileName(item, "Learner"))} className="gap-2"><FileText className="h-4 w-4" aria-hidden="true" />Learner file</Button>
                        <Button variant="ghost" onClick={() => handleRegenerate(item)} className="gap-2"><RefreshCw className="h-4 w-4" aria-hidden="true" />Reuse details</Button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default WeeLMatHistory;
