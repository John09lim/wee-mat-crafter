import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate("/dashboard");
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) navigate("/dashboard");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async () => {
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast("Logged in");
        navigate("/dashboard");
      } else {
        const redirectUrl = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl },
        });
        if (error) throw error;
        toast("Check your email to confirm your account");
      }
    } catch (e: any) {
      toast(e.message || "Authentication error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-160px)] flex items-center">
      <section className="container max-w-md w-full">
        <div className="rounded-2xl border bg-card p-8 shadow-sm">
          <h1 className="text-2xl font-semibold mb-6">{mode === "login" ? "Login" : "Create account"}</h1>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleAuth} disabled={loading}>
              {loading ? "Please wait…" : mode === "login" ? "Login" : "Sign up"}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              {mode === "login" ? "No account?" : "Already have an account?"}{" "}
              <button className="underline" onClick={() => setMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "Sign up" : "Login"}</button>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Auth;
