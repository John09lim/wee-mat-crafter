import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const requiredFields = [
  "schoolDistrict",
  "lessonName",
  "learningAreas",
  "teachers",
  "designedFor",
  "gradeLevelSection",
  "term",
  "week",
  "inclusiveDates",
  "principal",
] as const;

type RequestField = (typeof requiredFields)[number];

type SessionPlan = {
  sessionNumber: number;
  objective: string;
  preLesson: string;
  flow: string;
  resources: string;
  integration: string;
  formativeAssessment: string;
  extendedLearning: string;
  reflection: string;
};

type GeneratedPlan = {
  references: string;
  learningCompetency: string;
  learnerContext: string;
  sessions: SessionPlan[];
};

const cleanText = (value: unknown, maxLength = 700) =>
  String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);

const expectText = (value: unknown, field: string) => {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`The AI response is missing ${field}.`);
  return text.slice(0, 5000);
};

const validatePlan = (value: unknown): GeneratedPlan => {
  if (!value || typeof value !== "object") throw new Error("The AI returned an invalid lesson plan.");
  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.sessions) || candidate.sessions.length !== 4) {
    throw new Error("The AI must return exactly four lesson sessions.");
  }

  const sessions = candidate.sessions.map((session, index) => {
    if (!session || typeof session !== "object") throw new Error(`Session ${index + 1} is invalid.`);
    const item = session as Record<string, unknown>;
    return {
      sessionNumber: index + 1,
      objective: expectText(item.objective, `Session ${index + 1} objective`),
      preLesson: expectText(item.preLesson, `Session ${index + 1} pre-lesson`),
      flow: expectText(item.flow, `Session ${index + 1} flow`),
      resources: expectText(item.resources, `Session ${index + 1} resources`),
      integration: expectText(item.integration, `Session ${index + 1} integration`),
      formativeAssessment: expectText(item.formativeAssessment, `Session ${index + 1} assessment`),
      extendedLearning: expectText(item.extendedLearning, `Session ${index + 1} extended learning`),
      reflection: expectText(item.reflection, `Session ${index + 1} reflection`),
    };
  });

  return {
    references: expectText(candidate.references, "references"),
    learningCompetency: expectText(candidate.learningCompetency, "learning competency"),
    learnerContext: expectText(candidate.learnerContext, "learner context"),
    sessions,
  };
};

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) throw new Error("Please sign in before generating a lesson plan.");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) throw new Error("Authentication is not configured.");

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Your session has expired. Please sign in again.");

    const rawBody = await request.json();
    const form = Object.fromEntries(
      requiredFields.map((field) => [field, cleanText(rawBody?.[field])]),
    ) as Record<RequestField, string>;

    const missing = requiredFields.filter((field) => !form[field]);
    if (missing.length > 0) {
      return new Response(
        JSON.stringify({ error: `Complete these fields: ${missing.join(", ")}.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
    if (!apiKey) throw new Error("The AI lesson-plan service is not configured.");

    const systemPrompt = `You are an expert Philippine public-school instructional designer. Create an ILAW-based lesson-plan draft that is accurate, grade-appropriate, practical, inclusive, and directly tied to the teacher's lesson title and learning area.

Important safeguards:
- Produce exactly four connected sessions that progress from activation/modeling to guided practice, independent application, and synthesis.
- Do not invent official competency codes, DepEd order numbers, book page numbers, or claims that a specific source was consulted.
- State the competency in clear curriculum-aligned language based only on the supplied lesson information.
- Keep every activity feasible for an ordinary Philippine classroom and include low-tech alternatives.
- Use the most appropriate language for the learning area and the wording supplied by the teacher. Filipino and Araling Panlipunan plans should normally be written in Filipino.
- Each session must be meaningfully different and must remain focused on the same lesson.
- Assessment must measure the stated objective and include feedback, accommodation, or support.
- Reflection fields must be fill-in prompts teachers can complete after the session.
- Return JSON only. Do not use markdown fences or commentary.`;

    const userPrompt = `Create the structured ILAW lesson plan using these teacher-provided details:
School / District: ${form.schoolDistrict}
Name of Lesson: ${form.lessonName}
Learning Area/s: ${form.learningAreas}
Designed by Teacher/s: ${form.teachers}
Designed for which learners: ${form.designedFor}
Grade Level and Section: ${form.gradeLevelSection}
Term: ${form.term}
Week: ${form.week}
Inclusive Dates: ${form.inclusiveDates}
School Head / Principal: ${form.principal}

Return this exact JSON shape:
{
  "references": "credible source categories and teacher materials, without fabricated page numbers",
  "learningCompetency": "clear curriculum-aligned target and applicable content/performance expectation",
  "learnerContext": "strengths, interests, prior learning, barriers, and suitable supports",
  "sessions": [
    {
      "sessionNumber": 1,
      "objective": "specific measurable objective",
      "preLesson": "readiness activity and diagnostic check",
      "flow": "detailed classroom sequence with teacher and learner actions; use short newline-separated steps",
      "resources": "materials plus accessible or low-tech alternatives",
      "integration": "meaningful integration with another learning area, value, local context, or technology",
      "formativeAssessment": "aligned task, success criteria, feedback, and accommodation",
      "extendedLearning": "manageable reinforcement outside class",
      "reflection": "fill-in teacher reflection prompts"
    }
  ]
}`;

    const aiResponse = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.35,
        max_tokens: 6000,
      }),
    });

    if (!aiResponse.ok) {
      console.error("DeepSeek error", aiResponse.status, await aiResponse.text());
      throw new Error("The AI service could not generate the lesson plan. Please try again.");
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData?.choices?.[0]?.message?.content;
    if (typeof rawContent !== "string" || !rawContent.trim()) {
      throw new Error("The AI returned an empty lesson plan.");
    }

    const normalized = rawContent.trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "");
    const generated = validatePlan(JSON.parse(normalized));

    return new Response(
      JSON.stringify({
        form,
        generated,
        generatedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("generate-ilaw-lesson-plan", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Lesson-plan generation failed." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
