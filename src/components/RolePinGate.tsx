import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { rolePinStorageKey, type ProtectedRole } from "@/lib/rolePin";

type RolePinGateProps = {
  role: ProtectedRole;
  children: ReactNode;
};

export const RolePinGate = ({ role, children }: RolePinGateProps) => {
  const location = useLocation();
  const verified = sessionStorage.getItem(rolePinStorageKey(role)) === "true";

  if (!verified) {
    return <Navigate to="/role-dashboard" replace state={{ requestedRole: role, from: location.pathname }} />;
  }

  return <>{children}</>;
};
