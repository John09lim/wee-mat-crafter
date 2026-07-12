import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) throw new Error("Authentication is required");

    const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
    if (!apiKey) throw new Error("AI revision service is not configured");

    const { currentText, instruction, category, day, subject, gradeLevel, competency, language } = await req.json();
    if (!currentText?.trim() || !instruction?.trim()) throw new Error("Current content and revision instructions are required");

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 0.2,
        max_tokens: 3000,
        messages: [
          {
            role: "system",
            content: `You revise one cell of a Philippine Weekly Learning Matrix. Return only the revised cell text, with no preface or markdown fence. Keep it accurate, concrete, age-appropriate, and directly aligned to the exact competency. Never replace the lesson with generic study advice. Preserve the requested assessment format and question count when present. Language: ${language || "English"}. Subject: ${subject}. Grade: ${gradeLevel}. Day: ${day}. Cell category: ${category}. Exact competency: ${competency}.`,
          },
          { role: "user", content: `Current cell:\n${currentText}\n\nTeacher's requested change:\n${instruction}` },
        ],
      }),
    });

    if (!response.ok) throw new Error(`AI revision failed (${response.status})`);
    const payload = await response.json();
    const revisedText = payload.choices?.[0]?.message?.content?.trim();
    if (!revisedText) throw new Error("The AI returned an empty revision");

    return new Response(JSON.stringify({ revisedText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Revision failed" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
