import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Circle,
  Download,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  LoaderCircle,
  Palette,
  Send,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";
import { WeeLMatDownloadModal } from "@/components/WeeLMatDownloadModal";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type FormValues = {
  subject: string;
  gradeLevel: string;
  section: string;
  dateFrom: string;
  dateTo: string;
  mondayCompetency: string;
  tuesdayCompetency: string;
  wednesdayCompetency: string;
  thursdayCompetency: string;
  fridayCompetency: string;
  mondayExamType: string;
  tuesdayExamType: string;
  wednesdayExamType: string;
  thursdayExamType: string;
  fridayExamType: string;
  mondayQuestionCount: number;
  tuesdayQuestionCount: number;
  wednesdayQuestionCount: number;
  thursdayQuestionCount: number;
  fridayQuestionCount: number;
  code?: string;
  customInstructions?: string;
  language?: string;
};

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri";
type DayContent = Partial<Record<DayKey, string>>;

type AiJson = Partial<FormValues> & {
  subject?: string;
  grade_level?: string;
  date_from?: string;
  date_to?: string;
  competencies?: DayContent;
  references?: DayContent;
  activities?: DayContent;
  answerKeys?: DayContent;
  pictureQuizImages?: DayContent;
};

type GenerationStep = {
  label: string;
  detail: string;
  icon: LucideIcon;
};

const standardGenerationSteps: GenerationStep[] = [
  {
    label: "Plan daily assessments",
    detail: "Organizing the weekly competencies and expected outputs.",
    icon: BookOpenCheck,
  },
  {
    label: "Select trusted references",
    detail: "Matching learning materials to each school day.",
    icon: ShieldCheck,
  },
  {
    label: "Draft learning activities",
    detail: "Creating manageable, learner-facing activities.",
    icon: FileSpreadsheet,
  },
  {
    label: "Build the document",
    detail: "Formatting the teacher and learner DOCX copies.",
    icon: FileText,
  },
];

const premiumGenerationSteps: GenerationStep[] = [
  {
    label: "Prepare premium generation",
    detail: "Reviewing your class details and instructional context.",
    icon: Sparkles,
  },
  {
    label: "Develop weekly content",
    detail: "Generating aligned activities, materials, and outputs.",
    icon: BookOpenCheck,
  },
  {
    label: "Create picture quizzes",
    detail: "Preparing visual questions for supported learning days.",
    icon: Palette,
  },
  {
    label: "Build enhanced documents",
    detail: "Formatting the teacher and learner-ready DOCX copies.",
    icon: FileText,
  },
];

const dayColumns = [
  { key: "mon", label: "Monday", competencyField: "mondayCompetency" },
  { key: "tue", label: "Tuesday", competencyField: "tuesdayCompetency" },
  { key: "wed", label: "Wednesday", competencyField: "wednesdayCompetency" },
  { key: "thu", label: "Thursday", competencyField: "thursdayCompetency" },
  { key: "fri", label: "Friday", competencyField: "fridayCompetency" },
] as const;

const toAiJson = (value: unknown): AiJson | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as AiJson;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error && error.message ? error.message : "Generation failed";

const WeeLMatGeneratorWeeLMat = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const values = (location.state || null) as FormValues | null;
  const matrixId = useMemo(
    () => new URLSearchParams(location.search).get("matrixId"),
    [location.search],
  );
  const isPremium = location.pathname.includes("/premium/weelmat");
  const steps = useMemo(
    () => (isPremium ? premiumGenerationSteps : standardGenerationSteps),
    [isPremium],
  );

  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [docxUrl, setDocxUrl] = useState<string | null>(null);
  const [studentDocxUrl, setStudentDocxUrl] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [aiJson, setAiJson] = useState<AiJson | null>(null);
  const [savedMatrixId, setSavedMatrixId] = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [pictureQuizImages, setPictureQuizImages] = useState<DayContent>({});
  const [revisionTarget, setRevisionTarget] = useState<{ category: "references" | "activities"; day: DayKey; dayLabel: string; text: string } | null>(null);
  const [revisionInstruction, setRevisionInstruction] = useState("");
  const [revising, setRevising] = useState(false);

  useEffect(() => {
    document.title = "WeeLMat Generator | WeeLMat";
    const description =
      "Generate a Weekly Learning Matrix with aligned activities, references, and downloadable teacher and learner copies.";
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;

    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }

    meta.content = description;
  }, []);

  const loadMatrixFromDatabase = useCallback(
    async (id: string) => {
      try {
        setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          navigate("/auth");
          return;
        }

        const { data, error } = await supabase
          .from("weelmat_matrices")
          .select("*")
          .eq("id", id)
          .eq("user_id", user.id)
          .single();

        if (error) throw error;

        if (!data) {
          toast.error("WeeLMat not found");
          navigate("/weelmat-history");
          return;
        }

        const savedAiJson = toAiJson(data.ai_json);
        setDocxUrl(data.docx_url || null);
        setStudentDocxUrl(data.student_docx_url || null);
        setPdfUrl(data.pdf_url || null);
        setAiJson(savedAiJson);
        setSavedMatrixId(data.id);
        setPictureQuizImages(savedAiJson?.pictureQuizImages ?? {});
        toast.success("WeeLMat loaded successfully");
      } catch (error: unknown) {
        console.error("Error loading WeeLMat:", error);
        toast.error("Failed to load WeeLMat");
        navigate("/weelmat-history");
      } finally {
        setLoading(false);
      }
    },
    [navigate],
  );

  const generateWeeLMat = useCallback(() => {
    if (!values) return undefined;

    const timers = [
      window.setTimeout(() => setStepIndex(1), 3000),
      window.setTimeout(() => setStepIndex(2), isPremium ? 8000 : 6000),
      window.setTimeout(() => setStepIndex(3), isPremium ? 15000 : 9000),
    ];

    void (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) throw new Error("Not authenticated");

        const functionName = isPremium ? "generate-weelmat-premium" : "generate-weelmat";
        const { data, error } = await supabase.functions.invoke(functionName, {
          headers: { Authorization: `Bearer ${accessToken}` },
          body: values,
        });

        if (error) throw new Error(error.message || "The generation service returned an error");
        if (!data) throw new Error("No data was received from the generation service");

        const generatedAiJson = toAiJson(data.ai_json);
        setDocxUrl(data.docx_url || null);
        setStudentDocxUrl(data.student_docx_url || null);
        setPdfUrl(data.pdf_url || null);
        setAiJson(generatedAiJson);
        setSavedMatrixId(data.matrix_id || null);

        if (data.picture_quiz_images) {
          setPictureQuizImages(data.picture_quiz_images as DayContent);
        } else {
          setPictureQuizImages(generatedAiJson?.pictureQuizImages ?? {});
        }

        if (isPremium) {
          toast.success("Premium WeeLMat and picture quizzes are ready");
        }
      } catch (error: unknown) {
        console.error("WeeLMat generation failed:", error);
        toast.error(
          `${getErrorMessage(error)}. Check that every required field is complete, then try again.`,
        );
      } finally {
        setLoading(false);
      }
    })();

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [isPremium, values]);

  useEffect(() => {
    if (matrixId && !values) {
      void loadMatrixFromDatabase(matrixId);
      return undefined;
    }

    if (!values && !matrixId) {
      navigate("/dashboard");
      return undefined;
    }

    return generateWeeLMat();
  }, [generateWeeLMat, loadMatrixFromDatabase, matrixId, navigate, values]);

  const subject = values?.subject ?? aiJson?.subject ?? "Learning area";
  const gradeLevel = values?.gradeLevel ?? aiJson?.gradeLevel ?? aiJson?.grade_level ?? "Grade level";
  const section = values?.section ?? aiJson?.section ?? "Section";
  const dateFrom = values?.dateFrom ?? aiJson?.dateFrom ?? aiJson?.date_from ?? "";
  const dateTo = values?.dateTo ?? aiJson?.dateTo ?? aiJson?.date_to ?? "";
  const isFilipino = (values?.language ?? aiJson?.language) === "Filipino";

  const downloadFile = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("The file could not be fetched");

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success("Download started");
    } catch (error: unknown) {
      console.error("WeeLMat download failed:", error);
      toast.error("Download failed. Please try again.");
    }
  };

  const buildFilename = (extension: string, prefix = "weelmat") => {
    const makeSafe = (value?: string) =>
      (value || "")
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();

    return `${prefix}-${makeSafe(subject)}-${makeSafe(gradeLevel)}-${makeSafe(section)}-${dateFrom}-${dateTo}.${extension}`;
  };

  const handleCopyLink = async () => {
    const shareUrl = studentDocxUrl || docxUrl;
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Learner copy link copied");
    } catch (error: unknown) {
      console.error("Could not copy the WeeLMat link:", error);
      toast.error("The link could not be copied. Please try again.");
    }
  };

  const handleShare = async () => {
    const shareUrl = studentDocxUrl || docxUrl;
    if (!shareUrl) return;

    if (!navigator.share) {
      await handleCopyLink();
      return;
    }

    try {
      await navigator.share({
        title: `WeeLMat - ${subject} ${gradeLevel}`,
        text: `Weekly Learning Matrix for ${subject}, ${gradeLevel}, Section ${section}`,
        url: shareUrl,
      });
      toast.success("WeeLMat shared successfully");
    } catch (error: unknown) {
      if (!(error instanceof Error) || error.name !== "AbortError") {
        await handleCopyLink();
      }
    }
  };

  const getCompetency = (day: (typeof dayColumns)[number]) =>
    values?.[day.competencyField] ??
    aiJson?.[day.competencyField] ??
    aiJson?.competencies?.[day.key] ??
    "";

  const revisePreviewCell = async () => {
    if (!revisionTarget || !revisionInstruction.trim() || !aiJson) return;
    setRevising(true);
    try {
      const day = dayColumns.find((item) => item.key === revisionTarget.day)!;
      const { data, error } = await supabase.functions.invoke("revise-weelmat-content", {
        body: {
          currentText: revisionTarget.text,
          instruction: revisionInstruction,
          category: revisionTarget.category,
          day: revisionTarget.dayLabel,
          subject,
          gradeLevel,
          competency: getCompetency(day),
          language: values?.language ?? aiJson.language ?? "English",
        },
      });
      if (error || !data?.revisedText) throw new Error(error?.message || data?.error || "Revision failed");

      const revisedAiJson: AiJson = {
        ...aiJson,
        [revisionTarget.category]: {
          ...(aiJson[revisionTarget.category] || {}),
          [revisionTarget.day]: data.revisedText,
        },
      };
      setAiJson(revisedAiJson);

      if (values && savedMatrixId) {
        const { data: regenerated, error: regenerationError } = await supabase.functions.invoke("generate-weelmat", {
          body: { ...values, aiJsonOverride: revisedAiJson, existingMatrixId: savedMatrixId },
        });
        if (regenerationError || !regenerated) throw new Error(regenerationError?.message || "Files could not be updated");
        setDocxUrl(regenerated.docx_url || docxUrl);
        setStudentDocxUrl(regenerated.student_docx_url || studentDocxUrl);
        setPdfUrl(regenerated.pdf_url || pdfUrl);
      }

      toast.success("Preview and downloadable files updated");
      setRevisionTarget(null);
      setRevisionInstruction("");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setRevising(false);
    }
  };

  const EditableCell = ({ category, day, text, emptyText }: { category: "references" | "activities"; day: (typeof dayColumns)[number]; text?: string; emptyText: string }) => (
    <button
      type="button"
      className="min-h-16 w-full rounded-md p-2 text-left transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => setRevisionTarget({ category, day: day.key, dayLabel: day.label, text: text || "" })}
      aria-label={`Revise ${day.label} ${category} with AI`}
    >
      <span className="whitespace-pre-wrap break-words">{text || <span className="text-muted-foreground">{emptyText}</span>}</span>
      <span className="mt-2 flex items-center gap-1 text-[0.68rem] font-semibold text-primary"><WandSparkles className="h-3 w-3" /> Ask AI to revise</span>
    </button>
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-cream px-4 py-10 sm:px-6 sm:py-16">
        <section
          aria-labelledby="generation-title"
          className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-warm-border bg-paper shadow-sm"
        >
          <header className="bg-forest px-6 py-7 text-paper sm:px-8 sm:py-8">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-paper/10 text-secondary">
                <LoaderCircle
                  aria-hidden="true"
                  className="h-6 w-6 animate-spin motion-reduce:animate-none"
                />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
                  WeeLMat workspace
                </p>
                <h1 className="mt-2 font-serif text-2xl font-semibold sm:text-3xl" id="generation-title">
                  Creating your WeeLMat
                </h1>
                <p aria-live="polite" className="mt-2 max-w-xl text-sm leading-6 text-paper/75">
                  {steps[stepIndex]?.detail ?? "Preparing your weekly learning matrix."}
                </p>
              </div>
            </div>
          </header>

          <div className="px-6 py-7 sm:px-8 sm:py-8">
            <ol aria-label="Generation progress" className="space-y-3">
              {steps.map((step, index) => {
                const isComplete = index < stepIndex;
                const isCurrent = index === stepIndex;
                const StepIcon = step.icon;

                return (
                  <li
                    aria-current={isCurrent ? "step" : undefined}
                    className={`flex items-start gap-4 rounded-xl border p-4 ${
                      isCurrent
                        ? "border-primary/35 bg-primary/5"
                        : isComplete
                          ? "border-success/20 bg-success/5"
                          : "border-warm-border bg-cream/35"
                    }`}
                    key={step.label}
                  >
                    <span
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        isCurrent
                          ? "bg-forest text-paper"
                          : isComplete
                            ? "bg-success/10 text-success"
                            : "bg-warm-border/45 text-muted-foreground"
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                      ) : isCurrent ? (
                        <StepIcon aria-hidden="true" className="h-4 w-4" />
                      ) : (
                        <Circle aria-hidden="true" className="h-4 w-4" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink">{step.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        {step.detail}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
            <p className="mt-5 text-center text-xs text-muted-foreground">
              Keep this page open while the document is prepared.
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (!docxUrl) {
    return (
      <main className="min-h-screen bg-cream px-4 py-10 sm:px-6 sm:py-16">
        <section className="mx-auto max-w-xl rounded-2xl border border-warm-border bg-paper p-6 text-center shadow-sm sm:p-8">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle aria-hidden="true" className="h-6 w-6" />
          </span>
          <h1 className="mt-5 font-serif text-2xl font-semibold text-ink">We could not create this WeeLMat</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Return to the dashboard, review the class details and competencies, then start the
            generation again.
          </p>
          <Button className="mt-6 gap-2 bg-forest text-paper hover:bg-primary" onClick={() => navigate("/dashboard")}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to dashboard
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream px-3 py-6 sm:px-6 sm:py-10">
      <section className="mx-auto max-w-[92rem] overflow-hidden rounded-2xl border border-warm-border bg-paper shadow-sm">
        <header className="bg-forest px-5 py-7 text-paper sm:px-8 sm:py-9">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-secondary">
                {isPremium ? <Sparkles aria-hidden="true" className="h-4 w-4" /> : <CheckCircle2 aria-hidden="true" className="h-4 w-4" />}
                {isPremium ? "Premium generation complete" : "Generation complete"}
              </p>
              <h1 className="mt-3 font-serif text-3xl font-semibold sm:text-4xl">Your WeeLMat is ready</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-paper/75 sm:text-base">
                Review the weekly matrix below, then download the right copy for teachers or
                learners.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              {savedMatrixId && (
                <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-paper/15 bg-paper/10 px-3 text-paper">
                  <ShieldCheck aria-hidden="true" className="h-4 w-4 text-secondary" />
                  Saved to history
                </span>
              )}
              <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-paper/15 bg-paper/10 px-3 text-paper">
                <CalendarDays aria-hidden="true" className="h-4 w-4 text-secondary" />
                {dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : "Weekly plan"}
              </span>
            </div>
          </div>
        </header>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="min-w-0 p-4 sm:p-6 lg:p-8">
            <section aria-labelledby="document-actions-title" className="rounded-xl border border-warm-border bg-cream/45 p-4 sm:p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="font-serif text-xl font-semibold text-ink" id="document-actions-title">
                    Document actions
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose a copy to download or continue to the next planning tool.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button className="gap-2 bg-forest text-paper hover:bg-primary" onClick={() => setShowDownloadModal(true)}>
                    <Download aria-hidden="true" className="h-4 w-4" />
                    Download DOCX
                  </Button>
                  {pdfUrl && (
                    <Button
                      className="gap-2 border-warm-border bg-paper text-forest hover:bg-primary/5 hover:text-forest"
                      onClick={() => void downloadFile(pdfUrl, buildFilename("pdf"))}
                      variant="outline"
                    >
                      <FileText aria-hidden="true" className="h-4 w-4" />
                      Download PDF
                    </Button>
                  )}
                  <Button
                    className="gap-2 border border-secondary/45 bg-secondary/20 text-forest hover:bg-secondary/30"
                    onClick={() => navigate("/premium/lesson-plan")}
                    variant="secondary"
                  >
                    <FileSpreadsheet aria-hidden="true" className="h-4 w-4" />
                    Generate log sheet
                  </Button>
                  <Button
                    className="gap-2 border border-secondary bg-secondary text-forest hover:bg-secondary/85"
                    onClick={() => navigate("/my-account#submit-weelmat", {
                      state: {
                        submissionDraft: {
                          gradeLevel,
                          section,
                          subject,
                          weekStart: dateFrom,
                          weekEnd: dateTo,
                        },
                      },
                    })}
                    variant="secondary"
                  >
                    <Send aria-hidden="true" className="h-4 w-4" />
                    Submit a WeeLMat
                  </Button>
                </div>
              </div>
            </section>

            <WeeLMatDownloadModal
              onDownloadStudent={() =>
                void downloadFile(studentDocxUrl || docxUrl, buildFilename("docx", "student"))
              }
              onDownloadTeacher={() => void downloadFile(docxUrl, buildFilename("docx", "teacher"))}
              onOpenChange={setShowDownloadModal}
              onShare={() => void handleShare()}
              open={showDownloadModal}
            />

            {aiJson ? (
              <section aria-labelledby="matrix-preview-title" className="mt-6 overflow-hidden rounded-xl border border-warm-border bg-paper">
                <header className="border-b border-warm-border bg-cream/55 px-4 py-5 text-center sm:px-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Document preview</p>
                  <h2 className="mt-2 font-serif text-xl font-semibold text-ink" id="matrix-preview-title">
                    {isFilipino ? "Lingguhang Matris ng Pagkatuto (WeeLMat)" : "Weekly Learning Matrix (WeeLMat)"}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {subject} <span aria-hidden="true">/</span> {gradeLevel} <span aria-hidden="true">/</span> {section}
                  </p>
                  {(dateFrom || dateTo) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isFilipino ? "Petsa na nasaklaw" : "Covered dates"}: {dateFrom || "Start date"} to {dateTo || "End date"}
                    </p>
                  )}
                </header>

                <Table className="min-w-[860px]">
                  <TableCaption className="sr-only">
                    Weekly competencies, learning references, activities, and answer keys from Monday through Friday.
                  </TableCaption>
                  <TableHeader>
                    <TableRow className="bg-forest hover:bg-forest">
                      <TableHead className="min-w-40 border-r border-paper/15 text-xs font-semibold text-paper">
                        Planning category
                      </TableHead>
                      {dayColumns.map((day) => (
                        <TableHead className="min-w-36 border-r border-paper/15 text-center text-xs font-semibold text-paper last:border-r-0" key={day.key}>
                          {day.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="align-top">
                      <TableCell className="border-r border-warm-border bg-cream/45 text-xs font-semibold text-forest">
                        {isFilipino ? "Kompetensya" : "Competency"}
                      </TableCell>
                      {dayColumns.map((day) => (
                        <TableCell className="border-r border-warm-border text-xs leading-5 last:border-r-0" key={day.key}>
                          {getCompetency(day) || <span className="text-muted-foreground">Not provided</span>}
                        </TableCell>
                      ))}
                    </TableRow>

                    <TableRow className="align-top">
                      <TableCell className="border-r border-warm-border bg-cream/45 text-xs font-semibold leading-5 text-forest">
                        {isFilipino ? "Mungkahing materyales o sanggunian" : "Suggested learning material or reference"}
                      </TableCell>
                      {dayColumns.map((day) => (
                        <TableCell className="border-r border-warm-border text-xs leading-5 last:border-r-0" key={day.key}>
                          <EditableCell category="references" day={day} text={aiJson.references?.[day.key]} emptyText="No reference listed" />
                        </TableCell>
                      ))}
                    </TableRow>

                    <TableRow className="align-top">
                      <TableCell className="border-r border-warm-border bg-cream/45 text-xs font-semibold leading-5 text-forest">
                        <span className="flex items-center gap-2">
                          {Object.keys(pictureQuizImages).length > 0 && <ImageIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />}
                          {isFilipino ? "Mga gawain at picture quiz" : "Learning activities and picture quiz"}
                        </span>
                      </TableCell>
                      {dayColumns.map((day) => (
                        <TableCell className="border-r border-warm-border p-3 text-xs leading-5 last:border-r-0" key={day.key}>
                          {pictureQuizImages[day.key] ? (
                            <div className="flex flex-col items-center gap-2">
                              <button
                                aria-label={`Open ${day.label} picture quiz in a new tab`}
                                className="min-h-11 w-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                onClick={() => window.open(pictureQuizImages[day.key], "_blank", "noopener,noreferrer")}
                                type="button"
                              >
                                <img
                                  alt={`${day.label} picture quiz`}
                                  className="mx-auto max-h-44 w-auto max-w-full rounded-lg border border-warm-border object-contain shadow-sm"
                                  src={pictureQuizImages[day.key]}
                                />
                              </button>
                              <span className="text-[0.7rem] text-muted-foreground">Open larger image</span>
                            </div>
                          ) : aiJson.activities?.[day.key] ? (
                            <EditableCell category="activities" day={day} text={aiJson.activities?.[day.key]} emptyText="No activity listed" />
                          ) : (
                            <span className="text-muted-foreground">No activity listed</span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>

                    {aiJson.answerKeys && Object.keys(aiJson.answerKeys).length > 0 && (
                      <TableRow className="bg-success/5 hover:bg-success/5">
                        <TableCell className="border-r border-success/15 text-xs font-semibold text-success">
                          {isFilipino ? "Sagot" : "Answer key"}
                        </TableCell>
                        {dayColumns.map((day) => (
                          <TableCell className="border-r border-success/15 text-center text-xs font-semibold text-success last:border-r-0" key={day.key}>
                            {aiJson.answerKeys?.[day.key] || "-"}
                          </TableCell>
                        ))}
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </section>
            ) : (
              <section className="mt-6 rounded-xl border border-warm-border bg-paper p-6 text-center" aria-labelledby="preview-unavailable-title">
                <FileText aria-hidden="true" className="mx-auto h-6 w-6 text-primary" />
                <h2 className="mt-3 font-serif text-lg font-semibold text-ink" id="preview-unavailable-title">
                  Document preview is unavailable
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your generated files are still ready to download above.
                </p>
              </section>
            )}
          </div>

          <aside aria-labelledby="next-steps-title" className="border-t border-warm-border bg-cream/55 p-5 lg:border-l lg:border-t-0 lg:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Finish the workflow</p>
            <h2 className="mt-2 font-serif text-xl font-semibold text-ink" id="next-steps-title">
              Next steps
            </h2>
            <ol className="mt-5 space-y-5">
              {[
                ["1", "Review", "Check each day for accuracy and manageable learner outputs."],
                ["2", "Download", "Save the complete teacher copy and the learner-ready copy."],
                ["3", "Present", "Explain the weekly roadmap on Monday or the first class day."],
              ].map(([number, title, description]) => (
                <li className="flex gap-3" key={number}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest text-xs font-semibold text-paper">
                    {number}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-forest">{title}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
                  </span>
                </li>
              ))}
            </ol>

            <div className="mt-7 border-t border-warm-border pt-5">
              <Button
                className="w-full gap-2 border-warm-border bg-paper text-forest hover:bg-primary/5 hover:text-forest"
                onClick={() => navigate("/dashboard")}
                variant="outline"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Back to dashboard
              </Button>
            </div>
          </aside>
        </div>
      </section>
      <Dialog open={Boolean(revisionTarget)} onOpenChange={(open) => !open && setRevisionTarget(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Revise this preview content with AI</DialogTitle>
            <DialogDescription>
              Tell the AI exactly what should change. The revision will stay aligned to {revisionTarget?.dayLabel}'s competency.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="max-h-52 overflow-y-auto rounded-lg border bg-muted/35 p-3 text-sm whitespace-pre-wrap">{revisionTarget?.text}</div>
            <Textarea value={revisionInstruction} onChange={(event) => setRevisionInstruction(event.target.value)} rows={5} placeholder="Example: Use a local Philippine history example, simplify the directions, and replace question 3 with an application question." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevisionTarget(null)} disabled={revising}>Cancel</Button>
            <Button onClick={() => void revisePreviewCell()} disabled={revising || !revisionInstruction.trim()}>
              {revising ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
              Revise and update files
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default WeeLMatGeneratorWeeLMat;
