import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const systemPrompt = `You are the WeeLMat Lesson Matrix Writer for DepEd Negros Island Region.\nProduce Monday–Friday entries for the Weekly Learning Matrix with three rows: Row 2: COMPETENCY — restate/target the competency briefly for each day in student-friendly wording. Row 3: SUGGESTED LEARNING MATERIAL/REFERENCE — 2–3 items per day; prioritize DepEd resources, OER, and specific YouTube lesson titles (with channel). Include short descriptors; vary sources across days. Row 4: LEARNING ACTIVITIES/TASKS — substantial, achievable tasks aligned to the competency (5–9 bullet-length sentences per day). Include expected outputs and a brief contingency note for class suspension. Strict table mapping rules: Column 1 is labels only: “Competency”, “Suggested Learning Material/Reference”, “Learning Activities/Tasks”. Columns 2–6 are Monday to Friday (in that order). Monday includes a concise 15-minute briefing summary. Language: Use Filipino if Subject is Filipino or Araling Panlipunan; otherwise use English. Avoid overload; ensure daily outputs are realistic.`;

    const userContent = {
      subject,
      gradeLevel,
      section,
      dates: { from: dateFrom, to: dateTo },
      competency,
      code,
      customInstructions,
      curatedSources,
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

    const { data: run, error: runErr } = await supabase
      .from("weelmat_runs")
      .insert({ user_id: userId, matrix_id: matrix.id, status: "completed" })
      .select()
      .single();

    if (runErr) {
      console.error(runErr);
    }

    // TODO: Implement DOCX/PDF generation & upload, then update URLs on matrix

    return new Response(
      JSON.stringify({
        matrixId: matrix.id,
        ai_json: aiJson,
        curatedSources,
        docx_url: matrix.docx_url,
        pdf_url: matrix.pdf_url,
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
