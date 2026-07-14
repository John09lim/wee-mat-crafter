import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileQuestion,
  FileSpreadsheet,
  Loader2,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

import { downloadAssessmentDocx } from "./assessmentDocx";
import {
  distributeItems,
  GRADE_LEVELS,
  getAssessmentPolicy,
  getPolicyTarget,
  validatePolicyTotal,
} from "./policy";
import {
  QUESTION_TYPE_OPTIONS,
  type AssessmentForm,
  type AssessmentKind,
  type AssessmentLanguage,
  type AssessmentResult,
  type QuestionType,
  type TestPartConfig,
} from "./types";

type AssessmentGeneratorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "assessment" | "quiz";
};

const newId = (prefix: string) =>
  `${prefix}-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`}`;

const createDefaultParts = (): TestPartConfig[] => [
  { id: newId("part"), title: "Test 1", type: "Multiple Choice", itemCount: 20 },
  { id: newId("part"), title: "Test 2", type: "Identification", itemCount: 10 },
  { id: newId("part"), title: "Test 3", type: "True or False", itemCount: 10 },
];

const createQuizParts = (): TestPartConfig[] => [
  { id: newId("part"), title: "Quiz", type: "Multiple Choice", itemCount: 10 },
];

const createInitialForm = (mode: "assessment" | "quiz"): AssessmentForm => ({
  assessmentKind: mode === "quiz" ? "Quiz" : "Term Examination",
  subject: "",
  gradeLevel: "Grade 4",
  section: "",
  term: "Term 1",
  schedule: "",
  language: "English",
  competencies: [""],
  testParts: mode === "quiz" ? createQuizParts() : createDefaultParts(),
});

const AssessmentGeneratorDialog = ({ open, onOpenChange, mode = "assessment" }: AssessmentGeneratorDialogProps) => {
  const isQuiz = mode === "quiz";
  const [form, setForm] = useState<AssessmentForm>(() => createInitialForm(mode));
  const [competencyIds, setCompetencyIds] = useState<string[]>(() => [newId("competency")]);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const policy = useMemo(() => getAssessmentPolicy(form.gradeLevel), [form.gradeLevel]);
  const policyTarget = getPolicyTarget(policy, form.assessmentKind);
  const totalItems = useMemo(
    () => form.testParts.reduce((sum, part) => sum + Math.max(0, Number(part.itemCount) || 0), 0),
    [form.testParts],
  );
  const totalPoints = useMemo(
    () => result?.parts.reduce(
      (sum, part) => sum + part.questions.reduce((partSum, question) => partSum + question.points, 0),
      0,
    ) ?? 0,
    [result],
  );
  const dialogTitle = isQuiz ? "Quiz Generator" : "Summative Test & Term Examination Generator";
  const dialogDescription = isQuiz
    ? "Set the class details, competency, question formats, and number of items, then generate a classroom-ready quiz and answer key."
    : "Configure the assessment by grade level, add as many test parts as needed, then generate the TOS, questions, and answer key together.";

  const setField = <Key extends keyof AssessmentForm>(key: Key, value: AssessmentForm[Key]) => {
    setErrorMessage(null);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleGradeChange = (gradeLevel: string) => {
    const nextPolicy = getAssessmentPolicy(gradeLevel);
    const nextKind: AssessmentKind = form.assessmentKind === "Quiz"
      ? "Quiz"
      : nextPolicy.termExamAllowed ? form.assessmentKind : "Summative Test";
    const nextTarget = getPolicyTarget(nextPolicy, nextKind);
    setErrorMessage(null);
    setForm((current) => ({
      ...current,
      gradeLevel,
      assessmentKind: nextKind,
      testParts: nextTarget ? distributeItems(current.testParts, nextTarget) : current.testParts,
    }));
  };

  const handleKindChange = (assessmentKind: AssessmentKind) => {
    if (assessmentKind === "Term Examination" && !policy.termExamAllowed) {
      setErrorMessage("Kindergarten does not have a Term Examination. Choose Summative Test instead.");
      return;
    }
    const nextTarget = getPolicyTarget(policy, assessmentKind);
    setErrorMessage(null);
    setForm((current) => ({
      ...current,
      assessmentKind,
      testParts: nextTarget ? distributeItems(current.testParts, nextTarget) : current.testParts,
    }));
  };

  const applyPolicyTotal = () => {
    if (!policyTarget) return;
    setForm((current) => ({ ...current, testParts: distributeItems(current.testParts, policyTarget) }));
    setErrorMessage(null);
  };

  const updateCompetency = (index: number, value: string) => {
    setErrorMessage(null);
    setForm((current) => ({
      ...current,
      competencies: current.competencies.map((competency, competencyIndex) => competencyIndex === index ? value : competency),
    }));
  };

  const addCompetency = () => {
    setForm((current) => ({ ...current, competencies: [...current.competencies, ""] }));
    setCompetencyIds((current) => [...current, newId("competency")]);
  };

  const removeCompetency = (index: number) => {
    setForm((current) => ({
      ...current,
      competencies: current.competencies.filter((_, competencyIndex) => competencyIndex !== index),
    }));
    setCompetencyIds((current) => current.filter((_, competencyIndex) => competencyIndex !== index));
  };

  const updatePart = <Key extends keyof TestPartConfig>(id: string, key: Key, value: TestPartConfig[Key]) => {
    setErrorMessage(null);
    setForm((current) => ({
      ...current,
      testParts: current.testParts.map((part) => part.id === id ? { ...part, [key]: value } : part),
    }));
  };

  const addPart = () => {
    setForm((current) => ({
      ...current,
      testParts: [
        ...current.testParts,
        {
          id: newId("part"),
          title: `Test ${current.testParts.length + 1}`,
          type: "Multiple Choice",
          itemCount: 5,
        },
      ],
    }));
  };

  const removePart = (id: string) => {
    setForm((current) => ({ ...current, testParts: current.testParts.filter((part) => part.id !== id) }));
  };

  const validateForm = () => {
    const requiredFields: Array<[keyof AssessmentForm, string, string]> = [
      ["subject", form.subject, "assessment-subject"],
      ["gradeLevel", form.gradeLevel, "assessment-grade"],
      ["section", form.section, "assessment-section"],
      ["term", form.term, "assessment-term"],
      ["schedule", form.schedule, "assessment-schedule"],
    ];
    const missing = requiredFields.find(([, value]) => !String(value).trim());
    if (missing) {
      setErrorMessage("Complete all assessment details before generating.");
      requestAnimationFrame(() => document.getElementById(missing[2])?.focus());
      return false;
    }

    if (form.competencies.length === 0 || form.competencies.some((competency) => !competency.trim())) {
      setErrorMessage("Enter every learning competency or remove the blank competency row.");
      requestAnimationFrame(() => document.getElementById("assessment-competency-1")?.focus());
      return false;
    }

    if (form.testParts.length === 0 || form.testParts.some((part) => !part.title.trim() || part.itemCount < 1)) {
      setErrorMessage("Each test part needs a title, question type, and at least one item.");
      requestAnimationFrame(() => document.getElementById("assessment-part-title-1")?.focus());
      return false;
    }

    const policyError = validatePolicyTotal(policy, form.assessmentKind, totalItems);
    if (policyError) {
      setErrorMessage(policyError);
      return false;
    }
    return true;
  };

  const handleGenerate = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setErrorMessage(null);
    try {
      const requestForm: AssessmentForm = {
        ...form,
        subject: form.subject.trim(),
        section: form.section.trim(),
        competencies: form.competencies.map((competency) => competency.trim()),
        testParts: form.testParts.map((part) => ({ ...part, title: part.title.trim() })),
      };
      const { data, error } = await supabase.functions.invoke("generate-periodical-test", { body: requestForm });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!Array.isArray(data?.parts) || !Array.isArray(data?.tos)) {
        throw new Error("The generator returned an incomplete assessment. Please try again.");
      }

      setResult({ ...(data as Omit<AssessmentResult, "form">), form: requestForm });
      toast.success(isQuiz
        ? "Your quiz questions and answer key are ready."
        : "Your Table of Specifications, test questions, and answer key are ready.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "The assessment could not be generated.";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!result) return;
    setDownloading(true);
    try {
      await downloadAssessmentDocx(result);
      toast.success("The editable assessment package is downloading.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The DOCX could not be created.");
    } finally {
      setDownloading(false);
    }
  };

  const resetGenerator = () => {
    setResult(null);
    setErrorMessage(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] max-w-[min(96vw,80rem)] flex-col gap-0 overflow-hidden p-0 pr-0 [&>button]:text-primary-foreground [&>button]:opacity-80 [&>button:hover]:bg-primary-foreground/10 [&>button:hover]:opacity-100 sm:max-h-[calc(100dvh-2rem)]">
        <div className="shrink-0 border-b border-border bg-primary px-5 py-5 pr-16 text-primary-foreground sm:px-7 sm:py-6 sm:pr-16">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/12 text-secondary">
                <ClipboardCheck className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <DialogTitle className="text-2xl text-primary-foreground sm:text-3xl">{dialogTitle}</DialogTitle>
                <DialogDescription className="mt-2 max-w-3xl text-primary-foreground/75">
                  {dialogDescription}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-background p-5 sm:p-7">
          {loading ? (
            <div className="flex min-h-[32rem] flex-col items-center justify-center text-center" role="status" aria-live="polite">
              <div className="relative flex h-36 w-36 items-center justify-center" aria-hidden="true">
                <motion.div
                  className="absolute inset-0 rounded-full border border-dashed border-primary/35"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                  className="absolute inset-5 rounded-full border-2 border-primary/15 border-t-secondary"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
                <motion.span
                  className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg"
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Sparkles className="h-7 w-7" />
                </motion.span>
              </div>
              <h3 className="font-display mt-6 text-3xl font-semibold text-foreground">
                {isQuiz ? "Building the quiz" : "Building the assessment package"}
              </h3>
              <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
                {isQuiz
                  ? "Writing competency-aligned questions, checking answer choices, and preparing the answer key."
                  : "Writing grade-appropriate questions, checking four-option multiple choice items, mapping competencies, and preparing the answer key."}
              </p>
              <div className="mt-7 flex items-center gap-2" aria-hidden="true">
                {[0, 1, 2, 3].map((item) => (
                  <motion.span
                    key={item}
                    className="h-2.5 w-2.5 rounded-full bg-primary"
                    animate={{ opacity: [0.25, 1, 0.25], y: [0, -5, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: item * 0.16 }}
                  />
                ))}
              </div>
            </div>
          ) : result ? (
            <div>
              <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-success">
                    <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                    {isQuiz ? "Quiz package ready" : "Assessment package ready"}
                  </div>
                  <h3 className="font-display mt-2 text-3xl font-semibold text-foreground">{result.form.subject} - {result.form.assessmentKind}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {result.form.gradeLevel} - {result.form.section} | {result.form.term} | {totalItems} items | {totalPoints} points
                  </p>
                </div>
                <Button type="button" onClick={() => void handleDownload()} disabled={downloading} className="gap-2">
                  {downloading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
                  {downloading ? "Preparing DOCX..." : isQuiz ? "Download quiz DOCX" : "Download complete DOCX"}
                </Button>
              </div>

              <div className="mt-5 rounded-xl border border-info/25 bg-info/5 p-4 text-sm leading-6 text-foreground">
                <div className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-info" aria-hidden="true" />
                  <p><strong>Teacher validation required.</strong> Review every question, distractor, answer, cognitive level, TOS allocation, and scoring criterion before administration.</p>
                </div>
              </div>

              <Tabs defaultValue="tos" className="mt-6">
                <TabsList aria-label="Generated assessment sections">
                  <TabsTrigger value="tos" className="gap-2"><FileSpreadsheet className="h-4 w-4" aria-hidden="true" />{isQuiz ? "Quiz blueprint" : "Table of Specifications"}</TabsTrigger>
                  <TabsTrigger value="questions" className="gap-2"><FileQuestion className="h-4 w-4" aria-hidden="true" />Test questions</TabsTrigger>
                  <TabsTrigger value="answers" className="gap-2"><ClipboardCheck className="h-4 w-4" aria-hidden="true" />Answer key</TabsTrigger>
                </TabsList>

                <TabsContent value="tos">
                  <div className="overflow-x-auto rounded-xl border border-border bg-card">
                    <table className="min-w-[76rem] w-full border-collapse text-sm">
                      <caption className="sr-only">Table of Specifications for the generated assessment</caption>
                      <thead className="bg-primary text-primary-foreground">
                        <tr>
                          <th className="p-3 text-left">Competency</th>
                          {['R', 'U', 'Ap', 'An', 'E', 'C'].map((level) => <th key={level} className="p-3 text-center">{level}</th>)}
                          <th className="p-3 text-center">Items</th>
                          <th className="p-3 text-center">Points</th>
                          <th className="p-3 text-center">%</th>
                          <th className="p-3 text-left">Item numbers</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.tos.map((row) => (
                          <tr key={row.competencyCode} className="border-t border-border align-top">
                            <td className="max-w-sm p-3"><strong>{row.competencyCode}</strong><span className="mt-1 block leading-5 text-muted-foreground">{row.competency}</span></td>
                            {[row.remembering, row.understanding, row.applying, row.analyzing, row.evaluating, row.creating].map((value, index) => <td key={index} className="p-3 text-center tabular-nums">{value}</td>)}
                            <td className="p-3 text-center font-semibold tabular-nums">{row.totalItems}</td>
                            <td className="p-3 text-center tabular-nums">{row.totalPoints}</td>
                            <td className="p-3 text-center tabular-nums">{row.percentage}%</td>
                            <td className="p-3 leading-5">{row.itemNumbers}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">R - Remembering | U - Understanding | Ap - Applying | An - Analyzing | E - Evaluating | C - Creating</p>
                </TabsContent>

                <TabsContent value="questions" className="space-y-5">
                  {result.parts.map((part) => (
                    <section key={part.id} className="rounded-xl border border-border bg-card p-5 sm:p-6">
                      <h4 className="font-display text-2xl font-semibold text-foreground">{part.title}: {part.type}</h4>
                      <p className="mt-2 text-sm italic text-muted-foreground">{part.directions}</p>
                      <ol className="mt-5 space-y-5">
                        {part.questions.map((question) => (
                          <li key={`${part.id}-${question.number}`} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-2">
                            <span className="font-semibold tabular-nums text-primary">{question.number}.</span>
                            <div>
                              <p className="leading-7 text-foreground">{question.prompt}</p>
                              {question.options.length > 0 ? (
                                <div className="mt-2 grid gap-1.5 text-sm leading-6 sm:grid-cols-2">
                                  {question.options.map((option, index) => <p key={option}><strong>{String.fromCharCode(65 + index)}.</strong> {option}</p>)}
                                </div>
                              ) : null}
                              <p className="mt-2 text-xs text-muted-foreground">{question.competencyCode} | {question.cognitiveLevel} | {question.points} point{question.points === 1 ? "" : "s"}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </section>
                  ))}
                </TabsContent>

                <TabsContent value="answers">
                  <div className="overflow-x-auto rounded-xl border border-border bg-card">
                    <table className="min-w-[52rem] w-full border-collapse text-sm">
                      <caption className="sr-only">Answer key and scoring guide</caption>
                      <thead className="bg-primary text-primary-foreground">
                        <tr><th className="p-3 text-left">Part</th><th className="p-3 text-center">Item</th><th className="p-3 text-left">Answer</th><th className="p-3 text-left">Rationale / scoring criteria</th><th className="p-3 text-center">Points</th></tr>
                      </thead>
                      <tbody>
                        {result.parts.flatMap((part) => part.questions.map((question) => (
                          <tr key={`${part.id}-answer-${question.number}`} className="border-t border-border align-top">
                            <td className="p-3 font-medium">{part.title}</td>
                            <td className="p-3 text-center tabular-nums">{question.number}</td>
                            <td className="max-w-xs p-3 leading-6">{question.answer}</td>
                            <td className="max-w-md p-3 leading-6 text-muted-foreground">{question.rationale}</td>
                            <td className="p-3 text-center tabular-nums">{question.points}</td>
                          </tr>
                        ))) }
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="mt-7 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="ghost" onClick={resetGenerator} className="gap-2">
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  {isQuiz ? "Edit quiz details" : "Edit assessment details"}
                </Button>
                <Button type="button" onClick={() => void handleDownload()} disabled={downloading} className="gap-2">
                  <Download className="h-4 w-4" aria-hidden="true" />
                  {isQuiz ? "Download quiz and answer key" : "Download TOS, test, and answer key"}
                </Button>
              </div>
            </div>
          ) : (
            <form
              id="assessment-generator-form"
              className="space-y-7"
              aria-busy={loading}
              onSubmit={(event) => {
                event.preventDefault();
                void handleGenerate();
              }}
            >
              <section>
                <h3 className="font-display text-2xl font-semibold text-foreground">{isQuiz ? "Quiz details" : "Assessment details"}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {isQuiz
                    ? "These details keep the quiz aligned to the intended class, term, and lesson."
                    : "Fields are required so the questions and TOS can be aligned to the intended class and term."}
                </p>
                <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="assessment-kind">Assessment type</Label>
                    {isQuiz ? (
                      <div id="assessment-kind" className="flex h-10 items-center rounded-md border border-input bg-muted/35 px-3 text-sm font-medium text-foreground">
                        Quiz
                      </div>
                    ) : (
                      <Select value={form.assessmentKind} onValueChange={(value) => handleKindChange(value as AssessmentKind)}>
                        <SelectTrigger id="assessment-kind"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Summative Test">Summative Test</SelectItem>
                          <SelectItem value="Term Examination" disabled={!policy.termExamAllowed}>Term Examination</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                    <Label htmlFor="assessment-subject">Subject <span aria-hidden="true">*</span></Label>
                    <Input id="assessment-subject" value={form.subject} onChange={(event) => setField("subject", event.target.value)} placeholder="e.g., Araling Panlipunan" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assessment-grade">Grade level <span aria-hidden="true">*</span></Label>
                    <Select value={form.gradeLevel} onValueChange={handleGradeChange}>
                      <SelectTrigger id="assessment-grade"><SelectValue /></SelectTrigger>
                      <SelectContent>{GRADE_LEVELS.map((grade) => <SelectItem key={grade} value={grade}>{grade}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assessment-section">Section <span aria-hidden="true">*</span></Label>
                    <Input id="assessment-section" value={form.section} onChange={(event) => setField("section", event.target.value)} placeholder="e.g., Rizal" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assessment-term">Term <span aria-hidden="true">*</span></Label>
                    <Select value={form.term} onValueChange={(value) => setField("term", value)}>
                      <SelectTrigger id="assessment-term"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Term 1">Term 1</SelectItem>
                        <SelectItem value="Term 2">Term 2</SelectItem>
                        <SelectItem value="Term 3">Term 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assessment-schedule">Schedule of exam <span aria-hidden="true">*</span></Label>
                    <Input
                      id="assessment-schedule"
                      type="date"
                      value={form.schedule}
                      onInput={(event) => setField("schedule", event.currentTarget.value)}
                      onChange={(event) => setField("schedule", event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assessment-language">Language</Label>
                    <Select value={form.language} onValueChange={(value) => setField("language", value as AssessmentLanguage)}>
                      <SelectTrigger id="assessment-language"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="English">English</SelectItem><SelectItem value="Filipino">Filipino</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    <div>
                      <h4 className="font-semibold text-foreground">{isQuiz ? "Focused classroom quiz" : policy.keyStage}</h4>
                      <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                        {isQuiz
                          ? "Keep the quiz focused on the competencies already taught and manageable for the selected grade level."
                          : policy.guidance}
                      </p>
                      <p className="mt-2 text-sm font-medium text-primary">
                        {isQuiz ? "Choose between 1 and 20 total quiz items." : null}
                        {form.assessmentKind === "Term Examination" && policy.termExamItems !== null ? `${policy.termExamItems} required test items.` : null}
                        {form.assessmentKind === "Summative Test" && policy.summativeMaxItems !== null ? `Maximum ${policy.summativeMaxItems} test items.` : null}
                        {policyTarget === null ? " Item count is minimal and teacher-determined." : null}
                      </p>
                    </div>
                  </div>
                  {policyTarget !== null && totalItems !== policyTarget ? (
                    <Button type="button" size="sm" variant="outline" onClick={applyPolicyTotal} className="shrink-0">Apply {policyTarget}-item total</Button>
                  ) : null}
                </div>
              </section>

              <section>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="font-display text-2xl font-semibold text-foreground">Learning competencies</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">Use the approved curriculum wording. Each competency receives its own row in the TOS.</p>
                  </div>
                  <Button type="button" variant="outline" onClick={addCompetency} disabled={form.competencies.length >= 20} className="gap-2"><Plus className="h-4 w-4" aria-hidden="true" />Add competency</Button>
                </div>
                <div className="mt-4 space-y-3">
                  {form.competencies.map((competency, index) => (
                    <div key={competencyIds[index]} className="grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start">
                      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">C{index + 1}</span>
                      <div>
                        <Label htmlFor={`assessment-competency-${index + 1}`} className="sr-only">Competency {index + 1}</Label>
                        <Textarea id={`assessment-competency-${index + 1}`} value={competency} onChange={(event) => updateCompetency(index, event.target.value)} placeholder="Enter the exact competency" rows={2} required />
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeCompetency(index)} disabled={form.competencies.length === 1} aria-label={`Remove competency ${index + 1}`}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="font-display text-2xl font-semibold text-foreground">Test parts</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">Create Test 1, Test 2, or more. Multiple choice questions always receive four answer options.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">Current total <strong className="font-display text-2xl text-primary tabular-nums">{totalItems}</strong></span>
                    <Button type="button" variant="outline" onClick={addPart} disabled={form.testParts.length >= 10} className="gap-2"><Plus className="h-4 w-4" aria-hidden="true" />Add test part</Button>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {form.testParts.map((part, index) => (
                    <fieldset key={part.id} className="rounded-xl border border-border bg-card p-4 sm:p-5">
                      <legend className="px-2 text-sm font-semibold text-primary">Part {index + 1}</legend>
                      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(13rem,1fr)_8rem_auto] md:items-end">
                        <div className="space-y-2">
                          <Label htmlFor={`assessment-part-title-${index + 1}`}>Part title</Label>
                          <Input id={`assessment-part-title-${index + 1}`} value={part.title} onChange={(event) => updatePart(part.id, "title", event.target.value)} placeholder={`Test ${index + 1}`} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`assessment-part-type-${index + 1}`}>Question type</Label>
                          <Select value={part.type} onValueChange={(value) => updatePart(part.id, "type", value as QuestionType)}>
                            <SelectTrigger id={`assessment-part-type-${index + 1}`}><SelectValue /></SelectTrigger>
                            <SelectContent>{QUESTION_TYPE_OPTIONS.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`assessment-part-count-${index + 1}`}>No. of items</Label>
                          <Input id={`assessment-part-count-${index + 1}`} type="number" min="1" max="60" inputMode="numeric" value={part.itemCount} onChange={(event) => updatePart(part.id, "itemCount", Number(event.target.value))} required />
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removePart(part.id)} disabled={form.testParts.length === 1} aria-label={`Remove ${part.title}`}>
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </fieldset>
                  ))}
                </div>
              </section>

              <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm leading-6 text-foreground">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
                  <p>AI may draft items and prompts, but it must not replace curriculum alignment or professional judgment. Do not enter learner names or other personal learner data.</p>
                </div>
              </div>

              {errorMessage ? (
                <div role="alert" aria-live="assertive" className="rounded-xl border border-destructive/35 bg-destructive/5 p-4 text-sm font-medium text-destructive">
                  {errorMessage}
                </div>
              ) : null}

            </form>
          )}
        </div>

        {!loading && !result ? (
          <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-border bg-card px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-12px_30px_rgba(20,32,25,0.08)] sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:pb-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" form="assessment-generator-form" className="w-full gap-2 sm:w-auto sm:min-w-72">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {isQuiz ? "Generate quiz and answer key" : "Generate TOS, questions, and answer key"}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default AssessmentGeneratorDialog;
