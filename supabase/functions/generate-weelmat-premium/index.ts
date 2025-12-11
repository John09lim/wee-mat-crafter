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

    // ==================== STEP 1: Generate References and Answer Keys with OpenAI ====================
    console.log("Calling OpenAI API for references and answer keys...");

    const systemPrompt = `You are an expert curriculum developer for the Philippine K-12 education system.
Generate ONLY the following for each day:
1. Suggested Learning Materials/References (2-3 specific resources)
2. The correct answer (A, B, C, or D) for the picture quiz question

The picture quiz will be an IMAGE with a visual question and 4 choices embedded in the image.
You only need to provide the answer key letter.`;

    const userPrompt = `Create references and answer keys for a Weekly Learning Matrix:

Subject: ${subject}
Grade Level: ${gradeLevel}
Language: ${language}

Daily Plans:
${dailyPlans.map(p => `${p.day}: 
  - Competency: ${p.competency || "HOLIDAY"}
  - Exam Type: ${p.examType || "HOLIDAY"}`).join("\n\n")}

Return a JSON object with this exact structure:
{
  "references": {
    "mon": "suggested materials for Monday (2-3 specific DepEd resources, textbooks, or modules)",
    "tue": "suggested materials for Tuesday",
    "wed": "suggested materials for Wednesday",
    "thu": "suggested materials for Thursday",
    "fri": "suggested materials for Friday"
  },
  "answerKeys": {
    "mon": "B",
    "tue": "C",
    "wed": "A",
    "thu": "D",
    "fri": "B"
  }
}

For HOLIDAY days, use "No classes - Holiday" for references and "-" for answer.`;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-2025-04-14",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 2000,
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

    let aiJson: { references: Record<string, string>; answerKeys: Record<string, string> };
    try {
      const content = openaiData.choices?.[0]?.message?.content || "{}";
      aiJson = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse OpenAI response:", e);
      aiJson = { references: {}, answerKeys: {} };
    }

    // ==================== STEP 2: Generate Image-Based Questions with Nano Banana 2 ====================
    console.log("Generating IMAGE-BASED learning activities with Nano Banana 2...");

    const imageQuestions: Record<string, string> = {};

    for (const plan of dailyPlans) {
      if (plan.competency && plan.competency !== "HOLIDAY" && plan.examType !== "HOLIDAY") {
        console.log(`Generating image question for ${plan.day}...`);

        // Get the answer key for this day to include in the image
        const correctAnswer = aiJson?.answerKeys?.[plan.key] || "B";

        // Create a detailed prompt for an educational image WITH embedded question and choices
        const imagePrompt = `Create an EDUCATIONAL PICTURE QUIZ IMAGE for ${gradeLevel} Filipino students studying ${subject}.

REQUIREMENTS - THE IMAGE MUST CONTAIN ALL OF THIS:
1. A colorful educational illustration/visual related to: "${plan.competency}"
2. A QUESTION TEXT clearly displayed on the image (in ${language === "Filipino" ? "Tagalog" : "English"})
3. FOUR MULTIPLE CHOICE OPTIONS (A, B, C, D) displayed clearly on the image

LAYOUT:
- Top: The illustration/visual (takes up ~60% of the image)
- Middle: The question text in a clear box or banner
- Bottom: Four answer choices labeled A, B, C, D in a row or 2x2 grid

STYLE GUIDELINES:
- ${gradeLevel.includes("1") || gradeLevel.includes("2") || gradeLevel.includes("3") ? "Use simple, large, cartoon-style graphics with big text for young learners" : ""}
- ${gradeLevel.includes("4") || gradeLevel.includes("5") || gradeLevel.includes("6") ? "Use clear educational diagrams with medium-sized text" : ""}
- ${gradeLevel.includes("7") || gradeLevel.includes("8") || gradeLevel.includes("9") || gradeLevel.includes("10") ? "Use detailed educational visuals with standard text" : ""}
- Bright, engaging colors appropriate for Filipino classrooms
- ${subject === "Filipino" ? "Include Filipino cultural elements, use Tagalog for all text" : ""}
- ${subject === "Math" ? "Show numbers, shapes, counting objects, or visual math problems" : ""}
- ${subject === "Science" ? "Show scientific diagrams, nature scenes, or experiment illustrations" : ""}
- ${subject === "English" ? "Show vocabulary pictures, reading scenes, or grammar concepts" : ""}
- ${subject === "Araling Panlipunan" || subject === "AP" ? "Show Philippine maps, historical scenes, or cultural elements" : ""}
- ${subject === "MAPEH" ? "Show musical instruments, sports activities, health concepts, or art elements" : ""}

Make it look like a professional educational worksheet picture quiz that students can answer by looking at it.
The correct answer is ${correctAnswer}.`;

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
              
              const imagePath = `${user.id}/premium/${Date.now()}_${plan.key}_question.png`;
              const { error: uploadError } = await supabase.storage
                .from("weelmat")
                .upload(imagePath, imageBuffer, { contentType: "image/png" });

              if (!uploadError) {
                const { data: publicUrlData } = supabase.storage
                  .from("weelmat")
                  .getPublicUrl(imagePath);
                
                imageQuestions[plan.key] = publicUrlData.publicUrl;
                console.log(`Image question uploaded for ${plan.day}: ${publicUrlData.publicUrl}`);
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

    console.log("Image-based questions generated:", Object.keys(imageQuestions));

    // ==================== STEP 3: Build DOCX with Image-Based Learning Activities ====================
    console.log("Building DOCX document with image-based activities...");

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

    // Build table cells
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

    // Learning Activities row with IMAGES (this is now the main activity - image-based questions)
    const learningActivitiesCells = [
      createTableCell(language === "Filipino" ? "Mga Gawain (Picture Quiz)" : "Learning Activities (Picture Quiz)", true, 1500)
    ];
    
    for (const key of dayKeys) {
      const imageUrl = imageQuestions[key];
      if (imageUrl) {
        const imageBuffer = await fetchImageBuffer(imageUrl);
        if (imageBuffer) {
          learningActivitiesCells.push(new TableCell({
            children: [new Paragraph({
              children: [
                new ImageRun({
                  data: imageBuffer,
                  transformation: { width: 200, height: 150 },
                  type: "png",
                }),
              ],
              alignment: AlignmentType.CENTER,
            })],
            width: { size: 2000, type: WidthType.DXA },
          }));
        } else {
          learningActivitiesCells.push(createTableCell("Image not available", false, 2000));
        }
      } else {
        const plan = dailyPlans.find(p => p.key === key);
        if (plan?.competency === "HOLIDAY" || plan?.examType === "HOLIDAY") {
          learningActivitiesCells.push(createTableCell("No classes - Holiday", false, 2000));
        } else {
          learningActivitiesCells.push(createTableCell("No image", false, 2000));
        }
      }
    }

    const learningActivitiesRow = new TableRow({ children: learningActivitiesCells });

    // Answer Key row (TEACHER VERSION ONLY)
    const answerKeyRow = new TableRow({
      children: [
        createTableCell(language === "Filipino" ? "Sagot" : "Answer Key", true, 1500),
        ...dayKeys.map(key => createTableCell(aiJson?.answerKeys?.[key] || "-", true, 2000)),
      ],
    });

    // Create teacher version document (includes answer key)
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
            children: [new TextRun({ text: "TEACHER VERSION WITH ANSWER KEY", bold: true, size: 20, color: "FF0000" })],
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
            rows: [headerRow, competencyRow, referencesRow, learningActivitiesRow, answerKeyRow],
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
        ],
      }],
    });

    // Create student version document (NO answer key, NO references)
    // Rebuild rows for student version since we can't reuse the same TableRow objects
    const studentHeaderRow = new TableRow({
      children: [
        createTableCell("", true, 1500),
        ...days.map(day => createTableCell(day, true, 2000)),
      ],
    });

    const studentCompetencyRow = new TableRow({
      children: [
        createTableCell(language === "Filipino" ? "Kompetensya" : "Competency", true, 1500),
        createTableCell(mondayCompetency || "", false, 2000),
        createTableCell(tuesdayCompetency || "", false, 2000),
        createTableCell(wednesdayCompetency || "", false, 2000),
        createTableCell(thursdayCompetency || "", false, 2000),
        createTableCell(fridayCompetency || "", false, 2000),
      ],
    });

    // Student Learning Activities row with IMAGES
    const studentLearningActivitiesCells = [
      createTableCell(language === "Filipino" ? "Mga Gawain (Picture Quiz)" : "Learning Activities (Picture Quiz)", true, 1500)
    ];
    
    for (const key of dayKeys) {
      const imageUrl = imageQuestions[key];
      if (imageUrl) {
        const imageBuffer = await fetchImageBuffer(imageUrl);
        if (imageBuffer) {
          studentLearningActivitiesCells.push(new TableCell({
            children: [new Paragraph({
              children: [
                new ImageRun({
                  data: imageBuffer,
                  transformation: { width: 200, height: 150 },
                  type: "png",
                }),
              ],
              alignment: AlignmentType.CENTER,
            })],
            width: { size: 2000, type: WidthType.DXA },
          }));
        } else {
          studentLearningActivitiesCells.push(createTableCell("Image not available", false, 2000));
        }
      } else {
        const plan = dailyPlans.find(p => p.key === key);
        if (plan?.competency === "HOLIDAY" || plan?.examType === "HOLIDAY") {
          studentLearningActivitiesCells.push(createTableCell("No classes - Holiday", false, 2000));
        } else {
          studentLearningActivitiesCells.push(createTableCell("No image", false, 2000));
        }
      }
    }

    const studentLearningActivitiesRow = new TableRow({ children: studentLearningActivitiesCells });

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
            rows: [studentHeaderRow, studentCompetencyRow, studentLearningActivitiesRow],
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
        competency: `${mondayCompetency || ""} | ${tuesdayCompetency || ""} | ${wednesdayCompetency || ""} | ${thursdayCompetency || ""} | ${fridayCompetency || ""}`,
        docx_url: teacherUrlData.publicUrl,
        student_docx_url: studentUrlData.publicUrl,
        ai_json: {
          references: aiJson?.references || {},
          answerKeys: aiJson?.answerKeys || {},
          imageQuestions,
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
    }

    console.log("Premium WeeLMat generation completed successfully!");

    return new Response(
      JSON.stringify({
        success: true,
        matrix_id: matrixData?.id,
        docx_url: teacherUrlData.publicUrl,
        student_docx_url: studentUrlData.publicUrl,
        ai_json: {
          references: aiJson?.references || {},
          answerKeys: aiJson?.answerKeys || {},
        },
        picture_quiz_images: imageQuestions,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Premium WeeLMat generation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Generation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
