import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type WorkspacePageProps = {
  header: ReactNode;
  children: ReactNode;
  navigation?: ReactNode;
  aside?: ReactNode;
  className?: string;
  contentClassName?: string;
};

export const WorkspacePage = ({
  header,
  children,
  navigation,
  aside,
  className,
  contentClassName,
}: WorkspacePageProps) => (
  <main className={cn("min-h-[calc(100dvh-4rem)] bg-background text-foreground", className)}>
    {navigation ? <div className="border-b border-border bg-paper">{navigation}</div> : null}
    <div className="container max-w-[90rem] py-8 sm:py-10">
      {header}
      <div
        className={cn(
          "mt-8 grid min-w-0 gap-8",
          aside && "xl:grid-cols-[minmax(0,1fr)_20rem]",
          contentClassName,
        )}
      >
        <div className="min-w-0">{children}</div>
        {aside ? <aside className="min-w-0 xl:sticky xl:top-24 xl:self-start">{aside}</aside> : null}
      </div>
    </div>
  </main>
);

