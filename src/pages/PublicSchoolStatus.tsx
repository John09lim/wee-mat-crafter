import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, School, User } from "lucide-react";
import { format, addWeeks } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TeacherStatus {
  teacher_name: string;
  submitted: boolean;
  grade_level?: string;
  section?: string;
  profile_image_url?: string;
}

interface WeekOption {
  weekStart: Date;
  weekEnd: Date;
  label: string;
}

interface SchoolInfo {
  name: string;
  district: string;
  principal_name: string | null;
}

export default function PublicSchoolStatus() {
  const { schoolName } = useParams<{ schoolName: string }>();
  const [teachers, setTeachers] = useState<TeacherStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [weekOptions, setWeekOptions] = useState<WeekOption[]>([]);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [weeklyHistory, setWeeklyHistory] = useState<
    Array<{ week: string; percentage: number }>
  >([]);

  // Helper to get Monday of the week
  const getMondayOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Helper to get Friday of the week
  const getFridayOfWeek = (monday: Date) => {
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    friday.setHours(23, 59, 59, 999);
    return friday;
  };

  // Generate week options (last 8 weeks)
  useEffect(() => {
    const options: WeekOption[] = [];
    const today = new Date();
    
    for (let i = 0; i < 8; i++) {
      const weekDate = addWeeks(today, -i);
      const monday = getMondayOfWeek(weekDate);
      const friday = getFridayOfWeek(monday);
      
      options.push({
        weekStart: monday,
        weekEnd: friday,
        label: `${format(monday, "MMM dd")} - ${format(friday, "MMM dd, yyyy")}`,
      });
    }
    
    setWeekOptions(options);
  }, []);

  const currentWeekStart = weekOptions[selectedWeekIndex]?.weekStart;
  const currentWeekEnd = weekOptions[selectedWeekIndex]?.weekEnd;

  useEffect(() => {
    const fetchSchoolStatus = async () => {
      if (!schoolName || !currentWeekStart || !currentWeekEnd) return;

      try {
        const decodedSchoolName = decodeURIComponent(schoolName);
        
        // Call edge function to get school status data (bypasses RLS)
        const { data, error } = await supabase.functions.invoke('get-school-status', {
          body: null,
          headers: {},
        });

        // Use query parameters approach instead
        const response = await fetch(
          `https://velpueasbsrptocrjljg.supabase.co/functions/v1/get-school-status?school=${encodeURIComponent(decodedSchoolName)}&weekStart=${format(currentWeekStart, "yyyy-MM-dd")}&weekEnd=${format(currentWeekEnd, "yyyy-MM-dd")}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch school status');
        }

        const result = await response.json();

        if (result.school) {
          setSchoolInfo({
            name: result.school.school_name,
            district: result.school.district_name || '',
            principal_name: result.school.principal_name,
          });
        }

        if (result.teachers) {
          setTeachers(result.teachers);
        }

        // Calculate weekly history by making additional calls
        const historyData: Array<{ week: string; percentage: number }> = [];
        for (let i = 0; i < Math.min(4, weekOptions.length); i++) {
          const week = weekOptions[i];
          if (!week) continue;

          const historyResponse = await fetch(
            `https://velpueasbsrptocrjljg.supabase.co/functions/v1/get-school-status?school=${encodeURIComponent(decodedSchoolName)}&weekStart=${format(week.weekStart, "yyyy-MM-dd")}&weekEnd=${format(week.weekEnd, "yyyy-MM-dd")}`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          if (historyResponse.ok) {
            const historyResult = await historyResponse.json();
            const totalTeachers = historyResult.teachers?.length || 0;
            const submittedCount = historyResult.teachers?.filter((t: TeacherStatus) => t.submitted).length || 0;
            const percentage = totalTeachers > 0 ? Math.round((submittedCount / totalTeachers) * 100) : 0;

            historyData.push({
              week: `${format(week.weekStart, "MMM dd")}-${format(week.weekEnd, "dd")}`,
              percentage,
            });
          }
        }
        setWeeklyHistory(historyData);

      } catch (error) {
        console.error("Error fetching school status:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchoolStatus();
  }, [schoolName, currentWeekStart, currentWeekEnd, selectedWeekIndex, weekOptions]);

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
            {schoolInfo?.principal_name && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  School Head: {schoolInfo.principal_name}
                </p>
              </div>
            )}
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Week</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedWeekIndex.toString()}
              onValueChange={(value) => setSelectedWeekIndex(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weekOptions.map((week, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {week.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
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

        {weeklyHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>📊 Past Weeks Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 justify-center">
                {weeklyHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="text-center p-3 bg-muted rounded-lg min-w-[100px]"
                  >
                    <div className="text-xs text-muted-foreground mb-1">
                      {item.week}
                    </div>
                    <div className="text-xl font-bold">{item.percentage}%</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center text-xs text-muted-foreground mt-8">
          <p>This is a read-only view of the school's submission status.</p>
        </div>
      </div>
    </div>
  );
}
