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
const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase environment variables");
}

// Debug: Log available API keys for troubleshooting
console.log("Available API Keys:", {
  hasDeepSeek: !!DEEPSEEK_API_KEY,
  hasOpenRouter: !!OPENROUTER_API_KEY,
  hasOpenAI: !!OPENAI_API_KEY,
  hasTavily: !!TAVILY_API_KEY
});

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

    async function callDeepSeek() {
      if (!DEEPSEEK_API_KEY) {
        console.log("❌ No DEEPSEEK_API_KEY found");
        return null;
      }
      console.log("🤖 Calling DeepSeek API directly...");
      const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `${JSON.stringify(userContent)}\nReturn JSON only.` },
          ],
          temperature: 0.3,
        }),
      });
      if (!res.ok) {
        console.error("DeepSeek request failed:", res.status, await res.text());
        return null;
      }
      const json = await res.json();
      const text = json.choices?.[0]?.message?.content?.trim() || "{}";
      return text;
    }

    async function callOpenRouter() {
      if (!OPENROUTER_API_KEY) return null;
      console.log("🔄 Calling OpenRouter with cheap model...");
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://weelmat.app",
          "X-Title": "WeeLMat Generator",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.1-8b-instruct:free", // Free model for cost efficiency
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `${JSON.stringify(userContent)}\nReturn JSON only.` },
          ],
          temperature: 0.3,
        }),
      });
      if (!res.ok) {
        console.error("OpenRouter request failed:", res.status, await res.text());
        return null;
      }
      const json = await res.json();
      const text = json.choices?.[0]?.message?.content?.trim() || "{}";
      return text;
    }

    async function callOpenAI() {
      if (!OPENAI_API_KEY) return null;
      console.log("🔄 Calling OpenAI (high cost - last resort)...");
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini", // Cheapest OpenAI model
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `${JSON.stringify(userContent)}\nReturn JSON only.` },
          ],
          temperature: 0.3,
          max_tokens: 2000, // Limit tokens to control cost
        }),
      });
      if (!res.ok) {
        console.error("OpenAI request failed:", res.status, await res.text());
        return null;
      }
      const json = await res.json();
      const text = json.choices?.[0]?.message?.content?.trim() || "{}";
      return text;
    }

    async function callOpenAITurbo() {
      if (!OPENAI_API_KEY) return null;
      console.log("🔄 Calling OpenAI GPT-3.5-Turbo ($0.0015/1K tokens)...");
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo", // Cheapest OpenAI model
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `${JSON.stringify(userContent)}\nReturn JSON only.` },
          ],
          temperature: 0.3,
          max_tokens: 2000, // Limit tokens to control cost
        }),
      });
      if (!res.ok) {
        console.error("OpenAI GPT-3.5-Turbo request failed:", res.status, await res.text());
        return null;
      }
      const json = await res.json();
      const text = json.choices?.[0]?.message?.content?.trim() || "{}";
      return text;
    }

    async function callGroq() {
      console.log("🔄 Calling Groq LLaMA 3.1 70B (very cheap)...");
      // For now, return template generation as Groq would require separate API key
      return null;
    }

    function generateTemplate(comp: string): string {
      const template = {
        competency: {
          mon: `Introduce ${comp} - Daily briefing and overview of key concepts`,
          tue: `Explore core principles of ${comp} through guided practice`,
          wed: `Apply knowledge of ${comp} in varied contexts and scenarios`,
          thu: `Strengthen understanding of ${comp} through problem-solving`,
          fri: `Consolidate learning of ${comp} and assess comprehension`
        },
        references: {
          mon: "DepEd Curriculum Guide • Khan Academy Lessons • CK-12 Resources",
          tue: "Educational YouTube Videos • PhET Simulations • Online Modules",
          wed: "Interactive Learning Materials • Practical Worksheets • Study Guides",
          thu: "Assessment Tools • Practice Exercises • Review Materials",
          fri: "Synthesis Activities • Evaluation Rubrics • Next Week Preparation"
        },
        activities: {
          mon: "Activity: Introduction and orientation to the learning competency. Questions: 1. What do you already know about this topic? 2. What are your learning goals? 3. How does this connect to previous lessons? 4. What resources will help you learn? 5. What questions do you have? Expected Output: Learning journal entry and goal setting. Contingency: Independent reading and note-taking during class suspension.",
          tue: "Activity: Guided practice and skill development exercises. Questions: 1. What new concepts did you learn today? 2. Which skills need more practice? 3. How can you apply these in real situations? 4. What strategies work best for you? 5. What support do you need? Expected Output: Completed practice worksheets and reflection notes. Contingency: Online practice modules and video lessons.",
          wed: "Activity: Application projects and collaborative learning tasks. Questions: 1. How do you solve this type of problem? 2. What patterns do you notice? 3. How does this relate to real life? 4. What would you do differently? 5. How can you help others understand? Expected Output: Project presentation and peer feedback. Contingency: Individual research and documentation.",
          thu: "Activity: Problem-solving and critical thinking challenges. Questions: 1. What strategies did you use to solve this? 2. Why did you choose this approach? 3. What other solutions are possible? 4. How confident are you in your answer? 5. What would you teach someone else? Expected Output: Solutions portfolio and explanation videos. Contingency: Written problem-solving with detailed explanations.",
          fri: "Activity: Assessment and synthesis of weekly learning. Questions: 1. What are the most important concepts from this week? 2. How has your understanding grown? 3. What connections can you make? 4. What areas need more work? 5. How will you use this knowledge? Expected Output: Weekly synthesis report and self-assessment. Contingency: Comprehensive review worksheet and planning for next week."
        }
      };
      return JSON.stringify(template);
    }

    // Call the AI to generate the content with cost-optimized hierarchy
    async function generateOnce() {
      const providers = [
        { name: "OpenAI GPT-3.5-Turbo", fn: callOpenAITurbo, cost: "$0.0015/1K tokens" },
        { name: "DeepSeek via OpenRouter", fn: callOpenRouter, cost: "FREE" },
        { name: "Groq LLaMA 3.1 70B", fn: callGroq, cost: "very cheap" }
      ];
      
      for (const provider of providers) {
        try {
          console.log(`🔄 Trying ${provider.name} (${provider.cost})...`);
          const raw = await provider.fn();
          if (raw) {
            console.log(`✅ ${provider.name} succeeded`);
            try {
              return JSON.parse(raw);
            } catch (parseError) {
              console.error(`❌ ${provider.name} returned invalid JSON:`, parseError.message);
              // Try next provider
              continue;
            }
          }
        } catch (error) {
          console.error(`❌ ${provider.name} failed:`, error.message);
        }
      }
      
      // Final fallback: Template generation (FREE)
      console.log("🔄 All AI providers failed, using template generation (FREE)...");
      const templateJson = generateTemplate(competency);
      return JSON.parse(templateJson);
    }

    const aiJson = await generateOnce();

    // Normalize and ensure all content is populated with fallbacks
    const days = ["mon","tue","wed","thu","fri"] as const;
    const norm = (v: any) => {
      if (!v) return "";
      if (typeof v === "string") return v;
      if (Array.isArray(v)) return v.join(" • ");
      if (typeof v === "object") return Object.values(v).join(" • ");
      return String(v);
    };

    // Ensure activities are populated with fallbacks (enhanced with questions)
    const activitiesFallback = [
      "Activity: Review previous lesson and complete practice exercises. Questions: 1. What are the key concepts from the previous lesson? 2. How do these concepts relate to today's topic? 3. Complete the practice exercises provided. 4. What challenges did you encounter? 5. How would you explain this to a classmate? Expected Output: Written responses and completed exercises.",
      "Activity: Participate in group discussions and complete assigned reading. Questions: 1. What is the main idea of the assigned reading? 2. How does this connect to our current lesson? 3. What questions arise from the material? 4. Share your insights with the group. 5. What did you learn from your classmates? Expected Output: Summary notes and discussion participation.",
      "Activity: Complete hands-on activities and collaborative tasks. Questions: 1. What steps did you follow in the activity? 2. What patterns or relationships did you observe? 3. How does this activity demonstrate the lesson concepts? 4. What would happen if you changed one variable? 5. How can you apply this in real life? Expected Output: Documented learning outcomes and reflection.",
      "Activity: Practice skills through interactive exercises. Questions: 1. Which skills are you strengthening today? 2. What strategies help you solve these problems? 3. Where might you use these skills outside school? 4. What areas need more practice? 5. How has your understanding improved? Expected Output: Completed assessment tasks with self-evaluation.",
      "Activity: Apply learned concepts in practical scenarios. Questions: 1. How do this week's concepts connect together? 2. What real-world applications can you identify? 3. What would you do differently next time? 4. How confident do you feel about the material? 5. What questions remain for next week? Expected Output: Application project and preparation notes."
    ];

    // Ensure competency is populated with fallbacks
    const competencyFallback = [
      "Introduce and explore the learning competency through guided instruction.",
      "Develop understanding through practice and application activities.",
      "Strengthen skills through varied exercises and group work.",
      "Apply knowledge in different contexts and scenarios.",
      "Consolidate learning and prepare for assessment."
    ];

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
    
    // Ensure references are populated
    const refsIn = aiJson?.references || {};
    aiJson.references = days.reduce((acc: any, d, i) => {
      const val = norm((refsIn as any)[d]);
      acc[d] = val && val.trim().length > 0 ? val : dailyFallback[i] || "";
      return acc;
    }, {});

    // Ensure activities are populated
    const activitiesIn = aiJson?.activities || {};
    aiJson.activities = days.reduce((acc: any, d, i) => {
      const val = norm((activitiesIn as any)[d]);
      acc[d] = val && val.trim().length > 0 ? val : activitiesFallback[i] || "";
      return acc;
    }, {});

    // Ensure competency is populated
    const competencyIn = aiJson?.competency || {};
    aiJson.competency = days.reduce((acc: any, d, i) => {
      const val = norm((competencyIn as any)[d]);
      acc[d] = val && val.trim().length > 0 ? val : competencyFallback[i] || "";
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

      // Note: Logo removed from DOCX output as requested

      const headerTitle = new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "WEEKLY LEARNING MATRIX", bold: true, size: 28 })],
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

      // Calculate weekday dates in MM-DD-YYYY format for the header row
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
              const month = String(currentDay.getMonth() + 1).padStart(2, '0');
              const day = String(currentDay.getDate()).padStart(2, '0');
              const year = currentDay.getFullYear();
              // Format for DOCX: Day name on first line, date on second line
              weekdays.push(`${dayNames[i]}\n${month}-${day}-${year}`);
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
          ...weekdayDates.map((date) => {
            // Split the date into day name and date parts
            const parts = date.split('\n');
            const dayName = parts[0] || date;
            const dateStr = parts[1] || '';
            
            return new TableCell({ 
              children: [
                new Paragraph({ 
                  children: [new TextRun({ text: dayName, bold: true })],
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 50 }
                }),
                ...(dateStr ? [new Paragraph({ 
                  children: [new TextRun({ text: dateStr, bold: true })],
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 100 }
                })] : [])
              ], 
              width: { size: 16, type: WidthType.PERCENTAGE } 
            });
          }),
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
