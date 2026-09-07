import assert from "node:assert/strict";
import test from "node:test";
import {validateBackup} from "../src/controllers/database.ts";
import {createCourse, migrateDatabase, type AppDatabase} from "../src/model/domain.ts";

function oldShapedDatabase(): unknown {
 return {
  schemaVersion: 1,
  gradeHistory: [],
  courses: [{
   id: "course1", academicYear: "2026–2027", active: true, archived: false, isTest: false,
   configuration: {moduleName: "SOX", abbreviation: "SOX", level: "2n SMX", learningResults: [], criteria: [], activityTypes: [], activities: [], links: []},
   groups: [], imports: [], createdAt: "", updatedAt: "",
  }],
 };
}

test("migrateDatabase afegeix workUnits, raAveraging, roundingThreshold i requiredActivityMinGrade als cursos que no en tenen (dades desades abans d'aquests camps)", () => {
 const migrated = migrateDatabase(oldShapedDatabase() as AppDatabase);
 assert.deepEqual(migrated.courses[0]!.configuration.workUnits, []);
 assert.equal(migrated.courses[0]!.configuration.raAveraging, "simple");
 assert.equal(migrated.courses[0]!.configuration.roundingThreshold, .75);
 assert.equal(migrated.courses[0]!.configuration.requiredActivityMinGrade, 5);
});

test("validateBackup migra automàticament una còpia JSON antiga sense workUnits, raAveraging, roundingThreshold ni requiredActivityMinGrade", () => {
 const restored = validateBackup(oldShapedDatabase());
 assert.deepEqual(restored.courses[0]!.configuration.workUnits, []);
 assert.equal(restored.courses[0]!.configuration.raAveraging, "simple");
 assert.equal(restored.courses[0]!.configuration.roundingThreshold, .75);
 assert.equal(restored.courses[0]!.configuration.requiredActivityMinGrade, 5);
});

test("migrateDatabase afegeix cicle, cicleNivell i curs als cursos que no en tenen (dades desades abans d'aquests camps)", () => {
 const migrated = migrateDatabase(oldShapedDatabase() as AppDatabase);
 assert.equal(migrated.courses[0]!.configuration.cicle, "SMX");
 assert.equal(migrated.courses[0]!.configuration.cicleNivell, "Grau mitjà");
 assert.equal(migrated.courses[0]!.configuration.curs, "2n");
});

test("migrateDatabase afegeix termCount als cursos que no en tenen (dades desades abans d'aquest camp)", () => {
 const migrated = migrateDatabase(oldShapedDatabase() as AppDatabase);
 assert.equal(migrated.courses[0]!.configuration.termCount, 2);
});

test("createCourse sense indicar grups en crea dos (A i B), per compatibilitat amb cursos existents", () => {
 const course = createCourse("2026–2027");
 assert.deepEqual(course.groups.map(g => g.code), ["A", "B"]);
});

test("createCourse admet un nombre de grups diferent de dos, amb noms lliures", () => {
 const course = createCourse("2026–2027", undefined, false, ["1DAW1", "1DAW2", "1DAW3"]);
 assert.deepEqual(course.groups.map(g => g.code), ["1DAW1", "1DAW2", "1DAW3"]);
 assert.equal(course.groups[0]!.name, "Grup 1DAW1");
});
