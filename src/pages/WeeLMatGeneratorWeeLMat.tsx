import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";

// Form values passed from Dashboard or Premium page
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

const WeeLMatGeneratorWeeLMat = () => {
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
    const desc = "Generate your Weekly Learning Matrix (WeeLMat) with curated sources and downloadable DOCX/PDF.";
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = desc;
  }, []);

  useEffect(() => {
    if (!values) {
      console.error("WeeLMatGenerator: No form values provided, redirecting to dashboard");
      navigate("/dashboard");
      return;
    }

    console.log("WeeLMatGenerator: Received form values:", values);

    let timers: number[] = [];
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
      toast("Download started!");
    } catch (e) {
      toast("Download failed");
    }
  };

  const buildFilename = (ext: string) => {
    const safe = (s?: string) => (s || "").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
    return `weelmat-${safe(values?.subject)}-${safe(values?.gradeLevel)}-${safe(values?.section)}-${values?.dateFrom || ""}-${values?.dateTo || ""}.${ext}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 py-12">
        <div className="container max-w-2xl">
          <div className="rounded-2xl border bg-card p-8 shadow-sm text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold mb-2">Creating Your WeeLMat</h2>
              <p className="text-muted-foreground">This may take a moment…</p>
            </div>
            <div className="space-y-2">
              {steps.map((s, i) => (
                <div key={s} className={`flex items-center gap-2 ${i <= stepIndex ? "text-primary" : "text-muted-foreground"}`}>
                  <div className={`h-2 w-2 rounded-full ${i <= stepIndex ? "bg-primary" : "bg-border"}`} />
                  <span className="text-sm">{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!docxUrl && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 py-12">
        <div className="container max-w-2xl">
          <div className="rounded-2xl border bg-card p-8 shadow-sm text-center">
            <p className="text-lg text-muted-foreground">Generation failed. Please try again.</p>
            <Button onClick={() => navigate("/dashboard")} className="mt-4">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 py-12">
      <div className="container max-w-[95%]">
        <div className="rounded-2xl border bg-card text-card-foreground shadow-sm overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">WeeLMat is ready</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Download your document or return to dashboard
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => downloadFile(docxUrl, buildFilename("docx"))} className="flex-1">
                📄 Download DOCX
              </Button>
              {pdfUrl && (
                <Button variant="outline" onClick={() => downloadFile(pdfUrl, buildFilename("pdf"))} className="flex-1">
                  📑 Download PDF
                </Button>
              )}
            </div>
            
            {aiJson && (
              <div className="rounded-xl border bg-background p-4 mt-6">
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-xs min-w-[120px] font-semibold"></TableCell>
                        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day, i) => (
                          <TableCell key={i} className="text-xs min-w-[120px] font-semibold text-center">{day}</TableCell>
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
                          <TableCell key={d} className="text-xs min-w-[120px] break-words whitespace-pre-wrap">
                            {aiJson?.activities?.[d] || ""}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeLMatGeneratorWeeLMat;
