import {
  ArrowLeft,
  Building2,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Loader2,
  LogIn,
  Presentation,
  UserPlus,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import {
  useId,
  useState,
  type FormEventHandler,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import WeekMatrixDocument from "@/components/marketing/WeekMatrixDocument";
import { cn } from "@/lib/utils";

export type AuthPortalRole = "teacher" | "principal" | "supervisor";
export type AuthPortalMode = "login" | "signup" | "reset";

const roleDefinitions: Record<
  AuthPortalRole,
  {
    label: string;
    accountLabel: string;
    route: string;
    icon: LucideIcon;
    loginCopy: string;
  }
> = {
  teacher: {
    label: "Teacher",
    accountLabel: "teacher",
    route: "/auth",
    icon: GraduationCap,
    loginCopy: "Continue your weekly planning workspace.",
  },
  principal: {
    label: "Principal",
    accountLabel: "school head",
    route: "/auth-school-head",
    icon: Building2,
    loginCopy: "Review submissions and guide your school community.",
  },
  supervisor: {
    label: "Supervisor",
    accountLabel: "supervisor",
    route: "/auth-supervisor",
    icon: UsersRound,
    loginCopy: "Monitor learning continuity across your district.",
  },
};

const getModeCopy = (role: AuthPortalRole, mode: AuthPortalMode) => {
  const definition = roleDefinitions[role];

  if (mode === "signup") {
    return {
      title: `Create your ${definition.label} account.`,
      description: `Set up your ${definition.accountLabel} workspace and continue to WeeLMat.`,
      submitLabel: `Create ${definition.accountLabel} account`,
    };
  }

  if (mode === "reset") {
    return {
      title: "Reset your password.",
      description: "Enter your account email and we will send a secure recovery link.",
      submitLabel: "Send reset email",
    };
  }

  return {
    title: `Welcome back, ${definition.label}.`,
    description: definition.loginCopy,
    submitLabel: "Sign in",
  };
};

type AuthPortalProps = {
  role: AuthPortalRole;
  mode: AuthPortalMode;
  loading: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onModeChange: (mode: AuthPortalMode) => void;
  children: ReactNode;
  formError?: string | null;
};

export function AuthPortal({
  role,
  mode,
  loading,
  onSubmit,
  onModeChange,
  children,
  formError,
}: AuthPortalProps) {
  const copy = getModeCopy(role, mode);
  const definition = roleDefinitions[role];
  const headingId = useId();

  return (
    <main className="bg-[#F6F0E7] px-4 py-5 text-[#142019] sm:px-6 sm:py-7 lg:px-8 lg:py-5">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex justify-end md:mb-0">
          <Link
            to="/role-dashboard"
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-[#236130] transition-colors duration-200 hover:bg-white/65 hover:text-[#173F2A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#236130] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F6F0E7] md:fixed md:right-8 md:top-2.5 md:z-50 md:text-[#F6F0E7] md:hover:bg-white/10 md:hover:text-[#D6A73D] md:focus-visible:ring-[#D6A73D] md:focus-visible:ring-offset-[#173F2A] xl:right-20"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to dashboard
          </Link>
        </div>

        <div className="grid overflow-hidden rounded-[1.5rem] border border-[#D8D0C4] bg-[#FFFCF7] shadow-[0_24px_70px_-42px_rgba(23,63,42,0.45)] lg:grid-cols-[0.88fr_1.12fr]">
          <aside
            className="relative order-2 flex min-h-[34rem] flex-col overflow-hidden border-t border-[#D8D0C4] bg-[#F1E9DC] p-6 sm:min-h-[42rem] sm:p-9 lg:order-1 lg:min-h-[42rem] lg:border-r lg:border-t-0 lg:p-10 xl:p-12"
            aria-labelledby={`${headingId}-story`}
          >
            <div className="relative z-20">
              <h2
                id={`${headingId}-story`}
                className="max-w-lg font-display text-[clamp(2.25rem,4.2vw,4.4rem)] font-semibold leading-[0.98] tracking-[-0.045em] text-[#173F2A]"
              >
                Plan with clarity.
                <br />
                Teach with <span className="text-[#B98A20]">impact.</span>
              </h2>
              <span
                className="mt-3 block h-1 w-36 -rotate-2 rounded-full bg-[#D6A73D]"
                aria-hidden="true"
              />
            </div>

            <div className="relative z-10 mx-auto mt-7 h-[18rem] w-full max-w-lg flex-1 sm:h-[24rem] lg:mt-5 lg:h-[27rem]">
              <img
                src="/division-negros-oriental.webp"
                alt=""
                className="absolute inset-x-[-2rem] bottom-[-1.5rem] h-[48%] w-[calc(100%+4rem)] object-cover object-center opacity-90 sm:inset-x-[-3rem] sm:w-[calc(100%+6rem)] lg:inset-x-[-4rem] lg:w-[calc(100%+8rem)]"
                loading="lazy"
              />
              <div
                className="absolute inset-x-[-3rem] bottom-0 h-[58%] bg-gradient-to-b from-[#F1E9DC] via-[#F1E9DC]/10 to-transparent"
                aria-hidden="true"
              />
              <WeekMatrixDocument
                compact
                className="absolute left-1/2 top-0 z-10 w-[15.5rem] -translate-x-1/2 sm:w-[20rem] lg:w-[21rem]"
              />
            </div>

            <div className="relative z-20 mt-auto flex items-start gap-4 border-t border-[#236130]/20 bg-[#F6F0E7]/90 pt-5 backdrop-blur-[2px]">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#236130]/35 text-[#236130]">
                <Presentation className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <p className="font-display text-xl font-semibold text-[#173F2A]">
                  Teacher judgment always comes first.
                </p>
                <p className="mt-1 max-w-md text-sm leading-6 text-[#536258]">
                  WeeLMat supports your expertise so you can focus on what matters most—your learners.
                </p>
              </div>
            </div>
          </aside>

          <section
            className="order-1 flex min-h-[39rem] items-center bg-[#FFFCF7] p-5 sm:p-8 lg:order-2 lg:min-h-[42rem] lg:p-10 xl:p-12"
            aria-labelledby={headingId}
          >
            <div className="mx-auto w-full max-w-2xl">
              <nav
                aria-label="Choose a portal role"
                className="grid grid-cols-3 overflow-hidden rounded-lg border border-[#D8D0C4] bg-[#F8F3EB]"
              >
                {(Object.keys(roleDefinitions) as AuthPortalRole[]).map((itemRole) => {
                  const item = roleDefinitions[itemRole];
                  const Icon = item.icon;
                  const active = itemRole === role;

                  return (
                    <Link
                      key={itemRole}
                      to={item.route}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-14 cursor-pointer items-center justify-center gap-2 border-r border-[#D8D0C4] px-2 py-3 text-xs font-bold transition-colors duration-200 last:border-r-0 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#236130] sm:text-sm",
                        active
                          ? "bg-white text-[#173F2A] shadow-[inset_0_-3px_0_#236130]"
                          : "text-[#59655D] hover:bg-white/70 hover:text-[#173F2A]",
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-8 sm:mt-10">
                <h1
                  id={headingId}
                  className="font-display text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-[#173F2A] sm:text-5xl"
                >
                  {copy.title}
                </h1>
                <p className="mt-3 text-base leading-7 text-[#5D675F] sm:text-lg">
                  {copy.description}
                </p>
              </div>

              <form className="mt-8 space-y-5" onSubmit={onSubmit} aria-busy={loading}>
                {children}

                {formError ? (
                  <p
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-800"
                  >
                    {formError}
                  </p>
                ) : null}

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-[3.25rem] w-full cursor-pointer rounded-lg bg-[#236130] text-base font-bold text-white shadow-[0_12px_24px_-16px_rgba(23,63,42,0.75)] transition-colors duration-200 hover:bg-[#173F2A] focus-visible:ring-[#D6A73D]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                      <span>{mode === "reset" ? "Sending…" : "Please wait…"}</span>
                    </>
                  ) : (
                    <>
                      {mode === "login" ? (
                        <LogIn className="h-5 w-5" aria-hidden="true" />
                      ) : mode === "signup" ? (
                        <UserPlus className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <KeyRound className="h-5 w-5" aria-hidden="true" />
                      )}
                      <span>{copy.submitLabel}</span>
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-7 border-t border-[#D8D0C4] pt-6">
                {mode === "login" ? (
                  <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
                    <button
                      type="button"
                      onClick={() => onModeChange("reset")}
                      className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-[#236130] transition-colors duration-200 hover:bg-[#E7F0E6] hover:text-[#173F2A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#236130]"
                    >
                      <KeyRound className="h-4 w-4" aria-hidden="true" />
                      Forgot password?
                    </button>
                    <button
                      type="button"
                      onClick={() => onModeChange("signup")}
                      className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-[#236130] transition-colors duration-200 hover:bg-[#E7F0E6] hover:text-[#173F2A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#236130]"
                    >
                      <UserPlus className="h-4 w-4" aria-hidden="true" />
                      Create a {definition.accountLabel} account
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onModeChange("login")}
                    className="mx-auto inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-[#236130] transition-colors duration-200 hover:bg-[#E7F0E6] hover:text-[#173F2A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#236130] sm:w-auto"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Back to sign in
                  </button>
                )}

                <p className="mt-6 border-t border-[#D8D0C4]/70 pt-5 text-center text-sm leading-6 text-[#69716C]">
                  Need another portal? Use the role switcher above.
                </p>
              </div>
            </div>
          </section>
        </div>

      </div>
    </main>
  );
}

type AuthFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
  label: string;
  icon: LucideIcon;
  helper?: string;
  error?: string | null;
};

export function AuthField({
  id,
  label,
  icon: Icon,
  helper,
  error,
  type = "text",
  className,
  ...inputProps
}: AuthFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  const descriptionId = helper || error ? `${id}-description` : undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-bold leading-5 text-[#243129]">
        {label}
      </Label>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#45604E]"
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <Input
          id={id}
          type={isPassword && revealed ? "text" : type}
          aria-invalid={Boolean(error)}
          aria-describedby={descriptionId}
          className={cn(
            "h-12 rounded-lg border-[#BFC5BD] bg-white pl-11 text-base text-[#142019] shadow-none placeholder:text-[#8A918C] focus-visible:border-[#236130] focus-visible:ring-[#236130] md:text-base",
            isPassword ? "pr-[5.5rem]" : "pr-4",
            error && "border-red-500 focus-visible:border-red-600 focus-visible:ring-red-600",
            className,
          )}
          {...inputProps}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setRevealed((current) => !current)}
            className="absolute inset-y-0 right-1 flex min-w-[4.75rem] cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 text-xs font-bold text-[#42534A] transition-colors duration-200 hover:bg-[#E7F0E6] hover:text-[#173F2A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#236130]"
            aria-label={`${revealed ? "Hide" : "Show"} ${label.toLowerCase()}`}
            aria-pressed={revealed}
          >
            {revealed ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
            <span>{revealed ? "Hide" : "Show"}</span>
          </button>
        ) : null}
      </div>
      {error || helper ? (
        <p
          id={descriptionId}
          className={cn(
            "text-xs leading-5",
            error ? "font-semibold text-red-700" : "text-[#69716C]",
          )}
          role={error ? "alert" : undefined}
        >
          {error || helper}
        </p>
      ) : null}
    </div>
  );
}
