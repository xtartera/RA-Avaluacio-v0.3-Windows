import {useLayoutEffect, useRef, useState} from "react";
import {nowIso, type AcademicCourse, type AppDatabase, type Group} from "../../src/model/domain";

export type Tab="resum"|"cursos"|"alumnes"|"notes"|"inicial"|"activitats"|"activitatsextra"|"graelles"|"extraordinaria"|"analisigrup"|"analisialumne"|"resultatsut"|"conjunt"|"programacio"|"pesosra"|"informes"|"configuracio"|"dades"|"arxivats"|"aparenca"|"ajuda"|"ajudaextra"|"presentacio";
export type Mutate=(fn:(d:AppDatabase)=>void)=>void;
export const normalize=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("ca").replace(/\s+/g," ").trim();
export const TYPE_COLORS=["#3975e8","#795fd7","#b76a12","#0e8fa0","#c2478a","#5b6b8c"];
export const typeColor=(course:AcademicCourse,typeId:string)=>{const i=course.configuration.activityTypes.findIndex(t=>t.id===typeId);return TYPE_COLORS[(i<0?0:i)%TYPE_COLORS.length]};
export function nextYear(s?:string){const m=s?.match(/(\d{4}).*?(\d{4})/);return m?`${+m[1]+1}–${+m[2]+1}`:"2026–2027"}
export function findCourse(d:AppDatabase,id:string){const c=d.courses.find(x=>x.id===id);if(!c)throw Error("Curs no trobat");return c}
export function findGroup(d:AppDatabase,cid:string,gid:string){const g=findCourse(d,cid).groups.find(x=>x.id===gid);if(!g)throw Error("Grup no trobat");return g}
export function activePeople(g:Group){return g.enrollments.filter(e=>e.status==="active").map(enrollment=>({enrollment,student:g.students.find(s=>s.id===enrollment.studentId)!})).filter(x=>x.student)}
export function raShares(cfg:AcademicCourse["configuration"],activityId:string){const sums=new Map<string,number>();for(const l of cfg.links.filter(l=>l.activityId===activityId)){const ca=cfg.criteria.find(c=>c.id===l.criterionId);if(!ca)continue;sums.set(ca.learningResultId,(sums.get(ca.learningResultId)??0)+l.allocation)}return cfg.learningResults.filter(ra=>sums.has(ra.id)).map(ra=>({code:ra.code,pct:sums.get(ra.id)!}))}
export function computeBands(scores:number[]){return[{label:"Insuficient",range:"0–4,9",cls:"fail",count:scores.filter(s=>s<5).length},{label:"Suficient",range:"5–5,9",cls:"b1",count:scores.filter(s=>s>=5&&s<6).length},{label:"Bé",range:"6–6,9",cls:"b2",count:scores.filter(s=>s>=6&&s<7).length},{label:"Notable",range:"7–8,9",cls:"b3",count:scores.filter(s=>s>=7&&s<9).length},{label:"Excel·lent",range:"9–10",cls:"b4",count:scores.filter(s=>s>=9).length}]}
export function syncState(g:Group,aid:string){let s=g.activityStates.find(x=>x.activityId===aid);if(!s){s={activityId:aid,automaticEvaluatedAt:null,manualOverride:null,locked:false};g.activityStates.push(s)}if(g.grades.filter(x=>x.activityId===aid&&x.status!=="pending").length>=5&&!s.automaticEvaluatedAt)s.automaticEvaluatedAt=nowIso()}
export function raStatusReason(x:{score:number;failingActivities:number}):string{if(x.failingActivities>0)return x.failingActivities===1?"Examen suspès":`${x.failingActivities} exàmens suspesos`;return"Mitjana <5"}
export function termOrdinal(n:number):string{return n===1?"1r":n===2?"2n":n===3?"3r":n===4?"4t":`${n}è`}
export function useGridMaxHeight<T extends HTMLElement>(){const ref=useRef<T>(null),[maxH,setMaxH]=useState(480);useLayoutEffect(()=>{const el=ref.current;if(!el)return;const update=()=>setMaxH(Math.max(200,window.innerHeight-el.getBoundingClientRect().top-32));update();window.addEventListener("resize",update);return()=>window.removeEventListener("resize",update)},[]);return{ref,maxH}}
