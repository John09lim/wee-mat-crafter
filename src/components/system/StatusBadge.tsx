import type { ComponentType, SVGProps } from "react";
import { AlertTriangle, CheckCircle2, Circle, Clock3, Info } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

const statusConfig: Record<
  StatusTone,
  {
    variant: NonNullable<BadgeProps["variant"]>;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
  }
> = {
  neutral: { variant: "neutral", icon: Circle },
  success: { variant: "success", icon: CheckCircle2 },
  warning: { variant: "warning", icon: Clock3 },
  danger: { variant: "destructive", icon: AlertTriangle },
  info: { variant: "info", icon: Info },
};

type StatusBadgeProps = Omit<BadgeProps, "variant"> & {
  tone?: StatusTone;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
};

export const StatusBadge = ({
  tone = "neutral",
  icon: IconOverride,
  className,
  children,
  ...props
}: StatusBadgeProps) => {
  const config = statusConfig[tone];
  const Icon = IconOverride ?? config.icon;

  return (
    <Badge variant={config.variant} className={cn("gap-1.5", className)} {...props}>
      <Icon className="size-3.5" aria-hidden="true" />
      <span>{children}</span>
    </Badge>
  );
};

