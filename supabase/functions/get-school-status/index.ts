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
    const filter = url.searchParams.get("filter"); // Optional filter for status

    console.log("Fetching school status for:", { schoolName, weekStart, weekEnd, filter });

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
      .select("school_name, district_name, principal_name, principal_id")
      .eq("school_name", decodedSchoolName)
      .maybeSingle();

    if (schoolError) {
      console.error("Error fetching school:", schoolError);
    }

    // Fetch principal profile for image and email
    let principalProfile = null;
    if (schoolData?.principal_id) {
      const { data: principalData } = await supabase
        .from("profiles")
        .select("teacher_name, email, profile_image_url")
        .eq("user_id", schoolData.principal_id)
        .maybeSingle();
      principalProfile = principalData;
    }

    // Fetch all teachers assigned to this school
    const { data: teachersData, error: teachersError } = await supabase
      .from("school_assignments")
      .select("teacher_name, user_id, grade_level, section, profile_image_url")
      .eq("school_name", decodedSchoolName);

    if (teachersError) {
      console.error("Error fetching teachers:", teachersError);
    }

    // Fetch ALL submissions for this school (not just the current week)
    let submissionsQuery = supabase
      .from("teacher_submissions")
      .select("id, user_id, teacher_name, subject, grade_level, section, status, file_url, file_type, week_start, week_end, created_at, principal_notes")
      .eq("school_name", decodedSchoolName)
      .order("created_at", { ascending: false });

    const { data: allSubmissionsData, error: allSubmissionsError } = await submissionsQuery;

    if (allSubmissionsError) {
      console.error("Error fetching all submissions:", allSubmissionsError);
    }

    // Fetch submissions for the specified week (for teacher status)
    let weekSubmissionsData: any[] = [];
    if (weekStart && weekEnd) {
      const { data: weekSubs } = await supabase
        .from("teacher_submissions")
        .select("user_id, teacher_name, status, created_at")
        .eq("school_name", decodedSchoolName)
        .gte("week_start", weekStart)
        .lte("week_end", weekEnd);
      weekSubmissionsData = weekSubs || [];
    }

    // Calculate submission status for each teacher (for specified week)
    const submittedUserIds = new Set(weekSubmissionsData.map((s) => s.user_id) || []);
    
    const teacherStatuses = (teachersData || []).map((teacher) => ({
      teacher_name: teacher.teacher_name || "Unknown Teacher",
      user_id: teacher.user_id,
      grade_level: teacher.grade_level,
      section: teacher.section,
      profile_image_url: teacher.profile_image_url,
      submitted: teacher.user_id ? submittedUserIds.has(teacher.user_id) : false,
    }));

    // Calculate past weeks data for the calendar
    const pastWeeksData: Array<{
      weekStart: string;
      weekEnd: string;
      submittedCount: number;
      totalTeachers: number;
      percentage: number;
    }> = [];

    // Generate weeks from August 11, 2025 onwards
    const startDate = new Date(2025, 7, 11); // August 11, 2025 (month is 0-indexed)
    const currentDate = new Date(); // Dynamic current date

    // Helper to get Monday of week
    const getMondayOfWeek = (date: Date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      d.setDate(d.getDate() + diff);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    // Helper to get Friday of week
    const getFridayOfWeek = (monday: Date) => {
      const friday = new Date(monday);
      friday.setDate(monday.getDate() + 4);
      friday.setHours(23, 59, 59, 999);
      return friday;
    };

    // Format date to yyyy-MM-dd
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0];
    };

    // Generate weeks from start to current + 4 weeks
    let currentWeek = getMondayOfWeek(startDate);
    const futureLimit = new Date(currentDate);
    futureLimit.setDate(futureLimit.getDate() + 28); // 4 weeks into future

    while (currentWeek <= futureLimit) {
      const monday = new Date(currentWeek);
      const friday = getFridayOfWeek(monday);
      
      // Count submissions for this week
      const weekStartStr = formatDate(monday);
      const weekEndStr = formatDate(friday);
      
      const weekSubmissions = (allSubmissionsData || []).filter(s => 
        s.week_start >= weekStartStr && s.week_end <= weekEndStr
      );
      
      const submittedInWeek = new Set(weekSubmissions.map(s => s.user_id));
      const submittedCount = (teachersData || []).filter(t => 
        t.user_id ? submittedInWeek.has(t.user_id) : false
      ).length;
      
      const totalTeachers = teachersData?.length || 0;
      const percentage = totalTeachers > 0 ? Math.round((submittedCount / totalTeachers) * 100) : 0;

      pastWeeksData.push({
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
        submittedCount,
        totalTeachers,
        percentage,
      });

      // Move to next week
      currentWeek.setDate(currentWeek.getDate() + 7);
    }

    // Apply status filter if provided
    let filteredSubmissions = allSubmissionsData || [];
    if (filter && filter !== 'all') {
      filteredSubmissions = filteredSubmissions.filter(s => s.status === filter);
    }

    console.log("Returning data:", {
      school: schoolData,
      teachersCount: teacherStatuses.length,
      submissionsCount: filteredSubmissions.length,
      pastWeeksCount: pastWeeksData.length
    });

    return new Response(
      JSON.stringify({
        school: {
          ...schoolData,
          principal_email: principalProfile?.email || null,
          principal_profile_image_url: principalProfile?.profile_image_url || null
        } || {
          school_name: decodedSchoolName,
          district_name: null,
          principal_name: null,
          principal_email: null,
          principal_profile_image_url: null
        },
        teachers: teacherStatuses,
        submissions: filteredSubmissions,
        totalSubmissions: (allSubmissionsData || []).length,
        pastWeeks: pastWeeksData,
        stats: {
          total: (allSubmissionsData || []).length,
          pending: (allSubmissionsData || []).filter(s => s.status === 'pending').length,
          reviewed: (allSubmissionsData || []).filter(s => s.status === 'reviewed').length,
          returned: (allSubmissionsData || []).filter(s => s.status === 'returned').length,
        }
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