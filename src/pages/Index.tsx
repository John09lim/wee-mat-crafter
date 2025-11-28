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

      {/* Disclaimers Section */}
      <section className="py-20 bg-amber-50/50 border-t-4 border-amber-500">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 text-amber-700 mb-3">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <h2 className="text-3xl font-bold text-amber-900">Important Disclaimers</h2>
              </div>
              <p className="text-muted-foreground">Please read carefully before using WeeLMat Generator</p>
            </div>
            
            <div className="grid gap-4">
              <Card className="p-6 bg-white border-l-4 border-amber-500">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold">1</div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">AI-Generated Content</h3>
                    <p className="text-muted-foreground">The WeeLMat outputs are generated by AI and may contain errors, inaccuracies, or inappropriate content. This tool assists but does not replace human judgment.</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-white border-l-4 border-amber-500">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold">2</div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Teacher Responsibility</h3>
                    <p className="text-muted-foreground">Teachers are fully responsible for reviewing, validating, and approving all content before distributing to learners, parents, or school administrators.</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-white border-l-4 border-amber-500">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold">3</div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Curriculum Alignment Required</h3>
                    <p className="text-muted-foreground">Always ensure the generated output aligns with your specific curriculum, DepEd guidelines, and grade-level standards before use.</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-white border-l-4 border-amber-500">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold">4</div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Not a Replacement for Professional Judgment</h3>
                    <p className="text-muted-foreground">This tool is a planning assistant. It does not replace your professional expertise, pedagogical knowledge, or teaching experience.</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-white border-l-4 border-amber-500">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold">5</div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Privacy and Data Security</h3>
                    <p className="text-muted-foreground">Your submitted data is processed securely. Do not include sensitive personal information about students in your inputs.</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Validation Instructions Section */}
      <section className="py-20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 text-primary mb-3">
                <CheckCircle className="w-8 h-8" />
                <h2 className="text-3xl font-bold">Before Submitting Your WeeLMat</h2>
              </div>
              <p className="text-xl text-muted-foreground">Always review and validate your output</p>
            </div>
            
            <Card className="p-8 bg-white shadow-lg">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Review Generated Content Thoroughly</h3>
                    <p className="text-muted-foreground">Read through all learning activities, questions, and instructions to ensure accuracy and appropriateness.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Verify Competencies Match Your Curriculum</h3>
                    <p className="text-muted-foreground">Confirm that learning competencies align with DepEd standards and your grade level requirements.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Check Learning Activities for Appropriateness</h3>
                    <p className="text-muted-foreground">Ensure all tasks and activities are age-appropriate, culturally sensitive, and achievable for your learners.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Validate Answer Keys for Accuracy</h3>
                    <p className="text-muted-foreground">Double-check all quiz answers and solutions to prevent teaching incorrect information.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Target className="w-6 h-6 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1 text-amber-900">Only Submit After Complete Validation</h3>
                    <p className="text-muted-foreground">Submit your WeeLMat to <strong>learners, parents, and school heads</strong> only after you have verified all content is accurate, appropriate, and aligned with curriculum standards.</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

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