import assert from "node:assert/strict";
import test from "node:test";
import {analyzeCurrentEvidence, analyzeUnits, currentUnitId} from "../src/model/currentEvidence.ts";
import {createCourse, newEnrollment, newId, nowIso} from "../src/model/domain.ts";

/** UT1 amb 4 activitats corregides (la 4a és un examen obligatori) i una de pendent; 6 alumnes. */
function fixture(marks: (number | null)[]) {
  const course = createCourse("2026–2027"), group = course.groups[0], cfg = course.configuration;
  cfg.minRaCoverage = 0;
  const type = {id: newId("type"), name: "Pràctica", weight: 1, status: "active" as const};
  const ra = {id: newId("ra"), code: "RA1", description: "RA", order: 1, status: "active" as const};
  const ca = {id: newId("ca"), learningResultId: ra.id, code: "1.A", description: "A", order: 1, status: "active" as const};
  const acts = [1, 2, 3, 4, 5].map(i => ({id: newId("activity"), name: `A${i}`, activityTypeId: type.id, term: 1, date: null, order: i, status: "active" as const, session: "ordinaria" as const, recoversRaIds: []}));
  cfg.activityTypes = [type]; cfg.learningResults = [ra]; cfg.criteria = [ca]; cfg.activities = acts;
  cfg.links = acts.map(a => ({id: newId("l"), activityId: a.id, criterionId: ca.id, allocation: 1}));
  cfg.workUnits = [{id: newId("ut"), name: "UT1", order: 1, status: "active", activityIds: acts.map(a => a.id), requiredActivityIds: [acts[3].id], learningResultIds: [ra.id]} as never];
  for (let i = 0; i < 6; i++) {
    const student = {id: newId("student"), name: `Alumne ${i + 1}`}, enrollment = newEnrollment(student.id, group.id);
    group.students.push(student); group.enrollments.push(enrollment);
    for (let k = 0; k < 4; k++) {
      const v = i === 0 ? marks[k] : 6;
      group.grades.push({id: newId("g"), enrollmentId: enrollment.id, activityId: acts[k].id, status: v === null ? "not_presented" : "graded", baseValue: v, bonuses: [], updatedAt: nowIso()});
    }
  }
  return {course, group, id: group.enrollments[0].id};
}

test("la UT en curs és la parcialment corregida", () => {
  const f = fixture([8, 8, 8, 8]);
  assert.equal(currentUnitId(f.course, f.group), f.course.configuration.workUnits[0].id);
});


/** Corregeix la 5a activitat (que també aporta a l'RA) amb la mateixa nota per a tots, perquè l'RA quedi tot avaluat. */
function gradeFifth(f: ReturnType<typeof fixture>, value: number) {
  const act = f.course.configuration.activities[4];
  for (const e of f.group.enrollments) f.group.grades.push({id: newId("g"), enrollmentId: e.id, activityId: act.id, status: "graded", baseValue: value, bonuses: [], updatedAt: nowIso()});
}

test("resumeix lliuraments, mitjana, tendència i obligatòries", () => {
  const f = fixture([9, 9, 5, 3]);
  const e = analyzeCurrentEvidence(f.course, f.group, f.id, "Laura Soler")!;
  assert.equal(e.activities.length, 4);
  assert.equal(e.delivered, 4);
  assert.equal(e.average, 6.5);
  assert.equal(e.trend, null); // amb menys de 6 activitats no es parla d'evolució
  assert.equal(e.required.total, 1);
  assert.equal(e.required.failed, 1);
  assert.ok(e.sentences.some(s => /per recuperar/.test(s)));
  assert.ok(!e.sentences.some(s => /Dins la unitat/.test(s)));
});

test("compta els no presentats i avisa de poques activitats", () => {
  const f = fixture([8, null, null, 8]);
  const e = analyzeCurrentEvidence(f.course, f.group, f.id, "Laura Soler")!;
  assert.equal(e.notPresented, 2);
  assert.equal(e.deliveryPct, 50);
  assert.equal(e.average, 4);
  assert.equal(e.averageDelivered, 8);
});

test("contrasta amb l'avaluació inicial", () => {
  const f = fixture([9, 9, 9, 9]);
  const initial = [{id: "d", activityId: "x", enrollmentId: f.id, title: "Avaluació inicial UT1 – X", unit: 1, score: 3, correct: 6, total: 20, blocks: [{number: 1, title: "Xarxa", correct: 1, wrong: 3, unknown: 0, total: 4, pct: 25, minutes: null}], questions: []}] as never;
  const e = analyzeCurrentEvidence(f.course, f.group, f.id, "Laura Soler", {initial})!;
  assert.ok(e.contrast.some(s => /Supera el nivell d'entrada/.test(s)));
  assert.ok(e.contrast.some(s => /«Xarxa»/.test(s)));
});

test("sense activitats corregides no hi ha anàlisi", () => {
  const f = fixture([1, 1, 1, 1]);
  f.group.grades.length = 0;
  assert.equal(analyzeCurrentEvidence(f.course, f.group, f.id, "X"), null);
});

test("recomana recuperar l'obligatòria i lliurar el que falta", () => {
  const f = fixture([9, 0, 9, 3]);
  const e = analyzeCurrentEvidence(f.course, f.group, f.id, "Laura Soler")!;
  assert.ok(e.recommendations.some(r => /Prioritzar la recuperació de «A4»/.test(r)));
  assert.ok(e.recommendations.some(r => /«A2»/.test(r)));
});

test("potencial sense constància: bones notes quan lliura però la mitjana cau pels 0", () => {
  const f = fixture([10, 0, 0, 9]);
  const e = analyzeCurrentEvidence(f.course, f.group, f.id, "Laura Soler")!;
  assert.equal(e.averageDelivered, 9.5);
  assert.equal(e.average, 4.75);
  assert.ok(e.recommendations.some(r => /Potencial clar/.test(r)));
});

test("diverses UT: una anàlisi per UT, l'acumulat i la comparació", () => {
  const f = fixture([9, 9, 9, 9]);
  const cfg = f.course.configuration, acts = cfg.activities;
  // Partim la UT1 (A1-A3) i creem la UT2 (A4-A5), amb A4 ja corregida per a tots amb una nota baixa a l'alumne.
  const ut1 = cfg.workUnits[0]; ut1.activityIds = acts.slice(0, 3).map(a => a.id); ut1.requiredActivityIds = [];
  cfg.workUnits.push({id: "ut2", name: "UT2", order: 2, status: "active", activityIds: acts.slice(3).map(a => a.id), requiredActivityIds: [acts[3].id], learningResultIds: ut1.learningResultIds} as never);
  f.group.grades.find(g => g.enrollmentId === f.id && g.activityId === acts[3].id)!.baseValue = 3;
  const r = analyzeUnits(f.course, f.group, f.id, "Laura Soler");
  assert.equal(r.units.length, 2);
  assert.equal(r.units[0].average, 9);
  assert.equal(r.units[1].average, 3);
  assert.ok(r.cumulative && r.cumulative.activities.length === 4);
  assert.ok(r.comparison.some(c => /baixa de 9,0 a 3,0/.test(c)));
});

test("un 0 no compta com a lliurat (isDelivered)", async () => {
  const {isDelivered} = await import("../src/model/calculation.ts");
  assert.equal(isDelivered({status: "graded", baseValue: 0, bonuses: []}), false);
  assert.equal(isDelivered({status: "graded", baseValue: 0.5, bonuses: []}), true);
  assert.equal(isDelivered({status: "graded", baseValue: 7, bonuses: []}), true);
  assert.equal(isDelivered({status: "graded"}), true);
});

test("semàfor: el color és la mitjana; l'obligatòria suspesa fa vermell; la resta són avisos", () => {
  const traffic = (marks: (number | null)[]) => { const f = fixture(marks); return analyzeCurrentEvidence(f.course, f.group, f.id, "Laura Soler")!.traffic; };
  assert.equal(traffic([9, 9, 9, 9]).color, "verd");
  assert.equal(traffic([7, 7, 7, 7]).color, "verd");
  assert.equal(traffic([6, 6, 6, 6]).color, "groc");
  assert.equal(traffic([5, 5, 5, 5]).color, "groc");
  assert.equal(traffic([4, 4, 4, 4]).color, "vermell");
  assert.equal(traffic([9, 9, 9, 3]).color, "vermell"); // obligatòria suspesa, malgrat la mitjana de 7,5
  // 3 lliurades amb 10 i una en blanc: mitjana 7,5 → verd, però amb avís de constància (75 %)
  const t = traffic([10, 10, 10, 0]);
  assert.equal(t.color, "vermell"); // la 4a és l'obligatòria i té 0
  const f = fixture([9, 9, 9, 9]);
  f.group.grades = f.group.grades.filter(g => g.activityId === f.course.configuration.activities[0].id);
  assert.equal(analyzeCurrentEvidence(f.course, f.group, f.id, "Laura Soler")!.traffic.color, "gris"); // una sola activitat corregida
});

test("semàfor: un alumne amb més nota mai no té un color pitjor que un amb menys nota (sense obligatòries)", () => {
  const order = {verd: 0, groc: 1, vermell: 2};
  let previous = -1;
  for (const m of [10, 8, 7, 6.9, 6, 5, 4.9, 2, 0]) {
    const f = fixture([m, m, m, 5]); // la 4a, obligatòria, aprovada
    const c = order[analyzeCurrentEvidence(f.course, f.group, f.id, "X")!.traffic.color as "verd" | "groc" | "vermell"];
    assert.ok(c >= previous, `nota ${m}`);
    previous = c;
  }
});

test("resultat per UT: obligatòries aprovades i nota de l'RA ≥ 5 (acumulada), o cal recuperar", async () => {
  const {analyzeUnitResults} = await import("../src/model/unitResults.ts");
  const make = (marks: (number | null)[], fifth = 8) => {
    const f = fixture(marks), cfg = f.course.configuration;
    cfg.workUnits[0].activityIds = cfg.activities.slice(0, 4).map(a => a.id);
    gradeFifth(f, fifth);
    return analyzeUnitResults(f.course, f.group, f.id, "Laura Soler")[0];
  };
  assert.equal(make([8, 8, 8, 8]).status, "superada");
  const noObl = make([9, 9, 9, 3]);
  assert.equal(noObl.status, "no-superada");
  assert.match(noObl.reason, /cal recuperar A4/);
  const low = make([3, 3, 3, 6], 3); // tot corregit i la nota de l'RA no arriba a 5
  assert.equal(low.status, "no-superada");
  assert.match(low.reason, /nota de l'RA/);
  assert.equal(make([9, 9, 9, 9]).ras[0].code, "RA1");
});

test("un RA amb nota baixa és «en curs» mentre la UT no està corregida i «no assolit» quan ja ho està", async () => {
  const {analyzeUnitResults} = await import("../src/model/unitResults.ts");
  const f = fixture([3, 3, 3, 6]), cfg = f.course.configuration;
  // La UT inclou la 5a activitat, encara pendent: la UT és en curs.
  cfg.workUnits[0].activityIds = cfg.activities.map(a => a.id);
  const open = analyzeUnitResults(f.course, f.group, f.id, "Laura Soler")[0];
  assert.equal(open.ras[0].outcome, "en-curs");
  // La UT només té les 4 corregides (la 5a queda d'una altra UT sense corregir): UT corregida i nota < 5 → no assolit.
  cfg.workUnits[0].activityIds = cfg.activities.slice(0, 4).map(a => a.id);
  const closed = analyzeUnitResults(f.course, f.group, f.id, "Laura Soler")[0];
  assert.equal(closed.ras[0].outcome, "suspes");
  assert.equal(closed.status, "no-superada");
  assert.match(closed.reason, /la UT està corregida/);
});

test("RA segons les UT que el tanquen", async () => {
  const {raOutcome} = await import("../src/model/unitResults.ts");
  assert.equal(raOutcome([]), "sense-ut");
  assert.equal(raOutcome(["superat"]), "superat");
  assert.equal(raOutcome(["superat", "suspes"]), "suspes");
  assert.equal(raOutcome(["superat", "en-curs"]), "en-curs");
  assert.equal(raOutcome(["sense-dades"]), "sense-dades");
});

test("una UT que tanca dos RA: cada RA se supera o se suspèn per separat", async () => {
  const {analyzeUnitResults} = await import("../src/model/unitResults.ts");
  const f = fixture([9, 9, 9, 9]), cfg = f.course.configuration;
  cfg.workUnits[0].activityIds = cfg.activities.slice(0, 4).map(a => a.id);
  cfg.workUnits[0].requiredActivityIds = [];
  // Segon RA vinculat només a A1, que l'alumne té bé (9) o malament segons el cas: el posem malament.
  const ra2 = {id: newId("ra"), code: "RA2", description: "RA2", order: 2, status: "active" as const};
  const ca2 = {id: newId("ca"), learningResultId: ra2.id, code: "2.A", description: "B", order: 1, status: "active" as const};
  cfg.learningResults.push(ra2); cfg.criteria.push(ca2);
  cfg.links = cfg.links.filter(l => l.activityId === cfg.activities[3].id || true);
  cfg.links.push({id: newId("l"), activityId: cfg.activities[0].id, criterionId: ca2.id, allocation: 1});
  cfg.workUnits[0].learningResultIds = [cfg.learningResults[0].id, ra2.id];
  f.group.grades.find(g => g.enrollmentId === f.id && g.activityId === cfg.activities[0].id)!.baseValue = 2;
  const u = analyzeUnitResults(f.course, f.group, f.id, "Laura Soler")[0];
  const by = Object.fromEntries(u.ras.map(a => [a.code, a.outcome]));
  assert.equal(by.RA2, "suspes"); // només depèn d'A1 (2)
  assert.equal(by.RA1, "superat"); // la resta d'activitats són bones
  assert.equal(u.status, "no-superada");
});

test("resum per a l'alumne: només nota projectada, estats i causa", async () => {
  const {summarizeStudent} = await import("../src/model/studentSummary.ts");
  const make = (marks: number[], fifth = 8) => { const f = fixture(marks), cfg = f.course.configuration; cfg.workUnits[0].activityIds = cfg.activities.slice(0, 4).map(a => a.id); gradeFifth(f, fifth); return summarizeStudent(f.course, f.group, f.id); };
  const ok = make([8, 8, 8, 8]);
  assert.equal(ok.status, "superat");
  assert.equal(ok.ras[0].state, "assolit");
  const obl = make([9, 9, 9, 3]); // l'obligatòria (A4) suspesa
  assert.equal(obl.status, "no-superat");
  assert.match(obl.causes.join(" "), /obligatòries: A4/);
  assert.equal(obl.ras[0].state, "no-assolit");
  assert.ok(!/\d,\d|\d\.\d/.test(obl.causes.join(" ") + obl.ras[0].causes.join(" ")), "les causes no porten cap nota");
  const low = make([3, 3, 3, 6], 3);
  assert.equal(low.status, "no-superat");
  assert.match(low.ras[0].causes[0], /nota de l'RA no arriba al mínim/);
});

test("obligatòries per mitjana: un alumne pot suspendre'n una i superar el conjunt", async () => {
  const {requiredGroupStatus, calculateStudent} = await import("../src/model/calculation.ts");
  const {analyzeUnitResults} = await import("../src/model/unitResults.ts");
  const make = (marks: number[], byAverage: boolean) => {
    const f = fixture(marks), cfg = f.course.configuration;
    cfg.workUnits[0].activityIds = cfg.activities.slice(0, 4).map(a => a.id);
    cfg.workUnits[0].requiredActivityIds = [cfg.activities[2].id, cfg.activities[3].id]; // A3 i A4 obligatòries
    cfg.requiredByAverage = byAverage;
    gradeFifth(f, 8);
    return f;
  };
  // A3 = 3 (suspesa) i A4 = 9: mitjana 6.
  const strict = make([8, 8, 3, 9], false);
  assert.equal(requiredGroupStatus(strict.course, strict.group, strict.id, strict.course.configuration.workUnits[0]).passed, false);
  assert.ok(calculateStudent(strict.course, strict.group, strict.id).learningResults.values().next().value!.failingActivities > 0);
  const lenient = make([8, 8, 3, 9], true);
  const st = requiredGroupStatus(lenient.course, lenient.group, lenient.id, lenient.course.configuration.workUnits[0]);
  assert.equal(st.passed, true);
  assert.equal(st.average, 6);
  assert.equal(calculateStudent(lenient.course, lenient.group, lenient.id).learningResults.values().next().value!.failingActivities, 0);
  const unit = analyzeUnitResults(lenient.course, lenient.group, lenient.id, "Laura Soler")[0];
  assert.equal(unit.requiredSummary.mode, "average");
  assert.notEqual(unit.status, "no-superada");
  // Mitjana per sota del mínim: no superades; un «No presentat» compta 0.
  const fail = make([8, 8, 3, 6], true);
  assert.equal(requiredGroupStatus(fail.course, fail.group, fail.id, fail.course.configuration.workUnits[0]).passed, false);
  // Si una obligatòria encara no té nota, no es pot dir res.
  const pending = make([8, 8, 3, 9], true);
  pending.group.grades = pending.group.grades.filter(g => !(g.enrollmentId === pending.id && g.activityId === pending.course.configuration.activities[3].id));
  assert.equal(requiredGroupStatus(pending.course, pending.group, pending.id, pending.course.configuration.workUnits[0]).passed, null);
});

test("pes de cada activitat dins d'un RA: suma 100 % i depèn dels vincles", async () => {
  const {activityShareInRa} = await import("../src/model/calculation.ts");
  const f = fixture([8, 8, 8, 8]), cfg = f.course.configuration;
  const ra = cfg.learningResults[0];
  // Un RA amb un criteri i cinc activitats iguals: 20 % cadascuna.
  const flat = activityShareInRa(f.course, ra.id);
  assert.equal(flat.size, 5);
  for (const v of flat.values()) assert.ok(Math.abs(v - 0.2) < 1e-9);
  // Un segon criteri només vinculat a A1: A1 passa a pesar el 60 % (la meitat del primer criteri + tot el segon / 2).
  const ca2 = {id: newId("ca"), learningResultId: ra.id, code: "1.B", description: "B", order: 2, status: "active" as const};
  cfg.criteria.push(ca2); cfg.links.push({id: newId("l"), activityId: cfg.activities[0].id, criterionId: ca2.id, allocation: 1});
  const two = activityShareInRa(f.course, ra.id);
  assert.ok(Math.abs(two.get(cfg.activities[0].id)! - 0.6) < 1e-9);
  assert.ok(Math.abs([...two.values()].reduce((a, b) => a + b, 0) - 1) < 1e-9);
});

test("suspens per nota amb obligatòries superades: el motiu esmenta les activitats sense lliurar", async () => {
  const {analyzeUnitResults} = await import("../src/model/unitResults.ts");
  const {summarizeStudent} = await import("../src/model/studentSummary.ts");
  const f = fixture([0, 0, 6, 6]), cfg = f.course.configuration; // A1 i A2 sense lliurar; A3 i A4 (obligatòries) aprovades
  cfg.workUnits[0].activityIds = cfg.activities.slice(0, 4).map(a => a.id);
  cfg.workUnits[0].requiredActivityIds = [cfg.activities[2].id, cfg.activities[3].id];
  cfg.requiredByAverage = true;
  gradeFifth(f, 3);
  const ra = analyzeUnitResults(f.course, f.group, f.id, "Laura Soler")[0].ras[0];
  assert.equal(ra.outcome, "suspes");
  assert.equal(ra.failedRequired, false);
  assert.deepEqual(ra.notDelivered, ["A1", "A2"]);
  assert.match(ra.reason, /sense lliurar que hi compten: A1, A2/);
  const sum = summarizeStudent(f.course, f.group, f.id);
  assert.match(sum.ras[0].causes[0], /activitats sense lliurar que hi compten: A1, A2/);
});

test("aportació de cada tasca a l'RA: la suma coincideix amb la nota acumulada de la graella", async () => {
  const {raContributions} = await import("../src/model/raContributions.ts");
  const {calculateStudent} = await import("../src/model/calculation.ts");
  const f = fixture([9, 4, 7, 0]);
  const cfg = f.course.configuration;
  const [ra] = raContributions(f.course, f.group, f.id);
  const calc = calculateStudent(f.course, f.group, f.id).learningResults.get(ra.raId)!;
  assert.ok(Math.abs(ra.earned - calc.accumulated) < 1e-9, `${ra.earned} vs ${calc.accumulated}`);
  assert.ok(Math.abs(ra.parts.reduce((s, p) => s + p.share, 0) - 1) < 1e-9);
  assert.equal(ra.parts.find(p => p.name === "A2")!.grade, 4);
  assert.equal(ra.parts.find(p => p.name === "A5")!.grade, null); // pendent
  assert.ok(ra.graded < 1 && ra.graded > 0.7);
  void cfg;
});

test("resum: un RA està «avaluat completament» quan la seva UT està tota corregida", async () => {
  const {summarizeStudent} = await import("../src/model/studentSummary.ts");
  const f = fixture([8, 8, 8, 8]), cfg = f.course.configuration;
  cfg.workUnits[0].activityIds = cfg.activities.slice(0, 4).map(a => a.id);
  const done = summarizeStudent(f.course, f.group, f.id).ras[0];
  assert.equal(done.evaluated, true);
  assert.deepEqual(done.units, [cfg.workUnits[0].name]);
  // Si a la UT hi afegim una activitat sense corregir (la 5a), ja no està avaluat completament.
  cfg.workUnits[0].activityIds = cfg.activities.map(a => a.id);
  assert.equal(summarizeStudent(f.course, f.group, f.id).ras[0].evaluated, false);
});
