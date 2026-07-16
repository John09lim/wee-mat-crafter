import {
  CheckCircle2,
  Download,
  Eye,
  FileText,
  School,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ParentSchoolDashboardData } from "@/features/parent-dashboard/types";

interface ParentSchoolReportProps {
  data: ParentSchoolDashboardData;
  onChangeSchool: () => void;
}

const formatDate = (value: string, options?: Intl.DateTimeFormatOptions) => {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-PH", options || {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
};

const formatWeek = (start: string, end: string) =>
  `${formatDate(start, { month: "short", day: "numeric" })} – ${formatDate(end, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

const formatStatus = (status: string) => {
  if (status === "pending" || status === "submitted") return "For review";
  if (status === "reviewed" || status === "accepted") return "Reviewed";
  if (status === "returned") return "Returned to teacher";
  return status;
};

export const ParentSchoolReport = ({ data, onChangeSchool }: ParentSchoolReportProps) => {
  const percentage = Math.min(100, Math.max(0, data.week.percentage));

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[1.75rem] border border-[#D8D0C4] bg-[#FFFCF7] shadow-[0_22px_60px_-48px_rgba(20,32,25,.65)]">
        <div className="bg-[#174D2C] px-5 py-6 text-white sm:px-7 sm:py-7">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#E0B43F]">
                <School className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E9C65D]">
                  School ID {data.school.school_id}
                </p>
                <h2 className="font-display mt-2 text-2xl font-semibold sm:text-3xl">
                  {data.school.school_name}
                </h2>
                <p className="mt-1 text-sm text-white/75">
                  {[data.school.district_name, `School Head: ${data.school.principal_name}`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onChangeSchool}
              className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              Change school
            </Button>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-7">
          <div className="rounded-2xl border border-[#DED5C8] bg-[#F7F1E8] p-5">
            <Users className="h-5 w-5 text-[#236130]" aria-hidden="true" />
            <p className="mt-5 text-3xl font-semibold text-[#173F2A]">{data.week.total_teachers}</p>
            <p className="mt-1 text-sm text-muted-foreground">Teachers monitored</p>
          </div>
          <div className="rounded-2xl border border-[#DED5C8] bg-[#F7F1E8] p-5">
            <CheckCircle2 className="h-5 w-5 text-[#236130]" aria-hidden="true" />
            <p className="mt-5 text-3xl font-semibold text-[#173F2A]">{data.week.submitted_teachers}</p>
            <p className="mt-1 text-sm text-muted-foreground">Submitted this week</p>
          </div>
          <div className="rounded-2xl border border-[#D7C178] bg-[#FBF5DF] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#785D13]">Completion</p>
            <p className="mt-4 text-3xl font-semibold text-[#173F2A]">{percentage}%</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#D8D0C4]" aria-hidden="true">
              <div
                className="h-full rounded-full bg-[#236130] transition-[width] duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <Card className="border-[#D8D0C4] bg-[#FFFCF7] p-5 shadow-none sm:p-7">
        <div className="border-b border-[#DED5C8] pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B48619]">Files from teachers</p>
          <h2 className="font-display mt-2 text-2xl font-semibold text-[#173F2A]">Recent submissions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Parents can view or download files. Only school staff can review or change submission records.
          </p>
        </div>

        {data.submissions.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="mx-auto h-9 w-9 text-[#7D887F]" aria-hidden="true" />
            <p className="mt-3 font-semibold text-[#173F2A]">No files have been submitted yet.</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            {data.submissions.map((submission) => (
              <article
                key={submission.id}
                className="flex flex-col gap-4 rounded-2xl border border-[#DED5C8] bg-[#FFFCF7] p-4 sm:flex-row sm:items-center"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E8EDE3] text-[#236130]">
                  <FileText className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-[#173F2A]">{submission.teacher_name}</h3>
                    <Badge variant="outline" className="border-[#C8B472] bg-[#FBF5DF] text-[#6C5518]">
                      {formatStatus(submission.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-foreground">
                    {submission.subject} · {[submission.grade_level, submission.section].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Week of {formatWeek(submission.week_start, submission.week_end)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button asChild type="button" variant="outline" size="sm" className="gap-2">
                    <a href={submission.view_url} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      View
                    </a>
                  </Button>
                  <Button asChild type="button" size="sm" className="gap-2 bg-[#236130] text-white hover:bg-[#173F2A]">
                    <a href={submission.download_url}>
                      <Download className="h-4 w-4" aria-hidden="true" />
                      Download
                    </a>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
