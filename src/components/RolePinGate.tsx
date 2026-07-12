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
  const [sessionState, setSessionState] = useState<"loading" | "authorized" | "unauthorized" | "signed-out">("loading");
  const verified = sessionStorage.getItem(rolePinStorageKey(role)) === "true";

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      if (!data.session) {
        setSessionState("signed-out");
        return;
      }

      const expectedRole = role === "principal" ? "school_head" : "supervisor";
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.session.user.id)
        .eq("role", expectedRole)
        .maybeSingle();
      if (active) setSessionState(roleRow ? "authorized" : "unauthorized");
    });
    return () => {
      active = false;
    };
  }, [role]);

  if (sessionState === "loading") {
    return <PageLoader />;
  }

  if (sessionState === "signed-out" || sessionState === "unauthorized") {
    return <Navigate to={role === "principal" ? "/principal" : "/supervisor"} replace state={{ from: location.pathname }} />;
  }

  if (!verified) {
    return <Navigate to="/role-dashboard" replace state={{ requestedRole: role, from: location.pathname }} />;
  }

  return <>{children}</>;
};
