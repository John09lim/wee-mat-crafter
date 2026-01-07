import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { unzipSync, strFromU8 } from "https://esm.sh/fflate@0.8.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEYS");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileData, fileType, fileName, subject, gradeLevel, language, section, weekStart, weekEnd } = await req.json();

    console.log("Received file extraction request:", {
      fileType,
      fileName,
      fileSize: fileData ? fileData.length : 0,
      subject,
      gradeLevel,
      language,
      section,
      weekStart,
      weekEnd
    });

    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }

    // Extract text from file
    let extractedText = "";
    
    if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
        fileType === "application/msword") {
      try {
        extractedText = await extractDocxText(fileData);
      } catch (err) {
        console.error("DOCX extraction failed:", err);
        return new Response(JSON.stringify({
          success: false,
          error: "This DOCX file couldn't be read. Please try a simpler document or use manual mode.",
          canRetry: true
        }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } else if (fileType === "application/pdf") {
      try {
        extractedText = await extractPdfText(fileData);
      } catch (err) {
        console.error("PDF extraction failed:", err);
        return new Response(JSON.stringify({
          success: false,
          error: "Couldn't extract text from this PDF. It may be image-based (scanned). Try: 1) Taking screenshots of the pages and uploading as images, 2) Converting to DOCX, or 3) Using manual mode.",
          canRetry: true
        }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } else if (fileType.startsWith("image/")) {
      try {
        extractedText = await extractImageText(fileData);
      } catch (err) {
        console.error("Image extraction failed:", err);
        return new Response(JSON.stringify({
          success: false,
          error: "Couldn't read text from this image. Please try a clearer photo or different format.",
          canRetry: true
        }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: "Unsupported file type. Please upload DOCX, PDF, or Image files only.",
        canRetry: false
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log("Extracted text length:", extractedText.length);
    console.log("Extracted text preview:", extractedText.slice(0, 500));

    // Use OpenAI to parse extracted text into structured WeeLMat data
    const systemPrompt = `You are an assistant that reads teacher-provided learning materials and generates Weekly Learning Matrix (WeeLMat) content. Use only the extracted text from the uploaded file plus the metadata. Do not hallucinate content that conflicts with the text.`;

    const userPrompt = `Here is the extracted lesson text from the uploaded file:

<EXTRACTED_TEXT>
${extractedText}
</EXTRACTED_TEXT>

Subject Area: ${subject}
Grade Level: ${gradeLevel}
Language Use: ${language}
Section: ${section || "N/A"}
Week Coverage: ${weekStart || "N/A"} to ${weekEnd || "N/A"}

TASK:
1. Identify or infer the main weekly competency from the text (aligned to the grade level and subject)
2. For each day Monday to Friday, propose:
   - Competency (daily variation or weekly competency)
   - Suggested Learning Materials/References (DepEd-aligned materials when needed, include online references and textbook pages)
   - Learning Activities/Tasks (concrete assessment tasks and questions aligned to the extracted text)
   - Exam Type (Multiple Choice, Identification, Essay, True/False, Matching Type, Performance Task)
   - Question Count (5-15)

Output in this exact JSON format:
{
  "weekCompetency": "Overall weekly competency description",
  "days": {
    "Monday": {
      "competency": "Monday's specific competency",
      "suggestedMaterials": ["LM pages 10-15", "Reference 1", "Online resource"],
      "learningTasks": "Detailed learning activities text with real assessment tasks...",
      "examType": "Multiple Choice",
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
- Language rule: If Language Use is Filipino, write all content in Filipino; otherwise write in English
- Keep the content concrete, classroom-ready, and tied to the uploaded material
- Return ONLY the JSON object, no markdown formatting or extra text`;

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("OpenAI API error:", errorText);
      return new Response(JSON.stringify({
        success: false,
        error: "AI service temporarily unavailable. Please try again or use manual mode.",
        canRetry: true
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
      return new Response(JSON.stringify({
        success: false,
        error: "Failed to parse AI response. Please try again or use manual mode.",
        canRetry: true
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate structure
    if (!parsedData.days || !parsedData.weekCompetency) {
      console.error("Invalid AI response structure:", parsedData);
      return new Response(JSON.stringify({
        success: false,
        error: "AI generated invalid response. Please try again or use manual mode.",
        canRetry: true
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(
      JSON.stringify({
        success: true,
        weekCompetency: parsedData.weekCompetency,
        days: parsedData.days,
        extractedText: extractedText
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("File extraction error:", error);
    
    let userMessage = "We couldn't auto-read this file. Please try manual mode or upload a different file.";
    
    if (error instanceof Error) {
      if (error.message.includes("API") || error.message.includes("fetch")) {
        userMessage = "AI service temporarily unavailable. Please try again or use manual mode.";
      } else if (error.message.includes("key")) {
        userMessage = "System configuration error. Please contact support.";
      }
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: userMessage,
        canRetry: true
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

// Extract text from images using OpenAI Vision API
async function extractImageText(base64Data: string): Promise<string> {
  console.log("Extracting text from image using OpenAI Vision API...");
  
  // Ensure proper data URL format
  let imageUrl = base64Data;
  if (!base64Data.startsWith('data:')) {
    // Add proper prefix if missing
    imageUrl = `data:image/jpeg;base64,${base64Data}`;
    console.log("Added data URL prefix to image");
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
              text: "Extract ALL text from this image. Focus on finding: lesson plans, competencies, learning objectives, daily activities, questions, and educational content. Preserve the structure and formatting. Return only the extracted text, no explanations."
            },
            {
              type: "image_url",
              image_url: { url: imageUrl }
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
  
  console.log(`Extracted ${extractedText.length} characters from image via OpenAI Vision`);
  
  if (!extractedText || extractedText.length < 10) {
    throw new Error("No text could be extracted from the image");
  }
  
  return extractedText;
}

// Extract text from DOCX files using pure JavaScript (no file system)
async function extractDocxText(base64Data: string): Promise<string> {
  try {
    // 1. Decode base64 to binary
    const base64Clean = base64Data.replace(/^data:.*?;base64,/, "");
    const binaryString = atob(base64Clean);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    console.log("DOCX file size:", bytes.length, "bytes");

    // 2. Use fflate (pure JS, no file system) to unzip
    const unzipped = unzipSync(bytes);
    
    // 3. Read word/document.xml
    const documentXml = unzipped['word/document.xml'];
    
    if (!documentXml) {
      throw new Error("Invalid DOCX: word/document.xml not found");
    }
    
    const xmlContent = strFromU8(documentXml);
    console.log("document.xml size:", xmlContent.length, "characters");

    // 4. Extract text from <w:t> tags
    const textMatches = xmlContent.match(/<w:t[^>]*>(.*?)<\/w:t>/gs) || [];
    const extractedText = textMatches
      .map(match => match.replace(/<[^>]+>/g, ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    console.log("Extracted text length:", extractedText.length);

    if (!extractedText || extractedText.length < 10) {
      throw new Error("No readable text found in DOCX file");
    }

    return extractedText;
  } catch (error) {
    console.error("DOCX parsing error:", error);
    throw error;
  }
}

// Extract text from PDF files using OpenAI Vision API (handles both text and image-based PDFs)
async function extractPdfText(base64Data: string): Promise<string> {
  console.log("Extracting text from PDF using OpenAI Vision API...");
  
  try {
    // Ensure proper data URL format for PDF
    let pdfUrl = base64Data;
    if (!base64Data.startsWith('data:')) {
      pdfUrl = `data:application/pdf;base64,${base64Data}`;
      console.log("Added data URL prefix to PDF");
    }
    
    // Use OpenAI Vision API which can read PDF content
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
                text: `Extract ALL text from this PDF document. This is a teacher's learning material document. 
                
Focus on finding and extracting:
- Lesson plans and competencies
- Learning objectives for each day (Monday through Friday)
- Daily activities and tasks
- Assessment questions and exam items
- Educational content and instructions
- Weekly themes or topics

Preserve the structure and formatting as much as possible. Include day labels (Monday, Tuesday, etc.) or day numbers (Day 1, Day 2, etc.) if present.

Return ONLY the extracted text content, no explanations or summaries.`
              },
              {
                type: "file",
                file: {
                  url: pdfUrl
                }
              }
            ]
          }
        ],
        max_tokens: 16000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error for PDF:", errorText);
      throw new Error("PDF extraction via OpenAI failed");
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content || "";
    
    console.log(`Extracted ${extractedText.length} characters from PDF via OpenAI Vision`);
    
    if (!extractedText || extractedText.length < 10) {
      throw new Error("No text could be extracted from the PDF");
    }
    
    return extractedText;
  } catch (error) {
    console.error("PDF extraction failed:", error);
    throw new Error("PDF text extraction failed. Please try converting to DOCX or uploading page images.");
  }
}
