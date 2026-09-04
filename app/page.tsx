import {useEffect, useState, type ReactNode} from "react";
import {BookOpen,ClipboardCheck,FolderClock,GraduationCap,HelpCircle,Layers,LayoutDashboard,Plus,Printer,Save,Settings2,Table2,Users,X} from "lucide-react";
import {createCourse, type AppDatabase} from "../src/model/domain";
import {IndexedDbRepository} from "../src/model/repository";
import {activePeople, nextYear, type Mutate, type Tab} from "./lib/helpers";
import {Welcome} from "./screens/Welcome";
import {Dashboard} from "./screens/Dashboard";
import {Courses} from "./screens/Courses";
import {Students} from "./screens/Students";
import {Grades} from "./screens/Grades";
import {Activities} from "./screens/Activities";
import {Grids} from "./screens/Grids";
import {Config} from "./screens/Config";
import {Data} from "./screens/Data";
import {Archived} from "./screens/Archived";
import {Help} from "./screens/Help";
import {StudentReport} from "./screens/StudentReport";

const repo=new IndexedDbRepository(),EMPTY:AppDatabase={schemaVersion:1,courses:[],gradeHistory:[]};
export default function Home(){
 const[db,setDb]=useState<AppDatabase>(EMPTY),[loaded,setLoaded]=useState(false),[tab,setTab]=useState<Tab>("resum"),[groupCode,setGroupCode]=useState<"A"|"B">("A"),[report,setReport]=useState<string|null>(null),[message,setMessage]=useState(""),[focusActivity,setFocusActivity]=useState<string|null>(null);
 useEffect(()=>{repo.load().then(setDb).catch(e=>setMessage(String(e))).finally(()=>setLoaded(true))},[]);
 useEffect(()=>{if(loaded)repo.save(db).catch(e=>setMessage(`Error de desament: ${e}`))},[db,loaded]);
 const course=db.courses.find(c=>c.active)??db.courses.find(c=>!c.archived)??null;
 const group=course?.groups.find(g=>g.code===groupCode)??null;
 const mutate:Mutate=fn=>setDb(old=>{const next=structuredClone(old);fn(next);return next});
 const selectCourse=(id:string)=>mutate(d=>d.courses.forEach(c=>c.active=c.id===id));
 const addCourse=()=>{const year=prompt("Curs acadèmic",nextYear(course?.academicYear));if(!year)return;const clone=!!course&&confirm("Vols copiar la configuració comuna del curs actual?");mutate(d=>{d.courses.forEach(c=>c.active=false);d.courses.push(createCourse(year,clone?course!.configuration:undefined))})};
 if(!loaded)return <div className="loading">Carregant les dades locals…</div>;
 return <div className="app"><aside><div className="brand"><b><GraduationCap/></b><div><strong>RA · Avaluació</strong><span>SOX · 2n SMX</span></div></div><nav>
  <Nav on={tab==="resum"} icon={<LayoutDashboard/>} click={()=>setTab("resum")}>Resum</Nav><Nav on={tab==="cursos"} icon={<Layers/>} click={()=>setTab("cursos")}>Cursos</Nav><Nav on={tab==="alumnes"} icon={<Users/>} click={()=>setTab("alumnes")}>Alumnes</Nav><Nav on={tab==="notes"} icon={<ClipboardCheck/>} click={()=>setTab("notes")}>Notes</Nav><Nav on={tab==="activitats"} icon={<BookOpen/>} click={()=>setTab("activitats")}>Activitats</Nav><Nav on={tab==="graelles"} icon={<Table2/>} click={()=>setTab("graelles")}>Graelles</Nav><p>Configuració</p><Nav on={tab==="configuracio"} icon={<Settings2/>} click={()=>setTab("configuracio")}>RA, CA i pesos</Nav><Nav on={tab==="dades"} icon={<Save/>} click={()=>setTab("dades")}>Dades i còpies</Nav><Nav on={tab==="arxivats"} icon={<FolderClock/>} click={()=>setTab("arxivats")}>Arxivats</Nav><p>Ajuda</p><Nav on={tab==="ajuda"} icon={<HelpCircle/>} click={()=>setTab("ajuda")}>Com es calcula</Nav>
 </nav><div className="healthy"><Save/><div><strong>Desament local</strong><span>IndexedDB · fora de línia</span></div></div></aside><main><header><div className="course"><BookOpen/><div><span>Curs acadèmic</span><select value={course?.id??""} onChange={e=>selectCourse(e.target.value)}><option value="">Cap curs</option>{db.courses.map(c=><option key={c.id} value={c.id}>{c.academicYear}{c.archived?" · arxivat":""}</option>)}</select></div></div><div className="actionRow"><button onClick={addCourse}><Plus/>Nou curs</button>{course&&group&&<button className="dark" onClick={()=>setReport(activePeople(group)[0]?.enrollment.id??null)}><Printer/>Informe</button>}</div></header>
 {message&&<div className="toast" onClick={()=>setMessage("")}>{message}<X/></div>}
 {!course?<Welcome add={c=>mutate(d=>{d.courses.forEach(x=>x.active=false);d.courses.push(c)})} msg={setMessage}/>:<section className="content"><div className={tab==="activitats"||tab==="notes"||tab==="alumnes"?"head headSticky":"head"}><div><small>{course.configuration.abbreviation} · {course.configuration.level}</small><h1>{titles[tab]}</h1><p>Gestió local de l’avaluació contínua per RA i CA.</p></div><div className="switch"><button className={groupCode==="A"?"active":""} onClick={()=>setGroupCode("A")}>Grup A</button><button className={groupCode==="B"?"active":""} onClick={()=>setGroupCode("B")}>Grup B</button></div></div>
 {tab==="resum"&&group&&<Dashboard course={course} group={group}/>} {tab==="cursos"&&<Courses db={db} course={course} mutate={mutate} msg={setMessage}/>} {tab==="alumnes"&&group&&<Students course={course} group={group} mutate={mutate} report={setReport} msg={setMessage}/>} {tab==="notes"&&group&&<Grades course={course} group={group} db={db} mutate={mutate} msg={setMessage} focusActivity={focusActivity} clearFocus={()=>setFocusActivity(null)}/>} {tab==="activitats"&&group&&<Activities course={course} group={group} mutate={mutate} goToGrades={id=>{setFocusActivity(id);setTab("notes")}}/>} {tab==="graelles"&&group&&<Grids course={course} group={group} report={setReport}/>} {tab==="configuracio"&&<Config course={course} mutate={mutate}/>} {tab==="dades"&&<Data course={course} db={db} mutate={mutate} replace={setDb} msg={setMessage}/>} {tab==="arxivats"&&<Archived course={course} mutate={mutate}/>} {tab==="ajuda"&&<Help/>}</section>}
 </main>{course&&group&&report&&<StudentReport course={course} group={group} enrollmentId={report} close={()=>setReport(null)} mutate={mutate}/>}</div>
}
const titles={resum:"Com va el grup?",cursos:"Gestió de cursos",alumnes:"Alumnes i matrícules",notes:"Qualificacions",activitats:"Activitats",graelles:"Graelles globals",configuracio:"Configuració comuna",dades:"Dades locals",arxivats:"Elements arxivats",ajuda:"Com es calculen les notes"};
function Nav({on,icon,click,children}:{on:boolean;icon:ReactNode;click:()=>void;children:ReactNode}){return <button className={on?"active":""} onClick={click}>{icon}{children}</button>}
