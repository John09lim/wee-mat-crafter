import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, FileCheck2, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";

interface GeneratorShellProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
  backPath?: string;
  backLabel?: string;
  asideTitle?: string;
  asideItems?: string[];
}

export function GeneratorShell({
  icon: Icon,
  title,
  description,
  children,
  backPath = "/premium",
  backLabel = "Back to generators",
  asideTitle = "Before you generate",
  asideItems = [
    "Use the competency wording from your approved curriculum source.",
    "Review every AI-assisted draft before classroom use.",
    "Download the file only when the details are complete.",
  ],
}: GeneratorShellProps) {
  const navigate = useNavigate();

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-background py-8 sm:py-12">
      <div className="container max-w-7xl">
        <Button variant="ghost" onClick={() => navigate(backPath)} className="mb-7 -ml-3 gap-2 text-foreground/75 hover:bg-primary/5 hover:text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {backLabel}
        </Button>

        <header className="mb-8 grid gap-5 border-b border-border pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary text-primary-foreground shadow-sm">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
              <p className="mt-2 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">{description}</p>
            </div>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-secondary/40 bg-secondary/10 px-3 py-2 text-sm font-semibold text-foreground">
            <FileCheck2 className="h-4 w-4 text-primary" aria-hidden="true" />
            DepEd-aligned draft workflow
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-[0_18px_50px_-42px_rgba(20,32,25,.55)] sm:p-7 lg:p-8">
            {children}
          </section>

          <aside className="rounded-2xl border border-primary/15 bg-primary p-6 text-primary-foreground lg:sticky lg:top-24">
            <ShieldCheck className="h-7 w-7 text-secondary" aria-hidden="true" />
            <h2 className="font-display mt-4 text-2xl font-semibold">{asideTitle}</h2>
            <ol className="mt-6 space-y-5">
              {asideItems.map((item, index) => (
                <li key={item} className="grid grid-cols-[2rem_1fr] gap-3 text-sm leading-6 text-primary-foreground/85">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-secondary/60 font-semibold text-secondary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
            <p className="mt-7 border-t border-white/15 pt-5 text-xs leading-5 text-primary-foreground/65">
              AI supports preparation. Teacher judgment remains responsible for accuracy, suitability, and learner needs.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
