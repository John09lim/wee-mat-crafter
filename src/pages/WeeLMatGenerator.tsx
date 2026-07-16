import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";
import { WeeLMatDownloadModal } from "@/components/WeeLMatDownloadModal";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ClipboardList, Download, FileCheck2, Info, Loader2, Send, ShieldCheck } from "lucide-react";
import { buildWeeLMatDocxBlob } from "@/lib/weelmatDocx";
import { getActivePlanningDays, specialCompetencyForTask, type PlanningDayKey, type WeeLMatFormValues } from "@/lib/weelmatPlanning";

interface GeneratedMatrixContent {
  references?: Record<string, string>;
  activities?: Record<string, string>;
  pictureQuizImages?: Record<string, string>;
}

const logoUrl = "/weelmat-logo.png";

const WeeLMatGenerator = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialValues = (location.state || null) as WeeLMatFormValues | null;

  // Store form values in state to preserve them after location.state clears
  const [formValues, setFormValues] = useState<WeeLMatFormValues | null>(initialValues);

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
  const activeDayColumns = useMemo(() => getActivePlanningDays(values?.activeDays), [values?.activeDays]);
  const activeDayKeys = useMemo(() => activeDayColumns.map(({ key }) => key), [activeDayColumns]);

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

  // Calculate labels only for the days the teacher kept in this WeeLMat.
  const calculateWeekdayDates = () => {
    const fallback = activeDayColumns.map((day) => values?.language === "Filipino" ? day.filipino : day.day);
    if (!values?.dateFrom || !values?.dateTo) return fallback;
    try {
      const startDate = new Date(values.dateFrom);
      const endDate = new Date(values.dateTo);
      const monday = new Date(startDate);
      const dayOfWeek = monday.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      monday.setDate(monday.getDate() + daysToMonday);

      return activeDayColumns.map((day) => {
        const currentDay = new Date(monday);
        currentDay.setDate(monday.getDate() + day.offset);
        const dayName = values?.language === "Filipino" ? day.filipino : day.day;
        if (currentDay >= startDate && currentDay <= endDate) {
          const month = String(currentDay.getMonth() + 1).padStart(2, '0');
          const date = String(currentDay.getDate()).padStart(2, '0');
          const year = currentDay.getFullYear();
          return `${dayName}\n${month}-${date}-${year}`;
        }
        return dayName;
      });
    } catch (error) {
      return fallback;
    }
  };

  const handleGenerateLogSheet = async () => {
    if (!values) {
      toast("No form data available");
      return;
    }

    const requiredFields: Array<{ field: keyof WeeLMatFormValues; label: string }> = [
      { field: 'subject', label: 'Subject' },
      { field: 'gradeLevel', label: 'Grade Level' },
      { field: 'section', label: 'Section' },
      ...activeDayColumns
        .filter(({ prefix }) => !specialCompetencyForTask(values[`${prefix}ExamType`]))
        .map(({ day, prefix }) => ({ field: `${prefix}Competency` as keyof WeeLMatFormValues, label: `${day} competency` })),
    ];

    for (const { field, label } of requiredFields) {
      if (!values[field]) {
        toast(`Please complete ${label} before generating the Log Sheet.`);
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
    const updatePreviewCell = (group: "references" | "activities", day: PlanningDayKey, value: string) => {
      setAiJson((current) => current ? {
        ...current,
        [group]: { ...(current[group] || {}), [day]: value },
      } : current);
    };

    const previewRows = () => {
      const competencies = activeDayColumns.map(({ prefix }) => values?.[`${prefix}Competency`] || "");
      return [
        [values?.language === "Filipino" ? "Kompetensya" : "Competency", ...competencies.map((item) => item || "")],
        [values?.language === "Filipino" ? "Mungkahing Materyales/Sanggunian" : "Suggested Learning Material/Reference", ...activeDayKeys.map((day) => aiJson?.references?.[day] || "")],
        [values?.language === "Filipino" ? "Mga Gawain/Aktividad sa Pagkatuto" : "Learning Activities/Tasks", ...activeDayKeys.map((day) => aiJson?.activities?.[day] || "")],
      ];
    };

    const downloadEditedPdf = async () => {
      if (!aiJson || !values) return;
      const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      pdf.setFontSize(16);
      pdf.text(values.language === "Filipino" ? "Lingguhang Matris ng Pagkatuto (WeeLMat)" : "Weekly Learning Matrix (WeeLMat)", 40, 38);
      pdf.setFontSize(10);
      pdf.text(`${values.subject} • ${values.gradeLevel} • ${values.section} • ${values.dateFrom} – ${values.dateTo}`, 40, 56);
      const autoTable = autoTableModule.default;
      autoTable(pdf, { startY: 72, head: [["", ...calculateWeekdayDates()]], body: previewRows(), styles: { fontSize: 7, cellPadding: 4, overflow: "linebreak" }, headStyles: { fillColor: [30, 103, 58] }, columnStyles: { 0: { fontStyle: "bold", cellWidth: 95 } } });
      pdf.save(buildFilename("pdf"));
      toast("PDF generated from the current preview.");
    };

    const downloadEditedDocx = async () => {
      if (!aiJson || !values) return;
      const logoResponse = await fetch(logoUrl);
      const logoBytes = logoResponse.ok ? new Uint8Array(await logoResponse.arrayBuffer()) : undefined;
      const imageEntries = await Promise.all(activeDayColumns.map(async ({ key }) => {
        const imageUrl = aiJson.pictureQuizImages?.[key];
        if (!imageUrl) return [key, undefined] as const;
        try {
          const response = await fetch(imageUrl);
          return [key, response.ok ? new Uint8Array(await response.arrayBuffer()) : undefined] as const;
        } catch {
          return [key, undefined] as const;
        }
      }));
      const blob = await buildWeeLMatDocxBlob({
        values,
        content: aiJson,
        days: activeDayColumns,
        dayLabels: calculateWeekdayDates(),
        logoBytes,
        imageBytes: Object.fromEntries(imageEntries),
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = buildFilename("docx");
      anchor.click();
      URL.revokeObjectURL(url);
      toast("Teacher DOCX generated from the current preview.");
    };

    // Handler for downloading teacher version (full DOCX with answer key)
    const handleDownloadTeacher = async () => {
      await downloadEditedDocx();
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
              <h1 className="font-display text-2xl font-semibold leading-tight text-foreground sm:text-3xl">Your WeeLMat draft is ready.</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Preview below, then download or save to your files.
              </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="w-full gap-2 sm:w-auto">
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
            
            <div className="rounded-xl border border-border bg-[#fffdf9] p-3 sm:p-6">
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
                <div className="rounded-lg border border-border">
                  <div className="flex items-start gap-2 border-b border-border bg-primary/5 px-3 py-2 text-xs leading-5 text-muted-foreground md:hidden" id="matrix-scroll-help">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span>Swipe horizontally to review the included school days. The planning category stays visible.</span>
                  </div>
                  <Table aria-describedby="matrix-scroll-help" className="min-w-[720px]">
                    <caption className="sr-only">Generated Weekly Learning Matrix preview</caption>
                    <TableBody>
                      <TableRow>
                        <TableCell className="sticky left-0 z-20 min-w-[140px] bg-[#fffdf9] text-xs font-semibold"></TableCell>
                        {calculateWeekdayDates().map((date, i) => (
                         <TableCell key={i} className="min-w-[140px] whitespace-pre-line bg-primary text-center text-xs font-semibold text-primary-foreground">{date}</TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="sticky left-0 z-10 min-w-[140px] bg-[#fffdf9] text-xs font-semibold shadow-[1px_0_0_hsl(var(--border))]">
                          {values?.language === 'Filipino' ? 'Kompetensya' : 'Competency'}
                        </TableCell>
                        {activeDayColumns.map(({ key, prefix }) => (
                          <TableCell key={key} className="min-w-[140px] break-words text-sm leading-6">{values?.[`${prefix}Competency`] || ""}</TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="sticky left-0 z-10 min-w-[140px] bg-[#fffdf9] text-xs font-semibold shadow-[1px_0_0_hsl(var(--border))]">
                          {values?.language === 'Filipino' ? 'Mungkahing Materyales/Sanggunian' : 'Suggested Learning Material/Reference'}
                        </TableCell>
                        {activeDayColumns.map(({ key, prefix, day }) => {
                          const special = specialCompetencyForTask(values?.[`${prefix}ExamType`]);
                          return <TableCell key={key} className="min-w-[180px] p-2">{special ? <span className="text-sm font-semibold text-muted-foreground">{special}</span> : <Textarea aria-label={`Edit ${day} reference`} value={aiJson?.references?.[key] || ""} onChange={(event) => updatePreviewCell("references", key, event.target.value)} className="min-h-28 resize-y bg-white text-sm leading-5" />}</TableCell>;
                        })}
                      </TableRow>
                      <TableRow>
                        <TableCell className="sticky left-0 z-10 min-w-[140px] bg-[#fffdf9] text-xs font-semibold shadow-[1px_0_0_hsl(var(--border))]">
                          {values?.language === 'Filipino' ? 'Mga Gawain/Aktividad sa Pagkatuto' : 'Learning Activities/Tasks'}
                        </TableCell>
                        {activeDayColumns.map(({ key, prefix, day }) => {
                          const special = specialCompetencyForTask(values?.[`${prefix}ExamType`]);
                          return (
                            <TableCell key={key} className="min-w-[240px] p-2">
                              {special ? <span className="text-sm font-semibold text-muted-foreground">{special}</span> : (
                                <div className="space-y-2">
                                  {aiJson.pictureQuizImages?.[key] && <img src={aiJson.pictureQuizImages[key]} alt={`${day} lesson visual`} className="mx-auto max-h-44 rounded-lg border border-border object-contain" />}
                                  <Textarea aria-label={`Edit ${day} activity`} value={aiJson?.activities?.[key] || ""} onChange={(event) => updatePreviewCell("activities", key, event.target.value)} className="min-h-72 resize-y bg-white text-sm leading-5" />
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Preview unavailable.</p>
              )}
            </div>

            <div className="flex flex-col flex-wrap justify-end gap-3 border-t border-border pt-6 sm:flex-row">
              <Button variant="outline" onClick={downloadEditedPdf} className="w-full gap-2 sm:w-auto">
                <Download className="h-4 w-4" aria-hidden="true" />
                Download current preview as PDF
              </Button>
              <Button 
                onClick={() => setShowDownloadModal(true)}
                className="w-full gap-2 sm:w-auto"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Download files
              </Button>
              <Button variant="outline" onClick={handleGenerateLogSheet} className="w-full gap-2 sm:w-auto">
                <ClipboardList className="h-4 w-4" aria-hidden="true" />
                Generate Log Sheet
              </Button>
              <Button 
                onClick={() => navigate("/my-account#submit-weelmat", {
                  state: {
                    submissionDraft: {
                      gradeLevel: values?.gradeLevel || "",
                      section: values?.section || "",
                      subject: values?.subject || "",
                      weekStart: values?.dateFrom || "",
                      weekEnd: values?.dateTo || "",
                    },
                  },
                })}
                variant="secondary"
                className="w-full gap-2 sm:w-auto"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                Submit a WeeLMat
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
