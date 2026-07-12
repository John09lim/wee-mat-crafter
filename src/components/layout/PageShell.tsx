import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageTone = "cream" | "paper" | "white" | "forest";
type PageWidth = "reading" | "workspace" | "wide" | "full";

const toneClasses: Record<PageTone, string> = {
  cream: "bg-background text-foreground",
  paper: "bg-paper text-foreground",
  white: "bg-white text-foreground",
  forest: "bg-forest text-primary-foreground",
};

const widthClasses: Record<PageWidth, string> = {
  reading: "max-w-4xl",
  workspace: "max-w-6xl",
  wide: "max-w-7xl",
  full: "max-w-none",
};

type PageShellProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  tone?: PageTone;
  width?: PageWidth;
  contained?: boolean;
};

export const PageShell = ({
  children,
  tone = "cream",
  width = "wide",
  contained = true,
  className,
  ...props
}: PageShellProps) => (
  <main className={cn("min-h-[calc(100dvh-4rem)]", toneClasses[tone], className)} {...props}>
    {contained ? (
      <div className={cn("container py-10 sm:py-12 lg:py-16", widthClasses[width])}>{children}</div>
    ) : (
      children
    )}
  </main>
);

