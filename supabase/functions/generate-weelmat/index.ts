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
const DASHSCOPE_API_KEY = Deno.env.get("DASHSCOPE_API_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase environment variables");
}

console.log("Available API Keys:", {
  hasDeepSeek: !!DEEPSEEK_API_KEY,
  hasOpenRouter: !!OPENROUTER_API_KEY,
  hasOpenAI: !!OPENAI_API_KEY,
  hasTavily: !!TAVILY_API_KEY,
  hasDashScope: !!DASHSCOPE_API_KEY,
});

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const jwt = authHeader?.split(" ")[1];
    const requestBody = await req.json();
    
    console.log("Edge function received request:", JSON.stringify(requestBody, null, 2));
    
    const {
      subject,
      gradeLevel,
      section,
      dateFrom,
      dateTo,
      keyStage,
      mondayCompetency,
      tuesdayCompetency,
      wednesdayCompetency,
      thursdayCompetency,
      fridayCompetency,
      mondayExamType,
      tuesdayExamType,
      wednesdayExamType,
      thursdayExamType,
      fridayExamType,
      mondayQuestionCount,
      tuesdayQuestionCount,
      wednesdayQuestionCount,
      thursdayQuestionCount,
      fridayQuestionCount,
      code,
      customInstructions,
      language,
      activityMode,
      aiJsonOverride,
      existingMatrixId,
    } = requestBody;

    // Enhanced validation with detailed logging
    const requiredFields = [
      { name: 'subject', value: subject },
      { name: 'gradeLevel', value: gradeLevel },
      { name: 'section', value: section },
      { name: 'dateFrom', value: dateFrom },
      { name: 'dateTo', value: dateTo },
    ];

    const dailyFields = [
      { day: 'Monday', competency: mondayCompetency, examType: mondayExamType, questionCount: mondayQuestionCount },
      { day: 'Tuesday', competency: tuesdayCompetency, examType: tuesdayExamType, questionCount: tuesdayQuestionCount },
      { day: 'Wednesday', competency: wednesdayCompetency, examType: wednesdayExamType, questionCount: wednesdayQuestionCount },
      { day: 'Thursday', competency: thursdayCompetency, examType: thursdayExamType, questionCount: thursdayQuestionCount },
      { day: 'Friday', competency: fridayCompetency, examType: fridayExamType, questionCount: fridayQuestionCount },
    ];

    console.log("Validating required fields:", requiredFields);
    console.log("Validating daily fields:", dailyFields);

    // Validate required fields
    const missingFields = requiredFields.filter(field => !field.value?.toString().trim());
    if (missingFields.length > 0) {
      console.error("Missing required fields:", missingFields.map(f => f.name));
      return new Response(
        JSON.stringify({
          error: `Missing required fields: ${missingFields.map(f => f.name).join(', ')}`,
          details: missingFields
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate daily fields (allow HOLIDAY as special case)
    const incompleteDays = dailyFields.filter(day => {
      // For HOLIDAY exam type, only require examType and that competency is "HOLIDAY"
      if (day.examType === "HOLIDAY") {
        return !day.competency?.toString().trim() || 
               day.competency?.toString().trim() !== "HOLIDAY" ||
               !day.questionCount ||
               typeof day.questionCount !== 'number';
      }
      
      // For other exam types, use normal validation
      return !day.competency?.toString().trim() || 
             !day.examType?.toString().trim() || 
             !day.questionCount ||
             typeof day.questionCount !== 'number' ||
             day.questionCount < 3 || 
             day.questionCount > 20;
    });

    if (incompleteDays.length > 0) {
      console.error("Incomplete daily fields:", incompleteDays);
      return new Response(
        JSON.stringify({
          error: `Incomplete data for days: ${incompleteDays.map(d => d.day).join(', ')}`,
          details: incompleteDays.map(day => ({
            day: day.day,
            issues: [
              !day.competency?.toString().trim() ? 'missing competency' : null,
              !day.examType?.toString().trim() ? 'missing exam type' : null,
              !day.questionCount ? 'missing question count' : null,
              (typeof day.questionCount !== 'number' || day.questionCount < 3 || day.questionCount > 20) ? 'invalid question count (must be 3-20)' : null
            ].filter(Boolean)
          }))
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Validation passed - all required fields present");

    if (!jwt) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate all daily inputs are provided
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    const competencies = [mondayCompetency, tuesdayCompetency, wednesdayCompetency, thursdayCompetency, fridayCompetency];
    const examTypes = [mondayExamType, tuesdayExamType, wednesdayExamType, thursdayExamType, fridayExamType];
    const questionCounts = [mondayQuestionCount, tuesdayQuestionCount, wednesdayQuestionCount, thursdayQuestionCount, fridayQuestionCount];

    // Enhanced validation with detailed error messages (allow HOLIDAY)
    const missingCompetencies = competencies.map((c, i) => {
      const examType = examTypes[i];
      if (examType === "HOLIDAY") {
        return (c?.trim() === "HOLIDAY") ? null : days[i];
      }
      return c?.trim() ? null : days[i];
    }).filter(Boolean);
    if (missingCompetencies.length > 0) {
      return new Response(JSON.stringify({ 
        error: `Missing competencies for: ${missingCompetencies.join(', ')}. Please complete all daily competencies.`
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const missingExamTypes = examTypes.map((e, i) => e ? null : days[i]).filter(Boolean);
    if (missingExamTypes.length > 0) {
      return new Response(JSON.stringify({ 
        error: `Missing exam types for: ${missingExamTypes.join(', ')}. Please select exam types for all days.`
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const invalidQuestionCounts = questionCounts.map((q, i) => {
      const examType = examTypes[i];
      // For HOLIDAY, just check if questionCount exists
      if (examType === "HOLIDAY") {
        return (!q) ? `${days[i]} (${q || 'missing'})` : null;
      }
      // For other types, check normal range
      return (!q || q < 3 || q > 20) ? `${days[i]} (${q || 'missing'})` : null;
    }).filter(Boolean);
    if (invalidQuestionCounts.length > 0) {
      return new Response(JSON.stringify({ 
        error: `Invalid question counts for: ${invalidQuestionCounts.join(', ')}. Each day must have 3-20 questions.`
      }), {
        status: 400,
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

    // Store exact user inputs (read-only for AI)
    const dailyPlan = {
      Monday: {
        competency: mondayCompetency.trim(),
        examType: mondayExamType,
        questionCount: mondayQuestionCount,
      },
      Tuesday: {
        competency: tuesdayCompetency.trim(),
        examType: tuesdayExamType,
        questionCount: tuesdayQuestionCount,
      },
      Wednesday: {
        competency: wednesdayCompetency.trim(),
        examType: wednesdayExamType,
        questionCount: wednesdayQuestionCount,
      },
      Thursday: {
        competency: thursdayCompetency.trim(),
        examType: thursdayExamType,
        questionCount: thursdayQuestionCount,
      },
      Friday: {
        competency: fridayCompetency.trim(),
        examType: fridayExamType,
        questionCount: fridayQuestionCount,
      },
    };

    // Step 1: Search (Tavily if available)
    let curatedSources: Array<{ title: string; url: string; note: string }> = [];
    const competencyResearchText = dailyFields
      .map((day) => `${day.day}: ${day.competency}`)
      .join("; ");
    const searchQuery = `${subject} ${gradeLevel} Philippines DepEd curriculum ${competencyResearchText}`.slice(0, 380);

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
              "learningresourceportal.deped.gov.ph",
              "k12.gov.ph",
              "curricula.deped.gov.ph"
            ],
            search_depth: "basic",
            max_results: 8
          }),
        });
        const tavilyData = await tavilyRes.json();
        if (tavilyData?.results) {
          curatedSources = tavilyData.results.slice(0, 5).map((r: any) => ({
            title: r.title || "Educational Resource",
            url: r.url || "",
            note: r.content?.slice(0, 150) || "Learning material reference"
          }));
        }
      } catch (error) {
        console.error("Tavily search failed:", error);
      }
    }

    // Generate effective language
    const effectiveLanguage = language || "English";
    const isKs1 = keyStage === "KS1";
    // KS1 worksheet mode: when KS1 teachers pick "Worksheet Activity", we generate
    // images. When they pick "Assessment Type", treat it like any other key stage (text only).
    const isKs1Worksheet = isKs1 && activityMode !== "assessment";
    const researchContext = curatedSources.length
      ? curatedSources.map((source, index) => `${index + 1}. ${source.title}: ${source.note} (${source.url})`).join("\n")
      : "No verified web sources were returned. Stay strictly within the teacher-provided competencies and do not invent curriculum facts.";

    // Create comprehensive system prompt for AI focused on Row 4 generation
    const systemPrompt = `You are an expert DepEd Philippines curriculum specialist creating Weekly Learning Matrix content.
${isKs1Worksheet ? `
IMPORTANT: This is KEY STAGE 1 (${gradeLevel}) — emergent readers and writers (ages 4-8).
- Use VERY SIMPLE words and short sentences that a young child can understand
- Instructions must be concrete and visual, not abstract
- Activities should be hands-on, playful, and developmentally appropriate
- Avoid complex vocabulary, long reading passages, or abstract concepts
- For worksheet activities: describe the VISUAL content the child will see and interact with
` : ""}
CRITICAL JSON FORMAT REQUIREMENTS:
1. Return ONLY valid JSON - no markdown, explanations, or extra text
2. Use proper JSON escaping for quotes and newlines
3. Escape special characters properly (use \\n for newlines, \\" for quotes)
4. NEVER modify the competency text provided
5. Generate REAL questions - NO placeholders like "Option A, B, C, D"
6. CREATE UNIQUE CONTENT FOR EACH DAY - Monday activities must differ from Tuesday, Wednesday, Thursday, and Friday
7. Every question, direction, expected output, and reference MUST directly assess or teach that day's exact competency
8. NEVER generate generic questions about the wording of a competency (for example, "Why is this competency important?")
9. Use concrete lesson facts, examples, vocabulary, processes, people, places, texts, or problems appropriate to the stated subject and grade
10. Before returning JSON, silently verify every activity against: subject, grade level, daily competency, assessment type, and question count
11. If the competency is ambiguous, use the narrowest defensible interpretation and avoid unsupported factual claims

LANGUAGE REQUIREMENTS:
- Generate ALL content in ${effectiveLanguage}
- Instructions, questions, and activities should be in ${effectiveLanguage}
- Use appropriate educational language for ${gradeLevel} students
- Follow DepEd curriculum standards for ${effectiveLanguage} instruction

UNIQUENESS REQUIREMENTS:
- Each day MUST have completely different questions and activities
- Base questions specifically on each day's unique competency
- Avoid repetitive patterns across days
- Ensure Monday content is distinctly different from other days

Daily Learning Plan (DO NOT MODIFY COMPETENCIES):
- Monday: "${dailyPlan.Monday.competency}" | Exam: ${dailyPlan.Monday.examType} | Questions: ${dailyPlan.Monday.questionCount}
- Tuesday: "${dailyPlan.Tuesday.competency}" | Exam: ${dailyPlan.Tuesday.examType} | Questions: ${dailyPlan.Tuesday.questionCount}
- Wednesday: "${dailyPlan.Wednesday.competency}" | Exam: ${dailyPlan.Wednesday.examType} | Questions: ${dailyPlan.Wednesday.questionCount}
- Thursday: "${dailyPlan.Thursday.competency}" | Exam: ${dailyPlan.Thursday.examType} | Questions: ${dailyPlan.Thursday.questionCount}
- Friday: "${dailyPlan.Friday.competency}" | Exam: ${dailyPlan.Friday.examType} | Questions: ${dailyPlan.Friday.questionCount}

Context:
- Subject: ${subject}
- Grade Level: ${gradeLevel}
- Language: ${effectiveLanguage}
- Section: ${section}
- Date Range: ${dateFrom} to ${dateTo}
${code ? `- Curriculum Code: ${code}` : ""}
${customInstructions ? `- Additional Instructions: ${customInstructions}` : ""}

CURRICULUM RESEARCH CONTEXT:
${researchContext}

EXAM TYPE REQUIREMENTS - CREATE REAL QUESTIONS IN ${effectiveLanguage}:
- Multiple Choice: Real questions with factual options (A, B, C, D) - mark correct answer with *
- Identification: Specific terms students should identify
- Essay: Thought-provoking questions requiring analysis
- True/False: Factual statements to evaluate
- Matching Type: Two columns with real content to match
- Performance Task: Authentic scenarios requiring demonstration

EXAMPLE Multiple Choice Format:
1. What is the primary function of adjectives in Filipino grammar?
   A. To describe verbs and actions
   B. To modify nouns and pronouns *
   C. To connect sentences together  
   D. To express emotions only

Return EXACTLY this JSON structure:
{
  "competency": {
    "mon": "${dailyPlan.Monday.competency}",
    "tue": "${dailyPlan.Tuesday.competency}",
    "wed": "${dailyPlan.Wednesday.competency}", 
    "thu": "${dailyPlan.Thursday.competency}",
    "fri": "${dailyPlan.Friday.competency}"
  },
  "references": {
    "mon": "${subject} textbook, DepEd learning materials, K-12 curriculum guides",
    "tue": "${subject} textbook, DepEd learning materials, K-12 curriculum guides",
    "wed": "${subject} textbook, DepEd learning materials, K-12 curriculum guides",
    "thu": "${subject} textbook, DepEd learning materials, K-12 curriculum guides",
    "fri": "${subject} textbook, DepEd learning materials, K-12 curriculum guides"
  },
  "activities": {
    "mon": "Instructions/Directions: [Real instructions]\\n\\nQuiz:\\n[${dailyPlan.Monday.questionCount} real ${dailyPlan.Monday.examType} questions]\\n\\nExpected Output: [Description]\\nContingency: [Backup plan]",
    "tue": "Instructions/Directions: [Real instructions]\\n\\nQuiz:\\n[${dailyPlan.Tuesday.questionCount} real ${dailyPlan.Tuesday.examType} questions]\\n\\nExpected Output: [Description]\\nContingency: [Backup plan]",
    "wed": "Instructions/Directions: [Real instructions]\\n\\nQuiz:\\n[${dailyPlan.Wednesday.questionCount} real ${dailyPlan.Wednesday.examType} questions]\\n\\nExpected Output: [Description]\\nContingency: [Backup plan]",
    "thu": "Instructions/Directions: [Real instructions]\\n\\nQuiz:\\n[${dailyPlan.Thursday.questionCount} real ${dailyPlan.Thursday.examType} questions]\\n\\nExpected Output: [Description]\\nContingency: [Backup plan]",
    "fri": "Instructions/Directions: [Real instructions]\\n\\nQuiz:\\n[${dailyPlan.Friday.questionCount} real ${dailyPlan.Friday.examType} questions]\\n\\nExpected Output: [Description]\\nContingency: [Backup plan]"
  }${isKs1Worksheet ? `,\n  "imagePrompts": {\n    "mon": "[Detailed description of a text-free educational illustration for Monday's activity. Describe the visual content, objects, colors, and layout. The image must NOT contain any text, words, letters, or numbers.]",\n    "tue": "[Detailed description of a text-free educational illustration for Tuesday. Text-free, no words or letters.]",\n    "wed": "[Detailed description of a text-free educational illustration for Wednesday. Text-free, no words or letters.]",\n    "thu": "[Detailed description of a text-free educational illustration for Thursday. Text-free, no words or letters.]",\n    "fri": "[Detailed description of a text-free educational illustration for Friday. Text-free, no words or letters.]"\n  }` : ""}
}

${isKs1Worksheet ? `KS1 VISUAL LEARNING ACTIVITIES - IMAGE PROMPT REQUIREMENTS:
- This is for Key Stage 1 (${gradeLevel}) — young learners who need VISUAL illustrations
- For each day, write a detailed imagePrompts entry describing a TEXT-FREE educational illustration
- The image must show concrete objects, animals, people, or scenes related to the competency
- NEVER include text, words, letters, numbers, or labels in the image description
- Style: bright, colorful, cartoon-like, child-friendly, clean white background
- Counting activities: show exactly the right number of objects clearly arranged
- Matching activities: describe two columns of related objects
- Identifying/Circling: describe a scene with multiple items to find
- Coloring activities: describe bold outline illustrations ready for coloring
- Sequence activities: describe 3-4 pictures showing steps in jumbled order
- Sorting activities: describe mixed objects from different categories
- Tracing activities: describe large dashed outline letters, numbers, or shapes
- Pattern activities: describe a repeating visual pattern with the last item missing
- Fill in the Blank: describe a picture scene with one item missing
- Draw and Label: describe a simple object for the child to draw` : ""}`;

    // Step 2: AI Generation with prioritized API calls
    let aiJson: any = aiJsonOverride && typeof aiJsonOverride === "object" ? aiJsonOverride : null;
    let aiError: string | null = null;

    // Check if any day is HOLIDAY - if so, skip AI and use HOLIDAY template
    const hasHoliday = [mondayExamType, tuesdayExamType, wednesdayExamType, thursdayExamType, fridayExamType].includes("HOLIDAY");
    console.log("Has HOLIDAY days:", hasHoliday);

    // Try DeepSeek with retry logic (unless HOLIDAY)
    const maxRetries = 3;
    let retryCount = 0;
    
    if (DEEPSEEK_API_KEY && !aiJson && !hasHoliday) {
      while (!aiJson && retryCount < maxRetries) {
        try {
          console.log(`Trying DeepSeek API (attempt ${retryCount + 1}/${maxRetries})...`);
          const deepSeekRes = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "deepseek-chat",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: "Generate the weekly learning matrix content as valid JSON only. No markdown, no explanations." }
              ],
              temperature: 0.3, // Lower temperature for more consistent JSON output
              max_tokens: 8192, // DeepSeek's maximum token limit
            }),
          });

          if (deepSeekRes.ok) {
            const deepSeekData = await deepSeekRes.json();
            const content = deepSeekData.choices?.[0]?.message?.content?.trim();
            console.log("DeepSeek raw response:", content?.substring(0, 500) + "...");
            
            if (content) {
              try {
                // Multiple strategies to extract JSON
                let jsonString = content;

                // Remove markdown code blocks if present
                jsonString = jsonString.replace(/```json\s*/, '').replace(/```\s*$/, '');

                // Find JSON object boundaries
                const jsonStart = jsonString.indexOf('{');
                const jsonEnd = jsonString.lastIndexOf('}');

                if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                  jsonString = jsonString.substring(jsonStart, jsonEnd + 1);

                  // Strategy 1: Try parsing directly (DeepSeek usually returns valid JSON)
                  try {
                    aiJson = JSON.parse(jsonString);
                    console.log("DeepSeek API successful on attempt", retryCount + 1, "(direct parse)");
                    break;
                  } catch (_directParseError) {
                    // Fall through to strategy 2
                  }

                  // Strategy 2: Remove only raw control characters (NOT \n inside strings)
                  // The previous approach of .replace(/\n/g, '\\n') corrupted valid JSON
                  // by double-escaping newlines that were already escaped inside string values.
                  const cleaned = jsonString.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
                  try {
                    aiJson = JSON.parse(cleaned);
                    console.log("DeepSeek API successful on attempt", retryCount + 1, "(cleaned parse)");
                    break;
                  } catch (_cleanedParseError) {
                    // Fall through to strategy 3
                  }

                  // Strategy 3: If still failing, the raw newlines inside strings are the problem.
                  // Walk through the string and escape only newlines that are NOT already preceded by a backslash.
                  let escaped = "";
                  for (let i = 0; i < jsonString.length; i++) {
                    const ch = jsonString[i];
                    const prev = i > 0 ? jsonString[i - 1] : "";
                    if ((ch === "\n" || ch === "\r" || ch === "\t") && prev !== "\\") {
                      escaped += ch === "\n" ? "\\n" : ch === "\r" ? "\\r" : "\\t";
                    } else {
                      escaped += ch;
                    }
                  }
                  console.log("Attempting escaped parse...");
                  aiJson = JSON.parse(escaped);
                  console.log("DeepSeek API successful on attempt", retryCount + 1, "(escaped parse)");
                  break;
                }
              } catch (parseError) {
                console.error(`DeepSeek JSON parse error (attempt ${retryCount + 1}):`, parseError);
                console.error("Problematic content:", content.substring(0, 500));
                retryCount++;
                
                // Wait before retry
                if (retryCount < maxRetries) {
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
              }
            }
          } else {
            const errorText = await deepSeekRes.text();
            console.error(`DeepSeek API failed (attempt ${retryCount + 1}):`, errorText);
            retryCount++;
          }
        } catch (error) {
          console.error(`DeepSeek API error (attempt ${retryCount + 1}):`, error);
          retryCount++;
        }
      }
    }

    // Create subject-specific content even if DeepSeek fails
    if (!aiJson) {
      console.log(hasHoliday ? "HOLIDAY detected, using HOLIDAY template" : "DeepSeek API failed, generating real content with fallback");
      
      const generateRealActivities = (day: string, plan: any) => {
        // Handle HOLIDAY case
        if (plan.examType === "HOLIDAY") {
          return effectiveLanguage === 'Filipino' ? "Walang klase - Holiday" : "No class - Holiday";
        }

        const count = plan.questionCount;
        const type = plan.examType;
        const competency = plan.competency;
        const subjectLower = subject.toLowerCase();

        // ==================== KS1 WORKSHEET ACTIVITY FALLBACK ====================
        // KS1 worksheet types need simple, visual, age-appropriate instructions — NOT
        // the standard Multiple Choice / Identification exam questions below.
        const worksheetTypes = [
          "Picture Counting", "Picture Matching", "Identifying / Circling", "Coloring Activity",
          "Sequence / Story Order", "Picture Sorting", "Tracing Activity", "Complete the Pattern",
          "Fill in the Blank (Pictures)", "Draw and Label",
        ];
        if (worksheetTypes.includes(type)) {
          const filipino = effectiveLanguage === 'Filipino';
          let instructions = "";
          let activity = "";
          let answerKey = "";

          switch (type) {
            case "Picture Counting":
              instructions = filipino
                ? `Bilangin ang mga larawan sa kahon. Isulat ang tamang numero sa linya.`
                : `Count the pictures in the box. Write the correct number on the line.`;
              activity = Array.from({ length: count }, (_, i) =>
                filipino ? `Set ${i + 1}: [____] larawan ng ${competency}` : `Set ${i + 1}: [____] pictures of ${competency}`
              ).join("\n");
              answerKey = filipino ? `Susi sa Sagot: ${count} larawan bawat set` : `Answer Key: ${count} pictures per set`;
              break;
            case "Picture Matching":
              instructions = filipino
                ? `Magpadulo ng linya mula sa larawan sa kaliwa patungo sa katugon nitong larawan sa kanan.`
                : `Draw a line from each picture on the left to its matching picture on the right.`;
              activity = Array.from({ length: count }, (_, i) =>
                filipino ? `Hanay A (${i + 1}) [larawan] — Hanay B (${i + 1}) [larawan]` : `Column A (${i + 1}) [picture] — Column B (${i + 1}) [picture]`
              ).join("\n");
              answerKey = filipino ? `Susi sa Sagot: Iugnay ang mga magkapares` : `Answer Key: Match corresponding pairs`;
              break;
            case "Identifying / Circling":
              instructions = filipino
                ? `Bilugan ang mga larawang tumutugma sa: ${competency}`
                : `Circle the pictures that match: ${competency}`;
              activity = filipino
                ? `[Larawan ng iba't ibang bagay — bilugan ang mga tamang larawan]`
                : `[Picture of various objects — circle the correct ones]`;
              answerKey = filipino ? `Susi sa Sagot: Bilugan ang mga tamang larawan` : `Answer Key: Circle the matching pictures`;
              break;
            case "Coloring Activity":
              instructions = filipino
                ? `Kulayan ang mga larawan ayon sa kulay na nakasulat.`
                : `Color the pictures according to the color written below each one.`;
              activity = Array.from({ length: Math.min(count, 5) }, (_, i) =>
                filipino ? `Larawan ${i + 1}: [outline] — Kulay: ___` : `Picture ${i + 1}: [outline] — Color: ___`
              ).join("\n");
              answerKey = filipino ? `Susi sa Sagot: Sundin ang mga kulay` : `Answer Key: Follow the color directions`;
              break;
            case "Sequence / Story Order":
              instructions = filipino
                ? `Ayusin ang mga larawan sa tamang pagkakasunod-sunod. Lagyan ng numero 1, 2, 3, 4.`
                : `Arrange the pictures in the correct order. Number them 1, 2, 3, 4.`;
              activity = filipino
                ? `[Apat na larawan tungkol sa: ${competency} — sa magulong ayos]`
                : `[Four pictures about: ${competency} — in jumbled order]`;
              answerKey = filipino ? `Susi sa Sagot: 1 → 2 → 3 → 4 (tamang pagkakasunod)` : `Answer Key: 1 → 2 → 3 → 4 (correct order)`;
              break;
            case "Picture Sorting":
              instructions = filipino
                ? `Hatiin ang mga larawan sa tamang grupo. Ilagay ang bawat larawan sa tamang kahon.`
                : `Sort the pictures into the correct groups. Place each picture in the right box.`;
              activity = filipino
                ? `[Grupo 1: ___] [Grupo 2: ___] — Ihalo ang mga larawang tungkol sa ${competency}`
                : `[Group 1: ___] [Group 2: ___] — Mix pictures about ${competency}`;
              answerKey = filipino ? `Susi sa Sagot: Hatiin ayon sa kategorya` : `Answer Key: Sort by category`;
              break;
            case "Tracing Activity":
              instructions = filipino
                ? `Sundan ang mga tuldok upang masulat ang bawat isa.`
                : `Trace along the dotted lines to write each one.`;
              activity = Array.from({ length: count }, (_, i) =>
                filipino ? `Hanay ${i + 1}: [dashed outline ng ${competency}]` : `Row ${i + 1}: [dashed outline of ${competency}]`
              ).join("\n");
              answerKey = filipino ? `Susi sa Sagot: Sundan ang linya` : `Answer Key: Follow the lines`;
              break;
            case "Complete the Pattern":
              instructions = filipino
                ? `Tingnan ang padron. Anong susunod? Bilugan ang tamang larawan.`
                : `Look at the pattern. What comes next? Circle the correct picture.`;
              activity = Array.from({ length: count }, (_, i) =>
                filipino ? `Padron ${i + 1}: [A] [B] [A] [B] [?] — Pumili: [A] o [B]` : `Pattern ${i + 1}: [A] [B] [A] [B] [?] — Choose: [A] or [B]`
              ).join("\n");
              answerKey = filipino ? `Susi sa Sagot: Sundin ang padron` : `Answer Key: Follow the pattern`;
              break;
            case "Fill in the Blank (Pictures)":
              instructions = filipino
                ? `Tingnan ang larawan. Anong kulang? Pumili sa kahon at isulat.`
                : `Look at the picture. What is missing? Choose from the box and write it.`;
              activity = Array.from({ length: count }, (_, i) =>
                filipino ? `${i + 1}. [Larawan ng ${competency} na may kulang] — ___` : `${i + 1}. [Picture of ${competency} with missing part] — ___`
              ).join("\n");
              answerKey = filipino ? `Susi sa Sagot: Punan ang patlang` : `Answer Key: Fill in the blank`;
              break;
            case "Draw and Label":
              instructions = filipino
                ? `Gumuhit ng larawan tungkol sa: ${competency}. Pagkatapos, sulatan ang pangalan.`
                : `Draw a picture about: ${competency}. Then, write its name below.`;
              activity = filipino
                ? `[Walang laman na kahon para sa guhit]\nPangalan: ____________`
                : `[Empty box for drawing]\nName: ____________`;
              answerKey = filipino ? `Susi sa Sagot: Gumuhit at lagyan ng pangalan` : `Answer Key: Draw and label`;
              break;
            default:
              instructions = filipino
                ? `Gawin ang aktibidad tungkol sa: ${competency}`
                : `Complete the activity about: ${competency}`;
              activity = filipino ? `[Aktibidad sa ${competency}]` : `[Activity on ${competency}]`;
              answerKey = "";
          }

          const expectedOutput = filipino
            ? `Inaasahang Resulta: Ang bata ay makakumpleto ng gawain nang wasto.`
            : `Expected Output: The learner completes the activity correctly.`;
          const contingency = filipino
            ? `Kontinhensiya: Kung mahirap, gawin sa pangkat o bigyan ng gabay.`
            : `Contingency: If difficult, do in groups or provide guidance.`;

          return `Instructions/Directions: ${instructions}\n\n${activity}\n\n${answerKey ? answerKey + "\n\n" : ""}${expectedOutput}\n${contingency}`;
        }
        // ==================== END KS1 WORKSHEET FALLBACK ====================
        
        // Create competency-specific questions based on the actual competency text
        const createCompetencyBasedQuestions = () => {
          let questions = "";
          
          // Extract key terms from competency for more specific questions
          const competencyWords = competency.toLowerCase().split(/\s+/);
          const dayHash = day.length + competency.length; // Create day-specific variation
          
          for (let i = 1; i <= count; i++) {
            const questionSeed = i + dayHash; // Make each question unique per day
            
            switch (type) {
              case "Multiple Choice":
                if (effectiveLanguage === 'Filipino') {
                  // Create competency-specific Filipino multiple choice questions
                  if (competency.toLowerCase().includes('plot') || competency.toLowerCase().includes('sequential')) {
                    questions += `${i}. Ano ang sequential type of plot sa isang kwento?\n   A. Ang mga pangyayari ay nagsisimula sa simula at nagtatapos sa wakas\n   B. Ang mga pangyayari ay hindi sunod-sunod\n   C. Ang mga pangyayari ay nagsisimula sa wakas\n   D. Ang mga pangyayari ay walang pagkakasunod-sunod\n\n`;
                  } else if (competency.toLowerCase().includes('point of view') || competency.toLowerCase().includes('author')) {
                    questions += `${i}. Ano ang first person point of view?\n   A. Gumagamit ng "siya" sa pagsasalita\n   B. Gumagamit ng "ako" o "kami" sa pagsasalita\n   C. Gumagamit ng "kayo" sa pagsasalita\n   D. Walang tiyak na pananaw\n\n`;
                  } else if (competency.toLowerCase().includes('sequence') || competency.toLowerCase().includes('events')) {
                    questions += `${i}. Paano mo masisiguro na tamang pagkakasunod-sunod ang mga pangyayari sa kwento?\n   A. Sundin ang chronological order\n   B. Isulat nang hindi sunod-sunod\n   C. Huwag alamin ang simula\n   D. Simulan sa wakas\n\n`;
                  } else if (competency.toLowerCase().includes('fantasy') || competency.toLowerCase().includes('reality')) {
                    questions += `${i}. Alin sa mga sumusunod ang nagpapakita ng fantasy sa isang kwento?\n   A. Isang batang naglalakad sa parke\n   B. Isang hayop na nagsasalita\n   C. Isang guro na nagtuturo\n   D. Isang nanay na nagluluto\n\n`;
                  } else if (competency.toLowerCase().includes('story elements') || competency.toLowerCase().includes('schema')) {
                    questions += `${i}. Ano ang kahulugan ng "connecting to one's experience" sa pagbabasa?\n   A. Huwag isipin ang sariling karanasan\n   B. Iugnay ang kwento sa sariling buhay\n   C. Limutin ang nabasang kwento\n   D. Huwag intindihin ang kwento\n\n`;
                  } else {
                    // Generic competency-based question in Filipino with variation
                    const competencyPhrase = competency.split(' ').slice(0, 6).join(' ');
                    const variation = questionSeed % 5; // Create 5 different question patterns
                    const questions_filipino = [
                      `${i}. Tungkol sa "${competencyPhrase}", alin ang tamang pag-unawa?\n   A. Kailangan ng mas malalim na pag-aaral at pagsasanay\n   B. Madaling mauunawaan ng lahat nang walang pagsisikap\n   C. Hindi mahalagang aralin sa pag-aaral\n   D. Pwedeng balewalain nang tuluyan\n\n`,
                      `${i}. Paano mo ilalapat ang konsepto ng "${competencyPhrase}" sa tunay na buhay?\n   A. Sa pang-araw-araw na komunikasyon at gawain\n   B. Hindi ito maaaring ilapat sa realidad\n   C. Ginagamit lamang sa loob ng paaralan\n   D. Para sa mga guro lamang ang paggamit nito\n\n`,
                      `${i}. Ano ang pangunahing layunin ng pag-aaral ng "${competencyPhrase}"?\n   A. Para makapasa lamang sa pagsusulit\n   B. Upang mapabuti ang iyong kasanayan at kaalaman\n   C. Walang malinaw na layunin sa pag-aaral\n   D. Dahil ito ay bahagi lamang ng curriculum\n\n`,
                      `${i}. Sa pagsasagawa ng "${competencyPhrase}", ano ang dapat bigyang-pansin?\n   A. Tamang pag-unawa at wastong aplikasyon\n   B. Bilis ng pagsagot nang walang pag-iisip\n   C. Haba ng sagot kahit mali ang nilalaman\n   D. Kagandahan ng sulat lamang hindi laman\n\n`,
                      `${i}. Bakit mahalaga ang "${competencyPhrase}" sa iyong pag-aaral?\n   A. Tumutulong ito sa pagpapabuti ng iyong kakayahan\n   B. Hindi ito makakatulong sa kinabukasan mo\n   C. Pang-test taking strategies lang ito\n   D. Walang tunay na kabuluhan sa buhay\n\n`
                    ];
                    questions += questions_filipino[variation];
                  }
                } else {
                  // Create competency-specific English multiple choice questions
                  if (competency.toLowerCase().includes('plot') || competency.toLowerCase().includes('sequential')) {
                    questions += `${i}. What is a sequential plot in a story?\n   A. Events that happen in chronological order\n   B. Events that happen randomly\n   C. Events that start at the end\n   D. Events with no particular order\n\n`;
                  } else if (competency.toLowerCase().includes('point of view') || competency.toLowerCase().includes('first person')) {
                    questions += `${i}. Which pronoun indicates first person point of view?\n   A. He, she, they\n   B. I, we, my\n   C. You, your\n   D. It, its\n\n`;
                  } else if (competency.toLowerCase().includes('sequence') || competency.toLowerCase().includes('events')) {
                    questions += `${i}. What is the best way to sequence story events?\n   A. Follow the order they happened\n   B. Start with the ending\n   C. Mix them randomly\n   D. Skip important events\n\n`;
                  } else if (competency.toLowerCase().includes('fantasy') || competency.toLowerCase().includes('reality')) {
                    questions += `${i}. Which example shows fantasy in a story?\n   A. A child walking to school\n   B. A talking animal\n   C. A teacher in a classroom\n   D. A mother cooking dinner\n\n`;
                  } else if (competency.toLowerCase().includes('story elements') || competency.toLowerCase().includes('connections')) {
                    questions += `${i}. What does "making connections" mean in reading?\n   A. Ignoring your own experiences\n   B. Relating the story to your life\n   C. Forgetting what you read\n   D. Not understanding the story\n\n`;
                  } else {
                    // Generic competency-based question in English with variation
                    const competencyPhrase = competency.split(' ').slice(0, 6).join(' ');
                    const variation = questionSeed % 5; // Create 5 different question patterns
                    const questions_english = [
                      `${i}. Regarding "${competencyPhrase}", which understanding is correct?\n   A. It requires deeper study and practice to master\n   B. It's easily understood by everyone without effort\n   C. It's not important enough to learn properly\n   D. It can be ignored or skipped completely\n\n`,
                      `${i}. How can "${competencyPhrase}" be applied in real life?\n   A. Through daily communication and practical activities\n   B. It cannot be applied outside the classroom\n   C. Only in school assignments and textbooks\n   D. Reserved for teachers and experts only\n\n`,
                      `${i}. What is the main purpose of learning "${competencyPhrase}"?\n   A. Just to pass tests and examinations\n   B. To improve your skills and deepen understanding\n   C. There is no clear purpose for learning it\n   D. Because it's required by the curriculum\n\n`,
                      `${i}. When demonstrating "${competencyPhrase}", what should you focus on?\n   A. Proper understanding and correct application\n   B. Speed of answering without thinking\n   C. Length of response regardless of accuracy\n   D. Appearance only, not the content\n\n`,
                      `${i}. Why is "${competencyPhrase}" important in your studies?\n   A. It helps develop your abilities and competence\n   B. It won't help you in your future career\n   C. It's only for test-taking strategies\n   D. It has no real value in everyday life\n\n`
                    ];
                    questions += questions_english[variation];
                  }
                }
                break;
              case "Identification":
                if (effectiveLanguage === 'Filipino') {
                  // Create competency-specific Filipino identification questions
                  if (competency.toLowerCase().includes('plot') || competency.toLowerCase().includes('sequential')) {
                    questions += `${i}. Tukuyin ang uri ng plot na ginagamit sa kwentong: "Una, naglakbay si Juan. Pagkatapos, nakatagpo niya ang higante. Sa wakas, naging masaya sila." ________\n\n`;
                  } else if (competency.toLowerCase().includes('point of view') || competency.toLowerCase().includes('author')) {
                    questions += `${i}. Tukuyin ang point of view na ginamit sa pangungusap: "Ako ay naglalakad sa parke." ________\n\n`;
                  } else if (competency.toLowerCase().includes('sequence') || competency.toLowerCase().includes('events')) {
                    questions += `${i}. Tukuyin ang tamang pagkakasunod-sunod: Natulog, Gumising, Kumain ng almusal. Una: ________\n\n`;
                  } else if (competency.toLowerCase().includes('fantasy') || competency.toLowerCase().includes('reality')) {
                    questions += `${i}. Tukuyin kung fantasy o reality: "Ang ibon ay lumipad sa kalangitan." ________\n\n`;
                  } else if (competency.toLowerCase().includes('story elements') || competency.toLowerCase().includes('schema')) {
                    questions += `${i}. Tukuyin ang story element na maaaring iugnay sa sariling karanasan: ________\n\n`;
                  } else {
                    // Competency-specific identification
                    const competencyPhrase = competency.split(' ').slice(0, 8).join(' ');
                    questions += `${i}. Tukuyin ang pangunahing ideya sa: "${competencyPhrase}" ________\n\n`;
                  }
                } else {
                  // Create competency-specific English identification questions
                  if (competency.toLowerCase().includes('plot') || competency.toLowerCase().includes('sequential')) {
                    questions += `${i}. Identify the plot type used in: "First, Tom went to school. Then, he met his friend. Finally, they played together." ________\n\n`;
                  } else if (competency.toLowerCase().includes('point of view') || competency.toLowerCase().includes('author')) {
                    questions += `${i}. Identify the point of view in: "I walked through the garden." ________\n\n`;
                  } else if (competency.toLowerCase().includes('sequence') || competency.toLowerCase().includes('events')) {
                    questions += `${i}. Identify the correct sequence: Slept, Woke up, Ate breakfast. First: ________\n\n`;
                  } else if (competency.toLowerCase().includes('fantasy') || competency.toLowerCase().includes('reality')) {
                    questions += `${i}. Identify as fantasy or reality: "The bird flew in the sky." ________\n\n`;
                  } else if (competency.toLowerCase().includes('story elements') || competency.toLowerCase().includes('connections')) {
                    questions += `${i}. Identify the story element you can connect to your experience: ________\n\n`;
                  } else {
                    // Competency-specific identification
                    const competencyPhrase = competency.split(' ').slice(0, 8).join(' ');
                    questions += `${i}. Identify the main concept in: "${competencyPhrase}" ________\n\n`;
                  }
                }
                break;
                
              case "True/False":
                if (effectiveLanguage === 'Filipino') {
                  if (subjectLower.includes('filipino')) {
                    questions += `${i}. Ang pang-uri ay ginagamit upang maglarawan ng pangngalan. (Tama/Mali)\n\n`;
                  } else if (subjectLower.includes('math')) {
                    questions += `${i}. Ang kabuuan ng lahat ng sulok sa tatsulok ay 180 degrees. (Tama/Mali)\n\n`;
                  } else if (subjectLower.includes('science')) {
                    questions += `${i}. Ang mga halaman ay nangangailangan ng sikat ng araw, tubig, at carbon dioxide para sa photosynthesis. (Tama/Mali)\n\n`;
                  } else if (subjectLower.includes('epp')) {
                    questions += `${i}. Ang natural na pag-aalaga ng manok ay mas mahal kaysa sa artificial feeding. (Tama/Mali)\n\n`;
                  } else {
                    const variation = questionSeed % 3;
                    const questions_filipino = [
                      `${i}. Ang pahayag na "${competency.split(' ').slice(0, 6).join(' ')}" ay wasto at makatotohanan. (Tama/Mali)\n\n`,
                      `${i}. Batay sa "${competency.split(' ').slice(0, 6).join(' ')}", ang sumusunod na ideya ay totoo. (Tama/Mali)\n\n`,
                      `${i}. Tama o mali: Ang konsepto ng "${competency.split(' ').slice(0, 6).join(' ')}" ay nauugnay sa pag-aaral. (Tama/Mali)\n\n`
                    ];
                    questions += questions_filipino[variation];
                  }
                } else {
                  if (subjectLower.includes('filipino')) {
                    questions += `${i}. Adjectives are used to describe nouns. (True/False)\n\n`;
                  } else if (subjectLower.includes('math')) {
                    questions += `${i}. The sum of all angles in a triangle is 180 degrees. (True/False)\n\n`;
                  } else if (subjectLower.includes('science')) {
                    questions += `${i}. Plants need sunlight, water, and carbon dioxide for photosynthesis. (True/False)\n\n`;
                  } else if (subjectLower.includes('epp')) {
                    questions += `${i}. Natural chicken care is more expensive than artificial feeding. (True/False)\n\n`;
                  } else {
                    const variation = questionSeed % 3;
                    const questions_english = [
                      `${i}. The statement about "${competency.split(' ').slice(0, 6).join(' ')}" is accurate and valid. (True/False)\n\n`,
                      `${i}. Based on "${competency.split(' ').slice(0, 6).join(' ')}", the following concept is true. (True/False)\n\n`,
                      `${i}. True or false: The idea of "${competency.split(' ').slice(0, 6).join(' ')}" relates to learning. (True/False)\n\n`
                    ];
                    questions += questions_english[variation];
                  }
                }
                break;
                
              case "Essay":
                if (effectiveLanguage === 'Filipino') {
                  if (subjectLower.includes('filipino')) {
                    questions += `${i}. Ipaliwanag kung paano ginagamit ang mga pang-uri sa pagbuo ng makabuluhang pangungusap.\n\n`;
                  } else if (subjectLower.includes('math')) {
                    questions += `${i}. Ipaliwanag ang mga hakbang upang malutas ang word problems na may multiplication at division.\n\n`;
                  } else if (subjectLower.includes('science')) {
                    questions += `${i}. Ilarawan ang kahalagahan ng photosynthesis sa ekosistema.\n\n`;
                  } else if (subjectLower.includes('epp')) {
                    questions += `${i}. Ipaliwanag ang mga hakbang sa wastong pag-aalaga ng poultry animals sa natural na paraan.\n\n`;
                  } else {
                    const variation = questionSeed % 3;
                    const questions_filipino = [
                      `${i}. Ipaliwanag nang detalyado ang konsepto ng: ${competency.split(' ').slice(0, 8).join(' ')}\n\n`,
                      `${i}. Bigyang-kahulugan at ilarawan ang kahalagahan ng: ${competency.split(' ').slice(0, 8).join(' ')}\n\n`,
                      `${i}. Suriin at talakayin ang mga aspeto ng: ${competency.split(' ').slice(0, 8).join(' ')}\n\n`
                    ];
                    questions += questions_filipino[variation];
                  }
                } else {
                  if (subjectLower.includes('filipino')) {
                    questions += `${i}. Explain how adjectives are used in forming meaningful sentences.\n\n`;
                  } else if (subjectLower.includes('math')) {
                    questions += `${i}. Explain the steps to solve word problems involving multiplication and division.\n\n`;
                  } else if (subjectLower.includes('science')) {
                    questions += `${i}. Describe the importance of photosynthesis in the ecosystem.\n\n`;
                  } else if (subjectLower.includes('epp')) {
                    questions += `${i}. Explain the steps in proper care of poultry animals through natural methods.\n\n`;
                  } else {
                    const variation = questionSeed % 3;
                    const questions_english = [
                      `${i}. Analyze and explain the significance of: ${competency.split(' ').slice(0, 8).join(' ')}\n\n`,
                      `${i}. Describe and discuss the importance of: ${competency.split(' ').slice(0, 8).join(' ')}\n\n`,
                      `${i}. Evaluate and elaborate on the concept of: ${competency.split(' ').slice(0, 8).join(' ')}\n\n`
                    ];
                    questions += questions_english[variation];
                  }
                }
                break;
                
              case "Matching Type":
                if (subjectLower.includes('filipino')) {
                  questions += `${i}. Itambal ang pang-uri sa tamang kahulugan:\n   Column A: Maganda, Matalino, Masipag\n   Column B: Hardworking, Beautiful, Intelligent\n\n`;
                } else if (subjectLower.includes('math')) {
                  questions += `${i}. Match the operation with its symbol:\n   Column A: Addition, Subtraction, Multiplication\n   Column B: ×, +, −\n\n`;
                } else if (subjectLower.includes('science')) {
                  questions += `${i}. Match the plant part with its function:\n   Column A: Roots, Leaves, Stem\n   Column B: Photosynthesis, Support, Absorption\n\n`;
                } else if (subjectLower.includes('epp')) {
                  questions += `${i}. Itambal ang tamang pag-aalaga sa benepisyo nito:\n   Column A: Natural feeding, Clean housing, Regular check-up\n   Column B: Healthy eggs, Disease prevention, Quality meat\n\n`;
                } else {
                  questions += `${i}. Match the concept with its application based on "${competency.split(' ').slice(0, 5).join(' ')}":\n\n`;
                }
                break;
                
              case "Performance Task":
                if (subjectLower.includes('filipino')) {
                  questions += `${i}. Gumawa ng maikling talata na may 5 pangungusap gamit ang iba't ibang uri ng pang-uri.\n\n`;
                } else if (subjectLower.includes('math')) {
                  questions += `${i}. Create a word problem that requires multiplication and provide the complete solution.\n\n`;
                } else if (subjectLower.includes('science')) {
                  questions += `${i}. Design a simple experiment to demonstrate photosynthesis in plants.\n\n`;
                } else if (subjectLower.includes('epp')) {
                  questions += `${i}. Lumikha ng feeding schedule para sa poultry animals na sumusunod sa natural na pamamaraan.\n\n`;
                } else {
                  questions += `${i}. Create a practical demonstration of: ${competency.split(' ').slice(0, 6).join(' ')}\n\n`;
                }
                break;
                
              default:
                questions += `${i}. Provide a detailed response about: ${competency.split(' ').slice(0, 8).join(' ')}\n\n`;
            }
          }
          return questions;
        };
        
        return `${effectiveLanguage === 'Filipino' ? 'Panuto/Mga Tagubilin:' : 'Instructions/Directions:'} ${effectiveLanguage === 'Filipino' ? 'Kumpletuhin ang sumusunod na' : 'Complete the following'} ${type.toLowerCase()} ${effectiveLanguage === 'Filipino' ? 'pagsusulit batay sa kompetensya ng' : 'assessment based on'} ${day}${effectiveLanguage === 'Filipino' ? '.' : "'s competency."}

${effectiveLanguage === 'Filipino' ? 'Pagsusulit:' : 'Quiz:'}
${createCompetencyBasedQuestions()}
${effectiveLanguage === 'Filipino' ? 'Inaasahang Output:' : 'Expected Output:'} ${effectiveLanguage === 'Filipino' ? 'Natapos na pagsusulit na nagpapakita ng pag-unawa sa kompetensya.' : 'Completed assessment demonstrating understanding of the competency.'}
${effectiveLanguage === 'Filipino' ? 'Contingency:' : 'Contingency:'} ${effectiveLanguage === 'Filipino' ? 'Suriin ang mga materyales at subukan muli kung kinakailangan.' : 'Review materials and attempt again if needed.'}`;
      };

      const generateReference = (plan: any) => {
        return plan.examType === "HOLIDAY" ? 
          (effectiveLanguage === 'Filipino' ? "Walang sanggunian na kailangan - Holiday" : "No references needed - Holiday") : 
          (effectiveLanguage === 'Filipino' ? `${subject} textbook, DepEd na materyales sa pagkatuto, K-12 curriculum guides` : `${subject} textbook, DepEd learning materials, K-12 curriculum guides`);
      };

      aiJson = {
        competency: {
          mon: dailyPlan.Monday.competency,
          tue: dailyPlan.Tuesday.competency,
          wed: dailyPlan.Wednesday.competency,
          thu: dailyPlan.Thursday.competency,
          fri: dailyPlan.Friday.competency,
        },
        references: {
          mon: generateReference(dailyPlan.Monday),
          tue: generateReference(dailyPlan.Tuesday),
          wed: generateReference(dailyPlan.Wednesday),
          thu: generateReference(dailyPlan.Thursday),
          fri: generateReference(dailyPlan.Friday),
        },
        activities: {
          mon: generateRealActivities("Monday", dailyPlan.Monday),
          tue: generateRealActivities("Tuesday", dailyPlan.Tuesday),
          wed: generateRealActivities("Wednesday", dailyPlan.Wednesday),
          thu: generateRealActivities("Thursday", dailyPlan.Thursday),
          fri: generateRealActivities("Friday", dailyPlan.Friday),
        },
      };
    }

    // Ensure competencies match exactly what user provided (never trust AI for this)
    aiJson.competency = {
      mon: dailyPlan.Monday.competency,
      tue: dailyPlan.Tuesday.competency,
      wed: dailyPlan.Wednesday.competency,
      thu: dailyPlan.Thursday.competency,
      fri: dailyPlan.Friday.competency,
    };

    // ==================== KS1 VISUAL ACTIVITY IMAGE GENERATION ====================
    // For Key Stage 1 (Kinder–Grade 3) in worksheet mode, generate real illustrations
    // with Qwen Image and embed them in the DOCX alongside the text instructions.

    // If DeepSeek didn't return imagePrompts, synthesize them from competency + activity type.
    if (isKs1Worksheet && !aiJson?.imagePrompts) {
      console.log("DeepSeek did not return imagePrompts — synthesizing locally");
      const synthesizeImagePrompt = (dayKey: "mon" | "tue" | "wed" | "thu" | "fri"): string => {
        const plan = dailyPlan[dayKey === "mon" ? "Monday" : dayKey === "tue" ? "Tuesday" : dayKey === "wed" ? "Wednesday" : dayKey === "thu" ? "Thursday" : "Friday"];
        const competency = plan.competency;
        const examType = plan.examType;
        const count = plan.questionCount;

        switch (examType) {
          case "Picture Counting":
            return `Show exactly ${count} clearly visible objects related to "${competency}" arranged in a neat row on a clean white background. Bright cartoon style for young children.`;
          case "Picture Matching":
            return `Two columns side by side. Left column has ${count} items and right column has ${count} matching pairs, all related to "${competency}". Clean white background, cartoon style.`;
          case "Identifying / Circling":
            return `A colorful scene with several objects related to "${competency}". Some objects match the category and some do not. Clean cartoon style for young children.`;
          case "Coloring Activity":
            return `Bold black outline illustrations of objects related to "${competency}". Clear thick lines ready for coloring. No fill colors, white background inside the outlines.`;
          case "Sequence / Story Order":
            return `Four simple pictures showing steps or events related to "${competency}", arranged in a 2x2 grid. Each picture is a clear distinct scene. Cartoon style for children.`;
          case "Picture Sorting":
            return `Several mixed objects from different categories related to "${competency}". Objects should be clearly distinguishable into groups. Clean cartoon style.`;
          case "Tracing Activity":
            return `Large bold dashed outline shapes, letters, or numbers related to "${competency}". Dotted lines that a child can trace. Clean white background, very large format.`;
          case "Complete the Pattern":
            return `A repeating visual pattern (like colored shapes or objects) related to "${competency}" with the last item missing, shown as an empty box. Cartoon style for children.`;
          case "Fill in the Blank (Pictures)":
            return `A picture scene related to "${competency}" with one item clearly missing, shown as an empty space or dotted outline. Cartoon style for young children.`;
          case "Draw and Label":
            return `A large empty space with a simple example illustration of something related to "${competency}" in the corner. Clean white background for drawing.`;
          default:
            return `A bright, colorful, child-friendly illustration related to "${competency}". Cartoon style with clean white background.`;
        }
      };

      aiJson.imagePrompts = {
        mon: synthesizeImagePrompt("mon"),
        tue: synthesizeImagePrompt("tue"),
        wed: synthesizeImagePrompt("wed"),
        thu: synthesizeImagePrompt("thu"),
        fri: synthesizeImagePrompt("fri"),
      };
      console.log("Synthesized imagePrompts:", JSON.stringify(aiJson.imagePrompts));
    }

    const ks1Images: Record<string, Uint8Array | null> = {
      mon: null,
      tue: null,
      wed: null,
      thu: null,
      fri: null,
    };

    if (isKs1Worksheet && DASHSCOPE_API_KEY && !hasHoliday) {
      console.log("KS1 visual mode: generating illustrations with Qwen Image...");

      const dayKeys: Array<{ key: "mon" | "tue" | "wed" | "thu" | "fri"; day: string }> = [
        { key: "mon", day: "Monday" },
        { key: "tue", day: "Tuesday" },
        { key: "wed", day: "Wednesday" },
        { key: "thu", day: "Thursday" },
        { key: "fri", day: "Friday" },
      ];

      for (const { key, day } of dayKeys) {
        const isDayHoliday =
          dailyPlan[key === "mon" ? "Monday" : key === "tue" ? "Tuesday" : key === "wed" ? "Wednesday" : key === "thu" ? "Thursday" : "Friday"].examType === "HOLIDAY";

        if (isDayHoliday) {
          console.log(`Skipping image for ${day} (Holiday)`);
          continue;
        }

        const imagePromptDescription = aiJson?.imagePrompts?.[key];
        if (!imagePromptDescription) {
          console.log(`No image prompt for ${day}, skipping`);
          continue;
        }

        const fullPrompt = `Create a TEXT-FREE educational illustration for ${gradeLevel} Filipino students.

REQUIREMENTS:
- NO text, NO words, NO letters, NO numbers, NO labels anywhere in the image
- Show: ${imagePromptDescription}
- Subject context: ${subject}
- Style: bright, colorful, cartoon-like, child-friendly, clean white background
- Purpose: classroom worksheet illustration for young learners
- Make objects large, clear, and easy to identify

${effectiveLanguage === "Filipino" ? "The illustration should feel relatable to Filipino children — local objects, animals, and settings where appropriate." : ""}`;

        try {
          console.log(`Generating Qwen Image for ${day}...`);
          const imageResponse = await fetch(
            "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
              },
              body: JSON.stringify({
                model: "qwen-image-2.0-pro",
                input: {
                  messages: [
                    {
                      role: "user",
                      content: [{ text: fullPrompt }],
                    },
                  ],
                },
                parameters: {
                  negative_prompt:
                    "text, words, letters, numbers, labels, captions, watermarks, signatures, low quality, distorted, blurry, deformed, extra limbs, wrong proportions",
                  prompt_extend: true,
                  watermark: false,
                  size: "1328*1328",
                },
              }),
            },
          );

          if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            const tempImageUrl =
              imageData?.output?.choices?.[0]?.message?.content?.[0]?.image;

            if (tempImageUrl) {
              console.log(`Image generated for ${day}, downloading...`);
              // Download the image from the temporary URL
              const imgFetch = await fetch(tempImageUrl);
              if (imgFetch.ok) {
                const arrayBuffer = await imgFetch.arrayBuffer();
                ks1Images[key] = new Uint8Array(arrayBuffer);
                console.log(`Image downloaded for ${day} (${ks1Images[key]!.byteLength} bytes)`);
              } else {
                console.error(`Failed to download image for ${day}: ${imgFetch.status}`);
              }
            } else {
              console.error(`No image URL in Qwen response for ${day}:`, JSON.stringify(imageData));
            }
          } else {
            const errorText = await imageResponse.text();
            console.error(`Qwen Image API failed for ${day}: ${imageResponse.status}`, errorText);
          }
        } catch (imgError) {
          console.error(`Image generation error for ${day}:`, imgError);
          // Graceful degradation — continue without image for this day
        }
      }

      console.log(
        "KS1 image generation complete:",
        Object.entries(ks1Images).map(([k, v]) => `${k}: ${v ? "OK" : "none"}`),
      );
    } else if (isKs1Worksheet) {
      console.log("KS1 worksheet mode requested but DASHSCOPE_API_KEY not set — falling back to text-only");
    }

    // Step 3: Save to database
    console.log("Saving matrix data to database...");
    const matrixPayload = {
        user_id: userId,
        subject,
        grade_level: gradeLevel,
        section,
        date_from: dateFrom,
        date_to: dateTo,
        competency: `Mon: ${dailyPlan.Monday.competency}; Tue: ${dailyPlan.Tuesday.competency}; Wed: ${dailyPlan.Wednesday.competency}; Thu: ${dailyPlan.Thursday.competency}; Fri: ${dailyPlan.Friday.competency}`,
        code: code || null,
        custom_instructions: customInstructions || null,
        ai_json: aiJson,
      };

    const matrixQuery = existingMatrixId
      ? supabase.from("weelmat_matrices").update(matrixPayload).eq("id", existingMatrixId).eq("user_id", userId)
      : supabase.from("weelmat_matrices").insert(matrixPayload);
    const { data: matrixData, error: insertError } = await matrixQuery.select().single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      throw new Error(`Failed to save matrix data: ${insertError.message}`);
    }

    console.log("Matrix data saved successfully:", matrixData);

    const matrixId = matrixData?.id;

    // Function to extract answer key from quiz content
    const extractAnswerKey = (content: string): string[] => {
      const answers: string[] = [];
      
      // Look for patterns like "Answer Key:" or "Susi sa Sagot:" followed by answers
      const answerKeyMatch = content.match(/(Answer Key:|Susi sa Sagot:)([\s\S]*?)(?=\n\n|$)/i);
      
      if (answerKeyMatch) {
        const answerSection = answerKeyMatch[2];
        const answerLines = answerSection.split(/\n/).filter(line => line.trim());
        
        answerLines.forEach(line => {
          // Match patterns like "1. B", "1) B", "1 - B", etc.
          const match = line.match(/^\d+[\.\)\-\s]+([A-D]|True|False|Tama|Mali)/i);
          if (match) {
            answers.push(match[1]);
          }
        });
      }
      
      return answers;
    };

    // Function to parse activity content into properly formatted paragraphs with answer key
    const parseActivityContentWithAnswerKey = (content: string) => {
      if (!content) {
        return [new Paragraph({ children: [new TextRun({ text: "", size: 14 })] })];
      }

      const paragraphs: Paragraph[] = [];
      
      // Split content by double newlines first, then by single newlines
      const sections = content.split(/\n\n+/);
      
      sections.forEach((section, sectionIndex) => {
        if (!section.trim()) return;
        
        // Check if this is a quiz section with numbered questions
        if (section.includes('Quiz:') || /^\d+\./.test(section.trim())) {
          const lines = section.split(/\n+/);
          
          lines.forEach((line, lineIndex) => {
            if (!line.trim()) return;
            
            // Handle section headers (Instructions, Quiz, etc.)
            if (line.includes('Instructions/Directions:') || line.includes('Panuto/Mga Tagubilin:') ||
                line.includes('Quiz:') || line.includes('Pagsusulit:') ||
                line.includes('Expected Output:') || line.includes('Inaasahang Output:') ||
                line.includes('Contingency:') ||
                line.includes('Answer Key:') || line.includes('Susi sa Sagot:')) {
              paragraphs.push(new Paragraph({
                children: [new TextRun({ text: line.trim(), bold: true, size: 14 })],
                spacing: { before: 200, after: 100 }
              }));
            }
            // Handle questions (lines starting with numbers)
            else if (/^\d+\./.test(line.trim())) {
              paragraphs.push(new Paragraph({
                children: [new TextRun({ text: line.trim(), size: 14 })],
                spacing: { before: 150, after: 50 }
              }));
            }
            // Handle multiple choice options (A, B, C, D)
            else if (/^\s*[A-D]\./.test(line.trim())) {
              paragraphs.push(new Paragraph({
                children: [new TextRun({ text: `   ${line.trim()}`, size: 14 })],
                spacing: { before: 50, after: 50 }
              }));
            }
            // Handle True/False options
            else if (line.includes('(True/False)') || line.includes('(Tama/Mali)')) {
              paragraphs.push(new Paragraph({
                children: [new TextRun({ text: line.trim(), size: 14 })],
                spacing: { before: 100, after: 100 }
              }));
            }
            // Handle regular content lines
            else if (line.trim()) {
              paragraphs.push(new Paragraph({
                children: [new TextRun({ text: line.trim(), size: 14 })],
                spacing: { after: 80 }
              }));
            }
          });
        } else {
          // Handle non-quiz sections (simple text)
          const lines = section.split(/\n+/);
          lines.forEach(line => {
            if (!line.trim()) return;
            
            // Check if it's a section header
            if (line.includes('Instructions/Directions:') || line.includes('Panuto/Mga Tagubilin:') ||
                line.includes('Expected Output:') || line.includes('Inaasahang Output:') ||
                line.includes('Contingency:') ||
                line.includes('Answer Key:') || line.includes('Susi sa Sagot:')) {
              paragraphs.push(new Paragraph({
                children: [new TextRun({ text: line.trim(), bold: true, size: 14 })],
                spacing: { before: 200, after: 100 }
              }));
            } else {
              paragraphs.push(new Paragraph({
                children: [new TextRun({ text: line.trim(), size: 14 })],
                spacing: { after: 80 }
              }));
            }
          });
        }
        
        // Add spacing between major sections
        if (sectionIndex < sections.length - 1) {
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: "", size: 8 })],
            spacing: { after: 100 }
          }));
        }
      });

      // If no paragraphs were created, return a default empty paragraph
      if (paragraphs.length === 0) {
        paragraphs.push(new Paragraph({ children: [new TextRun({ text: "", size: 14 })] }));
      }

      return paragraphs;
    };

    // Function to parse activity content for students (removes answer keys, Expected Output, Contingency)
    const parseActivityContentForStudent = (content: string) => {
      if (!content) {
        return [new Paragraph({ children: [new TextRun({ text: "", size: 14 })] })];
      }

      // Remove sections that should not be visible to students
      let studentContent = content.replace(/(Expected Output|Inaasahang Output):.*?(?=\n\n|$)/gis, '');
      studentContent = studentContent.replace(/(Contingency):.*?(?=\n\n|$)/gis, '');
      studentContent = studentContent.replace(/(Answer Key|Susi sa Sagot):.*?(?=\n\n|$)/gis, '');

      const paragraphs: Paragraph[] = [];
      
      // Split content by double newlines first, then by single newlines
      const sections = studentContent.split(/\n\n+/);
      
      sections.forEach((section, sectionIndex) => {
        if (!section.trim()) return;
        
        // Check if this is a quiz section with numbered questions
        if (section.includes('Quiz:') || /^\d+\./.test(section.trim())) {
          const lines = section.split(/\n+/);
          
          lines.forEach((line, lineIndex) => {
            if (!line.trim()) return;
            
            // Skip lines that are part of removed sections
            if (line.includes('Expected Output:') || line.includes('Inaasahang Output:') ||
                line.includes('Contingency:') ||
                line.includes('Answer Key:') || line.includes('Susi sa Sagot:')) {
              return;
            }
            
            // Handle section headers (Instructions, Quiz, etc.)
            if (line.includes('Instructions/Directions:') || line.includes('Panuto/Mga Tagubilin:') ||
                line.includes('Quiz:') || line.includes('Pagsusulit:')) {
              paragraphs.push(new Paragraph({
                children: [new TextRun({ text: line.trim(), bold: true, size: 14 })],
                spacing: { before: 200, after: 100 }
              }));
            }
            // Handle questions (lines starting with numbers)
            else if (/^\d+\./.test(line.trim())) {
              paragraphs.push(new Paragraph({
                children: [new TextRun({ text: line.trim(), size: 14 })],
                spacing: { before: 150, after: 50 }
              }));
            }
            // Handle multiple choice options (A, B, C, D)
            else if (/^\s*[A-D]\./.test(line.trim())) {
              paragraphs.push(new Paragraph({
                children: [new TextRun({ text: `   ${line.trim()}`, size: 14 })],
                spacing: { before: 50, after: 50 }
              }));
            }
            // Handle True/False options
            else if (line.includes('(True/False)') || line.includes('(Tama/Mali)')) {
              paragraphs.push(new Paragraph({
                children: [new TextRun({ text: line.trim(), size: 14 })],
                spacing: { before: 100, after: 100 }
              }));
            }
            // Handle regular content lines
            else if (line.trim()) {
              paragraphs.push(new Paragraph({
                children: [new TextRun({ text: line.trim(), size: 14 })],
                spacing: { after: 80 }
              }));
            }
          });
        } else {
          // Handle non-quiz sections (simple text)
          const lines = section.split(/\n+/);
          lines.forEach(line => {
            if (!line.trim()) return;
            
            // Skip lines that are part of removed sections
            if (line.includes('Expected Output:') || line.includes('Inaasahang Output:') ||
                line.includes('Contingency:') ||
                line.includes('Answer Key:') || line.includes('Susi sa Sagot:')) {
              return;
            }
            
            // Check if it's a section header
            if (line.includes('Instructions/Directions:') || line.includes('Panuto/Mga Tagubilin:')) {
              paragraphs.push(new Paragraph({
                children: [new TextRun({ text: line.trim(), bold: true, size: 14 })],
                spacing: { before: 200, after: 100 }
              }));
            } else {
              paragraphs.push(new Paragraph({
                children: [new TextRun({ text: line.trim(), size: 14 })],
                spacing: { after: 80 }
              }));
            }
          });
        }
        
        // Add spacing between major sections
        if (sectionIndex < sections.length - 1) {
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: "", size: 8 })],
            spacing: { after: 100 }
          }));
        }
      });

      // If no paragraphs were created, return a default empty paragraph
      if (paragraphs.length === 0) {
        paragraphs.push(new Paragraph({ children: [new TextRun({ text: "", size: 14 })] }));
      }

      return paragraphs;
    };

    // Helper: build an Activities cell for KS1 with optional image + text content
    const buildKs1ActivityCell = (
      dayKey: "mon" | "tue" | "wed" | "thu" | "fri",
      textParagraphs: Paragraph[],
    ): TableCell => {
      const imageBuffer = ks1Images[dayKey];
      const children: Paragraph[] = [];

      if (imageBuffer) {
        // Insert the image first
        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: imageBuffer,
                transformation: { width: 240, height: 180 },
                type: "png",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
          }),
        );
      }

      // Then append the text content (instructions, quiz, etc.)
      children.push(...textParagraphs);

      return new TableCell({
        children,
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
        },
      });
    };

    // Helper: build a plain text Activities cell (non-KS1 or image failed)
    const buildTextActivityCell = (textParagraphs: Paragraph[]): TableCell => {
      return new TableCell({
        children: textParagraphs,
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
        },
      });
    };

    // Step 4: Generate Teacher DOCX (Full Version with Answer Keys)
    console.log("Generating Teacher version DOCX...");
    const teacherDoc = new Document({
      creator: "WeeLMat Generator - Teacher Version",
      title: `WeeLMat Teacher - ${subject} - ${gradeLevel} - ${section}`,
      description: `Weekly Learning Matrix for ${subject}, ${gradeLevel}, Section ${section} - Full Version`,
      sections: [{
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
            size: { orientation: PageOrientation.LANDSCAPE },
          },
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: effectiveLanguage === 'Filipino' ? "Lingguhang Matris ng Pagkatuto (WeeLMat)" : "Weekly Learning Matrix (WeeLMat)",
                bold: true,
                size: 32,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: effectiveLanguage === 'Filipino' 
                  ? `Asignatura: ${subject} | Antas: ${gradeLevel} | Seksyon: ${section}`
                  : `Subject: ${subject} | Grade Level: ${gradeLevel} | Section: ${section}`,
                size: 24,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: effectiveLanguage === 'Filipino' 
                  ? `Petsa na Nasaklaw: ${dateFrom} hanggang ${dateTo}`
                  : `Covered Dates: ${dateFrom} to ${dateTo}`,
                size: 20,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              // Header Row
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "", bold: true, size: 18 })] })],
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: effectiveLanguage === 'Filipino' ? "Lunes" : "Monday", bold: true, size: 18 })], alignment: AlignmentType.CENTER })],
                    width: { size: 17, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: effectiveLanguage === 'Filipino' ? "Martes" : "Tuesday", bold: true, size: 18 })], alignment: AlignmentType.CENTER })],
                    width: { size: 17, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: effectiveLanguage === 'Filipino' ? "Miyerkules" : "Wednesday", bold: true, size: 18 })], alignment: AlignmentType.CENTER })],
                    width: { size: 17, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: effectiveLanguage === 'Filipino' ? "Huwebes" : "Thursday", bold: true, size: 18 })], alignment: AlignmentType.CENTER })],
                    width: { size: 17, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: effectiveLanguage === 'Filipino' ? "Biyernes" : "Friday", bold: true, size: 18 })], alignment: AlignmentType.CENTER })],
                    width: { size: 17, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                ],
              }),
              // Competency Row
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: effectiveLanguage === 'Filipino' ? "Kompetensya" : "Competency", bold: true, size: 16 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: dailyPlan.Monday.competency, size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: dailyPlan.Tuesday.competency, size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: dailyPlan.Wednesday.competency, size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: dailyPlan.Thursday.competency, size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: dailyPlan.Friday.competency, size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                ],
              }),
              // References Row
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: effectiveLanguage === 'Filipino' ? "Mungkahing Materyales/Sanggunian" : "Suggested Learning Material/Reference", bold: true, size: 16 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: aiJson?.references?.mon || "", size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: aiJson?.references?.tue || "", size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: aiJson?.references?.wed || "", size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: aiJson?.references?.thu || "", size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: aiJson?.references?.fri || "", size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                ],
              }),
              // Activities Row (Teacher Version - with answer keys)
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: effectiveLanguage === 'Filipino' ? "Mga Gawain/Aktividad sa Pagkatuto" : "Learning Activities/Tasks", bold: true, size: 16 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  isKs1Worksheet
                    ? buildKs1ActivityCell("mon", parseActivityContentWithAnswerKey(aiJson?.activities?.mon || ""))
                    : buildTextActivityCell(parseActivityContentWithAnswerKey(aiJson?.activities?.mon || "")),
                  isKs1Worksheet
                    ? buildKs1ActivityCell("tue", parseActivityContentWithAnswerKey(aiJson?.activities?.tue || ""))
                    : buildTextActivityCell(parseActivityContentWithAnswerKey(aiJson?.activities?.tue || "")),
                  isKs1Worksheet
                    ? buildKs1ActivityCell("wed", parseActivityContentWithAnswerKey(aiJson?.activities?.wed || ""))
                    : buildTextActivityCell(parseActivityContentWithAnswerKey(aiJson?.activities?.wed || "")),
                  isKs1Worksheet
                    ? buildKs1ActivityCell("thu", parseActivityContentWithAnswerKey(aiJson?.activities?.thu || ""))
                    : buildTextActivityCell(parseActivityContentWithAnswerKey(aiJson?.activities?.thu || "")),
                  isKs1Worksheet
                    ? buildKs1ActivityCell("fri", parseActivityContentWithAnswerKey(aiJson?.activities?.fri || ""))
                    : buildTextActivityCell(parseActivityContentWithAnswerKey(aiJson?.activities?.fri || "")),
                ],
              }),
            ],
          }),
        ],
      }],
    });

    const teacherDocxBuffer = await Packer.toBuffer(teacherDoc);

    // Step 5: Generate Student DOCX (Simplified Version without Answer Keys, Expected Output, Contingency)
    console.log("Generating Student version DOCX...");
    const studentDoc = new Document({
      creator: "WeeLMat Generator - Student Version",
      title: `WeeLMat Student - ${subject} - ${gradeLevel} - ${section}`,
      description: `Weekly Learning Matrix for ${subject}, ${gradeLevel}, Section ${section} - Simplified Version`,
      sections: [{
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
            size: { orientation: PageOrientation.LANDSCAPE },
          },
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: effectiveLanguage === 'Filipino' ? "Lingguhang Matris ng Pagkatuto (WeeLMat)" : "Weekly Learning Matrix (WeeLMat)",
                bold: true,
                size: 32,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: effectiveLanguage === 'Filipino' 
                  ? `Asignatura: ${subject} | Antas: ${gradeLevel} | Seksyon: ${section}`
                  : `Subject: ${subject} | Grade Level: ${gradeLevel} | Section: ${section}`,
                size: 24,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: effectiveLanguage === 'Filipino' 
                  ? `Petsa na Nasaklaw: ${dateFrom} hanggang ${dateTo}`
                  : `Covered Dates: ${dateFrom} to ${dateTo}`,
                size: 20,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              // Header Row
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "", bold: true, size: 18 })] })],
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: effectiveLanguage === 'Filipino' ? "Lunes" : "Monday", bold: true, size: 18 })], alignment: AlignmentType.CENTER })],
                    width: { size: 17, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: effectiveLanguage === 'Filipino' ? "Martes" : "Tuesday", bold: true, size: 18 })], alignment: AlignmentType.CENTER })],
                    width: { size: 17, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: effectiveLanguage === 'Filipino' ? "Miyerkules" : "Wednesday", bold: true, size: 18 })], alignment: AlignmentType.CENTER })],
                    width: { size: 17, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: effectiveLanguage === 'Filipino' ? "Huwebes" : "Thursday", bold: true, size: 18 })], alignment: AlignmentType.CENTER })],
                    width: { size: 17, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: effectiveLanguage === 'Filipino' ? "Biyernes" : "Friday", bold: true, size: 18 })], alignment: AlignmentType.CENTER })],
                    width: { size: 17, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                ],
              }),
              // Competency Row
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: effectiveLanguage === 'Filipino' ? "Kompetensya" : "Competency", bold: true, size: 16 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: dailyPlan.Monday.competency, size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: dailyPlan.Tuesday.competency, size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: dailyPlan.Wednesday.competency, size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: dailyPlan.Thursday.competency, size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: dailyPlan.Friday.competency, size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                ],
              }),
              // References Row
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: effectiveLanguage === 'Filipino' ? "Mungkahing Materyales/Sanggunian" : "Suggested Learning Material/Reference", bold: true, size: 16 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: aiJson?.references?.mon || "", size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: aiJson?.references?.tue || "", size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: aiJson?.references?.wed || "", size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: aiJson?.references?.thu || "", size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: aiJson?.references?.fri || "", size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                ],
              }),
              // Activities Row (Student Version - no answer keys, Expected Output, Contingency)
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: effectiveLanguage === 'Filipino' ? "Mga Gawain/Aktividad sa Pagkatuto" : "Learning Activities/Tasks", bold: true, size: 16 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  isKs1Worksheet
                    ? buildKs1ActivityCell("mon", parseActivityContentForStudent(aiJson?.activities?.mon || ""))
                    : buildTextActivityCell(parseActivityContentForStudent(aiJson?.activities?.mon || "")),
                  isKs1Worksheet
                    ? buildKs1ActivityCell("tue", parseActivityContentForStudent(aiJson?.activities?.tue || ""))
                    : buildTextActivityCell(parseActivityContentForStudent(aiJson?.activities?.tue || "")),
                  isKs1Worksheet
                    ? buildKs1ActivityCell("wed", parseActivityContentForStudent(aiJson?.activities?.wed || ""))
                    : buildTextActivityCell(parseActivityContentForStudent(aiJson?.activities?.wed || "")),
                  isKs1Worksheet
                    ? buildKs1ActivityCell("thu", parseActivityContentForStudent(aiJson?.activities?.thu || ""))
                    : buildTextActivityCell(parseActivityContentForStudent(aiJson?.activities?.thu || "")),
                  isKs1Worksheet
                    ? buildKs1ActivityCell("fri", parseActivityContentForStudent(aiJson?.activities?.fri || ""))
                    : buildTextActivityCell(parseActivityContentForStudent(aiJson?.activities?.fri || "")),
                ],
              }),
            ],
          }),
        ],
      }],
    });

    const studentDocxBuffer = await Packer.toBuffer(studentDoc);

    // Step 6: Upload Teacher DOCX to Supabase Storage
    console.log("Uploading Teacher DOCX...");
    const teacherDocxFilename = `weelmat-teacher-${matrixId}.docx`;
    const { error: teacherUploadError } = await supabase.storage
      .from("weelmat")
      .upload(teacherDocxFilename, teacherDocxBuffer, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true,
      });

    if (teacherUploadError) {
      console.error("Teacher DOCX upload error:", teacherUploadError);
      throw new Error("Failed to upload teacher DOCX file");
    }

    const { data: teacherDocxUrlData } = supabase.storage
      .from("weelmat")
      .getPublicUrl(teacherDocxFilename);

    // Step 7: Upload Student DOCX to Supabase Storage
    console.log("Uploading Student DOCX...");
    const studentDocxFilename = `weelmat-student-${matrixId}.docx`;
    const { error: studentUploadError } = await supabase.storage
      .from("weelmat")
      .upload(studentDocxFilename, studentDocxBuffer, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true,
      });

    if (studentUploadError) {
      console.error("Student DOCX upload error:", studentUploadError);
      throw new Error("Failed to upload student DOCX file");
    }

    const { data: studentDocxUrlData } = supabase.storage
      .from("weelmat")
      .getPublicUrl(studentDocxFilename);

    // Step 8: Update database with both file URLs
    const { error: updateError } = await supabase
      .from("weelmat_matrices")
      .update({
        docx_url: teacherDocxUrlData.publicUrl,
        student_docx_url: studentDocxUrlData.publicUrl,
      })
      .eq("id", matrixId);

    if (updateError) {
      console.error("Database update error:", updateError);
    }

    console.log("WeeLMat generation complete. Teacher URL:", teacherDocxUrlData.publicUrl);
    console.log("WeeLMat generation complete. Student URL:", studentDocxUrlData.publicUrl);

    // Return response with both URLs
    return new Response(
      JSON.stringify({
        success: true,
        matrix_id: matrixId,
        ai_json: aiJson,
        docx_url: teacherDocxUrlData.publicUrl,
        student_docx_url: studentDocxUrlData.publicUrl,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in generate-weelmat function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
