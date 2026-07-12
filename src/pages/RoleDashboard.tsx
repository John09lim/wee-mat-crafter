import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpenCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileText,
  GraduationCap,
  HeartHandshake,
  LockKeyhole,
  Monitor,
  MoreHorizontal,
  School,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rolePinStorageKey, type ProtectedRole } from "@/lib/rolePin";

const rolePins: Record<ProtectedRole, string> = {
  principal: "0000",
  supervisor: "0001",
};

const roleDestinations: Record<ProtectedRole, string> = {
  principal: "/principal-dashboard",
  supervisor: "/supervisor-dashboard",
};

type RoleId = "teacher" | "principal" | "supervisor" | "parent";

type PreviewRow = {
  title: string;
  meta: string;
  status: string;
};

type RoleDefinition = {
  id: RoleId;
  title: string;
  description: string;
  icon: LucideIcon;
  locked: boolean;
  preview: {
    title: string;
    description: string;
    summaryLabel: string;
    summary: Array<{ label: string; value: string; note: string }>;
    collectionLabel: string;
    rows: PreviewRow[];
    rowIcon: LucideIcon;
  };
};

const roles: RoleDefinition[] = [
  {
    id: "teacher",
    title: "Teacher",
    description: "Plan lessons and build weekly learning matrices.",
    icon: GraduationCap,
    locked: false,
    preview: {
      title: "Welcome back, Teacher!",
      description: "Your weekly planning workspace, organized at a glance.",
      summaryLabel: "Sample teaching week",
      summary: [
        { label: "Mon", value: "Plan", note: "Competencies" },
        { label: "Tue", value: "Teach", note: "Activities" },
        { label: "Wed", value: "Guide", note: "Practice" },
        { label: "Thu", value: "Check", note: "Progress" },
        { label: "Fri", value: "Reflect", note: "Next steps" },
      ],
      collectionLabel: "Recent WeeLMat samples",
      rows: [
        { title: "Grade 6 · Mathematics · Week 3", meta: "Weekly matrix draft", status: "Ready" },
        { title: "Grade 5 · English · Week 2", meta: "Shared learning guide", status: "Shared" },
        { title: "Grade 4 · Science · Week 2", meta: "Weekly matrix draft", status: "Review" },
      ],
      rowIcon: FileText,
    },
  },
  {
    id: "principal",
    title: "Principal",
    description: "Oversee plans and monitor school progress.",
    icon: School,
    locked: true,
    preview: {
      title: "School weekly pulse",
      description: "Review submissions and help teaching teams stay on schedule.",
      summaryLabel: "Illustrative school overview",
      summary: [
        { label: "Submitted", value: "18", note: "This week" },
        { label: "For review", value: "04", note: "Needs action" },
        { label: "Shared", value: "14", note: "With learners" },
      ],
      collectionLabel: "Sample review queue",
      rows: [
        { title: "Grade 6 · Mathematics", meta: "Weekly plan submitted", status: "Review" },
        { title: "Grade 5 · English", meta: "Weekly plan approved", status: "Approved" },
        { title: "Grade 4 · Science", meta: "Weekly plan submitted", status: "Review" },
      ],
      rowIcon: BookOpenCheck,
    },
  },
  {
    id: "supervisor",
    title: "Supervisor",
    description: "Support schools and ensure teaching quality.",
    icon: UsersRound,
    locked: true,
    preview: {
      title: "District monitoring view",
      description: "See implementation patterns and identify where support is needed.",
      summaryLabel: "Illustrative district overview",
      summary: [
        { label: "Schools", value: "12", note: "Reporting" },
        { label: "On track", value: "10", note: "This cycle" },
        { label: "Follow-up", value: "02", note: "For support" },
      ],
      collectionLabel: "Sample school updates",
      rows: [
        { title: "Sample School A", meta: "Weekly matrices received", status: "On track" },
        { title: "Sample School B", meta: "Support visit suggested", status: "Follow-up" },
        { title: "Sample School C", meta: "Weekly matrices received", status: "On track" },
      ],
      rowIcon: Building2,
    },
  },
  {
    id: "parent",
    title: "Parent",
    description: "Stay informed and support your child’s learning.",
    icon: HeartHandshake,
    locked: false,
    preview: {
      title: "A clearer week at home",
      description: "Follow the learner’s weekly roadmap and upcoming activities.",
      summaryLabel: "Sample learner week",
      summary: [
        { label: "Monday", value: "Read", note: "English" },
        { label: "Tuesday", value: "Solve", note: "Mathematics" },
        { label: "Wednesday", value: "Explore", note: "Science" },
      ],
      collectionLabel: "Sample learning reminders",
      rows: [
        { title: "Bring the activity sheet", meta: "Mathematics · Tuesday", status: "Upcoming" },
        { title: "Complete the reading response", meta: "English · Wednesday", status: "To do" },
        { title: "Review the weekly checklist", meta: "All subjects · Friday", status: "Weekly" },
      ],
      rowIcon: CalendarDays,
    },
  },
];

type DashboardLocationState = {
  requestedRole?: ProtectedRole;
};

const RoleDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const requestedRole = (location.state as DashboardLocationState | null)?.requestedRole;
  const prefersReducedMotion = useReducedMotion();
  const [activeRole, setActiveRole] = useState<RoleId>(requestedRole ?? "teacher");
  const [slideDirection, setSlideDirection] = useState(1);
  const [selectedRole, setSelectedRole] = useState<ProtectedRole | null>(requestedRole ?? null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (requestedRole) {
      setActiveRole(requestedRole);
      setSelectedRole(requestedRole);
    }
  }, [requestedRole]);

  const activeIndex = roles.findIndex((role) => role.id === activeRole);
  const activeDefinition = roles[activeIndex] ?? roles[0];
  const ActiveIcon = activeDefinition.icon;
  const RowIcon = activeDefinition.preview.rowIcon;

  const openProtectedRole = (role: ProtectedRole) => {
    setSelectedRole(role);
    setPin("");
    setError("");
  };

  const closePinDialog = () => {
    setSelectedRole(null);
    setPin("");
    setError("");
    if (requestedRole) navigate("/role-dashboard", { replace: true });
  };

  const handleRolePreview = (nextRole: RoleId) => {
    const nextIndex = roles.findIndex((role) => role.id === nextRole);
    setSlideDirection(nextIndex >= activeIndex ? 1 : -1);
    setActiveRole(nextRole);
  };

  const handleOpenDashboard = () => {
    if (activeRole === "teacher") {
      navigate("/my-account");
      return;
    }
    if (activeRole === "parent") {
      navigate("/parent-dashboard");
      return;
    }
    openProtectedRole(activeRole);
  };

  const handlePinSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRole) return;

    if (pin !== rolePins[selectedRole]) {
      setError(`Incorrect ${selectedRole} PIN. Please try again.`);
      return;
    }

    sessionStorage.setItem(rolePinStorageKey(selectedRole), "true");
    navigate(roleDestinations[selectedRole]);
  };

  const selectedRoleLabel = selectedRole === "principal"
    ? "Principal"
    : selectedRole === "supervisor"
      ? "Supervisor"
      : "Protected role";

  const entranceTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.48, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <main className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-[#F6F0E7] text-[#142019]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(35,97,48,0.025) 1px, transparent 1px), linear-gradient(rgba(35,97,48,0.025) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[25rem] sm:block" aria-hidden="true">
        <img
          src="/division-negros-oriental.webp"
          alt=""
          className="h-full w-full object-cover object-center opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#F6F0E7] via-[#F6F0E7]/55 to-[#173F2A]/15" />
      </div>

      <div className="container relative z-10 max-w-6xl py-10 sm:py-14 lg:py-16">
        <motion.header
          className="mx-auto max-w-3xl text-center"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={entranceTransition}
        >
          <h1 className="font-display text-4xl font-semibold tracking-[-0.035em] text-[#173F2A] sm:text-5xl lg:text-[3.5rem]">
            Choose your dashboard
          </h1>
          <div className="mx-auto mt-3 h-[3px] w-24 -rotate-2 rounded-full bg-[#D6A73D]" aria-hidden="true" />
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[#445149] sm:text-lg">
            One platform. Four perspectives.<br />Pick your role to get started.
          </p>
        </motion.header>

        <div className="mt-9 grid items-start gap-5 lg:mt-11 lg:grid-cols-[minmax(18rem,0.78fr)_minmax(0,1.42fr)] lg:gap-7">
          <motion.nav
            aria-label="Choose a dashboard role"
            className="overflow-hidden rounded-xl border border-[#D8D0C4] bg-[#FBF8F2] shadow-[0_16px_45px_rgba(23,63,42,0.12)]"
            initial={prefersReducedMotion ? false : { opacity: 0, x: -22 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...entranceTransition, delay: prefersReducedMotion ? 0 : 0.06 }}
          >
            {roles.map(({ id, title, description, icon: Icon, locked }, index) => {
              const isActive = activeRole === id;
              return (
                <motion.button
                  key={id}
                  type="button"
                  aria-pressed={isActive}
                  aria-controls="role-dashboard-preview"
                  onClick={() => handleRolePreview(id)}
                  className={`group relative flex min-h-[7.25rem] w-full cursor-pointer items-center gap-4 border-b border-[#DDD5C9] px-5 py-5 text-left outline-none transition-colors duration-200 last:border-b-0 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D6A73D] sm:px-6 ${
                    isActive
                      ? "bg-[#173F2A] text-white"
                      : "bg-[#FBF8F2] text-[#142019] hover:bg-white"
                  }`}
                  whileHover={prefersReducedMotion ? undefined : { x: isActive ? 0 : 4 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                >
                  {isActive ? (
                    <motion.span
                      layoutId="active-role-accent"
                      className="absolute inset-y-0 left-0 w-1 bg-[#D6A73D]"
                      transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 30 }}
                      aria-hidden="true"
                    />
                  ) : null}
                  <span
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border ${
                      isActive
                        ? "border-white/45 bg-white/5 text-white"
                        : "border-[#D6A73D] bg-white text-[#173F2A]"
                    }`}
                  >
                    <Icon className="h-7 w-7" strokeWidth={1.65} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-display text-xl font-semibold sm:text-2xl">{title}</span>
                      {locked ? (
                        <span className={`inline-flex items-center gap-1 text-[0.65rem] font-semibold uppercase tracking-[0.08em] ${isActive ? "text-[#F0D48B]" : "text-[#6B665E]"}`}>
                          <LockKeyhole className="h-3 w-3" aria-hidden="true" /> PIN required
                        </span>
                      ) : null}
                    </span>
                    <span className={`mt-1.5 block text-sm leading-5 ${isActive ? "text-white/75" : "text-[#59625D]"}`}>
                      {description}
                    </span>
                  </span>
                  <ArrowRight
                    className={`h-5 w-5 shrink-0 transition-transform duration-200 ${isActive ? "text-white" : "text-[#236130] group-hover:translate-x-0.5"}`}
                    aria-hidden="true"
                  />
                  <span className="sr-only">Show {title} dashboard preview</span>
                </motion.button>
              );
            })}
          </motion.nav>

          <motion.section
            id="role-dashboard-preview"
            aria-label={`${activeDefinition.title} dashboard preview`}
            className="min-w-0"
            initial={prefersReducedMotion ? false : { opacity: 0, x: 22 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...entranceTransition, delay: prefersReducedMotion ? 0 : 0.1 }}
          >
            <div className="overflow-hidden rounded-xl border border-[#D8D0C4] bg-[#EEE9E1] shadow-[0_18px_55px_rgba(23,63,42,0.16)]">
              <div className="flex min-h-11 items-center justify-between gap-3 border-b border-[#D8D0C4] px-4 py-2.5 text-xs font-semibold text-[#35433B] sm:px-5">
                <span className="inline-flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-[#236130]" aria-hidden="true" />
                  {activeDefinition.title} dashboard preview
                </span>
                <span className="rounded-full border border-[#CEC5B8] bg-[#F8F3EB] px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.1em] text-[#655F56]">
                  Sample data
                </span>
              </div>

              <div className="relative min-h-[30rem] overflow-hidden p-3 sm:p-4">
                <AnimatePresence mode="wait" initial={false} custom={slideDirection}>
                  <motion.div
                    key={activeRole}
                    custom={slideDirection}
                    initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: slideDirection * 28 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: slideDirection * -18 }}
                    transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
                    className="rounded-lg border border-[#DCD4C8] bg-[#FFFCF7] p-4 shadow-[0_8px_25px_rgba(20,32,25,0.08)] sm:p-5"
                  >
                    <div className="flex flex-col gap-4 border-b border-[#E4DDD2] pb-5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#E5EFE5] text-[#236130]">
                          <ActiveIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div>
                          <h2 className="font-display text-xl font-semibold text-[#142019] sm:text-2xl">
                            {activeDefinition.preview.title}
                          </h2>
                          <p className="mt-1 max-w-lg text-sm leading-6 text-[#626A65]">
                            {activeDefinition.preview.description}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-md bg-[#E7F0E6] px-3 py-2 text-xs font-bold text-[#236130]">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Weekly view
                      </span>
                    </div>

                    <div className="mt-5">
                      <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#6A665F]">
                        {activeDefinition.preview.summaryLabel}
                      </p>
                      <div className={`mt-2.5 grid overflow-hidden rounded-lg border border-[#E0D8CC] bg-[#FAF7F1] ${activeDefinition.preview.summary.length === 5 ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-3"}`}>
                        {activeDefinition.preview.summary.map((item, index) => (
                          <motion.div
                            key={`${activeRole}-${item.label}`}
                            className="min-w-0 border-r border-[#E0D8CC] p-3 text-center last:border-r-0 sm:p-3.5"
                            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.08 + index * 0.045, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                          >
                            <p className="truncate text-[0.62rem] font-bold uppercase tracking-[0.08em] text-[#736E66] sm:text-[0.68rem]">{item.label}</p>
                            <p className="font-display mt-1 text-base font-semibold text-[#173F2A] sm:text-lg">{item.value}</p>
                            <p className="mt-0.5 hidden truncate text-[0.65rem] text-[#817B72] sm:block">{item.note}</p>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="mb-2.5 flex items-center justify-between gap-3">
                        <h3 className="text-sm font-bold text-[#29362F]">{activeDefinition.preview.collectionLabel}</h3>
                        <span className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-[#877E70]">Illustrative</span>
                      </div>
                      <div className="space-y-2">
                        {activeDefinition.preview.rows.map((row, index) => (
                          <motion.div
                            key={`${activeRole}-${row.title}`}
                            className="flex items-center gap-3 rounded-lg border border-[#E2DCD2] bg-white px-3 py-2.5 sm:px-4"
                            initial={prefersReducedMotion ? false : { opacity: 0, y: 9 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.12 + index * 0.055, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#E8F0E7] text-[#236130]">
                              <RowIcon className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-bold text-[#253129] sm:text-sm">{row.title}</span>
                              <span className="mt-0.5 block truncate text-[0.68rem] text-[#77736C] sm:text-xs">{row.meta}</span>
                            </span>
                            <span className="hidden rounded-full bg-[#F1EEE8] px-2 py-1 text-[0.65rem] font-bold text-[#58615C] sm:inline-flex">{row.status}</span>
                            <MoreHorizontal className="h-4 w-4 shrink-0 text-[#7B766E]" aria-hidden="true" />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <motion.button
              type="button"
              onClick={handleOpenDashboard}
              className="mt-4 flex min-h-[3.25rem] w-full cursor-pointer items-center justify-center gap-3 rounded-lg border border-[#2E7040] bg-[#236130] px-6 py-3.5 text-base font-bold text-white shadow-[0_10px_24px_rgba(23,63,42,0.2)] outline-none transition-colors duration-200 hover:bg-[#173F2A] focus-visible:ring-2 focus-visible:ring-[#D6A73D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F6F0E7]"
              whileHover={prefersReducedMotion ? undefined : { y: -2 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
              transition={{ type: "spring", stiffness: 390, damping: 30 }}
            >
              Open {activeDefinition.title} dashboard
              {activeDefinition.locked ? <LockKeyhole className="h-4 w-4" aria-hidden="true" /> : <ArrowRight className="h-5 w-5" aria-hidden="true" />}
            </motion.button>

            <p className="mt-3 flex items-start gap-2 px-1 text-xs leading-5 text-[#5E665F]">
              {activeDefinition.locked ? (
                <>
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#236130]" aria-hidden="true" />
                  Principal and Supervisor access uses a four-digit session PIN. You will be asked after opening this dashboard.
                </>
              ) : (
                <>
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#236130]" aria-hidden="true" />
                  This preview is illustrative. Open the dashboard to continue to your role workspace.
                </>
              )}
            </p>
          </motion.section>
        </div>
      </div>

      <Dialog open={selectedRole !== null} onOpenChange={(open) => { if (!open) closePinDialog(); }}>
        <DialogContent className="max-w-md border-[#D8D0C4] bg-[#FFFCF7]">
          <DialogHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-[#173F2A] text-white shadow-sm">
              <LockKeyhole className="h-6 w-6" aria-hidden="true" />
            </div>
            <DialogTitle className="font-display text-2xl text-[#142019]">{selectedRoleLabel} access</DialogTitle>
            <DialogDescription className="text-[#5F6862]">
              Enter the four-digit PIN to open the {selectedRoleLabel.toLowerCase()} dashboard.
            </DialogDescription>
          </DialogHeader>
          <form className="mt-3 space-y-5" onSubmit={handlePinSubmit}>
            <div className="space-y-2">
              <Label htmlFor="role-pin">Four-digit PIN</Label>
              <Input
                id="role-pin"
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={4}
                pattern="[0-9]{4}"
                value={pin}
                onChange={(event) => {
                  setPin(event.target.value.replace(/\D/g, "").slice(0, 4));
                  if (error) setError("");
                }}
                className="h-12 border-[#CFC7BB] bg-white text-center font-mono text-xl tracking-[0.5em] focus-visible:ring-[#236130]"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "role-pin-error" : "role-pin-help"}
                autoFocus
              />
              <p id="role-pin-help" className={error ? "sr-only" : "text-xs leading-5 text-[#69716C]"}>
                Enter exactly four numbers. Access remains verified for this browser tab session.
              </p>
              {error ? <p id="role-pin-error" className="text-sm font-semibold text-destructive" role="alert">{error}</p> : null}
            </div>
            <Button type="submit" className="h-11 w-full bg-[#236130] hover:bg-[#173F2A]" disabled={pin.length !== 4}>
              Verify and continue
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default RoleDashboard;
