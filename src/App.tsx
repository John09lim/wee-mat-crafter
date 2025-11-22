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
import MyAccount from "./pages/MyAccount";

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
          <Route path="/learn-more" element={<LearnMore />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/weelmatgenerator" element={<WeeLMatGenerator />} />
          <Route path="/weelmatgeneratorpremium" element={<WeeLMatGeneratorPremium />} />
          <Route path="/weelmatgeneratorpremium/weelmat" element={<WeeLMatGeneratorWeeLMat />} />
          <Route path="/weelmatgeneratorpremium/lessonplan" element={<LessonPlanGenerator />} />
          <Route path="/weelmatgeneratorpremium/test" element={<PeriodicalTestGenerator />} />
          <Route path="/my-account" element={<MyAccount />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        {location.pathname !== "/" && <Footer />}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
