import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";

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

const logoUrl = "/weelmat-logo.png";

const WeeLMatGenerator = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const values = (location.state || null) as FormValues | null;

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
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [aiJson, setAiJson] = useState<any | null>(null);
  const [matrixId, setMatrixId] = useState<string | null>(null);

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
    if (!values) {
      console.error("WeeLMatGenerator: No form values provided, redirecting to dashboard");
      navigate("/dashboard");
      return;
    }

    console.log("WeeLMatGenerator: Received form values:", values);

    let timers: number[] = [];
    // Minimum 15-second loading with staged progression
    timers.push(window.setTimeout(() => setStepIndex(1), 3000));
    timers.push(window.setTimeout(() => setStepIndex(2), 6000));
    timers.push(window.setTimeout(() => setStepIndex(3), 9000));

    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const access_token = sessionData.session?.access_token;
        if (!access_token) throw new Error("Not authenticated");

        console.log("WeeLMatGenerator: Calling edge function with:", values);

        const { data, error } = await supabase.functions.invoke("generate-weelmat", {
          headers: { Authorization: `Bearer ${access_token}` },
          body: values,
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
        setPdfUrl(data?.pdf_url || null);
        setAiJson(data?.ai_json || null);
        setMatrixId(data?.matrix_id || null);
      } catch (err: any) {
        console.error("WeeLMatGenerator: Error details:", err);
        const errorMessage = err.message || "Generation failed";
        toast(`Error: ${errorMessage}. Please check that all form fields are complete and try again.`);
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [navigate, values]);

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

    } catch (error: any) {
      console.error("Error generating LogSheet:", error);
      toast(`Error: ${error.message || "Failed to generate Log Sheet"}`);
    }
  };

  const Success = () => {
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
      <section className="container max-w-6xl animate-fade-in">
        <article className="rounded-2xl border bg-card text-card-foreground shadow-sm overflow-hidden">
          <header className="px-6 pt-6 pb-4 border-b flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">WeeLMat is ready</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Preview below, then download or save to your files.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </header>
          <div className="p-6 space-y-5">
            {/* Instructions Panel - Collapsible */}
            <div className="rounded-xl border bg-muted/30 p-4">
              <details className="group">
                <summary className="cursor-pointer font-semibold text-sm text-muted-foreground hover:text-foreground transition-colors">
                  📋 Instructions & Tips (click to expand)
                </summary>
                <div className="mt-3 text-sm text-muted-foreground space-y-2 group-open:animate-fade-in">
                  <p><strong>About WeeLMat:</strong> This tool generates a Weekly Learning Matrix following DepEd guidelines for curriculum planning.</p>
                  <p><strong>Using the preview:</strong> Review the competencies (your exact inputs) and generated learning activities before downloading.</p>
                  <p><strong>DOCX format:</strong> Compatible with Microsoft Word and Google Docs for easy editing and sharing.</p>
                  <p><strong>Important:</strong> This is an unofficial tool. Generated content should be reviewed by educators before classroom use.</p>
                </div>
              </details>
            </div>
            
            <div className="rounded-xl border bg-background p-4">
              <div className="text-center space-y-1 mb-4">
                {values?.language === 'Filipino' ? (
                  <>
                    <p className="font-semibold">Lingguhang Matris ng Pagkatuto (WeeLMat)</p>
                    <p className="text-sm text-muted-foreground">{values?.subject} • {values?.gradeLevel} • {values?.section}</p>
                    <p className="text-sm text-muted-foreground">Petsa na Nasaklaw: {values?.dateFrom} – {values?.dateTo}</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold">Weekly Learning Matrix (WeeLMat)</p>
                    <p className="text-sm text-muted-foreground">{values?.subject} • {values?.gradeLevel} • {values?.section}</p>
                    <p className="text-sm text-muted-foreground">Covered Dates: {values?.dateFrom} – {values?.dateTo}</p>
                  </>
                )}
              </div>
              {aiJson ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-xs min-w-[120px] font-semibold"></TableCell>
                        {calculateWeekdayDates().map((date, i) => (
                          <TableCell key={i} className="text-xs min-w-[120px] font-semibold text-center whitespace-pre-line">{date}</TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-semibold text-xs min-w-[120px]">
                          {values?.language === 'Filipino' ? 'Kompetensya' : 'Competency'}
                        </TableCell>
                        <TableCell className="text-xs min-w-[120px] break-words">{values?.mondayCompetency || ""}</TableCell>
                        <TableCell className="text-xs min-w-[120px] break-words">{values?.tuesdayCompetency || ""}</TableCell>
                        <TableCell className="text-xs min-w-[120px] break-words">{values?.wednesdayCompetency || ""}</TableCell>
                        <TableCell className="text-xs min-w-[120px] break-words">{values?.thursdayCompetency || ""}</TableCell>
                        <TableCell className="text-xs min-w-[120px] break-words">{values?.fridayCompetency || ""}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-semibold text-xs min-w-[120px]">
                          {values?.language === 'Filipino' ? 'Mungkahing Materyales/Sanggunian' : 'Suggested Learning Material/Reference'}
                        </TableCell>
                        {["mon","tue","wed","thu","fri"].map((d) => (
                          <TableCell key={d} className="text-xs min-w-[120px] break-words">{aiJson?.references?.[d] || ""}</TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-semibold text-xs min-w-[120px]">
                          {values?.language === 'Filipino' ? 'Mga Gawain/Aktividad sa Pagkatuto' : 'Learning Activities/Tasks'}
                        </TableCell>
                        {["mon","tue","wed","thu","fri"].map((d) => (
                          <TableCell key={d} className="text-xs min-w-[120px] break-words">
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

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button disabled={!docxUrl} onClick={() => docxUrl && downloadFile(docxUrl, buildFilename("docx"))}>
                Download DOCX
              </Button>
              <Button onClick={handleGenerateLogSheet}>
                Generate Log Sheet
              </Button>
            </div>
          </div>
        </article>
      </section>
    );
  };

  return (
    <main className="min-h-[calc(100vh-160px)] bg-background">
      <section className="container max-w-3xl py-16">
        {loading ? (
          <div className="rounded-3xl border bg-card text-card-foreground p-8 shadow-sm flex flex-col items-center gap-6 animate-fade-in">
            <img
              src={logoUrl}
              alt="WeeLMat school logo"
              className="h-28 w-auto object-contain rounded-md"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/Screenshot%202025-08-11%20074334.png";
              }}
              loading="eager"
              fetchPriority="high"
            />
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full w-1/3 bg-primary animate-[slide-in-right_1.4s_ease-out_infinite]" />
            </div>
            <div className="w-full grid gap-2">
              {steps.map((s, i) => (
                <div key={s} className={`flex items-center gap-2 ${i <= stepIndex ? "text-primary" : "text-muted-foreground"}`}>
                  <span className={`h-2 w-2 rounded-full ${i <= stepIndex ? "bg-primary" : "bg-border"}`} />
                  <span className="text-sm">{s}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">This may take ~15–30 seconds for quality results.</p>
          </div>
        ) : (
          <Success />
        )}
      </section>
    </main>
  );
};

export default WeeLMatGenerator;
