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

    // Step 2: Parse and process competencies for daily targets
    function parseCompetencies(competencyInput: string): string[] {
      if (!competencyInput?.trim()) return [];
      
      // Split by newlines or semicolons and clean up
      const competencies = competencyInput
        .split(/[\n;]+/)
        .map(comp => comp.trim())
        .filter(comp => comp.length > 0);
      
      return competencies;
    }

    function createDailyTargets(competencies: string[], effectiveLanguage: string): string[] {
      if (competencies.length === 0) {
        return [
          "Introduce and explore the learning competency through guided instruction.",
          "Develop understanding through practice and application activities.", 
          "Strengthen skills through varied exercises and group work.",
          "Apply knowledge in different contexts and scenarios.",
          "Consolidate learning and prepare for assessment."
        ];
      }

      const dailyTargets: string[] = [];
      
      // If we have exactly 5 or more competencies, use first 5
      if (competencies.length >= 5) {
        for (let i = 0; i < 5; i++) {
          dailyTargets.push(makeStudentFriendly(competencies[i], effectiveLanguage));
        }
      }
      // If we have fewer than 5, distribute them across the week
      else {
        for (let i = 0; i < 5; i++) {
          const compIndex = i % competencies.length;
          const dayPrefix = competencies.length === 1 ? getDayPrefix(i) : "";
          dailyTargets.push(dayPrefix + makeStudentFriendly(competencies[compIndex], effectiveLanguage));
        }
      }
      
      return dailyTargets;
    }

    function makeStudentFriendly(competency: string, language: string): string {
      // Convert formal competency statements to student-friendly targets
      let friendly = competency;
      
      // Remove formal prefixes and make more accessible
      friendly = friendly.replace(/^(The learner|Students will|Learners can)/i, "");
      friendly = friendly.replace(/^(demonstrates|analyzes|evaluates|creates)/i, (match) => {
        return match.toLowerCase().replace(/s$/, "");
      });
      
      // Make it more actionable and student-focused
      if (!friendly.match(/^(identify|understand|practice|apply|create|explore|analyze|demonstrate)/i)) {
        if (language === "Filipino") {
          friendly = "Matutuhan ang " + friendly.toLowerCase();
        } else {
          friendly = "Learn to " + friendly.toLowerCase();
        }
      }
      
      // Ensure it starts with capital letter
      friendly = friendly.charAt(0).toUpperCase() + friendly.slice(1);
      
      // Clean up any remaining formatting issues
      friendly = friendly.replace(/\s+/g, " ").trim();
      
      return friendly;
    }

    function getDayPrefix(dayIndex: number): string {
      const prefixes = [
        "Introduction: ",
        "Development: ", 
        "Practice: ",
        "Application: ",
        "Assessment: "
      ];
      return prefixes[dayIndex] || "";
    }

    // Parse competencies and create daily targets
    const parsedCompetencies = parseCompetencies(competency);
    
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

    const dailyCompetencyTargets = createDailyTargets(parsedCompetencies, effectiveLanguage);

    // System prompt with strict requirements (references must be populated)
    const systemPrompt = `You are the WeeLMat Lesson Matrix Writer for DepEd Negros Island Region.
Respond strictly in ${effectiveLanguage}.
Subject Area: ${subject} | Grade Level: ${gradeLevel}
Produce Monday–Friday entries for the Weekly Learning Matrix with three rows:
- Row 2: COMPETENCY — Use the provided daily competency targets as complete sentences for each day
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
- Use the daily competency targets provided: Monday="${dailyCompetencyTargets[0]}", Tuesday="${dailyCompetencyTargets[1]}", Wednesday="${dailyCompetencyTargets[2]}", Thursday="${dailyCompetencyTargets[3]}", Friday="${dailyCompetencyTargets[4]}"
- Each day should have a complete, well-formed competency statement
- In Learning Activities/Tasks, create simple quiz questions based on these competencies
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

Quiz: [Numbered list with exact quantity based on grade level, using REAL questions from the competency].

Each numbered question should be separated by a blank line for proper formatting."

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
      
      const activitiesPrompt = `Generate REAL Learning Activities/Tasks for ${subject} Grade ${gradeLevel} based on daily competencies:
Monday: "${dailyCompetencyTargets[0]}"
Tuesday: "${dailyCompetencyTargets[1]}"
Wednesday: "${dailyCompetencyTargets[2]}"
Thursday: "${dailyCompetencyTargets[3]}"
Friday: "${dailyCompetencyTargets[4]}"

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
        // Clean markdown if present
        let cleanContent = content.trim();
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        console.log("📝 Cleaned DeepSeek response:", cleanContent.substring(0, 200) + "...");
        const activities = JSON.parse(cleanContent);
        
        // Improved placeholder detection - only flag real placeholders
        const activitiesStr = JSON.stringify(activities);
        const strongPlaceholders = activitiesStr.match(/\bA\)\s*Option\s*[ABC]?\s*B\)\s*Option\s*[ABC]?|what is 4 × 2|\[placeholder\]|\[text\]|option.*option.*option/gi);
        if (strongPlaceholders) {
          console.log("⚠️ Strong placeholders detected in DeepSeek response:", strongPlaceholders);
          return null;
        }
        
        console.log("✅ DeepSeek activities validated - no placeholders detected");
        
        return JSON.stringify({
              competency: {
                mon: dailyCompetencyTargets[0],
                tue: dailyCompetencyTargets[1],
                wed: dailyCompetencyTargets[2],
                thu: dailyCompetencyTargets[3],
                fri: dailyCompetencyTargets[4]
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
      console.log("🔄 Calling OpenAI GPT-5 for real quiz generation...");
      
      const activitiesPrompt = `You are an expert Filipino educator creating REAL quiz questions for ${subject} Grade ${gradeLevel}.

COMPETENCY: "${competency}"

Generate ACTUAL quiz questions for each day. NO PLACEHOLDERS OR BRACKETS ALLOWED.

DAILY REQUIREMENTS:
- Monday: ${getQuestionCount(gradeLevel)} IDENTIFICATION questions
- Tuesday: ${getQuestionCount(gradeLevel)} MULTIPLE CHOICE questions with 4 real answer choices each
- Wednesday: ${getQuestionCount(gradeLevel)} TRUE OR FALSE statements  
- Thursday: ${getQuestionCount(gradeLevel)} ESSAY questions
- Friday: ${getQuestionCount(gradeLevel)} MULTIPLE CHOICE questions with 4 real answer choices each

CRITICAL RULES:
- Generate REAL, specific questions based on the competency
- Multiple choice MUST include A) B) C) D) with actual answer text
- True/False MUST be complete factual statements 
- Questions MUST be appropriate for Grade ${gradeLevel} ${subject}
- Use ${effectiveLanguage} language throughout
- NO generic text like [question], [option], [statement]

EXAMPLE for Multiple Choice (Math):
"1. What is 5 + 3? A) 6 B) 8 C) 10 D) 12"

EXAMPLE for True/False (Science):  
"1. Plants need sunlight to make their own food."

Return JSON format:
{
  "mon": "Instructions/Directions: Identify key concepts. Quiz: 1. [real question] 2. [real question]...",
  "tue": "Instructions/Directions: Choose the best answer. Quiz: 1. [real multiple choice with A) B) C) D)] 2. [another real multiple choice]...",
  "wed": "Instructions/Directions: Write True or False. Quiz: 1. [real statement] 2. [real statement]...",
  "thu": "Instructions/Directions: Write detailed answers. Quiz: 1. [real essay question] 2. [real essay question]...",
  "fri": "Instructions/Directions: Select correct answers. Quiz: 1. [real multiple choice with A) B) C) D)] 2. [another real multiple choice]..."
}`;

      // Retry logic for OpenAI
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-5-2025-08-07",
              messages: [
                { 
                  role: "system", 
                  content: "You are an expert educator who creates REAL quiz questions. NEVER use placeholders, brackets, or generic text. Generate actual, specific questions with complete content."
                },
                { role: "user", content: activitiesPrompt },
              ],
              max_completion_tokens: 3000,
            }),
          });
          
          if (!res.ok) {
            const errorText = await res.text();
            console.error(`OpenAI attempt ${attempt} failed:`, res.status, errorText);
            if (attempt === 3) return null;
            continue;
          }
          
          const json = await res.json();
          const content = json.choices?.[0]?.message?.content?.trim() || "{}";
          
          // Parse and validate the activities response
          try {
            const activities = JSON.parse(content);
            
            // Enhanced placeholder detection
            const placeholderPatterns = [
              /\[.*?\]/g,  // Any text in brackets
              /\boption [a-d]\b/gi,  // Generic option references
              /\bcategory [a-d]\b/gi,  // Generic category references  
              /\bexample [a-d]\b/gi,  // Generic example references
              /\bstatement [a-d]\b/gi,  // Generic statement references
              /\bquestion based on/gi,  // Generic question templates
              /\btrue or false statement\b/gi,  // Generic true/false
              /\bmultiple choice with real answer options\b/gi,  // Generic multiple choice
              /identification question/gi,  // Generic identification
              /essay question/gi  // Generic essay
            ];
            
            const activitiesText = JSON.stringify(activities);
            const hasPlaceholders = placeholderPatterns.some(pattern => pattern.test(activitiesText));
            
            if (hasPlaceholders) {
              console.log(`⚠️ Attempt ${attempt}: Placeholders detected in OpenAI response, retrying...`);
              if (attempt === 3) {
                console.log("❌ All OpenAI attempts failed due to placeholders");
                return null;
              }
              continue;
            }
            
            // Success - return structured response
            console.log("✅ OpenAI generated real questions successfully");
            return JSON.stringify({
              competency: {
                mon: dailyCompetencyTargets[0],
                tue: dailyCompetencyTargets[1],
                wed: dailyCompetencyTargets[2],
                thu: dailyCompetencyTargets[3],
                fri: dailyCompetencyTargets[4]
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
            console.error(`Failed to parse OpenAI response attempt ${attempt}:`, e);
            if (attempt === 3) return null;
            continue;
          }
        } catch (error) {
          console.error(`OpenAI API error attempt ${attempt}:`, error);
          if (attempt === 3) return null;
          continue;
        }
      }
      
      return null;
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
          mon: dailyCompetencyTargets[0],
          tue: dailyCompetencyTargets[1],
          wed: dailyCompetencyTargets[2],
          thu: dailyCompetencyTargets[3],
          fri: dailyCompetencyTargets[4]
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

    // Generate real subject-specific sample activities (NO PLACEHOLDERS)
    function getSubjectSpecificActivities(subject, competency, gradeLevel) {
      const activities = {};
      
      // Determine question quantity based on grade level
      const grade = parseInt(gradeLevel?.toString().replace(/\D/g, '') || '1');
      const questionCount = (grade >= 1 && grade <= 3) ? 5 : (grade >= 4 && grade <= 6) ? 8 : 10;
      
      // Generate real sample questions based on subject and competency
      const generateRealQuestions = (count: number, type: string, subject: string) => {
        const questions = [];
        const subj = subject.toLowerCase();
        
        for (let i = 1; i <= count; i++) {
          if (type === 'Identification') {
            if (subj.includes('math') || subj.includes('mathematics')) {
              questions.push(`${i}. What is the result when you add 5 + 3?`);
            } else if (subj.includes('science')) {
              questions.push(`${i}. What do plants need to make food?`);
            } else if (subj.includes('english')) {
              questions.push(`${i}. What is the main character in a story called?`);
            } else if (subj.includes('filipino')) {
              questions.push(`${i}. Ano ang tawag sa pangunahing tauhan sa kuwento?`);
            } else {
              questions.push(`${i}. What is the main concept you learned today?`);
            }
          } else if (type === 'Multiple Choice') {
            if (subj.includes('math') || subj.includes('mathematics')) {
              questions.push(`${i}. What is 4 × 2? A) 6 B) 8 C) 10 D) 12`);
            } else if (subj.includes('science')) {
              questions.push(`${i}. Which gives off light? A) Rock B) Tree C) Sun D) Water`);
            } else if (subj.includes('english')) {
              questions.push(`${i}. Which is a noun? A) Run B) Happy C) Book D) Quickly`);
            } else if (subj.includes('filipino')) {
              questions.push(`${i}. Alin ang pangngalan? A) Takbo B) Masaya C) Libro D) Mabilis`);
            } else {
              questions.push(`${i}. Which best describes the lesson? A) Important B) Difficult C) Easy D) All of the above`);
            }
          } else if (type === 'True or False') {
            if (subj.includes('math') || subj.includes('mathematics')) {
              questions.push(`${i}. Addition means putting numbers together.`);
            } else if (subj.includes('science')) {
              questions.push(`${i}. All living things need water to survive.`);
            } else if (subj.includes('english')) {
              questions.push(`${i}. A sentence always ends with a period.`);
            } else if (subj.includes('filipino')) {
              questions.push(`${i}. Ang pangungusap ay palaging nagtatapos sa tuldok.`);
            } else {
              questions.push(`${i}. Learning new skills helps us grow.`);
            }
          } else if (type === 'Essay') {
            if (subj.includes('math') || subj.includes('mathematics')) {
              questions.push(`${i}. Explain how you solve addition problems step by step.`);
            } else if (subj.includes('science')) {
              questions.push(`${i}. Describe what happens when plants don't get enough sunlight.`);
            } else if (subj.includes('english')) {
              questions.push(`${i}. Write about your favorite character in a book and why you like them.`);
            } else if (subj.includes('filipino')) {
              questions.push(`${i}. Isulat ang tungkol sa inyong paboritong tauhan sa libro at bakit ninyo siya nagustuhan.`);
            } else {
              questions.push(`${i}. Explain what you learned from today's lesson and how you can use it.`);
            }
          }
        }
        return questions.join(' ');
      };
      
      // Day 1: Identification Questions
      activities.mon = `Instructions/Directions: Identify specific elements and concepts based on your learning.
Quiz: ${generateRealQuestions(questionCount, 'Identification', subject)}
Expected Output: Clear identification answers. Contingency: Review with guided practice.`;
      
      // Day 2: Multiple Choice Questions  
      activities.tue = `Instructions/Directions: Choose the best answer that shows your understanding.
Quiz: ${generateRealQuestions(questionCount, 'Multiple Choice', subject)}
Expected Output: Multiple choice responses with reasoning. Contingency: Practice exercises and review.`;
      
      // Day 3: True or False Questions
      activities.wed = `Instructions/Directions: Determine if each statement is true or false based on your learning.
Quiz: ${generateRealQuestions(questionCount, 'True or False', subject)}
Expected Output: True/False answers with explanations. Contingency: Research and documentation activities.`;
      
      // Day 4: Essay Questions
      activities.thu = `Instructions/Directions: Write detailed responses that demonstrate your understanding.
Quiz: ${generateRealQuestions(questionCount, 'Essay', subject)}
Expected Output: Written responses with detailed explanations. Contingency: Guided writing practice.`;
      
      // Day 5: Multiple Choice Questions
      activities.fri = `Instructions/Directions: Select answers that show mastery of the concepts learned.
Quiz: ${generateRealQuestions(questionCount, 'Multiple Choice', subject)}
Expected Output: Multiple choice responses showing mastery. Contingency: Comprehensive review and assessment.`;
      
      return activities;
    }

    // Call the AI to generate content with improved error handling
    async function generateOnce() {
      // Prioritize DeepSeek since user has valid API key
      const providers = [
        { name: "Direct DeepSeek API", fn: callDeepSeek, cost: "$0.0014/1K tokens - USER HAS CREDITS" },
        { name: "OpenAI GPT-5", fn: callOpenAI, cost: "Premium" },
        { name: "DeepSeek via OpenRouter", fn: callOpenRouter, cost: "FREE" },
        { name: "Subject-Specific Template", fn: () => generateTemplate(competency), cost: "FREE" }
      ];
      
      for (const provider of providers) {
        try {
          console.log(`🔄 Trying ${provider.name} (${provider.cost})...`);
          const raw = await provider.fn();
          if (raw) {
            console.log(`✅ ${provider.name} succeeded`);
            try {
              const parsed = JSON.parse(raw);
              
              // More precise final validation for placeholders
              const jsonString = JSON.stringify(parsed);
              const strongPlaceholders = jsonString.match(/\bA\)\s*Option\s*[ABC]?\s*B\)\s*Option\s*[ABC]?|what is 4 × 2|\[placeholder\]|\[content\]|option.*option.*option/gi);
              
              if (strongPlaceholders) {
                console.log(`⚠️ ${provider.name} contains strong placeholders:`, strongPlaceholders);
                continue; // Try next provider
              }
              
              console.log(`✅ ${provider.name} validation passed - content looks real and specific`);
              
              return parsed;
            } catch (parseError) {
              console.error(`❌ ${provider.name} returned invalid JSON:`, parseError.message);
              continue;
            }
          }
        } catch (error) {
          console.error(`❌ ${provider.name} failed:`, error.message);
        }
      }
      
      // If all providers fail, return subject-specific template
      console.log("🔄 All AI providers failed, using subject-specific template for", subject, gradeLevel);
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

    // Generate real activities using the existing function instead of placeholders
    const getRealActivitiesFallback = () => {
      const realActivities = getSubjectSpecificActivities(subject, competency, gradeLevel);
      return [
        realActivities.mon,
        realActivities.tue,
        realActivities.wed,
        realActivities.thu,
        realActivities.fri
      ];
    };

    // Use the daily competency targets as fallbacks instead of generic text
    const competencyFallback = dailyCompetencyTargets;

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

    // Ensure activities are populated - use real activities instead of placeholders
    const activitiesIn = aiJson?.activities || {};
    const realActivitiesFallback = getRealActivitiesFallback();
    aiJson.activities = days.reduce((acc: any, d, i) => {
      const val = norm((activitiesIn as any)[d]);
      // Only use fallback if AI generation completely failed AND content is empty
      acc[d] = val && val.trim().length > 0 ? val : realActivitiesFallback[i] || "";
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
            ...vals.map((v) => {
              // Split content by questions and add proper spacing
              const lines = v.split('\n');
              const paragraphs = [];
              let currentParagraph = '';
              
              for (const line of lines) {
                if (line.match(/^\d+\./)) {
                  // If we have accumulated text, create a paragraph
                  if (currentParagraph.trim()) {
                    paragraphs.push(new Paragraph({ text: currentParagraph.trim(), spacing: { after: 100 } }));
                    currentParagraph = '';
                  }
                  // Start new paragraph with the numbered question
                  currentParagraph = line;
                } else {
                  // Add to current paragraph
                  currentParagraph += (currentParagraph ? '\n' : '') + line;
                }
              }
              
              // Add the last paragraph
              if (currentParagraph.trim()) {
                paragraphs.push(new Paragraph({ text: currentParagraph.trim(), spacing: { after: 100 } }));
              }
              
              // If no paragraphs were created, create a single paragraph
              if (paragraphs.length === 0) {
                paragraphs.push(new Paragraph({ text: v, spacing: { after: 100 } }));
              }
              
              return new TableCell({ 
                children: paragraphs, 
                width: { size: 16, type: WidthType.PERCENTAGE } 
              });
            }),
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
