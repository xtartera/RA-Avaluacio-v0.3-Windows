import assert from "node:assert/strict";
import {test} from "node:test";
import {moduleComment} from "../src/model/moduleComment.ts";
import {summarizeStudent, type StudentSummary} from "../src/model/studentSummary.ts";
import {jointTrendSentence, studentTrend, trendOfScores, trendSentence} from "../src/model/trend.ts";
import {buildServeisCourse} from "../src/model/templates/serveis0227.ts";
import {newEnrollment, newId, nowIso, type AcademicCourse, type Grade} from "../src/model/domain.ts";

test("l'evolució compara les últimes activitats amb les anteriors i necessita almenys 4 notes", () => {
  assert.equal(trendOfScores([5, 6, 7]), null);
  const up = trendOfScores([4, 5, 4, 7, 8, 9])!;
  assert.equal(up.direction, "puja"); assert.equal(up.level, "alt"); assert.ok(up.delta > 2);
  const down = trendOfScores([8, 8, 7, 5, 4, 3])!;
  assert.equal(down.direction, "baixa"); assert.equal(down.level, "baix");
  const flat = trendOfScores([6, 6.5, 6, 6.4, 6.2])!;
  assert.equal(flat.direction, "estable"); assert.equal(flat.level, "mitja");
  assert.equal(trendOfScores([5, 6, 5, 6])!.n, 4);
});

test("si l'evolució és positiva ho celebra; si baixa, reforça l'esforç i les ganes sense dramatitzar", () => {
  const up = trendSentence(trendOfScores([4, 5, 4, 7, 8, 9]));
  assert.match(up, /evolució és molt positiva/); assert.match(up, /l'esforç dona fruits/);
  const down = trendSentence(trendOfScores([8, 8, 7, 5, 4, 3]));
  assert.match(down, /es pot revertir/); assert.match(down, /esforç, constància i ganes de millorar/);
  assert.doesNotMatch(down, /fracàs|desastre|greu/i);
  const slight = trendSentence(trendOfScores([9, 9, 9, 8, 7.5, 7.5]));
  assert.match(slight, /lleugera baixada/); assert.match(slight, /continuen sent bons/);
  assert.match(trendSentence(trendOfScores([3, 3.5, 3, 3.2, 3.4])), /per sota del mínim, però encara hi ha temps/);
  assert.match(trendSentence(trendOfScores([8, 8.5, 8, 8.2, 8.4])), /regularitat/);
  assert.equal(trendSentence(null), "");
});

test("el comentari del mòdul afegeix l'evolució només si hi ha prou activitats i no és provisional", () => {
  const base: StudentSummary = {projected: 7.2, coverage: 60, provisional: false, status: "superat", causes: [], ras: [], requiredFailed: []};
  const without = moduleComment(base);
  assert.doesNotMatch(without, /evolució|baixat/);
  const withUp = moduleComment({...base, trend: trendOfScores([4, 5, 4, 7, 8, 9])});
  assert.ok(withUp.startsWith(without));
  assert.match(withUp, /evolució és molt positiva/);
  assert.match(moduleComment({...base, trend: trendOfScores([8, 8, 7, 4, 3, 3])}), /es pot revertir/);
  assert.doesNotMatch(moduleComment({...base, provisional: true, trend: trendOfScores([8, 8, 7, 4, 3, 3])}), /es pot revertir/);
});

test("el comentari conjunt resumeix l'evolució per mòduls", () => {
  const up = trendOfScores([4, 5, 4, 7, 8, 9]), down = trendOfScores([8, 8, 7, 4, 3, 3]), flat = trendOfScores([6, 6.5, 6, 6.4, 6.2]);
  assert.match(jointTrendSentence([{abbreviation: "SI", trend: up}, {abbreviation: "SX", trend: up}]), /evolució és positiva en tots els mòduls/);
  assert.match(jointTrendSentence([{abbreviation: "SI", trend: up}, {abbreviation: "SOX", trend: down}]), /positiva a SI; a SOX els últims resultats han baixat.*esforç i ganes/);
  assert.match(jointTrendSentence([{abbreviation: "SI", trend: down}, {abbreviation: "SX", trend: flat}]), /A SI els últims resultats han baixat.*es pot revertir/);
  assert.match(jointTrendSentence([{abbreviation: "SI", trend: flat}]), /es mantenen estables/);
  assert.equal(jointTrendSentence([{abbreviation: "SI", trend: null}]), "");
});

function course(): AcademicCourse {
  const c = buildServeisCourse("2026-27");
  const g = c.groups[0], ord = c.configuration.activities.filter(a => a.session === "ordinaria");
  for (const a of ord) g.activityStates.push({activityId: a.id, automaticEvaluatedAt: null, manualOverride: "evaluated", locked: false});
  const add = (name: string, scoreAt: (i: number) => number) => {
    const s = {id: newId("s"), name}; g.students.push(s);
    const e = newEnrollment(s.id, g.id); g.enrollments.push(e);
    ord.forEach((a, i) => g.grades.push({id: newId("g"), enrollmentId: e.id, activityId: a.id, status: "graded", baseValue: scoreAt(i), bonuses: [], updatedAt: nowIso()} as Grade));
    return e.id;
  };
  (c as unknown as {ids: Record<string, string>}).ids = {
    puja: add("Puja", i => 3 + (i * 6) / ord.length), baixa: add("Baixa", i => 9 - (i * 6) / ord.length)
  };
  return c;
}

test("l'evolució surt de les activitats avaluades en ordre i canvia quan hi ha notes noves", () => {
  const c = course(), ids = (c as unknown as {ids: Record<string, string>}).ids, g = c.groups[0];
  assert.equal(studentTrend(c, g, ids.puja)!.direction, "puja");
  assert.equal(studentTrend(c, g, ids.baixa)!.direction, "baixa");
  assert.equal(summarizeStudent(c, g, ids.puja).trend!.direction, "puja");
  assert.match(moduleComment(summarizeStudent(c, g, ids.baixa)), /es pot revertir|lleugera baixada/);
  // L'alumne que baixava recupera les últimes activitats: la tendència passa a ser positiva, i el comentari canvia sol.
  const ord = c.configuration.activities.filter(a => a.session === "ordinaria");
  for (const a of ord.slice(-4)) g.grades.find(x => x.enrollmentId === ids.baixa && x.activityId === a.id)!.baseValue = 9;
  assert.equal(studentTrend(c, g, ids.baixa)!.direction, "puja");
  assert.match(moduleComment(summarizeStudent(c, g, ids.baixa)), /evolució és molt positiva/);
});
