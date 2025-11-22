import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, Packer } from "https://esm.sh/docx@8.2.2";

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

    const { 
      subject, gradeLevel, section, quarter, competencies, 
      multipleChoice, trueFalse, identification, essay, language = "English" 
    } = await req.json();

    console.log("Generating test for:", { subject, gradeLevel, quarter });

    const competencyList = competencies.split("\n").filter((c: string) => c.trim());
    const totalMC = parseInt(multipleChoice) || 0;
    const totalTF = parseInt(trueFalse) || 0;
    const totalID = parseInt(identification) || 0;
    const totalEssay = parseInt(essay) || 0;

    // Generate test content using AI
    const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY");
    let testContent: any = null;

    if (deepseekKey) {
      try {
        const prompt = `Generate a ${quarter} Quarter Periodical Test in ${language} for ${subject} Grade ${gradeLevel}.

Competencies to cover:
${competencyList.join("\n")}

Generate exactly:
- ${totalMC} Multiple Choice questions (with 4 options A-D)
- ${totalTF} True/False questions
- ${totalID} Identification questions
- ${totalEssay} Essay questions

Format as:
PART I: MULTIPLE CHOICE
1. Question text
A. Option A
B. Option B
C. Option C
D. Option D

PART II: TRUE OR FALSE
1. Statement

PART III: IDENTIFICATION
1. Question

PART IV: ESSAY
1. Question

ANSWER KEY:
I. Multiple Choice: 1.A 2.B ...
II. True/False: 1.T 2.F ...
III. Identification: 1.answer 2.answer ...
IV. Essay: (Key points for each)`;

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
          testContent = aiData.choices[0].message.content;
          console.log("AI-generated test received");
        }
      } catch (error) {
        console.error("DeepSeek API error:", error);
      }
    }

    // Fallback: Generate basic test structure
    if (!testContent) {
      let fallbackTest = "";
      
      if (totalMC > 0) {
        fallbackTest += "PART I: MULTIPLE CHOICE\nDirections: Choose the best answer.\n\n";
        for (let i = 1; i <= totalMC; i++) {
          fallbackTest += `${i}. [Question about ${competencyList[i % competencyList.length] || "the topic"}]\n`;
          fallbackTest += "A. Option A\nB. Option B\nC. Option C\nD. Option D\n\n";
        }
      }

      if (totalTF > 0) {
        fallbackTest += "\nPART II: TRUE OR FALSE\nDirections: Write T if true, F if false.\n\n";
        for (let i = 1; i <= totalTF; i++) {
          fallbackTest += `${i}. [Statement about ${competencyList[i % competencyList.length] || "the topic"}]\n`;
        }
      }

      if (totalID > 0) {
        fallbackTest += "\n\nPART III: IDENTIFICATION\nDirections: Identify what is being asked.\n\n";
        for (let i = 1; i <= totalID; i++) {
          fallbackTest += `${i}. [Question about ${competencyList[i % competencyList.length] || "the topic"}]\n`;
        }
      }

      if (totalEssay > 0) {
        fallbackTest += "\n\nPART IV: ESSAY\nDirections: Answer comprehensively.\n\n";
        for (let i = 1; i <= totalEssay; i++) {
          fallbackTest += `${i}. [Essay question about ${competencyList[i % competencyList.length] || "the topic"}]\n\n`;
        }
      }

      fallbackTest += "\n\n--- ANSWER KEY ---\n";
      fallbackTest += "I. Multiple Choice: (to be filled)\n";
      fallbackTest += "II. True/False: (to be filled)\n";
      fallbackTest += "III. Identification: (to be filled)\n";
      fallbackTest += "IV. Essay: (Key points to be filled)\n";

      testContent = fallbackTest;
    }

    // Create TOS Table
    const tosTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: "Competency", bold: true })] }),
            new TableCell({ children: [new Paragraph({ text: "Knowledge", bold: true })] }),
            new TableCell({ children: [new Paragraph({ text: "Comprehension", bold: true })] }),
            new TableCell({ children: [new Paragraph({ text: "Application", bold: true })] }),
            new TableCell({ children: [new Paragraph({ text: "Total", bold: true })] }),
          ],
        }),
        ...competencyList.slice(0, 5).map((comp: string) => 
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(comp.substring(0, 50))] }),
              new TableCell({ children: [new Paragraph("_")] }),
              new TableCell({ children: [new Paragraph("_")] }),
              new TableCell({ children: [new Paragraph("_")] }),
              new TableCell({ children: [new Paragraph("_")] }),
            ],
          })
        ),
      ],
    });

    // Create DOCX document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: `${quarter} QUARTER PERIODICAL TEST`,
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
            spacing: { after: 200 },
          })] : []),
          new Paragraph({
            text: "Name: ________________________  Score: ________",
            spacing: { after: 300 },
          }),
          ...testContent.split("\n").map((line: string) => 
            new Paragraph({
              text: line,
              spacing: { after: 100 },
            })
          ),
          new Paragraph({
            text: "",
            pageBreakBefore: true,
          }),
          new Paragraph({
            text: "TABLE OF SPECIFICATIONS (TOS)",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          tosTable,
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    const filename = `test-${subject.toLowerCase().replace(/\s+/g, "-")}-${quarter}-${Date.now()}.docx`;

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
