import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ExternalLink, X } from "lucide-react";
import DocumentViewer from "@/components/DocumentViewer";

interface SchoolDetailViewProps {
  schoolName: string;
  districtName: string;
  onClose: () => void;
}

export function SchoolDetailView({ schoolName, districtName, onClose }: SchoolDetailViewProps) {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchoolTeachers();
  }, [schoolName]);

  const fetchSchoolTeachers = async () => {
    try {
      // Fetch all teachers from this school
      const { data: teachersData, error: teachersError } = await supabase
        .from("school_assignments")
        .select("*")
        .eq("school_name", schoolName)
        .eq("district_name", districtName);

      if (teachersError) throw teachersError;

      // Hardcoded to December 1-5, 2025 to match other components
      const currentMonday = new Date(2025, 11, 1); // December 1, 2025
      currentMonday.setHours(0, 0, 0, 0);
      
      const currentFriday = new Date(currentMonday);
      currentFriday.setDate(currentMonday.getDate() + 4); // Friday, December 5
      currentFriday.setHours(23, 59, 59, 999);

      const weekStartStr = currentMonday.toISOString().split('T')[0];
      const weekEndStr = currentFriday.toISOString().split('T')[0];

      // Fetch submissions for this week using week_start and week_end fields
      const { data: submissionsData, error: submissionsError } = await supabase
        .from("teacher_submissions")
        .select("*")
        .eq("school_name", schoolName)
        .gte("week_start", weekStartStr)
        .lte("week_end", weekEndStr);

      if (submissionsError) throw submissionsError;

      // Merge teacher data with submission status
      const enrichedTeachers = (teachersData || []).map(teacher => {
        const submission = (submissionsData || []).find(
          s => s.user_id === teacher.user_id || s.teacher_name === teacher.teacher_name
        );
        return {
          ...teacher,
          hasSubmitted: !!submission,
          submission: submission || null,
        };
      });

      setTeachers(enrichedTeachers);
    } catch (error) {
      console.error("Error fetching school teachers:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <p>Loading school details...</p>
      </Card>
    );
  }

  const submittedCount = teachers.filter(t => t.hasSubmitted).length;
  const notSubmittedCount = teachers.length - submittedCount;

  return (
    <Card className="p-6 border-2" style={{ borderColor: "#236130" }}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: "#236130" }}>
            {schoolName}
          </h2>
          <p className="text-muted-foreground">
            {teachers.length} Teachers • {submittedCount} Submitted • {notSubmittedCount} Not Submitted
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="space-y-3">
        {teachers.map((teacher) => (
          <div
            key={teacher.id}
            className={`flex items-center justify-between p-4 border rounded-lg ${
              teacher.hasSubmitted ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              {teacher.hasSubmitted ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className="font-semibold">{teacher.teacher_name}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {teacher.grade_level}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Section {teacher.section}
                  </Badge>
                </div>
                {teacher.hasSubmitted && teacher.submission && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Submitted: {new Date(teacher.submission.created_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            {teacher.hasSubmitted && teacher.submission && (
              <div className="flex gap-2">
                <DocumentViewer 
                  fileUrl={teacher.submission.file_url} 
                  fileName={`${teacher.teacher_name}_${teacher.submission.subject || 'submission'}`}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const encodedUrl = encodeURIComponent(teacher.submission.file_url);
                    window.open(
                      `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`,
                      "_blank"
                    );
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open
                </Button>
              </div>
            )}
          </div>
        ))}
        {teachers.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No teachers found for this school.
          </p>
        )}
      </div>
    </Card>
  );
}
