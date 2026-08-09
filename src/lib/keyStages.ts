export type KeyStageId = "KS1" | "KS2" | "KS3" | "KS4";

export interface KeyStageDefinition {
  id: KeyStageId;
  label: string;
  stageName: string;
  blurb: string;
  grades: string[];
}

export const keyStages: KeyStageDefinition[] = [
  {
    id: "KS1",
    label: "Key Stage 1",
    stageName: "Kinder to Grade 3",
    blurb:
      "Young learners build foundational literacy and numeracy through playful, visual, and hands-on activities.",
    grades: ["Kinder", "Grade 1", "Grade 2", "Grade 3"],
  },
  {
    id: "KS2",
    label: "Key Stage 2",
    stageName: "Grades 4 to 6",
    blurb:
      "Learners strengthen independent reading, writing, and problem-solving across all learning areas.",
    grades: ["Grade 4", "Grade 5", "Grade 6"],
  },
  {
    id: "KS3",
    label: "Key Stage 3",
    stageName: "Grades 7 to 10",
    blurb:
      "Junior high school learners engage with more specialized content and deeper competencies.",
    grades: ["Grade 7", "Grade 8", "Grade 9", "Grade 10"],
  },
  {
    id: "KS4",
    label: "Key Stage 4",
    stageName: "Grades 11 to 12",
    blurb:
      "Senior high school learners follow specialized tracks and strands aligned with their career path.",
    grades: ["Grade 11", "Grade 12"],
  },
];

const stageByIdMap = new Map(keyStages.map((stage) => [stage.id, stage]));

export const keyStageById = (id?: KeyStageId | null): KeyStageDefinition | undefined =>
  id ? stageByIdMap.get(id) : undefined;

const allGrades = [
  "Kinder",
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
];

export const gradesForKeyStage = (id?: KeyStageId | null): string[] =>
  keyStageById(id)?.grades ?? allGrades;

export const getKeyStageForGrade = (grade?: string | null): KeyStageId | undefined => {
  if (!grade) return undefined;
  for (const stage of keyStages) {
    if (stage.grades.includes(grade)) return stage.id;
  }
  return undefined;
};

export const isWorksheetKeyStage = (id?: KeyStageId | null): boolean => id === "KS1";

export const isWorksheetKeyStageByGrade = (grade?: string | null): boolean =>
  getKeyStageForGrade(grade) === "KS1";

export const allAssessmentTypes = [
  "Multiple Choice",
  "Identification",
  "True or False",
  "Matching Type",
  "Essay",
  "Performance Task",
] as const;

export const worksheetAssessmentTypes = [
  "Picture Counting",
  "Picture Matching",
  "Identifying / Circling",
  "Coloring Activity",
  "Sequence / Story Order",
] as const;

/** Union of all assessment/worksheet types across every key stage (for Zod schemas). */
export const allExamTypeValues = [...allAssessmentTypes, ...worksheetAssessmentTypes] as const;

export const assessmentTypesForKeyStage = (id?: KeyStageId | null): readonly string[] =>
  isWorksheetKeyStage(id) ? worksheetAssessmentTypes : allAssessmentTypes;

export const assessmentFieldLabel = (id?: KeyStageId | null): string =>
  isWorksheetKeyStage(id) ? "Worksheet activity" : "Assessment type";

export const itemCountLabel = (id?: KeyStageId | null): string =>
  isWorksheetKeyStage(id) ? "Number of activities" : "Number of items";

export const defaultItemCount = (id?: KeyStageId | null): number =>
  isWorksheetKeyStage(id) ? 5 : 10;

export const itemCountPresets = (id?: KeyStageId | null): number[] =>
  isWorksheetKeyStage(id) ? [3, 5, 8] : [5, 10, 15, 20];

export const ks1WorksheetHints: Record<string, string> = {
  "Picture Counting":
    "Show a set of real objects for the learner to count. The generated illustration makes counting concrete and visual.",
  "Picture Matching":
    "Present two columns of pictures. The learner draws a line from each item to its matching pair.",
  "Identifying / Circling":
    "Show a scene with several items. The learner circles the items that match the instruction.",
  "Coloring Activity":
    "Provide outline illustrations. The learner colors the objects according to the given directions.",
  "Sequence / Story Order":
    "Show three or four story pictures in jumbled order. The learner numbers them in the correct sequence.",
};
