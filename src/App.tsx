import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, useLocation } from "react-router-dom";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import LearnMore from "./pages/LearnMore";
import Dashboard from "./pages/Dashboard";
import Splash from "./pages/Splash";
import WeeLMatGenerator from "./pages/WeeLMatGenerator";
import WeeLMatGeneratorPremium from "./pages/WeeLMatGeneratorPremium";
import WeeLMatGeneratorWeeLMat from "./pages/WeeLMatGeneratorWeeLMat";
import LessonPlanGenerator from "./pages/LessonPlanGenerator";
import PeriodicalTestGenerator from "./pages/PeriodicalTestGenerator";
import { Navigate } from "react-router-dom";
import TeacherSubmission from "./pages/TeacherSubmission";
import PrincipalDashboard from "./pages/PrincipalDashboard";
import SupervisorDashboard from "./pages/SupervisorDashboard";
import WeeLMatHistory from "./pages/WeeLMatHistory";
import AuthSchoolHead from "./pages/AuthSchoolHead";
import AuthSupervisor from "./pages/AuthSupervisor";
import MyAccount from "./pages/MyAccount";
import PrincipalLanding from "./pages/PrincipalLanding";
import SupervisorLanding from "./pages/SupervisorLanding";
import PublicSchoolStatus from "./pages/PublicSchoolStatus";

const queryClient = new QueryClient();

const App = () => {
  const location = useLocation();
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {location.pathname !== "/" && <Header />}
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/home" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth-school-head" element={<AuthSchoolHead />} />
          <Route path="/auth-supervisor" element={<AuthSupervisor />} />
          <Route path="/principal" element={<PrincipalLanding />} />
          <Route path="/supervisor" element={<SupervisorLanding />} />
          <Route path="/learn-more" element={<LearnMore />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/weelmatgenerator" element={<WeeLMatGenerator />} />
          <Route path="/premium" element={<WeeLMatGeneratorPremium />} />
          <Route path="/premium/weelmat" element={<WeeLMatGeneratorWeeLMat />} />
          <Route path="/premium/lesson-plan" element={<LessonPlanGenerator />} />
          <Route path="/premium/periodical-test" element={<PeriodicalTestGenerator />} />
          <Route path="/my-account" element={<MyAccount />} />
          <Route path="/teacher-submission" element={<TeacherSubmission />} />
          <Route path="/principal-dashboard" element={<PrincipalDashboard />} />
          <Route path="/supervisor-dashboard" element={<SupervisorDashboard />} />
          <Route path="/weelmat-history" element={<WeeLMatHistory />} />
          <Route path="/school-status/:schoolName" element={<PublicSchoolStatus />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        {location.pathname !== "/" && <Footer />}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
