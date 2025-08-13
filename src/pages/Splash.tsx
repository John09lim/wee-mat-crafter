import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const Splash = () => {
  const navigate = useNavigate();
  const sessionRef = useRef<Session | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Only synchronous state updates here to avoid deadlocks
      sessionRef.current = session;
    });

    // Initialize session after setting the listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      sessionRef.current = session;
    });

    const timer = setTimeout(() => {
      const session = sessionRef.current;
      navigate(session ? "/dashboard" : "/home", { replace: true });
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <main className="min-h-screen bg-primary text-primary-foreground flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <img
          src="https://raw.githubusercontent.com/John09lim/wee-mat-crafter/main/public/Screenshot%202025-08-11%20074334.png"
          alt="WeeLMat school logo"
          className="h-28 w-auto rounded-xl shadow-md bg-primary-foreground/0 object-contain"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/Screenshot%202025-08-11%20074334.png";
          }}
        />
        <h1 className="text-3xl font-semibold leading-tight">WeeLMat</h1>
        <p className="text-lg text-primary-foreground/90 -mt-2">Weekly Learning Matrix</p>
      </div>
    </main>
  );
};

export default Splash;
