import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  GraduationCap,
  ListChecks,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const generators = [
  {
    id: "weelmat",
    number: "01",
    icon: FileText,
    title: "Weekly Learning Matrix",
    description: "Build a five-day learner roadmap from your DLP, DLL, or learning material.",
    features: ["Monday–Friday matrix", "Editable competencies", "Teacher and learner files"],
    route: "/premium/weelmat",
    action: "Create a WeeLMat",
  },
  {
    id: "lesson-plan",
    number: "02",
    icon: GraduationCap,
    title: "Lesson Plan",
    description: "Prepare a structured lesson-plan draft following the details you provide.",
    features: ["DepEd-oriented structure", "Learning activities", "Assessment guidance"],
    route: "/premium/lesson-plan",
    action: "Create a lesson plan",
  },
  {
    id: "periodical-test",
    number: "03",
    icon: ClipboardList,
    title: "Summative Test & Term Examination",
    description: "Generate the Table of Specifications, grade-appropriate test questions, and answer key in one editable package.",
    features: ["Question distribution", "Answer key", "Competency alignment"],
    route: "/premium/periodical-test",
    action: "Create an assessment package",
  },
  {
    id: "quiz",
    number: "04",
    icon: ListChecks,
    title: "Quiz",
    description: "Create a focused, competency-aligned classroom quiz and teacher answer key.",
    features: ["Up to 20 items", "Flexible question formats", "Answer key"],
    route: "/premium/quiz",
    action: "Create a quiz",
  },
];

const WeeLMatGeneratorPremium = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Generator Suite - WeeLMat";
    const metaDescription = document.querySelector('meta[name="description"]');
    metaDescription?.setAttribute("content", "Choose a WeeLMat, lesson plan, or periodical test generator.");
  }, []);

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-background py-8 sm:py-12">
      <div className="container max-w-6xl">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-8 -ml-3 gap-2 text-foreground/70 hover:bg-primary/5 hover:text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to dashboard
        </Button>

        <header className="grid gap-6 border-b border-border pb-9 lg:grid-cols-[1fr_.55fr] lg:items-end">
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">Choose what you need to prepare.</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
              One focused workspace for weekly matrices, lesson plans, and periodical assessments.
            </p>
          </div>
          <p className="max-w-md border-l-2 border-secondary pl-5 text-sm leading-6 text-muted-foreground lg:justify-self-end">
            Each generator creates an editable draft. Review content, references, difficulty, and learner suitability before use.
          </p>
        </header>

        <section className="divide-y divide-border" aria-label="Available generators">
          {generators.map(({ id, number, icon: Icon, title, description, features, route, action }) => (
            <article key={id} className="group grid gap-5 py-8 first:pt-10 md:grid-cols-[4rem_4rem_minmax(0,1fr)_minmax(15rem,.7fr)_auto] md:items-center">
              <span className="font-display text-2xl font-semibold text-secondary" aria-hidden="true">{number}</span>
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-card text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">{title}</h2>
                <p className="mt-2 max-w-xl leading-7 text-muted-foreground">{description}</p>
              </div>
              <ul className="grid gap-2 text-sm text-foreground/75">
                {features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button onClick={() => navigate(route)} className="group/button w-full gap-2 md:w-auto" aria-label={action}>
                Open
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover/button:translate-x-1" aria-hidden="true" />
              </Button>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
};

export default WeeLMatGeneratorPremium;
