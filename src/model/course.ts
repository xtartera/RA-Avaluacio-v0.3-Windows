export type GroupId = "A" | "B";
export type Student = { id:number; name:string; scores:number[]; progress:number };
export type LearningResult = { id:string; name:string; color:string; coverage:number };
export type Activity = { name:string; type:string; date:string; average:number; delivered:number; ras:string };

export const learningResults:LearningResult[]=[
 {id:"RA1",name:"Instal·lació de sistemes",color:"#3975e8",coverage:100},
 {id:"RA2",name:"Usuaris i recursos",color:"#6879df",coverage:88},
 {id:"RA3",name:"Administració de dominis",color:"#8a66d6",coverage:72},
 {id:"RA4",name:"Gestió de recursos",color:"#22a486",coverage:54},
 {id:"RA5",name:"Monitoratge del sistema",color:"#df983e",coverage:41},
 {id:"RA6",name:"Integració de sistemes",color:"#df6575",coverage:20},
];
const names=["AQUINO, MATEO EMILIANO","AYADA FANKOUCH, OMAR","BENET BACH, ERIC","BENHADI AKHANNICH, BACHIR","BONICH TORRES, JANA","CABRERA CASASSAS, ERIK","CAMPS SANSALVADOR, JORDI","CORTES ROVIRA, EDURNE","CSONKA, GIULIA ANDREEA","DAGHMOUMI EL ABBADI, DEYAA EDDINE","DOÑO VIDES, MILTON OMAR","EL KADDAOUI EL ALLALI, OSAMA","FERRER SAUS, MARTÍ","GHRIDOU, MAROUANE","HUESCAR CABANAS, DÍDAC","OLMO AGUILAR, URIEL","ORIOL COSTA, POL","PEÑARROYA CAPDEVILA, GENÍS","PUIGVÍ SANGLAS, GIL","PUJOL I LÓPEZ, ADRIÀ","TALLANT YAGÜE, IZAN","TORROELLA ARIMANY, MARTÍ"];
export function createStudents(group:GroupId):Student[]{return Array.from({length:25},(_,i)=>{const seed=i+(group==="B"?19:0);return{id:i+1,name:group==="A"&&names[i]?names[i]:`Alumne ${i+1}`,scores:learningResults.map((_,r)=>Math.max(1,Math.min(10,+(7.25+Math.sin(seed*1.47+r)*1.75-(i%11===0?1.7:0)).toFixed(2)))),progress:40+(seed*13)%58}})}
export const activities:Activity[]=[
 {name:"Projecte 1",type:"Speedrun",date:"18 set. 2026",average:8.35,delivered:24,ras:"RA1"},{name:"Projecte 2",type:"Speedrun",date:"2 oct. 2026",average:7.92,delivered:23,ras:"RA1"},{name:"Examen teòric 1",type:"Síntesi",date:"23 oct. 2026",average:6.18,delivered:25,ras:"RA1 · RA2"},{name:"Projecte 21",type:"Projecte obert",date:"20 nov. 2026",average:7.44,delivered:22,ras:"RA2 · RA3"},{name:"Projecte 31",type:"Speedrun",date:"15 gen. 2027",average:8.71,delivered:24,ras:"RA3 · RA4"},{name:"Examen pràctic 30",type:"Síntesi",date:"5 feb. 2027",average:5.84,delivered:25,ras:"RA3 · RA5"}];
