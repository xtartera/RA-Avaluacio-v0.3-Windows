import assert from "node:assert/strict";
import test from "node:test";
import {activityIsEvaluated,calculateFinalStudent,calculateStudent,convocatoriaConsumida,convocatoriaExhaurida,finalInteger,groupAsOfTerm,totalGrade} from "../src/model/calculation.ts";
import {createCourse,newEnrollment,newId,nowIso,type Grade} from "../src/model/domain.ts";

function fixture(){
 const course=createCourse("2026–2027"),group=course.groups[0],config=course.configuration;
 const type={id:newId("type"),name:"Projecte",weight:1,status:"active" as const};
 const ra={id:newId("ra"),code:"RA1",description:"RA de prova",order:1,status:"active" as const};
 const ca={id:newId("ca"),learningResultId:ra.id,code:"1.A",description:"CA de prova",order:1,status:"active" as const};
 const activities=Array.from({length:2},(_,i)=>({id:newId("activity"),name:`A${i+1}`,activityTypeId:type.id,term:1 as const,date:null,order:i+1,status:"active" as const,session:"ordinaria" as const,recoversRaIds:[]}));
 config.activityTypes=[type];config.learningResults=[ra];config.criteria=[ca];config.activities=activities;config.links=activities.map(a=>({id:newId("link"),activityId:a.id,criterionId:ca.id,allocation:1}));
 for(let i=0;i<5;i++){const student={id:newId("student"),name:`Alumne ${i+1}`},enrollment=newEnrollment(student.id,group.id);group.students.push(student);group.enrollments.push(enrollment);group.grades.push({id:newId("grade"),enrollmentId:enrollment.id,activityId:activities[0].id,status:"graded",baseValue:8,bonuses:[],updatedAt:nowIso()})}
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
 const bigActivity={id:newId("activity"),name:"Projecte",activityTypeId:bigType.id,term:1 as const,date:null,order:1,status:"active" as const,session:"ordinaria" as const,recoversRaIds:[]};
 const examActivity={id:newId("activity"),name:"Examen",activityTypeId:smallType.id,term:1 as const,date:null,order:2,status:"active" as const,session:"ordinaria" as const,recoversRaIds:[]};
 config.activityTypes=[bigType,smallType];config.learningResults=[ra];config.criteria=[ca];config.activities=[bigActivity,examActivity];
 config.links=[{id:newId("link"),activityId:bigActivity.id,criterionId:ca.id,allocation:1},{id:newId("link"),activityId:examActivity.id,criterionId:ca.id,allocation:1}];
 config.workUnits=[{id:newId("unit"),name:"UT1",activityIds:[examActivity.id],requiredActivityIds:[examActivity.id],learningResultIds:[ra.id],order:1,status:"active"}];
 for(let i=0;i<5;i++){
  const student={id:newId("student"),name:`Alumne ${i+1}`},enrollment=newEnrollment(student.id,group.id);
  group.students.push(student);group.enrollments.push(enrollment);
  group.grades.push({id:newId("grade"),enrollmentId:enrollment.id,activityId:bigActivity.id,status:"graded",baseValue:9,bonuses:[],updatedAt:nowIso()});
  group.grades.push({id:newId("grade"),enrollmentId:enrollment.id,activityId:examActivity.id,status:"graded",baseValue:2,bonuses:[],updatedAt:nowIso()});
 }
 const result=calculateStudent(course,group,group.enrollments[0].id).learningResults.get(ra.id)!;
 assert.equal(result.failingActivities,1);
 assert.equal(result.score>=5,true);
 config.requiredActivityMinGrade=2;
 assert.equal(calculateStudent(course,group,group.enrollments[0].id).learningResults.get(ra.id)!.failingActivities,0);
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
test("groupAsOfTerm només considera les activitats fetes fins a un trimestre, per projectar l'evolució",()=>{
 const course=createCourse("2026–2027"),group=course.groups[0],config=course.configuration;
 const type={id:newId("type"),name:"Projecte",weight:1,status:"active" as const};
 const ra={id:newId("ra"),code:"RA1",description:"RA de prova",order:1,status:"active" as const};
 const ca={id:newId("ca"),learningResultId:ra.id,code:"1.A",description:"CA de prova",order:1,status:"active" as const};
 const act1={id:newId("activity"),name:"T1",activityTypeId:type.id,term:1 as const,date:null,order:1,status:"active" as const,session:"ordinaria" as const,recoversRaIds:[]};
 const act2={id:newId("activity"),name:"T2",activityTypeId:type.id,term:2 as const,date:null,order:2,status:"active" as const,session:"ordinaria" as const,recoversRaIds:[]};
 config.activityTypes=[type];config.learningResults=[ra];config.criteria=[ca];config.activities=[act1,act2];
 config.links=[{id:newId("link"),activityId:act1.id,criterionId:ca.id,allocation:1},{id:newId("link"),activityId:act2.id,criterionId:ca.id,allocation:1}];
 for(let i=0;i<5;i++){
  const student={id:newId("student"),name:`Alumne ${i+1}`},enrollment=newEnrollment(student.id,group.id);
  group.students.push(student);group.enrollments.push(enrollment);
  group.grades.push({id:newId("grade"),enrollmentId:enrollment.id,activityId:act1.id,status:"graded",baseValue:8,bonuses:[],updatedAt:nowIso()});
  group.grades.push({id:newId("grade"),enrollmentId:enrollment.id,activityId:act2.id,status:"graded",baseValue:2,bonuses:[],updatedAt:nowIso()});
 }
 const enrollmentId=group.enrollments[0].id;
 const full=calculateStudent(course,group,enrollmentId);
 assert.equal(full.globalScore,5);
 assert.equal(full.globalCoverage,100);
 const t1Group=groupAsOfTerm(course,group,1);
 const asOfT1=calculateStudent(course,t1Group,enrollmentId);
 assert.equal(asOfT1.globalScore,8);
 assert.equal(asOfT1.globalCoverage,50);
});
test("groupAsOfTerm admet més de dos trimestres (p. ex. per a un curs de tres)",()=>{
 const course=createCourse("2026–2027"),group=course.groups[0],config=course.configuration;
 const type={id:newId("type"),name:"Projecte",weight:1,status:"active" as const};
 const ra={id:newId("ra"),code:"RA1",description:"RA de prova",order:1,status:"active" as const};
 const ca={id:newId("ca"),learningResultId:ra.id,code:"1.A",description:"CA de prova",order:1,status:"active" as const};
 const act1={id:newId("activity"),name:"T1",activityTypeId:type.id,term:1,date:null,order:1,status:"active" as const,session:"ordinaria" as const,recoversRaIds:[]};
 const act2={id:newId("activity"),name:"T2",activityTypeId:type.id,term:2,date:null,order:2,status:"active" as const,session:"ordinaria" as const,recoversRaIds:[]};
 const act3={id:newId("activity"),name:"T3",activityTypeId:type.id,term:3,date:null,order:3,status:"active" as const,session:"ordinaria" as const,recoversRaIds:[]};
 config.activityTypes=[type];config.learningResults=[ra];config.criteria=[ca];config.activities=[act1,act2,act3];
 config.links=[act1,act2,act3].map(a=>({id:newId("link"),activityId:a.id,criterionId:ca.id,allocation:1}));
 const student={id:newId("student"),name:"Alumne 1"},enrollment=newEnrollment(student.id,group.id);
 group.students.push(student);group.enrollments.push(enrollment);
 group.grades.push({id:newId("grade"),enrollmentId:enrollment.id,activityId:act1.id,status:"graded",baseValue:4,bonuses:[],updatedAt:nowIso()});
 group.grades.push({id:newId("grade"),enrollmentId:enrollment.id,activityId:act2.id,status:"graded",baseValue:6,bonuses:[],updatedAt:nowIso()});
 group.grades.push({id:newId("grade"),enrollmentId:enrollment.id,activityId:act3.id,status:"graded",baseValue:10,bonuses:[],updatedAt:nowIso()});
 group.activityStates.push(
  {activityId:act1.id,automaticEvaluatedAt:nowIso(),manualOverride:null},
  {activityId:act2.id,automaticEvaluatedAt:nowIso(),manualOverride:null},
  {activityId:act3.id,automaticEvaluatedAt:nowIso(),manualOverride:null},
 );
 const asOfT2=calculateStudent(course,groupAsOfTerm(course,group,2),enrollment.id);
 assert.equal(asOfT2.globalCoverage,2/3*100);
 const asOfT3=calculateStudent(course,groupAsOfTerm(course,group,3),enrollment.id);
 assert.equal(asOfT3.globalCoverage,100);
});
test("la mitjana ponderada dels CA d'un RA pondera pel pes global de cada CA, a diferència de la simple",()=>{
 const course=createCourse("2026–2027"),group=course.groups[0],config=course.configuration;
 const smallType={id:newId("type"),name:"Petit",weight:.1,status:"active" as const},bigType={id:newId("type"),name:"Gran",weight:.9,status:"active" as const};
 const ra={id:newId("ra"),code:"RA1",description:"RA de prova",order:1,status:"active" as const};
 const caSmall={id:newId("ca"),learningResultId:ra.id,code:"1.A",description:"CA petit",order:1,status:"active" as const};
 const caBig={id:newId("ca"),learningResultId:ra.id,code:"1.B",description:"CA gran",order:2,status:"active" as const};
 const actSmall={id:newId("activity"),name:"Petita",activityTypeId:smallType.id,term:1 as const,date:null,order:1,status:"active" as const,session:"ordinaria" as const,recoversRaIds:[]};
 const actBig={id:newId("activity"),name:"Gran",activityTypeId:bigType.id,term:1 as const,date:null,order:2,status:"active" as const,session:"ordinaria" as const,recoversRaIds:[]};
 config.activityTypes=[smallType,bigType];config.learningResults=[ra];config.criteria=[caSmall,caBig];config.activities=[actSmall,actBig];
 config.links=[{id:newId("link"),activityId:actSmall.id,criterionId:caSmall.id,allocation:1},{id:newId("link"),activityId:actBig.id,criterionId:caBig.id,allocation:1}];
 for(let i=0;i<5;i++){
  const student={id:newId("student"),name:`Alumne ${i+1}`},enrollment=newEnrollment(student.id,group.id);
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
 const presentation={id:newId("activity"),name:"Presentació oral",activityTypeId:presentationType.id,term:1 as const,date:null,order:3,status:"active" as const,session:"ordinaria" as const,recoversRaIds:[]};
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

function finalFixture(){
 const course=createCourse("2026–2027"),group=course.groups[0],config=course.configuration;
 const type1={id:newId("type"),name:"RA1",weight:.5,status:"active" as const};
 const type2={id:newId("type"),name:"RA2",weight:.5,status:"active" as const};
 const ra1={id:newId("ra"),code:"RA1",description:"RA1",order:1,status:"active" as const};
 const ra2={id:newId("ra"),code:"RA2",description:"RA2",order:2,status:"active" as const};
 const ca1={id:newId("ca"),learningResultId:ra1.id,code:"1.A",description:"CA1",order:1,status:"active" as const};
 const ca2={id:newId("ca"),learningResultId:ra2.id,code:"2.A",description:"CA2",order:1,status:"active" as const};
 const act1={id:newId("activity"),name:"Examen RA1",activityTypeId:type1.id,term:1,date:null,order:1,status:"active" as const,session:"ordinaria" as const,recoversRaIds:[]};
 const act2={id:newId("activity"),name:"Examen RA2",activityTypeId:type2.id,term:1,date:null,order:2,status:"active" as const,session:"ordinaria" as const,recoversRaIds:[]};
 config.activityTypes=[type1,type2];config.learningResults=[ra1,ra2];config.criteria=[ca1,ca2];config.activities=[act1,act2];
 config.links=[{id:newId("link"),activityId:act1.id,criterionId:ca1.id,allocation:1},{id:newId("link"),activityId:act2.id,criterionId:ca2.id,allocation:1}];
 const student={id:newId("student"),name:"Alumne 1"},enrollment=newEnrollment(student.id,group.id);
 group.students.push(student);group.enrollments.push(enrollment);
 group.grades.push({id:newId("grade"),enrollmentId:enrollment.id,activityId:act1.id,status:"graded",baseValue:3,bonuses:[],updatedAt:nowIso()});
 group.grades.push({id:newId("grade"),enrollmentId:enrollment.id,activityId:act2.id,status:"graded",baseValue:8,bonuses:[],updatedAt:nowIso()});
 group.activityStates.push({activityId:act1.id,automaticEvaluatedAt:nowIso(),manualOverride:null},{activityId:act2.id,automaticEvaluatedAt:nowIso(),manualOverride:null});
 return {course,group,config,ra1,ra2,act1,act2,enrollment};
}

test("calculateFinalStudent recupera un RA no assolit amb la nota de la seva activitat d'extraordinària, sense capar-la",()=>{
 const {course,group,config,ra1,ra2,act1,enrollment}=finalFixture();
 const recovery={id:newId("activity"),name:"Recuperació RA1",activityTypeId:act1.activityTypeId,term:1,date:null,order:3,status:"active" as const,session:"extraordinaria" as const,recoversRaIds:[ra1.id]};
 config.activities.push(recovery);
 group.grades.push({id:newId("grade"),enrollmentId:enrollment.id,activityId:recovery.id,status:"graded",baseValue:9,bonuses:[],updatedAt:nowIso()});
 const final=calculateFinalStudent(course,group,enrollment.id);
 assert.equal(final.learningResults.get(ra1.id)!.score,9);
 assert.equal(final.learningResults.get(ra1.id)!.achieved,true);
 assert.equal(final.learningResults.get(ra1.id)!.source,"extraordinaria");
 assert.equal(final.learningResults.get(ra2.id)!.source,"ordinaria");
 assert.equal(final.modulePassed,true);
 assert.equal(final.globalScore,8.5);
});

test("calculateFinalStudent manté el resultat d'ordinària si encara no hi ha activitat de recuperació, o no té nota",()=>{
 const {course,group,ra1,ra2,enrollment}=finalFixture();
 const final=calculateFinalStudent(course,group,enrollment.id);
 assert.equal(final.learningResults.get(ra1.id)!.score,3);
 assert.equal(final.learningResults.get(ra1.id)!.achieved,false);
 assert.equal(final.learningResults.get(ra1.id)!.source,"ordinaria");
 assert.equal(final.learningResults.get(ra2.id)!.achieved,true);
 assert.equal(final.modulePassed,false);
});

test("calculateFinalStudent aplica la mateixa nota, sense repartir-la, quan una activitat de recuperació recupera dos RA alhora",()=>{
 const {course,group,config,ra1,ra2,act1,act2,enrollment}=finalFixture();
 const recovery={id:newId("activity"),name:"Recuperació RA1+RA2",activityTypeId:act1.activityTypeId,term:1,date:null,order:3,status:"active" as const,session:"extraordinaria" as const,recoversRaIds:[ra1.id,ra2.id]};
 config.activities.push(recovery);
 group.grades.find(g=>g.activityId===act1.id)!.baseValue=2;
 group.grades.find(g=>g.activityId===act2.id)!.baseValue=3;
 group.grades.push({id:newId("grade"),enrollmentId:enrollment.id,activityId:recovery.id,status:"graded",baseValue:7,bonuses:[],updatedAt:nowIso()});
 const final=calculateFinalStudent(course,group,enrollment.id);
 assert.equal(final.learningResults.get(ra1.id)!.score,7);
 assert.equal(final.learningResults.get(ra2.id)!.score,7);
 assert.equal(final.globalScore,7);
});

test("calculateFinalStudent: la recuperació desbloqueja un RA amb activitat obligatòria suspesa, sense comprovar-la de nou",()=>{
 const course=createCourse("2026–2027"),group=course.groups[0],config=course.configuration;
 const bigType={id:newId("type"),name:"Projectes",weight:.9,status:"active" as const},smallType={id:newId("type"),name:"Examen",weight:.1,status:"active" as const};
 const ra={id:newId("ra"),code:"RA1",description:"RA de prova",order:1,status:"active" as const};
 const ca={id:newId("ca"),learningResultId:ra.id,code:"1.A",description:"CA de prova",order:1,status:"active" as const};
 const bigActivity={id:newId("activity"),name:"Projecte",activityTypeId:bigType.id,term:1 as const,date:null,order:1,status:"active" as const,session:"ordinaria" as const,recoversRaIds:[]};
 const examActivity={id:newId("activity"),name:"Examen",activityTypeId:smallType.id,term:1 as const,date:null,order:2,status:"active" as const,session:"ordinaria" as const,recoversRaIds:[]};
 const recovery={id:newId("activity"),name:"Recuperació RA1",activityTypeId:smallType.id,term:1,date:null,order:3,status:"active" as const,session:"extraordinaria" as const,recoversRaIds:[ra.id]};
 config.activityTypes=[bigType,smallType];config.learningResults=[ra];config.criteria=[ca];config.activities=[bigActivity,examActivity,recovery];
 config.links=[{id:newId("link"),activityId:bigActivity.id,criterionId:ca.id,allocation:1},{id:newId("link"),activityId:examActivity.id,criterionId:ca.id,allocation:1}];
 config.workUnits=[{id:newId("unit"),name:"UT1",activityIds:[examActivity.id],requiredActivityIds:[examActivity.id],learningResultIds:[ra.id],order:1,status:"active"}];
 const student={id:newId("student"),name:"Alumne 1"},enrollment=newEnrollment(student.id,group.id);
 group.students.push(student);group.enrollments.push(enrollment);
 group.grades.push({id:newId("grade"),enrollmentId:enrollment.id,activityId:bigActivity.id,status:"graded",baseValue:9,bonuses:[],updatedAt:nowIso()});
 group.grades.push({id:newId("grade"),enrollmentId:enrollment.id,activityId:examActivity.id,status:"graded",baseValue:2,bonuses:[],updatedAt:nowIso()});
 group.grades.push({id:newId("grade"),enrollmentId:enrollment.id,activityId:recovery.id,status:"graded",baseValue:6,bonuses:[],updatedAt:nowIso()});
 group.activityStates.push({activityId:bigActivity.id,automaticEvaluatedAt:nowIso(),manualOverride:null},{activityId:examActivity.id,automaticEvaluatedAt:nowIso(),manualOverride:null});
 const ordinariaEntry=calculateStudent(course,group,enrollment.id).learningResults.get(ra.id)!;
 assert.equal(ordinariaEntry.score>=5,true);
 assert.equal(ordinariaEntry.failingActivities,1);
 const final=calculateFinalStudent(course,group,enrollment.id);
 assert.equal(final.learningResults.get(ra.id)!.score,6);
 assert.equal(final.learningResults.get(ra.id)!.achieved,true);
 assert.equal(final.modulePassed,true);
});

test("convocatoriaConsumida i convocatoriaExhaurida es deriven del baseline i de si es presenta a l'extraordinària",()=>{
 const {enrollment}=finalFixture();
 assert.equal(convocatoriaConsumida(enrollment),1);
 assert.equal(convocatoriaExhaurida(enrollment),false);
 enrollment.convocatoria.isRepeater=true;
 enrollment.convocatoria.baseline=2;
 assert.equal(convocatoriaConsumida(enrollment),3);
 assert.equal(convocatoriaExhaurida(enrollment),false);
 enrollment.convocatoria.extraordinariaPresented=true;
 assert.equal(convocatoriaConsumida(enrollment),4);
 assert.equal(convocatoriaExhaurida(enrollment),true);
 enrollment.convocatoria.extraordinariaPresented=false;
 assert.equal(convocatoriaConsumida(enrollment),3);
 assert.equal(convocatoriaExhaurida(enrollment),false);
});
