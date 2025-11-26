
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { Building2, Users, GraduationCap } from "lucide-react";

type UserRole = "teacher" | "school_head" | "supervisor";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get("role") as UserRole | null;
  
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [role, setRole] = useState<UserRole>(roleParam || "teacher");
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


  const handleAuth = async () => {
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast("Logged in");
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
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: role
          }
        }
      });
      if (signUpError) throw signUpError;

      // If user is created but not confirmed, try to sign them in immediately
      if (signUpData.user && !signUpData.session) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (!signInError && signInData.session?.user) {
          await insertOrUpdateProfile(signInData.session.user.id);
          toast(`Welcome, ${teacherName}!`);
          navigate("/my-account");
          return;
        }
      }

      // If we have a session from signup
      if (signUpData.session?.user) {
        await insertOrUpdateProfile(signUpData.session.user.id);
        toast(`Welcome, ${teacherName}!`);
        navigate("/my-account");
      } else {
        // Fallback - should not happen with email confirmation disabled
        toast("Account created. Please log in to continue.");
        setMode("login");
      }
    } catch (e: any) {
      toast(e.message || "Authentication error");
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = () => {
    switch (role) {
      case "school_head": return "School Head";
      case "supervisor": return "Supervisor";
      default: return "Teacher";
    }
  };

  const getRoleIcon = () => {
    switch (role) {
      case "school_head": return <Building2 className="w-5 h-5" />;
      case "supervisor": return <Users className="w-5 h-5" />;
      default: return <GraduationCap className="w-5 h-5" />;
    }
  };

  return (
    <main className="min-h-[calc(100vh-160px)] flex items-center py-12">
      <section className="container">
        <div className="max-w-md mx-auto">
          <div className="rounded-2xl border-2 bg-card p-8 shadow-lg">
            {mode === "signup" && (
              <div className="flex items-center justify-center gap-2 mb-6 p-3 rounded-lg bg-primary/10 text-primary">
                {getRoleIcon()}
                <span className="font-semibold">Signing up as {getRoleLabel()}</span>
              </div>
            )}
            
            <h1 className="text-2xl font-semibold mb-6">
              {mode === "login" ? "Login to WeeLMat" : `Create ${getRoleLabel()} Account`}
            </h1>
            
            <div className="space-y-4">
              {mode === "signup" && !roleParam && (
                <div className="space-y-2">
                  <Label>I am a</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={role === "teacher" ? "default" : "outline"}
                      className="flex flex-col h-auto py-3"
                      onClick={() => setRole("teacher")}
                    >
                      <GraduationCap className="w-5 h-5 mb-1" />
                      <span className="text-xs">Teacher</span>
                    </Button>
                    <Button
                      type="button"
                      variant={role === "school_head" ? "default" : "outline"}
                      className="flex flex-col h-auto py-3"
                      onClick={() => setRole("school_head")}
                    >
                      <Building2 className="w-5 h-5 mb-1" />
                      <span className="text-xs">School Head</span>
                    </Button>
                    <Button
                      type="button"
                      variant={role === "supervisor" ? "default" : "outline"}
                      className="flex flex-col h-auto py-3"
                      onClick={() => setRole("supervisor")}
                    >
                      <Users className="w-5 h-5 mb-1" />
                      <span className="text-xs">Supervisor</span>
                    </Button>
                  </div>
                </div>
              )}
              
              {mode === "signup" && (
                <>
                  <div>
                    <Label htmlFor="teacherName">
                      {role === "teacher" ? "Name of Teacher" : role === "school_head" ? "Name of School Head" : "Name of Supervisor"}
                    </Label>
                    <Input id="teacherName" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="school">
                      {role === "supervisor" ? "District/Division" : "School"}
                    </Label>
                    <Input id="school" value={school} onChange={(e) => setSchool(e.target.value)} />
                  </div>
                </>
              )}
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              
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
              
              <Button className="w-full" onClick={handleAuth} disabled={loading}>
                {loading ? "Please wait…" : mode === "login" ? "Login" : "Sign up"}
              </Button>
              
              <p className="text-sm text-muted-foreground text-center">
                {mode === "login" ? "No account?" : "Already have an account?"}{" "}
                <button
                  className="underline text-primary font-medium"
                  onClick={() => setMode(mode === "login" ? "signup" : "login")}
                >
                  {mode === "login" ? "Sign up" : "Login"}
                </button>
              </p>

            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Auth;
