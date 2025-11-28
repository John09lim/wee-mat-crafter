import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, Mail, Lock, User, School as SchoolIcon, MapPin, CheckCircle, BarChart3, FileText, Bell, Users as UsersIcon } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const PrincipalLanding = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [loading, setLoading] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
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
      
      if (role?.role === "school_head") {
        navigate("/principal-dashboard");
      }
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/principal-dashboard`,
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

        if (!name || !school || !district) {
          toast.error("Please fill in all fields");
          setLoading(false);
          return;
        }

        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/principal-dashboard`,
              data: {
                full_name: name,
                role: 'school_head'
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
            const { data: schoolMatch } = await supabase
              .from("schools")
              .select("id, school_name, district_name, supervisor_id")
              .eq("principal_email", email.toLowerCase())
              .is("principal_id", null)
              .maybeSingle();

            if (schoolMatch) {
              await supabase
                .from("schools")
                .update({ principal_id: data.user.id })
                .eq("id", schoolMatch.id);
              
              await supabase.from("profiles").upsert({
                user_id: data.user.id,
                email: email,
                teacher_name: name,
                school: schoolMatch.school_name,
                district_name: schoolMatch.district_name,
              }, { onConflict: "user_id" });
              
              toast.success(`Welcome! You've been linked to ${schoolMatch.school_name}!`);
            } else {
              await supabase.from("profiles").insert({
                user_id: data.user.id,
                email: email,
                teacher_name: name,
                school: school,
                district_name: district,
              });
              
              toast.success("Account created successfully!");
            }
            
            navigate("/principal-dashboard");
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
            teacher_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'School Head',
            school: 'Please update',
            district_name: 'Please update'
          });
          toast("Profile created. Please update your school information.");
        }

        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .eq("role", "school_head")
          .maybeSingle();

        if (!roleData) {
          await supabase.auth.signOut();
          toast.error("Access denied. This login is for school heads only.");
          setLoading(false);
          return;
        }

        toast.success("Login successful!");
        navigate("/principal-dashboard");
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
      <section ref={heroRef} className={`py-24 bg-gradient-to-br from-primary/10 via-secondary/5 to-background scroll-reveal ${heroVisible ? 'is-visible' : ''}`}>
        <div className="container">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 text-sm rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-primary font-medium">
              <Building2 className="w-4 h-4" />
              For School Administrators
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold leading-tight">
              School Head Portal
              <span className="block text-primary mt-2">Centralized Planning & Oversight</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Monitor teacher submissions, access comprehensive reports, and ensure consistency across all grade levels and sections with powerful management tools.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section ref={benefitsRef} className={`py-20 scroll-reveal ${benefitsVisible ? 'is-visible' : ''}`}>
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">Why School Heads Choose WeeLMat</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Bell className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Real-time Notifications</h3>
              <p className="text-muted-foreground text-sm">Get instant alerts when teachers submit their WeeLMats for review</p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Online Document Viewer</h3>
              <p className="text-muted-foreground text-sm">View submissions without downloading—review instantly in your browser</p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Analytics Dashboard</h3>
              <p className="text-muted-foreground text-sm">Track completion rates with visual charts and comprehensive reports</p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <UsersIcon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Teacher Management</h3>
              <p className="text-muted-foreground text-sm">Add and manage teachers, track their submissions and progress</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} className={`py-20 bg-muted/30 scroll-reveal ${featuresVisible ? 'is-visible' : ''}`}>
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">Powerful Features at Your Fingertips</h2>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">Monitor Teacher Submissions</h4>
                  <p className="text-sm text-muted-foreground">See all submissions from your school in one centralized dashboard</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">Weekly Completion Reports</h4>
                  <p className="text-sm text-muted-foreground">Generate reports showing which teachers submitted and track compliance</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">Status Tracking</h4>
                  <p className="text-sm text-muted-foreground">Mark submissions as reviewed, accepted, or returned with notes</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">Teacher Profile Management</h4>
                  <p className="text-sm text-muted-foreground">Add teachers, assign grade levels, and upload profile images</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">District Reporting</h4>
                  <p className="text-sm text-muted-foreground">Share completion reports with supervisors for district oversight</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">School-Wide Analytics</h4>
                  <p className="text-sm text-muted-foreground">View pie charts and bar charts showing submission trends</p>
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
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
              <h3 className="font-semibold mb-2">Create Your Account</h3>
              <p className="text-sm text-muted-foreground">Sign up with your school details below</p>
            </Card>

            <Card className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-secondary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
              <h3 className="font-semibold mb-2">Add Teachers</h3>
              <p className="text-sm text-muted-foreground">Register your teachers to your school</p>
            </Card>

            <Card className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-accent text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
              <h3 className="font-semibold mb-2">Monitor Submissions</h3>
              <p className="text-sm text-muted-foreground">Review teacher WeeLMats as they arrive</p>
            </Card>

            <Card className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">4</div>
              <h3 className="font-semibold mb-2">Generate Reports</h3>
              <p className="text-sm text-muted-foreground">Create completion reports for supervisors</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Account Creation Section */}
      <section ref={formRef} className={`py-20 bg-gradient-to-br from-primary/5 to-secondary/5 scroll-reveal ${formVisible ? 'is-visible' : ''}`}>
        <div className="container">
          <div className="max-w-md mx-auto">
            <Card className="p-8 shadow-xl">
              <div className="flex flex-col items-center mb-6">
                <Building2 className="h-12 w-12 mb-3 text-primary" />
                <h2 className="text-2xl font-bold text-center">
                  {mode === "login" ? "Sign In" : mode === "signup" ? "Create School Head Account" : "Reset Password"}
                </h2>
                <p className="text-muted-foreground text-center mt-2 text-sm">
                  {mode === "login" 
                    ? "Access your school management dashboard" 
                    : mode === "signup" 
                      ? "Get started with comprehensive school oversight"
                      : "Enter your email to reset your password"}
                </p>
              </div>

              <form onSubmit={mode === "reset" ? handlePasswordReset : handleAuth} className="space-y-4">
                {mode === "signup" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Principal Name
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
                        <SchoolIcon className="h-4 w-4" />
                        School Name
                      </label>
                      <Input
                        type="text"
                        placeholder="Enter school name"
                        value={school}
                        onChange={(e) => setSchool(e.target.value)}
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

export default PrincipalLanding;
