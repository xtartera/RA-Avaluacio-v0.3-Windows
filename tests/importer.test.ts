import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {activityWeights, calculateStudent} from "../src/model/calculation.ts";
import type {AcademicCourse, Group} from "../src/model/domain.ts";
import {applyActivitiesCsv, applyModuleRaCaCsv, buildActivitiesCsv, importEvaluationWorkbook, parseActivitiesCsv, parseModuleRaCaCsv, parseStudentCsv} from "../src/controllers/importers.ts";
import {createCourse, emptyConfiguration} from "../src/model/domain.ts";

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

test("el CSV de RA i CA del mòdul llegeix les quatre columnes, ometent la capçalera opcional", () => {
  const {rows, warnings} = parseModuleRaCaCsv("ra,descripció ra,ca,descripció ca\nRA1,Instal·la sistemes,CA1.1,Instal·la el sistema\nRA1,Instal·la sistemes,CA1.2,Configura la xarxa");
  assert.deepEqual(rows, [
    {raCode: "RA1", raDescription: "Instal·la sistemes", caCode: "CA1.1", caDescription: "Instal·la el sistema"},
    {raCode: "RA1", raDescription: "Instal·la sistemes", caCode: "CA1.2", caDescription: "Configura la xarxa"},
  ]);
  assert.deepEqual(warnings, []);
});

test("el CSV de RA i CA accepta descripcions amb comes entre cometes, i avisa (sense rebutjar el fitxer) de files incompletes o CA repetits dins el mateix RA", () => {
  const {rows, warnings} = parseModuleRaCaCsv('RA2,"Redacta, revisa i lliura documents",CA2.1,"Redacta la memòria"\nRA2,Redacta,CA2.1,Duplicat\nRA2,Redacta,CA2.2,\n');
  assert.deepEqual(rows, [{raCode: "RA2", raDescription: "Redacta, revisa i lliura documents", caCode: "CA2.1", caDescription: "Redacta la memòria"}]);
  assert.equal(warnings.length, 2);
});

test("el CSV de RA i CA rebutja un fitxer sense cap fila vàlida", () => {
  assert.throws(() => parseModuleRaCaCsv("ra,descripció ra,ca,descripció ca\nRA1,Descripció,CA1.1,"), /cap fila vàlida/);
});

test("applyModuleRaCaCsv crea els RA que no existeixen i ignora els CA amb un codi ja existent en el seu RA", () => {
  const config = emptyConfiguration();
  const first = applyModuleRaCaCsv(config, [
    {raCode: "RA1", raDescription: "Instal·la sistemes", caCode: "CA1.1", caDescription: "Instal·la el sistema"},
    {raCode: "RA1", raDescription: "Instal·la sistemes", caCode: "CA1.2", caDescription: "Configura la xarxa"},
    {raCode: "RA2", raDescription: "Administra usuaris", caCode: "CA2.1", caDescription: "Crea comptes d’usuari"},
  ]);
  assert.deepEqual(first, {raCreated: 2, caCreated: 3, caSkipped: 0});
  assert.equal(config.learningResults.length, 2);
  assert.equal(config.criteria.length, 3);
  const second = applyModuleRaCaCsv(config, [
    {raCode: "RA1", raDescription: "Instal·la sistemes", caCode: "CA1.1", caDescription: "Repetit, s’ha d’ometre"},
    {raCode: "RA1", raDescription: "Instal·la sistemes", caCode: "CA1.3", caDescription: "Nou CA del RA1 existent"},
  ]);
  assert.deepEqual(second, {raCreated: 0, caCreated: 1, caSkipped: 1});
  assert.equal(config.learningResults.length, 2, "no s’ha de duplicar el RA1 ja existent");
  assert.equal(config.criteria.length, 4);
});

test("el CSV d'activitats llegeix nom, tipus, trimestre i data, ometent la capçalera opcional", () => {
  const {rows, warnings} = parseActivitiesCsv("nom,tipus,trimestre,data\nExamen U1,Examen,1,2026-10-15\nPràctica servidors,Pràctica,1,");
  assert.deepEqual(rows, [
    {name: "Examen U1", typeName: "Examen", term: 1, date: "2026-10-15", links: []},
    {name: "Pràctica servidors", typeName: "Pràctica", term: 1, date: null, links: []},
  ]);
  assert.deepEqual(warnings, []);
});

test("el CSV d'activitats avisa (sense rebutjar el fitxer) de files amb dades obligatòries incompletes, trimestre no vàlid o data no vàlida", () => {
  const {rows, warnings} = parseActivitiesCsv('Examen vàlid,Examen,1,\n,Examen,1,\nSense tipus,,1,\nTrimestre no numèric,Examen,dos,\nData incorrecta,Examen,1,15-10-2026');
  assert.deepEqual(rows, [
    {name: "Examen vàlid", typeName: "Examen", term: 1, date: null, links: []},
    {name: "Data incorrecta", typeName: "Examen", term: 1, date: null, links: []},
  ]);
  assert.equal(warnings.length, 4);
});

test("el CSV d'activitats rebutja un fitxer sense cap fila vàlida", () => {
  assert.throws(() => parseActivitiesCsv("nom,tipus,trimestre,data\n,Examen,1,"), /cap fila vàlida/);
});

test("el CSV d'activitats agrupa files consecutives amb el mateix nom, tipus, trimestre i data com a CA de la mateixa activitat", () => {
  const {rows, warnings} = parseActivitiesCsv("nom,tipus,trimestre,data,ca,percentatge\nExamen U1,Examen,1,2026-10-15,CA1.1,40\nExamen U1,Examen,1,2026-10-15,CA2.3,60\nPràctica servidors,Pràctica,1,,CA3.1,100");
  assert.deepEqual(rows, [
    {name: "Examen U1", typeName: "Examen", term: 1, date: "2026-10-15", links: [{caCode: "CA1.1", allocation: 40}, {caCode: "CA2.3", allocation: 60}]},
    {name: "Pràctica servidors", typeName: "Pràctica", term: 1, date: null, links: [{caCode: "CA3.1", allocation: 100}]},
  ]);
  assert.deepEqual(warnings, []);
});

test("el CSV d'activitats avisa i ignora el CA d'una fila amb un percentatge no vàlid, sense descartar la resta de l'activitat", () => {
  const {rows, warnings} = parseActivitiesCsv("Examen U1,Examen,1,,CA1.1,40\nExamen U1,Examen,1,,CA2.3,zero");
  assert.deepEqual(rows, [{name: "Examen U1", typeName: "Examen", term: 1, date: null, links: [{caCode: "CA1.1", allocation: 40}]}]);
  assert.equal(warnings.length, 1);
});

test("applyActivitiesCsv crea les activitats a TOTS els grups del curs i crea els tipus que no existeixen", () => {
  const course = createCourse("2026–2027");
  assert.equal(course.groups.length, 2);
  const result = applyActivitiesCsv(course, [
    {name: "Examen U1", typeName: "Examen", term: 1, date: "2026-10-15", links: []},
    {name: "Pràctica servidors", typeName: "Pràctica", term: 1, date: null, links: []},
  ]);
  assert.deepEqual(result, {created: 2, typesCreated: 2, newTypeNames: ["Examen", "Pràctica"], linksCreated: 0, warnings: []});
  assert.equal(course.configuration.activities.length, 2);
  for (const group of course.groups) {
    assert.equal(group.activityStates.length, 2);
    for (const activity of course.configuration.activities) {
      assert.ok(group.activityStates.some(s => s.activityId === activity.id), `falta l’estat de «${activity.name}» al grup ${group.code}`);
    }
  }
});

test("applyActivitiesCsv reutilitza un tipus d'activitat ja existent (comparació sense distingir majúscules) i ignora files amb un trimestre fora de rang", () => {
  const course = createCourse("2026–2027");
  course.configuration.activityTypes.push({id: "type-examen", name: "Examen", weight: .5, status: "active"});
  const result = applyActivitiesCsv(course, [
    {name: "Examen U1", typeName: "examen", term: 1, date: null, links: []},
    {name: "Fora de rang", typeName: "Examen", term: 9, date: null, links: []},
  ]);
  assert.equal(result.warnings.length, 1);
  assert.equal(result.created, 1);
  assert.equal(result.typesCreated, 0);
  assert.equal(course.configuration.activityTypes.length, 1);
  assert.equal(course.configuration.activities[0].activityTypeId, "type-examen");
});

test("applyActivitiesCsv crea les relacions amb els CA existents (sense distingir majúscules), avisa dels CA desconeguts i de sumes diferents de 100%", () => {
  const course = createCourse("2026–2027");
  course.configuration.learningResults.push({id: "ra-1", code: "RA1", description: "RA de prova", order: 1, status: "active"});
  course.configuration.criteria.push(
    {id: "ca-1", learningResultId: "ra-1", code: "CA1.1", description: "Primer CA", order: 1, status: "active"},
    {id: "ca-2", learningResultId: "ra-1", code: "CA1.2", description: "Segon CA", order: 2, status: "active"},
  );
  const result = applyActivitiesCsv(course, [
    {name: "Examen U1", typeName: "Examen", term: 1, date: null, links: [{caCode: "ca1.1", allocation: 40}, {caCode: "CA9.9", allocation: 30}]},
    {name: "Pràctica servidors", typeName: "Pràctica", term: 1, date: null, links: [{caCode: "CA1.2", allocation: 100}]},
  ]);
  assert.equal(result.linksCreated, 2);
  assert.equal(result.warnings.length, 2);
  assert.ok(result.warnings.some(w => w.includes("CA9.9")));
  assert.ok(result.warnings.some(w => w.includes("sumen 40.0%")));
  assert.equal(course.configuration.links.length, 2);
  const examUnit1 = course.configuration.activities.find(a => a.name === "Examen U1")!;
  const link = course.configuration.links.find(l => l.activityId === examUnit1.id)!;
  assert.equal(link.criterionId, "ca-1");
  assert.equal(link.allocation, .4);
});

test("buildActivitiesCsv exporta les activitats actives amb les seves relacions CA, amb capçalera i separador CRLF", () => {
  const course = createCourse("2026–2027");
  course.configuration.learningResults.push({id: "ra-1", code: "RA1", description: "RA de prova", order: 1, status: "active"});
  course.configuration.criteria.push(
    {id: "ca-1", learningResultId: "ra-1", code: "CA1.1", description: "Primer CA", order: 1, status: "active"},
    {id: "ca-2", learningResultId: "ra-1", code: "CA1.2", description: "Segon CA", order: 2, status: "active"},
  );
  applyActivitiesCsv(course, [
    {name: "Examen U1", typeName: "Examen", term: 1, date: "2026-10-15", links: [{caCode: "CA1.1", allocation: 40}, {caCode: "CA1.2", allocation: 60}]},
    {name: "Pràctica servidors", typeName: "Pràctica", term: 1, date: null, links: []},
  ]);
  const csv = buildActivitiesCsv(course);
  assert.deepEqual(csv.split("\r\n"), [
    "nom,tipus,trimestre,data,ca,percentatge",
    "Examen U1,Examen,1,2026-10-15,CA1.1,40",
    "Examen U1,Examen,1,2026-10-15,CA1.2,60",
    "Pràctica servidors,Pràctica,1,,,",
  ]);
});

test("buildActivitiesCsv omet les activitats arxivades i posa entre cometes els valors amb comes", () => {
  const course = createCourse("2026–2027");
  course.configuration.activityTypes.push({id: "type-examen", name: "Examen", weight: 1, status: "active"});
  course.configuration.activities.push(
    {id: "act-1", name: "Examen, part 1", activityTypeId: "type-examen", term: 1, date: null, order: 1, status: "active"},
    {id: "act-2", name: "Activitat arxivada", activityTypeId: "type-examen", term: 1, date: null, order: 2, status: "archived"},
  );
  const csv = buildActivitiesCsv(course);
  assert.deepEqual(csv.split("\r\n"), [
    "nom,tipus,trimestre,data,ca,percentatge",
    '"Examen, part 1",Examen,1,,,',
  ]);
});

test("l'exportació i la reimportació d'un CSV d'activitats reprodueixen les mateixes activitats i relacions CA", () => {
  const course = createCourse("2026–2027");
  course.configuration.learningResults.push({id: "ra-1", code: "RA1", description: "RA de prova", order: 1, status: "active"});
  course.configuration.criteria.push({id: "ca-1", learningResultId: "ra-1", code: "CA1.1", description: "Primer CA", order: 1, status: "active"});
  applyActivitiesCsv(course, [
    {name: "Examen U1", typeName: "Examen", term: 1, date: "2026-10-15", links: [{caCode: "CA1.1", allocation: 100}]},
  ]);
  const csv = buildActivitiesCsv(course);
  const reimported = createCourse("2027–2028");
  reimported.configuration.learningResults.push({id: "ra-1", code: "RA1", description: "RA de prova", order: 1, status: "active"});
  reimported.configuration.criteria.push({id: "ca-1", learningResultId: "ra-1", code: "CA1.1", description: "Primer CA", order: 1, status: "active"});
  const {rows} = parseActivitiesCsv(csv);
  const result = applyActivitiesCsv(reimported, rows);
  assert.equal(result.created, 1);
  assert.equal(result.linksCreated, 1);
  const activity = reimported.configuration.activities[0];
  assert.equal(activity.name, "Examen U1");
  assert.equal(activity.term, 1);
  assert.equal(activity.date, "2026-10-15");
  assert.equal(reimported.configuration.links[0].allocation, 1);
});
