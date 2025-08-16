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
Subject Area: ${subject} | Grade Level: ${gradeLevel}
Produce Monday–Friday entries for the Weekly Learning Matrix with three rows:
- Row 2: COMPETENCY — Use EXACTLY what the user provided: "${competency}". Do NOT add, modify, or generate any new competency content. Simply distribute this exact competency across the week as-is.
- Row 3: SUGGESTED LEARNING MATERIAL/REFERENCE — provide 2–3 specific items per day (exact titles + source/channel); prioritize DepEd resources, OER, and specific YouTube lesson titles, and vary sources across days.
- Row 4: LEARNING ACTIVITIES/TASKS — Create real, practical tasks and activities for learners. Make quiz questions simple and directly based on the given competency.

SUBJECT-LOCK REQUIREMENTS (CRITICAL):
All Learning Activities/Tasks must belong ONLY to: ${subject}
- If Subject ≠ English/Filipino → NO figures of speech, literary devices, grammar, poetry, etc.
- If Subject ≠ Mathematics → NO fractions, operations, word problems, geometry, algebra, etc.  
- If Subject ≠ Science → NO photosynthesis, energy, organisms, experiments, classification, etc.
- If Subject ≠ Araling Panlipunan (AP) → NO Philippine history, continents, civics, geography, etc.
- If Subject ≠ MAPEH/EPP/EsP → NO content from those domains
- Stay 100% within ${subject} domain using only ${subject}-appropriate vocabulary and concepts

COMPETENCY HANDLING RULES:
- Use EXACTLY the competency text provided by the user: "${competency}"
- Do NOT generate, modify, add to, or rewrite the competency
- Simply distribute the exact user input across Monday-Friday
- In Learning Activities/Tasks, create simple quiz questions based on this exact competency
- Focus on real tasks and activities that learners can actually perform

DAILY QUESTION STRUCTURE (MANDATORY):
- Day 1 (Monday): IDENTIFICATION Questions
  - Grades 1,2,3: Generate 5 identification questions
  - Grades 4,5,6: Generate 8 identification questions  
  - Grades 7,8,9,10: Generate 10 identification questions
- Day 2 (Tuesday): MULTIPLE CHOICE Questions
  - Same quantity as above based on grade level
  - Provide REAL answer choices, not just "a, b, c, d"
- Day 3 (Wednesday): TRUE OR FALSE Questions
  - Same quantity as above based on grade level
  - Use real statements based on the competency
- Day 4 (Thursday): ESSAY Questions
  - Same quantity as above based on grade level
- Day 5 (Friday): MULTIPLE CHOICE Questions
  - Same quantity as above based on grade level
  - Provide REAL answer choices, not just "a, b, c, d"

REQUIRED FORMAT for each day:
"Instructions/Directions: [One concise paragraph explaining the specific question type and task].
Quiz: [Numbered list with exact quantity based on grade level, using REAL questions from the competency]."

QUALITY GUARDS (self-check before responding):
- If any cross-subject content detected → regenerate internally and fix
- Ensure ≥3 distinct ${subject} domain terms appear across day's items
- NO generic placeholders: Reject "Method A/B/C", "Statement A-D", "Example A-D", "the concept/method/strategy"
- Content-specific questions: Each item must assess actual competency skills with concrete ${subject} examples
- Require reasoning: At least 1 question per day must ask for explanation/justification (not pure recall)
- Grade-appropriate difficulty for ${gradeLevel}

HARD GUARDS:
- If any placeholder detected → regenerate
- If cross-subject contamination found → regenerate  
- If missing ${subject} domain terms → regenerate
- If generic "concept/method" language → regenerate
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
      console.log("🤖 Calling DeepSeek API for Learning Activities generation...");
      
      const activitiesPrompt = `Generate REAL Learning Activities/Tasks for ${subject} Grade ${gradeLevel} based on competency: "${competency}".

DAILY REQUIREMENTS:
- Monday: ${getQuestionCount(gradeLevel)} IDENTIFICATION questions  
- Tuesday: ${getQuestionCount(gradeLevel)} MULTIPLE CHOICE questions (with real answer choices)
- Wednesday: ${getQuestionCount(gradeLevel)} TRUE OR FALSE statements
- Thursday: ${getQuestionCount(gradeLevel)} ESSAY questions
- Friday: ${getQuestionCount(gradeLevel)} MULTIPLE CHOICE questions (with real answer choices)

CRITICAL RULES:
- NO placeholders like [Identification question], [Option A/B/C/D], [True/False statement]
- Generate ACTUAL questions based on the exact competency provided
- Multiple choice must have real answer options, not generic letters
- True/False must have complete statements
- Questions must be appropriate for Grade ${gradeLevel} ${subject}
- Use ${effectiveLanguage} language throughout

Return JSON format:
{
  "mon": "Instructions/Directions: [explanation]. Quiz: 1. [real question] 2. [real question]...",
  "tue": "Instructions/Directions: [explanation]. Quiz: 1. [real multiple choice with options] 2. [real multiple choice with options]...",
  "wed": "Instructions/Directions: [explanation]. Quiz: 1. [real statement] 2. [real statement]...",
  "thu": "Instructions/Directions: [explanation]. Quiz: 1. [real essay question] 2. [real essay question]...",
  "fri": "Instructions/Directions: [explanation]. Quiz: 1. [real multiple choice with options] 2. [real multiple choice with options]..."
}`;

      const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: "You are an expert educator who creates real quiz questions. No placeholders allowed. Generate actual, specific questions." },
            { role: "user", content: activitiesPrompt },
          ],
          temperature: 0.3,
        }),
      });
      if (!res.ok) {
        console.error("DeepSeek request failed:", res.status, await res.text());
        return null;
      }
      const json = await res.json();
      const content = json.choices?.[0]?.message?.content?.trim() || "{}";
      
      // Parse and validate the activities response
      try {
        const activities = JSON.parse(content);
        
        // Check for placeholders and regenerate if found
        const hasPlaceholders = JSON.stringify(activities).match(/\[(.*?)\]|\boption [a-d]\b|\bcategory [a-d]\b|\bexample [a-d]\b/i);
        if (hasPlaceholders) {
          console.log("⚠️ Placeholders detected in DeepSeek response, will try OpenAI");
          return null;
        }
        
        return JSON.stringify({
          competency: {
            mon: competency,
            tue: competency,
            wed: competency,
            thu: competency,
            fri: competency
          },
          references: {
            mon: "DepEd Curriculum Guide • Khan Academy Lessons • CK-12 Resources",
            tue: "Educational YouTube Videos • PhET Simulations • Online Modules",
            wed: "Interactive Learning Materials • Practical Worksheets • Study Guides",
            thu: "Assessment Tools • Practice Exercises • Review Materials",
            fri: "Synthesis Activities • Evaluation Rubrics • Next Week Preparation"
          },
          activities
        });
      } catch (e) {
        console.error("Failed to parse DeepSeek activities response:", e);
        return null;
      }
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
      console.log("🔄 Calling OpenAI for Learning Activities generation...");
      
      const activitiesPrompt = `Generate REAL Learning Activities/Tasks for ${subject} Grade ${gradeLevel} based on competency: "${competency}".

DAILY REQUIREMENTS:
- Monday: ${getQuestionCount(gradeLevel)} IDENTIFICATION questions  
- Tuesday: ${getQuestionCount(gradeLevel)} MULTIPLE CHOICE questions (with real answer choices)
- Wednesday: ${getQuestionCount(gradeLevel)} TRUE OR FALSE statements
- Thursday: ${getQuestionCount(gradeLevel)} ESSAY questions
- Friday: ${getQuestionCount(gradeLevel)} MULTIPLE CHOICE questions (with real answer choices)

CRITICAL RULES:
- NO placeholders like [Identification question], [Option A/B/C/D], [True/False statement]
- Generate ACTUAL questions based on the exact competency provided
- Multiple choice must have real answer options, not generic letters
- True/False must have complete statements
- Questions must be appropriate for Grade ${gradeLevel} ${subject}
- Use ${effectiveLanguage} language throughout

Return JSON format:
{
  "mon": "Instructions/Directions: [explanation]. Quiz: 1. [real question] 2. [real question]...",
  "tue": "Instructions/Directions: [explanation]. Quiz: 1. [real multiple choice with options] 2. [real multiple choice with options]...",
  "wed": "Instructions/Directions: [explanation]. Quiz: 1. [real statement] 2. [real statement]...",
  "thu": "Instructions/Directions: [explanation]. Quiz: 1. [real essay question] 2. [real essay question]...",
  "fri": "Instructions/Directions: [explanation]. Quiz: 1. [real multiple choice with options] 2. [real multiple choice with options]..."
}`;

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are an expert educator who creates real quiz questions. No placeholders allowed. Generate actual, specific questions." },
            { role: "user", content: activitiesPrompt },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });
      if (!res.ok) {
        console.error("OpenAI request failed:", res.status, await res.text());
        return null;
      }
      const json = await res.json();
      const content = json.choices?.[0]?.message?.content?.trim() || "{}";
      
      // Parse and validate the activities response
      try {
        const activities = JSON.parse(content);
        
        // Check for placeholders and regenerate if found
        const hasPlaceholders = JSON.stringify(activities).match(/\[(.*?)\]|\boption [a-d]\b|\bcategory [a-d]\b|\bexample [a-d]\b/i);
        if (hasPlaceholders) {
          console.log("⚠️ Placeholders detected in OpenAI response, using fallback");
          return null;
        }
        
        return JSON.stringify({
          competency: {
            mon: competency,
            tue: competency,
            wed: competency,
            thu: competency,
            fri: competency
          },
          references: {
            mon: "DepEd Curriculum Guide • Khan Academy Lessons • CK-12 Resources",
            tue: "Educational YouTube Videos • PhET Simulations • Online Modules",
            wed: "Interactive Learning Materials • Practical Worksheets • Study Guides",
            thu: "Assessment Tools • Practice Exercises • Review Materials",
            fri: "Synthesis Activities • Evaluation Rubrics • Next Week Preparation"
          },
          activities
        });
      } catch (e) {
        console.error("Failed to parse OpenAI activities response:", e);
        return null;
      }
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

    // Helper function to get question count based on grade level
    function getQuestionCount(gradeLevel: string): number {
      const grade = parseInt(gradeLevel?.toString().replace(/\D/g, '') || '1');
      return (grade >= 1 && grade <= 3) ? 5 : (grade >= 4 && grade <= 6) ? 8 : 10;
    }

    function generateTemplate(comp: string): string {
      const template = {
        competency: {
          mon: comp,
          tue: comp,
          wed: comp,
          thu: comp,
          fri: comp
        },
        references: {
          mon: "DepEd Curriculum Guide • Khan Academy Lessons • CK-12 Resources",
          tue: "Educational YouTube Videos • PhET Simulations • Online Modules",
          wed: "Interactive Learning Materials • Practical Worksheets • Study Guides",
          thu: "Assessment Tools • Practice Exercises • Review Materials",
          fri: "Synthesis Activities • Evaluation Rubrics • Next Week Preparation"
        },
        activities: getSubjectSpecificActivities(subject, competency, gradeLevel)
      };
      return JSON.stringify(template);
    }

    // Generate subject-specific activities that stay within domain boundaries
    function getSubjectSpecificActivities(subject, competency, gradeLevel) {
      const activities = {};
      
      // Determine question quantity based on grade level
      const grade = parseInt(gradeLevel?.toString().replace(/\D/g, '') || '1');
      const questionCount = (grade >= 1 && grade <= 3) ? 5 : (grade >= 4 && grade <= 6) ? 8 : 10;
      
      // Generate numbered question lists
      const generateQuestions = (count: number, type: string) => {
        const questions = [];
        for (let i = 1; i <= count; i++) {
          questions.push(`${i}. [${type} question based on competency]`);
        }
        return questions.join(' ');
      };
      
      // Day 1: Identification Questions
      activities.mon = `Instructions/Directions: Identify specific elements, concepts, or components directly related to the competency.
Quiz: ${generateQuestions(questionCount, 'Identification')}
Expected Output: Completed identification answers. Contingency: Review materials with guided practice.`;
      
      // Day 2: Multiple Choice Questions  
      activities.tue = `Instructions/Directions: Select the correct answer that demonstrates understanding of the competency.
Quiz: ${generateQuestions(questionCount, 'Multiple choice with real answer options')}
Expected Output: Multiple choice responses with reasoning. Contingency: Practice exercises and review.`;
      
      // Day 3: True or False Questions
      activities.wed = `Instructions/Directions: Evaluate statements about the competency concepts and determine if they are true or false.
Quiz: ${generateQuestions(questionCount, 'True or False statement')}
Expected Output: True/False answers with explanations. Contingency: Research activities with documentation.`;
      
      // Day 4: Essay Questions
      activities.thu = `Instructions/Directions: Provide detailed written responses demonstrating understanding of the competency.
Quiz: ${generateQuestions(questionCount, 'Essay')}
Expected Output: Written responses with detailed explanations. Contingency: Guided writing practice.`;
      
      // Day 5: Multiple Choice Questions
      activities.fri = `Instructions/Directions: Select the correct answers that demonstrate mastery of the competency concepts.
Quiz: ${generateQuestions(questionCount, 'Multiple choice with real answer options')}
Expected Output: Multiple choice responses showing competency mastery. Contingency: Comprehensive review and assessment.`;
      
      return activities;
    }

    // Call the AI to generate the content with cost-optimized hierarchy (FREE/CHEAP FIRST!)
    async function generateOnce() {
      const providers = [
        { name: "Direct DeepSeek API", fn: callDeepSeek, cost: "$0.0014/1K tokens" },
        { name: "OpenAI GPT-4o-mini", fn: callOpenAI, cost: "$0.0015/1K tokens" },
        { name: "Template Generation", fn: () => generateTemplate(competency), cost: "FREE" },
        { name: "DeepSeek via OpenRouter", fn: callOpenRouter, cost: "FREE" }
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

    // Ensure activities are populated with fallbacks (enhanced with specific questions)
    const activitiesFallback = [
      "Practice fundamental skills. Assessment Questions (Identification): 1. Identify the main elements of today's topic. 2. What are the key characteristics to remember? 3. Name the steps involved in this process. 4. Identify examples from your everyday experience. 5. What tools or methods are most helpful? Expected Output: Identification worksheet with examples. Contingency: Independent reading and practice.",
      "Develop deeper understanding through practice. Assessment Questions (Multiple Choice): 1. Which example best demonstrates the concept? A) Option A B) Option B C) Option C D) All options 2. The most important factor is: A) Accuracy B) Understanding C) Practice D) All factors 3. When approaching this topic, you should: A) Take your time B) Check your work C) Ask for help D) All approaches 4. This concept is most useful for: A) Academic work B) Daily life C) Future learning D) All applications 5. The best learning strategy is: A) Practice B) Discussion C) Reflection D) All strategies. Expected Output: Multiple choice responses with reasoning. Contingency: Online modules and exercises.",
      "Apply knowledge in different situations. Assessment Questions (True or False): 1. Regular practice improves understanding of this concept. 2. This topic only applies to academic situations. 3. Understanding the basics is essential for advanced work. 4. This concept connects to other subjects and real life. 5. Mastering this skill helps with future learning. Expected Output: True/False answers with explanations. Contingency: Research activities and documentation.",
      "Demonstrate mastery through problem-solving. Assessment Questions (Identification): 1. Identify the most effective problem-solving strategies. 2. What are the common challenges and how to overcome them? 3. Name three ways this applies to real situations. 4. Identify indicators of successful understanding. 5. What additional skills support this learning? Expected Output: Problem-solving portfolio with examples. Contingency: Independent practice with solutions.",
      "Synthesize and evaluate learning. Assessment Questions (Essay/Short Answer): 1. Summarize the most important concepts from this week. 2. How would you explain this topic to someone new to it? 3. Describe a practical application of what you learned. 4. What was most challenging and how did you handle it? 5. How does this knowledge connect to other subjects? Expected Output: Reflection essay and connection map. Contingency: Comprehensive review and self-assessment."
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
            headers: {
              default: new Header({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: "Weekly Learning Matrix", bold: true, size: 24 })],
                  }),
                ],
              }),
            },
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
