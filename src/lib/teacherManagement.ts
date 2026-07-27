export const SUBJECT_TEACHER_LABEL = "Subject Teacher";

export interface TeacherAssignmentRecord {
  id: string;
  user_id?: string | null;
  teacher_name: string | null;
  teacher_email: string | null;
  grade_level: string | null;
  section: string | null;
  profile_image_url: string | null;
  is_active?: boolean | null;
  assignments?: TeacherAssignmentRecord[];
}

export const normalizeTeacherEmail = (email: string | null | undefined) =>
  (email || "").trim().toLocaleLowerCase();

const normalizeTeacherName = (name: string | null | undefined) =>
  (name || "").trim().toLocaleLowerCase().replace(/\s+/g, " ");

export const teacherIdentityKey = (teacher: TeacherAssignmentRecord) => {
  const email = normalizeTeacherEmail(teacher.teacher_email);
  if (email) return `email:${email}`;
  if (teacher.user_id) return `user:${teacher.user_id}`;
  return `name:${normalizeTeacherName(teacher.teacher_name)}`;
};

const preferLinkedAssignment = (
  current: TeacherAssignmentRecord,
  candidate: TeacherAssignmentRecord,
) => {
  if (!current.user_id && candidate.user_id) return candidate;
  if (!current.profile_image_url && candidate.profile_image_url) return candidate;
  return current;
};

export const collapseTeacherAssignments = <T extends TeacherAssignmentRecord>(
  assignments: T[],
): T[] => {
  const groups = new Map<string, T[]>();

  assignments
    .filter((assignment) => assignment.is_active !== false)
    .forEach((assignment) => {
      const key = teacherIdentityKey(assignment);
      const group = groups.get(key) || [];
      group.push(assignment);
      groups.set(key, group);
    });

  return Array.from(groups.values()).map((group) => {
    const primary = group.reduce(
      (current, candidate) =>
        preferLinkedAssignment(current, candidate) as T,
      group[0],
    );

    return {
      ...primary,
      teacher_email: normalizeTeacherEmail(primary.teacher_email),
      assignments: group,
    };
  });
};

export const parseSubjectAssignments = (
  teacher: TeacherAssignmentRecord,
): { gradeLevel: string; subject: string }[] => {
  if (
    teacher.grade_level?.trim().toLocaleLowerCase() ===
    SUBJECT_TEACHER_LABEL.toLocaleLowerCase()
  ) {
    const subjects = (teacher.section || "")
      .split(",")
      .map((subject) => subject.trim())
      .filter(Boolean);

    return (subjects.length ? subjects : [""]).map((subject) => ({
      gradeLevel: SUBJECT_TEACHER_LABEL,
      subject,
    }));
  }

  const source = teacher.assignments?.length
    ? teacher.assignments
    : [teacher];

  return source.map((assignment) => ({
    gradeLevel: assignment.grade_level || "",
    subject: assignment.section || "",
  }));
};

