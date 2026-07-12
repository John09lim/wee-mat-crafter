import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CalendarCheck2,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FileText,
  GraduationCap,
  Landmark,
  Leaf,
  MonitorUp,
  NotebookPen,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollReveal, StaggerGroup, StaggerItem, StaggerListItem } from "@/components/motion/ScrollReveal";
import { WordReveal } from "@/components/motion/WordReveal";

const preparationGuidelines = [
  "Prepare one matrix for each learning area and grade level using the teacher's existing DLP or DLL.",
  "Cover the targeted competencies for the week and express them in brief, learner-friendly language.",
  "List the learning activities, expected outputs, and materials learners will need—including resources for class suspensions.",
  "Keep activities achievable and manageable; avoid excessive outputs that may overwhelm learners.",
  "Confirm that every listed module, activity sheet, or other resource is accessible to all learners.",
  "Choose a cost-efficient presentation method: board display, TV or projector, or minimal printed copies.",
];

const presentationSteps = [
  {
    number: "01",
    title: "Present it at the start of the week",
    copy: "Show the WeeLMat every Monday—or on the first class day—so learners can see the full week ahead.",
  },
  {
    number: "02",
    title: "Explain it in 15 minutes or less",
    copy: "Briefly clarify the activities, tasks, expected outputs, and what learners must do if in-person classes are suspended.",
  },
  {
    number: "03",
    title: "Use it as a progress checklist",
    copy: "Encourage learners to copy the matrix into their notebooks and check their progress each day without added expense.",
  },
];

const agendaAlignment = [
  {
    point: "1",
    agenda: "Full implementation of K to 12",
    level: "Direct alignment",
    copy: "WeeLMat begins with the DLP or DLL and communicates the week's targeted competencies, activities, and outputs in a learner-facing format.",
  },
  {
    point: "2",
    agenda: "Curriculum enrichment",
    level: "Direct alignment",
    copy: "Its continuity guidance and advance listing of accessible materials support disaster preparedness and climate-resilient learning delivery.",
  },
  {
    point: "3",
    agenda: "Expansion of Alternative Learning Systems",
    level: "Supporting alignment",
    copy: "WeeLMat is not an ALS program, but its clear instructions and adaptable materials can complement alternative delivery during disruptions.",
  },
  {
    point: "4",
    agenda: "More school feeding programs",
    level: "Limited connection",
    copy: "WeeLMat has no direct school-feeding function. Schools may communicate related schedules separately without diluting its instructional purpose.",
  },
  {
    point: "5",
    agenda: "Enriched curricular and non-curricular programs",
    level: "Supporting alignment",
    copy: "The matrix gives learners a coherent view of planned activities and outputs and can make purposeful weekly enrichment more visible.",
  },
  {
    point: "6",
    agenda: "Critical thinking, culture, and arts",
    level: "Supporting alignment",
    copy: "Teachers retain professional autonomy to design contextual, higher-order activities; WeeLMat helps communicate those tasks clearly.",
  },
  {
    point: "7",
    agenda: "Financial management reforms",
    level: "Limited connection",
    copy: "The matrix does not perform financial governance, though board display, projection, and minimal printing support prudent use of school resources.",
  },
  {
    point: "8",
    agenda: "Expanded employee welfare",
    level: "Supporting alignment",
    copy: "Building from existing DLPs or DLLs and using a concise reusable format can reduce repetitive formatting when implemented responsibly.",
  },
  {
    point: "9",
    agenda: "Transparent and collaborative leadership",
    level: "Direct alignment",
    copy: "Weekly learner visibility, teacher autonomy, and division or district monitoring create clearer expectations and stronger accountability.",
  },
  {
    point: "10",
    agenda: "Cooperation with communities and the private sector",
    level: "Supporting alignment",
    copy: "A clear weekly plan can help families and community partners understand how to support learners, especially during interruptions.",
  },
];

const currentPolicyLinks = [
  {
    title: "Learning continuity",
    copy: "DepEd Order 022, s. 2024 directs schools to prepare for hazards and identify suitable Alternative Delivery Modes so learners retain access to instruction and resources.",
  },
  {
    title: "Digitalization and efficiency",
    copy: "The 2025–2035 Quality Basic Education Development Plan identifies digitalization as a key strategy and includes reforms addressing teacher paperwork and digital tools.",
  },
  {
    title: "Responsive local implementation",
    copy: "QBEDP emphasizes decentralization and a stronger role for regions and local partners—consistent with a regional tool adapted to school context.",
  },
];

const LearnMore = () => {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <section className="border-b border-primary-foreground/10 bg-primary py-14 text-primary-foreground sm:py-20">
        <div className="container">
          <Link to="/home" className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-secondary transition-colors hover:text-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to home
          </Link>
          <div className="mt-7 grid gap-10 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-secondary">Understanding WeeLMat</p>
              <h1 className="font-display mt-4 max-w-4xl text-4xl font-semibold leading-tight sm:text-5xl">A clear weekly roadmap for teachers and learners.</h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-primary-foreground/80">
                The Weekly Learning Matrix turns an existing Daily Lesson Plan or Daily Lesson Log into a concise, learner-friendly view of the week's competencies, activities, materials, and expected outputs.
              </p>
            </div>
            <div className="rounded-2xl border border-primary-foreground/20 bg-primary-foreground/5 p-5">
              <p className="text-sm font-semibold text-secondary">Regional implementation</p>
              <p className="mt-2 leading-7 text-primary-foreground/80">Based on the supplied NIR memorandum, WeeLMat is mandated in public schools across the Negros Island Region beginning August 4, 2025.</p>
            </div>
          </div>
        </div>
      </section>

      <nav className="sticky top-16 z-20 border-b border-border bg-background/95 backdrop-blur-sm" aria-label="On this page">
        <div className="container overflow-x-auto">
          <ul className="flex min-w-max items-center gap-1 py-2">
            {[
              ["#purpose-heading", "Purpose"],
              ["#preparation-heading", "Preparation"],
              ["#presentation-heading", "Presentation"],
              ["#agenda-heading", "10-Point Agenda"],
              ["#current-policy-heading", "Current policy"],
            ].map(([href, label]) => (
              <li key={href}>
                <a href={href} className="inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <section className="border-b border-primary/10 bg-secondary/15 py-16 sm:py-24" aria-label="WeeLMat in one sentence">
        <div className="container">
          <WordReveal
            text="One clear weekly plan helps learners know what to do, what to prepare, and how to keep learning when classes are disrupted."
            className="font-display max-w-5xl text-3xl font-semibold leading-tight tracking-tight text-primary sm:text-4xl lg:text-5xl"
          />
        </div>
      </section>

      <section className="py-14 sm:py-20" aria-labelledby="purpose-heading">
        <div className="container">
          <ScrollReveal className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Mandate and rationale</p>
            <h2 id="purpose-heading" className="scroll-mt-32 font-display mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Planning, learner agency, and continuity.</h2>
            <p className="mt-4 leading-7 text-muted-foreground">WeeLMat is designed to make weekly instruction visible and manageable—not to replace professional planning. It translates that planning into a format learners can understand and use.</p>
          </ScrollReveal>
          <StaggerGroup className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { icon: NotebookPen, title: "Stronger weekly planning", copy: "Connect daily lessons to one coherent weekly sequence grounded in targeted competencies." },
              { icon: GraduationCap, title: "Learner awareness", copy: "Give learners clear direction, expected outputs, and a practical tool for self-monitoring." },
              { icon: ShieldCheck, title: "Learning continuity", copy: "Prepare accessible activities and materials that remain usable when face-to-face classes are disrupted." },
            ].map(({ icon: Icon, title, copy }) => (
              <StaggerItem key={title}>
                <Card className="h-full border-border bg-card p-6 shadow-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" aria-hidden="true" /></div>
                  <h3 className="mt-5 text-lg font-bold text-foreground">{title}</h3>
                  <p className="mt-2 leading-7 text-muted-foreground">{copy}</p>
                </Card>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      <section className="border-y border-border bg-card py-14 sm:py-20" aria-labelledby="preparation-heading">
        <div className="container grid gap-10 lg:grid-cols-[.75fr_1.25fr]">
          <ScrollReveal>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/25 text-primary"><ClipboardCheck className="h-6 w-6" aria-hidden="true" /></div>
            <h2 id="preparation-heading" className="scroll-mt-32 font-display mt-5 text-3xl font-semibold text-foreground">Preparation</h2>
            <p className="mt-3 leading-7 text-muted-foreground">Keep the matrix concise, accessible, sustainable, and anchored to the teacher's approved instructional plan.</p>
          </ScrollReveal>
          <StaggerGroup className="grid gap-4 sm:grid-cols-2">
            {preparationGuidelines.map((item) => (
              <StaggerListItem key={item} className="flex h-full gap-3 rounded-xl border border-border bg-muted/35 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                  <span className="text-sm leading-6 text-foreground/80">{item}</span>
              </StaggerListItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      <section className="py-14 sm:py-20" aria-labelledby="presentation-heading">
        <div className="container">
          <ScrollReveal className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">A weekly learner routine</p>
            <h2 id="presentation-heading" className="scroll-mt-32 font-display mt-3 text-3xl font-semibold text-foreground sm:text-4xl">Presentation</h2>
          </ScrollReveal>
          <StaggerGroup className="mt-10 grid gap-5 md:grid-cols-3">
            {presentationSteps.map(({ number, title, copy }) => (
              <StaggerListItem key={number} className="h-full rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <span className="font-mono text-sm font-bold text-primary">{number}</span>
                  <h3 className="mt-7 text-lg font-bold text-foreground">{title}</h3>
                  <p className="mt-2 leading-7 text-muted-foreground">{copy}</p>
              </StaggerListItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      <section className="bg-primary py-14 text-primary-foreground sm:py-20" aria-labelledby="agenda-heading">
        <div className="container">
          <ScrollReveal className="max-w-4xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground"><Landmark className="h-6 w-6" aria-hidden="true" /></div>
            <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-secondary">Policy alignment</p>
            <h2 id="agenda-heading" className="scroll-mt-32 font-display mt-3 text-3xl font-semibold sm:text-4xl">How WeeLMat supports DepEd's 10-Point Agenda</h2>
            <p className="mt-4 leading-7 text-primary-foreground/80">The official 10-Point Agenda below was issued for 2016–2022. WeeLMat was introduced later, so these are evidence-based points of alignment—not a claim that the matrix was created as an official implementation instrument for every agenda item.</p>
          </ScrollReveal>
          <StaggerGroup className="mt-10 grid gap-4 md:grid-cols-2">
            {agendaAlignment.map(({ point, agenda, level, copy }) => (
              <StaggerItem key={point}>
                <article className="h-full rounded-2xl border border-primary-foreground/20 bg-primary-foreground/5 p-5">
                  <div className="flex items-start gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-sm font-bold text-secondary-foreground">{point}</span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-white">{agenda}</h3>
                        <span className="rounded-full border border-primary-foreground/20 px-2 py-0.5 text-[11px] font-semibold text-secondary">{level}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-primary-foreground/75">{copy}</p>
                    </div>
                  </div>
                </article>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      <section className="py-14 sm:py-20" aria-labelledby="current-policy-heading">
        <div className="container">
          <ScrollReveal className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Current DepEd direction</p>
            <h2 id="current-policy-heading" className="scroll-mt-32 font-display mt-3 text-3xl font-semibold text-foreground sm:text-4xl">Strong fit with today's continuity and reform priorities.</h2>
            <p className="mt-4 leading-7 text-muted-foreground">Current national policy is framed through DepEd's 5-Point Reform Agenda and the 2025–2035 Quality Basic Education Development Plan—not the earlier 10-point framework.</p>
          </ScrollReveal>
          <StaggerGroup className="mt-10 grid gap-5 md:grid-cols-3">
            {currentPolicyLinks.map(({ title, copy }) => (
              <StaggerItem key={title}>
                <Card className="h-full border-border bg-card p-6 shadow-sm">
                  <h3 className="font-bold text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
                </Card>
              </StaggerItem>
            ))}
          </StaggerGroup>

          <ScrollReveal className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h3 className="font-display text-xl font-semibold text-foreground">Official references</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Use the original DepEd issuances for policy interpretation. The WeeLMat-specific implementation details on this page are based on the regional memorandum text supplied for this project.</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a href="https://www.deped.gov.ph/2024/12/23/december-23-2024-do-022-s-2024-revised-guidelines-on-class-and-work-suspension-in-schools-during-disasters-and-emergencies/" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-secondary/45 bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                DepEd Order 022, s. 2024 <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
              <a href="https://www.deped.gov.ph/secretaryscorner/reports2.html" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-secondary/45 bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                Official 10-Point Agenda <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
              <a href="https://www.deped.gov.ph/2025/07/29/deped-inilunsad-ang-10-taong-quality-basic-education-plan-tugon-sa-panawagan-ni-pbbm-na-unahin-ang-edukasyon/" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-secondary/45 bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                Q-BEDP 2025–2035 <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="border-t border-primary/10 bg-secondary/15 py-14 text-center sm:py-20">
        <ScrollReveal className="container">
          <CalendarCheck2 className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
          <h2 className="font-display mx-auto mt-5 max-w-2xl text-3xl font-semibold text-foreground">Turn your weekly plan into clear learner direction.</h2>
          <p className="mx-auto mt-4 max-w-xl leading-7 text-muted-foreground">Build from your DLP or DLL, review every AI-assisted suggestion, and present a manageable plan your learners can follow.</p>
          <Button asChild size="lg" className="mt-7 h-12 bg-primary px-7 hover:bg-primary/90">
            <Link to="/auth">Create a WeeLMat <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Link>
          </Button>
        </ScrollReveal>
      </section>
    </main>
  );
};

export default LearnMore;
