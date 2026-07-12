import { ArrowUpRight, LayoutDashboard } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { getRouteChrome, type RouteChrome } from "@/components/layout/routeChrome";
import { cn } from "@/lib/utils";

type FooterVariant = Exclude<RouteChrome, "splash">;

type FooterProps = {
  variant?: FooterVariant;
};

const darkFocus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-forest";

const footerLinkClass =
  "group inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md py-2 text-sm font-semibold text-primary-foreground/75 transition-colors duration-200 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-forest";

const BrandMark = ({ compact = false }: { compact?: boolean }) => (
  <Link
    to="/home"
    aria-label="WeeLMat Generator home"
    className={cn(darkFocus, "inline-flex cursor-pointer rounded-lg")}
  >
    <span
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-lg border border-secondary/35 bg-background shadow-sm",
        compact ? "h-12 w-24 px-1" : "h-[4.5rem] w-32 p-1.5",
      )}
    >
      <img
        src="/weelmat-logo.png"
        alt="WeeLMat Weekly Learning Matrix"
        width="720"
        height="400"
        className="h-auto w-full object-contain"
        loading="lazy"
      />
    </span>
  </Link>
);

const InstitutionalMark = ({ compact = false }: { compact?: boolean }) => (
  <div className={cn("flex max-w-sm items-center gap-4", !compact && "border-l border-secondary/40 pl-4")}>
    <img
      src="/sdo-negros-oriental-seal.jpg"
      alt="Department of Education Schools Division of Negros Oriental seal"
      width="443"
      height="443"
      className={cn(
        "shrink-0 rounded-full border-2 border-primary-foreground/85 bg-white object-cover",
        compact ? "size-11" : "size-16",
      )}
      loading="lazy"
    />
    <div>
      <p className="font-display text-base font-semibold leading-snug text-primary-foreground">Department of Education</p>
      <p className="mt-1 text-xs font-semibold uppercase leading-5 tracking-[0.08em] text-primary-foreground/65">
        Schools Division of Negros Oriental
      </p>
    </div>
  </div>
);

const MarketingFooter = () => (
  <footer className="border-t-4 border-secondary bg-forest text-primary-foreground">
    <div className="container grid gap-10 py-12 md:grid-cols-[1.15fr_.75fr_1fr] md:gap-8 lg:py-14">
      <div>
        <BrandMark />
        <p className="mt-5 max-w-sm font-display text-xl font-semibold leading-snug text-primary-foreground">
          Clearer weeks. Stronger learning continuity.
        </p>
        <p className="mt-3 max-w-sm text-sm leading-6 text-primary-foreground/70">
          An AI-assisted Weekly Learning Matrix generator designed to support Filipino educators while keeping teacher judgment at the center.
        </p>
      </div>

      <nav aria-label="Footer navigation">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Explore</p>
        <ul className="mt-3 grid grid-cols-2 gap-x-5 md:block">
          <li>
            <Link to="/home" className={footerLinkClass}>Home</Link>
          </li>
          <li>
            <Link to="/learn-more" className={footerLinkClass}>Learn about WeeLMat</Link>
          </li>
          <li>
            <Link to="/role-dashboard" className={footerLinkClass}>
              Choose a dashboard
              <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </li>
          <li>
            <Link to="/auth" className={footerLinkClass}>Teacher sign in</Link>
          </li>
        </ul>
      </nav>

      <div className="md:justify-self-end">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Institutional partner</p>
        <div className="mt-5">
          <InstitutionalMark />
        </div>
      </div>
    </div>

    <div className="border-t border-primary-foreground/15">
      <div className="container flex flex-col gap-2 py-5 text-xs leading-5 text-primary-foreground/60 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} WeeLMat Generator.</p>
        <p>Teacher judgment always comes first.</p>
      </div>
    </div>
  </footer>
);

const AuthFooter = () => (
  <footer className="border-t border-secondary/35 bg-forest text-primary-foreground">
    <div className="container flex flex-col gap-5 py-6 sm:flex-row sm:items-center sm:justify-between">
      <InstitutionalMark compact />
      <div className="flex flex-col gap-1 text-sm leading-6 text-primary-foreground/70 sm:text-right">
        <p className="font-display text-base font-semibold text-primary-foreground">Teacher judgment always comes first.</p>
        <p>Secure role access for the WeeLMat planning community.</p>
      </div>
    </div>
  </footer>
);

const WorkspaceFooter = () => (
  <footer className="border-t border-border bg-paper text-foreground">
    <div className="container flex flex-col gap-5 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <span className="flex h-10 w-20 items-center justify-center overflow-hidden rounded-md border border-border bg-background px-1">
          <img
            src="/weelmat-logo.png"
            alt="WeeLMat Weekly Learning Matrix"
            width="720"
            height="400"
            className="h-auto w-full object-contain"
            loading="lazy"
          />
        </span>
        <div>
          <p className="font-display text-sm font-semibold text-forest">Teacher judgment always comes first.</p>
          <p className="mt-0.5 text-xs text-muted-foreground">© {new Date().getFullYear()} WeeLMat Generator</p>
        </div>
      </div>
      <nav aria-label="Workspace footer navigation" className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Link
          to="/learn-more"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Guidance
        </Link>
        <Link
          to="/role-dashboard"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <LayoutDashboard className="size-4" aria-hidden="true" />
          Dashboards
        </Link>
      </nav>
    </div>
  </footer>
);

const Footer = ({ variant }: FooterProps) => {
  const location = useLocation();
  const resolvedVariant = variant ?? getRouteChrome(location.pathname);

  if (resolvedVariant === "auth") return <AuthFooter />;
  if (resolvedVariant === "workspace") return <WorkspaceFooter />;
  return <MarketingFooter />;
};

export default Footer;
