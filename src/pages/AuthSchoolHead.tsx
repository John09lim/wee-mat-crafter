import { useEffect, useState, type FormEvent } from "react";
import { Lock, Mail, MapPin, School, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import PasswordResetDialog from "@/components/PasswordResetDialog";
import {
  AuthField,
  AuthPortal,
  type AuthPortalMode,
} from "@/components/auth/AuthPortal";
import { supabase } from "@/integrations/supabase/client";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

export default function AuthSchoolHead() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<AuthPortalMode>("login");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPasswordResetDialog, setShowPasswordResetDialog] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [district, setDistrict] = useState("");

  useEffect(() => {
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && !showPasswordResetDialog) {
        await checkUserRole(user.id);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setShowPasswordResetDialog(true);
        return;
      }

      if (session?.user && !showPasswordResetDialog) {
        checkUserRole(session.user.id);
      }
    });

    const hashParams = new URLSearchParams(location.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const type = hashParams.get("type");

    if (type === "recovery" && accessToken) {
      supabase.auth
        .setSession({
          access_token: accessToken,
          refresh_token: hashParams.get("refresh_token") || "",
        })
        .then(() => {
          setShowPasswordResetDialog(true);
        });
    } else {
      checkAuth();
    }

    return () => subscription.unsubscribe();
  }, [location.hash, navigate, showPasswordResetDialog]);

  const handlePasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth-school-head`,
      });

      if (error) throw error;

      toast.success("Password reset email sent! Check your inbox.");
      setMode("login");
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Failed to send password reset email");
      console.error("Password reset error:", error);
      setFormError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        if (password !== confirmPassword) {
          const message = "Passwords do not match.";
          setFormError(message);
          toast.error(message);
          setLoading(false);
          return;
        }

        if (!name || !school || !district) {
          const message = "Please fill in all fields.";
          setFormError(message);
          toast.error(message);
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
                role: "school_head",
              },
            },
          });

          if (error) {
            if (
              error.message.includes("already registered") ||
              error.message.includes("User already registered")
            ) {
              const message = "This email is already registered. Please log in instead.";
              setFormError(message);
              toast.error(message);
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

              await supabase.from("profiles").upsert(
                {
                  user_id: data.user.id,
                  email,
                  teacher_name: name,
                  school: schoolMatch.school_name,
                  district_name: schoolMatch.district_name,
                },
                { onConflict: "user_id" },
              );

              toast.success(`Welcome! You've been linked to ${schoolMatch.school_name}!`);
            } else {
              await supabase.from("profiles").insert({
                user_id: data.user.id,
                email,
                teacher_name: name,
                school,
                district_name: district,
              });

              toast.success("Account created successfully!");
            }

            navigate("/principal-dashboard");
          }
        } catch (profileError) {
          console.error("Error creating profile:", profileError);
          const message =
            "Account created but there was an error setting up your profile. Please contact support.";
          setFormError(message);
          toast.error(message);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          const message = error.message.includes("Invalid login credentials")
            ? "Invalid email or password. Please try again."
            : "Login failed. Please try again.";
          setFormError(message);
          toast.error(message);
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
            teacher_name:
              data.user.user_metadata?.full_name ||
              data.user.email?.split("@")[0] ||
              "School Head",
            school: "Please update",
            district_name: "Please update",
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
          const { error: roleError } = await supabase
            .from("user_roles")
            .insert({ user_id: data.user.id, role: "school_head" });

          if (roleError) {
            console.error("Role assignment error:", roleError);
            const message = "There was an issue with your account. Please contact support.";
            setFormError(message);
            toast.error(message);
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
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Authentication failed");
      console.error("Auth error:", error);
      setFormError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (nextMode: AuthPortalMode) => {
    setFormError(null);
    setMode(nextMode);
  };

  const mismatchError = formError === "Passwords do not match." ? formError : null;

  return (
    <>
      <PasswordResetDialog
        open={showPasswordResetDialog}
        onClose={() => {
          setShowPasswordResetDialog(false);
          navigate("/principal-dashboard");
        }}
      />

      <AuthPortal
        role="principal"
        mode={mode}
        loading={loading}
        onSubmit={mode === "reset" ? handlePasswordReset : handleAuth}
        onModeChange={handleModeChange}
        formError={mismatchError ? null : formError}
      >
        {mode === "signup" ? (
          <>
            <AuthField
              id="principal-name"
              name="name"
              label="Principal name"
              icon={User}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter your complete name"
              autoComplete="name"
              required
            />
            <AuthField
              id="principal-school"
              name="organization"
              label="School name"
              icon={School}
              value={school}
              onChange={(event) => setSchool(event.target.value)}
              placeholder="Enter your school name"
              autoComplete="organization"
              required
            />
            <AuthField
              id="principal-district"
              name="address-level2"
              label="District name"
              icon={MapPin}
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
              placeholder="Enter your district name"
              autoComplete="address-level2"
              required
            />
          </>
        ) : null}

        <AuthField
          id="principal-email"
          name="email"
          label="Email address"
          icon={Mail}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="principal@example.com"
          autoComplete="email"
          helper="Use the email connected to your school record."
          required
        />

        {mode !== "reset" ? (
          <AuthField
            id="principal-password"
            name="password"
            label="Password"
            icon={Lock}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            helper={mode === "login" ? "Enter your password to continue." : "Use at least 6 characters."}
            minLength={mode === "signup" ? 6 : undefined}
            required
          />
        ) : null}

        {mode === "signup" ? (
          <AuthField
            id="principal-password-confirmation"
            name="password-confirmation"
            label="Confirm password"
            icon={Lock}
            type="password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              if (mismatchError) setFormError(null);
            }}
            placeholder="Enter your password again"
            autoComplete="new-password"
            error={mismatchError}
            minLength={6}
            required
          />
        ) : null}
      </AuthPortal>
    </>
  );
}
