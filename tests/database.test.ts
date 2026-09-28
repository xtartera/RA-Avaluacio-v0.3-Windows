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

function oldShapedDatabaseWithActivityAndEnrollment(): unknown {
 return {
  schemaVersion: 1,
  gradeHistory: [],
  courses: [{
   id: "course1", academicYear: "2026–2027", active: true, archived: false, isTest: false,
   configuration: {
    moduleName: "SOX", abbreviation: "SOX", level: "2n SMX",
    learningResults: [], criteria: [], activityTypes: [],
    activities: [{id: "act1", name: "Examen", activityTypeId: "type1", term: 1, date: null, order: 1, status: "active"}],
    links: [],
   },
   groups: [{
    id: "group1", code: "A", name: "Grup A", capacity: 25,
    enrollments: [{id: "enr1", studentId: "student1", groupId: "group1", status: "active", createdAt: ""}],
    students: [], grades: [], activityStates: [], comments: [],
   }],
   imports: [], createdAt: "", updatedAt: "",
  }],
 };
}

test("migrateDatabase afegeix session i recoversRaIds a les activitats, i convocatoria a les matrícules, que no en tenen (dades desades abans de la convocatòria extraordinària)", () => {
 const migrated = migrateDatabase(oldShapedDatabaseWithActivityAndEnrollment() as AppDatabase);
 const activity = migrated.courses[0]!.configuration.activities[0]!;
 assert.equal(activity.session, "ordinaria");
 assert.deepEqual(activity.recoversRaIds, []);
 const enrollment = migrated.courses[0]!.groups[0]!.enrollments[0]!;
 assert.deepEqual(enrollment.convocatoria, {isRepeater: false, baseline: 0, extraordinariaPresented: null});
});

function oldShapedDatabaseWithActivityState(): unknown {
 return {
  schemaVersion: 1,
  gradeHistory: [],
  courses: [{
   id: "course1", academicYear: "2026–2027", active: true, archived: false, isTest: false,
   configuration: {
    moduleName: "SOX", abbreviation: "SOX", level: "2n SMX",
    learningResults: [], criteria: [], activityTypes: [],
    activities: [{id: "act1", name: "Examen", activityTypeId: "type1", term: 1, date: null, order: 1, status: "active", session: "ordinaria", recoversRaIds: []}],
    links: [],
   },
   groups: [{
    id: "group1", code: "A", name: "Grup A", capacity: 25,
    enrollments: [], students: [], grades: [], comments: [],
    activityStates: [{activityId: "act1", automaticEvaluatedAt: null, manualOverride: null}],
   }],
   imports: [], createdAt: "", updatedAt: "",
  }],
 };
}

test("migrateDatabase afegeix locked:false als estats d'activitat que no en tenen (dades desades abans del bloqueig d'activitats)", () => {
 const migrated = migrateDatabase(oldShapedDatabaseWithActivityState() as AppDatabase);
 assert.equal(migrated.courses[0]!.groups[0]!.activityStates[0]!.locked, false);
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
