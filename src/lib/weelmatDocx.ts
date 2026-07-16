import type { PlanningDay, PlanningDayKey, WeeLMatFormValues } from "@/lib/weelmatPlanning";
import { getKeyStage, specialCompetencyForTask } from "@/lib/weelmatPlanning";

type DayContent = Partial<Record<PlanningDayKey, string>>;

export interface WeeLMatDocumentContent {
  references?: DayContent;
  activities?: DayContent;
  pictureQuizImages?: DayContent;
}

interface BuildWeeLMatDocxOptions {
  values: WeeLMatFormValues;
  content: WeeLMatDocumentContent;
  days: readonly PlanningDay[];
  dayLabels: string[];
  logoBytes?: Uint8Array;
  imageBytes?: Partial<Record<PlanningDayKey, Uint8Array>>;
  studentVersion?: boolean;
}

const FOREST = "173F2A";
const ACTION_GREEN = "236130";
const GOLD = "D6A73D";
const CREAM = "F6F0E7";
const PAPER = "FFFCF7";
const INK = "142019";
const BORDER = "D8D0C4";
const MUTED = "5D6A61";
const TABLE_WIDTH_DXA = 15700;
const LABEL_COLUMN_DXA = 2350;

const toParagraphs = async (text: string, boldFirst = false) => {
  const { Paragraph, TextRun } = await import("docx");
  const lines = (text || "").split(/\r?\n/);
  return (lines.length ? lines : [""]).map((line, index) => new Paragraph({
    children: [new TextRun({ text: line || " ", bold: boldFirst && index === 0, color: INK, size: 16, font: "Arial" })],
    spacing: { after: 45, line: 235 },
  }));
};

export const buildWeeLMatDocxBlob = async ({
  values,
  content,
  days,
  dayLabels,
  logoBytes,
  imageBytes = {},
  studentVersion = false,
}: BuildWeeLMatDocxOptions) => {
  const {
    AlignmentType,
    BorderStyle,
    Document,
    Footer,
    ImageRun,
    Packer,
    PageOrientation,
    Paragraph,
    ShadingType,
    Table,
    TableCell,
    TableLayoutType,
    TableRow,
    TextRun,
    VerticalAlign,
    WidthType,
  } = await import("docx");

  const keyStage = getKeyStage(values.gradeLevel);
  const isFilipino = values.language === "Filipino";
  const dayWidth = Math.floor((TABLE_WIDTH_DXA - LABEL_COLUMN_DXA) / Math.max(days.length, 1));
  const border = { style: BorderStyle.SINGLE, size: 8, color: BORDER };
  const borders = { top: border, bottom: border, left: border, right: border };

  const makeCell = (children: InstanceType<typeof Paragraph>[], options: { width?: number; fill?: string; vertical?: typeof VerticalAlign[keyof typeof VerticalAlign] } = {}) => new TableCell({
    children,
    width: { size: options.width ?? dayWidth, type: WidthType.DXA },
    borders,
    margins: { top: 100, bottom: 100, left: 110, right: 110 },
    shading: options.fill ? { type: ShadingType.CLEAR, color: "auto", fill: options.fill } : undefined,
    verticalAlign: options.vertical ?? VerticalAlign.TOP,
  });

  const labelCell = (text: string) => makeCell([
    new Paragraph({
      children: [new TextRun({ text, bold: true, color: FOREST, size: 16, font: "Arial" })],
      spacing: { after: 0, line: 230 },
    }),
  ], { width: LABEL_COLUMN_DXA, fill: CREAM, vertical: VerticalAlign.CENTER });

  const headerCells = [
    makeCell([new Paragraph({ children: [new TextRun({ text: isFilipino ? "Bahagi ng Plano" : "Planning Category", bold: true, color: PAPER, size: 16, font: "Arial" })], alignment: AlignmentType.CENTER })], { width: LABEL_COLUMN_DXA, fill: FOREST, vertical: VerticalAlign.CENTER }),
    ...days.map((day, index) => makeCell([
      new Paragraph({
        children: [new TextRun({ text: dayLabels[index] || (isFilipino ? day.filipino : day.day), bold: true, color: PAPER, size: 16, font: "Arial" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 0, line: 230 },
      }),
    ], { fill: FOREST, vertical: VerticalAlign.CENTER })),
  ];

  const competencyCells = await Promise.all(days.map(async (day) => {
    const task = values[`${day.prefix}ExamType`];
    const special = specialCompetencyForTask(task);
    const text = special || values[`${day.prefix}Competency`] || "";
    return makeCell(await toParagraphs(text));
  }));

  const referenceCells = await Promise.all(days.map(async (day) => {
    const task = values[`${day.prefix}ExamType`];
    const text = specialCompetencyForTask(task) || content.references?.[day.key] || "";
    return makeCell(await toParagraphs(text));
  }));

  const activityCells = await Promise.all(days.map(async (day) => {
    const task = values[`${day.prefix}ExamType`];
    const special = specialCompetencyForTask(task);
    const paragraphs = await toParagraphs(special || content.activities?.[day.key] || "");
    if (!special && imageBytes[day.key]) {
      paragraphs.unshift(new Paragraph({
        children: [new ImageRun({ data: imageBytes[day.key]!, transformation: { width: 150, height: 96 }, type: "png" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 90 },
      }));
    }
    return makeCell(paragraphs);
  }));

  const metadataCell = (label: string, value: string, width: number) => makeCell([
    new Paragraph({
      children: [
        new TextRun({ text: `${label}: `, bold: true, color: FOREST, size: 16, font: "Arial" }),
        new TextRun({ text: value || "—", color: INK, size: 16, font: "Arial" }),
      ],
      spacing: { after: 0 },
    }),
  ], { width, fill: PAPER, vertical: VerticalAlign.CENTER });

  const document = new Document({
    creator: "WeeLMat Generator",
    title: `${studentVersion ? "Learner" : "Teacher"} WeeLMat - ${values.subject} - ${values.gradeLevel}`,
    description: "Weekly Learning Matrix generated for teacher review and classroom use.",
    styles: {
      default: {
        document: { run: { font: "Arial", size: 18, color: INK }, paragraph: { spacing: { after: 100, line: 250 } } },
      },
    },
    sections: [{
      properties: {
        page: {
          // docx applies the landscape swap when orientation is set.
          size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE },
          margin: { top: 430, right: 540, bottom: 500, left: 540, header: 250, footer: 250 },
        },
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [
              new TextRun({ text: studentVersion ? "Learner copy" : "Teacher copy", bold: true, color: ACTION_GREEN, size: 14, font: "Arial" }),
              new TextRun({ text: "  •  Review and adapt generated content before classroom use.", color: MUTED, size: 14, font: "Arial" }),
            ],
            alignment: AlignmentType.CENTER,
          })],
        }),
      },
      children: [
        ...(logoBytes ? [new Paragraph({
          children: [new ImageRun({ data: logoBytes, transformation: { width: 112, height: 45 }, type: "png" })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
        })] : []),
        new Paragraph({
          children: [new TextRun({
            text: isFilipino ? "LINGGUHANG MATRIS NG PAGKATUTO (WeeLMat)" : "WEEKLY LEARNING MATRIX (WeeLMat)",
            bold: true,
            color: FOREST,
            size: 28,
            font: "Arial",
          })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
        }),
        new Paragraph({
          children: [new TextRun({
            text: `${keyStage?.code ?? ""}${keyStage ? ` · ${keyStage.label}` : ""}${studentVersion ? " · Learner copy" : " · Teacher copy"}`,
            bold: true,
            color: GOLD,
            size: 16,
            font: "Arial",
          })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 110 },
        }),
        new Table({
          width: { size: TABLE_WIDTH_DXA, type: WidthType.DXA },
          layout: TableLayoutType.FIXED,
          columnWidths: [Math.floor(TABLE_WIDTH_DXA / 2), Math.ceil(TABLE_WIDTH_DXA / 2)],
          rows: [
            new TableRow({ children: [metadataCell(isFilipino ? "Asignatura" : "Subject", values.subject, Math.floor(TABLE_WIDTH_DXA / 2)), metadataCell(isFilipino ? "Antas at Seksyon" : "Grade and Section", `${values.gradeLevel} · ${values.section}`, Math.ceil(TABLE_WIDTH_DXA / 2))] }),
            new TableRow({ children: [metadataCell(isFilipino ? "Saklaw na Petsa" : "Covered Dates", `${values.dateFrom} – ${values.dateTo}`, Math.floor(TABLE_WIDTH_DXA / 2)), metadataCell("Key Stage", `${keyStage?.code ?? "—"} · ${keyStage?.label ?? ""}`, Math.ceil(TABLE_WIDTH_DXA / 2))] }),
          ],
        }),
        new Paragraph({ children: [new TextRun({ text: " ", size: 4 })], spacing: { after: 40 } }),
        new Table({
          width: { size: TABLE_WIDTH_DXA, type: WidthType.DXA },
          layout: TableLayoutType.FIXED,
          columnWidths: [LABEL_COLUMN_DXA, ...days.map(() => dayWidth)],
          rows: [
            new TableRow({ children: headerCells, tableHeader: true }),
            new TableRow({ children: [labelCell(isFilipino ? "Kompetensya" : "Competency"), ...competencyCells] }),
            new TableRow({ children: [labelCell(isFilipino ? "Mungkahing Materyales / Sanggunian" : "Suggested Learning Material / Reference"), ...referenceCells] }),
            new TableRow({ children: [labelCell(isFilipino ? "Mga Gawain sa Pagkatuto" : "Learning Activities / Tasks"), ...activityCells] }),
          ],
        }),
      ],
    }],
  });

  return Packer.toBlob(document);
};
