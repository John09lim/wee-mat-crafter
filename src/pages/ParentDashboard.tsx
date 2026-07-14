import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  HeartHandshake,
  KeyRound,
  LoaderCircle,
  Search,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ParentSchoolReport } from "@/features/parent-dashboard/ParentSchoolReport";
import type { ParentSchoolDashboardData } from "@/features/parent-dashboard/types";
import { supabase } from "@/integrations/supabase/client";

const supportSteps = [
  {
    number: "01",
    icon: CalendarDays,
    title: "Review the week ahead",
    copy: "Read the planned competencies, activities, materials, and expected outputs with your learner.",
  },
  {
    number: "02",
    icon: BookOpenCheck,
    title: "Prepare the listed materials",
    copy: "Make modules, activity sheets, and other teacher-provided resources available before they are needed.",
  },
  {
    number: "03",
    icon: CheckCircle2,
    title: "Check manageable progress",
    copy: "Use the matrix as a daily checklist and encourage steady work without adding unnecessary tasks.",
  },
];

const ParentDashboard = () => {
  const navigate = useNavigate();
  const [schoolId, setSchoolId] = useState("");
  const [dashboardData, setDashboardData] = useState<ParentSchoolDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLookup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedSchoolId = schoolId.trim().toLocaleUpperCase().replace(/\s+/g, "");

    if (!/^[A-Z0-9-]{4,20}$/.test(normalizedSchoolId)) {
      setErrorMessage("Enter the 4–20 character School ID provided by the school principal.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      setSchoolId(normalizedSchoolId);

      const { data, error } = await supabase.functions.invoke<ParentSchoolDashboardData>(
        "get-parent-school-dashboard",
        { body: { schoolId: normalizedSchoolId } },
      );

      if (error) {
        let message = error.message || "Unable to load the school dashboard.";
        const context = "context" in error ? error.context : null;
        if (context instanceof Response) {
          const payload = await context.clone().json().catch(() => null) as { error?: string } | null;
          if (payload?.error) message = payload.error;
        }
        throw new Error(message);
      }

      if (!data) throw new Error("No school dashboard data was returned.");
      setDashboardData(data);
    } catch (error: unknown) {
      setDashboardData(null);
      setErrorMessage(error instanceof Error ? error.message : "Unable to load the school dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const resetSchool = () => {
    setDashboardData(null);
    setSchoolId("");
    setErrorMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-[#F6F0E7]">
      <section className="border-b border-[#D8D0C4] py-10 sm:py-14">
        <div className="container max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,.78fr)] lg:items-center">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#236130]/20 bg-[#FFFCF7] text-[#236130] shadow-sm">
                <HeartHandshake className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-[#B48619]">
                Parent dashboard
              </p>
              <h1 className="font-display mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-[#173F2A] sm:text-5xl lg:text-6xl">
                See how your school is moving through the week.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                Enter the School ID from the principal to view teacher submissions, weekly completion, and the latest WeeLMat files—without changing school records.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button variant="outline" onClick={() => navigate("/learn-more")} className="gap-2 border-[#BDB2A3] bg-[#FFFCF7]">
                  Learn how WeeLMat works
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button variant="ghost" onClick={() => navigate("/role-dashboard")}>Choose another dashboard</Button>
              </div>
            </div>

            <aside className="relative overflow-hidden rounded-[1.75rem] border border-[#236130]/15 bg-[#174D2C] p-6 text-white shadow-[0_28px_70px_-52px_rgba(20,32,25,.8)] sm:p-8">
              <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full border border-white/10" aria-hidden="true" />
              <div className="relative">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[#E9C65D]">
                    <KeyRound className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className="flex items-center gap-2 text-xs text-white/70">
                    <ShieldCheck className="h-4 w-4 text-[#E9C65D]" aria-hidden="true" />
                    View-only access
                  </span>
                </div>
                <h2 className="font-display mt-5 text-3xl font-semibold">Open your school report</h2>
                <p className="mt-2 text-sm leading-6 text-white/75">
                  Ask your principal for the School ID shown in their account profile.
                </p>

                <form className="mt-6" onSubmit={handleLookup} noValidate>
                  <Label htmlFor="parentSchoolId" className="text-sm font-semibold text-white">
                    School ID
                  </Label>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="parentSchoolId"
                      value={schoolId}
                      onChange={(event) => {
                        setSchoolId(event.target.value.toLocaleUpperCase());
                        if (errorMessage) setErrorMessage("");
                      }}
                      placeholder="Enter School ID"
                      maxLength={20}
                      autoComplete="off"
                      aria-describedby={errorMessage ? "schoolIdError" : "schoolIdHelp"}
                      aria-invalid={Boolean(errorMessage)}
                      className="h-12 border-white/25 bg-white text-[#173F2A] placeholder:text-[#6F776F] focus-visible:ring-[#E9C65D] sm:flex-1"
                    />
                    <Button
                      type="submit"
                      disabled={loading || !schoolId.trim()}
                      className="h-12 gap-2 bg-[#D9AA32] px-5 text-[#173F2A] hover:bg-[#E7BD55]"
                    >
                      {loading ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Search className="h-4 w-4" aria-hidden="true" />
                      )}
                      {loading ? "Opening…" : "View school"}
                    </Button>
                  </div>
                  {errorMessage ? (
                    <p id="schoolIdError" role="alert" className="mt-3 rounded-lg border border-[#F0A99E]/35 bg-[#7B281E]/40 p-3 text-sm text-[#FFE9E5]">
                      {errorMessage}
                    </p>
                  ) : (
                    <p id="schoolIdHelp" className="mt-3 text-xs leading-5 text-white/60">
                      The ID must match the one saved by the school principal.
                    </p>
                  )}
                </form>

                <div className="mt-6 border-t border-white/15 pt-5">
                  <p className="flex items-center gap-2 text-xs leading-5 text-white/65">
                    <ClipboardCheck className="h-4 w-4 shrink-0 text-[#E9C65D]" aria-hidden="true" />
                    Parents can view and download submissions. Editing remains restricted to authorized school staff.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {dashboardData && (
        <section className="py-10 sm:py-14" aria-label={`${dashboardData.school.school_name} submission report`}>
          <div className="container max-w-7xl">
            <ParentSchoolReport data={dashboardData} onChangeSchool={resetSchool} />
          </div>
        </section>
      )}

      <section className="border-t border-[#D8D0C4] bg-[#FFFCF7] py-12 sm:py-16" aria-labelledby="family-routine-heading">
        <div className="container max-w-7xl">
          <div className="grid gap-5 border-b border-[#DED5C8] pb-8 md:grid-cols-[.75fr_1.25fr] md:items-end">
            <h2 id="family-routine-heading" className="font-display text-3xl font-semibold text-[#173F2A] sm:text-4xl">A simple family routine</h2>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground md:justify-self-end">
              The matrix supports the teacher’s plan. Families help by making that plan visible and manageable at home.
            </p>
          </div>

          <div className="divide-y divide-[#DED5C8] md:grid md:grid-cols-3 md:divide-x md:divide-y-0">
            {supportSteps.map(({ number, icon: Icon, title, copy }) => (
              <article key={title} className="py-7 md:px-7 md:first:pl-0 md:last:pr-0">
                <div className="flex items-center justify-between">
                  <span className="font-display text-2xl font-semibold text-[#B48619]">{number}</span>
                  <Icon className="h-6 w-6 text-[#236130]" aria-hidden="true" />
                </div>
                <h3 className="font-display mt-7 text-2xl font-semibold text-[#173F2A]">{title}</h3>
                <p className="mt-3 leading-7 text-muted-foreground">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export default ParentDashboard;
