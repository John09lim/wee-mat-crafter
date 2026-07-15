import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { Route, Routes, useLocation } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  shouldRenderAppFooter,
  shouldRenderHeader,
} from "@/components/layout/routeChrome";
import { RolePinGate } from "@/components/RolePinGate";
import { PageLoader } from "@/components/system/PageLoader";
import {
  DomainMigrationNotice,
  isLegacyDomain,
} from "@/components/system/DomainMigrationNotice";
import { RouteChangeManager } from "@/components/system/RouteChangeManager";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

const Splash = lazy(() => import("./pages/Splash"));
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const AuthSchoolHead = lazy(() => import("./pages/AuthSchoolHead"));
const AuthSupervisor = lazy(() => import("./pages/AuthSupervisor"));
const PrincipalLanding = lazy(() => import("./pages/PrincipalLanding"));
const SupervisorLanding = lazy(() => import("./pages/SupervisorLanding"));
const LearnMore = lazy(() => import("./pages/LearnMore"));
const RoleDashboard = lazy(() => import("./pages/RoleDashboard"));
const ParentDashboard = lazy(() => import("./pages/ParentDashboard"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const WeeLMatGenerator = lazy(() => import("./pages/WeeLMatGenerator"));
const WeeLMatGeneratorWeeLMat = lazy(() => import("./pages/WeeLMatGeneratorWeeLMat"));
const WeeLMatGeneratorPremium = lazy(() => import("./pages/WeeLMatGeneratorPremium"));
const LessonPlanGenerator = lazy(() => import("./pages/LessonPlanGenerator"));
const PeriodicalTestGenerator = lazy(() => import("./pages/PeriodicalTestGenerator"));
const QuizGenerator = lazy(() => import("./pages/QuizGenerator"));
const MyAccount = lazy(() => import("./pages/MyAccount"));
const ILAWLessonPlan = lazy(() => import("./pages/ILAWLessonPlan"));
const TeacherSubmission = lazy(() => import("./pages/TeacherSubmission"));
const PrincipalDashboard = lazy(() => import("./pages/PrincipalDashboard"));
const SupervisorDashboard = lazy(() => import("./pages/SupervisorDashboard"));
const WeeLMatHistory = lazy(() => import("./pages/WeeLMatHistory"));
const PublicSchoolStatus = lazy(() => import("./pages/PublicSchoolStatus"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Splash />} />
    <Route path="/home" element={<Index />} />
    <Route path="/auth" element={<Auth />} />
    <Route path="/auth-school-head" element={<AuthSchoolHead />} />
    <Route path="/auth-supervisor" element={<AuthSupervisor />} />
    <Route path="/principal" element={<PrincipalLanding />} />
    <Route path="/supervisor" element={<SupervisorLanding />} />
    <Route path="/learn-more" element={<LearnMore />} />
    <Route path="/role-dashboard" element={<RoleDashboard />} />
    <Route path="/parent-dashboard" element={<ParentDashboard />} />
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/create-weelmat" element={<Dashboard />} />
    <Route path="/weelmatgenerator" element={<WeeLMatGenerator />} />
    <Route path="/premium" element={<WeeLMatGeneratorPremium />} />
    <Route path="/premium/weelmat" element={<Dashboard isPremium />} />
    <Route path="/premium/weelmat/result" element={<WeeLMatGeneratorWeeLMat />} />
    <Route path="/premium/lesson-plan" element={<LessonPlanGenerator />} />
    <Route path="/premium/periodical-test" element={<PeriodicalTestGenerator />} />
    <Route path="/premium/quiz" element={<QuizGenerator />} />
    <Route path="/my-account" element={<MyAccount />} />
    <Route path="/ilaw-lesson-plan" element={<ILAWLessonPlan />} />
    <Route path="/teacher-submission" element={<TeacherSubmission />} />
    <Route
      path="/principal-dashboard"
      element={
        <RolePinGate role="principal">
          <PrincipalDashboard />
        </RolePinGate>
      }
    />
    <Route
      path="/supervisor-dashboard"
      element={
        <RolePinGate role="supervisor">
          <SupervisorDashboard />
        </RolePinGate>
      }
    />
    <Route path="/weelmat-history" element={<WeeLMatHistory />} />
    <Route path="/school-status/:schoolName" element={<PublicSchoolStatus />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => {
  const location = useLocation();
  const showHeader = shouldRenderHeader(location.pathname);
  const showFooter = shouldRenderAppFooter(location.pathname);

  if (isLegacyDomain()) {
    return (
      <MotionConfig reducedMotion="user">
        <DomainMigrationNotice />
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <div className="flex min-h-dvh min-w-0 flex-col">
            {showHeader ? <Header /> : null}
            <RouteChangeManager />
            <div id="main-content" className="min-w-0 flex-1" tabIndex={-1}>
              <Suspense fallback={<PageLoader />}>
                <AppRoutes />
              </Suspense>
            </div>
            {showFooter ? <Footer /> : null}
          </div>
        </TooltipProvider>
      </QueryClientProvider>
    </MotionConfig>
  );
};

export default App;
