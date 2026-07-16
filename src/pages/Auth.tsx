import { useEffect, useState, type FormEvent } from "react";
import { Lock, Mail, School, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import PasswordResetDialog from "@/components/PasswordResetDialog";
import {
  AuthField,
  AuthPortal,
  type AuthPortalMode,
} from "@/components/auth/AuthPortal";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const resolveTeacherPortalDestination = async (userId: string) => {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) return "/my-account";
  return data?.some(({ role }) => role === "school_head") ? "/dashboard" : "/my-account";
};

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<AuthPortalMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [school, setSchool] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPasswordResetDialog, setShowPasswordResetDialog] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth event:", event);

      if (event === "PASSWORD_RECOVERY") {
        setShowPasswordResetDialog(true);
        return;
      }

      if (session?.user && !showPasswordResetDialog) {
        window.setTimeout(() => {
          void resolveTeacherPortalDestination(session.user.id).then((destination) => {
            navigate(destination);
          });
        }, 0);
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
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user && !showPasswordResetDialog) {
          void resolveTeacherPortalDestination(session.user.id).then((destination) => {
            navigate(destination);
          });
        }
      });
    }

    return () => subscription.unsubscribe();
  }, [navigate, location.hash, showPasswordResetDialog]);

  const insertOrUpdateProfile = async (uid: string) => {
    const { error } = await supabase.from("profiles").upsert(
      {
        user_id: uid,
        teacher_name: teacherName,
        school,
        email,
      },
      { onConflict: "user_id" },
    );
    if (error) throw error;
  };

  const handlePasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast("Password reset email sent! Check your inbox.");
      setMode("login");
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Failed to send password reset email");
      setFormError(message);
      toast(message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          const message = error.message.includes("Invalid login credentials")
            ? "Invalid email or password. Please try again."
            : "Login failed. Please try again.";
          setFormError(message);
          toast.error(message);
          return;
        }

        const { data: accountRoles, error: rolesError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id);

        if (rolesError) throw rolesError;

        const isPrincipal = accountRoles?.some(({ role }) => role === "school_head");
        if (isPrincipal) {
          toast.success("Welcome! Opening the teacher workspace with your principal account.");
          navigate("/dashboard");
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
              "Teacher",
            school: "Please update",
            district_name: "Please update",
          });
          toast("Profile created. Please update your information.");
        }

        const { data: assignmentMatch } = await supabase
          .from("school_assignments")
          .select("id, school_name, district_name, principal_id")
          .eq("teacher_email", data.user.email!.toLowerCase())
          .is("user_id", null)
          .limit(1)
          .maybeSingle();

        if (assignmentMatch) {
          await supabase
            .from("school_assignments")
            .update({ user_id: data.user.id })
            .eq("id", assignmentMatch.id);

          await supabase.from("profiles").upsert(
            {
              user_id: data.user.id,
              email: data.user.email!,
              teacher_name:
                profile?.teacher_name ||
                data.user.user_metadata?.full_name ||
                data.user.email?.split("@")[0] ||
                "Teacher",
              school: assignmentMatch.school_name,
              district_name: assignmentMatch.district_name,
            },
            { onConflict: "user_id" },
          );

          toast.success(`Welcome! You've been linked to ${assignmentMatch.school_name}!`);
        }

        const hasTeacherRole = accountRoles?.some(({ role }) => role === "teacher");

        if (!hasTeacherRole) {
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
        } else if (!assignmentMatch) {
          toast.success("Welcome back!");
        }

        navigate("/my-account");
        return;
      }

      if (
        !teacherName.trim() ||
        !school.trim() ||
        !email.trim() ||
        !password.trim() ||
        !password2.trim()
      ) {
        const message = "Please fill out all fields.";
        setFormError(message);
        toast(message);
        return;
      }

      if (password !== password2) {
        const message = "Passwords do not match.";
        setFormError(message);
        toast(message);
        return;
      }

      try {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: teacherName,
              role: "teacher",
            },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });

        if (signUpError) {
          if (
            signUpError.message.includes("already registered") ||
            signUpError.message.includes("User already registered")
          ) {
            const message = "This email is already registered. Please log in instead.";
            setFormError(message);
            toast.error(message);
            setMode("login");
            return;
          }
          throw signUpError;
        }

        if (signUpData.session?.user) {
          const userId = signUpData.session.user.id;
          const { data: assignmentMatch } = await supabase
            .from("school_assignments")
            .select("id, school_name, district_name, principal_id, grade_level, section")
            .eq("teacher_email", email.toLowerCase())
            .is("user_id", null)
            .limit(1)
            .maybeSingle();

          if (assignmentMatch) {
            await supabase
              .from("school_assignments")
              .update({ user_id: userId })
              .eq("id", assignmentMatch.id);

            await supabase.from("profiles").upsert(
              {
                user_id: userId,
                email,
                teacher_name: teacherName,
                school: assignmentMatch.school_name,
                district_name: assignmentMatch.district_name,
              },
              { onConflict: "user_id" },
            );

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
        const message =
          "Account created but there was an error setting up your profile. Please contact support.";
        setFormError(message);
        toast.error(message);
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Authentication error");
      setFormError(message);
      toast(message);
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
          navigate("/my-account");
        }}
      />

      <AuthPortal
        role="teacher"
        mode={mode}
        loading={loading}
        onSubmit={mode === "reset" ? handlePasswordReset : handleAuth}
        onModeChange={handleModeChange}
        formError={mismatchError ? null : formError}
      >
        {mode === "signup" ? (
          <>
            <AuthField
              id="teacher-name"
              name="name"
              label="Teacher name"
              icon={User}
              value={teacherName}
              onChange={(event) => setTeacherName(event.target.value)}
              placeholder="Enter your complete name"
              autoComplete="name"
              required
            />
            <AuthField
              id="teacher-school"
              name="organization"
              label="School name"
              icon={School}
              value={school}
              onChange={(event) => setSchool(event.target.value)}
              placeholder="Enter your school name"
              autoComplete="organization"
              required
            />
          </>
        ) : null}

        <AuthField
          id="teacher-email"
          name="email"
          label="Email address"
          icon={Mail}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="teacher@example.com"
          autoComplete="email"
          helper="Use your DepEd email address."
          required
        />

        {mode !== "reset" ? (
          <AuthField
            id="teacher-password"
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
            id="teacher-password-confirmation"
            name="password-confirmation"
            label="Confirm password"
            icon={Lock}
            type="password"
            value={password2}
            onChange={(event) => {
              setPassword2(event.target.value);
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
};

export default Auth;
