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
    const requestBody = await req.json();
    
    console.log("Edge function received request:", JSON.stringify(requestBody, null, 2));
    
    const {
      subject,
      gradeLevel,
      section,
      dateFrom,
      dateTo,
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
    const searchQuery = `${subject} ${gradeLevel} learning activities references`.slice(0, 256);

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

    // Create comprehensive system prompt for AI focused on Row 4 generation
    const systemPrompt = `You are an expert DepEd Philippines curriculum specialist creating Weekly Learning Matrix content.

CRITICAL JSON FORMAT REQUIREMENTS:
1. Return ONLY valid JSON - no markdown, explanations, or extra text
2. Use proper JSON escaping for quotes and newlines
3. Escape special characters properly (use \\n for newlines, \\" for quotes)
4. NEVER modify the competency text provided
5. Generate REAL questions - NO placeholders like "Option A, B, C, D"

LANGUAGE REQUIREMENTS:
- Generate ALL content in ${effectiveLanguage}
- Instructions, questions, and activities should be in ${effectiveLanguage}
- Use appropriate educational language for ${gradeLevel} students
- Follow DepEd curriculum standards for ${effectiveLanguage} instruction

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
  }
}`;

    // Step 2: AI Generation with prioritized API calls
    let aiJson: any = null;
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
              max_tokens: 3000,
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
                  
                  // Clean up common formatting issues
                  jsonString = jsonString
                    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
                    .replace(/\n/g, '\\n') // Properly escape newlines
                    .replace(/\r/g, '\\r') // Properly escape carriage returns
                    .replace(/\t/g, '\\t'); // Properly escape tabs
                  
                  console.log("Cleaned JSON string:", jsonString.substring(0, 200) + "...");
                  aiJson = JSON.parse(jsonString);
                  console.log("DeepSeek API successful on attempt", retryCount + 1);
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
        
        // Create real, subject-specific questions based on competency
        const createRealQuestions = () => {
          let questions = "";
          
          for (let i = 1; i <= count; i++) {
            switch (type) {
              case "Multiple Choice":
                if (effectiveLanguage === 'Filipino') {
                  if (subjectLower.includes('filipino')) {
                    questions += `${i}. Ano ang tamang pag-gamit ng pang-uri sa pangungusap?\n   A. Ang magandang bulaklak ay namumulaklak sa hardin.\n   B. Ang bulaklak na maganda ay namumulaklak sa hardin.\n   C. Ang bulaklak ay maganda sa hardin.\n   D. Ang hardin ay may magandang bulaklak.\n\n`;
                  } else if (subjectLower.includes('math')) {
                    questions += `${i}. Ano ang sagot sa 8 × 7?\n   A. 54\n   B. 56\n   C. 58\n   D. 60\n\n`;
                  } else if (subjectLower.includes('science')) {
                    questions += `${i}. Anong bahagi ng halaman ang responsable sa photosynthesis?\n   A. Ugat\n   B. Tangkay\n   C. Dahon\n   D. Bulaklak\n\n`;
                  } else if (subjectLower.includes('epp')) {
                    questions += `${i}. Ano ang pangunahing benepisyo ng pag-aalaga ng manok sa natural na paraan?\n   A. Mas mataas ang gastos sa pagkain\n   B. Mas mababa ang kalidad ng itlog\n   C. Mas masustansyang produkto\n   D. Mas mataas ang mortality rate\n\n`;
                  } else {
                    questions += `${i}. Batay sa kompetensya na "${competency.split(' ').slice(0, 8).join(' ')}", alin ang pinaka-tumpak na pahayag?\n   A. Ang konseptong ito ay saligang-bato sa pag-unawa sa paksa\n   B. Ang kasanayang ito ay nangangailangan ng pagsasanay at paggamit\n   C. Ang kaalamang ito ay nakabase sa nakaraang natutuhan\n   D. Lahat ng nabanggit\n\n`;
                  }
                } else {
                  if (subjectLower.includes('filipino')) {
                    questions += `${i}. What is the correct use of adjectives in a sentence?\n   A. The beautiful flower is blooming in the garden.\n   B. The flower that is beautiful is blooming in the garden.\n   C. The flower is beautiful in the garden.\n   D. The garden has a beautiful flower.\n\n`;
                  } else if (subjectLower.includes('math')) {
                    questions += `${i}. What is the result of 8 × 7?\n   A. 54\n   B. 56\n   C. 58\n   D. 60\n\n`;
                  } else if (subjectLower.includes('science')) {
                    questions += `${i}. Which part of the plant is responsible for photosynthesis?\n   A. Roots\n   B. Stem\n   C. Leaves\n   D. Flowers\n\n`;
                  } else if (subjectLower.includes('epp')) {
                    questions += `${i}. What is the main benefit of caring for chickens naturally?\n   A. Higher feeding costs\n   B. Lower egg quality\n   C. More nutritious products\n   D. Higher mortality rate\n\n`;
                  } else {
                    questions += `${i}. Based on the competency "${competency.split(' ').slice(0, 8).join(' ')}", which statement is most accurate?\n   A. This concept is fundamental to understanding the subject\n   B. This skill requires practice and application\n   C. This knowledge builds on previous learning\n   D. All of the above\n\n`;
                  }
                }
                break;
              case "Identification":
                if (effectiveLanguage === 'Filipino') {
                  if (subjectLower.includes('filipino')) {
                    questions += `${i}. Tukuyin ang uri ng salitang may salungguhit: "Ang MATALINONG bata ay nag-aaral nang mabuti."\n\n`;
                  } else if (subjectLower.includes('math')) {
                    questions += `${i}. Tukuyin ang hugis na may 4 na pantay na gilid at 4 na tamang sulok: _______\n\n`;
                  } else if (subjectLower.includes('science')) {
                    questions += `${i}. Pangalanan ang proseso kung saan ang mga halaman ay gumagawa ng sariling pagkain: _______\n\n`;
                  } else if (subjectLower.includes('epp')) {
                    questions += `${i}. Tukuyin ang tamang paraan ng pag-aalaga ng manok upang manatiling malusog: _______\n\n`;
                  } else {
                    questions += `${i}. Tukuyin ang pangunahing konsepto sa: ${competency.split(' ').slice(0, 6).join(' ')}\n\n`;
                  }
                } else {
                  if (subjectLower.includes('filipino')) {
                    questions += `${i}. Identify the type of underlined word: "The INTELLIGENT child studies well."\n\n`;
                  } else if (subjectLower.includes('math')) {
                    questions += `${i}. Identify the geometric shape with 4 equal sides and 4 right angles: _______\n\n`;
                  } else if (subjectLower.includes('science')) {
                    questions += `${i}. Name the process by which plants make their own food: _______\n\n`;
                  } else if (subjectLower.includes('epp')) {
                    questions += `${i}. Identify the correct way to care for chickens to keep them healthy: _______\n\n`;
                  } else {
                    questions += `${i}. Identify the main concept in: ${competency.split(' ').slice(0, 6).join(' ')}\n\n`;
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
                    questions += `${i}. Ang sumusunod na pahayag tungkol sa "${competency.split(' ').slice(0, 5).join(' ')}" ay tumpak. (Tama/Mali)\n\n`;
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
                    questions += `${i}. The following statement about "${competency.split(' ').slice(0, 5).join(' ')}" is accurate. (True/False)\n\n`;
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
                    questions += `${i}. Ipaliwanag at bigyang-kahulugan ang: ${competency.split(' ').slice(0, 8).join(' ')}\n\n`;
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
                    questions += `${i}. Analyze and explain the significance of: ${competency.split(' ').slice(0, 8).join(' ')}\n\n`;
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
${createRealQuestions()}
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

    // Step 3: Save to database
    console.log("Saving matrix data to database...");
    const { data: matrixData, error: insertError } = await supabase
      .from("weelmat_matrices")
      .insert({
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
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      throw new Error(`Failed to save matrix data: ${insertError.message}`);
    }

    console.log("Matrix data saved successfully:", matrixData);

    const matrixId = matrixData?.id;

    // Step 4: Generate DOCX
    const doc = new Document({
      creator: "WeeLMat Generator",
      title: `WeeLMat - ${subject} - ${gradeLevel} - ${section}`,
      description: `Weekly Learning Matrix for ${subject}, ${gradeLevel}, Section ${section}`,
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
              // Activities Row
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: effectiveLanguage === 'Filipino' ? "Mga Gawain/Aktividad sa Pagkatuto" : "Learning Activities/Tasks", bold: true, size: 16 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: aiJson?.activities?.mon || "", size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: aiJson?.activities?.tue || "", size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: aiJson?.activities?.wed || "", size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: aiJson?.activities?.thu || "", size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: aiJson?.activities?.fri || "", size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                ],
              }),
            ],
          }),
        ],
      }],
    });

    const docxBuffer = await Packer.toBuffer(doc);

    // Step 5: Upload DOCX to Supabase Storage
    const docxFilename = `weelmat-${matrixId}.docx`;
    const { error: docxUploadError } = await supabase.storage
      .from("weelmat")
      .upload(docxFilename, docxBuffer, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true,
      });

    if (docxUploadError) {
      console.error("DOCX upload error:", docxUploadError);
      throw new Error("Failed to upload DOCX file");
    }

    const { data: docxUrlData } = supabase.storage
      .from("weelmat")
      .getPublicUrl(docxFilename);

    // Step 6: Update database with file URLs
    const { error: updateError } = await supabase
      .from("weelmat_matrices")
      .update({
        docx_url: docxUrlData.publicUrl,
      })
      .eq("id", matrixId);

    if (updateError) {
      console.error("Database update error:", updateError);
    }

    // Return response
    return new Response(
      JSON.stringify({
        success: true,
        matrixId,
        ai_json: aiJson,
        docx_url: docxUrlData.publicUrl,
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