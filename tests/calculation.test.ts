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
test("el llindar d'arrodoniment és configurable",()=>{assert.equal(finalInteger(6.49,.5),6);assert.equal(finalInteger(6.5,.5),7);assert.equal(finalInteger(6.74,.5),7);assert.equal(finalInteger(6.74,.75),6)});
test("una UT bloqueja el RA vinculat encara que la nota calculada surti aprovada",()=>{
 const course=createCourse("2026–2027"),group=course.groups[0],config=course.configuration;
 const bigType={id:newId("type"),name:"Projectes",weight:.9,status:"active" as const},smallType={id:newId("type"),name:"Examen",weight:.1,status:"active" as const};
 const ra={id:newId("ra"),code:"RA1",description:"RA de prova",order:1,status:"active" as const};
 const ca={id:newId("ca"),learningResultId:ra.id,code:"1.A",description:"CA de prova",order:1,status:"active" as const};
 const bigActivity={id:newId("activity"),name:"Projecte",activityTypeId:bigType.id,term:1 as const,date:null,order:1,status:"active" as const};
 const examActivity={id:newId("activity"),name:"Examen",activityTypeId:smallType.id,term:1 as const,date:null,order:2,status:"active" as const};
 config.activityTypes=[bigType,smallType];config.learningResults=[ra];config.criteria=[ca];config.activities=[bigActivity,examActivity];
 config.links=[{id:newId("link"),activityId:bigActivity.id,criterionId:ca.id,allocation:1},{id:newId("link"),activityId:examActivity.id,criterionId:ca.id,allocation:1}];
 config.workUnits=[{id:newId("unit"),name:"UT1",activityIds:[examActivity.id],requiredActivityIds:[examActivity.id],learningResultIds:[ra.id],order:1,status:"active"}];
 for(let i=0;i<5;i++){
  const student={id:newId("student"),name:`Alumne ${i+1}`},enrollment={id:newId("enrollment"),studentId:student.id,groupId:group.id,status:"active" as const,createdAt:nowIso()};
  group.students.push(student);group.enrollments.push(enrollment);
  group.grades.push({id:newId("grade"),enrollmentId:enrollment.id,activityId:bigActivity.id,status:"graded",baseValue:9,bonuses:[],updatedAt:nowIso()});
  group.grades.push({id:newId("grade"),enrollmentId:enrollment.id,activityId:examActivity.id,status:"graded",baseValue:2,bonuses:[],updatedAt:nowIso()});
 }
 const result=calculateStudent(course,group,group.enrollments[0].id).learningResults.get(ra.id)!;
 assert.equal(result.failingActivities,1);
 assert.equal(result.score>=5,true);
});
test("una UT arxivada, o un examen encara no qualificat, no bloqueja el RA",()=>{
 const {course,group,activities}=fixture(),ra=course.configuration.learningResults[0];
 course.configuration.workUnits=[{id:newId("unit"),name:"UT1",activityIds:[activities[1].id],requiredActivityIds:[activities[1].id],learningResultIds:[ra.id],order:1,status:"active"}];
 assert.equal(calculateStudent(course,group,group.enrollments[0].id).learningResults.get(ra.id)!.failingActivities,0);
 course.configuration.workUnits[0].requiredActivityIds=[activities[0].id];
 course.configuration.workUnits[0].status="archived";
 const failing=group.enrollments[0].id;
 group.grades.find(g=>g.enrollmentId===failing&&g.activityId===activities[0].id)!.baseValue=2;
 assert.equal(calculateStudent(course,group,failing).learningResults.get(ra.id)!.failingActivities,0);
});
test("la mitjana ponderada dels CA d'un RA pondera pel pes global de cada CA, a diferència de la simple",()=>{
 const course=createCourse("2026–2027"),group=course.groups[0],config=course.configuration;
 const smallType={id:newId("type"),name:"Petit",weight:.1,status:"active" as const},bigType={id:newId("type"),name:"Gran",weight:.9,status:"active" as const};
 const ra={id:newId("ra"),code:"RA1",description:"RA de prova",order:1,status:"active" as const};
 const caSmall={id:newId("ca"),learningResultId:ra.id,code:"1.A",description:"CA petit",order:1,status:"active" as const};
 const caBig={id:newId("ca"),learningResultId:ra.id,code:"1.B",description:"CA gran",order:2,status:"active" as const};
 const actSmall={id:newId("activity"),name:"Petita",activityTypeId:smallType.id,term:1 as const,date:null,order:1,status:"active" as const};
 const actBig={id:newId("activity"),name:"Gran",activityTypeId:bigType.id,term:1 as const,date:null,order:2,status:"active" as const};
 config.activityTypes=[smallType,bigType];config.learningResults=[ra];config.criteria=[caSmall,caBig];config.activities=[actSmall,actBig];
 config.links=[{id:newId("link"),activityId:actSmall.id,criterionId:caSmall.id,allocation:1},{id:newId("link"),activityId:actBig.id,criterionId:caBig.id,allocation:1}];
 for(let i=0;i<5;i++){
  const student={id:newId("student"),name:`Alumne ${i+1}`},enrollment={id:newId("enrollment"),studentId:student.id,groupId:group.id,status:"active" as const,createdAt:nowIso()};
  group.students.push(student);group.enrollments.push(enrollment);
  group.grades.push({id:newId("grade"),enrollmentId:enrollment.id,activityId:actSmall.id,status:"graded",baseValue:9,bonuses:[],updatedAt:nowIso()});
  group.grades.push({id:newId("grade"),enrollmentId:enrollment.id,activityId:actBig.id,status:"graded",baseValue:3,bonuses:[],updatedAt:nowIso()});
 }
 const enrollmentId=group.enrollments[0].id;
 config.raAveraging="simple";
 assert.equal(calculateStudent(course,group,enrollmentId).learningResults.get(ra.id)!.score,6);
 config.raAveraging="weighted";
 assert.equal(calculateStudent(course,group,enrollmentId).learningResults.get(ra.id)!.score,3.6);
});
test("un tipus d'activitat amb pes 0% pot ser obligatori d'una UT sense afectar la nota del RA",()=>{
 const {course,group,activities}=fixture(),ra=course.configuration.learningResults[0];
 const presentationType={id:newId("type"),name:"Presentació",weight:0,status:"active" as const};
 const presentation={id:newId("activity"),name:"Presentació oral",activityTypeId:presentationType.id,term:1 as const,date:null,order:3,status:"active" as const};
 course.configuration.activityTypes.push(presentationType);
 course.configuration.activities.push(presentation);
 course.configuration.workUnits=[{id:newId("unit"),name:"UT presentació",activityIds:[presentation.id],requiredActivityIds:[presentation.id],learningResultIds:[ra.id],order:1,status:"active"}];
 const enrollmentId=group.enrollments[0].id;
 const before=calculateStudent(course,group,enrollmentId).learningResults.get(ra.id)!;
 assert.equal(before.score,8);
 assert.equal(before.failingActivities,0);
 group.grades.push({id:newId("grade"),enrollmentId,activityId:presentation.id,status:"not_presented",baseValue:null,bonuses:[],updatedAt:nowIso()});
 const after=calculateStudent(course,group,enrollmentId).learningResults.get(ra.id)!;
 assert.equal(after.score,8);
 assert.equal(after.failingActivities,1);
});
