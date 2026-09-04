import assert from "node:assert/strict";
import test from "node:test";
import {validateBackup} from "../src/controllers/database.ts";
import {migrateDatabase, type AppDatabase} from "../src/model/domain.ts";

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

test("migrateDatabase afegeix workUnits, raAveraging i roundingThreshold als cursos que no en tenen (dades desades abans d'aquests camps)", () => {
 const migrated = migrateDatabase(oldShapedDatabase() as AppDatabase);
 assert.deepEqual(migrated.courses[0]!.configuration.workUnits, []);
 assert.equal(migrated.courses[0]!.configuration.raAveraging, "simple");
 assert.equal(migrated.courses[0]!.configuration.roundingThreshold, .75);
});

test("validateBackup migra automàticament una còpia JSON antiga sense workUnits, raAveraging ni roundingThreshold", () => {
 const restored = validateBackup(oldShapedDatabase());
 assert.deepEqual(restored.courses[0]!.configuration.workUnits, []);
 assert.equal(restored.courses[0]!.configuration.raAveraging, "simple");
 assert.equal(restored.courses[0]!.configuration.roundingThreshold, .75);
});
