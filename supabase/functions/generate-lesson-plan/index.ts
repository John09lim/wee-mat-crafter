import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } from "https://esm.sh/docx@8.2.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { subject, gradeLevel, section, topic, competencies, duration, language = "English" } = await req.json();

    console.log("Generating lesson plan for:", { subject, gradeLevel, topic });

    // Generate lesson plan content using AI
    const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY");
    let lessonPlanContent: any = null;

    if (deepseekKey) {
      try {
        const prompt = `Generate a comprehensive DepEd-formatted lesson plan in ${language} for:
Subject: ${subject}
Grade Level: ${gradeLevel}
Topic: ${topic}
Learning Competencies: ${competencies}
Duration: ${duration || "1 hour"}

Include:
I. Objectives (based on the competencies)
II. Subject Matter (topic, references, materials)
III. Procedures:
   A. Preliminary Activities (prayer, attendance, review)
   B. Motivation (engaging hook/activity)
   C. Presentation/Discussion (main lesson content)
   D. Generalization (key takeaways)
   E. Application (practice activities)
IV. Evaluation (assessment questions)
V. Assignment

Make it practical, engaging, and aligned with DepEd standards.`;

        const aiResponse = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${deepseekKey}`,
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          lessonPlanContent = aiData.choices[0].message.content;
          console.log("AI-generated lesson plan received");
        }
      } catch (error) {
        console.error("DeepSeek API error:", error);
      }
    }

    // Fallback: Generate structured lesson plan
    if (!lessonPlanContent) {
      lessonPlanContent = `I. OBJECTIVES
${competencies}

II. SUBJECT MATTER
Topic: ${topic}
References: [Teacher to specify based on curriculum guide]
Materials: Visual aids, worksheets, board, markers

III. PROCEDURES
A. Preliminary Activities
   - Prayer
   - Checking of Attendance
   - Review of previous lesson

B. Motivation
   Ask students about their prior knowledge of ${topic}. Present a real-world scenario or problem related to the topic.

C. Presentation/Discussion
   1. Introduce the main concepts of ${topic}
   2. Explain key principles and theories
   3. Provide examples and demonstrations
   4. Encourage student participation through questions

D. Generalization
   Summarize the key learning points about ${topic}. Ask students to share their understanding.

E. Application
   Have students solve practice problems or complete activities that apply what they learned about ${topic}.

IV. EVALUATION
Assess student understanding through:
- Oral questions
- Written exercises
- Group activities
- Exit tickets

V. ASSIGNMENT
Prepare exercises or research tasks related to ${topic} for homework.`;
    }

    // Create DOCX document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "LESSON PLAN",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Subject: ", bold: true }),
              new TextRun(subject),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Grade Level: ", bold: true }),
              new TextRun(gradeLevel),
            ],
            spacing: { after: 100 },
          }),
          ...(section ? [new Paragraph({
            children: [
              new TextRun({ text: "Section: ", bold: true }),
              new TextRun(section),
            ],
            spacing: { after: 100 },
          })] : []),
          new Paragraph({
            children: [
              new TextRun({ text: "Topic: ", bold: true }),
              new TextRun(topic),
            ],
            spacing: { after: 100 },
          }),
          ...(duration ? [new Paragraph({
            children: [
              new TextRun({ text: "Duration: ", bold: true }),
              new TextRun(duration),
            ],
            spacing: { after: 200 },
          })] : []),
          ...lessonPlanContent.split("\n").map((line: string) => 
            new Paragraph({
              text: line,
              spacing: { after: 100 },
            })
          ),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    const filename = `lessonplan-${subject.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.docx`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("weelmat")
      .upload(filename, buffer, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from("weelmat").getPublicUrl(filename);

    return new Response(
      JSON.stringify({
        docxUrl: urlData.publicUrl,
        filename,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
