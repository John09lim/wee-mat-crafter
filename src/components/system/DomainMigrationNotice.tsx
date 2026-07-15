import { ArrowRight, CheckCircle2, Globe2 } from "lucide-react";

const LEGACY_HOSTS = new Set([
  "weelmatgenerator.online",
  "www.weelmatgenerator.online",
]);

export const isLegacyDomain = () =>
  typeof window !== "undefined" && LEGACY_HOSTS.has(window.location.hostname.toLowerCase());

const getNewDomainUrl = () => {
  const nextUrl = new URL(window.location.href);
  nextUrl.protocol = "https:";
  nextUrl.hostname = "weelmatgenerator.com";
  nextUrl.port = "";
  return nextUrl.toString();
};

const AVAILABLE_TOOLS = [
  "WeeLMat Generator",
  "ILAW Lesson Plan Generator",
  "Summative Test and Term Examination",
  "Quiz Generator",
];

export const DomainMigrationNotice = () => {
  if (!isLegacyDomain()) {
    return null;
  }

  return (
    <main className="relative flex min-h-dvh items-center overflow-hidden bg-forest px-4 py-8 text-primary-foreground sm:px-6 sm:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,hsl(var(--secondary)/0.22),transparent_32%),radial-gradient(circle_at_90%_90%,hsl(var(--primary)/0.38),transparent_38%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-1/2 size-64 -translate-y-1/2 rounded-full border border-secondary/15 sm:size-96"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 top-12 size-48 rounded-full border border-paper/10 sm:size-72"
      />

      <section
        aria-labelledby="migration-title"
        className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-paper/20 bg-paper text-foreground shadow-2xl sm:rounded-3xl"
      >
        <div className="grid lg:grid-cols-[1.35fr_0.65fr]">
          <div className="px-6 py-8 sm:px-10 sm:py-12 lg:px-14 lg:py-16">
            <div className="mb-10 flex items-center gap-3 sm:mb-14">
              <img
                src="/weelmat-logo.png"
                alt="WeeLMat Generator"
                className="h-12 w-auto rounded-lg object-contain sm:h-14"
              />
              <div className="border-l border-border pl-3">
                <p className="font-display text-lg font-semibold leading-none text-forest">Generator</p>
                <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-secondary-foreground">
                  Plan with clarity
                </p>
              </div>
            </div>

            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-forest">
              <Globe2 className="size-4 text-secondary-foreground" aria-hidden="true" />
              Official website update
            </div>

            <h1
              id="migration-title"
              className="max-w-3xl font-display text-4xl font-semibold leading-[1.04] text-forest sm:text-5xl lg:text-6xl"
            >
              WeeLMat Generator has moved.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              <strong className="font-semibold text-foreground">weelmatgenerator.online</strong> is
              now a notice-only page. Sign-in, generation, dashboards, and submissions are available
              exclusively at our new official website.
            </p>

            <div className="my-7 flex flex-col gap-2 rounded-xl border border-border bg-background/70 p-4 text-sm sm:my-8 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <span className="text-muted-foreground line-through">weelmatgenerator.online</span>
              <ArrowRight className="size-4 rotate-90 text-secondary sm:rotate-0" aria-hidden="true" />
              <span className="font-bold text-forest">weelmatgenerator.com</span>
            </div>

            <a
              href={getNewDomainUrl()}
              className="inline-flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-forest px-6 py-3.5 text-base font-bold text-primary-foreground shadow-lg transition-colors duration-200 hover:bg-forest/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-4 sm:w-auto"
            >
              Continue to weelmatgenerator.com
              <ArrowRight className="size-5" aria-hidden="true" />
            </a>

            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Please update your bookmark to the new <strong>.com</strong> address.
            </p>
          </div>

          <aside className="border-t border-forest/20 bg-forest px-6 py-8 text-primary-foreground sm:px-10 sm:py-10 lg:border-l lg:border-t-0 lg:px-9 lg:py-16">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">
              Available on the new website
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold leading-tight sm:text-3xl">
              All your teaching tools, in one official home.
            </h2>
            <ul className="mt-8 space-y-5" aria-label="Tools available on weelmatgenerator.com">
              {AVAILABLE_TOOLS.map((tool) => (
                <li key={tool} className="flex items-start gap-3 text-sm leading-relaxed text-primary-foreground/85">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-secondary" aria-hidden="true" />
                  <span>{tool}</span>
                </li>
              ))}
            </ul>
            <div className="mt-10 border-t border-paper/15 pt-6">
              <p className="text-xs leading-relaxed text-primary-foreground/60">
                The former website no longer accepts account access or document submissions.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
};
