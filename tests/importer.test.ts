import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {activityWeights, calculateStudent} from "../src/model/calculation.ts";
import type {AcademicCourse, Group} from "../src/model/domain.ts";
import {importEvaluationWorkbook, parseStudentCsv} from "../src/controllers/importers.ts";

const SAMPLE_PATH = "imports/2-SMX-Generic-Avaluacio per RA.xlsx";

function sampleFile(name = "2-SMX-Generic-Avaluacio per RA.xlsx"): File {
  return new File([readFileSync(SAMPLE_PATH)], name);
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("ca").trim();
}

function findEnrollment(course: AcademicCourse, group: Group, studentName: string) {
  const enrollment = group.enrollments.find(e => {
    const student = group.students.find(s => s.id === e.studentId);
    return student && normalize(student.name) === normalize(studentName);
  });
  if (!enrollment) throw new Error(`Alumne no trobat: ${studentName}`);
  return enrollment;
}

// Xifres confirmades a la secció 7.2 de ESPECIFICACIO-FUNCIONAL.md per a aquest fitxer concret.
test("l'importació del fitxer real reprodueix les xifres confirmades a l'especificació", async () => {
  const preview = await importEvaluationWorkbook(sampleFile());
  assert.deepEqual(preview.summary, {learningResults: 6, criteria: 48, activities: 28, students: 22, grades: 407});
  assert.equal(preview.warnings.length, 0);
  assert.equal(preview.course.groups.find(g => g.code === "A")!.students.length, 22);
  assert.equal(preview.course.groups.find(g => g.code === "B")!.students.length, 0);
});

test("els pesos globals de cada RA coincideixen amb els guardats a la fulla APRENDIZAJE", async () => {
  const {course} = await importEvaluationWorkbook(sampleFile());
  const weights = activityWeights(course);
  // Valors llegits directament de la fila 2 (pes de cada RA) de la fulla APRENDIZAJE del fitxer original.
  const expected: Record<string, number> = {
    RA1: 0.0800735294117647, RA2: 0.169975490196078, RA3: 0.240196078431372,
    RA4: 0.169852941176471, RA5: 0.100147058823529, RA6: 0.239754901960784,
  };
  for (const ra of course.configuration.learningResults) {
    const raWeight = course.configuration.criteria
      .filter(c => c.learningResultId === ra.id)
      .reduce((sum, criterion) => sum + course.configuration.links
        .filter(link => link.criterionId === criterion.id)
        .reduce((s, link) => s + link.allocation * (weights.get(link.activityId) ?? 0), 0), 0);
    assert.ok(Math.abs(raWeight - expected[ra.code]) < 1e-4, `${ra.code}: ${raWeight} vs ${expected[ra.code]}`);
  }
});

test("les notes projectades coincideixen amb l'Excel per a alumnes sense notes superiors a deu", async () => {
  const {course} = await importEvaluationWorkbook(sampleFile());
  const group = course.groups.find(g => g.code === "A")!;
  // Notes globals llegides directament de la columna M de la fulla APRENDIZAJE per a alumnes
  // amb totes les activitats avaluades i cap nota bruta superior a 10.
  const expected: [string, number][] = [
    ["BENHADI AKHANNICH, BACHIR", 6.214818],
    ["BONICH TORRES, JANA", 6.314317],
    ["FERRER SAUS, MARTÍ", 8.750649],
    ["PEÑARROYA CAPDEVILA, GENÍS", 7.057671],
    ["TALLANT YAGÜE, IZAN", 5.774962],
  ];
  for (const [name, globalScore] of expected) {
    const enrollment = findEnrollment(course, group, name);
    const calc = calculateStudent(course, group, enrollment.id);
    assert.equal(calc.globalCoverage, 100);
    assert.ok(Math.abs(calc.globalScore - globalScore) < 0.005, `${name}: ${calc.globalScore} vs ${globalScore}`);
  }
});

// Secció 15: "Un valor directe superior a 10, sense fórmula de bonificació, s'importa com a nota base 10."
// L'Excel original conté un 11,36 sense fórmula per a BENET BACH a "Projecte 2"; per això les seves notes
// projectades divergeixen lleugerament (fins a ~0,04 punts) dels valors guardats a l'Excel, que no apliquen
// aquest límit. La divergència és intencionada i esperada, no un error de l'importador.
test("una nota directa superior a deu s'importa truncada a deu, sense bonificació", async () => {
  const {course} = await importEvaluationWorkbook(sampleFile());
  const group = course.groups.find(g => g.code === "A")!;
  const enrollment = findEnrollment(course, group, "BENET BACH, ERIC");
  const activity = course.configuration.activities.find(a => a.name === "Projecte 2")!;
  const grade = group.grades.find(g => g.enrollmentId === enrollment.id && g.activityId === activity.id)!;
  assert.equal(grade.baseValue, 10);
  assert.equal(grade.bonuses.length, 0);
});

test("les fórmules de bonificació de l'Excel se separen en nota base i bonificacions", async () => {
  const {course} = await importEvaluationWorkbook(sampleFile());
  const group = course.groups.find(g => g.code === "A")!;
  const bonusesFromExcel = group.grades.flatMap(g => g.bonuses.filter(b => b.source === "excel"));
  assert.ok(bonusesFromExcel.length > 0, "s'esperaven bonificacions importades de l'Excel");
  for (const bonus of bonusesFromExcel) {
    assert.ok(bonus.value === 0.5 || bonus.value === 1);
    assert.equal(bonus.reason, "Importat de l’Excel");
  }
});

test("es rebutgen fitxers amb una extensió no admesa", async () => {
  const file = new File([readFileSync(SAMPLE_PATH)], "avaluacio.docx");
  await assert.rejects(() => importEvaluationWorkbook(file), /\.xlsx, \.xls o \.xlsm/);
});

test("el CSV d'alumnes rebutja duplicats i llistes de més de 25 noms", () => {
  assert.throws(() => parseStudentCsv("Anna\nBernat\nAnna"), /duplicats/);
  const massa = Array.from({length: 26}, (_, i) => `Alumne ${i}`).join("\n");
  assert.throws(() => parseStudentCsv(massa), /més de 25/);
});

test("el CSV d'alumnes ignora files buides i ordena alfabèticament en català", () => {
  const {names} = parseStudentCsv("nom\nÓscar\n\nÀlex\nBernat");
  assert.deepEqual(names, ["Àlex", "Bernat", "Óscar"]);
});
