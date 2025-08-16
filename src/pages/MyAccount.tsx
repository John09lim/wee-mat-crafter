import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import WeeLMatPreview from "@/components/WeeLMatPreview";

interface MatrixRow {
  id: string;
  subject: string;
  grade_level: string;
  section: string;
  date_from: string;
  date_to: string;
  created_at: string;
  docx_url: string | null;
  pdf_url: string | null;
  ai_json: any;
}

const MyAccount = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<MatrixRow[]>([]);

  useEffect(() => {
    document.title = "My Files | WeeLMat";
    const desc = "Access and download your generated WeeLMat files (DOCX/PDF).";
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = desc;
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = window.location.origin + "/my-account";
  }, []);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) {
        navigate("/auth");
        return;
      }
      const { data, error } = await supabase
        .from("weelmat_matrices")
        .select("id, subject, grade_level, section, date_from, date_to, created_at, docx_url, pdf_url, ai_json")
        .order("created_at", { ascending: false });
      if (!error && data) setRows(data as MatrixRow[]);
      setLoading(false);
    })();
  }, [navigate]);

  const downloadFile = async (url: string, filename: string) => {
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
  };

  const buildFilename = (r: MatrixRow, ext: string) => {
    const safe = (s?: string) => (s || "").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
    return `weelmat-${safe(r.subject)}-${safe(r.grade_level)}-${safe(r.section)}-${r.date_from}-${r.date_to}.${ext}`;
  };

  return (
    <main className="min-h-[calc(100vh-160px)] bg-background">
      <section className="container py-12">
        <h1 className="text-2xl font-semibold mb-6">My Files</h1>
        {loading ? (
          <div className="rounded-xl border bg-card p-6 text-card-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-card-foreground">
            <p className="text-muted-foreground">No WeeLMat files yet.</p>
            <Button className="mt-4" onClick={() => navigate("/dashboard")}>Create one</Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {rows.map((r) => (
              <article key={r.id} className="rounded-xl border bg-card p-5 text-card-foreground flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <WeeLMatPreview matrix={r}>
                    <button className="text-left hover:text-primary transition-colors">
                      <h2 className="font-medium text-lg hover:underline cursor-pointer">
                        {r.subject} {r.grade_level} - Section {r.section}
                      </h2>
                    </button>
                  </WeeLMatPreview>
                  <p className="text-sm text-muted-foreground mt-1">
                    Covered Dates: {r.date_from} – {r.date_to} • Created {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button disabled={!r.docx_url} onClick={() => r.docx_url && downloadFile(r.docx_url, buildFilename(r, "docx"))}>DOCX</Button>
                  <Button variant="outline" disabled={!r.pdf_url} onClick={() => r.pdf_url && downloadFile(r.pdf_url, buildFilename(r, "pdf"))}>PDF</Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default MyAccount;
