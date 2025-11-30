import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, School } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";

interface TeacherStatus {
  teacher_name: string;
  submitted: boolean;
}

export default function PublicSchoolStatus() {
  const { schoolName } = useParams<{ schoolName: string }>();
  const [teachers, setTeachers] = useState<TeacherStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolInfo, setSchoolInfo] = useState<{ name: string; district: string } | null>(null);

  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const currentWeekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });

  useEffect(() => {
    const fetchSchoolStatus = async () => {
      if (!schoolName) return;

      try {
        const decodedSchoolName = decodeURIComponent(schoolName);

        // Fetch school info
        const { data: schoolData } = await supabase
          .from("schools")
          .select("school_name, district_name")
          .eq("school_name", decodedSchoolName)
          .single();

        if (schoolData) {
          setSchoolInfo({
            name: schoolData.school_name,
            district: schoolData.district_name,
          });
        }

        // Fetch all teachers in this school
        const { data: teachersData } = await supabase
          .from("school_assignments")
          .select("teacher_name, user_id")
          .eq("school_name", decodedSchoolName);

        if (!teachersData) {
          setLoading(false);
          return;
        }

        // Fetch submissions for current week
        const { data: submissionsData } = await supabase
          .from("teacher_submissions")
          .select("user_id")
          .eq("school_name", decodedSchoolName)
          .gte("week_start", format(currentWeekStart, "yyyy-MM-dd"))
          .lte("week_end", format(currentWeekEnd, "yyyy-MM-dd"));

        const submittedUserIds = new Set(
          submissionsData?.map((s) => s.user_id) || []
        );

        const teacherStatuses: TeacherStatus[] = teachersData.map((teacher) => ({
          teacher_name: teacher.teacher_name || "Unknown Teacher",
          submitted: teacher.user_id ? submittedUserIds.has(teacher.user_id) : false,
        }));

        setTeachers(teacherStatuses);
      } catch (error) {
        console.error("Error fetching school status:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchoolStatus();
  }, [schoolName, currentWeekStart, currentWeekEnd]);

  const submittedTeachers = teachers.filter((t) => t.submitted);
  const notSubmittedTeachers = teachers.filter((t) => !t.submitted);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="border-primary/20">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <School className="w-16 h-16 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {schoolInfo?.name || decodeURIComponent(schoolName || "")}
            </CardTitle>
            {schoolInfo?.district && (
              <p className="text-sm text-muted-foreground">{schoolInfo.district}</p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              Week of {format(currentWeekStart, "MMM dd")} - {format(currentWeekEnd, "MMM dd, yyyy")}
            </p>
          </CardHeader>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-green-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#1eba83]">
                <CheckCircle2 className="w-5 h-5" />
                Submitted ({submittedTeachers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {submittedTeachers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No submissions yet</p>
              ) : (
                <ul className="space-y-2">
                  {submittedTeachers.map((teacher, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-[#1eba83]" />
                      <span>{teacher.teacher_name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-red-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-500">
                <XCircle className="w-5 h-5" />
                Not Submitted ({notSubmittedTeachers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notSubmittedTeachers.length === 0 ? (
                <p className="text-sm text-muted-foreground">All teachers have submitted!</p>
              ) : (
                <ul className="space-y-2">
                  {notSubmittedTeachers.map((teacher, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span>{teacher.teacher_name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              <p>Submission Status: {submittedTeachers.length} / {teachers.length} teachers</p>
              <p className="mt-2">
                Completion Rate:{" "}
                {teachers.length > 0
                  ? Math.round((submittedTeachers.length / teachers.length) * 100)
                  : 0}
                %
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
