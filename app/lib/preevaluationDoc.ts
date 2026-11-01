import {AlignmentType, BorderStyle, Document, Packer, PageBreak, Paragraph, Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType} from "docx";
import {buildPreevaluation} from "../../src/model/preevaluation";
import type {AcademicCourse, Group} from "../../src/model/domain";

const FONT = "Arial";
const COLOR: Record<string, string> = {verd: "00B050", groc: "FFA500", vermell: "FF0000", gris: "A6A6A6"};
const line = {style: BorderStyle.SINGLE, size: 6, color: "000000"};
const borders = {top: line, bottom: line, left: line, right: line};
const p = (text: string, opts: {bold?: boolean; size?: number; after?: number} = {}) => new Paragraph({spacing: {after: opts.after ?? 0}, children: [new TextRun({text, bold: opts.bold, size: opts.size ?? 22, font: FONT})]});

/** Acta de preavaluació d'un grup en Word (.docx): editable amb Word o Google Docs. Tutor, data, hores, professors i signatures en blanc. */
export async function buildPreevaluationDocx(course: AcademicCourse, group: Group): Promise<Blob> {
  const rows = buildPreevaluation(course, group);
  const year = course.academicYear.replace(/[–—]/g, "-");
  const groupLabel = `${course.configuration.level} · Grup ${group.code}`;

  const cell = (children: Paragraph[], width: number, extra: object = {}) => new TableCell({borders, width: {size: width, type: WidthType.DXA}, margins: {top: 80, bottom: 80, left: 100, right: 100}, children, ...extra});
  const teacherCell = (subject: string) => cell([p(`Assignatura: ${subject}`, {size: 18}), p("Professor/a:", {size: 18}), p("Signatura:", {size: 18}), p("DNI:", {size: 18}), p("", {size: 18}), p("", {size: 18})], 4680);
  const teacherRows: TableRow[] = [];
  const subjects = [`${course.configuration.abbreviation} ${course.configuration.moduleName}`, "", "", "", "", "", "", "", "", "", "", ""];
  for (let i = 0; i < subjects.length; i += 2) teacherRows.push(new TableRow({children: [teacherCell(subjects[i]), teacherCell(subjects[i + 1])]}));

  const commentRows = rows.map(r => new TableRow({cantSplit: true, children: [
    cell([p(r.name, {size: 22}), p(r.comment, {size: 22})], 8000),
    cell([new Paragraph({alignment: AlignmentType.CENTER, children: [new TextRun({text: "●", size: 72, color: COLOR[r.color], font: FONT})]})], 1360, {verticalAlign: VerticalAlign.CENTER}),
  ]}));

  const doc = new Document({
    creator: "RA · Avaluació",
    title: `Acta de preavaluació ${groupLabel} ${year}`,
    styles: {default: {document: {run: {font: FONT, size: 22}}}},
    sections: [{
      properties: {page: {size: {width: 11906, height: 16838}, margin: {top: 1134, bottom: 1134, left: 1134, right: 1134}}},
      children: [
        p(`ACTA DE PREAVALUACIÓ DEL CURS ${year}`),
        new Paragraph({children: [new TextRun({text: "CURS: ", size: 22, font: FONT}), new TextRun({text: groupLabel, bold: true, size: 22, font: FONT})]}),
        p("TUTOR:", {after: 280}),
        new Paragraph({alignment: AlignmentType.JUSTIFIED, spacing: {after: 280}, children: [new TextRun({text: `A Torelló a les ____ hores del dia ____ de ____________ de ______, comença la sessió d'avaluació del grup ${groupLabel} presidida pel tutor/a del grup i amb l'assistència dels professors següents:`, size: 22, font: FONT})]}),
        new Table({width: {size: 9360, type: WidthType.DXA}, columnWidths: [4680, 4680], rows: teacherRows}),
        new Paragraph({children: [new PageBreak()]}),
        p("Comentaris de la preavaluació:", {after: 240}),
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
