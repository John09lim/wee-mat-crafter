import { useEffect, useState } from "react";
import { ArrowLeft, BookOpenCheck, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import ILAWLessonPlanGenerator from "@/components/ILAWLessonPlanGenerator";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type GeneratorDefaults = {
  school: string;
  district: string;
};

const emptyDefaults: GeneratorDefaults = {
  school: "",
  district: "",
};

const ILAWLessonPlan = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [defaults, setDefaults] = useState<GeneratorDefaults>(emptyDefaults);

  useEffect(() => {
    document.title = "ILAW Lesson Plan Generator - WeeLMat";
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        "Create a four-session ILAW lesson plan with teacher-provided competencies in English or Filipino.",
      );

    const loadTeacherDefaults = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          navigate("/auth", { replace: true });
          return;
        }

        const [profileResponse, assignmentResponse] = await Promise.all([
          supabase
            .from("profiles")
            .select("school, district_name")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("school_assignments")
            .select("school_name, district_name")
            .or(`user_id.eq.${user.id},teacher_email.ilike.${user.email || ""}`)
            .not("principal_id", "is", null)
            .limit(1)
            .maybeSingle(),
        ]);

        if (profileResponse.error) throw profileResponse.error;
        if (assignmentResponse.error) throw assignmentResponse.error;

        const profile = profileResponse.data;
        const assignment = assignmentResponse.data;
        setDefaults({
          school: assignment?.school_name || profile?.school || "",
          district: assignment?.district_name || profile?.district_name || "",
        });
      } catch (error) {
        console.error("Unable to load ILAW generator defaults", error);
        toast.error("Your saved profile details could not be loaded. You can still enter them manually.");
      } finally {
        setLoading(false);
      }
    };

    void loadTeacherDefaults();
  }, [navigate]);

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-background py-8 sm:py-12">
      <div className="container max-w-7xl">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate("/my-account")}
          className="mb-7 -ml-3 gap-2 text-foreground/75 hover:bg-primary/5 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to my account
        </Button>

        <header className="mb-8 flex items-start gap-4 border-b border-border pb-8">
          <span className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary text-primary-foreground shadow-sm">
            <BookOpenCheck className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              ILAW Lesson Plan Generator
            </h1>
            <p className="mt-2 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
              Enter your lesson details, select English or Filipino, and assign a separate approved competency to each session.
            </p>
          </div>
        </header>

        {loading ? (
          <div className="flex min-h-[28rem] items-center justify-center rounded-2xl border border-border bg-card" role="status" aria-live="polite">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" aria-hidden="true" />
              <p className="mt-4 font-medium text-foreground">Loading your teacher profile…</p>
            </div>
          </div>
        ) : (
          <ILAWLessonPlanGenerator
            defaultSchool={defaults.school}
            defaultDistrict={defaults.district}
            onCancel={() => navigate("/my-account")}
          />
        )}
      </div>
    </main>
  );
};

export default ILAWLessonPlan;
