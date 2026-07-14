export type AssessmentKind = "Quiz" | "Summative Test" | "Term Examination";

export type AssessmentLanguage = "English" | "Filipino";

export type QuestionType =
  | "Multiple Choice"
  | "True or False"
  | "Identification"
  | "Fill in the Blank"
  | "Short Answer"
  | "Essay";

export type CognitiveLevel =
  | "Remembering"
  | "Understanding"
  | "Applying"
  | "Analyzing"
  | "Evaluating"
  | "Creating";

export type TestPartConfig = {
  id: string;
  title: string;
  type: QuestionType;
  itemCount: number;
};

export type AssessmentForm = {
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

export type GeneratedQuestion = {
  number: number;
  prompt: string;
  options: string[];
  answer: string;
  rationale: string;
  competencyCode: string;
  cognitiveLevel: CognitiveLevel;
  points: number;
};

export type GeneratedTestPart = {
  id: string;
  title: string;
  type: QuestionType;
  directions: string;
  questions: GeneratedQuestion[];
};

export type TosRow = {
  competencyCode: string;
  competency: string;
  remembering: number;
  understanding: number;
  applying: number;
  analyzing: number;
  evaluating: number;
  creating: number;
  totalItems: number;
  totalPoints: number;
  percentage: number;
  itemNumbers: string;
};

export type AssessmentResult = {
  form: AssessmentForm;
  policyNote: string;
  generatedAt: string;
  parts: GeneratedTestPart[];
  tos: TosRow[];
};

export const QUESTION_TYPE_OPTIONS: QuestionType[] = [
  "Multiple Choice",
  "True or False",
  "Identification",
  "Fill in the Blank",
  "Short Answer",
  "Essay",
];

export const COGNITIVE_LEVELS: CognitiveLevel[] = [
  "Remembering",
  "Understanding",
  "Applying",
  "Analyzing",
  "Evaluating",
  "Creating",
];
