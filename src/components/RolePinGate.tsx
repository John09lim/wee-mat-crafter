import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { rolePinStorageKey, type ProtectedRole } from "@/lib/rolePin";
import { supabase } from "@/integrations/supabase/client";
import { PageLoader } from "@/components/system/PageLoader";

type RolePinGateProps = {
  role: ProtectedRole;
  children: ReactNode;
};

export const RolePinGate = ({ role, children }: RolePinGateProps) => {
  const location = useLocation();
  const [sessionState, setSessionState] = useState<"loading" | "signed-in" | "signed-out">("loading");
  const verified = sessionStorage.getItem(rolePinStorageKey(role)) === "true";

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setSessionState(data.session ? "signed-in" : "signed-out");
    });
    return () => {
      active = false;
    };
  }, []);

  if (sessionState === "loading") {
    return <PageLoader />;
  }

  if (sessionState === "signed-out") {
    return <Navigate to={role === "principal" ? "/principal" : "/supervisor"} replace state={{ from: location.pathname }} />;
  }

  if (!verified) {
    return <Navigate to="/role-dashboard" replace state={{ requestedRole: role, from: location.pathname }} />;
  }

  return <>{children}</>;
};
