import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const jwt = authHeader.split(" ")[1];

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("Processing submission for user:", user.id);

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const teacherName = formData.get("teacherName") as string;
    const gradeLevel = formData.get("gradeLevel") as string;
    const section = formData.get("section") as string;
    const subject = formData.get("subject") as string;
    const weekStart = formData.get("weekStart") as string;
    const weekEnd = formData.get("weekEnd") as string;
    const principalId = formData.get("principalId") as string;
    const schoolHeadName = formData.get("schoolHeadName") as string;
    const schoolName = formData.get("schoolName") as string;
    const districtName = formData.get("districtName") as string;

    // Validate required fields
    if (!file || !teacherName || !gradeLevel || !section || !subject || !weekStart || !weekEnd) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "File too large. Maximum size is 10MB" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/pdf'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return new Response(JSON.stringify({ error: "Invalid file type. Only DOCX and PDF are allowed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Upload file to storage
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'docx';
    const fileName = `submissions/teacher_${user.id}_${Date.now()}.${fileExt}`;
    
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("weelmat")
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("weelmat")
      .getPublicUrl(fileName);

    console.log("File uploaded successfully:", urlData.publicUrl);

    // Fetch teacher's profile to get school and district (optional fallback)
    const { data: profile } = await supabase
      .from("profiles")
      .select("school, district_name")
      .eq("user_id", user.id)
      .single();

    // Enhanced principal_id lookup: try schools table first, then school_assignments
    const lookupSchool = schoolName || profile?.school || '';
    const lookupDistrict = districtName || profile?.district_name || '';
    
    let finalPrincipalId = principalId || null;

    // Verify teacher is assigned to this principal (if principal_id provided)
    if (principalId) {
      const { data: assignment } = await supabase
        .from("school_assignments")
        .select("id")
        .eq("user_id", user.id)
        .eq("principal_id", principalId)
        .maybeSingle();

      if (!assignment) {
        return new Response(JSON.stringify({ 
          error: "You must be added by this School Head before submitting. Please ask your School Head to add you to their school first." 
        }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // Verify teacher is assigned to this principal
    if (finalPrincipalId) {
      const { data: assignment } = await supabase
        .from("school_assignments")
        .select("id")
        .eq("user_id", user.id)
        .eq("principal_id", finalPrincipalId)
        .maybeSingle();

      if (!assignment) {
        return new Response(JSON.stringify({ 
          error: "You must be added by this School Head before submitting. Please ask your School Head to add you to their school first." 
        }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }
    
    if (lookupSchool && !finalPrincipalId) {
      // First try: schools table (supervisor-created schools)
      const { data: schoolData } = await supabase
        .from("schools")
        .select("principal_id, principal_name")
        .ilike("school_name", lookupSchool)
        .not("principal_id", "is", null)
        .maybeSingle();

      if (schoolData?.principal_id) {
        finalPrincipalId = schoolData.principal_id;
        console.log("Principal found in schools table:", schoolData.principal_id);
      } else {
        // Fallback: school_assignments table
        const { data: assignment } = await supabase
          .from("school_assignments")
          .select("principal_id")
          .ilike("school_name", lookupSchool)
          .not("principal_id", "is", null)
          .limit(1)
          .maybeSingle();
        
        if (assignment?.principal_id) {
          finalPrincipalId = assignment.principal_id;
          console.log("Principal found in school_assignments:", assignment.principal_id);
        }
      }
    }
    
    console.log("Final principal_id for submission:", finalPrincipalId);

    // Insert submission record with status 'pending' by default
    const { data: submissionData, error: insertError } = await supabase
      .from("teacher_submissions")
      .insert({
        user_id: user.id,
        teacher_name: teacherName,
        grade_level: gradeLevel,
        section: section,
        subject: subject,
        week_start: weekStart,
        week_end: weekEnd,
        file_url: urlData.publicUrl,
        file_type: fileExt,
        school_name: schoolName || profile?.school || '',
        district_name: districtName || profile?.district_name || '',
        principal_id: finalPrincipalId,
        status: "pending"
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw insertError;
    }

    console.log("Submission created:", submissionData.id);

    return new Response(JSON.stringify({ success: true, submission: submissionData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Submission error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Submission failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
