import assert from "node:assert/strict";
import test from "node:test";
import {emptyGroup} from "../src/model/domain.ts";
import {mergeStudentRoster} from "../src/controllers/studentRoster.ts";

test("importar CSV conserva arxivats, baixes i notes en importacions repetides", () => {
 const group=emptyGroup("A");
 mergeStudentRoster(group,["Anna","Biel","Carla"]);
 const anna=group.enrollments[0],biel=group.enrollments[1],carla=group.enrollments[2];
 biel.status="archived";carla.status="withdrawn";
 group.grades.push({id:"g",enrollmentId:biel.id,activityId:"a",status:"graded",baseValue:8,bonuses:[],updatedAt:"before"});
 mergeStudentRoster(group,["Anna","David"]);
 mergeStudentRoster(group,["Anna","David"]);
 assert.equal(group.students.length,4);
 assert.equal(group.enrollments.length,4);
 assert.equal(group.enrollments.find(e=>e.id===biel.id)?.status,"archived");
 assert.equal(group.enrollments.find(e=>e.id===carla.id)?.status,"withdrawn");
 assert.equal(group.enrollments.find(e=>e.id===anna.id)?.status,"active");
 assert.equal(group.grades[0].enrollmentId,biel.id);
 assert.equal(group.grades[0].baseValue,8);
});

test("absència del CSV arxiva sense registrar una baixa formal", () => {
 const group=emptyGroup("A");
 mergeStudentRoster(group,["Anna","Biel"]);
 const id=group.enrollments[1].id;
 mergeStudentRoster(group,["Anna"]);
 assert.equal(group.enrollments.find(e=>e.id===id)?.status,"archived");
 assert.equal(group.students.length,2);
});

test("reimportar un alumne inactiu reutilitza la matrícula sense reactivar-lo", () => {
 const group=emptyGroup("A");
 mergeStudentRoster(group,["Àlex Martí"]);
 const id=group.enrollments[0].id;
 group.enrollments[0].status="archived";
 mergeStudentRoster(group,["Alex Marti"]);
 assert.equal(group.enrollments.length,1);
 assert.equal(group.enrollments[0].id,id);
 assert.equal(group.enrollments[0].status,"archived");
});
