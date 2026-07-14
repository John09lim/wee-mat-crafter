import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

type ManagedTeacher = {
  user_id: string | null;
  teacher_name: string | null;
  teacher_email: string | null;
  grade_level: string | null;
  section: string | null;
  profile_image_url: string | null;
};

type Submission = {
  id: string;
  user_id: string;
  teacher_name: string;
  subject: string;
  grade_level: string;
  section: string | null;
  week_start: string;
  week_end: string;
  file_url: string;
  file_type: string;
  status: string;
  created_at: string;
};

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

const normalizeName = (value: string | null | undefined) =>
  (value || "")
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, " ");

const teacherKey = (teacher: ManagedTeacher) =>
  teacher.user_id ||
  teacher.teacher_email?.trim().toLocaleLowerCase() ||
  `${normalizeName(teacher.teacher_name)}|${teacher.grade_level || ""}|${teacher.section || ""}`;

const getManilaInstructionalWeek = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(new Date());

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";
  const year = Number(value("year"));
  const month = Number(value("month"));
  const day = Number(value("day"));
  const weekday = value("weekday");
  const weekdayNumber: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const current = new Date(Date.UTC(year, month - 1, day));
  const currentDay = weekdayNumber[weekday] ?? current.getUTCDay();
  const offsetToMonday = currentDay === 6 ? 2 : currentDay === 0 ? 1 : 1 - currentDay;
  const monday = new Date(current);
  monday.setUTCDate(current.getUTCDate() + offsetToMonday);
  const friday = new Date(monday);
  friday.setUTCDate(monday.getUTCDate() + 4);

  return {
    weekStart: monday.toISOString().slice(0, 10),
    weekEnd: friday.toISOString().slice(0, 10),
  };
};

const createDownloadUrl = (submission: Submission) => {
  try {
    const url = new URL(submission.file_url);
    const extension = submission.file_type?.toLocaleLowerCase() || "pdf";
    const safeBaseName = `${submission.teacher_name}_${submission.subject}_${submission.week_start}`
      .replace(/[^a-z0-9_-]+/gi, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 100);
    url.searchParams.set("download", `${safeBaseName || "WeeLMat"}.${extension}`);
    return url.toString();
  } catch {
    return submission.file_url;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return respond({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const schoolId = String(body?.schoolId || "")
      .trim()
      .toLocaleUpperCase()
      .replace(/\s+/g, "");

    if (!/^[A-Z0-9-]{4,20}$/.test(schoolId)) {
      return respond({ error: "Enter a valid School ID." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("The reporting service is not configured.");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: principal, error: principalError } = await supabase
      .from("profiles")
      .select("user_id, teacher_name, school, district_name")
      .eq("school_id", schoolId)
      .maybeSingle();

    if (principalError) throw principalError;
    if (!principal) {
      return respond(
        { error: "School ID not found. Please confirm it with the school principal." },
        404,
      );
    }

    const { data: schoolHeadRole, error: roleError } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", principal.user_id)
      .eq("role", "school_head")
      .maybeSingle();

    if (roleError) throw roleError;
    if (!schoolHeadRole) {
      return respond({ error: "This School ID is not linked to a principal account." }, 404);
    }

    const { weekStart, weekEnd } = getManilaInstructionalWeek();
    const [teachersResult, recentResult, weeklyResult] = await Promise.all([
      supabase
        .from("school_assignments")
        .select("user_id, teacher_name, teacher_email, grade_level, section, profile_image_url")
        .eq("principal_id", principal.user_id),
      supabase
        .from("teacher_submissions")
        .select("id, user_id, teacher_name, subject, grade_level, section, week_start, week_end, file_url, file_type, status, created_at")
        .eq("principal_id", principal.user_id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("teacher_submissions")
        .select("id, user_id, teacher_name, subject, grade_level, section, week_start, week_end, file_url, file_type, status, created_at")
        .eq("principal_id", principal.user_id)
        .gte("week_start", weekStart)
        .lte("week_start", weekEnd),
    ]);

    if (teachersResult.error) throw teachersResult.error;
    if (recentResult.error) throw recentResult.error;
    if (weeklyResult.error) throw weeklyResult.error;

    const uniqueTeachers = Array.from(
      new Map(
        ((teachersResult.data || []) as ManagedTeacher[]).map((teacher) => [
          teacherKey(teacher),
          teacher,
        ]),
      ).values(),
    );
    const weeklySubmissions = (weeklyResult.data || []) as Submission[];

    const teacherSubmitted = (teacher: ManagedTeacher) =>
      weeklySubmissions.some(
        (submission) =>
          (teacher.user_id && submission.user_id === teacher.user_id) ||
          normalizeName(submission.teacher_name) === normalizeName(teacher.teacher_name),
      );

    const teachers = uniqueTeachers.map((teacher) => ({
      teacher_name: teacher.teacher_name || "Teacher",
      grade_level: teacher.grade_level,
      section: teacher.section,
      profile_image_url: teacher.profile_image_url,
      submitted: teacherSubmitted(teacher),
    }));
    const submittedTeachers = teachers.filter((teacher) => teacher.submitted).length;
    const totalTeachers = teachers.length;

    return respond({
      school: {
        school_id: schoolId,
        school_name: principal.school || "School",
        district_name: principal.district_name,
        principal_name: principal.teacher_name || "School Principal",
      },
      week: {
        week_start: weekStart,
        week_end: weekEnd,
        total_teachers: totalTeachers,
        submitted_teachers: submittedTeachers,
        percentage: totalTeachers === 0 ? 0 : Math.round((submittedTeachers / totalTeachers) * 100),
      },
      teachers,
      submissions: ((recentResult.data || []) as Submission[]).map((submission) => ({
        id: submission.id,
        teacher_name: submission.teacher_name,
        subject: submission.subject,
        grade_level: submission.grade_level,
        section: submission.section,
        week_start: submission.week_start,
        week_end: submission.week_end,
        status: submission.status,
        file_type: submission.file_type,
        created_at: submission.created_at,
        view_url: submission.file_url,
        download_url: createDownloadUrl(submission),
      })),
    });
  } catch (error) {
    console.error("Parent school dashboard error:", error);
    return respond(
      { error: error instanceof Error ? error.message : "Unable to load the school dashboard." },
      500,
    );
  }
});
