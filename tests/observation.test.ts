import assert from "node:assert/strict";
import test from "node:test";
import {concludeObservation, hasObservation, levelToTen, observationAverage, summarizeGroupObservation, supportActions, OBSERVATION_ITEMS} from "../src/model/observation.ts";
import {createCourse, migrateDatabase, type AppDatabase, type InitialObservation} from "../src/model/domain.ts";

const obs = (levels: InitialObservation["levels"], factors: InitialObservation["factors"] = [], id = "e1"): InitialObservation => ({enrollmentId: id, levels, factors, updatedAt: "2026-10-12T10:00:00.000Z"});

test("ítems: sis, sense diagnòstics, i la comunicació val per qualsevol canal", () => {
  assert.deepEqual(OBSERVATION_ITEMS.map(i => i.key), ["autonomia", "entorn", "errors", "organitzacio", "implicacio", "comunicacio"]);
  assert.match(OBSERVATION_ITEMS.find(i => i.key === "comunicacio")!.hint, /oral, escrit, amb esquemes/);
  assert.doesNotMatch(JSON.stringify(OBSERVATION_ITEMS), /atenci[óo]|tdah/i);
});

test("equivalència amb la gradació 1-4-7-10 i mitjana d'ítems observats", () => {
  assert.deepEqual(([1, 2, 3, 4] as const).map(levelToTen), [1, 4, 7, 10]);
  assert.equal(observationAverage(obs({autonomia: 4, entorn: 2})), 3);
  assert.equal(observationAverage(obs({})), null);
  assert.equal(hasObservation(obs({})), false);
});

test("conclusions: destaca, adequat, cal acompanyar i sense observar", () => {
  const c = concludeObservation(obs({autonomia: 4, entorn: 3, errors: 1, organitzacio: 2}), "Agramunt, Xavier");
  assert.equal(c.sentences[0], "A l'observació a l'aula, Xavier destaca en autonomia.");
  assert.equal(c.sentences[1], "Mostra un nivell adequat en maneig de l'entorn.");
  assert.equal(c.sentences[2], "Cal acompanyar resolució d'errors i organització del treball.");
  assert.equal(c.sentences[3], "Sense observar: implicació en la tasca i comunicació tècnica.");
  assert.equal(c.caution, null);
  assert.deepEqual([c.observed, c.total], [4, 6]);
});

test("amb factor de llengua, la comunicació no es comenta com a punt feble i no se'n revela el motiu", () => {
  const c = concludeObservation(obs({autonomia: 3, comunicacio: 1}, ["llengua"]), "Doe, Kelvin");
  const text = c.sentences.join(" ");
  assert.doesNotMatch(text, /Cal acompanyar comunicació/);
  assert.match(text, /La comunicació tècnica es valora tenint en compte el context de l'alumne\./);
  assert.equal(c.caution, "Aquesta observació s'ha d'interpretar tenint en compte el context de l'alumne.");
  assert.doesNotMatch(JSON.stringify(c), /llengua|nouvingut|oral/i);
  // Un altre ítem feble sí que es comenta, també amb factors.
  assert.match(concludeObservation(obs({errors: 1, comunicacio: 1}, ["oral"]), "A").sentences.join(" "), /Cal acompanyar resolució d'errors\./);
});

test("sense dades no genera cap frase", () => {
  assert.deepEqual(concludeObservation(undefined, "X").sentences, []);
  assert.deepEqual(concludeObservation(obs({}), "X").sentences, []);
});

test("resum de grup: mitjana per ítem només amb els alumnes valorats", () => {
  const s = summarizeGroupObservation([obs({autonomia: 4, entorn: 2}, [], "a"), obs({autonomia: 2}, [], "b"), obs({}, [], "c")], 15);
  assert.deepEqual([s.count, s.total], [2, 15]);
  assert.deepEqual(s.items.find(i => i.key === "autonomia"), {key: "autonomia", label: "Autonomia", average: 3, observed: 2});
  assert.equal(s.items.find(i => i.key === "errors")!.average, null);
});

test("una base de dades antiga es migra amb la llista d'observacions buida", () => {
  const course = createCourse("2026–2027");
  for (const g of course.groups) delete (g as Partial<typeof g>).observations;
  const db: AppDatabase = {schemaVersion: 1, courses: [course], gradeHistory: []};
  migrateDatabase(db);
  assert.ok(course.groups.every(g => Array.isArray(g.observations) && g.observations.length === 0));
});

test("orientacions d'acompanyament: segons els factors, sense anomenar-los ni repetir-se", () => {
  assert.deepEqual(supportActions(undefined), []);
  assert.deepEqual(supportActions(obs({autonomia: 3}, [])), []);
  const actions = supportActions(obs({autonomia: 3}, ["llengua", "oral", "ritme", "llengua"]));
  assert.equal(actions.length, new Set(actions).size);
  assert.ok(actions.length >= 6);
  assert.ok(actions.every(a => !/llengua|nouvingut|TDAH|inhibit/i.test(a)));
});
