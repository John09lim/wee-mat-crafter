import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  WidthType,
  BorderStyle,
  Header,
  ImageRun,
  PageOrientation,
} from "https://esm.sh/docx@8.5.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("OPENAI_API_KEYS");
const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase environment variables");
}

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const jwt = authHeader?.split(" ")[1];
    const {
      subject,
      gradeLevel,
      section,
      dateFrom,
      dateTo,
      competency,
      code,
      customInstructions,
      language,
    } = await req.json();

    if (!jwt) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify auth user
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${jwt}`, apikey: SUPABASE_SERVICE_ROLE_KEY! },
    });
    const user = await userResp.json();

    const userId: string | undefined = user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Invalid user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Search (Tavily if available)
    let curatedSources: Array<{ title: string; url: string; note: string }> = [];
    const searchQuery = `${subject} ${gradeLevel} ${competency}`.slice(0, 256);

    if (TAVILY_API_KEY) {
      try {
        const tavilyRes = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${TAVILY_API_KEY}` },
          body: JSON.stringify({
            query: searchQuery,
            include_domains: [
              "deped.gov.ph",
              "lrmds.deped.gov.ph",
              "commons.deped.gov.ph",
              "ck12.org",
              "khanacademy.org",
              "phet.colorado.edu",
              "youtube.com",
            ],
            search_depth: "advanced",
            max_results: 15,
          }),
        });
        const tavilyJson = await tavilyRes.json();
        const results = tavilyJson?.results || [];
        curatedSources = results
          .slice(0, 12)
          .map((r: any) => ({
            title: r.title?.slice(0, 120) || "Untitled",
            url: r.url,
            note: r.snippet?.slice(0, 160) || "Relevant resource",
          }))
          .filter((r: any) => r.url)
          .slice(0, 7);
      } catch (e) {
        console.error("Tavily error", e);
      }
    }

    if (curatedSources.length === 0) {
      curatedSources = [
        { title: "DepEd Curriculum Guide (General)", url: "https://www.deped.gov.ph/", note: "Official DepEd resources" },
        { title: "Khan Academy Topic", url: "https://www.khanacademy.org/", note: "High-quality lessons" },
        { title: "CK-12", url: "https://www.ck12.org/", note: "Open OER" },
        { title: "PhET Simulations", url: "https://phet.colorado.edu/", note: "Interactive simulations" },
        { title: "YouTube Education", url: "https://www.youtube.com/education", note: "Video lessons" },
      ];
    }

    // Step 2: AI generation via OpenAI or OpenRouter
    // Determine effective language (user override > subject rule)
    const subjLower = (subject || "").toLowerCase();
    const reqLower = (language || "").toLowerCase();
    const effectiveLanguage = reqLower === "filipino"
      ? "Filipino"
      : reqLower === "english"
      ? "English"
      : (subjLower.includes("filipino") || subjLower.includes("araling panlipunan") || subjLower === "ap" || subjLower.includes(" ap"))
      ? "Filipino"
      : "English";

    // System prompt with strict requirements (references must be populated)
    const systemPrompt = `You are the WeeLMat Lesson Matrix Writer for DepEd Negros Island Region.
Respond strictly in ${effectiveLanguage}.
Produce Monday–Friday entries for the Weekly Learning Matrix with three rows:
- Row 2: COMPETENCY — restate/target the competency briefly for each day in student-friendly wording (Mon includes a concise 15-minute briefing).
- Row 3: SUGGESTED LEARNING MATERIAL/REFERENCE — provide 2–3 specific items per day (exact titles + source/channel); prioritize DepEd resources, OER, and specific YouTube lesson titles, and vary sources across days.
- Row 4: LEARNING ACTIVITIES/TASKS — substantial, achievable tasks aligned to the competency (5–9 bullet-length sentences per day) with expected outputs and a brief contingency note for class suspension.
Strict table mapping rules: Column 1 is labels only: “Competency”, “Suggested Learning Material/Reference”, “Learning Activities/Tasks”. Columns 2–6 are Monday to Friday (in that order). Output JSON only with keys competency, references, activities and days mon..fri.`;

    const userContent = {
      subject,
      gradeLevel,
      section,
      dates: { from: dateFrom, to: dateTo },
      competency,
      code,
      customInstructions,
      curatedSources,
      language: effectiveLanguage,
      required_output_shape: {
        competency: { mon: "", tue: "", wed: "", thu: "", fri: "" },
        references: { mon: "", tue: "", wed: "", thu: "", fri: "" },
        activities: { mon: "", tue: "", wed: "", thu: "", fri: "" },
      },
    };

    async function callOpenAI() {
      if (!OPENAI_API_KEY) return null;
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `${JSON.stringify(userContent)}\nReturn JSON only.` },
          ],
          temperature: 0.3,
        }),
      });
      if (!res.ok) return null;
      const json = await res.json();
      const text = json.choices?.[0]?.message?.content?.trim() || "{}";
      return text;
    }

    async function callOpenRouter() {
      if (!OPENROUTER_API_KEY) return null;
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `${JSON.stringify(userContent)}\nReturn JSON only.` },
          ],
          temperature: 0.3,
        }),
      });
      if (!res.ok) return null;
      const json = await res.json();
      const text = json.choices?.[0]?.message?.content?.trim() || "{}";
      return text;
    }

    async function generateOnce() {
      let raw = await callOpenAI();
      if (!raw) raw = await callOpenRouter();
      if (!raw) throw new Error("No AI provider configured. Please set OPENAI_API_KEY or OPENROUTER_API_KEY.");
      try {
        return JSON.parse(raw);
      } catch {
        const reminder = `Return JSON only.`;
        let retryRaw = await callOpenAI();
        if (!retryRaw) retryRaw = await callOpenRouter();
        return JSON.parse(retryRaw || "{}");
      }
    }

    const aiJson = await generateOnce();

    // Normalize and ensure references are populated; fallback to curated sources when needed
    const days = ["mon","tue","wed","thu","fri"] as const;
    const norm = (v: any) => {
      if (!v) return "";
      if (typeof v === "string") return v;
      if (Array.isArray(v)) return v.join(" • ");
      if (typeof v === "object") return Object.values(v).join(" • ");
      return String(v);
    };

    const pickDailyRefs = (): string[] => {
      const out: string[] = [];
      for (let i = 0; i < 5; i++) {
        const items: Array<{title:string;url:string}> = [] as any;
        for (let k = i; k < curatedSources.length && items.length < 3; k += 5) {
          items.push(curatedSources[k]);
        }
        if (items.length < 2) {
          items.push(...curatedSources.slice(0, Math.min(3 - items.length, curatedSources.length)));
        }
        out[i] = items.map((s) => `${s.title} — ${s.url}`).join(" • ");
      }
      if (out.every((x) => !x)) {
        const joined = curatedSources.slice(0, 3).map((s) => `${s.title} — ${s.url}`).join(" • ");
        return [joined, joined, joined, joined, joined];
      }
      return out;
    };

    const dailyFallback = pickDailyRefs();
    const refsIn = aiJson?.references || {};
    aiJson.references = days.reduce((acc: any, d, i) => {
      const val = norm((refsIn as any)[d]);
      acc[d] = val && val.trim().length > 0 ? val : dailyFallback[i] || "";
      return acc;
    }, {});


    // Insert matrix and run records
    const { data: matrix, error: matrixErr } = await supabase
      .from("weelmat_matrices")
      .insert({
        user_id: userId,
        subject,
        grade_level: gradeLevel,
        section,
        date_from: dateFrom,
        date_to: dateTo,
        competency,
        code,
        custom_instructions: customInstructions,
        ai_json: aiJson,
      })
      .select()
      .single();

    if (matrixErr) {
      console.error(matrixErr);
      throw matrixErr;
    }

    // Run tracking
    const { data: run, error: runErr } = await supabase
      .from("weelmat_runs")
      .insert({ user_id: userId, matrix_id: matrix.id, status: "started", step: "searching" })
      .select()
      .single();
    if (runErr) console.error(runErr);

    // Update step to drafting after AI JSON ready
    await supabase.from("weelmat_runs").update({ step: "drafting" }).eq("id", run?.id || "00000000-0000-0000-0000-000000000000");

    // Step 3: Build DOCX and PDF
    await supabase.from("weelmat_runs").update({ step: "exporting" }).eq("id", run?.id || "00000000-0000-0000-0000-000000000000");

    // Helper getters
    function dayVals(obj: any) {
      return [obj?.mon || "", obj?.tue || "", obj?.wed || "", obj?.thu || "", obj?.fri || ""];
    }

    // DOCX generation
    let docxPublicUrl: string | null = null;
    try {
      const comp = dayVals(aiJson?.competency || {});
      const refs = dayVals(aiJson?.references || {});
      const acts = dayVals(aiJson?.activities || {});

      // Fetch logo for header
      const logoUrl = "https://raw.githubusercontent.com/John09lim/wee-mat-crafter/main/public/Screenshot%202025-08-11%20074334.png";
      let logoBytes: Uint8Array | null = null;
      try {
        const resp = await fetch(logoUrl);
        const ab = await resp.arrayBuffer();
        logoBytes = new Uint8Array(ab);
      } catch (_) {
        logoBytes = null;
      }

      const headerTitle = new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Weekly Learning Matrix (WeeLMat)", bold: true, size: 28 })],
        spacing: { after: 120 },
      });
      const headerLine1 = new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `${subject} • ${gradeLevel} • ${section}`, size: 22 })],
        spacing: { after: 60 },
      });
      const headerLine2 = new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `Covered Dates: ${dateFrom} – ${dateTo}`, size: 22 })],
        spacing: { after: 200 },
      });

      // Calculate weekday dates for the header row
      const calculateWeekdayDates = () => {
        if (!dateFrom || !dateTo) return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        
        try {
          const startDate = new Date(dateFrom);
          const endDate = new Date(dateTo);
          
          // Find the Monday of the week containing startDate
          const monday = new Date(startDate);
          const dayOfWeek = monday.getDay();
          const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday = 0, Monday = 1
          monday.setDate(monday.getDate() + daysToMonday);
          
          const weekdays = [];
          const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
          
          for (let i = 0; i < 5; i++) {
            const currentDay = new Date(monday);
            currentDay.setDate(monday.getDate() + i);
            
            // Check if the current day is within the date range
            if (currentDay >= startDate && currentDay <= endDate) {
              const month = currentDay.getMonth() + 1;
              const day = currentDay.getDate();
              weekdays.push(`${dayNames[i]} ${month}/${day}`);
            } else {
              weekdays.push(dayNames[i]);
            }
          }
          
          return weekdays;
        } catch (error) {
          return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        }
      };

      const weekdayDates = calculateWeekdayDates();
      const dateHeaderRow = new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("")], width: { size: 16, type: WidthType.PERCENTAGE } }),
          ...weekdayDates.map((date) => new TableCell({ 
            children: [new Paragraph({ 
              children: [new TextRun({ text: date, bold: true })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 100 } 
            })], 
            width: { size: 16, type: WidthType.PERCENTAGE } 
          })),
        ],
      });

      const labelCell = (label: string) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })], spacing: { after: 100 } })],
          width: { size: 16, type: WidthType.PERCENTAGE },
        });

      const rowFrom = (label: string, vals: string[]) =>
        new TableRow({
          children: [
            labelCell(label),
            ...vals.map((v) => new TableCell({ children: [new Paragraph({ text: v, spacing: { after: 100 } })], width: { size: 16, type: WidthType.PERCENTAGE } })),
          ],
        });

      const table = new Table({
        rows: [dateHeaderRow, rowFrom("Competency", comp), rowFrom("Suggested Learning Material/Reference", refs), rowFrom("Learning Activities/Tasks", acts)],
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
          left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
          right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
          insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
        },
      });

      const A4_TWIPS = { w: 16838, h: 11906 }; // Landscape A4 (11.7" x 8.3")
      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                size: { 
                  orientation: PageOrientation.LANDSCAPE, 
                  width: A4_TWIPS.w, 
                  height: A4_TWIPS.h 
                },
                margin: { top: 720, bottom: 720, left: 720, right: 720 },
              },
            },
            headers: logoBytes
              ? {
                  default: new Header({
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new ImageRun({ data: logoBytes, transformation: { width: 64, height: 64 } })],
                      }),
                    ],
                  }),
                }
              : {},
            children: [headerTitle, headerLine1, headerLine2, new Paragraph(""), table],
          },
        ],
      });

      const b64 = await Packer.toBase64String(doc);
      const docxBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const docxBlob = new Blob([docxBytes], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const docxPath = `matrices/${userId}/${matrix.id}.docx`;
      await supabase.storage.from("weelmat").upload(docxPath, docxBlob, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true,
      });
      docxPublicUrl = supabase.storage.from("weelmat").getPublicUrl(docxPath).data.publicUrl;
    } catch (e) {
      console.error("DOCX generation failed", e);
    }

    // PDF generation
    let pdfPublicUrl: string | null = null;
    try {
      const pdfDoc = await PDFDocument.create();
      const A4 = { w: 841.89, h: 595.28 }; // Landscape A4 (points)
      const page = pdfDoc.addPage([A4.w, A4.h]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const margin = 50;
      let y = A4.h - margin;
      // Header logo
      try {
        const logoUrl = "https://raw.githubusercontent.com/John09lim/wee-mat-crafter/main/public/Screenshot%202025-08-11%20074334.png";
        const resp = await fetch(logoUrl);
        const bytes = new Uint8Array(await resp.arrayBuffer());
        let img: any;
        try { img = await pdfDoc.embedPng(bytes); } catch { img = await pdfDoc.embedJpg(bytes); }
        const imgW = 64, imgH = 64;
        page.drawImage(img, { x: (A4.w - imgW) / 2, y: y - imgH, width: imgW, height: imgH });
        y -= imgH + 12;
      } catch (_) {}

      const line = (text: string, bold = false, size = 12) => {
        y -= size + 6;
        page.drawText(text, { x: margin, y, size, font: bold ? fontBold : font, color: rgb(0, 0, 0) });
      };
      line("Weekly Learning Matrix (WeeLMat)", true, 16);
      line(`${subject} • ${gradeLevel} • ${section}`, false, 12);
      line(`Covered Dates: ${dateFrom} – ${dateTo}`, false, 12);
      y -= 10;

      // Table grid
      const cols = 6, rows = 4;
      const tableW = A4.w - margin * 2;
      const tableH = 360;
      const colW = tableW / cols;
      const rowH = tableH / rows;
      const startX = margin;
      const startY = y;

      // draw borders
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          page.drawRectangle({
            x: startX + c * colW,
            y: startY - (r + 1) * rowH,
            width: colW,
            height: rowH,
            borderWidth: 0.5,
            borderColor: rgb(0.8, 0.8, 0.8),
          });
        }
      }

      // Write labels and content
      const wrapText = (text: string, maxChars = 90) => {
        const words = (text || "").split(/\s+/);
        const lines: string[] = [];
        let cur = "";
        for (const w of words) {
          if ((cur + (cur ? " " : "") + w).length > maxChars) {
            lines.push(cur);
            cur = w;
          } else {
            cur = cur ? cur + " " + w : w;
          }
        }
        if (cur) lines.push(cur);
        return lines;
      };

      const comp = dayVals(aiJson?.competency || {});
      const refs = dayVals(aiJson?.references || {});
      const acts = dayVals(aiJson?.activities || {});

      const writeCell = (r: number, c: number, text: string, bold = false) => {
        const tx = startX + c * colW + 6;
        const ty = startY - (r + 1) * rowH + rowH - 16;
        const lines = wrapText(text);
        let ly = ty;
        for (const ln of lines.slice(0, 12)) {
          page.drawText(ln, { x: tx, y: ly, size: 10, font: bold ? fontBold : font });
          ly -= 12;
        }
      };

      // Row 1: blank (do nothing)
      // Row 2: Competency
      writeCell(1, 0, "Competency", true);
      comp.forEach((v, i) => writeCell(1, i + 1, v));
      // Row 3: References
      writeCell(2, 0, "Suggested Learning Material/Reference", true);
      refs.forEach((v, i) => writeCell(2, i + 1, v));
      // Row 4: Activities
      writeCell(3, 0, "Learning Activities/Tasks", true);
      acts.forEach((v, i) => writeCell(3, i + 1, v));

      const bytes = await pdfDoc.save();
      const pdfBlob = new Blob([bytes], { type: "application/pdf" });
      const pdfPath = `matrices/${userId}/${matrix.id}.pdf`;
      await supabase.storage.from("weelmat").upload(pdfPath, pdfBlob, {
        contentType: "application/pdf",
        upsert: true,
      });
      pdfPublicUrl = supabase.storage.from("weelmat").getPublicUrl(pdfPath).data.publicUrl;
    } catch (e) {
      console.error("PDF generation failed", e);
    }

    // Update matrix URLs
    const { data: updated, error: updErr } = await supabase
      .from("weelmat_matrices")
      .update({ docx_url: docxPublicUrl, pdf_url: pdfPublicUrl })
      .eq("id", matrix.id)
      .select()
      .single();
    if (updErr) console.error(updErr);

    await supabase.from("weelmat_runs").update({ status: "completed", step: "completed" }).eq("id", run?.id || "00000000-0000-0000-0000-000000000000");

    return new Response(
      JSON.stringify({
        matrixId: matrix.id,
        ai_json: aiJson,
        curatedSources,
        docx_url: updated?.docx_url ?? docxPublicUrl,
        pdf_url: updated?.pdf_url ?? pdfPublicUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("generate-weelmat error", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
