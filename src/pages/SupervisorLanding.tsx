import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Users, Mail, Lock, User, MapPin, CheckCircle, BarChart3, Building, Eye, TrendingUp } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const SupervisorLanding = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [loading, setLoading] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [district, setDistrict] = useState("");

  const { ref: heroRef, isVisible: heroVisible } = useScrollReveal();
  const { ref: benefitsRef, isVisible: benefitsVisible } = useScrollReveal();
  const { ref: featuresRef, isVisible: featuresVisible } = useScrollReveal();
  const { ref: stepsRef, isVisible: stepsVisible } = useScrollReveal();
  const { ref: formRef, isVisible: formVisible } = useScrollReveal();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      
      if (role?.role === "supervisor") {
        navigate("/supervisor-dashboard");
      }
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/supervisor-dashboard`,
      });

      if (error) throw error;

      toast.success("Password reset email sent! Check your inbox.");
      setMode("login");
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast.error(error.message || "Failed to send password reset email");
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "signup") {
        if (password !== confirmPassword) {
          toast.error("Passwords do not match");
          setLoading(false);
          return;
        }

        if (!name || !district) {
          toast.error("Please fill in all fields");
          setLoading(false);
          return;
        }

        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/supervisor-dashboard`,
              data: {
                full_name: name,
                role: 'supervisor'
              }
            },
          });

          if (error) {
            if (error.message.includes("already registered") || error.message.includes("User already registered")) {
              toast.error("This email is already registered. Please log in instead.");
              setMode("login");
              return;
            }
            throw error;
          }

          if (data.user) {
            await supabase.from("profiles").insert({
              user_id: data.user.id,
              email: email,
              teacher_name: name,
              school: "N/A - Supervisor",
              district_name: district,
            });

            toast.success("Account created successfully!");
            navigate("/supervisor-dashboard");
          }
        } catch (profileError) {
          console.error("Error creating profile:", profileError);
          toast.error("Account created but there was an error setting up your profile. Please contact support.");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Invalid email or password. Please try again.");
          } else {
            toast.error("Login failed. Please try again.");
          }
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (!profile) {
          await supabase.from("profiles").insert({
            user_id: data.user.id,
            email: data.user.email!,
            teacher_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Supervisor',
            school: 'N/A - Supervisor',
            district_name: 'Please update'
          });
          toast("Profile created. Please update your district information.");
        }

        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .eq("role", "supervisor")
          .maybeSingle();

        if (!roleData) {
          await supabase.auth.signOut();
          toast.error("Access denied. This login is for supervisors only.");
          setLoading(false);
          return;
        }

        toast.success("Login successful!");
        navigate("/supervisor-dashboard");
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section ref={heroRef} className={`py-24 bg-gradient-to-br from-secondary/10 via-accent/5 to-background scroll-reveal ${heroVisible ? 'is-visible' : ''}`}>
        <div className="container">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 text-sm rounded-full border border-secondary/20 bg-secondary/10 px-4 py-2 text-secondary font-medium">
              <Users className="w-4 h-4" />
              For District Supervisors
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold leading-tight">
              Supervisor Portal
              <span className="block text-secondary mt-2">District-Wide Insights & Oversight</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Gain comprehensive visibility across multiple schools, enabling data-driven decisions and consistent quality standards throughout your district.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section ref={benefitsRef} className={`py-20 scroll-reveal ${benefitsVisible ? 'is-visible' : ''}`}>
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">Why Supervisors Choose WeeLMat</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mb-4">
                <Building className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Multi-School Oversight</h3>
              <p className="text-muted-foreground text-sm">Monitor all schools in your district from one central dashboard</p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">District Analytics</h3>
              <p className="text-muted-foreground text-sm">View compliance rates and submission trends across all schools</p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                <Eye className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Document Access</h3>
              <p className="text-muted-foreground text-sm">Review teacher submissions from any school in your district</p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Compliance Tracking</h3>
              <p className="text-muted-foreground text-sm">Track which schools and teachers are meeting submission requirements</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} className={`py-20 bg-muted/30 scroll-reveal ${featuresVisible ? 'is-visible' : ''}`}>
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">Comprehensive District Management</h2>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-secondary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">Monitor Multiple Schools</h4>
                  <p className="text-sm text-muted-foreground">Access all schools and divisions in your district from one place</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-secondary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">Principal Weekly Reports</h4>
                  <p className="text-sm text-muted-foreground">Review completion reports submitted by school principals</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-secondary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">Compliance Pie Charts</h4>
                  <p className="text-sm text-muted-foreground">Visualize which schools submitted vs. not submitted at a glance</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-secondary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">School Management</h4>
                  <p className="text-sm text-muted-foreground">Add schools to your district and assign principals by email</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-secondary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">Cross-School Comparison</h4>
                  <p className="text-sm text-muted-foreground">Compare submission rates across schools with bar charts</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-secondary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">Teacher Submission Access</h4>
                  <p className="text-sm text-muted-foreground">View and review teacher WeeLMats from any school in your district</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section ref={stepsRef} className={`py-20 scroll-reveal ${stepsVisible ? 'is-visible' : ''}`}>
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          
          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <Card className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-secondary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
              <h3 className="font-semibold mb-2">Create Your Account</h3>
              <p className="text-sm text-muted-foreground">Sign up with your district information</p>
            </Card>

            <Card className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
              <h3 className="font-semibold mb-2">Add Schools</h3>
              <p className="text-sm text-muted-foreground">Register schools and assign principals</p>
            </Card>

            <Card className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-accent text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
              <h3 className="font-semibold mb-2">View District Data</h3>
              <p className="text-sm text-muted-foreground">Access compliance analytics and reports</p>
            </Card>

            <Card className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-secondary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">4</div>
              <h3 className="font-semibold mb-2">Monitor Quality</h3>
              <p className="text-sm text-muted-foreground">Review submissions and ensure standards</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Account Creation Section */}
      <section ref={formRef} className={`py-20 bg-gradient-to-br from-secondary/5 to-primary/5 scroll-reveal ${formVisible ? 'is-visible' : ''}`}>
        <div className="container">
          <div className="max-w-md mx-auto">
            <Card className="p-8 shadow-xl">
              <div className="flex flex-col items-center mb-6">
                <Users className="h-12 w-12 mb-3 text-secondary" />
                <h2 className="text-2xl font-bold text-center">
                  {mode === "login" ? "Sign In" : mode === "signup" ? "Create Supervisor Account" : "Reset Password"}
                </h2>
                <p className="text-muted-foreground text-center mt-2 text-sm">
                  {mode === "login" 
                    ? "Access your district oversight dashboard" 
                    : mode === "signup" 
                      ? "Get started with district-wide management"
                      : "Enter your email to reset your password"}
                </p>
              </div>

              <form onSubmit={mode === "reset" ? handlePasswordReset : handleAuth} className="space-y-4">
                {mode === "signup" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Supervisor Name
                      </label>
                      <Input
                        type="text"
                        placeholder="Enter your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        District Name
                      </label>
                      <Input
                        type="text"
                        placeholder="Enter district name"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {mode !== "reset" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Password
                    </label>
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                )}

                {mode === "signup" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Confirm Password
                    </label>
                    <Input
                      type="password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? "Processing..." : mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Email"}
                </Button>
              </form>

              <div className="mt-4 text-center space-y-2">
                {mode === "login" && (
                  <button
                    onClick={() => setMode("reset")}
                    className="text-sm text-primary hover:underline block w-full"
                  >
                    Forgot password?
                  </button>
                )}
                <button
                  onClick={() => setMode(mode === "login" ? "signup" : "login")}
                  className="text-sm text-primary hover:underline"
                >
                  {mode === "login" 
                    ? "Don't have an account? Sign up" 
                    : mode === "signup"
                      ? "Already have an account? Sign in"
                      : "Back to sign in"}
                </button>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SupervisorLanding;
