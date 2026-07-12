import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";
import { WeeLMatDownloadModal } from "@/components/WeeLMatDownloadModal";
import { ArrowLeft, ClipboardList, Download, FileCheck2, Info, Loader2, Send, ShieldCheck } from "lucide-react";

// Form values passed from Dashboard
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

interface GeneratedMatrixContent {
  references?: Record<string, string>;
  activities?: Record<string, string>;
}

const logoUrl = "/weelmat-logo.png";

const WeeLMatGenerator = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialValues = (location.state || null) as FormValues | null;

  // Store form values in state to preserve them after location.state clears
  const [formValues, setFormValues] = useState<FormValues | null>(initialValues);

  const steps = useMemo(
    () => [
      "Planning daily assessments…",
      "Selecting trusted references…", 
      "Drafting learning activities…",
      "Building DOCX…",
    ],
    []
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [docxUrl, setDocxUrl] = useState<string | null>(null);
  const [studentDocxUrl, setStudentDocxUrl] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [aiJson, setAiJson] = useState<GeneratedMatrixContent | null>(null);
  const [matrixId, setMatrixId] = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // Use formValues throughout the component (preserved in state)
  const values = formValues;

  useEffect(() => {
    document.title = "WeeLMat Generator | WeeLMat";
    const desc =
      "Generate your Weekly Learning Matrix (WeeLMat) with curated sources and downloadable DOCX/PDF.";
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = desc;
    // canonical
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = window.location.origin + "/weelmatgenerator";
    
    // Preload LCP image for better performance
    let preloadLink = document.querySelector('link[rel="preload"][href="/weelmat-logo.png"]') as HTMLLinkElement | null;
    if (!preloadLink) {
      preloadLink = document.createElement("link");
      preloadLink.rel = "preload";
      preloadLink.as = "image";
      preloadLink.href = "/weelmat-logo.png";
      document.head.appendChild(preloadLink);
    }
  }, []);

  useEffect(() => {
    if (!formValues) {
      console.error("WeeLMatGenerator: No form values provided, redirecting to dashboard");
      navigate("/dashboard");
      return;
    }

    console.log("WeeLMatGenerator: Received form values:", formValues);

    const timers: number[] = [];
    // Minimum 15-second loading with staged progression
    timers.push(window.setTimeout(() => setStepIndex(1), 3000));
    timers.push(window.setTimeout(() => setStepIndex(2), 6000));
    timers.push(window.setTimeout(() => setStepIndex(3), 9000));

    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const access_token = sessionData.session?.access_token;
        if (!access_token) throw new Error("Not authenticated");

        console.log("WeeLMatGenerator: Calling edge function with:", formValues);

        const { data, error } = await supabase.functions.invoke("generate-weelmat", {
          headers: { Authorization: `Bearer ${access_token}` },
          body: formValues,
        });

        console.log("WeeLMatGenerator: Edge function response:", { data, error });

        if (error) {
          console.error("WeeLMatGenerator: Edge function error:", error);
          throw new Error(error.message || "Edge function returned an error");
        }

        if (!data) {
          console.error("WeeLMatGenerator: No data in response");
          throw new Error("No data received from edge function");
        }

        console.log("WeeLMatGenerator: Success! Received data:", data);

        setDocxUrl(data?.docx_url || null);
        setStudentDocxUrl(data?.student_docx_url || null);
        setPdfUrl(data?.pdf_url || null);
        setAiJson((data?.ai_json as GeneratedMatrixContent | null) || null);
        setMatrixId(data?.matrix_id || null);
      } catch (err: unknown) {
        console.error("WeeLMatGenerator: Error details:", err);
        const errorMessage = err instanceof Error ? err.message : "Generation failed";
        toast(`Error: ${errorMessage}. Please check that all form fields are complete and try again.`);
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [navigate, formValues]);

  const downloadFile = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } catch (e) {
      toast("Download failed");
    }
  };

  const buildFilename = (ext: string) => {
    const safe = (s?: string) => (s || "").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
    return `weelmat-${safe(values?.subject)}-${safe(values?.gradeLevel)}-${safe(values?.section)}-${values?.dateFrom || ""}-${values?.dateTo || ""}.${ext}`;
  };

  // Calculate Monday-Friday dates in MM-DD-YYYY format
  const calculateWeekdayDates = () => {
    if (!values?.dateFrom || !values?.dateTo) {
      const defaultDays = values?.language === 'Filipino' ? 
        ["Lunes", "Martes", "Miyerkules", "Huwebes", "Biyernes"] :
        ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
      return defaultDays;
    }
    
    try {
      const startDate = new Date(values.dateFrom);
      const endDate = new Date(values.dateTo);
      
      // Find the Monday of the week containing startDate
      const monday = new Date(startDate);
      const dayOfWeek = monday.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday = 0, Monday = 1
      monday.setDate(monday.getDate() + daysToMonday);
      
      const weekdays = [];
      const dayNames = values?.language === 'Filipino' ? 
        ["Lunes", "Martes", "Miyerkules", "Huwebes", "Biyernes"] :
        ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
      
      for (let i = 0; i < 5; i++) {
        const currentDay = new Date(monday);
        currentDay.setDate(monday.getDate() + i);
        
        // Check if the current day is within the date range
        if (currentDay >= startDate && currentDay <= endDate) {
          const month = String(currentDay.getMonth() + 1).padStart(2, '0');
          const day = String(currentDay.getDate()).padStart(2, '0');
          const year = currentDay.getFullYear();
          // Format as "Day\nMM-DD-YYYY"
          weekdays.push(`${dayNames[i]}\n${month}-${day}-${year}`);
        } else {
          weekdays.push(dayNames[i]);
        }
      }
      
      return weekdays;
    } catch (error) {
      const defaultDays = values?.language === 'Filipino' ? 
        ["Lunes", "Martes", "Miyerkules", "Huwebes", "Biyernes"] :
        ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
      return defaultDays;
    }
  };

  const handleGenerateLogSheet = async () => {
    if (!values) {
      toast("No form data available");
      return;
    }

    // Validate required fields
    const requiredFields = [
      { field: 'subject', label: 'Subject' },
      { field: 'gradeLevel', label: 'Grade Level' },
      { field: 'section', label: 'Section' },
      { field: 'mondayCompetency', label: 'Monday competency' },
      { field: 'tuesdayCompetency', label: 'Tuesday competency' },
      { field: 'wednesdayCompetency', label: 'Wednesday competency' },
      { field: 'thursdayCompetency', label: 'Thursday competency' },
      { field: 'fridayCompetency', label: 'Friday competency' }
    ];

    for (const { field, label } of requiredFields) {
      if (!values[field as keyof FormValues]) {
        toast("Please complete Subject, Grade, Section, and all five daily competencies before generating the Log Sheet.");
        return;
      }
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const access_token = sessionData.session?.access_token;

      if (!access_token) {
        toast("Please log in to generate Log Sheet");
        navigate("/auth");
        return;
      }

      toast("Generating Log Sheet...");

      const { data, error } = await supabase.functions.invoke("generate-logsheet", {
        headers: { Authorization: `Bearer ${access_token}` },
        body: values,
      });

      if (error) {
        console.error("LogSheet generation error:", error);
        throw new Error(error.message || "Failed to generate Log Sheet");
      }

      if (!data?.docx_url) {
        throw new Error("No file URL received from generation");
      }

      // Auto-download the file
      await downloadFile(data.docx_url, data.filename || "logsheet.docx");
      toast("Log Sheet downloaded successfully!");

    } catch (error: unknown) {
      console.error("Error generating LogSheet:", error);
      toast(`Error: ${error instanceof Error ? error.message : "Failed to generate Log Sheet"}`);
    }
  };

  const Success = () => {
    // Handler for downloading teacher version (full DOCX with answer key)
    const handleDownloadTeacher = async () => {
      if (docxUrl) {
        await downloadFile(docxUrl, buildFilename("docx"));
        toast("Teacher version downloaded successfully!");
      } else {
        toast("Teacher DOCX file is not available.");
      }
      setShowDownloadModal(false);
    };

    // Handler for downloading student version (DOCX without answer key)
    const handleDownloadStudent = async () => {
      if (studentDocxUrl) {
        await downloadFile(studentDocxUrl, buildFilename("docx").replace(".docx", "-student.docx"));
        toast("Student version downloaded successfully!");
      } else {
        toast("Student DOCX file is not available.");
      }
      setShowDownloadModal(false);
    };

    // Handler for sharing student version
    const handleShare = async () => {
      if (!studentDocxUrl) {
        toast("Student DOCX file is not available for sharing.");
        setShowDownloadModal(false);
        return;
      }

      // Try Web Share API first (mobile and some desktop browsers)
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'WeeLMat - Student Version',
            text: `WeeLMat for ${values?.subject} - ${values?.gradeLevel}`,
            url: studentDocxUrl
          });
          toast("Shared successfully!");
        } catch (error: unknown) {
          // User cancelled share or error occurred
          if (!(error instanceof DOMException && error.name === 'AbortError')) {
            console.error('Share failed:', error);
            // Fallback to copy link
            await copyLinkFallback();
          }
        }
      } else {
        // Fallback: Copy link to clipboard
        await copyLinkFallback();
      }
      setShowDownloadModal(false);
    };

    // Fallback function to copy link to clipboard
    const copyLinkFallback = async () => {
      if (studentDocxUrl) {
        try {
          await navigator.clipboard.writeText(studentDocxUrl);
          toast("Link copied to clipboard! You can now paste it in Messenger, Email, or other apps.");
        } catch (error) {
          console.error('Clipboard copy failed:', error);
          toast("Unable to copy link. Please try downloading instead.");
        }
      }
    };

    // Function to format activity content for HTML display
    const formatActivityForPreview = (content: string) => {
      if (!content) return "";
      
      return content
        .split(/\n+/)
        .filter(line => line.trim())
        .map((line, index) => {
          const trimmedLine = line.trim();
          
          // Handle section headers (make them bold)
          if (trimmedLine.includes('Instructions/Directions:') || trimmedLine.includes('Panuto/Mga Tagubilin:') ||
              trimmedLine.includes('Quiz:') || trimmedLine.includes('Pagsusulit:') ||
              trimmedLine.includes('Expected Output:') || trimmedLine.includes('Inaasahang Output:') ||
              trimmedLine.includes('Contingency:')) {
            return `**${trimmedLine}**`;
          }
          
          // Handle questions (add extra spacing before)
          if (/^\d+\./.test(trimmedLine)) {
            return `\n${trimmedLine}`;
          }
          
          // Handle multiple choice options (indent slightly)
          if (/^\s*[A-D]\./.test(trimmedLine)) {
            return `   ${trimmedLine}`;
          }
          
          return trimmedLine;
        })
        .join('\n')
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove markdown bold since we'll handle it in CSS
        .split('\n')
        .map((line, index) => {
          const trimmedLine = line.trim();
          
          // Check if it's a header line
          const isHeader = content.includes(trimmedLine) && (
            trimmedLine.includes('Instructions/Directions:') || trimmedLine.includes('Panuto/Mga Tagubilin:') ||
            trimmedLine.includes('Quiz:') || trimmedLine.includes('Pagsusulit:') ||
            trimmedLine.includes('Expected Output:') || trimmedLine.includes('Inaasahang Output:') ||
            trimmedLine.includes('Contingency:')
          );
          
          if (isHeader) {
            return <div key={index} className="font-semibold mt-2 mb-1">{line}</div>;
          }
          
          // Check if it's a question (starts with number)
          if (/^\d+\./.test(trimmedLine)) {
            return <div key={index} className="mt-2 mb-1">{line}</div>;
          }
          
          // Check if it's a multiple choice option
          if (/^\s*[A-D]\./.test(trimmedLine)) {
            return <div key={index} className="ml-2">{line}</div>;
          }
          
          if (line.trim()) {
            return <div key={index} className="mb-1">{line}</div>;
          }
          
          return <div key={index} className="h-2"></div>;
        });
    };

    return (
      <section className="container max-w-7xl animate-fade-in">
        <article className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-[0_18px_50px_-42px_rgba(20,32,25,.55)]">
          <header className="grid gap-5 border-b border-border px-5 py-6 sm:px-7 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><FileCheck2 className="h-6 w-6" aria-hidden="true" /></span>
              <div>
              <h1 className="font-display text-3xl font-semibold text-foreground">Your WeeLMat draft is ready.</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Preview below, then download or save to your files.
              </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="gap-2">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to creator
            </Button>
          </header>
          <div className="space-y-6 p-5 sm:p-7">
            {/* Instructions Panel - Collapsible */}
            <div className="rounded-xl border border-secondary/35 bg-secondary/10 p-4">
              <details className="group">
                <summary className="cursor-pointer list-none text-sm font-semibold text-foreground transition-colors hover:text-primary">
                  <span className="inline-flex items-center gap-2"><Info className="h-4 w-4 text-primary" aria-hidden="true" />Review guidance before downloading</span>
                </summary>
                <div className="mt-3 text-sm text-muted-foreground space-y-2 group-open:animate-fade-in">
                  <p><strong>About WeeLMat:</strong> This tool generates a Weekly Learning Matrix following DepEd guidelines for curriculum planning.</p>
                  <p><strong>Using the preview:</strong> Review the competencies (your exact inputs) and generated learning activities before downloading.</p>
                  <p><strong>DOCX format:</strong> Compatible with Microsoft Word and Google Docs for easy editing and sharing.</p>
                  <p><strong>Important:</strong> This is an unofficial tool. Generated content should be reviewed by educators before classroom use.</p>
                </div>
              </details>
            </div>
            
            <div className="rounded-xl border border-border bg-[#fffdf9] p-4 sm:p-6">
              <div className="text-center space-y-1 mb-4">
                {values?.language === 'Filipino' ? (
                  <>
                    <p className="font-display text-2xl font-semibold text-primary">Lingguhang Matris ng Pagkatuto (WeeLMat)</p>
                    <p className="text-sm text-muted-foreground">{values?.subject} • {values?.gradeLevel} • {values?.section}</p>
                    <p className="text-sm text-muted-foreground">Petsa na Nasaklaw: {values?.dateFrom} – {values?.dateTo}</p>
                  </>
                ) : (
                  <>
                    <p className="font-display text-2xl font-semibold text-primary">Weekly Learning Matrix (WeeLMat)</p>
                    <p className="text-sm text-muted-foreground">{values?.subject} • {values?.gradeLevel} • {values?.section}</p>
                    <p className="text-sm text-muted-foreground">Covered Dates: {values?.dateFrom} – {values?.dateTo}</p>
                  </>
                )}
              </div>
              {aiJson ? (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <caption className="sr-only">Generated Weekly Learning Matrix preview</caption>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-xs min-w-[120px] font-semibold"></TableCell>
                        {calculateWeekdayDates().map((date, i) => (
                         <TableCell key={i} className="min-w-[140px] whitespace-pre-line bg-primary text-center text-xs font-semibold text-primary-foreground">{date}</TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-semibold text-xs min-w-[120px]">
                          {values?.language === 'Filipino' ? 'Kompetensya' : 'Competency'}
                        </TableCell>
                        <TableCell className="min-w-[140px] break-words text-sm leading-6">{values?.mondayCompetency || ""}</TableCell>
                        <TableCell className="min-w-[140px] break-words text-sm leading-6">{values?.tuesdayCompetency || ""}</TableCell>
                        <TableCell className="min-w-[140px] break-words text-sm leading-6">{values?.wednesdayCompetency || ""}</TableCell>
                        <TableCell className="min-w-[140px] break-words text-sm leading-6">{values?.thursdayCompetency || ""}</TableCell>
                        <TableCell className="min-w-[140px] break-words text-sm leading-6">{values?.fridayCompetency || ""}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-semibold text-xs min-w-[120px]">
                          {values?.language === 'Filipino' ? 'Mungkahing Materyales/Sanggunian' : 'Suggested Learning Material/Reference'}
                        </TableCell>
                        {["mon","tue","wed","thu","fri"].map((d) => (
                         <TableCell key={d} className="min-w-[140px] break-words text-sm leading-6">{aiJson?.references?.[d] || ""}</TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-semibold text-xs min-w-[120px]">
                          {values?.language === 'Filipino' ? 'Mga Gawain/Aktividad sa Pagkatuto' : 'Learning Activities/Tasks'}
                        </TableCell>
                        {["mon","tue","wed","thu","fri"].map((d) => (
                          <TableCell key={d} className="min-w-[140px] break-words text-sm leading-6">
                            <div className="space-y-1">
                              {formatActivityForPreview(aiJson?.activities?.[d] || "")}
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Preview unavailable.</p>
              )}
            </div>

            <div className="flex flex-col flex-wrap justify-end gap-3 border-t border-border pt-6 sm:flex-row">
              <Button 
                onClick={() => setShowDownloadModal(true)}
                className="gap-2"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Download files
              </Button>
              <Button variant="outline" onClick={handleGenerateLogSheet} className="gap-2">
                <ClipboardList className="h-4 w-4" aria-hidden="true" />
                Generate Log Sheet
              </Button>
              <Button 
                onClick={() => navigate("/my-account")}
                variant="secondary"
                className="gap-2"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                Open my workspace
              </Button>
            </div>
          </div>
        </article>

        {/* Download Modal */}
        <WeeLMatDownloadModal
          open={showDownloadModal}
          onOpenChange={setShowDownloadModal}
          onDownloadTeacher={handleDownloadTeacher}
          onDownloadStudent={handleDownloadStudent}
          onShare={handleShare}
        />
      </section>
    );
  };

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-background py-10 sm:py-16">
      <section className="container max-w-4xl">
        {loading ? (
          <div className="grid overflow-hidden rounded-2xl border border-primary/15 bg-card text-card-foreground shadow-[0_24px_60px_-46px_rgba(20,32,25,.65)] animate-fade-in md:grid-cols-[.8fr_1.2fr]">
            <div className="flex flex-col items-center justify-center bg-primary p-8 text-center text-primary-foreground">
            <img
              src={logoUrl}
              alt="WeeLMat school logo"
              className="h-24 w-auto rounded-md bg-white object-contain p-2"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/Screenshot%202025-08-11%20074334.png";
              }}
              loading="eager"
              fetchPriority="high"
            />
            <h1 className="font-display mt-6 text-3xl font-semibold">Creating your WeeLMat</h1>
            <p className="mt-3 text-sm leading-6 text-primary-foreground/75">The draft is being prepared from your class details and weekly plan.</p>
            </div>
            <div className="p-7 sm:p-9">
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
            <div className="mt-6 grid gap-4" role="status" aria-live="polite">
              {steps.map((s, i) => (
                <div key={s} className={`flex items-center gap-3 ${i <= stepIndex ? "text-primary" : "text-muted-foreground"}`}>
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${i <= stepIndex ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{i + 1}</span>
                  <span className="text-sm font-medium">{s}</span>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs leading-5 text-muted-foreground">Generation usually takes 15–30 seconds. Keep this page open.</p>
            <div className="mt-6 flex gap-3 rounded-lg border border-secondary/35 bg-secondary/10 p-4">
              <ShieldCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <p className="text-xs leading-5 text-foreground"><strong>Review required:</strong> Validate every generated activity and reference before classroom use.</p>
            </div>
            </div>
          </div>
        ) : (
          <Success />
        )}
      </section>
    </main>
  );
};

export default WeeLMatGenerator;
