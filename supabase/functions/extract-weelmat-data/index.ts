import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileData, fileType, fileName, subject, gradeLevel, language } = await req.json();

    console.log("Received file extraction request:", {
      fileType,
      fileName,
      subject,
      gradeLevel,
      language
    });

    // Extract text from file
    let extractedText = "";
    
    if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
        fileType === "application/msword") {
      // For DOCX/DOC files, use OCR/Vision API
      try {
        extractedText = await extractDocumentText(fileData, "DOCX");
      } catch (err) {
        console.error("DOCX extraction failed:", err);
        throw new Error("Unable to extract text from DOCX file. Please try converting to PDF or image format.");
      }
    } else if (fileType === "application/pdf") {
      // For PDF files, use OCR fallback
      try {
        extractedText = await extractDocumentText(fileData, "PDF");
      } catch (err) {
        console.error("PDF/OCR extraction failed:", err);
        throw new Error("Unable to extract text from PDF. Please ensure the PDF contains readable text or try an image format.");
      }
    } else if (fileType.startsWith("image/")) {
      extractedText = await extractImageText(fileData);
    } else {
      throw new Error("Unsupported file type");
    }

    console.log("Extracted text length:", extractedText.length);
    console.log("Extracted text preview:", extractedText.slice(0, 500));

    // Use AI to parse extracted text into structured WeeLMat data
    const aiPrompt = `You are a DepEd curriculum expert. Extract weekly learning plan data from the following text.

TEXT:
${extractedText}

CONTEXT:
- Subject: ${subject}
- Grade Level: ${gradeLevel}
- Language: ${language}

Extract and return ONLY valid JSON in this exact format:
{
  "dailyPlan": {
    "Monday": {
      "competency": "extracted competency text",
      "examType": "Multiple Choice|Identification|Essay|True/False|Matching Type|Performance Task",
      "questionCount": 10
    },
    "Tuesday": { ... },
    "Wednesday": { ... },
    "Thursday": { ... },
    "Friday": { ... }
  }
}

RULES:
- Extract actual competencies/learning objectives from the text
- Look for day-specific sections (Monday, Day 1, etc.)
- Infer appropriate exam types based on content:
  * "identify", "recognize", "name" → Identification
  * "choose", "select" → Multiple Choice
  * "explain", "discuss", "describe" → Essay
  * "true or false", "yes or no" → True/False
  * "match", "pair" → Matching Type
  * "demonstrate", "perform", "create" → Performance Task
- Default to 10 questions if not specified
- If a day is missing, use "No specific competency mentioned" and "Multiple Choice"
- Return ONLY the JSON object, no markdown formatting or extra text`;

    const aiResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "You are a JSON extraction expert for educational content. Return ONLY valid JSON without any markdown formatting." },
          { role: "user", content: aiPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("DeepSeek API error:", errorText);
      throw new Error("AI parsing failed");
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "{}";
    
    console.log("Raw AI response:", aiContent);
    
    // Parse AI response - remove markdown if present
    const cleanedJson = aiContent
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    
    let parsedData;
    try {
      parsedData = JSON.parse(cleanedJson);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Cleaned JSON:", cleanedJson);
      throw new Error("Failed to parse AI response into valid JSON");
    }

    // Validate structure
    if (!parsedData.dailyPlan) {
      throw new Error("AI response missing dailyPlan structure");
    }

    return new Response(
      JSON.stringify({
        success: true,
        dailyPlan: parsedData.dailyPlan,
        extractedTextPreview: extractedText.slice(0, 500)
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("File extraction error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to extract data from file"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

async function extractImageText(base64Data: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract ALL text from this image. Focus on finding daily learning plans, competencies, objectives, or lesson content. Return only the extracted text, no explanations or formatting."
            },
            {
              type: "image_url",
              image_url: { url: base64Data }
            }
          ]
        }
      ],
      max_tokens: 4000
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI Vision API error:", errorText);
    throw new Error("OCR extraction failed");
  }

  const data = await response.json();
  const extractedText = data.choices?.[0]?.message?.content || "";
  
  if (!extractedText || extractedText.length < 10) {
    throw new Error("No text could be extracted from the image");
  }
  
  return extractedText;
}

async function extractDocumentText(base64Data: string, docType: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `This is a ${docType} document containing a lesson plan or curriculum guide. Extract ALL text content from it, focusing on daily learning plans, competencies, objectives, or lesson content for Monday through Friday. Return only the extracted text, preserving the structure and day labels.`
            },
            {
              type: "image_url",
              image_url: { url: base64Data }
            }
          ]
        }
      ],
      max_tokens: 4000
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI Document API error:", errorText);
    throw new Error(`${docType} extraction failed`);
  }

  const data = await response.json();
  const extractedText = data.choices?.[0]?.message?.content || "";
  
  if (!extractedText || extractedText.length < 10) {
    throw new Error(`No text could be extracted from the ${docType} file`);
  }
  
  return extractedText;
}
