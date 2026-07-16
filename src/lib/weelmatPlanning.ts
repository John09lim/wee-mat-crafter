export const planningDays = [
  { day: "Monday", prefix: "monday", key: "mon", filipino: "Lunes", offset: 0 },
  { day: "Tuesday", prefix: "tuesday", key: "tue", filipino: "Martes", offset: 1 },
  { day: "Wednesday", prefix: "wednesday", key: "wed", filipino: "Miyerkules", offset: 2 },
  { day: "Thursday", prefix: "thursday", key: "thu", filipino: "Huwebes", offset: 3 },
  { day: "Friday", prefix: "friday", key: "fri", filipino: "Biyernes", offset: 4 },
] as const;

export type PlanningDay = (typeof planningDays)[number];
export type PlanningDayPrefix = PlanningDay["prefix"];
export type PlanningDayKey = PlanningDay["key"];

export const allPlanningDayPrefixes = planningDays.map(({ prefix }) => prefix) as PlanningDayPrefix[];

export const taskOptions = [
  { value: "Multiple Choice", group: "Assessment", description: "Four-option questions with an answer key.", usesItemCount: true },
  { value: "Identification", group: "Assessment", description: "Learners identify terms, concepts, people, places, or processes.", usesItemCount: true },
  { value: "Matching Type", group: "Assessment", description: "Learners connect related ideas in two columns.", usesItemCount: true },
  { value: "True/False", group: "Assessment", description: "Learners evaluate competency-aligned statements.", usesItemCount: true },
  { value: "Essay", group: "Assessment", description: "Learners explain, reason, compare, or justify in writing.", usesItemCount: true },
  { value: "Short-Answer Check", group: "Assessment", description: "A focused written check using brief constructed responses.", usesItemCount: true },
  { value: "Oral Recitation", group: "Meaningful activity", description: "Guided prompts for speaking, explaining, and responding.", usesItemCount: false },
  { value: "Performance Task", group: "Meaningful activity", description: "An authentic product, performance, or demonstration.", usesItemCount: false },
  { value: "Hands-on Investigation", group: "Meaningful activity", description: "Learners observe, manipulate, test, and record findings.", usesItemCount: false },
  { value: "Collaborative Activity", group: "Meaningful activity", description: "A structured partner or group task with a shared output.", usesItemCount: false },
  { value: "Inquiry and Research", group: "Meaningful activity", description: "Learners investigate a question using credible references.", usesItemCount: false },
  { value: "Project-Based Task", group: "Meaningful activity", description: "A manageable project connected to a real-world purpose.", usesItemCount: false },
  { value: "Demonstration or Simulation", group: "Meaningful activity", description: "Learners model, demonstrate, role-play, or simulate a process.", usesItemCount: false },
  { value: "Reflection or Learning Journal", group: "Meaningful activity", description: "Learners connect the competency to evidence and experience.", usesItemCount: false },
  { value: "Game-Based Activity", group: "Meaningful activity", description: "A purposeful classroom game with clear learning evidence.", usesItemCount: false },
  { value: "Picture-Based Activity", group: "Meaningful activity", description: "A visual prompt or picture task may be generated for the lesson.", usesItemCount: false, supportsImage: true },
  { value: "Digital or Multimedia Task", group: "Meaningful activity", description: "A simple digital output such as a slide, recording, or visual explainer.", usesItemCount: false },
  { value: "Home or Community-Based Task", group: "Meaningful activity", description: "A safe, accessible task using home or community contexts.", usesItemCount: false },
  { value: "Summative Test", group: "Culminating or special day", description: "A cumulative assessment; on Friday it uses Monday–Thursday competencies.", usesItemCount: true },
  { value: "N/A (Not Applicable)", group: "Culminating or special day", description: "Keeps the day column and prints only N/A (Not Applicable).", usesItemCount: false, noGeneration: true },
  { value: "HOLIDAY", group: "Culminating or special day", description: "Keeps the day column and marks it as a holiday without generated tasks.", usesItemCount: false, noGeneration: true },
] as const;

export type LearningTaskType = (typeof taskOptions)[number]["value"];
export const learningTaskTypes = taskOptions.map(({ value }) => value) as [LearningTaskType, ...LearningTaskType[]];

export const taskGroups = ["Assessment", "Meaningful activity", "Culminating or special day"] as const;

export const getTaskOption = (value?: string) => taskOptions.find((option) => option.value === value);
export const taskUsesItemCount = (value?: string) => Boolean(getTaskOption(value)?.usesItemCount);
export const taskSkipsGeneration = (value?: string) => Boolean(getTaskOption(value)?.noGeneration);

export type KeyStage = "KS1" | "KS2" | "KS3" | "KS4";

export interface WeeLMatFormValues {
  subject: string;
  gradeLevel: string;
  section: string;
  dateFrom: string;
  dateTo: string;
  activeDays?: PlanningDayPrefix[];
  keyStage?: KeyStage;
  mondayCompetency: string;
  tuesdayCompetency: string;
  wednesdayCompetency: string;
  thursdayCompetency: string;
  fridayCompetency: string;
  mondayExamType: LearningTaskType | string;
  tuesdayExamType: LearningTaskType | string;
  wednesdayExamType: LearningTaskType | string;
  thursdayExamType: LearningTaskType | string;
  fridayExamType: LearningTaskType | string;
  mondayQuestionCount: number;
  tuesdayQuestionCount: number;
  wednesdayQuestionCount: number;
  thursdayQuestionCount: number;
  fridayQuestionCount: number;
  mondayInstructions?: string;
  tuesdayInstructions?: string;
  wednesdayInstructions?: string;
  thursdayInstructions?: string;
  fridayInstructions?: string;
  code?: string;
  language?: string;
  customInstructions?: string;
}

export const getKeyStage = (gradeLevel?: string): { code: KeyStage; label: string } | null => {
  if (!gradeLevel) return null;
  if (gradeLevel === "Kinder" || /^Grade [1-3]$/.test(gradeLevel)) return { code: "KS1", label: "Kinder to Grade 3" };
  if (/^Grade [4-6]$/.test(gradeLevel)) return { code: "KS2", label: "Grades 4 to 6" };
  if (/^Grade (7|8|9|10)$/.test(gradeLevel)) return { code: "KS3", label: "Grades 7 to 10" };
  if (/^Grade (11|12)$/.test(gradeLevel)) return { code: "KS4", label: "Grades 11 to 12" };
  return null;
};

export const specialCompetencyForTask = (task?: string) => {
  if (task === "N/A (Not Applicable)") return "N/A (Not Applicable)";
  if (task === "HOLIDAY") return "HOLIDAY";
  return null;
};

export const getActivePlanningDays = (activeDays?: readonly string[]) => {
  const normalized = activeDays?.length ? activeDays : allPlanningDayPrefixes;
  return planningDays.filter(({ prefix }) => normalized.includes(prefix));
};

export const getFridaySummativeCompetency = (
  values: Partial<Record<`${PlanningDayPrefix}Competency`, string>>,
  activeDays: readonly PlanningDayPrefix[],
) => planningDays
  .filter(({ prefix }) => prefix !== "friday" && activeDays.includes(prefix))
  .map(({ prefix }) => values[`${prefix}Competency`]?.trim())
  .filter((competency): competency is string => Boolean(
    competency && competency !== "HOLIDAY" && competency !== "N/A (Not Applicable)",
  ))
  .join(" | ");
