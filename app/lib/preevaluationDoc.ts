import {AlignmentType, BorderStyle, Document, ImageRun, Packer, PageBreak, Paragraph, Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType} from "docx";
import {trafficPiePng} from "./trafficPie.ts";
import {buildJointPreevaluation, buildPreevaluation, type PreevaluationRow} from "../../src/model/preevaluation.ts";
import {buildFirstEvaluation} from "../../src/model/firstEvaluation.ts";
import {buildSecondEvaluation} from "../../src/model/secondEvaluation.ts";
import type {AcademicCourse, Group} from "../../src/model/domain.ts";

const FONT = "Arial";
const COLOR: Record<string, string> = {verd: "00B050", groc: "FFA500", vermell: "FF0000", gris: "A6A6A6"};
const line = {style: BorderStyle.SINGLE, size: 6, color: "000000"};
const borders = {top: line, bottom: line, left: line, right: line};
const p = (text: string, opts: {bold?: boolean; size?: number; after?: number} = {}) => new Paragraph({spacing: {after: opts.after ?? 0}, children: [new TextRun({text, bold: opts.bold, size: opts.size ?? 22, font: FONT})]});
const cell = (children: Paragraph[], width: number, extra: object = {}) => new TableCell({borders, width: {size: width, type: WidthType.DXA}, margins: {top: 80, bottom: 80, left: 100, right: 100}, children, ...extra});
/** Tipus d'acta: el títol, l'encapçalament dels comentaris i com es generen els comentaris i els semàfors. */
export type ActaKind = "preavaluacio" | "avaluacio1" | "avaluacio2";
const KINDS: Record<ActaKind, {title: string; heading: string; docTitle: string; build: (course: AcademicCourse, group: Group) => PreevaluationRow[]}> = {
  preavaluacio: {title: "ACTA DE PREAVALUACIÓ", heading: "Comentaris de la preavaluació:", docTitle: "Acta de preavaluació", build: buildPreevaluation},
  avaluacio1: {title: "ACTA DE LA 1a AVALUACIÓ", heading: "Comentaris de la 1a avaluació:", docTitle: "Acta de la 1a avaluació", build: buildFirstEvaluation},
  avaluacio2: {title: "ACTA DE LA 2a AVALUACIÓ", heading: "Comentaris de la 2a avaluació:", docTitle: "Acta de la 2a avaluació", build: buildSecondEvaluation},
};
const dot = (color: string, size: number) => new TextRun({text: "●", size, color: COLOR[color], font: FONT});

/** Estructura comuna de l'acta: capçalera, professors (una cel·la per assignatura), comentaris i signatura. */
async function buildActa(input: {kind: ActaKind; year: string; groupLabel: string; subjects: string[]; commentRows: TableRow[]; note?: string}): Promise<Blob> {
  const {year, groupLabel, commentRows, note} = input, kind = KINDS[input.kind];
  const subjects = [...input.subjects];
  while (subjects.length < 12 || subjects.length % 2) subjects.push("");
  const teacherCell = (subject: string) => cell([p(`Assignatura: ${subject}`, {size: 18}), p("Professor/a:", {size: 18}), p("Signatura:", {size: 18}), p("DNI:", {size: 18}), p("", {size: 18}), p("", {size: 18})], 4680);
  const teacherRows: TableRow[] = [];
  for (let i = 0; i < subjects.length; i += 2) teacherRows.push(new TableRow({children: [teacherCell(subjects[i]), teacherCell(subjects[i + 1])]}));

  const doc = new Document({
    creator: "RA · Avaluació",
    title: `${kind.docTitle} ${groupLabel} ${year}`,
    styles: {default: {document: {run: {font: FONT, size: 22}}}},
    sections: [{
      properties: {page: {size: {width: 11906, height: 16838}, margin: {top: 1134, bottom: 1134, left: 1134, right: 1134}}},
      children: [
        p(`${kind.title} DEL CURS ${year}`),
        new Paragraph({children: [new TextRun({text: "CURS: ", size: 22, font: FONT}), new TextRun({text: groupLabel, bold: true, size: 22, font: FONT})]}),
        p("TUTOR:", {after: 280}),
        new Paragraph({alignment: AlignmentType.JUSTIFIED, spacing: {after: 280}, children: [new TextRun({text: `A Torelló a les ____ hores del dia ____ de ____________ de ______, comença la sessió d'avaluació del grup ${groupLabel} presidida pel tutor/a del grup i amb l'assistència dels professors següents:`, size: 22, font: FONT})]}),
        new Table({width: {size: 9360, type: WidthType.DXA}, columnWidths: [4680, 4680], rows: teacherRows}),
        new Paragraph({children: [new PageBreak()]}),
        p(kind.heading, {after: note ? 80 : 240}),
        ...(note ? [p(note, {size: 16, after: 200})] : []),
        new Table({width: {size: 9360, type: WidthType.DXA}, columnWidths: [8000, 1360], rows: commentRows}),
        p("", {after: 360}),
        p("L'avaluació acaba a les ____ hores", {after: 200}),
        p("Torelló a ____ de ____________ de ______", {after: 400}),
        new Paragraph({alignment: AlignmentType.RIGHT, children: [new TextRun({text: "Signatura del tutor/a", size: 22, font: FONT})]}),
      ],
    }],
  });
  return Packer.toBlob(doc);
}

/** Acta de preavaluació d'un grup en Word (.docx): editable amb Word o Google Docs. Tutor, data, hores, professors i signatures en blanc. */
export async function buildPreevaluationDocx(course: AcademicCourse, group: Group): Promise<Blob> {
  return buildActaDocx("preavaluacio", course, group);
}

/** Acta d'un sol mòdul del tipus indicat: un comentari i un semàfor gran per alumne. */
export async function buildActaDocx(kindName: ActaKind, course: AcademicCourse, group: Group): Promise<Blob> {
  const commentRows = KINDS[kindName].build(course, group).map(r => new TableRow({cantSplit: true, children: [
    cell([p(r.name, {size: 22}), p(r.comment, {size: 22})], 8000),
    cell([new Paragraph({alignment: AlignmentType.CENTER, children: [dot(r.color, 72)]})], 1360, {verticalAlign: VerticalAlign.CENTER}),
  ]}));
  return buildActa({
    kind: kindName, year: course.academicYear.replace(/[–—]/g, "-"), groupLabel: `${course.configuration.level} · Grup ${group.code}`,
    subjects: [`${course.configuration.abbreviation} ${course.configuration.moduleName}`], commentRows
  });
}

/**
 * Acta de preavaluació de tots els mòduls: per cada alumne, el comentari i el semàfor de cada mòdul on és matriculat
 * (cada comentari amb l'abreviatura del mòdul i cada semàfor amb la seva etiqueta).
 */
export async function buildJointPreevaluationDocx(courses: AcademicCourse[], groupCode: string): Promise<Blob> {
  return buildJointActaDocx("preavaluacio", courses, groupCode);
}

/** Acta de tots els mòduls del tipus indicat: un sol semàfor circular per alumne i un comentari per mòdul. */
export async function buildJointActaDocx(kindName: ActaKind, courses: AcademicCourse[], groupCode: string): Promise<Blob> {
  const joint = buildJointPreevaluation(courses, groupCode, KINDS[kindName].build);
  const pies = new Map<string, Uint8Array>(); // les combinacions de colors es repeteixen: una imatge per combinació
  const pieFor = (colors: string[]) => {
    const key = colors.join(",");
    if (!pies.has(key)) pies.set(key, trafficPiePng(colors));
    return pies.get(key)!;
  };
  const commentRows = joint.rows.map(r => {
    const present = r.modules.map((m, i) => ({m, module: joint.modules[i]})).filter((x): x is {m: NonNullable<typeof x.m>; module: typeof x.module} => !!x.m);
    return new TableRow({cantSplit: true, children: [
      cell([p(r.name, {size: 22, bold: true}), ...present.map(({m, module}) => new Paragraph({spacing: {before: 40}, children: [
        dot(m.color, 22), new TextRun({text: ` ${module.abbreviation}: `, bold: true, size: 22, font: FONT}), new TextRun({text: m.comment, size: 22, font: FONT})]})),
        ...(r.closing ? [new Paragraph({spacing: {before: 80}, children: [new TextRun({text: r.closing, italics: true, size: 22, font: FONT})]})] : [])], 8000),
      cell([new Paragraph({alignment: AlignmentType.CENTER, children: [new ImageRun({
        type: "png", data: pieFor(present.map(x => COLOR[x.m.color])), transformation: {width: 46, height: 46},
        altText: {title: "Semàfor", description: present.map(x => `${x.module.abbreviation}: ${x.m.color}`).join(", "), name: "semafor"}
      })]})], 1360, {verticalAlign: VerticalAlign.CENTER}),
    ]});
  });
  const first = courses[0];
  const order = joint.modules.map(m => m.abbreviation).join(" · ");
  return buildActa({
    kind: kindName, year: first.academicYear.replace(/[–—]/g, "-"), groupLabel: `${first.configuration.level} · Grup ${groupCode}`,
    subjects: courses.map(c => `${c.configuration.abbreviation} ${c.configuration.moduleName}`), commentRows,
    note: `Semàfor: un sol cercle dividit en parts iguals, una per cada mòdul on l'alumne és matriculat, en sentit horari des de dalt i segons l'ordre ${order}. Cada part té el color del semàfor d'aquell mòdul (el mateix punt de color que porta el seu comentari).`
  });
}
