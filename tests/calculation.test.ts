import assert from "node:assert/strict";
import test from "node:test";
import {activityIsEvaluated,calculateStudent,finalInteger,totalGrade} from "../src/model/calculation.ts";
import {createCourse,newId,nowIso,type Grade} from "../src/model/domain.ts";

function fixture(){
 const course=createCourse("2026–2027"),group=course.groups[0],config=course.configuration;
 const type={id:newId("type"),name:"Projecte",weight:1,status:"active" as const};
 const ra={id:newId("ra"),code:"RA1",description:"RA de prova",order:1,status:"active" as const};
 const ca={id:newId("ca"),learningResultId:ra.id,code:"1.A",description:"CA de prova",order:1,status:"active" as const};
 const activities=Array.from({length:2},(_,i)=>({id:newId("activity"),name:`A${i+1}`,activityTypeId:type.id,term:1 as const,date:null,order:i+1,status:"active" as const}));
 config.activityTypes=[type];config.learningResults=[ra];config.criteria=[ca];config.activities=activities;config.links=activities.map(a=>({id:newId("link"),activityId:a.id,criterionId:ca.id,allocation:1}));
 for(let i=0;i<5;i++){const student={id:newId("student"),name:`Alumne ${i+1}`},enrollment={id:newId("enrollment"),studentId:student.id,groupId:group.id,status:"active" as const,createdAt:nowIso()};group.students.push(student);group.enrollments.push(enrollment);group.grades.push({id:newId("grade"),enrollmentId:enrollment.id,activityId:activities[0].id,status:"graded",baseValue:8,bonuses:[],updatedAt:nowIso()})}
 return {course,group,activities};
}

test("una activitat s'avalua a partir de cinc qualificacions",()=>{const {group,activities}=fixture();assert.equal(activityIsEvaluated(group,activities[0].id),true);assert.equal(activityIsEvaluated(group,activities[1].id),false)});
test("la projecció normalitza només el pes ja avaluat",()=>{const {course,group}=fixture();const result=calculateStudent(course,group,group.enrollments[0].id);assert.equal(result.globalScore,8);assert.equal(result.globalCoverage,50)});
test("no presentat val zero i els extres poden superar deu",()=>{const grade={id:"g",enrollmentId:"e",activityId:"a",updatedAt:nowIso(),bonuses:[],status:"not_presented",baseValue:null} as Grade;assert.equal(totalGrade(grade),0);grade.status="graded";grade.baseValue=10;grade.bonuses=[{id:"b",value:1,reason:"Participació",source:"manual",createdAt:nowIso()}];assert.equal(totalGrade(grade),11)});
test("l'informe arrodoneix a l'alça només des de 0,75",()=>{assert.equal(finalInteger(6.74),6);assert.equal(finalInteger(6.75),7);assert.equal(finalInteger(10.2),10)});
