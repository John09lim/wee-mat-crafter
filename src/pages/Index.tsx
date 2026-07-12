import { useRef, useState, type ComponentType } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Compass,
  Download,
  FileDown,
  FileCheck2,
  FolderOpen,
  Info,
  Landmark,
  Settings,
  ShieldCheck,
  BadgeCheck,
  WandSparkles,
} from "lucide-react";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WeekMatrixDocument } from "@/components/marketing/WeekMatrixDocument";

const easeOut = [0.22, 1, 0.36, 1] as const;

const benefits = [
  {
    icon: BookOpenCheck,
    title: "Grounded in your DLP or DLL",
    copy: "Translate targeted competencies into a concise weekly sequence learners can understand.",
  },
  {
    icon: Compass,
    title: "Clear weekly direction",
    copy: "Show objectives, activities, materials, and expected outputs before the week begins.",
  },
  {
    icon: FileCheck2,
    title: "Continuity-ready",
    copy: "Keep manageable learning moving when face-to-face classes are disrupted.",
  },
];

const workflow = [
  {
    number: "01",
    title: "Prepare from the DLP or DLL",
    copy: "Select the week's competencies, learning activities, materials, and manageable outputs.",
  },
  {
    number: "02",
    title: "Present the weekly roadmap",
    copy: "Explain the matrix on Monday or the first class day in 15 minutes or less.",
  },
  {
    number: "03",
    title: "Track progress and continue",
    copy: "Learners use the matrix as a daily checklist and a guide during class disruptions.",
  },
];

const reviewSteps = [
  "Read every activity and learner instruction",
  "Confirm alignment with the selected competency",
  "Check difficulty, inclusivity, and local context",
  "Verify answer keys before distribution",
];

const disclaimers = [
  ["AI-assisted draft", "Generated content may contain errors and must be reviewed before classroom use."],
  ["Teacher responsibility", "You remain responsible for approving all activities, instructions, and answers."],
  ["Curriculum alignment", "Confirm the output against current DepEd guidance and your local curriculum."],
  ["Privacy", "Do not enter sensitive or personally identifiable learner information."],
];

type Benefit = {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  copy: string;
};

const WeekStory = () => {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.82", "end 0.42"] });
  const routeProgress = useSpring(scrollYProgress, { stiffness: 150, damping: 28, mass: 0.45 });

  return (
    <section ref={ref} className="relative bg-[#f6f0e7] py-16 sm:py-20 lg:py-24" aria-labelledby="outcomes-heading">
      <div className="container grid gap-8 lg:grid-cols-[84px_1fr] lg:gap-12">
        <div className="relative hidden lg:block" aria-hidden="true">
          <div className="absolute bottom-1 top-1 left-5 w-px bg-[#173f2a]/15" />
          <motion.div
            className="absolute left-5 top-1 h-[calc(100%-0.5rem)] w-px origin-top bg-[#d6a73d]"
            style={{ scaleY: reduceMotion ? 1 : routeProgress }}
          />
          {["01", "02", "03", "04"].map((number, index) => (
            <span key={number} className={`absolute left-0 font-mono text-sm font-bold ${index === 0 ? "text-[#173f2a]" : "text-[#173f2a]/35"}`} style={{ top: `${index * 31}%` }}>
              {number}
            </span>
          ))}
        </div>

        <div>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: reduceMotion ? 0 : 0.48, ease: easeOut }}
            className="max-w-4xl"
          >
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#b07a10]">Built for Negros Oriental educators</p>
            <h2 id="outcomes-heading" className="font-display mt-4 text-4xl font-semibold leading-tight tracking-tight text-[#142019] sm:text-5xl lg:text-6xl">
              Designed around your week.<br />Built for your learners.
            </h2>
            <div className="mt-5 h-1 w-28 origin-left bg-[#d6a73d]" />
          </motion.div>

          <motion.div
            className="mt-10 overflow-hidden rounded-[1.75rem] border border-[#173f2a]/12 bg-white shadow-[0_24px_70px_-48px_rgba(20,32,25,.55)]"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.25 }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: reduceMotion ? 0 : 0.065 } } }}
          >
            <div className="grid md:grid-cols-3">
              {benefits.map(({ icon: Icon, title, copy }: Benefit, index) => (
                <motion.article
                  key={title}
                  variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0 : 0.42, ease: easeOut } } }}
                  className="group relative p-6 sm:p-8 md:min-h-72 md:border-l md:border-[#173f2a]/10 first:md:border-l-0"
                  whileHover={reduceMotion ? undefined : { y: -4 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                >
                  <div className={`flex h-14 w-14 items-center justify-center rounded-full ${index === 1 ? "bg-[#d6a73d] text-[#142019]" : "bg-[#236130] text-white"}`}>
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h3 className="font-display mt-6 text-xl font-semibold text-[#142019]">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#455349]">{copy}</p>
                  <Link to="/learn-more" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#236130] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6a73d]">
                    Learn more <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                  </Link>
                </motion.article>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const WorkflowRoute = () => {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.78", "end 0.35"] });
  const routeProgress = useSpring(scrollYProgress, { stiffness: 150, damping: 28, mass: 0.45 });

  return (
    <section ref={ref} className="bg-white py-16 sm:py-20 lg:py-24" aria-labelledby="workflow-heading">
      <div className="container">
        <div className="grid gap-8 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#b07a10]">A simple three-step flow</p>
            <h2 id="workflow-heading" className="font-display mt-4 text-4xl font-semibold tracking-tight text-[#142019] sm:text-5xl">From competency to classroom-ready.</h2>
          </div>
          <p className="max-w-2xl text-lg leading-8 text-[#536057]">WeeLMat turns an existing instructional plan into a learner-facing weekly routine without replacing teacher judgment.</p>
        </div>

        <div className="relative mt-12">
          <div className="absolute left-6 top-0 h-full w-px bg-[#173f2a]/15 md:left-0 md:right-0 md:top-7 md:h-px md:w-full" aria-hidden="true" />
          <motion.div
            className="absolute left-6 top-0 h-full w-px origin-top bg-[#d6a73d] md:left-0 md:right-0 md:top-7 md:h-px md:w-full md:origin-left"
            style={reduceMotion ? undefined : { scaleX: routeProgress, scaleY: routeProgress }}
            aria-hidden="true"
          />
          <ol className="grid gap-8 md:grid-cols-3 md:gap-6">
            {workflow.map(({ number, title, copy }, index) => (
              <motion.li
                key={number}
                className="relative pl-16 md:pl-0 md:pt-16"
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: reduceMotion ? 0 : 0.44, delay: reduceMotion ? 0 : index * 0.06, ease: easeOut }}
              >
                <span className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-[#173f2a] font-mono text-sm font-bold text-[#f6f0e7] shadow-sm md:left-0 md:top-1">{number}</span>
                <h3 className="font-display text-2xl font-semibold text-[#142019]">{title}</h3>
                <p className="mt-3 max-w-sm leading-7 text-[#536057]">{copy}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};

const Index = () => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [installGuideOpen, setInstallGuideOpen] = useState(false);

  return (
    <main className="overflow-x-clip bg-[#f6f0e7] text-[#142019]">
      <section className="relative overflow-hidden border-b border-[#173f2a]/10 bg-[#f6f0e7] lg:min-h-[calc(100svh-4rem)]">
        <div className="absolute inset-x-0 bottom-0 h-[38%] lg:h-[44%]" aria-hidden="true">
          <img
            src="/division-negros-oriental.webp"
            alt=""
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#f6f0e7] via-[#f6f0e7]/10 to-transparent" />
        </div>

        <div className="container relative z-10 grid gap-10 py-12 lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[.86fr_1.14fr] lg:items-center lg:py-16">
          <div className="max-w-2xl pb-4 lg:pb-24">
            <h1 className="font-display text-[clamp(2.8rem,14vw,7.2rem)] font-semibold leading-[.9] tracking-[-0.05em] text-[#173f2a] sm:leading-[.88] sm:tracking-[-0.055em]">
              <span className="block overflow-hidden pb-2">
                <motion.span className="block" initial={reduceMotion ? false : { y: "108%" }} animate={{ y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.58, ease: easeOut }}>WeeLMat</motion.span>
              </span>
              <span className="block overflow-hidden pb-3">
                <motion.span className="block" initial={reduceMotion ? false : { y: "108%" }} animate={{ y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.58, delay: reduceMotion ? 0 : 0.08, ease: easeOut }}>Generator</motion.span>
              </span>
            </h1>
            <motion.p
              className="mt-5 max-w-xl text-2xl font-medium leading-tight tracking-tight text-[#142019] sm:text-3xl lg:text-[2rem]"
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.48, delay: reduceMotion ? 0 : 0.22, ease: easeOut }}
            >
              Craft <span className="text-[#b07a10]">AI-driven</span> Weekly Learning Matrices in seconds.
            </motion.p>
            <motion.p
              className="mt-6 max-w-xl text-base leading-7 text-[#4f5d53] sm:text-lg sm:leading-8"
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.48, delay: reduceMotion ? 0 : 0.3, ease: easeOut }}
            >
              Turn your Daily Lesson Plan or Daily Lesson Log into a concise weekly roadmap of competencies, activities, materials, and expected outputs—clear enough for learners to follow in class or during disruptions.
            </motion.p>
            <motion.div
              className="mt-8 flex flex-col gap-3 sm:flex-row"
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.48, delay: reduceMotion ? 0 : 0.38, ease: easeOut }}
            >
              <motion.div whileHover={reduceMotion ? undefined : { y: -2 }} whileTap={reduceMotion ? undefined : { scale: 0.98 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}>
                <Button size="lg" className="group h-[3.25rem] w-full cursor-pointer rounded-lg bg-[#236130] px-7 text-base font-semibold text-white shadow-[0_14px_30px_-18px_rgba(23,63,42,.8)] hover:bg-[#173f2a]" onClick={() => navigate("/auth")}>
                  Create a WeeLMat <ArrowRight className="ml-3 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                </Button>
              </motion.div>
              <motion.div whileHover={reduceMotion ? undefined : { y: -2 }} whileTap={reduceMotion ? undefined : { scale: 0.98 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}>
                <Button asChild variant="outline" size="lg" className="group h-[3.25rem] w-full cursor-pointer rounded-lg border-[#236130] bg-[#f6f0e7]/90 px-7 text-base font-semibold text-[#173f2a] hover:bg-white">
                  <a href="/downloads/weelmat-generator.apk" download="WeeLMat-Generator.apk" onClick={() => setInstallGuideOpen(true)}>
                    Download App <Download className="ml-3 h-4 w-4 transition-transform duration-200 group-hover:translate-y-0.5" aria-hidden="true" />
                  </a>
                </Button>
              </motion.div>
            </motion.div>
          </div>

          <div className="relative mx-auto w-full max-w-2xl self-center pb-4 lg:-mr-4 lg:pb-16">
            <WeekMatrixDocument />
          </div>
        </div>
      </section>

      <WeekStory />

      <section className="relative overflow-hidden bg-[#173f2a] py-16 text-[#f6f0e7] sm:py-20" aria-labelledby="policy-heading">
        <div className="container grid gap-10 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
          <motion.div initial={reduceMotion ? false : { opacity: 0, x: -18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.35 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: easeOut }}>
            <p className="font-display text-3xl font-semibold leading-snug sm:text-4xl lg:text-5xl">On Monday, learners see the week ahead. If classes are interrupted, the same roadmap keeps learning moving.</p>
            <div className="mt-8 grid grid-cols-5 gap-2" aria-label="Monday to Friday learning route">
              {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, index) => (
                <div key={day} className="border-t border-[#f6f0e7]/25 pt-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#d6a73d]">{day}</p>
                  <motion.div className="mt-3 h-1 origin-left rounded-full bg-[#d6a73d]" initial={reduceMotion ? false : { scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: reduceMotion ? 0 : 0.35, delay: reduceMotion ? 0 : index * 0.06 }} />
                </div>
              ))}
            </div>
          </motion.div>

          <motion.aside
            className="rounded-[1.75rem] border border-[#d6a73d]/30 bg-[#f6f0e7] p-6 text-[#142019] shadow-[0_24px_70px_-42px_rgba(0,0,0,.7)] sm:p-8"
            initial={reduceMotion ? false : { opacity: 0, x: 18 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease: easeOut }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d6a73d] text-[#142019]"><Landmark className="h-5 w-5" aria-hidden="true" /></div>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.24em] text-[#9a6910]">Policy and purpose</p>
            <h2 id="policy-heading" className="font-display mt-3 text-3xl font-semibold">Learner awareness, self-direction, and continuity.</h2>
            <p className="mt-4 leading-7 text-[#536057]">WeeLMat supports DepEd's learning-continuity direction and aligns with K to 12 implementation, curriculum enrichment, employee welfare, and transparent school leadership.</p>
            <Button variant="outline" className="group mt-6 h-11 border-[#236130] bg-transparent font-semibold text-[#173f2a] hover:bg-white" onClick={() => navigate("/learn-more")}>
              Learn more about WeeLMat <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
            </Button>
          </motion.aside>
        </div>
      </section>

      <WorkflowRoute />

      <section className="bg-[#f6f0e7] py-16 sm:py-20 lg:py-24" aria-labelledby="review-heading">
        <div className="container grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <motion.div className="relative rounded-[1.75rem] border border-[#d6a73d]/45 bg-[#fff9df] p-7 shadow-[0_18px_50px_-38px_rgba(20,32,25,.55)] sm:p-9" initial={reduceMotion ? false : { opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.35 }} transition={{ duration: reduceMotion ? 0 : 0.46, ease: easeOut }}>
            <div className="absolute -right-3 -top-3 h-12 w-12 rotate-6 rounded-sm bg-[#d6a73d]/35" aria-hidden="true" />
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d6a73d] text-[#142019]"><ShieldCheck className="h-6 w-6" aria-hidden="true" /></div>
            <h2 id="review-heading" className="font-display mt-6 text-4xl font-semibold tracking-tight">AI drafts. Teachers decide.</h2>
            <p className="mt-4 leading-7 text-[#536057]">WeeLMat helps with structure and speed, but professional review remains essential before any document reaches learners.</p>
            <Button variant="outline" className="mt-6 h-11 border-[#b07a10] bg-white font-semibold text-[#142019] hover:bg-[#fff4c3]" onClick={() => setDisclaimerOpen(true)}>Read responsible-use guidance</Button>
          </motion.div>

          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.35 }} variants={{ hidden: {}, show: { transition: { staggerChildren: reduceMotion ? 0 : 0.05 } } }}>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#236130]">Before you share</p>
            <h2 className="font-display mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">A quick review protects every learner.</h2>
            <ul className="mt-8 space-y-5">
              {reviewSteps.map((step) => (
                <motion.li key={step} className="flex items-start gap-4 border-b border-[#173f2a]/10 pb-5 text-[#445248]" variants={{ hidden: { opacity: 0, x: 16 }, show: { opacity: 1, x: 0, transition: { duration: reduceMotion ? 0 : 0.38, ease: easeOut } } }}>
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#178d61]" aria-hidden="true" />
                  <span className="leading-6">{step}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <motion.div className="container" initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.985 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, amount: 0.35 }} transition={{ duration: reduceMotion ? 0 : 0.48, ease: easeOut }}>
          <div className="grid gap-5 lg:grid-cols-[1.08fr_.92fr] lg:items-stretch">
            <div className="flex rounded-[2rem] bg-[#173f2a] px-6 py-12 text-center text-[#f6f0e7] sm:px-10 sm:py-16">
              <div className="m-auto">
              <WandSparkles className="mx-auto h-8 w-8 text-[#d6a73d]" aria-hidden="true" />
              <h2 className="font-display mx-auto mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">Give your next weekly plan a better starting point.</h2>
              <p className="mx-auto mt-4 max-w-xl leading-7 text-[#f6f0e7]/75">Create a WeeLMat draft, review it with your teaching expertise, and download it when it is ready.</p>
              <Button size="lg" className="group mt-8 h-12 bg-[#d6a73d] px-7 font-bold text-[#142019] hover:bg-[#e2b94f]" onClick={() => navigate("/auth")}>
                Start creating for free <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
              </Button>
              </div>
            </div>
            <figure className="relative min-h-72 overflow-hidden rounded-[2rem] border border-[#173f2a]/10 bg-[#f6f0e7] shadow-[0_22px_55px_-38px_rgba(20,32,25,.65)] lg:min-h-full">
              <img
                src="/sdo-negros-oriental-building.webp"
                alt="Schools Division of Negros Oriental building"
                className="absolute inset-0 h-full w-full object-cover object-center"
                loading="lazy"
              />
            </figure>
            </div>
        </motion.div>
      </section>

      <Dialog open={disclaimerOpen} onOpenChange={setDisclaimerOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-[#173f2a]/15 bg-[#f6f0e7]">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-3 text-2xl text-[#142019]"><ShieldCheck className="h-6 w-6 text-[#236130]" aria-hidden="true" />Responsible use of WeeLMat</DialogTitle>
            <DialogDescription className="leading-6 text-[#536057]">Keep these safeguards in mind whenever you create an AI-assisted learning document.</DialogDescription>
          </DialogHeader>
          <div className="mt-3 grid gap-3">
            {disclaimers.map(([title, copy], index) => (
              <div key={title} className="flex gap-4 rounded-xl border border-[#173f2a]/12 bg-white p-4">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#236130] text-xs font-bold text-white">{index + 1}</div>
                <div><h3 className="font-bold text-[#142019]">{title}</h3><p className="mt-1 text-sm leading-6 text-[#536057]">{copy}</p></div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={installGuideOpen} onOpenChange={setInstallGuideOpen}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] max-w-6xl overflow-y-auto border-[#173f2a]/15 bg-[#f6f0e7] p-4 sm:p-6 lg:p-8">
          <DialogHeader className="text-left">
            <DialogTitle className="font-display flex items-center gap-3 pr-10 text-xl leading-tight text-[#142019] sm:text-3xl">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#236130] text-white sm:h-11 sm:w-11"><Download className="h-5 w-5" aria-hidden="true" /></span>
              Your APK download has started
            </DialogTitle>
            <DialogDescription className="max-w-3xl text-sm leading-6 text-[#536057] sm:text-base">
              Follow these steps on your Android phone to install WeeLMat Generator. The app opens the official live website, so improvements appear automatically.
            </DialogDescription>
          </DialogHeader>

          <ol className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { number: "1", icon: FileDown, title: "Download the APK", copy: "Wait for WeeLMat-Generator.apk to finish downloading from this official page." },
              { number: "2", icon: FolderOpen, title: "Open the file", copy: "Open the download notification or your Downloads folder, then tap the APK file." },
              { number: "3", icon: Settings, title: "Allow this source", copy: "If Android blocks it, open Settings and allow installs from this browser or Files app." },
              { number: "4", icon: BadgeCheck, title: "Tap Install", copy: "Return to the installer, tap Install, then open WeeLMat Generator." },
            ].map(({ number, icon: StepIcon, title, copy }) => (
              <li key={number} className="relative rounded-2xl border border-[#236130]/15 bg-white p-5 shadow-[0_18px_44px_-38px_rgba(20,32,25,.65)] sm:min-h-64 sm:p-6">
                <span className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#236130] font-bold text-white">{number}</span>
                <StepIcon className="mx-auto mt-2 h-10 w-10 text-[#b07a10]" aria-hidden="true" />
                <h3 className="font-display mt-6 text-center text-xl font-semibold text-[#173f2a]">{title}</h3>
                <p className="mt-3 text-center text-sm leading-6 text-[#536057]">{copy}</p>
              </li>
            ))}
          </ol>

          <div className="mt-2 flex items-start gap-3 rounded-2xl border border-[#236130]/20 bg-[#eaf3eb] p-4 text-[#173f2a] sm:p-5">
            <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Why does Android show a warning?</p>
              <p className="mt-1 text-sm leading-6 text-[#455349]">Android warns about apps installed outside Google Play. Only install the APK downloaded from this official WeeLMat page. You do not need to disable Play Protect globally.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default Index;
