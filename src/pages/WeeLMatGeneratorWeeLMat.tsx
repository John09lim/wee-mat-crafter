import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";
import { Download, FileSpreadsheet, Image as ImageIcon } from "lucide-react";
import { WeeLMatDownloadModal } from "@/components/WeeLMatDownloadModal";

// Check if current route is premium
const isPremiumRoute = () => window.location.pathname.includes("/premium/weelmat");

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
  const searchParams = new URLSearchParams(location.search);
  const matrixId = searchParams.get('matrixId');

  const steps = useMemo(
    () => isPremiumRoute() ? [
      "🚀 Using OpenAI Latest Model…",
      "📚 Generating premium content…", 
      "🎨 Creating picture quiz images…",
      "📄 Building enhanced DOCX…",
    ] : [
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
  const [aiJson, setAiJson] = useState<any | null>(null);
  const [savedMatrixId, setSavedMatrixId] = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [pictureQuizImages, setPictureQuizImages] = useState<Record<string, string>>({});

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
    if (matrixId && !values) {
      // Load from database
      loadMatrixFromDatabase(matrixId);
    } else if (!values && !matrixId) {
      console.error("WeeLMatGenerator: No form values or matrix ID provided, redirecting to dashboard");
      navigate("/dashboard");
      return;
    } else if (values) {
      // Generate new WeeLMat
      generateWeeLMat();
    }
  }, [navigate, values, matrixId]);

  const loadMatrixFromDatabase = async (id: string) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
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

      setDocxUrl(data.docx_url || null);
      setStudentDocxUrl(data.student_docx_url || null);
      setPdfUrl(data.pdf_url || null);
      setAiJson(data.ai_json);
      setSavedMatrixId(data.id);
      setLoading(false);
      
      toast.success("WeeLMat loaded successfully");
    } catch (err: any) {
      console.error("Error loading WeeLMat:", err);
      toast.error("Failed to load WeeLMat");
      navigate("/weelmat-history");
    }
  };

  const generateWeeLMat = () => {
    if (!values) return;

    const isPremium = isPremiumRoute();
    console.log(`WeeLMatGenerator: ${isPremium ? 'PREMIUM' : 'Standard'} generation with:`, values);

    let timers: number[] = [];
    timers.push(window.setTimeout(() => setStepIndex(1), 3000));
    timers.push(window.setTimeout(() => setStepIndex(2), isPremium ? 8000 : 6000));
    timers.push(window.setTimeout(() => setStepIndex(3), isPremium ? 15000 : 9000));

    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const access_token = sessionData.session?.access_token;
        if (!access_token) throw new Error("Not authenticated");

        // Use premium edge function for /premium/weelmat route
        const functionName = isPremium ? "generate-weelmat-premium" : "generate-weelmat";
        console.log(`WeeLMatGenerator: Calling ${functionName} edge function`);

        const { data, error } = await supabase.functions.invoke(functionName, {
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
        setStudentDocxUrl(data?.student_docx_url || null);
        setPdfUrl(data?.pdf_url || null);
        setAiJson(data?.ai_json || null);
        setSavedMatrixId(data?.matrix_id || null);
        
        // Store picture quiz images if available (premium)
        if (data?.picture_quiz_images) {
          setPictureQuizImages(data.picture_quiz_images);
        } else if (data?.ai_json?.pictureQuizImages) {
          setPictureQuizImages(data.ai_json.pictureQuizImages);
        }

        if (isPremium) {
          toast.success("Premium WeeLMat with picture quizzes generated!");
        }
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
  };

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

  const buildFilename = (ext: string, prefix: string = "weelmat") => {
    const safe = (s?: string) => (s || "").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
    return `${prefix}-${safe(values?.subject)}-${safe(values?.gradeLevel)}-${safe(values?.section)}-${values?.dateFrom || ""}-${values?.dateTo || ""}.${ext}`;
  };

  const handleShare = async () => {
    const shareUrl = studentDocxUrl || docxUrl;
    if (!shareUrl) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `WeeLMat - ${values?.subject} ${values?.gradeLevel}`,
          text: `Weekly Learning Matrix for ${values?.subject}, ${values?.gradeLevel}, Section ${values?.section}`,
          url: shareUrl
        });
        toast("Shared successfully!");
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = () => {
    const shareUrl = studentDocxUrl || docxUrl;
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      toast("Download link copied to clipboard! You can now share it via messaging apps.");
    }
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
              {isPremiumRoute() && (
                <p className="text-sm font-medium text-primary mb-1">Welcome to Premium WeeLMat</p>
              )}
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
              <Button 
                onClick={() => setShowDownloadModal(true)}
                className="flex-1"
                style={{ backgroundColor: "#236130", color: "white" }}
              >
                <Download className="mr-2 h-4 w-4" />
                Download DOCX
              </Button>
              
              <Button 
                onClick={() => navigate("/premium/lesson-plan")}
                variant="secondary"
                style={{ backgroundColor: "#f5ca47", color: "#236130" }}
                className="flex-1"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Generate Log Sheet
              </Button>
            </div>
            
            <WeeLMatDownloadModal
              open={showDownloadModal}
              onOpenChange={setShowDownloadModal}
              onDownloadTeacher={() => downloadFile(docxUrl, buildFilename("docx", "teacher"))}
              onDownloadStudent={() => downloadFile(studentDocxUrl || docxUrl, buildFilename("docx", "student"))}
              onShare={handleShare}
            />
            
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
                      {/* Learning Activities - Image-Based Questions (Premium) or Text (Standard) */}
                      <TableRow>
                        <TableCell className="font-semibold text-xs min-w-[120px]">
                          <div className="flex items-center gap-1">
                            {Object.keys(pictureQuizImages).length > 0 && <ImageIcon className="h-3 w-3 text-primary" />}
                            {values?.language === 'Filipino' ? 'Mga Gawain (Picture Quiz)' : 'Learning Activities (Picture Quiz)'}
                          </div>
                        </TableCell>
                        {["mon","tue","wed","thu","fri"].map((d) => (
                          <TableCell key={d} className="text-xs min-w-[120px] p-2">
                            {pictureQuizImages[d] ? (
                              <div className="flex flex-col items-center gap-2">
                                <img 
                                  src={pictureQuizImages[d]} 
                                  alt={`Picture quiz for ${d}`}
                                  className="max-w-full h-auto rounded-lg border-2 border-primary/20 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                                  style={{ maxHeight: '180px' }}
                                  onClick={() => window.open(pictureQuizImages[d], '_blank')}
                                />
                                <span className="text-[10px] text-muted-foreground">Click to enlarge</span>
                              </div>
                            ) : aiJson?.activities?.[d] ? (
                              <span className="break-words whitespace-pre-wrap">{aiJson?.activities?.[d]}</span>
                            ) : (
                              <span className="text-muted-foreground">No activity</span>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                      {/* Answer Key Row - Teacher Preview Only (Premium) */}
                      {aiJson?.answerKeys && Object.keys(aiJson.answerKeys).length > 0 && (
                        <TableRow className="bg-primary/5">
                          <TableCell className="font-semibold text-xs min-w-[120px] text-primary">
                            {values?.language === 'Filipino' ? 'Sagot' : 'Answer Key'}
                          </TableCell>
                          {["mon","tue","wed","thu","fri"].map((d) => (
                            <TableCell key={d} className="text-xs min-w-[120px] text-center font-bold text-primary">
                              {aiJson?.answerKeys?.[d] || "-"}
                            </TableCell>
                          ))}
                        </TableRow>
                      )}
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
