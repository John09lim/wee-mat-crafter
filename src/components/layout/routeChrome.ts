export type RouteChrome = "splash" | "marketing" | "auth" | "workspace";

const authRoutes = new Set([
  "/auth",
  "/auth-school-head",
  "/auth-supervisor",
]);

const marketingRoutes = new Set([
  "/home",
  "/learn-more",
  "/role-dashboard",
  "/parent-dashboard",
  "/principal",
  "/supervisor",
]);

const workspaceRoutes = new Set([
  "/dashboard",
  "/weelmatgenerator",
  "/premium",
  "/premium/weelmat",
  "/premium/weelmat/result",
  "/premium/lesson-plan",
  "/premium/periodical-test",
  "/my-account",
  "/ilaw-lesson-plan",
  "/teacher-submission",
  "/principal-dashboard",
  "/supervisor-dashboard",
  "/weelmat-history",
]);

export const getRouteChrome = (pathname: string): RouteChrome => {
  if (pathname === "/") return "splash";
  if (authRoutes.has(pathname)) return "auth";
  if (marketingRoutes.has(pathname)) return "marketing";
  if (workspaceRoutes.has(pathname) || pathname.startsWith("/school-status/")) {
    return "workspace";
  }

  return "marketing";
};

export const shouldRenderHeader = (pathname: string) => pathname !== "/";

export const shouldRenderAppFooter = (pathname: string) => pathname !== "/";
