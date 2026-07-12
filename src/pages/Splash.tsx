import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";

const Splash = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const resolveDestination = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!active) return;

      if (error) {
        console.error("Unable to restore the current session:", error);
        navigate("/home", { replace: true });
        return;
      }

      navigate(session ? "/dashboard" : "/home", { replace: true });
    };

    void resolveDestination();

    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <main
      className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#173F2A] px-6 py-12 text-[#F6F0E7]"
      aria-busy="true"
    >
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-20" aria-hidden="true" />
      <div className="relative flex max-w-sm flex-col items-center text-center" role="status" aria-live="polite">
        <span className="flex h-28 w-48 items-center justify-center overflow-hidden rounded-xl border border-[#D6A73D]/35 bg-[#F6F0E7] p-2 shadow-[0_22px_55px_rgba(0,0,0,0.22)]">
          <img
            src="/weelmat-logo.png"
            alt="WeeLMat Weekly Learning Matrix Generator"
            width="720"
            height="400"
            className="h-auto w-full object-contain"
          />
        </span>
        <h1 className="mt-7 font-display text-3xl font-semibold leading-tight">
          Preparing your workspace
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#F6F0E7]/75">
          Restoring your WeeLMat session…
        </p>
        <span
          className="mt-7 h-8 w-8 animate-spin rounded-full border-2 border-[#F6F0E7]/25 border-t-[#D6A73D]"
          aria-hidden="true"
        />
      </div>
    </main>
  );
};

export default Splash;
