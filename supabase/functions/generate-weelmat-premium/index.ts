import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, BorderStyle, ImageRun } from "https://esm.sh/docx@8.2.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEYS_CHATGPT") || "";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
const dayKeys = ["mon", "tue", "wed", "thu", "fri"] as const;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      subject,
      gradeLevel,
      section,
      dateFrom,
      dateTo,
      language = "English",
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
    } = body;

    console.log("Premium WeeLMat generation started for:", { subject, gradeLevel, section });

    // Build competencies and exam info for each day
    const dailyPlans = [
      { day: "Monday", key: "mon", competency: mondayCompetency, examType: mondayExamType, questionCount: mondayQuestionCount },
      { day: "Tuesday", key: "tue", competency: tuesdayCompetency, examType: tuesdayExamType, questionCount: tuesdayQuestionCount },
      { day: "Wednesday", key: "wed", competency: wednesdayCompetency, examType: wednesdayExamType, questionCount: wednesdayQuestionCount },
      { day: "Thursday", key: "thu", competency: thursdayCompetency, examType: thursdayExamType, questionCount: thursdayQuestionCount },
      { day: "Friday", key: "fri", competency: fridayCompetency, examType: fridayExamType, questionCount: fridayQuestionCount },
    ];

    // ==================== STEP 1: Generate Content with OpenAI Latest ====================
    console.log("Calling OpenAI API with latest model...");

    const systemPrompt = `You are an expert curriculum developer for the Philippine K-12 education system. 
Create a Weekly Learning Matrix (WeeLMat) for ${gradeLevel} ${subject} students.
Language: ${language}

For each day, generate:
1. Suggested Learning Materials/References (2-3 specific resources like textbooks, DepEd modules, online resources)
2. Learning Activities/Tasks (practical, engaging activities with real-world examples appropriate for ${gradeLevel})
3. Quiz questions matching the exam type with answer key

Make content age-appropriate, culturally relevant to Filipino students, and aligned with DepEd competencies.
Activities should be hands-on and practical, not just reading/writing tasks.
Include real examples and scenarios Filipino students can relate to.`;

    const userPrompt = `Create content for a Weekly Learning Matrix with these specifications:

Subject: ${subject}
Grade Level: ${gradeLevel}
Date Range: ${dateFrom} to ${dateTo}
Language: ${language}

Daily Plans:
${dailyPlans.map(p => `${p.day}: 
  - Competency: ${p.competency || "HOLIDAY"}
  - Exam Type: ${p.examType || "HOLIDAY"}
  - Question Count: ${p.questionCount || 0}`).join("\n\n")}

Return a JSON object with this exact structure:
{
  "references": {
    "mon": "suggested materials for Monday",
    "tue": "suggested materials for Tuesday",
    "wed": "suggested materials for Wednesday",
    "thu": "suggested materials for Thursday",
    "fri": "suggested materials for Friday"
  },
  "activities": {
    "mon": "learning activities and quiz for Monday with Answer Key",
    "tue": "learning activities and quiz for Tuesday with Answer Key",
    "wed": "learning activities and quiz for Wednesday with Answer Key",
    "thu": "learning activities and quiz for Thursday with Answer Key",
    "fri": "learning activities and quiz for Friday with Answer Key"
  }
}

For HOLIDAY days, use "No classes - Holiday" for both references and activities.
Include practical activities with examples, then quiz questions with choices (A, B, C, D) and Answer Key at the end.`;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-2025-04-14", // Latest OpenAI model
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4000,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("OpenAI API error:", errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    console.log("OpenAI response received");

    let aiJson;
    try {
      const content = openaiData.choices?.[0]?.message?.content || "{}";
      aiJson = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse OpenAI response:", e);
      aiJson = { references: {}, activities: {} };
    }

    // ==================== STEP 2: Generate Picture Quiz Images with Nano Banana 2 ====================
    console.log("Generating picture quiz images with Nano Banana 2...");

    const pictureQuizImages: Record<string, string> = {};

    for (const plan of dailyPlans) {
      if (plan.competency && plan.competency !== "HOLIDAY" && plan.examType !== "HOLIDAY") {
        console.log(`Generating image for ${plan.day}...`);

        const imagePrompt = `Create an educational picture quiz image for ${gradeLevel} Filipino students studying ${subject}.

The image should be a visual question/puzzle related to: "${plan.competency}"

Requirements:
- Age-appropriate for ${gradeLevel} learners
- Clear, colorful, and educational illustration
- Should prompt students to identify, analyze, or answer a question about the visual
- ${subject === "Filipino" ? "Include Filipino cultural elements or Tagalog text if appropriate" : ""}
- ${subject === "Math" ? "Show objects to count, shapes to identify, or visual math problems" : ""}
- ${subject === "Science" ? "Show scientific concepts, nature, experiments, or diagrams" : ""}
- ${subject === "English" ? "Show vocabulary, reading comprehension scenes, or grammar concepts visually" : ""}
- Style: Bright, engaging, cartoon/illustration style appropriate for elementary/junior high students
- Include visual elements that can be used as multiple choice options

Make it look like a professional educational worksheet picture quiz.`;

        try {
          const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-image-preview",
              messages: [{ role: "user", content: imagePrompt }],
              modalities: ["image", "text"],
            }),
          });

          if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            const base64Image = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
            
            if (base64Image) {
              // Upload base64 image to Supabase Storage
              const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
              const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
              
              const imagePath = `${user.id}/premium/${Date.now()}_${plan.key}_quiz.png`;
              const { error: uploadError } = await supabase.storage
                .from("weelmat")
                .upload(imagePath, imageBuffer, { contentType: "image/png" });

              if (!uploadError) {
                const { data: publicUrlData } = supabase.storage
                  .from("weelmat")
                  .getPublicUrl(imagePath);
                
                pictureQuizImages[plan.key] = publicUrlData.publicUrl;
                console.log(`Image uploaded for ${plan.day}: ${publicUrlData.publicUrl}`);
              } else {
                console.error(`Failed to upload image for ${plan.day}:`, uploadError);
              }
            }
          } else {
            console.error(`Image generation failed for ${plan.day}:`, await imageResponse.text());
          }
        } catch (imgErr) {
          console.error(`Image generation error for ${plan.day}:`, imgErr);
        }
      }
    }

    console.log("Picture quiz images generated:", Object.keys(pictureQuizImages));

    // ==================== STEP 3: Build DOCX with Images ====================
    console.log("Building DOCX document with images...");

    // Helper to fetch image as buffer for DOCX
    const fetchImageBuffer = async (url: string): Promise<Uint8Array | null> => {
      try {
        const res = await fetch(url);
        const arrayBuffer = await res.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      } catch (e) {
        console.error("Failed to fetch image:", e);
        return null;
      }
    };

    // Build table rows for DOCX
    const createTableCell = (text: string, bold = false, width = 2000) => {
      return new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text, bold, size: 20 })],
        })],
        width: { size: width, type: WidthType.DXA },
      });
    };

    // Header row
    const headerRow = new TableRow({
      children: [
        createTableCell("", true, 1500),
        ...days.map(day => createTableCell(day, true, 2000)),
      ],
    });

    // Competency row
    const competencyRow = new TableRow({
      children: [
        createTableCell(language === "Filipino" ? "Kompetensya" : "Competency", true, 1500),
        createTableCell(mondayCompetency || "", false, 2000),
        createTableCell(tuesdayCompetency || "", false, 2000),
        createTableCell(wednesdayCompetency || "", false, 2000),
        createTableCell(thursdayCompetency || "", false, 2000),
        createTableCell(fridayCompetency || "", false, 2000),
      ],
    });

    // References row
    const referencesRow = new TableRow({
      children: [
        createTableCell(language === "Filipino" ? "Mungkahing Materyales" : "Suggested Materials", true, 1500),
        ...dayKeys.map(key => createTableCell(aiJson?.references?.[key] || "", false, 2000)),
      ],
    });

    // Activities row
    const activitiesRow = new TableRow({
      children: [
        createTableCell(language === "Filipino" ? "Mga Gawain" : "Learning Activities", true, 1500),
        ...dayKeys.map(key => createTableCell(aiJson?.activities?.[key] || "", false, 2000)),
      ],
    });

    // Picture Quiz row with images
    const pictureQuizCells = [createTableCell(language === "Filipino" ? "Picture Quiz" : "Picture Quiz", true, 1500)];
    
    for (const key of dayKeys) {
      const imageUrl = pictureQuizImages[key];
      if (imageUrl) {
        const imageBuffer = await fetchImageBuffer(imageUrl);
        if (imageBuffer) {
          pictureQuizCells.push(new TableCell({
            children: [new Paragraph({
              children: [
                new ImageRun({
                  data: imageBuffer,
                  transformation: { width: 150, height: 100 },
                  type: "png",
                }),
              ],
              alignment: AlignmentType.CENTER,
            })],
            width: { size: 2000, type: WidthType.DXA },
          }));
        } else {
          pictureQuizCells.push(createTableCell("Image not available", false, 2000));
        }
      } else {
        pictureQuizCells.push(createTableCell("No image", false, 2000));
      }
    }

    const pictureQuizRow = new TableRow({ children: pictureQuizCells });

    // Create teacher version document
    const teacherDoc = new Document({
      sections: [{
        properties: {
          page: {
            size: { width: 15840, height: 12240, orientation: "landscape" as any },
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: "Weekly Learning Matrix (WeeLMat) - PREMIUM", bold: true, size: 28 })],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [new TextRun({ text: `${subject} • ${gradeLevel} • Section ${section}`, size: 22 })],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [new TextRun({ text: `Date: ${dateFrom} to ${dateTo}`, size: 20 })],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ children: [] }),
          new Table({
            rows: [headerRow, competencyRow, referencesRow, activitiesRow, pictureQuizRow],
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
        ],
      }],
    });

    // Create student version (without answer keys)
    const studentActivitiesRow = new TableRow({
      children: [
        createTableCell(language === "Filipino" ? "Mga Gawain" : "Learning Activities", true, 1500),
        ...dayKeys.map(key => {
          let activity = aiJson?.activities?.[key] || "";
          // Remove answer key section from student version
          activity = activity.replace(/Answer Key:[\s\S]*/gi, "").trim();
          activity = activity.replace(/Sagot:[\s\S]*/gi, "").trim();
          return createTableCell(activity, false, 2000);
        }),
      ],
    });

    const studentDoc = new Document({
      sections: [{
        properties: {
          page: {
            size: { width: 15840, height: 12240, orientation: "landscape" as any },
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: "Weekly Learning Matrix (WeeLMat)", bold: true, size: 28 })],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [new TextRun({ text: `${subject} • ${gradeLevel} • Section ${section}`, size: 22 })],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [new TextRun({ text: `Date: ${dateFrom} to ${dateTo}`, size: 20 })],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ children: [] }),
          new Table({
            rows: [headerRow, competencyRow, studentActivitiesRow, pictureQuizRow],
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
        ],
      }],
    });

    // ==================== STEP 4: Upload DOCX Files ====================
    console.log("Uploading DOCX files...");

    const teacherBuffer = await Packer.toBuffer(teacherDoc);
    const studentBuffer = await Packer.toBuffer(studentDoc);

    const timestamp = Date.now();
    const teacherPath = `${user.id}/premium/${timestamp}_teacher.docx`;
    const studentPath = `${user.id}/premium/${timestamp}_student.docx`;

    const { error: teacherUploadError } = await supabase.storage
      .from("weelmat")
      .upload(teacherPath, teacherBuffer, { contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });

    if (teacherUploadError) {
      console.error("Teacher DOCX upload error:", teacherUploadError);
      throw new Error("Failed to upload teacher DOCX");
    }

    const { error: studentUploadError } = await supabase.storage
      .from("weelmat")
      .upload(studentPath, studentBuffer, { contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });

    if (studentUploadError) {
      console.error("Student DOCX upload error:", studentUploadError);
    }

    const { data: teacherUrlData } = supabase.storage.from("weelmat").getPublicUrl(teacherPath);
    const { data: studentUrlData } = supabase.storage.from("weelmat").getPublicUrl(studentPath);

    // ==================== STEP 5: Save to Database ====================
    console.log("Saving to database...");

    const { data: matrixData, error: insertError } = await supabase
      .from("weelmat_matrices")
      .insert({
        user_id: user.id,
        subject,
        grade_level: gradeLevel,
        section,
        date_from: dateFrom,
        date_to: dateTo,
        competency: `${mondayCompetency}|${tuesdayCompetency}|${wednesdayCompetency}|${thursdayCompetency}|${fridayCompetency}`,
        docx_url: teacherUrlData.publicUrl,
        student_docx_url: studentUrlData.publicUrl,
        ai_json: { ...aiJson, pictureQuizImages },
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
    }

    console.log("Premium WeeLMat generation complete!");

    return new Response(JSON.stringify({
      success: true,
      matrix_id: matrixData?.id,
      docx_url: teacherUrlData.publicUrl,
      student_docx_url: studentUrlData.publicUrl,
      ai_json: { ...aiJson, pictureQuizImages },
      picture_quiz_images: pictureQuizImages,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Premium WeeLMat generation error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Generation failed" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
