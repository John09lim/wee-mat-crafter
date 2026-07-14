import type { AssessmentKind, TestPartConfig } from "./types";

export type AssessmentPolicy = {
  keyStage: string;
  guidance: string;
  termExamAllowed: boolean;
  termExamItems: number | null;
  summativeMaxItems: number | null;
};

export const GRADE_LEVELS = [
  "Kindergarten",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
] as const;

export const getGradeNumber = (gradeLevel: string) => {
  if (gradeLevel === "Kindergarten") return 0;
  const match = gradeLevel.match(/\d+/);
  return match ? Number(match[0]) : null;
};

export const getAssessmentPolicy = (gradeLevel: string): AssessmentPolicy => {
  const grade = getGradeNumber(gradeLevel);

  if (grade === 0) {
    return {
      keyStage: "KS1 - Kindergarten",
      guidance: "No Term Examination. Assessment should primarily use observation, oral responses, performance, and narrative evidence.",
      termExamAllowed: false,
      termExamItems: null,
      summativeMaxItems: null,
    };
  }

  if (grade !== null && grade <= 3) {
    return {
      keyStage: "KS1 - Grades 1 to 3",
      guidance: "A Term Examination may cover selected learning areas only when developmentally appropriate. Keep it minimal, short, and low-pressure.",
      termExamAllowed: true,
      termExamItems: null,
      summativeMaxItems: null,
    };
  }

  if (grade !== null && grade <= 6) {
    return {
      keyStage: "KS2 - Grades 4 to 6",
      guidance: "The Term Examination is a required cumulative assessment aligned with taught competencies.",
      termExamAllowed: true,
      termExamItems: 40,
      summativeMaxItems: 20,
    };
  }

  if (grade !== null && grade <= 10) {
    return {
      keyStage: "KS3 - Grades 7 to 10",
      guidance: "The Term Examination is required and should include developmentally appropriate higher-order thinking.",
      termExamAllowed: true,
      termExamItems: 50,
      summativeMaxItems: 25,
    };
  }

  if (grade !== null && grade <= 12) {
    return {
      keyStage: "KS4 - Grades 11 to 12",
      guidance: "The Term Examination is required, competency-based, and discipline-specific.",
      termExamAllowed: true,
      termExamItems: 60,
      summativeMaxItems: 30,
    };
  }

  return {
    keyStage: "Select a grade level",
    guidance: "Choose a grade level to see the applicable assessment guidance and item limit.",
    termExamAllowed: true,
    termExamItems: null,
    summativeMaxItems: null,
  };
};

export const getPolicyTarget = (policy: AssessmentPolicy, kind: AssessmentKind) => {
  if (kind === "Term Examination") return policy.termExamItems;
  if (kind === "Summative Test") return policy.summativeMaxItems;
  return null;
};

export const distributeItems = (parts: TestPartConfig[], target: number): TestPartConfig[] => {
  if (parts.length === 0) return parts;

  const weights = parts.map((part) => Math.max(1, part.itemCount));
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  let assigned = 0;

  return parts.map((part, index) => {
    const itemCount = index === parts.length - 1
      ? target - assigned
      : Math.max(1, Math.round((weights[index] / weightTotal) * target));
    assigned += itemCount;
    return { ...part, itemCount: Math.max(1, itemCount) };
  });
};

export const validatePolicyTotal = (
  policy: AssessmentPolicy,
  kind: AssessmentKind,
  totalItems: number,
) => {
  if (kind === "Term Examination" && !policy.termExamAllowed) {
    return "A Term Examination is not permitted for Kindergarten.";
  }

  if (kind === "Term Examination" && policy.termExamItems !== null && totalItems !== policy.termExamItems) {
    return `This grade level requires ${policy.termExamItems} items for the Term Examination.`;
  }

  if (kind === "Summative Test" && policy.summativeMaxItems !== null && totalItems > policy.summativeMaxItems) {
    return `A Summative Test for this grade level must not exceed ${policy.summativeMaxItems} items.`;
  }

  if (kind === "Quiz" && totalItems > 20) {
    return "Keep a generated quiz to 20 items or fewer.";
  }

  if (totalItems < 1) return "Add at least one test item.";
  if (totalItems > 60) return "Keep a generated assessment to 60 items or fewer.";
  return null;
};
