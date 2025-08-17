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

    // Validate all daily competencies are provided
    if (!mondayCompetency?.trim() || !tuesdayCompetency?.trim() || !wednesdayCompetency?.trim() || 
        !thursdayCompetency?.trim() || !fridayCompetency?.trim()) {
      return new Response(JSON.stringify({ error: "All daily competencies are required" }), {
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

    // Store exact user competencies (read-only for AI)
    const dailyCompetencies = {
      Monday: mondayCompetency.trim(),
      Tuesday: tuesdayCompetency.trim(),
      Wednesday: wednesdayCompetency.trim(),
      Thursday: thursdayCompetency.trim(),
      Friday: fridayCompetency.trim(),
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

    // Create comprehensive system prompt for AI
    const systemPrompt = `You are an expert DepEd Philippines curriculum specialist creating Weekly Learning Matrix content.

CRITICAL INSTRUCTIONS:
1. NEVER modify or change the competency text provided for each day
2. Generate ONLY References (Row 3) and Learning Activities/Tasks (Row 4) for each day
3. Use each day's specific competency to create relevant content for that day
4. Return ONLY a JSON object with this exact structure - no explanations

Daily Competencies (DO NOT MODIFY THESE):
- Monday: "${dailyCompetencies.Monday}"
- Tuesday: "${dailyCompetencies.Tuesday}"
- Wednesday: "${dailyCompetencies.Wednesday}"
- Thursday: "${dailyCompetencies.Thursday}"
- Friday: "${dailyCompetencies.Friday}"

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

Return EXACTLY this JSON structure with NO additional text:
{
  "competency": {
    "mon": "${dailyCompetencies.Monday}",
    "tue": "${dailyCompetencies.Tuesday}",
    "wed": "${dailyCompetencies.Wednesday}", 
    "thu": "${dailyCompetencies.Thursday}",
    "fri": "${dailyCompetencies.Friday}"
  },
  "references": {
    "mon": "Specific references for Monday's competency",
    "tue": "Specific references for Tuesday's competency",
    "wed": "Specific references for Wednesday's competency",
    "thu": "Specific references for Thursday's competency",
    "fri": "Specific references for Friday's competency"
  },
  "activities": {
    "mon": "Specific learning activities for Monday's competency",
    "tue": "Specific learning activities for Tuesday's competency", 
    "wed": "Specific learning activities for Wednesday's competency",
    "thu": "Specific learning activities for Thursday's competency",
    "fri": "Specific learning activities for Friday's competency"
  }
}

Requirements:
- Each day's references must align with that specific day's competency
- Each day's activities must align with that specific day's competency
- References should include DepEd-aligned materials, textbooks, online resources
- Activities should be grade-appropriate, engaging, and curriculum-aligned
- Use ${effectiveLanguage} language throughout
- Keep responses concise but comprehensive
- Focus on practical, implementable activities`;

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

    // If all AI APIs fail, create a template with exact user competencies
    if (!aiJson) {
      console.log("All AI APIs failed, using template");
      aiJson = {
        competency: {
          mon: dailyCompetencies.Monday,
          tue: dailyCompetencies.Tuesday,
          wed: dailyCompetencies.Wednesday,
          thu: dailyCompetencies.Thursday,
          fri: dailyCompetencies.Friday,
        },
        references: {
          mon: `${subject} textbook, DepEd learning materials, relevant online resources`,
          tue: `${subject} textbook, DepEd learning materials, relevant online resources`,
          wed: `${subject} textbook, DepEd learning materials, relevant online resources`,
          thu: `${subject} textbook, DepEd learning materials, relevant online resources`,
          fri: `${subject} textbook, DepEd learning materials, relevant online resources`,
        },
        activities: {
          mon: `Interactive activities, group work, and assessment aligned with Monday's competency`,
          tue: `Interactive activities, group work, and assessment aligned with Tuesday's competency`,
          wed: `Interactive activities, group work, and assessment aligned with Wednesday's competency`,
          thu: `Interactive activities, group work, and assessment aligned with Thursday's competency`,
          fri: `Interactive activities, group work, and assessment aligned with Friday's competency`,
        },
      };
    }

    // Ensure competencies match exactly what user provided (never trust AI for this)
    aiJson.competency = {
      mon: dailyCompetencies.Monday,
      tue: dailyCompetencies.Tuesday,
      wed: dailyCompetencies.Wednesday,
      thu: dailyCompetencies.Thursday,
      fri: dailyCompetencies.Friday,
    };

    // Step 3: Save to database
    const { data: matrixData, error: insertError } = await supabase
      .from("weelmat_matrices")
      .insert({
        user_id: userId,
        subject,
        grade_level: gradeLevel,
        section,
        date_from: dateFrom,
        date_to: dateTo,
        competency: `Mon: ${dailyCompetencies.Monday}; Tue: ${dailyCompetencies.Tuesday}; Wed: ${dailyCompetencies.Wednesday}; Thu: ${dailyCompetencies.Thursday}; Fri: ${dailyCompetencies.Friday}`,
        code: code || null,
        custom_instructions: customInstructions || null,
        ai_json: aiJson,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      throw new Error("Failed to save matrix data");
    }

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
                    children: [new Paragraph({ children: [new TextRun({ text: dailyCompetencies.Monday, size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: dailyCompetencies.Tuesday, size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: dailyCompetencies.Wednesday, size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: dailyCompetencies.Thursday, size: 14 })] })],
                    borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: dailyCompetencies.Friday, size: 14 })] })],
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