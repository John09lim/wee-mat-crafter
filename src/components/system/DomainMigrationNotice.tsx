import { ArrowRight, Globe2 } from "lucide-react";

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

export const DomainMigrationNotice = () => {
  if (!isLegacyDomain()) {
    return null;
  }

  return (
    <aside
      aria-label="Website migration notice"
      className="relative z-50 border-b border-secondary/40 bg-forest px-4 py-3 text-primary-foreground shadow-sm sm:px-6"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground sm:mt-0">
            <Globe2 className="size-4" aria-hidden="true" />
          </span>
          <p className="text-sm leading-relaxed text-primary-foreground/90 sm:text-[0.95rem]">
            <strong className="font-bold text-primary-foreground">WeeLMat Generator has moved to weelmatgenerator.com.</strong>{" "}
            This <strong>.online</strong> website remains functional, but the <strong>.com</strong> address is now the official and latest version.
          </p>
        </div>

        <a
          href={getNewDomainUrl()}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-secondary/70 bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground transition-colors hover:bg-secondary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper focus-visible:ring-offset-2 focus-visible:ring-offset-forest"
        >
          Visit the new website
          <ArrowRight className="size-4" aria-hidden="true" />
        </a>
      </div>
    </aside>
  );
};
