import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

const routeLabels: Record<string, string> = {
  "/home": "Home",
  "/learn-more": "Understanding WeeLMat",
  "/role-dashboard": "Dashboard selection",
  "/parent-dashboard": "Parent dashboard",
  "/auth": "Teacher sign in",
  "/auth-school-head": "School head sign in",
  "/auth-supervisor": "Supervisor sign in",
  "/principal": "School head portal",
  "/supervisor": "Supervisor portal",
  "/dashboard": "WeeLMat generator",
  "/weelmatgenerator": "Generated WeeLMat",
  "/premium": "Generator selection",
  "/premium/weelmat": "Premium WeeLMat generator",
  "/premium/weelmat/result": "Premium WeeLMat result",
  "/premium/lesson-plan": "Lesson plan generator",
  "/premium/periodical-test": "Periodical test generator",
  "/my-account": "My account",
  "/ilaw-lesson-plan": "ILAW lesson plan generator",
  "/teacher-submission": "Teacher submission",
  "/principal-dashboard": "Principal dashboard",
  "/supervisor-dashboard": "Supervisor dashboard",
  "/weelmat-history": "WeeLMat history",
};

const getRouteLabel = (pathname: string) => {
  if (pathname.startsWith("/school-status/")) return "School status";
  return routeLabels[pathname] ?? "Page";
};

export const RouteChangeManager = () => {
  const location = useLocation();
  const firstRender = useRef(true);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const hashTarget = location.hash
        ? document.getElementById(decodeURIComponent(location.hash.slice(1)))
        : null;

      if (hashTarget) {
        hashTarget.scrollIntoView({ block: "start", behavior: "auto" });
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }

      document.getElementById("main-content")?.focus({ preventScroll: true });
      setAnnouncement(`${getRouteLabel(location.pathname)} loaded`);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, location.pathname]);

  return (
    <p className="sr-only" aria-live="polite" aria-atomic="true">
      {announcement}
    </p>
  );
};
