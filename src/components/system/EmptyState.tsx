import type { LucideIcon } from "lucide-react";
import { FileText } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
};

export const EmptyState = ({
  title,
  description,
  icon: Icon = FileText,
  action,
  compact = false,
  className,
}: EmptyStateProps) => (
  <section
    className={cn(
      "flex flex-col items-center rounded-xl border border-dashed border-border bg-paper text-center",
      compact ? "px-5 py-8" : "px-6 py-12 sm:px-10 sm:py-16",
      className,
    )}
    aria-label={title}
  >
    <span className="flex size-14 items-center justify-center rounded-full border border-secondary/35 bg-secondary/10 text-primary">
      <Icon className="size-6" aria-hidden="true" />
    </span>
    <h2 className="mt-5 font-display text-xl font-semibold text-forest">{title}</h2>
    <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>
    {action ? <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div> : null}
  </section>
);

