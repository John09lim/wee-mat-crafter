import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type NoticeTone = "info" | "success" | "warning" | "danger";

const noticeConfig: Record<NoticeTone, { icon: LucideIcon; className: string }> = {
  info: { icon: Info, className: "border-info/25 bg-info/10 text-info" },
  success: { icon: CheckCircle2, className: "border-success/25 bg-success/10 text-success" },
  warning: { icon: AlertTriangle, className: "border-warning/25 bg-warning/10 text-warning" },
  danger: { icon: ShieldAlert, className: "border-destructive/25 bg-destructive/10 text-destructive" },
};

type InlineNoticeProps = {
  tone?: NoticeTone;
  title?: string;
  children: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
};

export const InlineNotice = ({
  tone = "info",
  title,
  children,
  icon: IconOverride,
  action,
  className,
}: InlineNoticeProps) => {
  const config = noticeConfig[tone];
  const Icon = IconOverride ?? config.icon;

  return (
    <div
      className={cn("flex items-start gap-3 rounded-lg border p-4", config.className, className)}
      role={tone === "danger" ? "alert" : "status"}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 text-foreground">
        {title ? <p className="font-semibold text-current">{title}</p> : null}
        <div className={cn("text-sm leading-6 text-muted-foreground", title && "mt-1")}>{children}</div>
        {action ? <div className="mt-3 flex flex-wrap gap-2">{action}</div> : null}
      </div>
    </div>
  );
};
