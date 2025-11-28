
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";

const Auth = () => {
  const navigate = useNavigate();
  
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [school, setSchool] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Auth guard: if logged in, go to my account
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate("/my-account");
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) navigate("/my-account");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const insertOrUpdateProfile = async (uid: string) => {
    const { error } = await supabase.from("profiles").upsert({
      user_id: uid,
      teacher_name: teacherName,
      school,
      email,
    }, { onConflict: "user_id" });
    if (error) throw error;
  };


  const handlePasswordReset = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast("Password reset email sent! Check your inbox.");
      setMode("login");
    } catch (e: any) {
      toast(e.message || "Failed to send password reset email");
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async () => {
    setLoading(true);
    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Invalid email or password. Please try again.");
          } else {
            toast.error("Login failed. Please try again.");
          }
          return;
        }

        // Check if profile exists, create if missing
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (!profile) {
          await supabase.from("profiles").insert({
            user_id: data.user.id,
            email: data.user.email!,
            teacher_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Teacher',
            school: 'Please update',
            district_name: 'Please update'
          });
          toast("Profile created. Please update your information.");
        }

        // Check if user has teacher role, auto-assign if missing (for legacy users)
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .eq("role", "teacher")
          .maybeSingle();

        if (!roleData) {
          // Auto-assign teacher role for legacy users without roles
          const { error: roleError } = await supabase
            .from("user_roles")
            .insert({ user_id: data.user.id, role: "teacher" });
          
          if (roleError) {
            console.error("Role assignment error:", roleError);
            toast.error("There was an issue with your account. Please contact support.");
            await supabase.auth.signOut();
            return;
          }
          
          toast.success("Welcome back! Your account has been updated.");
        } else {
          toast.success("Welcome back!");
        }

        navigate("/my-account");
        return;
      }

      // Signup validations
      if (!teacherName.trim() || !school.trim() || !email.trim() || !password.trim() || !password2.trim()) {
        toast("Please fill out all fields");
        return;
      }
      if (password !== password2) {
        toast("Passwords do not match");
        return;
      }

      // Create auth user
      try {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: teacherName,
              role: 'teacher'
            },
            emailRedirectTo: `${window.location.origin}/dashboard`
          }
        });

        if (signUpError) {
          if (signUpError.message.includes("already registered") || signUpError.message.includes("User already registered")) {
            toast.error("This email is already registered. Please log in instead.");
            setMode("login");
            return;
          }
          throw signUpError;
        }

        // If we have a session from signup
        if (signUpData.session?.user) {
          const userId = signUpData.session.user.id;
          
          // Check if this email was pre-registered by a principal
          const { data: assignmentMatch } = await supabase
            .from("school_assignments")
            .select("id, school_name, district_name, principal_id, grade_level, section")
            .eq("teacher_email", email.toLowerCase())
            .is("user_id", null)
            .maybeSingle();

          if (assignmentMatch) {
            await supabase
              .from("school_assignments")
              .update({ user_id: userId })
              .eq("id", assignmentMatch.id);
            
            await supabase.from("profiles").upsert({
              user_id: userId,
              email: email,
              teacher_name: teacherName,
              school: assignmentMatch.school_name,
              district_name: assignmentMatch.district_name,
            }, { onConflict: "user_id" });
            
            toast(`Welcome! You've been linked to ${assignmentMatch.school_name}!`);
          } else {
            await insertOrUpdateProfile(userId);
            toast(`Welcome, ${teacherName}!`);
          }
          
          navigate("/dashboard");
        } else {
          toast("Account created! Please check your email to verify.");
        }
      } catch (profileError) {
        console.error("Error creating profile:", profileError);
        toast.error("Account created but there was an error setting up your profile. Please contact support.");
      }
    } catch (e: any) {
      toast(e.message || "Authentication error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-160px)] flex items-center py-12">
      <section className="container">
        <div className="max-w-md mx-auto">
          <div className="rounded-2xl border-2 bg-card p-8 shadow-lg">
            <h1 className="text-2xl font-semibold mb-6">
              {mode === "login" 
                ? "Teacher Login" 
                : mode === "signup"
                  ? "Create Teacher Account"
                  : "Reset your password"}
            </h1>
            
            <div className="space-y-4">
              {mode === "signup" && (
                <>
                  <div>
                    <Label htmlFor="teacherName">Teacher Name</Label>
                    <Input id="teacherName" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="school">School Name</Label>
                    <Input id="school" value={school} onChange={(e) => setSchool(e.target.value)} />
                  </div>
                </>
              )}
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              
              {mode === "reset" ? null : (
              <>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              
              {mode === "signup" && (
                <div>
                  <Label htmlFor="password2">Confirm Password</Label>
                  <Input id="password2" type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
                </div>
              )}
              </>
              )}
              
              <Button className="w-full" onClick={mode === "reset" ? handlePasswordReset : handleAuth} disabled={loading}>
                {loading ? "Please wait…" : mode === "login" ? "Login" : mode === "signup" ? "Sign up" : "Send Reset Email"}
              </Button>
              
              <div className="space-y-2 text-center">
                {mode === "login" && (
                  <p className="text-sm text-muted-foreground">
                    <button
                      className="underline text-primary font-medium"
                      onClick={() => setMode("reset")}
                    >
                      Forgot password?
                    </button>
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {mode === "login" 
                    ? "No account?" 
                    : mode === "signup"
                      ? "Already have an account?"
                      : "Remember your password?"}{" "}
                  <button
                    className="underline text-primary font-medium"
                    onClick={() => setMode(mode === "login" ? "signup" : "login")}
                  >
                    {mode === "login" ? "Sign up" : mode === "signup" ? "Login" : "Login"}
                  </button>
                </p>
              </div>

              <div className="mt-6 pt-6 border-t text-center space-y-2">
                <p className="text-sm text-muted-foreground">Are you a School Head or Supervisor?</p>
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/principal")}
                  >
                    School Head Login
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/supervisor")}
                  >
                    Supervisor Login
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Auth;
