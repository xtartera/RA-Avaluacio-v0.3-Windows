import assert from "node:assert/strict";
import test from "node:test";
import {calcNotesMarkdown} from "../src/model/calcDoc.ts";
import {createCourse, emptyConfiguration, newId, type Activity} from "../src/model/domain.ts";
import {buildSeguretatCourse} from "../src/model/templates/seguretat0226.ts";
import {buildServeisCourse} from "../src/model/templates/serveis0227.ts";

test("«Com es calcula» de Serveis de xarxa parla d'aquest mòdul i no de SOX", () => {
  const md = calcNotesMarkdown(buildServeisCourse("2026–2027"));
  assert.match(md, /\*\*Serveis de xarxa\*\*/);
  assert.match(md, /Curs acadèmic 2026–2027/);
  assert.match(md, /Grup A · Grup B/);
  assert.match(md, /pesActivitat\s+= pesRA × partDeLActivitatDinsLRA/);
  assert.match(md, /mitjana \*\*ponderada\*\* dels seus CA/);
  assert.match(md, /part decimal ≥ 0,5\s+→\s+enter superior/);
  assert.match(md, /la nota mínima és \*\*4\*\*/);
  assert.match(md, /\| AEA1: Servei de configuració dinàmica \(DHCP\) \| RA1 \| Pt1, Pe1 \|/);
  assert.match(md, /\| RA1 \| 13,5 % \| Prj 40 % · Pt1 30 % · Pe1 30 % \|/);
  assert.match(md, /\| RA7 \| 9 % \| Pt7 100 % \|/);
  assert.match(md, /\*\*Prj\*\* té part de RA1, RA2, RA3, RA4, RA5, RA6, RA8/);
  assert.match(md, /Pes pendent/);
  assert.match(md, /Les UT d'aquest mòdul/);
  assert.match(md, /com AEA9: Projecte integrador.*amb RA1, RA2/);
  for (const bad of ["Speedrun", "PR-Obert", "ExTeòric", "ExPràctic", "curs SOX", "Excel d'origen"]) assert.ok(!md.includes(bad), bad);
  assert.ok(md.includes("\n---\n")); // el peu que separa el cos
});

test("«Com es calcula» de Seguretat informàtica usa el seu llindar 0,75 i el mínim 5", () => {
  const md = calcNotesMarkdown(buildSeguretatCourse("2026–2027"));
  assert.match(md, /\*\*Seguretat informàtica\*\*/);
  assert.match(md, /part decimal ≥ 0,75\s+→\s+enter superior/);
  assert.match(md, /la nota mínima és \*\*5\*\*/);
  assert.match(md, /\| RA2 \| 18 % \| PE2\.1 74 %/);
});

test("«Com es calcula» d'un mòdul per tipus d'activitat mostra els seus tipus i el seu càlcul", () => {
  const course = createCourse("2026–2027", {...emptyConfiguration(), moduleName: "Mòdul de prova", abbreviation: "MP"}, false, ["A"]), cfg = course.configuration;
  const ra = {id: newId("ra"), code: "RA1", description: "Descripció", order: 1, status: "active" as const};
  const cas = [1, 2].map(i => ({id: newId("ca"), learningResultId: ra.id, code: `1.${i}`, description: `CA ${i}`, order: i, status: "active" as const}));
  const types = [{id: newId("t"), name: "Pràctica", weight: .6, status: "active" as const}, {id: newId("t"), name: "Examen", weight: .4, status: "active" as const}];
  const act = (name: string, t: number, order: number): Activity => ({id: newId("a"), name, activityTypeId: types[t].id, term: 1, date: null, order, status: "active", session: "ordinaria", recoversRaIds: []});
  const acts = [act("P1", 0, 1), act("P2", 0, 2), act("E1", 1, 3)];
  Object.assign(cfg, {learningResults: [ra], criteria: cas, activityTypes: types, activities: acts, links: acts.flatMap(a => cas.map(c => ({id: newId("l"), activityId: a.id, criterionId: c.id, allocation: .5}))), workUnits: []});
  const md = calcNotesMarkdown(course);
  assert.match(md, /pesActivitat\s+= pesTipus \/ nombreActivitatsDelTipus/);
  assert.match(md, /mitjana aritmètica \*\*simple\*\*/);
  assert.match(md, /\| Pràctica \| 60 % \| 2 \| 60 % ÷ 2 ≈ \*\*30 %\*\* \|/);
  assert.match(md, /una sola activitat de \*\*Examen\*\*/);
  assert.match(md, /Aquest mòdul encara no té UT configurades/);
  assert.match(md, /part decimal ≥ 0,75/);
});
