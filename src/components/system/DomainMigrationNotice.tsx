import { ArrowUpRight, Globe2, Sparkles } from "lucide-react";

const LEGACY_HOSTS = new Set([
  "weelmatgenerator.online",
  "www.weelmatgenerator.online",
]);

const getNewDomainUrl = () => {
  const nextUrl = new URL(window.location.href);
  nextUrl.protocol = "https:";
  nextUrl.hostname = "weelmatgenerator.com";
  nextUrl.port = "";
  return nextUrl.toString();
};

export const DomainMigrationNotice = () => {
  if (typeof window === "undefined" || !LEGACY_HOSTS.has(window.location.hostname.toLowerCase())) {
    return null;
  }

  return (
    <aside
      aria-label="WeeLMat Generator domain migration notice"
      className="relative z-50 overflow-hidden border-b border-secondary/50 bg-forest text-primary-foreground shadow-header"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,hsl(var(--secondary)/0.22),transparent_30%),radial-gradient(circle_at_88%_80%,hsl(var(--primary)/0.34),transparent_34%)]"
      />

      <div className="container relative flex flex-col gap-4 py-4 sm:py-5 lg:flex-row lg:items-center lg:gap-6">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-secondary/50 bg-paper/10 text-secondary shadow-sm sm:size-12">
            <Globe2 className="size-5 sm:size-6" aria-hidden="true" />
          </span>

          <div className="min-w-0">
            <p className="mb-1 flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-secondary">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Important website update
            </p>
            <h2 className="font-display text-lg font-semibold leading-tight text-primary-foreground sm:text-xl">
              WeeLMat Generator has moved to{" "}
              <span className="whitespace-nowrap text-secondary">weelmatgenerator.com</span>
            </h2>
            <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-primary-foreground/75">
              Visit our new official home for the latest WeeLMat, ILAW Lesson Plan, Summative Test,
              Term Examination, and Quiz generators.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center lg:flex-col lg:items-end xl:flex-row">
          <p className="text-xs text-primary-foreground/60">
            <span className="line-through">weelmatgenerator.online</span>
            <span className="mx-2 text-secondary" aria-hidden="true">to</span>
            <span className="font-semibold text-primary-foreground">weelmatgenerator.com</span>
          </p>
          <a
            href={getNewDomainUrl()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-secondary bg-secondary px-4 py-2.5 text-sm font-bold text-secondary-foreground shadow-sm transition-colors hover:bg-secondary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper focus-visible:ring-offset-2 focus-visible:ring-offset-forest"
          >
            Go to the new website
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </aside>
  );
};
