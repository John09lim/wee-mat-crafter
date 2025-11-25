import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, GraduationCap, ClipboardList, Sparkles, ArrowRight } from "lucide-react";
import { useEffect } from "react";

const WeeLMatGeneratorPremium = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Premium Features - WeeLMat Generator";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", "Choose from WeeLMat, Lesson Plan, and Periodical Test generators");
    }
  }, []);

  const generators = [
    {
      id: "weelmat",
      icon: FileText,
      title: "WeeLMat Generator",
      description: "Generate comprehensive Weekly Learning Matrices with AI-powered learning activities and assessments",
      features: [
        "5-day learning matrix",
        "Unique questions for each day",
        "Automatic competency analysis",
        "Instant DOCX download"
      ],
      route: "/premium/weelmat",
      color: "text-primary"
    },
    {
      id: "lessonplan",
      icon: GraduationCap,
      title: "Lesson Plan Generator",
      description: "Create comprehensive lesson plans automatically following DepEd format",
      features: [
        "Complete DepEd format",
        "Structured learning activities",
        "Assessment strategies included",
        "Customizable by subject"
      ],
      route: "/premium/lesson-plan",
      color: "text-primary"
    },
    {
      id: "test",
      icon: ClipboardList,
      title: "Periodical Test & TOS Generator",
      description: "Generate assessments with complete Table of Specifications",
      features: [
        "Multiple question types",
        "Automatic TOS generation",
        "Answer key included",
        "Aligned to competencies"
      ],
      route: "/premium/periodical-test",
      color: "text-primary"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="container mx-auto py-12 px-4">
        <div className="mb-12 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-primary/10 rounded-full">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-primary">Premium Features</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Choose Your Generator</h1>
          <p className="text-lg text-muted-foreground">
            Select the type of educational material you want to create with AI
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {generators.map((generator) => {
            const Icon = generator.icon;
            return (
              <Card 
                key={generator.id}
                className="group hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer border-2 hover:border-primary/50"
                onClick={() => navigate(generator.route)}
              >
                <CardHeader>
                  <div className="mb-4">
                    <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Icon className={`w-7 h-7 ${generator.color}`} />
                    </div>
                  </div>
                  <CardTitle className="text-xl">{generator.title}</CardTitle>
                  <CardDescription className="text-base">
                    {generator.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {generator.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-0.5">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full group-hover:gap-3 transition-all" variant="default">
                    Get Started
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WeeLMatGeneratorPremium;
