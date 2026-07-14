export interface ParentSchoolDetails {
  school_id: string;
  school_name: string;
  district_name: string | null;
  principal_name: string;
}

export interface ParentWeekSummary {
  week_start: string;
  week_end: string;
  total_teachers: number;
  submitted_teachers: number;
  percentage: number;
}

export interface ParentTeacherStatus {
  teacher_name: string;
  grade_level: string | null;
  section: string | null;
  profile_image_url: string | null;
  submitted: boolean;
}

export interface ParentSubmission {
  id: string;
  teacher_name: string;
  subject: string;
  grade_level: string;
  section: string | null;
  week_start: string;
  week_end: string;
  status: string;
  file_type: string;
  created_at: string;
  view_url: string;
  download_url: string;
}

export interface ParentSchoolDashboardData {
  school: ParentSchoolDetails;
  week: ParentWeekSummary;
  teachers: ParentTeacherStatus[];
  submissions: ParentSubmission[];
}
