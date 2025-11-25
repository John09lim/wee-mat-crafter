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
import { Upload, FileText, Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";

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

const Step = ({active, text}:{active:boolean;text:string}) => (
  <div className={`flex items-center gap-2 ${active?"text-primary":"text-muted-foreground"}`}>
    <div className={`h-2 w-2 rounded-full ${active?"bg-primary":"bg-border"}`}/>
    <span className="text-sm">{text}</span>
  </div>
)

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [showPasscodeDialog, setShowPasscodeDialog] = useState(false);
  const [passcodeVerified, setPasscodeVerified] = useState(false);
  const [matrixMode, setMatrixMode] = useState<"automatic" | "manual">("manual");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
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
    mondayQuestionCount: 10,
    tuesdayQuestionCount: 10,
    wednesdayQuestionCount: 10,
    thursdayQuestionCount: 10,
    fridayQuestionCount: 10,
    mondayExamType: "Multiple Choice",
    tuesdayExamType: "Multiple Choice",
    wednesdayExamType: "Multiple Choice",
    thursdayExamType: "Multiple Choice",
    fridayExamType: "Multiple Choice",
  }
});

// Check for prefill data from history regeneration
useEffect(() => {
  const prefillData = location.state?.prefillData;
  if (prefillData) {
    reset(prefillData);
    toast.success("Form pre-filled from saved WeeLMat");
  }
}, [location.state, reset]);

const [customCounts, setCustomCounts] = useState<Record<string, number>>({});

const watchedValues = watch();

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
    navigate("/weelmatgenerator", { state: values });
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

    // Validate file type
    const validTypes = [
      'application/pdf', 
      'image/jpeg', 
      'image/png', 
      'image/jpg',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
      'application/msword' // DOC
    ];
    if (!validTypes.includes(file.type)) {
      toast.error("Only DOCX, PDF, and Image files are supported");
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

      // Auto-fill form fields with extracted data
      if (data.success) {
        setExtractedData(data);
        
        // Pre-fill Monday-Friday data
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        const dayNames: Record<string, string> = {
          monday: 'Monday',
          tuesday: 'Tuesday',
          wednesday: 'Wednesday',
          thursday: 'Thursday',
          friday: 'Friday'
        };
        
        days.forEach((day) => {
          const dayData = data.dailyPlan?.[dayNames[day]];
          if (dayData) {
            setValue(`${day}Competency` as any, dayData.competency || '');
            setValue(`${day}ExamType` as any, dayData.examType || 'Multiple Choice');
            setValue(`${day}QuestionCount` as any, dayData.questionCount || 10);
          }
        });

        setUploadedFile(file);
        toast.success("File processed! Competencies auto-filled for Monday-Friday");
      }
      
      setUploadProgress(100);
    } catch (error) {
      console.error('File upload error:', error);
      toast.error("Failed to process file. Please try manual mode or upload a different file.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <PasscodeDialog 
        open={showPasscodeDialog} 
        onPasscodeVerified={handlePasscodeVerified}
      />
      
      {passcodeVerified && (
        <main className="min-h-[calc(100vh-160px)] py-12 bg-background">
          <div className="container mb-4">
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
          <section className="container grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h1 className="text-2xl font-semibold mb-4">Create a Weekly Learning Matrix</h1>
            <form className="grid gap-5" onSubmit={handleSubmit(onSubmit)}>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label>Subject Area</Label>
                  <Input placeholder={`e.g., ${subjectSuggestions.join(', ')}`} {...register("subject")} />
                  {errors.subject && <p className="text-destructive text-sm mt-1">{errors.subject.message}</p>}
                </div>
                <div>
                  <Label>Grade Level</Label>
                  <Select onValueChange={(v)=>setValue("gradeLevel", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {grades.map((g)=> (<SelectItem key={g} value={g}>{g}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  {errors.gradeLevel && <p className="text-destructive text-sm mt-1">{errors.gradeLevel.message}</p>}
                </div>
              </div>

              <div>
                <Label>Language Used</Label>
                <Select onValueChange={(v)=>setValue("language", v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Filipino">Filipino</SelectItem>
                  </SelectContent>
                </Select>
                {errors.language && <p className="text-destructive text-sm mt-1">{errors.language.message}</p>}
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Section</Label>
                  <Input {...register("section")} />
                  {errors.section && <p className="text-destructive text-sm mt-1">{errors.section.message}</p>}
                </div>
                <div>
                  <Label>From</Label>
                  <Input type="date" {...register("dateFrom")} />
                  {errors.dateFrom && <p className="text-destructive text-sm mt-1">{errors.dateFrom.message}</p>}
                </div>
                <div>
                  <Label>To</Label>
                  <Input type="date" {...register("dateTo")} />
                  {errors.dateTo && <p className="text-destructive text-sm mt-1">{errors.dateTo.message}</p>}
                </div>
              </div>

              {/* Mode Selection Toggle */}
              <div className="mb-6">
                <Label className="text-base font-medium mb-3 block">Matrix Content Generation Mode</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    variant={matrixMode === "automatic" ? "default" : "outline"}
                    className="h-24 flex flex-col items-center justify-center gap-2"
                    onClick={() => setMatrixMode("automatic")}
                  >
                    <Upload className="h-6 w-6" />
                    <span className="font-semibold">Automatic Matrix Content</span>
                    <span className="text-xs opacity-80">Upload file to auto-fill</span>
                  </Button>
                  <Button
                    type="button"
                    variant={matrixMode === "manual" ? "default" : "outline"}
                    className="h-24 flex flex-col items-center justify-center gap-2"
                    onClick={() => setMatrixMode("manual")}
                  >
                    <FileText className="h-6 w-6" />
                    <span className="font-semibold">Manual Matrix Content</span>
                    <span className="text-xs opacity-80">Enter competencies manually</span>
                  </Button>
                </div>
              </div>

              {/* Automatic Mode - File Upload */}
              {matrixMode === "automatic" && (
                <div className="border rounded-lg p-6 space-y-4 bg-muted/30 mb-6">
                  <Label className="text-base font-medium">Upload Learning Material (DOCX/PDF/Image) to Auto-Fill</Label>
                  <p className="text-sm text-muted-foreground">
                    Upload a lesson plan, curriculum guide, or teaching material (DOCX, PDF, or Image). 
                    AI will automatically extract competencies, exam types, and question counts for Monday-Friday.
                  </p>
                  
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,image/*"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  
                  {uploadedFile && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Check className="h-4 w-4" />
                      <span>File uploaded: {uploadedFile.name}</span>
                    </div>
                  )}
                  
                  {uploading && (
                    <div className="space-y-2">
                      <Progress value={uploadProgress} />
                      <p className="text-sm text-muted-foreground text-center">Processing file...</p>
                    </div>
                  )}
                </div>
              )}

              {/* Manual Mode - Daily Learning Plan Setup */}
              {matrixMode === "manual" && (
                <div className="mb-4">
                  <Label className="text-base font-medium">Daily Learning Plan Setup</Label>
                  <p className="text-sm text-muted-foreground">Configure competency, exam type, and question count for each day. All fields are required.</p>
                </div>
              )}

              {/* Daily Fields - Only show in Manual mode */}
              {matrixMode === "manual" && (
                <div className="grid gap-6">
                  {[
                    { day: "Monday", prefix: "monday" },
                    { day: "Tuesday", prefix: "tuesday" },
                    { day: "Wednesday", prefix: "wednesday" },
                    { day: "Thursday", prefix: "thursday" },
                    { day: "Friday", prefix: "friday" }
                  ].map(({ day, prefix }) => (
                    <div key={day} className="border rounded-lg p-4 space-y-4">
                      <h3 className="font-medium text-lg text-primary">{day}</h3>
                      
                      {/* Competency */}
                      <div>
                        <Label htmlFor={`${prefix}Competency`}>Competency</Label>
                        <Textarea 
                          rows={2} 
                          placeholder={`Enter ${day}'s competency exactly as you want it to appear`} 
                          {...register(`${prefix}Competency` as any)} 
                        />
                        {errors[`${prefix}Competency` as keyof typeof errors] && (
                          <p className="text-destructive text-sm mt-1">
                            {errors[`${prefix}Competency` as keyof typeof errors]?.message}
                          </p>
                        )}
                      </div>

                      {/* Exam Type */}
                      <div>
                        <Label>Exam Type</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                          {examTypes.map((type) => (
                            <Button
                              key={type}
                              type="button"
                              variant={watchedValues[`${prefix}ExamType` as keyof FormValues] === type ? "default" : "outline"}
                              size="sm"
                              className="text-xs h-8"
                              onClick={() => {
                                setValue(`${prefix}ExamType` as any, type);
                                // Auto-populate competency when HOLIDAY is selected
                                if (type === "HOLIDAY") {
                                  setValue(`${prefix}Competency` as any, "HOLIDAY");
                                }
                              }}
                            >
                              {type}
                            </Button>
                          ))}
                        </div>
                        {errors[`${prefix}ExamType` as keyof typeof errors] && (
                          <p className="text-destructive text-sm mt-1">
                            {errors[`${prefix}ExamType` as keyof typeof errors]?.message}
                          </p>
                        )}
                      </div>

                      {/* Question Count */}
                      <div>
                        <Label>Question Count</Label>
                        <div className="flex items-center gap-2 mt-2">
                          {questionCounts.map((count) => (
                            <Button
                              key={count}
                              type="button"
                              variant={watchedValues[`${prefix}QuestionCount` as keyof FormValues] === count ? "default" : "outline"}
                              size="sm"
                              className="text-xs h-8 w-12"
                              onClick={() => setValue(`${prefix}QuestionCount` as any, count)}
                            >
                              {count}
                            </Button>
                          ))}
                        </div>
                        {errors[`${prefix}QuestionCount` as keyof typeof errors] && (
                          <p className="text-destructive text-sm mt-1">
                            {errors[`${prefix}QuestionCount` as keyof typeof errors]?.message}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Code (optional)</Label>
                  <Input placeholder="e.g., EN6V-Ia-1" {...register("code")} />
                </div>
                <div>
                  <Label>Custom Instructions (optional)</Label>
                  <Textarea rows={6} placeholder="Additional context, specific assessment criteria, differentiation needs, classroom management considerations, or other requirements for the learning activities…" {...register("customInstructions")} />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button 
                  type="submit" 
                  disabled={loading || !isFormComplete(watchedValues)}
                  className="relative"
                >
                  {loading ? "Generating…" : "Generate WeeLMat (DOCX)"}
                </Button>
                <Button type="button" variant="outline" onClick={() => {
                  reset();
                  setCustomCounts({});
                }} disabled={loading}>
                  Reset
                </Button>
                {!isFormComplete(watchedValues) && (
                  <p className="text-sm text-muted-foreground">
                    Complete all daily configurations to generate
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>
        <aside className="space-y-6">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <p className="font-semibold mb-3">Status</p>
            <div className="space-y-2">
              {steps.map((s, i)=> (<Step key={s} active={i<=stepIndex && loading} text={s} />))}
            </div>
          </div>

          {result && (
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <p className="font-semibold mb-2">Success</p>
              <p className="text-sm text-muted-foreground mb-4">Saved to My Files</p>
              <div className="text-sm mb-4">
                <p><span className="text-muted-foreground">Subject:</span> {result.subject}</p>
                <p><span className="text-muted-foreground">Grade/Section:</span> {result.grade} • {result.section}</p>
                <p><span className="text-muted-foreground">Dates:</span> {result.dates}</p>
              </div>
              <div className="flex gap-3">
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
      
      <section className="mt-12 p-6 bg-muted/30 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Important Disclaimer</h3>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>1.</strong> This website is not officially endorsed by DepEd NIR Region. This website is to address and help the rising concerns of teachers in the creation of WeeLMat Matrix, thus giving a load of burden for teachers. If you use this site, this is at your own cost.
          </p>
          <p>
            <strong>2.</strong> Tokens are very expensive for multiple users using the site. That's why it took longer time to make alternative ways to make it FREE of use for everyone.
          </p>
          <p>
            <strong>3.</strong> AI outputs and links are suggestions. Please review, edit, and ensure alignment with your curriculum, division policies, and class context before use.
          </p>
          <p>
            <strong>4.</strong> The site (domain, hosting, and launch) and the AI token credits were paid out-of-pocket by the creator so the tool is usable by everyone. The sole intention is to help teachers reduce workload.
          </p>
          <p>
            <strong>5.</strong> The creator/developer of this site plans to be anonymous. This is not to make him known to everyone, only to help teachers.
          </p>
        </div>
      </section>
        </main>
      )}
    </>
  );
};

export default Dashboard;