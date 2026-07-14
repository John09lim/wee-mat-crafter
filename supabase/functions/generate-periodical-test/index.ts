import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AssessmentKind = "Quiz" | "Summative Test" | "Term Examination";
type AssessmentLanguage = "English" | "Filipino";
type QuestionType = "Multiple Choice" | "True or False" | "Identification" | "Fill in the Blank" | "Short Answer" | "Essay";
type CognitiveLevel = "Remembering" | "Understanding" | "Applying" | "Analyzing" | "Evaluating" | "Creating";

type TestPartConfig = {
  id: string;
  title: string;
  type: QuestionType;
  itemCount: number;
};

type AssessmentRequest = {
  assessmentKind: AssessmentKind;
  subject: string;
  gradeLevel: string;
  section: string;
  term: string;
  schedule: string;
  language: AssessmentLanguage;
  competencies: string[];
  testParts: TestPartConfig[];
};

type GeneratedQuestion = {
  number: number;
  prompt: string;
  options: string[];
  answer: string;
  rationale: string;
  competencyCode: string;
  cognitiveLevel: CognitiveLevel;
  points: number;
};

type GeneratedPart = TestPartConfig & {
  directions: string;
  questions: GeneratedQuestion[];
};

const assessmentKinds = new Set<AssessmentKind>(["Quiz", "Summative Test", "Term Examination"]);
const languages = new Set<AssessmentLanguage>(["English", "Filipino"]);
const questionTypes = new Set<QuestionType>(["Multiple Choice", "True or False", "Identification", "Fill in the Blank", "Short Answer", "Essay"]);
const cognitiveLevels = new Set<CognitiveLevel>(["Remembering", "Understanding", "Applying", "Analyzing", "Evaluating", "Creating"]);

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const getGradeNumber = (gradeLevel: string) => {
  if (gradeLevel === "Kindergarten") return 0;
  const match = gradeLevel.match(/\d+/);
  return match ? Number(match[0]) : null;
};

const getPolicy = (gradeLevel: string) => {
  const grade = getGradeNumber(gradeLevel);
  if (grade === 0) return { termAllowed: false, termItems: null, summativeMax: null, note: "Kindergarten has no Term Examination; use developmentally appropriate observational, oral, performance, and narrative evidence." };
  if (grade !== null && grade <= 3) return { termAllowed: true, termItems: null, summativeMax: null, note: "For Grades 1 to 3, formal written examinations should be minimal, short, low-pressure, and developmentally appropriate." };
  if (grade !== null && grade <= 6) return { termAllowed: true, termItems: 40, summativeMax: 20, note: "KS2 Term Examination: 40 items. Each Summative Test must not exceed 20 items." };
  if (grade !== null && grade <= 10) return { termAllowed: true, termItems: 50, summativeMax: 25, note: "KS3 Term Examination: 50 items with appropriate higher-order thinking. Each Summative Test must not exceed 25 items." };
  if (grade !== null && grade <= 12) return { termAllowed: true, termItems: 60, summativeMax: 30, note: "KS4 Term Examination: 60 competency-based and discipline-specific items. Each Summative Test must not exceed 30 items." };
  throw new Error("Select a valid grade level from Kindergarten to Grade 12.");
};

const parseRequest = (value: unknown): AssessmentRequest => {
  if (!value || typeof value !== "object") throw new Error("Invalid assessment request.");
  const body = value as Record<string, unknown>;
  if (!assessmentKinds.has(body.assessmentKind as AssessmentKind)) throw new Error("Select a valid assessment type.");
  if (!languages.has(body.language as AssessmentLanguage)) throw new Error("Select English or Filipino.");

  const subject = String(body.subject ?? "").trim();
  const gradeLevel = String(body.gradeLevel ?? "").trim();
  const section = String(body.section ?? "").trim();
  const term = String(body.term ?? "").trim();
  const schedule = String(body.schedule ?? "").trim();
  if (!subject || !gradeLevel || !section || !term || !schedule) throw new Error("Complete all assessment details.");

  if (!Array.isArray(body.competencies)) throw new Error("Add at least one learning competency.");
  const competencies = body.competencies.map((item) => String(item).trim()).filter(Boolean);
  if (competencies.length === 0 || competencies.length > 20) throw new Error("Add between 1 and 20 learning competencies.");

  if (!Array.isArray(body.testParts) || body.testParts.length === 0 || body.testParts.length > 10) {
    throw new Error("Add between 1 and 10 test parts.");
  }
  const testParts = body.testParts.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error(`Test part ${index + 1} is invalid.`);
    const part = item as Record<string, unknown>;
    const type = part.type as QuestionType;
    const itemCount = Number(part.itemCount);
    const title = String(part.title ?? "").trim();
    if (!title || !questionTypes.has(type) || !Number.isInteger(itemCount) || itemCount < 1 || itemCount > 60) {
      throw new Error(`Complete the title, question type, and item count for test part ${index + 1}.`);
    }
    return { id: String(part.id || `part-${index + 1}`), title, type, itemCount };
  });

  const request: AssessmentRequest = {
    assessmentKind: body.assessmentKind as AssessmentKind,
    subject,
    gradeLevel,
    section,
    term,
    schedule,
    language: body.language as AssessmentLanguage,
    competencies,
    testParts,
  };

  const policy = getPolicy(gradeLevel);
  const totalItems = testParts.reduce((sum, part) => sum + part.itemCount, 0);
  if (totalItems > 60) throw new Error("Keep a generated assessment to 60 items or fewer.");
  if (request.assessmentKind === "Term Examination" && !policy.termAllowed) throw new Error("Kindergarten does not have a Term Examination.");
  if (request.assessmentKind === "Term Examination" && policy.termItems !== null && totalItems !== policy.termItems) {
    throw new Error(`This grade level requires ${policy.termItems} items for the Term Examination.`);
  }
  if (request.assessmentKind === "Summative Test" && policy.summativeMax !== null && totalItems > policy.summativeMax) {
    throw new Error(`This Summative Test must not exceed ${policy.summativeMax} items.`);
  }
  if (request.assessmentKind === "Quiz" && totalItems > 20) {
    throw new Error("Keep a generated quiz to 20 items or fewer.");
  }
  return request;
};

const stripCodeFence = (value: string) => value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

const defaultPoints = (type: QuestionType) => {
  if (type === "Essay") return 5;
  if (type === "Short Answer") return 2;
  return 1;
};

const buildPartPrompt = (request: AssessmentRequest, part: TestPartConfig, retryReason?: string) => {
  const grade = getGradeNumber(request.gradeLevel);
  const keyStageGuidance = grade !== null && grade >= 7 && grade <= 10
    ? "Include an appropriate range of higher-order thinking questions, especially Analyzing, Evaluating, and Creating."
    : grade !== null && grade >= 11
      ? "Make the items competency-based, discipline-specific, and authentic to the learning area."
      : "Keep vocabulary, context, reading load, and reasoning developmentally appropriate for the grade level.";

  const typeRules: Record<QuestionType, string> = {
    "Multiple Choice": "Every question must have exactly four plausible options in options[]. Do not include A/B/C/D inside the option text. answer must be exactly A, B, C, or D.",
    "True or False": "options must be []. answer must be exactly True or False. Avoid trivial wording and double negatives.",
    "Identification": "options must be []. answer must be the concise expected term or phrase.",
    "Fill in the Blank": "options must be []. Use only one meaningful blank written as _____. answer must be the missing word or phrase.",
    "Short Answer": "options must be []. answer must state the expected response. rationale must give concise scoring criteria.",
    "Essay": "options must be []. answer must list the expected key ideas. rationale must provide a concise analytic scoring guide.",
  };

  return `Create exactly ${part.itemCount} ${part.type} items for ${part.title} of a ${request.assessmentKind}.

Context:
- Subject: ${request.subject}
- Grade and section: ${request.gradeLevel} - ${request.section}
- Term: ${request.term}
- Language: ${request.language}
- Assessment date: ${request.schedule}

Approved competencies:
${request.competencies.map((competency, index) => `C${index + 1}: ${competency}`).join("\n")}

Requirements:
1. Write all learner-facing text in ${request.language}.
2. Assess only the competencies listed above and lessons reasonably implied by their wording. Do not invent unrelated content.
3. ${keyStageGuidance}
4. ${typeRules[part.type]}
5. Assign one competencyCode (C1, C2, etc.) and one cognitiveLevel to each item. cognitiveLevel must be exactly Remembering, Understanding, Applying, Analyzing, Evaluating, or Creating.
6. Use ${defaultPoints(part.type)} point${defaultPoints(part.type) === 1 ? "" : "s"} per item unless the scoring demand clearly requires more; points must be a positive integer.
7. Avoid ambiguous stems, trick questions, clues to the answer, offensive stereotypes, and duplicate questions.
8. Do not include learner names, school-identifying learner data, citations, markdown, or commentary outside the JSON.
${retryReason ? `9. Correct the previous output problem: ${retryReason}` : ""}

Return one JSON object only with this exact shape:
{
  "directions": "clear directions for this part",
  "questions": [
    {
      "prompt": "question text",
      "options": ["option 1", "option 2", "option 3", "option 4"],
      "answer": "correct answer",
      "rationale": "why the answer is correct or scoring criteria",
      "competencyCode": "C1",
      "cognitiveLevel": "Understanding",
      "points": ${defaultPoints(part.type)}
    }
  ]
}`;
};

const validatePartPayload = (
  payload: unknown,
  part: TestPartConfig,
  competencyCodes: Set<string>,
) => {
  if (!payload || typeof payload !== "object") return "The response was not a JSON object.";
  const record = payload as Record<string, unknown>;
  if (!String(record.directions ?? "").trim()) return "Directions were missing.";
  if (!Array.isArray(record.questions) || record.questions.length !== part.itemCount) {
    return `Expected ${part.itemCount} questions but received ${Array.isArray(record.questions) ? record.questions.length : 0}.`;
  }

  for (let index = 0; index < record.questions.length; index += 1) {
    const value = record.questions[index];
    if (!value || typeof value !== "object") return `Question ${index + 1} was invalid.`;
    const question = value as Record<string, unknown>;
    if (!String(question.prompt ?? "").trim() || !String(question.answer ?? "").trim()) return `Question ${index + 1} was incomplete.`;
    if (!competencyCodes.has(String(question.competencyCode ?? ""))) return `Question ${index + 1} used an invalid competency code.`;
    if (!cognitiveLevels.has(question.cognitiveLevel as CognitiveLevel)) return `Question ${index + 1} used an invalid cognitive level.`;
    if (part.type === "Multiple Choice") {
      if (!Array.isArray(question.options) || question.options.length !== 4 || question.options.some((option) => !String(option).trim())) {
        return `Multiple choice question ${index + 1} did not have four complete options.`;
      }
      if (!/^[A-D]$/i.test(String(question.answer).trim())) return `Multiple choice question ${index + 1} did not return an A-D answer.`;
    }
  }
  return null;
};

const normalizeGeneratedPart = (payload: Record<string, unknown>, part: TestPartConfig): GeneratedPart => ({
  ...part,
  directions: String(payload.directions).trim(),
  questions: (payload.questions as Array<Record<string, unknown>>).map((question, index) => ({
    number: index + 1,
    prompt: String(question.prompt).trim(),
    options: part.type === "Multiple Choice" ? (question.options as unknown[]).map((option) => String(option).trim()) : [],
    answer: String(question.answer).trim(),
    rationale: String(question.rationale ?? "Teacher validation required.").trim(),
    competencyCode: String(question.competencyCode).trim(),
    cognitiveLevel: question.cognitiveLevel as CognitiveLevel,
    points: Math.max(1, Math.round(Number(question.points) || defaultPoints(part.type))),
  })),
});

const generatePart = async (
  deepseekKey: string,
  request: AssessmentRequest,
  part: TestPartConfig,
): Promise<GeneratedPart> => {
  const competencyCodes = new Set(request.competencies.map((_, index) => `C${index + 1}`));
  let retryReason: string | undefined;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${deepseekKey}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "You are an expert Philippine basic education assessment designer. Return valid JSON only. Preserve teacher-provided competencies, use accurate grade-appropriate content, and never include personal learner data.",
          },
          { role: "user", content: buildPartPrompt(request, part, retryReason) },
        ],
        response_format: { type: "json_object" },
        temperature: 0.25,
        max_tokens: Math.min(8000, Math.max(1800, part.itemCount * 230)),
      }),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 240);
      throw new Error(`The AI service could not generate ${part.title}. ${detail || `HTTP ${response.status}`}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error(`The AI service returned no content for ${part.title}.`);

    let payload: unknown;
    try {
      payload = JSON.parse(stripCodeFence(content));
    } catch {
      retryReason = "Return valid JSON only.";
      continue;
    }

    const validationError = validatePartPayload(payload, part, competencyCodes);
    if (!validationError) return normalizeGeneratedPart(payload as Record<string, unknown>, part);
    retryReason = validationError;
  }

  throw new Error(`${part.title} could not be validated after two attempts. ${retryReason ?? "Please try again."}`);
};

const buildTos = (request: AssessmentRequest, parts: GeneratedPart[]) => {
  const rows = request.competencies.map((competency, index) => ({
    competencyCode: `C${index + 1}`,
    competency,
    remembering: 0,
    understanding: 0,
    applying: 0,
    analyzing: 0,
    evaluating: 0,
    creating: 0,
    totalItems: 0,
    totalPoints: 0,
    percentage: 0,
    itemNumbers: [] as string[],
  }));
  const rowMap = new Map(rows.map((row) => [row.competencyCode, row]));
  const levelKeys: Record<CognitiveLevel, keyof Pick<(typeof rows)[number], "remembering" | "understanding" | "applying" | "analyzing" | "evaluating" | "creating">> = {
    Remembering: "remembering",
    Understanding: "understanding",
    Applying: "applying",
    Analyzing: "analyzing",
    Evaluating: "evaluating",
    Creating: "creating",
  };

  parts.forEach((part) => {
    part.questions.forEach((question) => {
      const row = rowMap.get(question.competencyCode);
      if (!row) return;
      const levelKey = levelKeys[question.cognitiveLevel];
      row[levelKey] += 1;
      row.totalItems += 1;
      row.totalPoints += question.points;
      row.itemNumbers.push(`${part.title} ${question.number}`);
    });
  });

  const totalItems = parts.reduce((sum, part) => sum + part.questions.length, 0);
  return rows.map((row) => ({
    ...row,
    percentage: totalItems > 0 ? Math.round((row.totalItems / totalItems) * 100) : 0,
    itemNumbers: row.itemNumbers.join(", "),
  }));
};

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) return jsonResponse({ error: "Sign in as a teacher to generate an assessment." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("The assessment service is not configured.");
    if (!deepseekKey) throw new Error("The AI assessment service is not configured. Add DEEPSEEK_API_KEY to the Edge Function secrets.");

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const jwt = authorization.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) return jsonResponse({ error: "Your session expired. Sign in again and retry." }, 401);

    const body = parseRequest(await request.json());
    const parts = await Promise.all(body.testParts.map((part) => generatePart(deepseekKey, body, part)));
    const tos = buildTos(body, parts);
    const policy = getPolicy(body.gradeLevel);

    return jsonResponse({
      policyNote: body.assessmentKind === "Quiz"
        ? "Classroom Quiz: Keep every item focused on the competencies already taught and verify all questions and answers before use."
        : policy.note,
      generatedAt: new Date().toISOString(),
      parts,
      tos,
    });
  } catch (error) {
    console.error("Assessment generation error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "The assessment could not be generated." }, 500);
  }
});
