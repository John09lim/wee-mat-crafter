import { useEffect, useState } from "react";
import { ArrowRight, ClipboardCheck } from "lucide-react";

import AssessmentGeneratorDialog from "@/features/assessment-generator/AssessmentGeneratorDialog";
import { GeneratorShell } from "@/components/workspace/GeneratorShell";
import { Button } from "@/components/ui/button";

const PeriodicalTestGenerator = () => {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    document.title = "Summative Test & Term Examination Generator - WeeLMat";
    document.querySelector('meta[name="description"]')?.setAttribute(
      "content",
      "Generate a competency-aligned Table of Specifications, assessment questions, and answer key.",
    );
  }, []);

  return (
    <GeneratorShell
      icon={ClipboardCheck}
      title="Summative Test & Term Examination Generator"
      description="Create a grade-appropriate assessment package from the competencies you have already taught."
      asideItems={[
        "Item limits adjust to the selected grade level and assessment type.",
        "Add Test 1, Test 2, or more with different question formats.",
        "Review the generated TOS, questions, answers, and scoring criteria before use.",
      ]}
    >
      <AssessmentGeneratorDialog open={open} onOpenChange={setOpen} />
      <div className="flex min-h-[28rem] flex-col items-center justify-center rounded-xl border border-border bg-card p-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ClipboardCheck className="h-8 w-8" aria-hidden="true" />
        </span>
        <h2 className="font-display mt-6 text-3xl font-semibold text-foreground">Plan the complete assessment package.</h2>
        <p className="mt-3 max-w-xl leading-7 text-muted-foreground">
          Enter the class details, competencies, test parts, and item counts. WeeLMat will prepare the Table of Specifications, test paper, and answer key together.
        </p>
        <Button type="button" onClick={() => setOpen(true)} className="mt-7 gap-2">
          Open assessment generator
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </GeneratorShell>
  );
};

export default PeriodicalTestGenerator;
