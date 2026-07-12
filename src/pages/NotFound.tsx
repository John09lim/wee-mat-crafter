import { useEffect } from "react";
import { ArrowLeft, FileQuestion, LayoutDashboard } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="relative flex min-h-[calc(100dvh-4rem)] items-center overflow-hidden bg-[#F6F0E7] px-4 py-16 text-[#142019] sm:px-6">
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-45" aria-hidden="true" />
      <div className="relative mx-auto grid w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-[#D8D0C4] bg-[#FFFCF7] shadow-[0_24px_70px_-40px_rgba(23,63,42,0.5)] lg:grid-cols-[0.72fr_1.28fr]">
        <div className="flex min-h-64 items-center justify-center bg-[#173F2A] p-8 text-[#F6F0E7] sm:p-12">
          <div className="text-center">
            <FileQuestion className="mx-auto h-14 w-14 text-[#D6A73D]" strokeWidth={1.5} aria-hidden="true" />
            <p className="mt-5 font-display text-7xl font-semibold tracking-[-0.06em] sm:text-8xl">404</p>
            <p className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-[#F6F0E7]/70">
              Page not found
            </p>
          </div>
        </div>

        <section className="flex items-center p-7 sm:p-12" aria-labelledby="not-found-heading">
          <div>
            <h1
              id="not-found-heading"
              className="font-display text-4xl font-semibold leading-tight tracking-[-0.035em] text-[#173F2A] sm:text-5xl"
            >
              This page is outside the weekly plan.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#5D675F]">
              The address may have changed or the page may no longer exist. Return home or choose the dashboard that fits your role.
            </p>
            <p className="mt-4 break-all rounded-lg border border-[#D8D0C4] bg-[#F8F3EB] px-4 py-3 font-mono text-xs text-[#69716C]">
              {location.pathname}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/home"
                className="inline-flex min-h-[3.25rem] cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#236130] px-6 py-3 text-sm font-bold text-white transition-colors duration-200 hover:bg-[#173F2A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6A73D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFCF7]"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Return home
              </Link>
              <Link
                to="/role-dashboard"
                className="inline-flex min-h-[3.25rem] cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#236130] bg-transparent px-6 py-3 text-sm font-bold text-[#236130] transition-colors duration-200 hover:bg-[#E7F0E6] hover:text-[#173F2A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#236130] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFCF7]"
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                Choose a dashboard
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default NotFound;
