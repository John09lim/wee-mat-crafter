import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { getRouteChrome } from "@/components/layout/routeChrome";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  to: string;
  primary?: boolean;
  back?: boolean;
};

type HeaderNavLinkProps = NavItem & {
  currentPath: string;
  indicatorLayoutId: string;
  onClick?: () => void;
  reducedMotion: boolean;
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-forest";

const HeaderNavLink = ({
  label,
  to,
  primary = false,
  back = false,
  currentPath,
  indicatorLayoutId,
  onClick,
  reducedMotion,
}: HeaderNavLinkProps) => {
  const isActive = currentPath === to || (to !== "/home" && currentPath.startsWith(`${to}/`));

  return (
    <Link
      to={to}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        focusRing,
        "group relative flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-200",
        primary
          ? isActive
            ? "border border-secondary bg-secondary text-secondary-foreground"
            : "border border-secondary/75 bg-paper/[0.04] text-primary-foreground hover:border-secondary hover:bg-secondary hover:text-secondary-foreground"
          : isActive
            ? "bg-paper/10 text-primary-foreground"
            : "text-primary-foreground/80 hover:bg-paper/[0.07] hover:text-primary-foreground",
      )}
    >
      {back ? <ArrowLeft className="size-4" aria-hidden="true" /> : null}
      {primary ? <LayoutDashboard className="size-4" aria-hidden="true" /> : null}
      <span>{label}</span>
      {isActive && !primary ? (
        <motion.span
          layoutId={indicatorLayoutId}
          className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-secondary"
          transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 30 }}
          aria-hidden="true"
        />
      ) : null}
    </Link>
  );
};

const Header = () => {
  const location = useLocation();
  const routeChrome = getRouteChrome(location.pathname);
  const reducedMotion = useReducedMotion() ?? false;
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadUserRole = async (userId: string | null) => {
      if (!userId) {
        if (!cancelled) {
          setUserRole(null);
          setLoading(false);
        }
        return;
      }

      if (!cancelled) setLoading(true);
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).single();

      if (!cancelled) {
        setUserRole(data?.role ?? null);
        setLoading(false);
      }
    };

    void supabase.auth.getUser().then(({ data }) => loadUserRole(data.user?.id ?? null));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => void loadUserRole(session?.user.id ?? null), 0);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  const navItems = useMemo<NavItem[]>(() => {
    if (routeChrome === "auth") {
      return [];
    }

    if (routeChrome === "marketing") {
      return [
        { label: "Home", to: "/home" },
        { label: "Learn more", to: "/learn-more" },
        { label: "Dashboard", to: "/role-dashboard", primary: true },
      ];
    }

    if (userRole === "teacher") {
      return [
        { label: "My account", to: "/my-account" },
        { label: "History", to: "/weelmat-history" },
        { label: "Create WeeLMat", to: "/dashboard", primary: true },
      ];
    }

    if (userRole === "school_head") {
      return [
        { label: "My account", to: "/my-account" },
        { label: "Principal workspace", to: "/principal-dashboard", primary: true },
      ];
    }

    if (userRole === "supervisor") {
      return [
        { label: "My account", to: "/my-account" },
        { label: "Supervisor workspace", to: "/supervisor-dashboard", primary: true },
      ];
    }

    return [
      { label: "Home", to: "/home" },
      { label: "Choose dashboard", to: "/role-dashboard", primary: true },
    ];
  }, [routeChrome, userRole]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserRole(null);
    window.location.assign("/");
  };

  const renderLinks = (indicatorLayoutId: string, closeAfterClick = false) =>
    navItems.map((item) => (
      <HeaderNavLink
        key={`${item.to}-${item.label}`}
        {...item}
        currentPath={location.pathname}
        indicatorLayoutId={indicatorLayoutId}
        reducedMotion={reducedMotion}
        onClick={closeAfterClick ? () => setMenuOpen(false) : undefined}
      />
    ));

  const hasMobileMenu = navItems.length > 0 || Boolean(userRole);

  return (
    <header className="sticky top-0 z-40 border-b border-secondary/25 bg-forest text-primary-foreground shadow-header">
      <div className="container flex min-h-16 items-center gap-3 py-2">
        <Link
          to="/home"
          aria-label="WeeLMat Generator home"
          className={cn(focusRing, "mr-auto flex min-h-12 min-w-0 cursor-pointer items-center rounded-lg")}
        >
          <span className="flex h-12 w-[5.5rem] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-secondary/30 bg-background px-1 shadow-sm sm:w-24">
            <img
              src="/weelmat-logo.png"
              alt="WeeLMat Weekly Learning Matrix"
              width="720"
              height="400"
              className="h-auto w-full object-contain"
              loading="eager"
            />
          </span>
          <span className="ml-3 hidden border-l border-secondary/40 pl-3 sm:block">
            <span className="block font-display text-sm font-semibold leading-tight text-primary-foreground">Generator</span>
            <span className="mt-0.5 block text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-secondary">
              Plan with clarity
            </span>
          </span>
        </Link>

        <div className="hidden min-h-11 min-w-0 items-center justify-end md:flex">
          {loading && routeChrome === "workspace" ? (
            <div className="flex h-11 items-center gap-3" aria-label="Loading navigation" aria-busy="true">
              <span className="h-2 w-16 animate-pulse rounded-full bg-paper/10 motion-reduce:animate-none" />
              <span className="h-11 w-28 animate-pulse rounded-lg border border-secondary/15 bg-paper/[0.04] motion-reduce:animate-none" />
            </div>
          ) : (
            <nav aria-label="Main navigation" className="flex items-center justify-end gap-1.5">
              {renderLinks("header-active-route-desktop")}
              {userRole ? (
                <motion.button
                  type="button"
                  onClick={handleLogout}
                  whileTap={reducedMotion ? undefined : { scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 390, damping: 30 }}
                  className={cn(
                    focusRing,
                    "ml-1 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-primary-foreground/75 transition-colors duration-200 hover:bg-paper/[0.07] hover:text-primary-foreground",
                  )}
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  Sign out
                </motion.button>
              ) : null}
            </nav>
          )}
        </div>

        {hasMobileMenu ? (
          <button
            type="button"
            className={cn(
              focusRing,
              "flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-secondary/45 text-primary-foreground transition-colors duration-200 hover:border-secondary hover:bg-paper/[0.07] md:hidden",
            )}
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={menuOpen ? "close" : "menu"}
                initial={reducedMotion ? false : { opacity: 0, rotate: menuOpen ? -20 : 20, scale: 0.85 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={reducedMotion ? undefined : { opacity: 0, rotate: menuOpen ? 20 : -20, scale: 0.85 }}
                transition={{ duration: reducedMotion ? 0 : 0.16 }}
                className="flex"
              >
                {menuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
              </motion.span>
            </AnimatePresence>
          </button>
        ) : null}
      </div>

      <AnimatePresence initial={false}>
        {menuOpen ? (
          <motion.nav
            id="mobile-navigation"
            aria-label="Mobile navigation"
            initial={reducedMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: reducedMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 top-full border-t border-secondary/20 bg-forest px-4 pb-5 pt-3 shadow-header md:hidden"
          >
            <div className="container flex flex-col gap-1 p-0">
              {loading && routeChrome === "workspace" ? (
                <p className="flex min-h-11 items-center px-3 text-sm text-primary-foreground/65" role="status">
                  Loading navigation…
                </p>
              ) : (
                <>
                  {renderLinks("header-active-route-mobile", true)}
                  {userRole ? (
                    <motion.button
                      type="button"
                      onClick={handleLogout}
                      whileTap={reducedMotion ? undefined : { scale: 0.98 }}
                      className={cn(
                        focusRing,
                        "mt-2 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-primary-foreground/15 px-3 py-2 text-sm font-semibold text-primary-foreground/80 transition-colors duration-200 hover:bg-paper/[0.07] hover:text-primary-foreground",
                      )}
                    >
                      <LogOut className="size-4" aria-hidden="true" />
                      Sign out
                    </motion.button>
                  ) : null}
                </>
              )}
            </div>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </header>
  );
};

export default Header;
