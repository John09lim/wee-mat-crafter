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
  competency: string;
  code?: string;
  customInstructions?: string;
  language?: string;
};

const logoUrl =
  "https://raw.githubusercontent.com/John09lim/wee-mat-crafter/main/public/Screenshot%202025-08-11%20074334.png";

const WeeLMatGenerator = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const values = (location.state || null) as FormValues | null;

  const steps = useMemo(
    () => [
      "Searching trusted references…",
      "Drafting Monday–Friday plan…",
      "Building your DOCX & PDF…",
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
  }, []);

  useEffect(() => {
    if (!values) {
      navigate("/dashboard");
      return;
    }

    let timers: number[] = [];
    // staged UI progression independent of backend
    timers.push(window.setTimeout(() => setStepIndex(1), 1200));
    timers.push(window.setTimeout(() => setStepIndex(2), 2600));

    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const access_token = sessionData.session?.access_token;
        if (!access_token) throw new Error("Not authenticated");

        const { data, error } = await supabase.functions.invoke("generate-weelmat", {
          headers: { Authorization: `Bearer ${access_token}` },
          body: values,
        });
        if (error) throw error;

        setDocxUrl(data?.docx_url || null);
        setPdfUrl(data?.pdf_url || null);
        setAiJson(data?.ai_json || null);
        setMatrixId(data?.matrixId || null);
      } catch (err: any) {
        toast(err.message || "Generation failed");
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

  const handleSave = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const user = session.session?.user;
      if (!user) {
        navigate("/auth");
        return;
      }
      
      // Check if we already have this matrix saved
      if (matrixId) {
        const { data } = await supabase.from("weelmat_matrices").select("id, docx_url, pdf_url").eq("id", matrixId).single();
        if (data?.id) {
          // Update the record with URLs if they're missing
          if (!data.docx_url || !data.pdf_url) {
            await supabase.from("weelmat_matrices").update({
              docx_url: docxUrl,
              pdf_url: pdfUrl,
            }).eq("id", matrixId);
          }
          toast("Saved to My Files.");
          navigate("/my-account");
          return;
        }
      }
      
      // Create new record if matrixId doesn't exist or record not found
      const { error } = await supabase.from("weelmat_matrices").insert({
        user_id: session.session?.user.id,
        subject: values?.subject,
        grade_level: values?.gradeLevel,
        section: values?.section,
        date_from: values?.dateFrom,
        date_to: values?.dateTo,
        competency: values?.competency,
        code: values?.code,
        custom_instructions: values?.customInstructions,
        ai_json: aiJson,
        docx_url: docxUrl,
        pdf_url: pdfUrl,
      });
      if (error) throw error;
      toast("Saved to My Files.");
      navigate("/my-account");
    } catch (e: any) {
      toast(e.message || "Save failed");
    }
  };

  const Success = () => (
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
          <div className="rounded-xl border bg-background p-4">
            <div className="text-center space-y-1 mb-4">
              <p className="font-semibold">Weekly Learning Matrix (WeeLMat)</p>
              <p className="text-sm text-muted-foreground">{values?.subject} • {values?.gradeLevel} • {values?.section}</p>
              <p className="text-sm text-muted-foreground">Covered Dates: {values?.dateFrom} – {values?.dateTo}</p>
            </div>
            {aiJson ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableBody>
                    <TableRow>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <TableCell key={i} className="text-xs min-w-[120px]">{""}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold text-xs min-w-[120px]">Competency</TableCell>
                      {["mon","tue","wed","thu","fri"].map((d) => (
                        <TableCell key={d} className="text-xs min-w-[120px] break-words">{aiJson?.competency?.[d] || ""}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold text-xs min-w-[120px]">Suggested Learning Material/Reference</TableCell>
                      {["mon","tue","wed","thu","fri"].map((d) => (
                        <TableCell key={d} className="text-xs min-w-[120px] break-words">{aiJson?.references?.[d] || ""}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold text-xs min-w-[120px]">Learning Activities/Tasks</TableCell>
                      {["mon","tue","wed","thu","fri"].map((d) => (
                        <TableCell key={d} className="text-xs min-w-[120px] break-words">{aiJson?.activities?.[d] || ""}</TableCell>
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
            <Button className="bg-yellow-500 hover:bg-yellow-600 text-white" onClick={handleSave}>
              Save to My Files
            </Button>
          </div>
        </div>
      </article>
    </section>
  );

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
            <p className="text-xs text-muted-foreground">This may take ~10–20 seconds.</p>
          </div>
        ) : (
          <Success />
        )}
      </section>
    </main>
  );
};

export default WeeLMatGenerator;
