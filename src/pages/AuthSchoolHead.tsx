import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, Mail, Lock, User, School as SchoolIcon, MapPin } from "lucide-react";
import PasswordResetDialog from "@/components/PasswordResetDialog";

export default function AuthSchoolHead() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [loading, setLoading] = useState(false);
  const [showPasswordResetDialog, setShowPasswordResetDialog] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [district, setDistrict] = useState("");

  useEffect(() => {
    // Check for password recovery event from Supabase email link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setShowPasswordResetDialog(true);
        return;
      }
      
      if (session?.user && !showPasswordResetDialog) {
        checkUserRole(session.user.id);
      }
    });
    
    // Check URL hash for recovery tokens
    const hashParams = new URLSearchParams(location.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const type = hashParams.get("type");
    
    if (type === "recovery" && accessToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: hashParams.get("refresh_token") || "",
      }).then(() => {
        setShowPasswordResetDialog(true);
      });
    } else {
      checkAuth();
    }
    
    return () => subscription.unsubscribe();
  }, [location.hash, showPasswordResetDialog]);

  const checkUserRole = async (userId: string) => {
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();
    
    if (role?.role === "school_head") {
      navigate("/principal-dashboard");
    }
  };

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && !showPasswordResetDialog) {
      checkUserRole(user.id);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth-school-head`,
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
            teacher_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'School Head',
            school: 'Please update',
            district_name: 'Please update'
          });
          toast("Profile created. Please update your school information.");
        }

        // Check if user has school_head role, auto-assign if missing (for legacy users)
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .eq("role", "school_head")
          .maybeSingle();

        if (!roleData) {
          // Auto-assign school_head role for legacy users without roles
          const { error: roleError } = await supabase
            .from("user_roles")
            .insert({ user_id: data.user.id, role: "school_head" });
          
          if (roleError) {
            console.error("Role assignment error:", roleError);
            toast.error("There was an issue with your account. Please contact support.");
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
          
          toast.success("Welcome back! Your account has been updated.");
        } else {
          toast.success("Login successful!");
        }

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
    <>
      <PasswordResetDialog 
        open={showPasswordResetDialog} 
        onClose={() => {
          setShowPasswordResetDialog(false);
          navigate("/principal-dashboard");
        }} 
      />
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f9f0eb" }}>
      <Card className="w-full max-w-md p-8 shadow-lg">
        <div className="flex flex-col items-center mb-6">
          <Building2 className="h-12 w-12 mb-3" style={{ color: "#236130" }} />
          <h1 className="text-2xl font-bold" style={{ color: "#236130" }}>
            School Head Portal
          </h1>
          <p className="text-muted-foreground text-center mt-2">
            {mode === "login" 
              ? "Sign in to your account" 
              : mode === "signup" 
                ? "Create your School Head account"
                : "Reset your password"}
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

          {mode === "reset" ? null : (
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
            style={{ backgroundColor: "#236130", color: "white" }}
            disabled={loading}
          >
            {loading ? "Processing..." : mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Email"}
          </Button>
        </form>

        <div className="mt-4 text-center space-y-2">
          {mode === "login" && (
            <button
              onClick={() => setMode("reset")}
              className="text-sm hover:underline block w-full"
              style={{ color: "#236130" }}
            >
              Forgot password?
            </button>
          )}
          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-sm hover:underline"
            style={{ color: "#236130" }}
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
    </>
  );
}
