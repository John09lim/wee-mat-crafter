import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// Rate limiter – simple in-memory counter per user, 20 requests per minute
// ---------------------------------------------------------------------------
const rateLimitWindowMs = 60_000;
const rateLimitMaxRequests = 20;
const userRequestCounts = new Map<
  string,
  { count: number; windowStart: number }
>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = userRequestCounts.get(userId);

  if (!entry || now - entry.windowStart > rateLimitWindowMs) {
    userRequestCounts.set(userId, { count: 1, windowStart: now });
    return false;
  }

  if (entry.count >= rateLimitMaxRequests) {
    return true;
  }

  entry.count++;
  return false;
}

// ---------------------------------------------------------------------------
// System prompt – WeeLMat knowledge base
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are the helpful support assistant for WeeLMat Generator (weelmatgenerator.com), an online platform built for the Schools Division of Negros Oriental, Department of Education (DepEd), Philippines. Your role is to answer user inquiries about the platform clearly and concisely.

## About WeeLMat
WeeLMat (Weekly Learning Activity Matrix) Generator is a web application that helps teachers create weekly learning activity matrices, lesson plans, periodical tests, and quizzes. It supports three user roles: Teachers, School Heads (Principals), and Supervisors. The platform is developed by John Emmanuel Lim (johnemmanuel.lim@deped.gov.ph).

## Common Issues and Solutions

### Login & Authentication
- Use your DepEd email to sign in. If you get "Invalid email or password," double-check your credentials.
- If you see "There was an issue with your account. Please contact support," try signing out and signing in again. If the problem persists, email johnemmanuel.lim@deped.gov.ph.
- Session may expire after inactivity — just sign in again.

### Password Reset – IMPORTANT
- When a teacher resets their password in Supabase Auth, a new user ID is generated. This breaks the link between their account and their school assignment.
- **Solution:** The school head/principal must re-add the teacher to their school from the Principal Dashboard. The teacher will then appear normally again.
- Teachers should save their passwords to avoid needing frequent resets.

### "Waiting for your school principal to add you"
- This message appears when a teacher's account has not been linked to a school assignment yet.
- **Solution:** Contact your school head/principal and ask them to add you through their Principal Dashboard. The principal needs your DepEd email address.
- Once added, refresh the page or sign out and sign back in.

### File Upload Issues
- Maximum file size is 10 MB. If your file is larger, reduce it before uploading.
- PDF files are NOT supported for WeeLMat generation. Convert your PDF to DOCX format first, then upload.
- If you see "Failed to process file. Please try manual mode," try using the manual input mode instead of file upload.

### WeeLMat Generation
- Make sure all required fields are filled: subject, lesson title, competencies/learning objectives.
- If automatic generation fails, use manual mode to input your content directly.
- Generated WeeLMats can be downloaded as DOCX files.

### Teacher Submissions
- Teachers submit their WeeLMat files weekly to their school head for review.
- Select the correct school and principal from your My Account page before submitting.
- Submissions are grouped by week (Monday to Friday). Weekend submissions belong to the upcoming week.
- After submission, the school head can review, approve, or return the submission with feedback.

### Principal Dashboard
- Principals can view all teacher submissions for the current week.
- They can filter by status: pending, reviewed, or returned.
- Principals can approve submissions (mark as reviewed) or return them with comments.
- To add a teacher, go to Teacher Management and enter the teacher's full name and DepEd email.
- School identity (school name, district, school ID) must be set up in the account section.

### Supervisor Dashboard
- Supervisors can view submissions across multiple schools in their district.
- They can see district-wide reporting and statistics.

### My Account / Profile Setup
- Teachers should link their account to their assigned school from the My Account page.
- Upload a profile photo (max 5 MB, image format).
- Select your school and principal from the dropdown after your principal has added you.

### Download Issues
- If a file download fails, check your internet connection and try again.
- Use the download link or copy-to-clipboard option if direct download doesn't work.

### Roles & Access
- **Teacher:** Creates WeeLMats, submits to principal, views own history.
- **School Head/Principal:** Manages teachers, reviews submissions, sets up school identity.
- **Supervisor:** Views district-wide data, monitors multiple schools.
- Each role has a separate login page and PIN/passcode.

### Premium Features
- Premium generators include: Lesson Plan Generator, Periodical Test Generator, and Quiz Generator.
- Access premium features through the /premium routes.

### ILAW Lesson Plan
- A specialized lesson plan generator accessible from the main navigation.

### Mobile App
- WeeLMat is also available as an Android app. Download the APK from the website.

## Tone and Style
- Be friendly, helpful, and concise.
- Use simple English. Many users are from the Philippines.
- If you are unsure about something or the issue is beyond what you can help with, say: "I'm sorry, I wasn't able to resolve that. For direct support, please email johnemmanuel.lim@deped.gov.ph — the main developer of WeeLMat."
- Do NOT make up information about features that don't exist.
- Do NOT share technical details about the backend, database, or code.`;

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // -- Auth validation ----------------------------------------------------
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authClient = createClient(supabaseUrl, supabaseAnonKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const jwt = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: "Session expired or invalid. Please sign out and sign in again.",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // -- Rate limiting -------------------------------------------------------
    if (isRateLimited(user.id)) {
      return new Response(
        JSON.stringify({
          error:
            "You've sent too many messages. Please wait a moment and try again.",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // -- Parse request body --------------------------------------------------
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // -- Call DeepSeek API ---------------------------------------------------
    const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");
    if (!deepseekApiKey) {
      console.error("DEEPSEEK_API_KEY is not set");
      return new Response(
        JSON.stringify({ error: "Chatbot is not configured. Please contact support." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const apiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.slice(-20), // Keep last 20 messages for context window
    ];

    const deepseekResponse = await fetch(
      "https://api.deepseek.com/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${deepseekApiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: apiMessages,
          max_tokens: 1024,
          temperature: 0.7,
          stream: true,
        }),
      },
    );

    if (!deepseekResponse.ok) {
      const errorText = await deepseekResponse.text();
      console.error("DeepSeek API error:", deepseekResponse.status, errorText);
      return new Response(
        JSON.stringify({
          error: "I'm having trouble responding right now. Please try again later or email johnemmanuel.lim@deped.gov.ph for support.",
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // -- Stream the response back to the frontend ----------------------------
    const { body } = deepseekResponse;
    if (!body) {
      return new Response(
        JSON.stringify({ error: "No response from AI service" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Transform the DeepSeek SSE stream into a plain text stream
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const lines = text.split("\n");

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") {
            controller.enqueue(new TextEncoder().encode("[DONE]"));
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              controller.enqueue(new TextEncoder().encode(content));
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      },
    });

    const readable = body.pipeThrough(transformStream);

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chatbot function error:", error);
    return new Response(
      JSON.stringify({
        error: "Something went wrong. Please try again or email johnemmanuel.lim@deped.gov.ph for support.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
