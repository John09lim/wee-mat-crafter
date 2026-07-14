import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  FileText,
  Languages,
  RotateCcw,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ILAWLanguage = "English" | "Filipino";

type ILAWForm = {
  schoolDistrict: string;
  lessonName: string;
  learningAreas: string;
  teachers: string;
  designedFor: string;
  gradeLevelSection: string;
  term: string;
  week: string;
  inclusiveDates: string;
  principal: string;
  language: ILAWLanguage;
  sessionCompetencies: string[];
};

type ILAWSession = {
  sessionNumber: number;
  objective: string;
  preLesson: string;
  flow: string;
  resources: string;
  integration: string;
  formativeAssessment: string;
  extendedLearning: string;
  reflection: string;
};

type ILAWResult = {
  form: ILAWForm;
  generated: {
    references: string;
    learnerContext: string;
    sessions: ILAWSession[];
  };
  generatedAt: string;
};

type ILAWLessonPlanGeneratorProps = {
  defaultTeacherName?: string;
  defaultSchool?: string;
  defaultDistrict?: string;
  defaultPrincipalName?: string;
  onCancel?: () => void;
};

const blankForm: ILAWForm = {
  schoolDistrict: "",
  lessonName: "",
  learningAreas: "",
  teachers: "",
  designedFor: "",
  gradeLevelSection: "",
  term: "",
  week: "",
  inclusiveDates: "",
  principal: "",
  language: "English",
  sessionCompetencies: ["", "", "", ""],
};

const previewSections: Array<{ key: keyof Omit<ILAWSession, "sessionNumber">; label: string }> = [
  { key: "objective", label: "Learning objective" },
  { key: "preLesson", label: "Pre-lesson" },
  { key: "flow", label: "Learning flow" },
  { key: "resources", label: "Learning resources" },
  { key: "integration", label: "Opportunities for integration" },
  { key: "formativeAssessment", label: "Formative assessment" },
  { key: "extendedLearning", label: "Extended learning" },
  { key: "reflection", label: "Reflection prompts" },
];

const safeFilenamePart = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]+/g, "_")
    .replace(/^_+|_+$/g, "") || "Not_Specified";

const formatParagraphText = (value: string) =>
  value
    .split(/\n+/)
    .map((line) => line.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean);

const ILAWLessonPlanGenerator = ({
  defaultTeacherName = "",
  defaultSchool = "",
  defaultDistrict = "",
  defaultPrincipalName = "",
  onCancel,
}: ILAWLessonPlanGeneratorProps) => {
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [activeSession, setActiveSession] = useState(0);
  const [result, setResult] = useState<ILAWResult | null>(null);
  const [form, setForm] = useState<ILAWForm>(blankForm);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      schoolDistrict:
        current.schoolDistrict || [defaultSchool, defaultDistrict].filter(Boolean).join(", "),
      teachers: current.teachers || defaultTeacherName,
      principal: current.principal || defaultPrincipalName,
    }));
  }, [defaultDistrict, defaultPrincipalName, defaultSchool, defaultTeacherName]);

  const filename = useMemo(() => {
    const source = result?.form ?? form;
    return [
      safeFilenamePart(source.gradeLevelSection),
      safeFilenamePart(source.learningAreas),
      safeFilenamePart(source.teachers),
      safeFilenamePart(source.week),
      "ILAW_Lesson_Plan_Template.docx",
    ].join("_");
  }, [form, result]);

  const setField = (field: Exclude<keyof ILAWForm, "sessionCompetencies">, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const setSessionCompetency = (index: number, value: string) => {
    setForm((current) => ({
      ...current,
      sessionCompetencies: current.sessionCompetencies.map((competency, itemIndex) =>
        itemIndex === index ? value : competency,
      ),
    }));
  };

  const handleGenerate = async () => {
    const requiredTextFields: Array<Exclude<keyof ILAWForm, "language" | "sessionCompetencies">> = [
      "schoolDistrict",
      "lessonName",
      "learningAreas",
      "teachers",
      "designedFor",
      "gradeLevelSection",
      "term",
      "week",
      "inclusiveDates",
      "principal",
    ];
    const hasMissingDetails = requiredTextFields.some((field) => !form[field].trim());
    const firstMissingSession = form.sessionCompetencies.findIndex((competency) => !competency.trim());
    if (hasMissingDetails || firstMissingSession >= 0) {
      toast.error(
        firstMissingSession >= 0
          ? `Enter the competency for Session ${firstMissingSession + 1}.`
          : "Complete every ILAW lesson-plan field before generating.",
      );
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-ilaw-lesson-plan", {
        body: form,
      });
      if (error) throw error;
      if (!data?.generated?.sessions || data.generated.sessions.length !== 4) {
        throw new Error("The generator did not return a complete four-session lesson plan.");
      }
      setResult({ ...(data as ILAWResult), form });
      setActiveSession(0);
      toast.success("Your ILAW lesson-plan preview is ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The lesson plan could not be generated.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!result) return;
    setDownloading(true);
    try {
      const {
        AlignmentType,
        BorderStyle,
        Document,
        PageOrientation,
        Packer,
        Paragraph,
        ShadingType,
        Table: DocxTable,
        TableCell,
        TableLayoutType,
        TableRow,
        TextRun,
        VerticalAlign,
        WidthType,
      } = await import("docx");

      const cellWidth = 3184;
      const tableWidth = cellWidth * 5;
      const border = { style: BorderStyle.SINGLE, size: 4, color: "AEB9B1" };
      const borders = { top: border, bottom: border, left: border, right: border };
      const cellMargins = { top: 90, right: 90, bottom: 90, left: 90 };

      const textParagraphs = (text: string, options?: { boldFirst?: boolean; center?: boolean }) => {
        const lines = formatParagraphText(text);
        return (lines.length > 0 ? lines : [""]).map((line, index) =>
          new Paragraph({
            alignment: options?.center ? AlignmentType.CENTER : AlignmentType.LEFT,
            spacing: { before: 0, after: index === lines.length - 1 ? 0 : 40, line: 190 },
            children: [
              new TextRun({
                text: line,
                bold: options?.boldFirst && index === 0,
                font: "Arial",
                size: 16,
              }),
            ],
          }),
        );
      };

      const labelParagraphs = (title: string, guidance?: string) => [
        new Paragraph({
          spacing: { after: guidance ? 35 : 0, line: 190 },
          children: [new TextRun({ text: title, bold: true, font: "Arial", size: 16 })],
        }),
        ...(guidance
          ? [
              new Paragraph({
                spacing: { after: 0, line: 180 },
                children: [new TextRun({ text: guidance, font: "Arial", size: 15, color: "4B5563" })],
              }),
            ]
          : []),
      ];

      const makeCell = (
        children: InstanceType<typeof Paragraph>[],
        options?: { fill?: string; span?: number; width?: number },
      ) =>
        new TableCell({
          children,
          columnSpan: options?.span,
          width: { size: options?.width ?? cellWidth, type: WidthType.DXA },
          borders,
          margins: cellMargins,
          verticalAlign: VerticalAlign.TOP,
          shading: options?.fill
            ? { type: ShadingType.CLEAR, fill: options.fill, color: "auto" }
            : undefined,
        });

      const metadataRow = (label: string, value: string) =>
        new TableRow({
          children: [
            makeCell(labelParagraphs(label), { fill: "DDEBF7" }),
            makeCell(textParagraphs(value), { span: 4, width: cellWidth * 4 }),
          ],
        });

      const sectionRow = (label: string, description: string, fill: string) =>
        new TableRow({
          children: [
            makeCell(labelParagraphs(label), { fill }),
            makeCell(textParagraphs(description), { span: 4, width: cellWidth * 4 }),
          ],
        });

      const sessionRow = (label: string, guidance: string | undefined, key: keyof Omit<ILAWSession, "sessionNumber">, fill: string) =>
        new TableRow({
          children: [
            makeCell(labelParagraphs(label, guidance), { fill }),
            ...result.generated.sessions.map((session) =>
              makeCell([
                new Paragraph({
                  spacing: { after: 35, line: 190 },
                  children: [
                    new TextRun({
                      text: `Session ${session.sessionNumber}`,
                      bold: true,
                      font: "Arial",
                      size: 16,
                      color: "174E2A",
                    }),
                  ],
                }),
                ...textParagraphs(session[key]),
              ]),
            ),
          ],
        });

      const rows = [
        metadataRow("School / District", result.form.schoolDistrict),
        metadataRow("Name of Lesson", result.form.lessonName),
        metadataRow("Learning Area/s", result.form.learningAreas),
        metadataRow("Designed by Teacher/s", result.form.teachers.toUpperCase()),
        metadataRow(
          "Designed for which / Grade Level and Section",
          `${result.form.designedFor} | ${result.form.gradeLevelSection}`,
        ),
        metadataRow(
          "Term / Week / Inclusive Dates",
          `${result.form.term} | ${result.form.week} | ${result.form.inclusiveDates}`,
        ),
        metadataRow("Language", result.form.language),
        new TableRow({
          children: [
            makeCell(labelParagraphs("No. of Sessions"), { fill: "DDEBF7" }),
            ...result.generated.sessions.map((session) =>
              makeCell(textParagraphs(String(session.sessionNumber), { center: true })),
            ),
          ],
        }),
        metadataRow("References (books, websites, toolkits, etc.)", result.generated.references),
        metadataRow(
          "Declaration of AI use",
          "This lesson plan was prepared with AI assistance and must be reviewed, validated, contextualized, and finalized by the teacher for curriculum alignment and learner suitability.",
        ),
        metadataRow("School Head / Principal", result.form.principal.toUpperCase()),
        sectionRow(
          "Intentions.",
          "The sessions state what learners should understand, practice, and demonstrate by the end of the learning sequence.",
          "DDEBF7",
        ),
        new TableRow({
          children: [
            makeCell(
              labelParagraphs(
                "Learning Competency",
                "Teacher-provided curriculum target for each session.",
              ),
              { fill: "DDEBF7" },
            ),
            ...result.form.sessionCompetencies.map((competency, index) =>
              makeCell([
                new Paragraph({
                  spacing: { after: 35, line: 190 },
                  children: [
                    new TextRun({
                      text: `Session ${index + 1}`,
                      bold: true,
                      font: "Arial",
                      size: 16,
                      color: "174E2A",
                    }),
                  ],
                }),
                ...textParagraphs(competency),
              ]),
            ),
          ],
        }),
        sessionRow(
          "Learning Objectives",
          "State the measurable knowledge, skill, or performance expected for each session.",
          "objective",
          "DDEBF7",
        ),
        new TableRow({
          children: [
            makeCell(
              labelParagraphs("Learner Context", "Record prior learning, strengths, interests, barriers, and supports."),
              { fill: "DDEBF7" },
            ),
            makeCell(textParagraphs(result.generated.learnerContext), { span: 4, width: cellWidth * 4 }),
          ],
        }),
        sectionRow(
          "Learning Experience.",
          "Activities clarify the objective, connect to prior learning, support collaboration, and move learners toward independent performance.",
          "E2F0D9",
        ),
        sessionRow("Pre-Lesson", "Help learners become ready for the lesson.", "preLesson", "E2F0D9"),
        sessionRow("Flow", "Describe the purposeful learning sequence for each session.", "flow", "E2F0D9"),
        sessionRow("Learning Resources", "List materials, accessible options, and alternatives.", "resources", "E2F0D9"),
        sessionRow(
          "Opportunities for Integration",
          "Connect meaningfully to other learning areas, values, local context, or technology.",
          "integration",
          "E2F0D9",
        ),
        sectionRow(
          "Assessment for Learning.",
          "Evidence gathered during the lesson guides feedback, regrouping, remediation, and enrichment.",
          "FFF2CC",
        ),
        sessionRow(
          "Formative Assessment for Learning",
          "Provide an aligned task, success criteria, feedback, and accommodation.",
          "formativeAssessment",
          "FFF2CC",
        ),
        sectionRow(
          "Ways Forward.",
          "Use lesson evidence to plan support, enrichment, and the next teaching move.",
          "FFF2CC",
        ),
        sessionRow(
          "Extended Learning Opportunities",
          "Suggest manageable reinforcement beyond classroom time.",
          "extendedLearning",
          "FFF2CC",
        ),
        sessionRow(
          "Reflections",
          "Record what worked, what needs revision, and which learners need support.",
          "reflection",
          "FFF2CC",
        ),
        new TableRow({
          children: [
            makeCell(labelParagraphs("Prepared / Checked"), { fill: "FFF2CC" }),
            makeCell(textParagraphs(`Prepared by:\n${result.form.teachers.toUpperCase()}\nTeacher`, { boldFirst: true })),
            makeCell(textParagraphs("Date: ____________________")),
            makeCell(textParagraphs(`Checked by:\n${result.form.principal.toUpperCase()}\nSchool Head / Principal`, { boldFirst: true })),
            makeCell(textParagraphs("Date: ____________________")),
          ],
        }),
      ];

      const document = new Document({
        styles: {
          default: {
            document: {
              run: { font: "Arial", size: 16, color: "17251C" },
              paragraph: { spacing: { after: 0, line: 190 } },
            },
          },
        },
        sections: [
          {
            properties: {
              page: {
                // docx swaps the supplied portrait dimensions when landscape is set.
                size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE },
                margin: { top: 461, right: 461, bottom: 461, left: 461, header: 0, footer: 0, gutter: 0 },
              },
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: `AI-assisted draft • Generated ${new Date(result.generatedAt).toLocaleDateString()}`,
                    font: "Arial",
                    size: 15,
                    color: "5F6C63",
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 30 },
                children: [
                  new TextRun({ text: "Appendix A • ILAW-Based Lesson Plan", bold: true, font: "Arial", size: 32, color: "174E2A" }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 20 },
                children: [
                  new TextRun({
                    text: `${result.form.learningAreas} | ${result.form.gradeLevelSection} | ${result.form.term} | ${result.form.week} | ${result.form.language}`,
                    bold: true,
                    font: "Arial",
                    size: 20,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 90 },
                children: [
                  new TextRun({
                    text: `${result.form.inclusiveDates} • ${result.form.schoolDistrict}`,
                    font: "Arial",
                    size: 16,
                    color: "4B5563",
                  }),
                ],
              }),
              new DocxTable({
                rows,
                width: { size: tableWidth, type: WidthType.DXA },
                columnWidths: [cellWidth, cellWidth, cellWidth, cellWidth, cellWidth],
                layout: TableLayoutType.FIXED,
                alignment: AlignmentType.CENTER,
              }),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(document);
      const url = URL.createObjectURL(blob);
      const link = documentRef.createElement("a");
      link.href = url;
      link.download = filename;
      documentRef.body.appendChild(link);
      link.click();
      documentRef.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Your landscape A4 ILAW lesson plan is downloading.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The DOCX could not be created.");
    } finally {
      setDownloading(false);
    }
  };

  const documentRef = document;
  const session = result?.generated.sessions[activeSession];

  return (
    <Card className="overflow-hidden border-primary/20 bg-card shadow-[0_22px_65px_-48px_rgba(20,68,39,.72)]">
      <div className="p-6 sm:p-8">
          {loading ? (
            <div className="flex min-h-[34rem] flex-col items-center justify-center text-center" role="status" aria-live="polite">
              <div className="relative flex h-36 w-36 items-center justify-center">
                <motion.div
                  className="absolute inset-0 rounded-full border border-dashed border-primary/35"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                  className="absolute inset-5 rounded-full border-2 border-primary/15 border-t-secondary"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 3.4, repeat: Infinity, ease: "linear" }}
                />
                <motion.span
                  className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg"
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                >
                  <WandSparkles className="h-7 w-7" aria-hidden="true" />
                </motion.span>
              </div>
              <h3 className="font-display mt-6 text-3xl font-semibold text-foreground">Building your ILAW plan</h3>
              <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                Aligning four sessions, classroom activities, assessments, learner supports, and ways forward.
              </p>
              <div className="mt-7 flex items-center gap-2" aria-hidden="true">
                {[0, 1, 2, 3].map((item) => (
                  <motion.span
                    key={item}
                    className="h-2.5 w-2.5 rounded-full bg-primary"
                    animate={{ opacity: [0.25, 1, 0.25], y: [0, -5, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: item * 0.16 }}
                  />
                ))}
              </div>
            </div>
          ) : result && session ? (
            <div>
              <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Preview ready</p>
                  <h3 className="font-display mt-2 text-3xl font-semibold text-foreground">{result.form.lessonName}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {result.form.learningAreas} • {result.form.gradeLevelSection} • {result.form.term}, {result.form.week}
                  </p>
                </div>
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  A4 landscape
                </span>
              </div>

              <div className="mt-6 grid gap-3 rounded-2xl border border-border bg-muted/25 p-4 text-sm sm:grid-cols-2">
                <div><span className="text-muted-foreground">School / District</span><p className="mt-1 font-medium text-foreground">{result.form.schoolDistrict}</p></div>
                <div><span className="text-muted-foreground">Designed by</span><p className="mt-1 font-medium text-foreground">{result.form.teachers}</p></div>
                <div><span className="text-muted-foreground">Designed for</span><p className="mt-1 font-medium text-foreground">{result.form.designedFor}</p></div>
                <div><span className="text-muted-foreground">Inclusive dates</span><p className="mt-1 font-medium text-foreground">{result.form.inclusiveDates}</p></div>
                <div><span className="text-muted-foreground">Language</span><p className="mt-1 font-medium text-foreground">{result.form.language}</p></div>
                <div className="sm:col-span-2"><span className="text-muted-foreground">School Head / Principal</span><p className="mt-1 font-medium text-foreground">{result.form.principal}</p></div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Session {session.sessionNumber} competency</p>
                  <p className="mt-2 rounded-xl border border-[#bfd2e3] bg-[#eef5fb] p-4 text-sm leading-6 text-foreground">
                    {result.form.sessionCompetencies[activeSession]}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Learner context</p>
                  <p className="mt-2 rounded-xl border border-[#c9dfc0] bg-[#f1f7ee] p-4 text-sm leading-6 text-foreground">
                    {result.generated.learnerContext}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">References and source categories</p>
                  <p className="mt-2 rounded-xl border border-[#ead9a9] bg-[#fff9e8] p-4 text-sm leading-6 text-foreground">
                    {result.generated.references}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-2 overflow-x-auto pb-2" aria-label="Lesson sessions">
                {result.generated.sessions.map((item, index) => (
                  <Button
                    key={item.sessionNumber}
                    type="button"
                    size="sm"
                    variant={activeSession === index ? "default" : "outline"}
                    onClick={() => setActiveSession(index)}
                    aria-pressed={activeSession === index}
                    className="shrink-0"
                  >
                    Session {item.sessionNumber}
                  </Button>
                ))}
              </div>

              <motion.div
                key={session.sessionNumber}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                className="mt-3 max-h-[32rem] space-y-4 overflow-y-auto rounded-2xl border border-border p-4 sm:p-5"
              >
                {previewSections.map(({ key, label }) => (
                  <div key={key}>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{label}</p>
                    <div className="mt-1.5 whitespace-pre-line text-sm leading-6 text-foreground">{session[key]}</div>
                  </div>
                ))}
              </motion.div>

              <p className="mt-5 text-xs leading-5 text-muted-foreground">
                Review and contextualize every AI-assisted entry before classroom use. The downloaded file will contain this same preview content.
              </p>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="ghost" onClick={() => setResult(null)} className="gap-2">
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Edit details
                </Button>
                <Button type="button" onClick={() => void handleDownload()} disabled={downloading} className="gap-2">
                  <Download className="h-4 w-4" aria-hidden="true" />
                  {downloading ? "Preparing DOCX…" : "Download ILAW lesson plan"}
                </Button>
              </div>
            </div>
          ) : (
            <form
              className="space-y-6"
              aria-busy={loading}
              onSubmit={(event) => {
                event.preventDefault();
                void handleGenerate();
              }}
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Lesson details</p>
                <h3 className="font-display mt-2 text-3xl font-semibold text-foreground">Create your ILAW lesson plan</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Enter the lesson details, choose the output language, and provide a competency for every session.</p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="ilaw-school">School / District</Label>
                  <Input id="ilaw-school" value={form.schoolDistrict} onChange={(event) => setField("schoolDistrict", event.target.value)} placeholder="e.g., San Miguel Elementary School, Bacong District" required />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="ilaw-lesson">Name of Lesson</Label>
                  <Input id="ilaw-lesson" value={form.lessonName} onChange={(event) => setField("lessonName", event.target.value)} placeholder="Enter the exact lesson title" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ilaw-area">Learning Area/s</Label>
                  <Input id="ilaw-area" value={form.learningAreas} onChange={(event) => setField("learningAreas", event.target.value)} placeholder="e.g., Filipino 5" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ilaw-teachers">Designed by Teacher/s</Label>
                  <Input id="ilaw-teachers" value={form.teachers} onChange={(event) => setField("teachers", event.target.value)} placeholder="Teacher name/s" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ilaw-designed-for">Designed for which learners</Label>
                  <Input id="ilaw-designed-for" value={form.designedFor} onChange={(event) => setField("designedFor", event.target.value)} placeholder="e.g., Grade 5 learners" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ilaw-grade-section">Grade Level and Section</Label>
                  <Input id="ilaw-grade-section" value={form.gradeLevelSection} onChange={(event) => setField("gradeLevelSection", event.target.value)} placeholder="e.g., Grade 5 - Rizal" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ilaw-term">Term</Label>
                  <Input id="ilaw-term" value={form.term} onChange={(event) => setField("term", event.target.value)} placeholder="e.g., Term 1" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ilaw-week">Week</Label>
                  <Input id="ilaw-week" value={form.week} onChange={(event) => setField("week", event.target.value)} placeholder="e.g., Week 4" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ilaw-dates">Inclusive Dates</Label>
                  <Input id="ilaw-dates" value={form.inclusiveDates} onChange={(event) => setField("inclusiveDates", event.target.value)} placeholder="e.g., July 6–10, 2026" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ilaw-principal">School Head / Principal</Label>
                  <Input id="ilaw-principal" value={form.principal} onChange={(event) => setField("principal", event.target.value)} placeholder="School head's full name" required />
                </div>
              </div>

              <div className="space-y-3 border-t border-border pt-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Languages className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <Label htmlFor="ilaw-language" className="text-base font-semibold text-foreground">Lesson-plan language</Label>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">All AI-generated activities, assessments, and reflection prompts will use this language.</p>
                  </div>
                </div>
                <Select value={form.language} onValueChange={(value) => setField("language", value as ILAWLanguage)}>
                  <SelectTrigger id="ilaw-language" className="h-12 sm:max-w-sm" aria-label="Lesson-plan language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Filipino">Filipino</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <fieldset className="space-y-4 border-t border-border pt-6">
                <legend className="font-display text-2xl font-semibold text-foreground">Session competencies</legend>
                <p className="text-sm leading-6 text-muted-foreground">
                  Enter the approved competency for each session. Competencies stay independent, so one session will never overwrite another.
                </p>
                <div className="grid gap-4 xl:grid-cols-2">
                  {form.sessionCompetencies.map((competency, index) => (
                    <div key={index} className="space-y-2 rounded-xl border border-border bg-muted/20 p-4">
                      <Label htmlFor={`ilaw-session-${index + 1}`} className="font-semibold text-foreground">
                        Session {index + 1} competency <span aria-hidden="true">*</span>
                      </Label>
                      <Textarea
                        id={`ilaw-session-${index + 1}`}
                        value={competency}
                        onChange={(event) => setSessionCompetency(index, event.target.value)}
                        placeholder={`Enter the exact competency for Session ${index + 1}`}
                        rows={4}
                        required
                      />
                    </div>
                  ))}
                </div>
              </fieldset>

              <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="ghost" onClick={onCancel}>Back to my account</Button>
                <Button type="submit" className="gap-2 sm:min-w-64">
                  <WandSparkles className="h-4 w-4" aria-hidden="true" />
                  Generate four-session plan
                </Button>
              </div>
            </form>
          )}
      </div>
    </Card>
  );
};

export default ILAWLessonPlanGenerator;
