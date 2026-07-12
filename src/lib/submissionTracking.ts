export const normalizeTeacherName = (name?: string | null) =>
  (name || "").trim().replace(/\s+/g, " ").toLocaleLowerCase();

export const normalizeWeekStart = (value?: string | null) => {
  const datePart = String(value || "").substring(0, 10);
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return datePart;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const teacherHasSubmission = (
  teacher: { user_id?: string | null; teacher_name: string },
  submissions: Array<{ user_id?: string | null; teacher_name: string }>,
) => {
  const name = normalizeTeacherName(teacher.teacher_name);
  return submissions.some((submission) =>
    (Boolean(teacher.user_id) && teacher.user_id === submission.user_id) ||
    (Boolean(name) && name === normalizeTeacherName(submission.teacher_name)),
  );
};
