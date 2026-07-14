import { useEffect, useState } from "react";
import { ArrowRight, ListChecks } from "lucide-react";

import AssessmentGeneratorDialog from "@/features/assessment-generator/AssessmentGeneratorDialog";
import { GeneratorShell } from "@/components/workspace/GeneratorShell";
import { Button } from "@/components/ui/button";

const QuizGenerator = () => {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    document.title = "Quiz Generator - WeeLMat";
    document.querySelector('meta[name="description"]')?.setAttribute(
      "content",
      "Generate a focused, competency-aligned classroom quiz and answer key.",
    );
  }, []);

  return (
    <GeneratorShell
      icon={ListChecks}
      title="Quiz Generator"
      description="Create a focused classroom quiz from the competencies you have already taught."
      asideItems={[
        "Choose one or more question formats and up to 20 total items.",
        "Keep every question aligned with the competencies you enter.",
        "Review the generated questions, choices, answers, and scoring guidance before use.",
      ]}
    >
      <AssessmentGeneratorDialog open={open} onOpenChange={setOpen} mode="quiz" />
      <div className="flex min-h-[28rem] flex-col items-center justify-center rounded-xl border border-border bg-card p-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ListChecks className="h-8 w-8" aria-hidden="true" />
        </span>
        <h2 className="font-display mt-6 text-3xl font-semibold text-foreground">Build a focused classroom quiz.</h2>
        <p className="mt-3 max-w-xl leading-7 text-muted-foreground">
          Enter the class details and competencies, select the question formats and item counts, then generate the quiz and teacher answer key together.
        </p>
        <Button type="button" onClick={() => setOpen(true)} className="mt-7 gap-2">
          Open quiz generator
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </GeneratorShell>
  );
};

export default QuizGenerator;
