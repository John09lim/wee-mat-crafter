import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageHeaderProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  context?: ReactNode;
};

export const PageHeader = ({
  title,
  description,
  actions,
  context,
  className,
  ...props
}: PageHeaderProps) => (
  <header
    className={cn(
      "flex flex-col gap-6 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between sm:pb-8",
      className,
    )}
    {...props}
  >
    <div className="min-w-0">
      {context ? <div className="mb-3 text-sm font-semibold text-primary">{context}</div> : null}
      <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-forest sm:text-4xl lg:text-5xl">
        {title}
      </h1>
      {description ? (
        <div className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">{description}</div>
      ) : null}
    </div>
    {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
  </header>
);

