const SCHOOL_IDENTITY_PLACEHOLDERS = new Set([
  "unknown school",
  "unknown district",
  "unknown",
  "please update",
  "not provided",
  "not set yet",
  "not assigned",
  "no school",
  "none",
  "tbd",
  "to be determined",
  "pending",
  "for update",
  "n/a",
  "na",
  "-",
  "?",
]);

export const isMissingSchoolIdentityValue = (value?: string | null): boolean => {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return !normalized || SCHOOL_IDENTITY_PLACEHOLDERS.has(normalized);
};

export const sanitizeSchoolIdentityValue = (value?: string | null): string => {
  if (isMissingSchoolIdentityValue(value)) return "";
  return value!.trim().replace(/\s+/g, " ");
};

export const hasCompleteSchoolIdentity = (
  school?: string | null,
  district?: string | null,
): boolean =>
  !isMissingSchoolIdentityValue(school) && !isMissingSchoolIdentityValue(district);
