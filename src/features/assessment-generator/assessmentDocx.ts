import type { AssessmentResult, GeneratedQuestion } from "./types";

const safeFilenamePart = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "Assessment";

const pointsForQuestion = (question: GeneratedQuestion) => Math.max(1, Number(question.points) || 1);

export const downloadAssessmentDocx = async (result: AssessmentResult) => {
  const {
    AlignmentType,
    BorderStyle,
    Document,
    HeadingLevel,
    LevelFormat,
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

  const border = { style: BorderStyle.SINGLE, size: 4, color: "AEB9B1" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const cellMargins = { top: 90, right: 90, bottom: 90, left: 90 };

  const makeParagraph = (
    text: string,
    options?: { bold?: boolean; center?: boolean; size?: number; color?: string; after?: number },
  ) => new Paragraph({
    alignment: options?.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { after: options?.after ?? 80, line: 220 },
    children: [new TextRun({
      text,
      bold: options?.bold,
      font: "Arial",
      size: options?.size ?? 20,
      color: options?.color ?? "17251C",
    })],
  });

  const makeCell = (
    text: string,
    options?: { fill?: string; bold?: boolean; center?: boolean; width?: number },
  ) => new TableCell({
    width: options?.width ? { size: options.width, type: WidthType.DXA } : undefined,
    borders,
    margins: cellMargins,
    verticalAlign: VerticalAlign.CENTER,
    shading: options?.fill ? { fill: options.fill, type: ShadingType.CLEAR } : undefined,
    children: [makeParagraph(text, {
      bold: options?.bold,
      center: options?.center,
      size: 16,
      after: 0,
    })],
  });

  const metadataRows = [
    ["Subject", result.form.subject, "Grade & Section", `${result.form.gradeLevel} - ${result.form.section}`],
    ["Assessment", result.form.assessmentKind, "Term", result.form.term],
    ["Schedule", new Date(`${result.form.schedule}T00:00:00`).toLocaleDateString(), "Language", result.form.language],
  ];

  const metadataTable = () => new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1450, 3230, 1700, 2980],
    layout: TableLayoutType.FIXED,
    rows: metadataRows.map((row) => new TableRow({
      children: [
        makeCell(row[0], { fill: "E7F0E8", bold: true, width: 1450 }),
        makeCell(row[1], { width: 3230 }),
        makeCell(row[2], { fill: "E7F0E8", bold: true, width: 1700 }),
        makeCell(row[3], { width: 2980 }),
      ],
    })),
  });

  const titleBlock = (title: string) => [
    makeParagraph(title.toUpperCase(), { bold: true, center: true, size: 28, color: "173F2A", after: 60 }),
    makeParagraph("AI-assisted teacher draft - review and validate before administration", { center: true, size: 16, color: "526159", after: 160 }),
    metadataTable(),
    makeParagraph("", { after: 60 }),
  ];

  const tosWidths = [3900, 760, 760, 760, 760, 760, 760, 900, 950, 900, 3090];
  const tosHeaders = ["Learning competency", "R", "U", "Ap", "An", "E", "C", "Items", "Points", "%", "Item numbers"];
  const tosTable = new Table({
    width: { size: 15100, type: WidthType.DXA },
    columnWidths: tosWidths,
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        tableHeader: true,
        children: tosHeaders.map((header, index) => makeCell(header, {
          fill: "DCE9DE",
          bold: true,
          center: index > 0,
          width: tosWidths[index],
        })),
      }),
      ...result.tos.map((row) => new TableRow({
        children: [
          makeCell(`${row.competencyCode} - ${row.competency}`, { width: tosWidths[0] }),
          makeCell(String(row.remembering), { center: true, width: tosWidths[1] }),
          makeCell(String(row.understanding), { center: true, width: tosWidths[2] }),
          makeCell(String(row.applying), { center: true, width: tosWidths[3] }),
          makeCell(String(row.analyzing), { center: true, width: tosWidths[4] }),
          makeCell(String(row.evaluating), { center: true, width: tosWidths[5] }),
          makeCell(String(row.creating), { center: true, width: tosWidths[6] }),
          makeCell(String(row.totalItems), { center: true, width: tosWidths[7] }),
          makeCell(String(row.totalPoints), { center: true, width: tosWidths[8] }),
          makeCell(`${row.percentage}%`, { center: true, width: tosWidths[9] }),
          makeCell(row.itemNumbers, { width: tosWidths[10] }),
        ],
      })),
    ],
  });

  const numberingConfig = result.parts.map((part) => ({
    reference: `assessment-${part.id.replace(/[^a-zA-Z0-9]/g, "")}`,
    levels: [{
      level: 0,
      format: LevelFormat.DECIMAL,
      text: "%1.",
      alignment: AlignmentType.START,
      style: { paragraph: { indent: { left: 540, hanging: 360 } } },
    }],
  }));

  const questionChildren = result.parts.flatMap((part) => {
    const reference = `assessment-${part.id.replace(/[^a-zA-Z0-9]/g, "")}`;
    return [
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 180, after: 60 },
        children: [new TextRun({ text: `${part.title}: ${part.type}`, bold: true, font: "Arial", size: 23, color: "173F2A" })],
      }),
      makeParagraph(part.directions, { size: 18, color: "526159", after: 120 }),
      ...part.questions.flatMap((question) => [
        new Paragraph({
          numbering: { reference, level: 0 },
          spacing: { after: question.options.length > 0 ? 40 : 130, line: 240 },
          children: [new TextRun({ text: question.prompt, font: "Arial", size: 20 })],
        }),
        ...question.options.map((option, optionIndex) => new Paragraph({
          indent: { left: 900 },
          spacing: { after: optionIndex === question.options.length - 1 ? 120 : 30 },
          children: [new TextRun({ text: `${String.fromCharCode(65 + optionIndex)}. ${option}`, font: "Arial", size: 19 })],
        })),
        ...(question.options.length === 0 && (part.type === "Essay" || part.type === "Short Answer")
          ? [makeParagraph("________________________________________________________________________________", { size: 18, color: "A3AAA6", after: 80 })]
          : []),
      ]),
    ];
  });

  const answerRows = result.parts.flatMap((part) => part.questions.map((question) => new TableRow({
    children: [
      makeCell(part.title, { width: 1500 }),
      makeCell(String(question.number), { center: true, width: 700 }),
      makeCell(question.answer, { width: 2600 }),
      makeCell(question.rationale || "Teacher validation required.", { width: 3760 }),
      makeCell(String(pointsForQuestion(question)), { center: true, width: 800 }),
    ],
  })));

  const answerTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1500, 700, 2600, 3760, 800],
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          makeCell("Part", { fill: "DCE9DE", bold: true, width: 1500 }),
          makeCell("Item", { fill: "DCE9DE", bold: true, center: true, width: 700 }),
          makeCell("Answer / expected response", { fill: "DCE9DE", bold: true, width: 2600 }),
          makeCell("Rationale / scoring criteria", { fill: "DCE9DE", bold: true, width: 3760 }),
          makeCell("Points", { fill: "DCE9DE", bold: true, center: true, width: 800 }),
        ],
      }),
      ...answerRows,
    ],
  });

  const document = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 20, color: "17251C" },
          paragraph: { spacing: { after: 80, line: 220 } },
        },
      },
    },
    numbering: { config: numberingConfig },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE },
            margin: { top: 540, right: 620, bottom: 540, left: 620, header: 0, footer: 0, gutter: 0 },
          },
        },
        children: [
        ...titleBlock(
          result.form.assessmentKind === "Quiz"
            ? "Quiz Blueprint"
            : "Table of Specifications",
        ),
          makeParagraph(result.policyNote, { size: 16, color: "526159", after: 120 }),
          tosTable,
          makeParagraph("R - Remembering | U - Understanding | Ap - Applying | An - Analyzing | E - Evaluating | C - Creating", { size: 15, color: "526159", after: 0 }),
        ],
      },
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838, orientation: PageOrientation.PORTRAIT },
            margin: { top: 720, right: 720, bottom: 720, left: 720, header: 0, footer: 0, gutter: 0 },
          },
        },
        children: [
          ...titleBlock(`${result.form.term} ${result.form.assessmentKind}`),
          makeParagraph("Name: ____________________________________________    Score: __________", { size: 18, after: 180 }),
          ...questionChildren,
        ],
      },
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838, orientation: PageOrientation.PORTRAIT },
            margin: { top: 720, right: 720, bottom: 720, left: 720, header: 0, footer: 0, gutter: 0 },
          },
        },
        children: [
          ...titleBlock("Answer Key and Scoring Guide"),
          answerTable,
          makeParagraph("Teacher validation: Check every answer, distractor, competency tag, cognitive level, and scoring criterion before classroom use.", { size: 16, color: "526159", after: 0 }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(document);
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  const filename = [
    safeFilenamePart(result.form.gradeLevel),
    safeFilenamePart(result.form.subject),
    safeFilenamePart(result.form.term),
    safeFilenamePart(result.form.assessmentKind),
  ].join("_");
  link.href = url;
  link.download = `${filename}.docx`;
  window.document.body.appendChild(link);
  link.click();
  window.document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
