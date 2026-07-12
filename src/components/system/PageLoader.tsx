import { LoaderCircle } from "lucide-react";

export const PageLoader = () => (
  <div
    className="flex min-h-[55dvh] items-center justify-center bg-background px-4 py-16"
    role="status"
    aria-live="polite"
    aria-busy="true"
  >
    <div className="flex max-w-sm flex-col items-center text-center">
      <span className="flex size-14 items-center justify-center rounded-full border border-secondary/45 bg-paper text-primary shadow-paper">
        <LoaderCircle className="size-6 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      </span>
      <p className="mt-5 font-display text-xl font-semibold text-forest">Opening your WeeLMat workspace</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Preparing the page and your latest planning tools.</p>
    </div>
  </div>
);

