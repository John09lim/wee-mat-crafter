import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Target, Clock, Zap, Edit, Sparkles, Download, Building2, Users, CheckCircle, ArrowRight } from "lucide-react";
import { TypewriterText } from "@/components/animations/TypewriterText";
import { ColorWaveText } from "@/components/animations/ColorWaveText";
import { useScrollReveal } from "@/hooks/useScrollReveal";
const BenefitsSection = () => {
  const {
    ref: titleRef,
    isVisible: titleVisible
  } = useScrollReveal();
  const {
    ref: card1Ref,
    isVisible: card1Visible
  } = useScrollReveal();
  const {
    ref: card2Ref,
    isVisible: card2Visible
  } = useScrollReveal();
  const {
    ref: card3Ref,
    isVisible: card3Visible
  } = useScrollReveal();
  return <section className="py-24 bg-muted/30">
      <div className="container">
        <div ref={titleRef} className={`text-center mb-16 space-y-4 scroll-reveal ${titleVisible ? 'is-visible' : ''}`}>
          <h2 className="text-3xl md:text-4xl font-bold">Why Choose WeeLMat?</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Designed specifically for Filipino educators to streamline weekly planning and ensure continuity
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          <Card ref={card1Ref} className={`p-8 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-card border-2 scroll-reveal ${card1Visible ? 'is-visible' : ''}`}>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Grounded & Clear</h3>
            <p className="text-muted-foreground leading-relaxed">
              Crafted to be concise and learner‑friendly, aligned to competencies—no clutter, just clarity for effective learning.
            </p>
          </Card>
          
          <Card ref={card2Ref} className={`p-8 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-card border-2 scroll-reveal scroll-reveal-delay-2 ${card2Visible ? 'is-visible' : ''}`}>
            <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mb-6">
              <Clock className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Continuity Ready</h3>
            <p className="text-muted-foreground leading-relaxed">
              Supports learning during suspensions—easy to display, copy, or print in minimal copies for uninterrupted education.
            </p>
          </Card>
          
          <Card ref={card3Ref} className={`p-8 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-card border-2 scroll-reveal scroll-reveal-delay-4 ${card3Visible ? 'is-visible' : ''}`}>
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-6">
              <Zap className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Fast Output</h3>
            <p className="text-muted-foreground leading-relaxed">
              Produce neat A4 DOCX/PDF matrices in seconds, with a simple, reliable flow that saves you hours of manual work.
            </p>
          </Card>
        </div>
      </div>
    </section>;
};
const HowItWorksSection = () => {
  const {
    ref: titleRef,
    isVisible: titleVisible
  } = useScrollReveal();
  const {
    ref: card1Ref,
    isVisible: card1Visible
  } = useScrollReveal();
  const {
    ref: card2Ref,
    isVisible: card2Visible
  } = useScrollReveal();
  const {
    ref: card3Ref,
    isVisible: card3Visible
  } = useScrollReveal();
  return <section className="py-24">
      <div className="container">
        <div ref={titleRef} className={`text-center mb-16 space-y-4 scroll-reveal ${titleVisible ? 'is-visible' : ''}`}>
          <h2 className="text-3xl md:text-4xl font-bold">How It Works</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Three simple steps to generate your professional WeeLMat documents
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-1/4 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-primary via-secondary to-accent -z-10" />
          
          <Card ref={card1Ref} className={`p-8 relative bg-card border-2 scroll-reveal ${card1Visible ? 'is-visible' : ''}`}>
            <div className="absolute -top-6 left-8 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold shadow-lg">
              1
            </div>
            <div className="mt-4 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Edit className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Enter Details</h3>
              <p className="text-muted-foreground leading-relaxed">
                Provide subject, grade level, section, dates, and the week's learning competency. Simple form, complete control.
              </p>
            </div>
          </Card>
          
          <Card ref={card2Ref} className={`p-8 relative bg-card border-2 scroll-reveal scroll-reveal-delay-2 ${card2Visible ? 'is-visible' : ''}`}>
            <div className="absolute -top-6 left-8 w-12 h-12 rounded-full bg-secondary text-primary-foreground flex items-center justify-center text-xl font-bold shadow-lg">
              2
            </div>
            <div className="mt-4 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold">AI Generates</h3>
              <p className="text-muted-foreground leading-relaxed">
                Our AI creates a clean, learner‑friendly WeeLMat with daily tasks, activities, and expected outputs automatically.
              </p>
            </div>
          </Card>
          
          <Card ref={card3Ref} className={`p-8 relative bg-card border-2 scroll-reveal scroll-reveal-delay-4 ${card3Visible ? 'is-visible' : ''}`}>
            <div className="absolute -top-6 left-8 w-12 h-12 rounded-full bg-accent text-primary-foreground flex items-center justify-center text-xl font-bold shadow-lg">
              3
            </div>
            <div className="mt-4 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <Download className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold">Download & Share</h3>
              <p className="text-muted-foreground leading-relaxed">
                Get A4‑ready DOCX/PDF files for display, projection, printing, or sharing with students and administrators.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </section>;
};
const SchoolHeadsSection = ({
  navigate
}: {
  navigate: ReturnType<typeof useNavigate>;
}) => {
  const {
    ref: contentRef,
    isVisible: contentVisible
  } = useScrollReveal();
  const {
    ref: cardRef,
    isVisible: cardVisible
  } = useScrollReveal();
  return <section className="py-24 bg-gradient-to-br from-primary/5 via-secondary/5 to-background">
      <div className="container">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div ref={contentRef} className={`space-y-6 scroll-reveal ${contentVisible ? 'is-visible' : ''}`}>
            <div className="inline-flex items-center gap-2 text-sm rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-primary font-medium">
              <Building2 className="w-4 h-4" />
              For School Administrators
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold leading-tight">
              Empower Your School with
              <span className="block text-primary">Centralized Planning</span>
            </h2>
            
            <p className="text-lg text-muted-foreground leading-relaxed">
              School Heads can monitor teacher submissions, access comprehensive reports, and ensure consistency across all grade levels and sections.
            </p>
            
            <ul className="space-y-4">
              {["Monitor all teacher WeeLMat submissions", "Access school-wide planning reports", "Manage standardized templates", "Track compliance and progress"].map((benefit, idx) => <li key={idx} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{benefit}</span>
                </li>)}
            </ul>
          </div>
          
          <Card ref={cardRef} className={`p-8 bg-card border-2 shadow-xl scroll-reveal scroll-reveal-delay-3 ${cardVisible ? 'is-visible' : ''}`}>
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold mb-2">Create School Head Account</h3>
                <p className="text-sm text-muted-foreground">Join as a school administrator to access advanced management features</p>
              </div>
              
              <Button size="lg" className="w-full text-base transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/20" onClick={() => navigate("/auth?role=school_head")}>
                <Building2 className="mr-2 w-5 h-5" />
                Sign Up as School Head
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">
                Already have an account?{" "}
                <button onClick={() => navigate("/auth")} className="text-primary hover:underline font-medium">
                  Sign in here
                </button>
              </p>
            </div>
          </Card>
        </div>
      </div>
    </section>;
};
const SupervisorsSection = ({
  navigate
}: {
  navigate: ReturnType<typeof useNavigate>;
}) => {
  const {
    ref: cardRef,
    isVisible: cardVisible
  } = useScrollReveal();
  const {
    ref: contentRef,
    isVisible: contentVisible
  } = useScrollReveal();
  return <section className="py-24 bg-gradient-to-br from-accent/5 via-primary/5 to-background">
      <div className="container">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <Card ref={cardRef} className={`p-8 bg-card border-2 shadow-xl md:order-1 order-2 scroll-reveal ${cardVisible ? 'is-visible' : ''}`}>
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold mb-2">Create Supervisor Account</h3>
                <p className="text-sm text-muted-foreground">Oversee multiple schools with district-wide analytics and reporting</p>
              </div>
              
              <Button size="lg" className="w-full text-base transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-secondary/20" onClick={() => navigate("/auth?role=supervisor")}>
                <Users className="mr-2 w-5 h-5" />
                Sign Up as Supervisor
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">
                Already have an account?{" "}
                <button onClick={() => navigate("/auth")} className="text-primary hover:underline font-medium">
                  Sign in here
                </button>
              </p>
            </div>
          </Card>
          
          <div ref={contentRef} className={`space-y-6 md:order-2 order-1 scroll-reveal scroll-reveal-delay-3 ${contentVisible ? 'is-visible' : ''}`}>
            <div className="inline-flex items-center gap-2 text-sm rounded-full border border-secondary/20 bg-secondary/10 px-4 py-2 text-secondary font-medium">
              <Users className="w-4 h-4" />
              For District Supervisors
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold leading-tight">
              Oversee Multiple Schools with
              <span className="block text-secondary">District-Wide Insights</span>
            </h2>
            
            <p className="text-lg text-muted-foreground leading-relaxed">
              Supervisors gain comprehensive visibility across schools, enabling data-driven decisions and consistent quality standards.
            </p>
            
            <ul className="space-y-4">
              {["Monitor multiple schools and divisions", "Access district-wide analytics dashboard", "Review and approve planning templates", "Generate consolidated compliance reports"].map((benefit, idx) => <li key={idx} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{benefit}</span>
                </li>)}
            </ul>
          </div>
        </div>
      </div>
    </section>;
};
const Index = () => {
  const navigate = useNavigate();
  return <main className="min-h-[calc(100vh-160px)] flex flex-col bg-background">
      {/* Hero Section - Enhanced */}
      <section className="relative overflow-hidden py-[50px]">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/5 pointer-events-none" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-secondary/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse pointer-events-none" style={{
        animationDelay: '1s'
      }} />
        
        <div className="container relative grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 text-xs rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-primary font-medium">
              <Sparkles className="w-3 h-3" />
              Built for Teachers • WeeLMat Generator
            </div>
            
          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight">
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/80 to-secondary">
              <TypewriterText text="WeeLMat Generator" />
            </span>
            <span className="block text-foreground mt-1">
              <ColorWaveText text="Craft AI-driven Weekly Learning Matrices" />
            </span>
            <span className="block text-foreground">
              <ColorWaveText text="in seconds" />
            </span>
          </h1>
            
            <p className="text-lg text-muted-foreground max-w-prose leading-relaxed">
              Transform your weekly competencies into clear, learner‑friendly plans. Generate polished DOCX/PDF output ready for class use or contingency days—fast, consistent, and aligned with DepEd guidance.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="text-base transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/20" onClick={() => navigate("/auth")}>
                Get Started Free
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button variant="outline" size="lg" className="text-base transition-all duration-300 hover:scale-105" onClick={() => navigate("/learn-more")}>
                Learn More
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span>DepEd aligned</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span>Instant generation</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border-2 border-primary/10 bg-card p-4 shadow-2xl animate-fade-in hover-scale">
            <div className="w-full overflow-hidden rounded-2xl border bg-muted/30">
              <img src="/weelmat-logo.png" alt="WeeLMat Generator preview showing sample weekly planning matrix" className="w-full h-auto object-contain" loading="eager" />
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section - Enhanced */}
      <BenefitsSection />

      {/* How it Works - Enhanced */}
      <HowItWorksSection />

      {/* School Heads Section */}
      <SchoolHeadsSection navigate={navigate} />

      {/* Supervisors Section */}
      <SupervisorsSection navigate={navigate} />

      {/* Final CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10" />
        <div className="container relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold leading-tight">
              Ready to Transform Your
              <span className="block text-primary">Weekly Planning?</span>
            </h2>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join hundreds of Filipino educators already using WeeLMat Generator to create professional, DepEd-aligned weekly learning materials.
            </p>
            
            <div className="flex flex-wrap gap-4 justify-center pt-4">
              <Button size="lg" className="text-lg px-8" onClick={() => navigate("/auth")}>
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8" onClick={() => navigate("/learn-more")}>
                View Examples
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-8 justify-center text-sm text-muted-foreground pt-8">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span>Secure & Private</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span>DepEd Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span>Always Updated</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>;
};
export default Index;