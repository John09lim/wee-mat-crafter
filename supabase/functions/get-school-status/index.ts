import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const schoolName = url.searchParams.get("school");
    const weekStart = url.searchParams.get("weekStart");
    const weekEnd = url.searchParams.get("weekEnd");

    console.log("Fetching school status for:", { schoolName, weekStart, weekEnd });

    if (!schoolName) {
      return new Response(
        JSON.stringify({ error: "School name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to bypass RLS for public access
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const decodedSchoolName = decodeURIComponent(schoolName);

    // Fetch school info
    const { data: schoolData, error: schoolError } = await supabase
      .from("schools")
      .select("school_name, district_name, principal_name")
      .eq("school_name", decodedSchoolName)
      .maybeSingle();

    if (schoolError) {
      console.error("Error fetching school:", schoolError);
    }

    // Fetch all teachers assigned to this school
    const { data: teachersData, error: teachersError } = await supabase
      .from("school_assignments")
      .select("teacher_name, user_id, grade_level, section, profile_image_url")
      .eq("school_name", decodedSchoolName);

    if (teachersError) {
      console.error("Error fetching teachers:", teachersError);
    }

    // Fetch submissions for the specified week
    let submissionsQuery = supabase
      .from("teacher_submissions")
      .select("user_id, teacher_name, created_at")
      .eq("school_name", decodedSchoolName);

    if (weekStart && weekEnd) {
      submissionsQuery = submissionsQuery
        .gte("week_start", weekStart)
        .lte("week_end", weekEnd);
    }

    const { data: submissionsData, error: submissionsError } = await submissionsQuery;

    if (submissionsError) {
      console.error("Error fetching submissions:", submissionsError);
    }

    // Calculate submission status for each teacher
    const submittedUserIds = new Set(submissionsData?.map((s) => s.user_id) || []);
    
    const teacherStatuses = (teachersData || []).map((teacher) => ({
      teacher_name: teacher.teacher_name || "Unknown Teacher",
      user_id: teacher.user_id,
      grade_level: teacher.grade_level,
      section: teacher.section,
      profile_image_url: teacher.profile_image_url,
      submitted: teacher.user_id ? submittedUserIds.has(teacher.user_id) : false,
    }));

    console.log("Returning data:", {
      school: schoolData,
      teachersCount: teacherStatuses.length,
      submissionsCount: submissionsData?.length || 0
    });

    return new Response(
      JSON.stringify({
        school: schoolData || {
          school_name: decodedSchoolName,
          district_name: null,
          principal_name: null
        },
        teachers: teacherStatuses,
        totalSubmissions: submissionsData?.length || 0
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
