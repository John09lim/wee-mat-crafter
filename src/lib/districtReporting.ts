export type SchoolLevel = "elementary" | "secondary";

export interface DistrictSchool {
  name: string;
  level: SchoolLevel;
}

export const BACONG_DISTRICT_NAME = "Bacong District";

export const BACONG_DISTRICT_SCHOOLS: DistrictSchool[] = [
  { name: "Bacong Central School", level: "elementary" },
  { name: "Buntod Elementary School", level: "elementary" },
  { name: "Calangag Elementary School", level: "elementary" },
  { name: "Fausto Sarono Tubod Elementary School", level: "elementary" },
  { name: "Isugan Elementary School", level: "elementary" },
  { name: "Nazario Tale Memorial Elementary School", level: "elementary" },
  { name: "SacSac Elementary School", level: "elementary" },
  { name: "San Miguel Elementary School", level: "elementary" },
  { name: "Timbanga Elementary School", level: "elementary" },
  { name: "Timbao Elementary School", level: "elementary" },
  { name: "Buntod High School", level: "secondary" },
  { name: "Isugan Integrated School", level: "secondary" },
  { name: "Ong Chee Tee Bacong High School", level: "secondary" },
  { name: "San Miguel National High School", level: "secondary" },
];

const normalizeIdentity = (value?: string | null) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();

const schoolAliases = new Map<string, string>([
  ["san miguel elem school", "san miguel elementary school"],
  ["san miguel elem. school", "san miguel elementary school"],
  ["san miguel elementary", "san miguel elementary school"],
]);

export const districtIdentityKey = (value?: string | null) =>
  normalizeIdentity(value).replace(/\s+district$/, "").trim();

export const schoolIdentityKey = (value?: string | null) => {
  const key = normalizeIdentity(value);
  return schoolAliases.get(key) || key;
};

export const isSameDistrictName = (left?: string | null, right?: string | null) => {
  const leftKey = districtIdentityKey(left);
  return Boolean(leftKey) && leftKey === districtIdentityKey(right);
};

export const isBacongDistrict = (value?: string | null) =>
  districtIdentityKey(value) === "bacong";

export const canonicalDistrictName = (value?: string | null) => {
  if (isBacongDistrict(value)) return BACONG_DISTRICT_NAME;
  return String(value || "").trim().replace(/\s+/g, " ");
};

const bacongSchoolByKey = new Map(
  BACONG_DISTRICT_SCHOOLS.map((school) => [schoolIdentityKey(school.name), school]),
);

export const getBacongSchool = (value?: string | null) =>
  bacongSchoolByKey.get(schoolIdentityKey(value));

export const canonicalSchoolName = (value?: string | null) =>
  getBacongSchool(value)?.name || String(value || "").trim().replace(/\s+/g, " ");

export const isOfficialBacongSchool = (value?: string | null) => Boolean(getBacongSchool(value));

export const isSameSchoolName = (left?: string | null, right?: string | null) => {
  const leftKey = schoolIdentityKey(left);
  return Boolean(leftKey) && leftKey === schoolIdentityKey(right);
};

export const belongsToDistrict = (
  row: { district_name?: string | null; school_name?: string | null },
  districtName: string,
) =>
  isSameDistrictName(row.district_name, districtName) ||
  (isBacongDistrict(districtName) && isOfficialBacongSchool(row.school_name));

