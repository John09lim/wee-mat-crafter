import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { PasscodeDialog } from "@/components/PasscodeDialog";
import { ExtractedTextPreviewModal } from "@/components/ExtractedTextPreviewModal";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  FileText,
  History,
  Loader2,
  LogOut,
  Sparkles,
  Upload,
  UserRound,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const examTypes = ["Identification", "Matching Type", "True/False", "Multiple Choice", "Essay", "Performance Task", "HOLIDAY"] as const;
const questionCounts = [5, 10, 15] as const;

const schema = z.object({
  subject: z.string().min(1, "Subject is required"),
  gradeLevel: z.string().min(1, "Grade is required"),
  section: z.string().min(1, "Section is required"),
  dateFrom: z.string().min(1, "From date is required"),
  dateTo: z.string().min(1, "To date is required"),
  mondayCompetency: z.string().min(1, "Monday competency is required").transform(s => s.trim()),
  tuesdayCompetency: z.string().min(1, "Tuesday competency is required").transform(s => s.trim()),
  wednesdayCompetency: z.string().min(1, "Wednesday competency is required").transform(s => s.trim()),
  thursdayCompetency: z.string().min(1, "Thursday competency is required").transform(s => s.trim()),
  fridayCompetency: z.string().min(1, "Friday competency is required").transform(s => s.trim()),
  mondayExamType: z.enum(examTypes, { required_error: "Monday exam type is required" }),
  tuesdayExamType: z.enum(examTypes, { required_error: "Tuesday exam type is required" }),
  wednesdayExamType: z.enum(examTypes, { required_error: "Wednesday exam type is required" }),
  thursdayExamType: z.enum(examTypes, { required_error: "Thursday exam type is required" }),
  fridayExamType: z.enum(examTypes, { required_error: "Friday exam type is required" }),
  mondayQuestionCount: z.number().min(3, "Minimum 3 questions").max(20, "Maximum 20 questions"),
  tuesdayQuestionCount: z.number().min(3, "Minimum 3 questions").max(20, "Maximum 20 questions"),
  wednesdayQuestionCount: z.number().min(3, "Minimum 3 questions").max(20, "Maximum 20 questions"),
  thursdayQuestionCount: z.number().min(3, "Minimum 3 questions").max(20, "Maximum 20 questions"),
  fridayQuestionCount: z.number().min(3, "Minimum 3 questions").max(20, "Maximum 20 questions"),
  code: z.string().optional().or(z.literal("")),
  customInstructions: z.string().optional().or(z.literal("")),
  language: z.enum(["English","Filipino"]).default("English"),
}).refine((data) => new Date(data.dateFrom) <= new Date(data.dateTo), {
  message: "From date must be before or equal to To date",
  path: ["dateFrom"],
});

type FormValues = z.infer<typeof schema>;

const grades = ["Kinder","Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10"];
const subjectSuggestions = ["Filipino","English","Math","Science","AP","EsP","MAPEH","EPP/TLE"];

const planningDays = [
  { day: "Monday", prefix: "monday" },
  { day: "Tuesday", prefix: "tuesday" },
  { day: "Wednesday", prefix: "wednesday" },
  { day: "Thursday", prefix: "thursday" },
  { day: "Friday", prefix: "friday" },
] as const;

type PlanningDayPrefix = (typeof planningDays)[number]["prefix"];

interface ExtractedDayData {
  competency?: string;
  examType?: (typeof examTypes)[number];
  questionCount?: number;
}

interface ExtractedMaterialData {
  success: boolean;
  error?: string;
  extractedText?: string;
  days?: Record<string, ExtractedDayData>;
}

const Step = ({active, text}:{active:boolean;text:string}) => (
  <div className={`flex items-center gap-2 ${active?"text-primary":"text-muted-foreground"}`}>
    <div className={`h-2 w-2 rounded-full ${active?"bg-primary":"bg-border"}`}/>
    <span className="text-sm">{text}</span>
  </div>
)

interface DashboardProps {
  isPremium?: boolean;
}

const Dashboard = ({ isPremium = false }: DashboardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [showPasscodeDialog, setShowPasscodeDialog] = useState(false);
  const [passcodeVerified, setPasscodeVerified] = useState(false);
  const [matrixMode, setMatrixMode] = useState<"automatic" | "manual">("manual");
  const [activeDay, setActiveDay] = useState<PlanningDayPrefix>("monday");
  const [dailyCompetencies, setDailyCompetencies] = useState<Record<PlanningDayPrefix, string>>({
    monday: "",
    tuesday: "",
    wednesday: "",
    thursday: "",
    friday: "",
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<ExtractedMaterialData | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [extractedTextPreview, setExtractedTextPreview] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractionSuccess, setExtractionSuccess] = useState(false);
  const steps = useMemo(() => [
    "Planning daily competencies…",
    "Selecting trusted references…",
    "Drafting learning activities…",
    "Finalizing DOCX & PDF…",
  ], []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) navigate("/auth");
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) navigate("/auth");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    // Check if passcode is already verified
    const isVerified = localStorage.getItem("dashboard_passcode_verified") === "true";
    if (isVerified) {
      setPasscodeVerified(true);
    } else {
      setShowPasscodeDialog(true);
    }
  }, []);

  const handlePasscodeVerified = () => {
    setPasscodeVerified(true);
    setShowPasscodeDialog(false);
  };

const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<FormValues>({
  resolver: zodResolver(schema),
  defaultValues: {
    gradeLevel: "",
    language: "English",
    mondayExamType: "Multiple Choice",
    tuesdayExamType: "Multiple Choice",
    wednesdayExamType: "Multiple Choice",
    thursdayExamType: "Multiple Choice",
    fridayExamType: "Multiple Choice",
    mondayQuestionCount: 5,
    tuesdayQuestionCount: 5,
    wednesdayQuestionCount: 5,
    thursdayQuestionCount: 5,
    fridayQuestionCount: 5,
  }
});

// Check for prefill data from history regeneration
useEffect(() => {
  const prefillData = location.state?.prefillData;
  if (prefillData) {
    reset(prefillData);
    setDailyCompetencies({
      monday: prefillData.mondayCompetency || "",
      tuesday: prefillData.tuesdayCompetency || "",
      wednesday: prefillData.wednesdayCompetency || "",
      thursday: prefillData.thursdayCompetency || "",
      friday: prefillData.fridayCompetency || "",
    });
    toast.success("Form pre-filled from saved WeeLMat");
  }
}, [location.state, reset]);

const watchedValues = watch();

  const isDayComplete = (day: PlanningDayPrefix) => {
    const competency = watchedValues[`${day}Competency` as keyof FormValues] as string | undefined;
    const examType = watchedValues[`${day}ExamType` as keyof FormValues];
    const questionCount = watchedValues[`${day}QuestionCount` as keyof FormValues] as number | undefined;
    return Boolean(competency?.trim() && examType && questionCount && questionCount >= 3 && questionCount <= 20);
  };

  const completedDays = planningDays.filter(({ prefix }) => isDayComplete(prefix)).length;
  const activeDayConfig = planningDays.find(({ prefix }) => prefix === activeDay) ?? planningDays[0];
  const activeCompetencyField = `${activeDay}Competency` as `${PlanningDayPrefix}Competency`;
  const activeExamTypeField = `${activeDay}ExamType` as `${PlanningDayPrefix}ExamType`;
  const activeQuestionCountField = `${activeDay}QuestionCount` as `${PlanningDayPrefix}QuestionCount`;

  const isFormComplete = (values: Partial<FormValues>) => {
    if (!values.subject?.trim() || !values.gradeLevel || !values.section?.trim() || 
        !values.dateFrom || !values.dateTo || !values.language) {
      return false;
    }
    
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    const isComplete = days.every(day => {
      const competency = values[`${day}Competency` as keyof FormValues] as string;
      const examType = values[`${day}ExamType` as keyof FormValues];
      const questionCount = values[`${day}QuestionCount` as keyof FormValues] as number;
      
      // For HOLIDAY, only check that examType is set and competency is "HOLIDAY"
      if (examType === "HOLIDAY") {
        return competency?.trim() === "HOLIDAY" && questionCount;
      }
      
      return competency?.trim() && examType && questionCount && 
             typeof questionCount === 'number' && questionCount >= 3 && questionCount <= 20;
    });
    
    return isComplete;
  };

  const onSubmit = async (values: FormValues) => {
    console.log("Dashboard form submission - Raw form values:", values);
    
    // Enhanced validation logging
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    const validationResults = days.map(day => ({
      day,
      competency: values[`${day}Competency` as keyof FormValues],
      examType: values[`${day}ExamType` as keyof FormValues],
      questionCount: values[`${day}QuestionCount` as keyof FormValues],
      complete: !!(values[`${day}Competency` as keyof FormValues] && 
                   values[`${day}ExamType` as keyof FormValues] && 
                   values[`${day}QuestionCount` as keyof FormValues])
    }));
    
    console.log("Dashboard validation results:", validationResults);
    
    const incompleteFields = validationResults.filter(r => !r.complete);
    if (incompleteFields.length > 0) {
      console.error("Form submission blocked - incomplete fields:", incompleteFields);
      alert(`Please complete the following days: ${incompleteFields.map(f => f.day).join(', ')}`);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    console.log("Navigating to WeeLMatGenerator with validated values:", values);
    navigate(isPremium ? "/premium/weelmat/result" : "/weelmatgenerator", { state: values });
  }

  const [result, setResult] = useState<{subject:string;grade:string;section:string;dates:string;docx?:string;pdf?:string}|null>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    // Validate file type - DOCX and Images only
    const validTypes = [
      'image/jpeg', 
      'image/png', 
      'image/jpg',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
      'application/msword' // DOC
    ];
    if (!validTypes.includes(file.type)) {
      toast.error("PDF files are not supported. Please convert your PDF to DOCX format first, then upload.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Convert file to base64
      const base64 = await fileToBase64(file);
      
      setUploadProgress(30);
      
      // Call edge function to extract data
      const { data, error } = await supabase.functions.invoke('extract-weelmat-data', {
        body: {
          fileData: base64,
          fileType: file.type,
          fileName: file.name,
          subject: watch('subject'),
          gradeLevel: watch('gradeLevel'),
          language: watch('language') || 'English'
        }
      });

      setUploadProgress(70);

      if (error) throw error;

      // Check if API returned an error
      const extracted = data as ExtractedMaterialData;
      if (!extracted.success) {
        toast.error(extracted.error || "Failed to process file. Please try manual mode.");
        return;
      }

      // Store extracted data and show preview modal BEFORE auto-filling
      if (extracted.success) {
        setExtractedData(extracted);
        setUploadedFile(file);
        setExtractedTextPreview(extracted.extractedText || "");
        
        // Show preview modal for user to verify extracted content
        setShowPreviewDialog(true);
      }
      
      setUploadProgress(100);
    } catch (error: unknown) {
      console.error('File upload error:', error);
      
      // Display user-friendly error messages
      let errorMessage = "Failed to process file. Please try manual mode or upload a different file.";
      
      if (typeof error === "object" && error !== null && "error" in error && typeof error.error === "string") {
        errorMessage = error.error;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error instanceof Error) {
        if (error.message.includes("network") || error.message.includes("fetch")) {
          errorMessage = "Network error. Please check your connection and try again.";
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmExtraction = () => {
    // User confirmed, now auto-fill the form fields
    if (extractedData) {
      const days: PlanningDayPrefix[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      const dayNames: Record<PlanningDayPrefix, string> = {
        monday: 'Monday',
        tuesday: 'Tuesday',
        wednesday: 'Wednesday',
        thursday: 'Thursday',
        friday: 'Friday'
      };
      
      days.forEach((day) => {
        const dayData = extractedData.days?.[dayNames[day]];
        if (dayData) {
          setValue(`${day}Competency` as `${PlanningDayPrefix}Competency`, dayData.competency || '', { shouldValidate: true });
          setDailyCompetencies((current) => ({ ...current, [day]: dayData.competency || "" }));
          setValue(`${day}ExamType` as `${PlanningDayPrefix}ExamType`, dayData.examType || 'Multiple Choice', { shouldValidate: true });
          setValue(`${day}QuestionCount` as `${PlanningDayPrefix}QuestionCount`, dayData.questionCount || 10, { shouldValidate: true });
        }
      });

      setExtractionSuccess(true);
      toast.success("Competencies extracted! Please verify them in Manual Matrix Content section and fill in Subject, Grade, Section & Dates to generate.");
    }
    
    setShowPreviewDialog(false);
  };

  const handleCancelExtraction = () => {
    // User wants to try a different file
    setShowPreviewDialog(false);
    setExtractedData(null);
    setExtractedTextPreview("");
    setUploadedFile(null);
    setExtractionSuccess(false);
    toast.info("Upload cancelled. You can try uploading a different file.");
  };

  return (
    <>
      <PasscodeDialog 
        open={showPasscodeDialog} 
        onPasscodeVerified={handlePasscodeVerified}
      />
      
      {/* Extracted Text Preview Modal */}
      <ExtractedTextPreviewModal
        open={showPreviewDialog}
        onOpenChange={setShowPreviewDialog}
        extractedText={extractedTextPreview}
        fileName={uploadedFile?.name || "uploaded file"}
        onConfirm={handleConfirmExtraction}
        onCancel={handleCancelExtraction}
      />
      
      {/* Loading Overlay for Auto-Generation */}
      {loading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card p-8 rounded-2xl shadow-lg border max-w-md w-full mx-4 space-y-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">Generating WeeLMat</h3>
                <p className="text-sm text-muted-foreground">
                  Please wait while we create your Weekly Learning Matrix...
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {steps.map((step, idx) => (
                <div 
                  key={idx}
                  className={`flex items-center gap-3 transition-all duration-300 ${
                    idx <= stepIndex ? 'opacity-100' : 'opacity-40'
                  }`}
                >
                  {idx < stepIndex ? (
                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  ) : idx === stepIndex ? (
                    <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-muted flex-shrink-0" />
                  )}
                  <span className={`text-sm ${idx <= stepIndex ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {passcodeVerified && (
        <main className="min-h-[calc(100dvh-4rem)] bg-background py-8 sm:py-12">
          <div className="container max-w-7xl">
            <header className="mb-8 grid gap-6 border-b border-border pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="flex items-start gap-4">
                <span className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <Sparkles className="h-6 w-6" aria-hidden="true" />
                </span>
                <div>
                  <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                    {isPremium ? "Create a premium Weekly Learning Matrix" : "Create a Weekly Learning Matrix"}
                  </h1>
                  <p className="mt-2 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                    Build the week from your DLP, DLL, or learning material while keeping every classroom decision editable.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => navigate("/weelmat-history")} className="gap-2">
                  <History className="h-4 w-4" aria-hidden="true" />
                  History
                </Button>
                <Button variant="outline" onClick={() => navigate("/my-account")} className="gap-2">
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                  My account
                </Button>
                <Button variant="ghost" onClick={handleLogout} className="gap-2 text-muted-foreground">
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign out
                </Button>
              </div>
            </header>

            <nav aria-label="Creation progress" className="mb-7 overflow-x-auto border-b border-border">
              <ol className="flex min-w-[42rem]">
                {[
                  ["01", "Class details", Boolean(watchedValues.subject && watchedValues.gradeLevel && watchedValues.section)],
                  ["02", "Learning source", matrixMode === "manual" || extractionSuccess],
                  ["03", "Week plan", completedDays === planningDays.length],
                  ["04", "Review", isFormComplete(watchedValues)],
                ].map(([number, label, complete], index) => (
                  <li key={String(label)} className={`flex flex-1 items-center gap-3 border-b-2 px-3 pb-4 ${index === 2 ? "border-secondary" : "border-transparent"}`}>
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold ${complete ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}>
                      {complete ? <Check className="h-4 w-4" aria-hidden="true" /> : number}
                    </span>
                    <span className="font-semibold text-foreground">{label}</span>
                  </li>
                ))}
              </ol>
            </nav>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_18px_50px_-42px_rgba(20,32,25,.55)] sm:p-7 lg:p-8">
            <form className="grid gap-8" onSubmit={handleSubmit(onSubmit)} noValidate>
              <section aria-labelledby="class-details-heading">
                <div className="mb-5 flex items-center gap-3">
                  <span className="font-display text-2xl font-semibold text-secondary">01</span>
                  <div>
                    <h2 id="class-details-heading" className="font-display text-2xl font-semibold text-foreground">Class details</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Set the learning area, class, language, and school week.</p>
                  </div>
                </div>

              <div className="grid gap-5 md:grid-cols-12">
                <div className="space-y-2 md:col-span-5">
                  <Label htmlFor="matrix-subject">Subject area</Label>
                  <Input id="matrix-subject" placeholder={`e.g., ${subjectSuggestions.join(', ')}`} aria-invalid={Boolean(errors.subject)} {...register("subject")} />
                  {errors.subject && <p role="alert" className="text-destructive text-sm">{errors.subject.message}</p>}
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor="matrix-grade">Grade level</Label>
                  <Select value={watchedValues.gradeLevel || ""} onValueChange={(value) => setValue("gradeLevel", value, { shouldValidate: true })}>
                    <SelectTrigger id="matrix-grade" aria-invalid={Boolean(errors.gradeLevel)}>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {grades.map((grade) => (<SelectItem key={grade} value={grade}>{grade}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  {errors.gradeLevel && <p role="alert" className="text-destructive text-sm">{errors.gradeLevel.message}</p>}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="matrix-section">Section</Label>
                  <Input id="matrix-section" aria-invalid={Boolean(errors.section)} {...register("section")} />
                  {errors.section && <p role="alert" className="text-destructive text-sm">{errors.section.message}</p>}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="matrix-language">Language</Label>
                  <Select value={watchedValues.language || "English"} onValueChange={(value) => setValue("language", value as FormValues["language"], { shouldValidate: true })}>
                    <SelectTrigger id="matrix-language"><SelectValue placeholder="Select language" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Filipino">Filipino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="matrix-date-from">Week begins</Label>
                  <Input id="matrix-date-from" type="date" aria-invalid={Boolean(errors.dateFrom)} {...register("dateFrom")} />
                  {errors.dateFrom && <p role="alert" className="text-destructive text-sm">{errors.dateFrom.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="matrix-date-to">Week ends</Label>
                  <Input id="matrix-date-to" type="date" aria-invalid={Boolean(errors.dateTo)} {...register("dateTo")} />
                  {errors.dateTo && <p role="alert" className="text-destructive text-sm">{errors.dateTo.message}</p>}
                </div>
              </div>
              </section>

              {/* Mode Selection Toggle */}
              <section aria-labelledby="learning-source-heading" className="border-t border-border pt-7">
                <div className="mb-5 flex items-center gap-3">
                  <span className="font-display text-2xl font-semibold text-secondary">02</span>
                  <div>
                    <h2 id="learning-source-heading" className="font-display text-2xl font-semibold text-foreground">Learning source</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Choose whether to enter the week yourself or extract a starting point from a file.</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Matrix content mode">
                  <Button
                    type="button"
                    variant={matrixMode === "manual" ? "default" : "outline"}
                    className="h-auto min-h-16 justify-start gap-3 px-4 py-3 text-left"
                    onClick={() => setMatrixMode("manual")}
                    aria-pressed={matrixMode === "manual"}
                  >
                    <FileText className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span><span className="block font-semibold">Enter manually</span><span className="block text-xs opacity-75">Write each competency and assessment.</span></span>
                  </Button>
                  <Button
                    type="button"
                    variant={matrixMode === "automatic" ? "default" : "outline"}
                    className="h-auto min-h-16 justify-start gap-3 px-4 py-3 text-left"
                    onClick={() => setMatrixMode("automatic")}
                    aria-pressed={matrixMode === "automatic"}
                  >
                    <Upload className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span><span className="block font-semibold">Upload learning material</span><span className="block text-xs opacity-75">Extract a draft from DOCX or an image.</span></span>
                  </Button>
                </div>
              </section>

              {/* Automatic Mode - File Upload */}
              {matrixMode === "automatic" && (
                <section className="space-y-4 rounded-xl border border-dashed border-primary/35 bg-primary/5 p-5 sm:p-6" aria-labelledby="upload-source-heading">
                  <div>
                    <h3 id="upload-source-heading" className="font-display text-xl font-semibold text-foreground">Upload a learning material</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Add a DOC, DOCX, lesson-plan image, curriculum guide, or teaching material. The extracted content becomes an editable starting point for Monday–Friday.
                    </p>
                  </div>
                  <Label htmlFor="matrix-source-file">Learning material file</Label>
                  <Input
                    id="matrix-source-file"
                    type="file"
                    accept=".doc,.docx,image/*"
                    onChange={handleFileUpload}
                    disabled={uploading || extractionSuccess}
                  />

                  {uploadedFile && !extractionSuccess && (
                    <div className="flex items-center gap-2 rounded-lg border border-info/25 bg-info/10 p-3 text-sm text-info" role="status">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>Processing {uploadedFile.name}…</span>
                    </div>
                  )}

                  {extractionSuccess && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 rounded-lg border border-success/25 bg-success/10 p-3 text-sm font-medium text-success" role="status">
                        <Check className="h-5 w-5" aria-hidden="true" />
                        <span>File content extracted successfully.</span>
                      </div>
                      <div className="rounded-lg border border-border bg-card p-4">
                        <p className="mb-2 text-sm font-medium text-foreground">Extracted text preview</p>
                        <div className="max-h-32 overflow-y-auto whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
                          {extractedTextPreview.slice(0, 500)}…
                        </div>
                        <Button type="button" variant="link" className="mt-2 h-auto min-h-0 p-0 text-sm" onClick={() => setShowPreviewDialog(true)}>
                          Review all extracted text
                        </Button>
                      </div>
                      <p className="text-sm font-medium text-success">The form now contains an editable draft. Complete the remaining class details before generating.</p>
                    </div>
                  )}

                  {uploading && (
                    <div className="space-y-2" aria-live="polite">
                      <Progress value={uploadProgress} />
                      <p className="text-center text-sm text-muted-foreground">
                        {uploadProgress < 30 ? "Uploading file…" : uploadProgress < 70 ? "Extracting document text…" : "Preparing editable fields…"}
                      </p>
                    </div>
                  )}

                  {!extractionSuccess && !uploading && (
                    <p className="text-sm font-medium text-warning">Upload and review a file before generating a WeeLMat.</p>
                  )}
                </section>
              )}

              {matrixMode === "manual" && (
                <section aria-labelledby="week-plan-heading" className="border-t border-border pt-7">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="font-display text-2xl font-semibold text-secondary">03</span>
                      <div>
                        <h2 id="week-plan-heading" className="font-display text-2xl font-semibold text-foreground">Week plan</h2>
                        <p className="mt-1 text-sm text-muted-foreground">Complete one focused day at a time. Your entries remain saved as you switch days.</p>
                      </div>
                    </div>
                    <span className="hidden rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary sm:inline-flex">
                      {completedDays} of 5 days ready
                    </span>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-border lg:grid lg:grid-cols-[12rem_minmax(0,1fr)]">
                    <div className="flex overflow-x-auto border-b border-border bg-muted/35 lg:block lg:border-b-0 lg:border-r" role="tablist" aria-label="School days">
                      {planningDays.map(({ day, prefix }) => {
                        const complete = isDayComplete(prefix);
                        const selected = activeDay === prefix;
                        return (
                          <button
                            key={day}
                            type="button"
                            role="tab"
                            id={`day-tab-${prefix}`}
                            aria-selected={selected}
                            aria-controls={`day-panel-${prefix}`}
                            onClick={() => setActiveDay(prefix)}
                            className={`flex min-h-16 min-w-36 items-center justify-between gap-3 border-b-2 px-4 py-3 text-left transition-colors lg:w-full lg:min-w-0 lg:border-b lg:border-l-2 ${selected ? "border-l-secondary border-b-secondary bg-primary text-primary-foreground lg:border-b-border" : "border-l-transparent border-b-transparent bg-transparent text-foreground hover:bg-card"}`}
                          >
                            <span>
                              <span className={`block text-[11px] font-semibold uppercase tracking-[0.16em] ${selected ? "text-secondary" : "text-muted-foreground"}`}>{day.slice(0, 3)}</span>
                              <span className="font-display text-lg font-semibold">{day}</span>
                            </span>
                            {complete ? <CheckCircle2 className={`h-4 w-4 ${selected ? "text-secondary" : "text-primary"}`} aria-label="Complete" /> : <ArrowRight className="h-4 w-4 opacity-55" aria-hidden="true" />}
                          </button>
                        );
                      })}
                    </div>

                    <div key={activeDay} id={`day-panel-${activeDay}`} role="tabpanel" aria-labelledby={`day-tab-${activeDay}`} className="space-y-6 bg-card p-5 sm:p-6">
                      <div className="flex items-center gap-3 border-b border-border pb-4">
                        <CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" />
                        <h3 className="font-display text-2xl font-semibold text-foreground">{activeDayConfig.day}</h3>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={activeCompetencyField}>Competency</Label>
                        <Textarea
                          key={activeCompetencyField}
                          id={activeCompetencyField}
                          name={activeCompetencyField}
                          rows={4}
                          placeholder={`Enter ${activeDayConfig.day}'s competency exactly as it should appear…`}
                          aria-invalid={Boolean(errors[activeCompetencyField])}
                          value={dailyCompetencies[activeDay]}
                          onChange={(event) => {
                            const value = event.target.value;
                            setDailyCompetencies((current) => ({ ...current, [activeDay]: value }));
                            setValue(activeCompetencyField, value, { shouldDirty: true, shouldValidate: false });
                          }}
                        />
                        {errors[activeCompetencyField] && <p role="alert" className="text-sm text-destructive">{errors[activeCompetencyField]?.message}</p>}
                      </div>

                      <fieldset>
                        <legend className="text-sm font-medium text-foreground">Assessment type</legend>
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                          {examTypes.map((type) => (
                            <Button
                              key={type}
                              type="button"
                              variant={watchedValues[activeExamTypeField] === type ? "default" : "outline"}
                              className="h-11 whitespace-normal px-3 text-xs sm:text-sm"
                              aria-pressed={watchedValues[activeExamTypeField] === type}
                              onClick={() => {
                                setValue(activeExamTypeField, type, { shouldValidate: true });
                                if (type === "HOLIDAY") {
                                  setDailyCompetencies((current) => ({ ...current, [activeDay]: "HOLIDAY" }));
                                  setValue(activeCompetencyField, "HOLIDAY", { shouldValidate: true });
                                }
                              }}
                            >
                              {type}
                            </Button>
                          ))}
                        </div>
                        {errors[activeExamTypeField] && <p role="alert" className="mt-2 text-sm text-destructive">{errors[activeExamTypeField]?.message}</p>}
                      </fieldset>

                      <fieldset>
                        <legend className="text-sm font-medium text-foreground">Question count</legend>
                        <div className="mt-2 flex flex-wrap items-end gap-2">
                          {questionCounts.map((count) => (
                            <Button
                              key={count}
                              type="button"
                              variant={watchedValues[activeQuestionCountField] === count ? "default" : "outline"}
                              className="h-11 min-w-14"
                              aria-pressed={watchedValues[activeQuestionCountField] === count}
                              onClick={() => setValue(activeQuestionCountField, count, { shouldValidate: true })}
                            >
                              {count}
                            </Button>
                          ))}
                          <div className="ml-1 space-y-1">
                            <Label htmlFor={`${activeQuestionCountField}-custom`} className="text-xs text-muted-foreground">Custom</Label>
                            <Input
                              id={`${activeQuestionCountField}-custom`}
                              type="number"
                              min={3}
                              max={20}
                              inputMode="numeric"
                              className="w-24"
                              value={watchedValues[activeQuestionCountField] ?? 5}
                              onChange={(event) => setValue(activeQuestionCountField, Number(event.target.value), { shouldValidate: true })}
                            />
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">Choose between 3 and 20 questions.</p>
                        {errors[activeQuestionCountField] && <p role="alert" className="mt-2 text-sm text-destructive">{errors[activeQuestionCountField]?.message}</p>}
                      </fieldset>
                    </div>
                  </div>
                </section>
              )}

              <section aria-labelledby="review-heading" className="border-t border-border pt-7">
                <div className="mb-5 flex items-center gap-3">
                  <span className="font-display text-2xl font-semibold text-secondary">04</span>
                  <div>
                    <h2 id="review-heading" className="font-display text-2xl font-semibold text-foreground">Review details</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Add optional context that should guide the generated draft.</p>
                  </div>
                </div>
                <div className="grid gap-5 md:grid-cols-[.7fr_1.3fr]">
                  <div className="space-y-2">
                    <Label htmlFor="matrix-code">Curriculum code <span className="text-muted-foreground">(optional)</span></Label>
                    <Input id="matrix-code" placeholder="e.g., EN6V-Ia-1" {...register("code")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="matrix-instructions">Custom instructions <span className="text-muted-foreground">(optional)</span></Label>
                    <Textarea id="matrix-instructions" rows={5} placeholder="Add assessment criteria, differentiation needs, classroom context, or other guidance…" {...register("customInstructions")} />
                  </div>
                </div>
              </section>

              <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="ghost" onClick={() => {
                  reset();
                  setDailyCompetencies({ monday: "", tuesday: "", wednesday: "", thursday: "", friday: "" });
                  setActiveDay("monday");
                  setExtractedData(null);
                  setExtractedTextPreview("");
                  setUploadedFile(null);
                  setExtractionSuccess(false);
                }} disabled={loading}>
                  Reset form
                </Button>
                <div className="flex flex-col gap-2 sm:items-end">
                  <Button 
                    type="submit" 
                    disabled={loading || !isFormComplete(watchedValues) || (matrixMode === "automatic" && !extractionSuccess)}
                    className="gap-2 sm:min-w-60"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                    {loading ? "Generating WeeLMat…" : "Generate WeeLMat"}
                  </Button>
                  {matrixMode === "automatic" && !extractionSuccess && (
                    <p className="text-sm font-medium text-warning">Upload and review a learning material to enable generation.</p>
                  )}
                  {matrixMode === "automatic" && extractionSuccess && !isFormComplete(watchedValues) && (
                    <p className="text-sm font-medium text-warning">
                      Extraction is complete. Add: {[
                        !watchedValues.subject && "Subject",
                        !watchedValues.gradeLevel && "Grade level", 
                        !watchedValues.section && "Section",
                        (!watchedValues.dateFrom || !watchedValues.dateTo) && "Week dates"
                      ].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {matrixMode === "manual" && !isFormComplete(watchedValues) && (
                    <p className="text-sm text-muted-foreground">Complete the class details and all five school days to generate.</p>
                  )}
                  {extractionSuccess && isFormComplete(watchedValues) && (
                    <p className="text-sm font-medium text-success">Ready to generate your editable WeeLMat draft.</p>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
        <aside className="space-y-5 lg:sticky lg:top-24">
          <div className="rounded-2xl border border-primary/15 bg-primary p-6 text-primary-foreground shadow-[0_18px_45px_-38px_rgba(20,32,25,.8)]">
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-secondary">Weekly progress</p>
            <p className="font-display mt-3 text-3xl font-semibold">{completedDays} of 5 days</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15" aria-label={`${completedDays} of 5 days complete`} role="progressbar" aria-valuemin={0} aria-valuemax={5} aria-valuenow={completedDays}>
              <div className="h-full rounded-full bg-secondary transition-[width] duration-300" style={{ width: `${completedDays * 20}%` }} />
            </div>
            <ol className="mt-6 space-y-2 text-sm">
              {planningDays.map(({ day, prefix }) => (
                <li key={day} className="flex items-center justify-between gap-3">
                  <button type="button" className="min-h-11 flex-1 rounded-md px-2 text-left font-medium transition-colors hover:bg-white/10 hover:text-secondary" onClick={() => { setMatrixMode("manual"); setActiveDay(prefix); }}>
                    {day}
                  </button>
                  {isDayComplete(prefix) ? <CheckCircle2 className="h-5 w-5 text-secondary" aria-label="Complete" /> : <span className="h-5 w-5 rounded-full border border-white/35" aria-label="Incomplete" />}
                </li>
              ))}
            </ol>
            <p className="mt-6 border-t border-white/15 pt-5 text-xs leading-5 text-primary-foreground/65">Teacher judgment remains responsible for accuracy, learner suitability, and curriculum alignment.</p>
          </div>

          {loading && (
            <div className="rounded-2xl border border-border bg-card p-6" aria-live="polite">
              <p className="font-display text-xl font-semibold text-foreground">Creating your draft</p>
              <div className="mt-4 space-y-3">
                {steps.map((step, index) => (<Step key={step} active={index <= stepIndex} text={step} />))}
              </div>
            </div>
          )}

          {result && (
            <div className="rounded-2xl border border-success/25 bg-success/10 p-6">
              <p className="font-display text-xl font-semibold text-success">WeeLMat ready</p>
              <p className="mb-4 mt-1 text-sm text-muted-foreground">Saved to your files.</p>
              <div className="mb-4 space-y-1 text-sm">
                <p><span className="text-muted-foreground">Subject:</span> {result.subject}</p>
                <p><span className="text-muted-foreground">Grade/Section:</span> {result.grade} • {result.section}</p>
                <p><span className="text-muted-foreground">Dates:</span> {result.dates}</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="secondary" asChild disabled={!result.docx}>
                  <a href={result.docx} target="_blank" rel="noreferrer">Download DOCX</a>
                </Button>
                <Button variant="outline" asChild disabled={!result.pdf}>
                  <a href={result.pdf} target="_blank" rel="noreferrer">Download PDF</a>
                </Button>
              </div>
              <Button className="mt-4" variant="ghost" onClick={()=>{ setResult(null); reset(); }}>Create another</Button>
            </div>
          )}
        </aside>
      </section>
      
      <section className="mt-10 rounded-2xl border border-secondary/35 bg-secondary/10 p-6" aria-labelledby="responsible-use-heading">
        <h2 id="responsible-use-heading" className="font-display text-2xl font-semibold text-foreground">Responsible use</h2>
        <div className="mt-5 grid gap-5 text-sm leading-6 text-muted-foreground md:grid-cols-3">
          <p><strong className="text-foreground">Independent support tool.</strong> WeeLMat Generator is not an official DepEd system or endorsement.</p>
          <p><strong className="text-foreground">Review every output.</strong> Confirm curriculum alignment, accuracy, accessibility, workload, and your learners’ context before use.</p>
          <p><strong className="text-foreground">Built to reduce preparation load.</strong> Hosting and AI services carry real costs, so availability and generation limits may change.</p>
        </div>
      </section>
          </div>
        </main>
      )}
    </>
  );
};

export default Dashboard;
