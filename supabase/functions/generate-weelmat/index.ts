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

    // Validate daily fields
    const incompleteDays = dailyFields.filter(day => 
      !day.competency?.toString().trim() || 
      !day.examType?.toString().trim() || 
      !day.questionCount ||
      typeof day.questionCount !== 'number' ||
      day.questionCount < 3 || 
      day.questionCount > 20
    );

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

    // Enhanced validation with detailed error messages
    const missingCompetencies = competencies.map((c, i) => c?.trim() ? null : days[i]).filter(Boolean);
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

    const invalidQuestionCounts = questionCounts.map((q, i) => 
      (!q || q < 3 || q > 20) ? `${days[i]} (${q || 'missing'})` : null
    ).filter(Boolean);
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

CRITICAL INSTRUCTIONS:
1. NEVER modify or change the competency text provided for each day
2. Generate ONLY References (Row 3) and Learning Activities/Tasks (Row 4) for each day
3. For Row 4, create exactly ${dailyPlan.Monday.questionCount} ${dailyPlan.Monday.examType} questions for Monday, ${dailyPlan.Tuesday.questionCount} ${dailyPlan.Tuesday.examType} questions for Tuesday, etc.
4. Return ONLY a JSON object with this exact structure - no explanations

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

Available References:
${curatedSources.map(s => `• ${s.title}: ${s.url} (${s.note})`).join('\n') || 'General DepEd curriculum resources'}

EXAM TYPE FORMATTING RULES (Row 4):
- Identification: Concrete prompts expecting specific terms/phrases
- Matching Type: Two labeled lists (A and B) with clear pairs
- True/False: Declarative statements about the competency; avoid placeholders
- Multiple Choice: Stem + A–D realistic options; mark the correct answer
- Essay: Distinct prompts with focus/criteria
- Performance Task: Scenario + expected product + short criteria/rubric
- Other: Short-response items tied to the competency

ROW 4 FORMAT PER DAY:
Instructions/Directions: [One concise paragraph tied to the competency and exam type]

Quiz:
1. [First question based on exam type]
2. [Second question based on exam type]
...
N. [Nth question where N = question_count]

Expected Output: [Optional brief description]
Contingency: [Optional backup plan]

Return EXACTLY this JSON structure with NO additional text:
{
  "competency": {
    "mon": "${dailyPlan.Monday.competency}",
    "tue": "${dailyPlan.Tuesday.competency}",
    "wed": "${dailyPlan.Wednesday.competency}", 
    "thu": "${dailyPlan.Thursday.competency}",
    "fri": "${dailyPlan.Friday.competency}"
  },
  "references": {
    "mon": "Specific DepEd-aligned references for Monday's competency",
    "tue": "Specific DepEd-aligned references for Tuesday's competency",
    "wed": "Specific DepEd-aligned references for Wednesday's competency",
    "thu": "Specific DepEd-aligned references for Thursday's competency",
    "fri": "Specific DepEd-aligned references for Friday's competency"
  },
  "activities": {
    "mon": "Learning Activities/Tasks for Monday formatted as described above",
    "tue": "Learning Activities/Tasks for Tuesday formatted as described above", 
    "wed": "Learning Activities/Tasks for Wednesday formatted as described above",
    "thu": "Learning Activities/Tasks for Thursday formatted as described above",
    "fri": "Learning Activities/Tasks for Friday formatted as described above"
  }
}

Requirements:
- Use ${effectiveLanguage} language throughout
- No placeholders like [statement] or generic terms
- Real, domain-specific content based on subject and grade level
- Exact question count per day as specified
- Professional exam formatting with proper structure`;

    // Step 2: AI Generation with prioritized API calls
    let aiJson: any = null;
    let aiError: string | null = null;

    // Try DeepSeek first (cost-effective)
    if (DEEPSEEK_API_KEY && !aiJson) {
      try {
        console.log("Trying DeepSeek API...");
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
              { role: "user", content: "Generate the weekly learning matrix content following the exact format specified." }
            ],
            temperature: 0.7,
            max_tokens: 2000,
          }),
        });

        if (deepSeekRes.ok) {
          const deepSeekData = await deepSeekRes.json();
          const content = deepSeekData.choices?.[0]?.message?.content?.trim();
          if (content) {
            try {
              // Clean the content to extract JSON
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                aiJson = JSON.parse(jsonMatch[0]);
                console.log("DeepSeek API successful");
              }
            } catch (parseError) {
              console.error("DeepSeek JSON parse error:", parseError);
            }
          }
        } else {
          console.error("DeepSeek API failed:", await deepSeekRes.text());
        }
      } catch (error) {
        console.error("DeepSeek API error:", error);
      }
    }

    // Try OpenRouter as fallback
    if (OPENROUTER_API_KEY && !aiJson) {
      try {
        console.log("Trying OpenRouter API...");
        const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "anthropic/claude-3.5-haiku",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: "Generate the weekly learning matrix content following the exact format specified." }
            ],
            temperature: 0.7,
            max_tokens: 2000,
          }),
        });

        if (openRouterRes.ok) {
          const openRouterData = await openRouterRes.json();
          const content = openRouterData.choices?.[0]?.message?.content?.trim();
          if (content) {
            try {
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                aiJson = JSON.parse(jsonMatch[0]);
                console.log("OpenRouter API successful");
              }
            } catch (parseError) {
              console.error("OpenRouter JSON parse error:", parseError);
            }
          }
        } else {
          console.error("OpenRouter API failed:", await openRouterRes.text());
        }
      } catch (error) {
        console.error("OpenRouter API error:", error);
      }
    }

    // Try OpenAI as final fallback
    if (OPENAI_API_KEY && !aiJson) {
      try {
        console.log("Trying OpenAI API...");
        const openAIRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: "Generate the weekly learning matrix content following the exact format specified." }
            ],
            temperature: 0.7,
            max_tokens: 2000,
          }),
        });

        if (openAIRes.ok) {
          const openAIData = await openAIRes.json();
          const content = openAIData.choices?.[0]?.message?.content?.trim();
          if (content) {
            try {
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                aiJson = JSON.parse(jsonMatch[0]);
                console.log("OpenAI API successful");
              }
            } catch (parseError) {
              console.error("OpenAI JSON parse error:", parseError);
            }
          }
        } else {
          console.error("OpenAI API failed:", await openAIRes.text());
        }
      } catch (error) {
        console.error("OpenAI API error:", error);
      }
    }

    // If all AI APIs fail, create a template with exact user inputs
    if (!aiJson) {
      console.log("All AI APIs failed, using template");
      const generateTemplateActivities = (day: string, plan: any) => {
        const count = plan.questionCount;
        const type = plan.examType;
        let questions = "";
        
        for (let i = 1; i <= count; i++) {
          switch (type) {
            case "Multiple Choice":
              questions += `${i}. What is the main concept in ${plan.competency.split(' ').slice(0, 3).join(' ')}?\n   A. Option A\n   B. Option B\n   C. Option C\n   D. Option D\n\n`;
              break;
            case "True/False":
              questions += `${i}. ${plan.competency.split('.')[0]} is an important learning objective. (True/False)\n\n`;
              break;
            case "Identification":
              questions += `${i}. Identify the key term that relates to: ${plan.competency.split(' ').slice(0, 5).join(' ')}\n\n`;
              break;
            case "Essay":
              questions += `${i}. Explain how you would apply the competency: ${plan.competency.slice(0, 100)}...\n\n`;
              break;
            default:
              questions += `${i}. Create a task related to: ${plan.competency.split(' ').slice(0, 5).join(' ')}\n\n`;
          }
        }
        
        return `Instructions/Directions: Complete the following ${type.toLowerCase()} assessment based on ${day}'s competency.\n\nQuiz:\n${questions}Expected Output: Completed assessment demonstrating understanding of the competency.\nContingency: Review materials and attempt again if needed.`;
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
          mon: `${subject} textbook, DepEd learning materials, K-12 curriculum guides`,
          tue: `${subject} textbook, DepEd learning materials, K-12 curriculum guides`,
          wed: `${subject} textbook, DepEd learning materials, K-12 curriculum guides`,
          thu: `${subject} textbook, DepEd learning materials, K-12 curriculum guides`,
          fri: `${subject} textbook, DepEd learning materials, K-12 curriculum guides`,
        },
        activities: {
          mon: generateTemplateActivities("Monday", dailyPlan.Monday),
          tue: generateTemplateActivities("Tuesday", dailyPlan.Tuesday),
          wed: generateTemplateActivities("Wednesday", dailyPlan.Wednesday),
          thu: generateTemplateActivities("Thursday", dailyPlan.Thursday),
          fri: generateTemplateActivities("Friday", dailyPlan.Friday),
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
                text: "Weekly Learning Matrix (WeeLMat)",
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
                text: `Subject: ${subject} | Grade Level: ${gradeLevel} | Section: ${section}`,
                size: 24,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Covered Dates: ${dateFrom} to ${dateTo}`,
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
                    children: [new Paragraph({ children: [new TextRun({ text: "Monday", bold: true, size: 18 })], alignment: AlignmentType.CENTER })],
                    width: { size: 17, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Tuesday", bold: true, size: 18 })], alignment: AlignmentType.CENTER })],
                    width: { size: 17, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Wednesday", bold: true, size: 18 })], alignment: AlignmentType.CENTER })],
                    width: { size: 17, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Thursday", bold: true, size: 18 })], alignment: AlignmentType.CENTER })],
                    width: { size: 17, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Friday", bold: true, size: 18 })], alignment: AlignmentType.CENTER })],
                    width: { size: 17, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                ],
              }),
              // Competency Row
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Competency", bold: true, size: 16 })] })],
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
                    children: [new Paragraph({ children: [new TextRun({ text: "Suggested Learning Material/Reference", bold: true, size: 16 })] })],
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
                    children: [new Paragraph({ children: [new TextRun({ text: "Learning Activities/Tasks", bold: true, size: 16 })] })],
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