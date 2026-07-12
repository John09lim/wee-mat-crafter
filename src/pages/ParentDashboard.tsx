import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  HeartHandshake,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const supportSteps = [
  {
    number: "01",
    icon: CalendarDays,
    title: "Review the week ahead",
    copy: "Read the planned competencies, activities, materials, and expected outputs with your learner.",
  },
  {
    number: "02",
    icon: BookOpenCheck,
    title: "Prepare the listed materials",
    copy: "Make modules, activity sheets, and other teacher-provided resources available before they are needed.",
  },
  {
    number: "03",
    icon: CheckCircle2,
    title: "Check manageable progress",
    copy: "Use the matrix as a daily checklist and encourage steady work without adding unnecessary tasks.",
  },
];

const ParentDashboard = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-background">
      <section className="border-b border-border py-12 sm:py-16">
        <div className="container max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[1fr_.78fr] lg:items-center">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/20 bg-card text-primary shadow-sm">
                <HeartHandshake className="h-6 w-6" aria-hidden="true" />
              </div>
              <h1 className="font-display mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Help your learner see the week clearly.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                WeeLMat gives families a simple view of the week so materials can be prepared, progress can be checked, and learning can continue during disruptions.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button onClick={() => navigate("/learn-more")} className="gap-2">
                  Learn how WeeLMat works
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button variant="outline" onClick={() => navigate("/role-dashboard")}>Choose another dashboard</Button>
              </div>
            </div>

            <aside className="relative overflow-hidden rounded-[1.75rem] border border-primary/15 bg-primary p-7 text-primary-foreground shadow-[0_28px_70px_-52px_rgba(20,32,25,.8)] sm:p-9">
              <ClipboardCheck className="h-8 w-8 text-secondary" aria-hidden="true" />
              <h2 className="font-display mt-5 text-3xl font-semibold">Your learner’s current matrix</h2>
              <p className="mt-3 leading-7 text-primary-foreground/80">
                No WeeLMat sharing link is connected to this browser yet. Ask the teacher or school for the current printed copy, file, QR code, or approved sharing link.
              </p>
              <div className="mt-7 border-t border-white/15 pt-6">
                <p className="text-sm font-semibold text-secondary">A WeeLMat should show</p>
                <ul className="mt-4 grid gap-3 text-sm text-primary-foreground/85">
                  <li className="flex gap-3"><span className="text-secondary">01</span> The week’s learning competencies</li>
                  <li className="flex gap-3"><span className="text-secondary">02</span> Daily activities and expected outputs</li>
                  <li className="flex gap-3"><span className="text-secondary">03</span> Materials for class or learning continuity</li>
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="bg-card py-12 sm:py-16" aria-labelledby="family-routine-heading">
        <div className="container max-w-7xl">
          <div className="grid gap-5 border-b border-border pb-8 md:grid-cols-[.75fr_1.25fr] md:items-end">
            <h2 id="family-routine-heading" className="font-display text-3xl font-semibold text-foreground sm:text-4xl">A simple family routine</h2>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground md:justify-self-end">
              The matrix supports the teacher’s plan. Families help by making that plan visible and manageable at home.
            </p>
          </div>

          <div className="divide-y divide-border md:grid md:grid-cols-3 md:divide-x md:divide-y-0">
            {supportSteps.map(({ number, icon: Icon, title, copy }) => (
              <article key={title} className="py-7 md:px-7 md:first:pl-0 md:last:pr-0">
                <div className="flex items-center justify-between">
                  <span className="font-display text-2xl font-semibold text-secondary">{number}</span>
                  <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <h3 className="font-display mt-7 text-2xl font-semibold text-foreground">{title}</h3>
                <p className="mt-3 leading-7 text-muted-foreground">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export default ParentDashboard;
