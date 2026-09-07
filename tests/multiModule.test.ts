import assert from "node:assert/strict";
import test from "node:test";
import {createCourse, groupCoursesByCicle, newId} from "../src/model/domain.ts";

test("cursos de cicles, cursos i mòduls diferents conviuen a la mateixa base de dades sense compartir res", () => {
  const smx2n = createCourse("2026–2027", undefined, false, ["A", "B"]);
  smx2n.configuration.cicle = "SMX"; smx2n.configuration.cicleNivell = "Grau mitjà"; smx2n.configuration.curs = "2n";
  smx2n.configuration.moduleName = "Sistemes Operatius en Xarxa";
  smx2n.configuration.learningResults.push({id: newId("ra"), code: "RA1", description: "RA de SOX", order: 1, status: "active"});

  const smx1r = createCourse("2026–2027", undefined, false, ["1DAW1", "1DAW2", "1DAW3"]);
  smx1r.configuration.cicle = "SMX"; smx1r.configuration.cicleNivell = "Grau mitjà"; smx1r.configuration.curs = "1r";
  smx1r.configuration.moduleName = "Un altre mòdul de 1r SMX";

  const daw = createCourse("2026–2027", undefined, false, ["A", "B"]);
  daw.configuration.cicle = "DAW"; daw.configuration.cicleNivell = "Grau superior"; daw.configuration.curs = "2n";
  daw.configuration.moduleName = "Un mòdul de DAW";

  // Els tres cursos han de ser totalment independents: 3 grups a 1r SMX, cap efecte sobre els altres.
  assert.equal(smx1r.groups.length, 3);
  assert.equal(smx2n.groups.length, 2);
  assert.equal(daw.groups.length, 2);
  assert.equal(smx2n.configuration.learningResults.length, 1);
  assert.equal(smx1r.configuration.learningResults.length, 0, "un mòdul nou no hereta RA d’un altre curs");
  assert.equal(daw.configuration.learningResults.length, 0, "un mòdul nou no hereta RA d’un altre curs");

  const grouped = groupCoursesByCicle([smx2n, smx1r, daw]);
  const labels = grouped.map(([label]) => label);
  assert.deepEqual(labels, [
    "DAW · Grau superior · 2n",
    "SMX · Grau mitjà · 1r",
    "SMX · Grau mitjà · 2n",
  ]);
  assert.deepEqual(grouped.find(([label]) => label === "SMX · Grau mitjà · 1r")![1].map(c => c.id), [smx1r.id]);
  assert.deepEqual(grouped.find(([label]) => label === "DAW · Grau superior · 2n")![1].map(c => c.id), [daw.id]);
});

test("clonar la configuració d’un curs en crea una còpia independent, no una referència compartida", () => {
  const source = createCourse("2025–2026");
  source.configuration.learningResults.push({id: newId("ra"), code: "RA1", description: "Original", order: 1, status: "active"});

  const clone = createCourse("2026–2027", source.configuration);
  clone.configuration.learningResults[0]!.description = "Modificat només al clon";

  assert.equal(source.configuration.learningResults[0]!.description, "Original", "editar el clon no ha de tocar el curs origen");
});
