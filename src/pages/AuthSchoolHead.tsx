import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, Mail, Lock, User, School as SchoolIcon, MapPin } from "lucide-react";

export default function AuthSchoolHead() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [district, setDistrict] = useState("");

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

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/principal-dashboard`,
          },
        });

        if (error) throw error;

        if (data.user) {
          await supabase.from("profiles").insert({
            user_id: data.user.id,
            email: email,
            teacher_name: name,
            school: school,
            district_name: district,
          });

          await supabase.from("user_roles").insert({
            user_id: data.user.id,
            role: "school_head",
          });

          toast.success("Account created successfully!");
          navigate("/principal-dashboard");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .single();

        if (roleData?.role !== "school_head") {
          await supabase.auth.signOut();
          toast.error("This account is not registered as a School Head");
          setLoading(false);
          return;
        }

        toast.success("Logged in successfully!");
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
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f9f0eb" }}>
      <Card className="w-full max-w-md p-8 shadow-lg">
        <div className="flex flex-col items-center mb-6">
          <Building2 className="h-12 w-12 mb-3" style={{ color: "#236130" }} />
          <h1 className="text-2xl font-bold" style={{ color: "#236130" }}>
            School Head Portal
          </h1>
          <p className="text-muted-foreground text-center mt-2">
            {mode === "login" ? "Sign in to your account" : "Create your School Head account"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
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
            {loading ? "Processing..." : mode === "login" ? "Sign In" : "Create Account"}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-sm hover:underline"
            style={{ color: "#236130" }}
          >
            {mode === "login" 
              ? "Don't have an account? Sign up" 
              : "Already have an account? Sign in"}
          </button>
        </div>

        <div className="mt-4 text-center text-xs text-muted-foreground">
          <p>Other login portals:</p>
          <div className="flex justify-center gap-3 mt-2">
            <button
              onClick={() => navigate("/auth")}
              className="hover:underline"
              style={{ color: "#236130" }}
            >
              Teacher Login
            </button>
            <button
              onClick={() => navigate("/auth-supervisor")}
              className="hover:underline"
              style={{ color: "#236130" }}
            >
              Supervisor Login
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
