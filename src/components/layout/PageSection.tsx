import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageSectionProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  surface?: boolean;
};

export const PageSection = ({
  title,
  description,
  actions,
  children,
  surface = false,
  className,
  ...props
}: PageSectionProps) => (
  <section
    className={cn(
      "py-8 sm:py-10",
      surface && "rounded-xl border border-border bg-paper px-5 shadow-paper sm:px-7",
      className,
    )}
    {...props}
  >
    {title || description || actions ? (
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {title ? <h2 className="font-display text-2xl font-semibold text-forest sm:text-3xl">{title}</h2> : null}
          {description ? <div className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">{description}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
      </div>
    ) : null}
    {children}
  </section>
);

