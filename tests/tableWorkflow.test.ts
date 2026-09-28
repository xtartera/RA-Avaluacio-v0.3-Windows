import assert from "node:assert/strict";
import test from "node:test";
import {compareValues, undoGrade, activityStorageKey} from "../app/lib/tableWorkflow.ts";
import {createCourse, type AppDatabase, type Grade} from "../src/model/domain.ts";

test("l’ordenació manté sense evidències al final i distingeix el zero", () => {
 for (const direction of ["asc", "desc"] as const) {
  const values = [null, 7, 0, 5].sort((a,b) => compareValues(a,b,direction));
  assert.deepEqual(values, direction === "asc" ? [0,5,7,null] : [7,5,0,null]);
 }
 assert.ok(compareValues("Alumne 2", "Alumne 10", "asc") < 0);
});

test("desfer una primera nota restaura l’estat automàtic i conserva l’historial", () => {
 const course = createCourse("2026–2027"), group = course.groups[0];
 const db: AppDatabase = {schemaVersion:1,courses:[course],gradeHistory:[]};
 const grade: Grade = {id:"g",enrollmentId:"e",activityId:"a",status:"graded",baseValue:7,bonuses:[],updatedAt:"now"};
 group.grades.push(grade);
 group.activityStates.push({activityId:"a",automaticEvaluatedAt:"now",manualOverride:null,locked:false});
 assert.equal(undoGrade(db,group,{gradeId:"g",activityId:"a",previous:null,activityState:null}),true);
 assert.equal(group.grades.length,0);
 assert.equal(group.activityStates.length,0);
 assert.deepEqual(db.gradeHistory[0].previous,grade);
 assert.equal(db.gradeHistory[0].next,null);
});

test("desfer no presentat recupera la nota, les bonificacions i l’estat manual", () => {
 const course=createCourse("2026–2027"),group=course.groups[0];
 const db:AppDatabase={schemaVersion:1,courses:[course],gradeHistory:[]};
 const previous:Grade={id:"g",enrollmentId:"e",activityId:"a",status:"graded",baseValue:8,bonuses:[{id:"b",value:.5,reason:"Treball extra",source:"manual",createdAt:"before"}],updatedAt:"before"};
 group.grades.push({...previous,status:"not_presented",baseValue:null});
 const state={activityId:"a",automaticEvaluatedAt:null,manualOverride:"pending" as const,locked:false};
 undoGrade(db,group,{gradeId:"g",activityId:"a",previous,activityState:state});
 assert.deepEqual(group.grades[0],previous);
 assert.deepEqual(group.activityStates[0],state);
 assert.notEqual(group.grades[0],previous);
});

test("la selecció d’activitat queda aïllada per curs i grup", () => {
 assert.notEqual(activityStorageKey("c1","A"),activityStorageKey("c1","B"));
 assert.notEqual(activityStorageKey("c1","A"),activityStorageKey("c2","A"));
});
