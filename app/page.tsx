import {LOGO_SRC} from "./components/shared";
import {useEffect, useRef, useState, type ReactNode} from "react";
import {AlertTriangle,BookOpen,ChevronDown,ClipboardCheck,ClipboardList,FileSpreadsheet,FolderClock,GraduationCap,HelpCircle,Layers,LayoutDashboard,Palette,PieChart,Plus,Presentation,Printer,Repeat,Save,Settings2,Table2,TrendingUp,UserRoundSearch,Users,X} from "lucide-react";
import {groupCoursesByCicle, type AppDatabase} from "../src/model/domain";
import {FileBackedRepository, type FileConnection} from "../src/model/repository";
import {activePeople, type Mutate, type Tab} from "./lib/helpers";
import {useColorPalette} from "./lib/theme";
import {Welcome} from "./screens/Welcome";
import {Dashboard} from "./screens/Dashboard";
import {Courses} from "./screens/Courses";
import {Students} from "./screens/Students";
import {Grades} from "./screens/Grades";
import {InitialAssessment} from "./screens/InitialAssessment";
import {UnitResultsScreen} from "./screens/UnitResultsScreen";
import {RaWeights} from "./screens/RaWeights";
import {Activities} from "./screens/Activities";
import {Grids} from "./screens/Grids";
import {ActivitatsExtraordinaries} from "./screens/ActivitatsExtraordinaries";
import {Extraordinaria} from "./screens/Extraordinaria";
import {GroupAnalysis} from "./screens/GroupAnalysis";
import {StudentAnalysis} from "./screens/StudentAnalysis";
import {Reports} from "./screens/Reports";
import {Config} from "./screens/Config";
import {Data} from "./screens/Data";
import {Archived} from "./screens/Archived";
import {Aparenca} from "./screens/Aparenca";
import {Help} from "./screens/Help";
import {ExtraordinariaHelp} from "./screens/ExtraordinariaHelp";
import {Presentacio} from "./screens/Presentacio";
import {StudentReport} from "./screens/StudentReport";
import {JointView} from "./screens/JointView";

const repo=new FileBackedRepository(),EMPTY:AppDatabase={schemaVersion:1,courses:[],gradeHistory:[]};
interface NavItem{tab:Tab;icon:ReactNode;label:string}
interface NavGroup{id:string;label:string;icon:ReactNode;items:NavItem[]}
const NAV_GROUPS:NavGroup[]=[
 {id:"gestio",label:"Gestió del curs",icon:<Layers/>,items:[{tab:"cursos",icon:<Layers/>,label:"Cursos"},{tab:"alumnes",icon:<Users/>,label:"Alumnes"}]},
 {id:"avaluacio",label:"Avaluació",icon:<ClipboardCheck/>,items:[{tab:"notes",icon:<ClipboardCheck/>,label:"Notes"},{tab:"inicial",icon:<ClipboardList/>,label:"Avaluació inicial"},{tab:"activitats",icon:<BookOpen/>,label:"Activitats"},{tab:"activitatsextra",icon:<Repeat/>,label:"Activitats extraordinàries"},{tab:"graelles",icon:<Table2/>,label:"Graelles"},{tab:"extraordinaria",icon:<Repeat/>,label:"Convocatòria extraordinària"}]},
 {id:"analisi",label:"Anàlisi",icon:<TrendingUp/>,items:[{tab:"analisigrup",icon:<TrendingUp/>,label:"Anàlisi del grup"},{tab:"analisialumne",icon:<UserRoundSearch/>,label:"Anàlisi de l’alumne"},{tab:"conjunt",icon:<Layers/>,label:"Vista conjunta de mòduls"},{tab:"resultatsut",icon:<Table2/>,label:"Resultats per UT"},{tab:"pesosra",icon:<PieChart/>,label:"Pesos i RA"},{tab:"informes",icon:<FileSpreadsheet/>,label:"Informes"}]},
 {id:"configuracio",label:"Configuració",icon:<Settings2/>,items:[{tab:"configuracio",icon:<Settings2/>,label:"RA, CA i pesos"},{tab:"dades",icon:<Save/>,label:"Dades i còpies"},{tab:"arxivats",icon:<FolderClock/>,label:"Arxivats"},{tab:"aparenca",icon:<Palette/>,label:"Aparença"}]},
 {id:"ajuda",label:"Ajuda",icon:<HelpCircle/>,items:[{tab:"ajuda",icon:<HelpCircle/>,label:"Com es calcula"},{tab:"ajudaextra",icon:<Repeat/>,label:"Com funciona l’extraordinària"},{tab:"presentacio",icon:<Presentation/>,label:"Presentació mòdul"}]},
];
const GROUP_SCOPED_TABS=new Set<Tab>(["resum","alumnes","notes","inicial","activitats","graelles","extraordinaria","analisigrup","analisialumne","resultatsut","conjunt"]);
export default function Home(){
 const[db,setDb]=useState<AppDatabase>(EMPTY),[loaded,setLoaded]=useState(false),[tab,setTab]=useState<Tab>("resum"),[groupCode,setGroupCode]=useState<string>("A"),[report,setReport]=useState<string|null>(null),[message,setMessage]=useState(""),[focusActivity,setFocusActivity]=useState<string|null>(null),[focusStudent,setFocusStudent]=useState<string|null>(null);
 const [chooseReport,setChooseReport]=useState(false);
 const [saveStatus,setSaveStatus]=useState("Desat"),saveQueue=useRef(Promise.resolve());
 const [openGroup,setOpenGroup]=useState<string|null>(null);
 const [fileConn,setFileConn]=useState<FileConnection>({status:"disconnected"});
 const {palette,setPalette}=useColorPalette();
 useEffect(()=>{const g=NAV_GROUPS.find(group=>group.items.some(item=>item.tab===tab));if(g)setOpenGroup(g.id)},[tab]);
 useEffect(()=>{repo.init().then(setFileConn);repo.load().then(setDb).catch(e=>setMessage(String(e))).finally(()=>setLoaded(true))},[]);
 useEffect(()=>{if(!loaded)return;let current=true;setSaveStatus("Desant…");saveQueue.current=saveQueue.current.catch(()=>{}).then(()=>repo.save(db));saveQueue.current.then(()=>{if(current)setSaveStatus("Desat")}).catch(e=>{if(current){setSaveStatus("Error de desament");setMessage(`Error de desament: ${e}`)}});return()=>{current=false}},[db,loaded]);
 const course=db.courses.find(c=>c.active)??db.courses.find(c=>!c.archived)??null;
 const group=(course?.groups.find(g=>g.code===groupCode)??course?.groups[0])??null;
 const mutate:Mutate=fn=>setDb(old=>{const next=structuredClone(old);fn(next);return next});
 const selectCourse=(id:string)=>mutate(d=>d.courses.forEach(c=>c.active=c.id===id));
 const courseGroups=groupCoursesByCicle(db.courses);
 if(!loaded)return <div className="loading">Carregant les dades locals…</div>;
 return <div className="app"><aside><div className="sidebarLogo"><img src={LOGO_SRC} alt="Institut Cirvianum · Cicles" width={168} height={61}/></div><div className="brand"><b><GraduationCap/></b><div><strong>RA · Avaluació</strong><span>{course?`${course.configuration.abbreviation} · ${course.configuration.level}`:"Cap curs actiu"}</span></div></div><nav>
  <Nav on={tab==="resum"} icon={<LayoutDashboard/>} click={()=>setTab("resum")}>Resum</Nav>
 {NAV_GROUPS.map(group=>{const open=openGroup===group.id;return <div className={"navGroup"+(open?" open":"")} key={group.id}>
  <button className={"navGroupHeader"+(open?" open":"")} onClick={()=>setOpenGroup(o=>o===group.id?null:group.id)}>{group.icon}<span>{group.label}</span><ChevronDown/></button>
  {open&&<div className="navSub">{group.items.map(item=><Nav key={item.tab} on={tab===item.tab} icon={item.icon} click={()=>setTab(item.tab)}>{item.label}</Nav>)}</div>}
 </div>})}
 </nav><button className="healthy" onClick={()=>setTab("dades")} title="Gestiona la connexió del fitxer de dades">{fileIcon(fileConn)}<div><strong>{fileTitle(fileConn)}</strong><span>{fileSubtitle(fileConn)}</span></div></button></aside><main><header><div className="course"><BookOpen/><div><span>Curs acadèmic</span><select value={course?.id??""} onChange={e=>selectCourse(e.target.value)}><option value="">Cap curs</option>{courseGroups.map(([label,courses])=><optgroup key={label} label={label}>{courses.map(c=><option key={c.id} value={c.id}>{c.configuration.abbreviation} · {c.academicYear}{c.archived?" · arxivat":""}</option>)}</optgroup>)}</select></div></div>{course&&<div className="headerModule"><strong>{course.configuration.moduleName}</strong><span>{course.configuration.cicle} · {course.configuration.cicleNivell} · {course.configuration.curs}</span></div>}<div className="actionRow"><span className="saveStatus" role="status"><Save/>{saveStatus}</span><button onClick={()=>setTab("cursos")}><Plus/>Nou curs</button>{course&&group&&<button className="dark" onClick={()=>setChooseReport(true)}><Printer/>Informe</button>}</div></header>
 {message&&<div className="toast" onClick={()=>setMessage("")}>{message}<X/></div>}
 {tab==="aparenca"?<section className="content"><div className="head"><div><small>Configuració</small><h1>{titles.aparenca}</h1><p>Gestió local de l’avaluació contínua per RA i CA.</p></div></div><Aparenca palette={palette} setPalette={setPalette}/></section>:!course?<Welcome add={c=>mutate(d=>{d.courses.forEach(x=>x.active=false);d.courses.push(c)})} msg={setMessage}/>:<section className="content"><div className={tab==="activitats"||tab==="notes"||tab==="alumnes"?"head headSticky":"head"}><div><small>{course.configuration.abbreviation} · {course.configuration.level}</small><h1>{titles[tab]}</h1><p>Gestió local de l’avaluació contínua per RA i CA.</p></div>{GROUP_SCOPED_TABS.has(tab)&&<div className="switch">{course.groups.map(g=><button key={g.id} className={group?.id===g.id?"active":""} onClick={()=>setGroupCode(g.code)}>{g.name}</button>)}</div>}</div>
 {tab==="resum"&&group&&<Dashboard course={course} group={group}/>} {tab==="cursos"&&<Courses db={db} course={course} mutate={mutate} msg={setMessage}/>} {tab==="alumnes"&&group&&<Students key={`${course.id}:${group.id}`} db={db} course={course} group={group} mutate={mutate} report={setReport} analysis={id=>{setFocusStudent(id);setTab("analisialumne")}} msg={setMessage}/>} {tab==="notes"&&group&&<Grades key={`${course.id}:${group.id}`} course={course} group={group} db={db} mutate={mutate} msg={setMessage} focusActivity={focusActivity} clearFocus={()=>setFocusActivity(null)}/>} {tab==="inicial"&&group&&<InitialAssessment key={`${course.id}:${group.id}`} course={course} group={group} mutate={mutate} msg={setMessage}/>} {tab==="activitats"&&group&&<Activities course={course} group={group} mutate={mutate} goToGrades={id=>{setFocusActivity(id);setTab("notes")}} msg={setMessage}/>} {tab==="activitatsextra"&&<ActivitatsExtraordinaries course={course} mutate={mutate} goToGrades={id=>{setFocusActivity(id);setTab("notes")}}/>} {tab==="graelles"&&group&&<Grids course={course} group={group} report={setReport} mutate={mutate} msg={setMessage}/>} {tab==="extraordinaria"&&group&&<Extraordinaria course={course} group={group} mutate={mutate} goToGrades={id=>{setFocusActivity(id);setTab("notes")}} goToActivitatsExtra={()=>setTab("activitatsextra")}/>} {tab==="analisigrup"&&group&&<GroupAnalysis course={course} group={group} goTo={setTab}/>} {tab==="analisialumne"&&group&&<StudentAnalysis course={course} group={group} focusEnrollmentId={focusStudent} report={setReport} mutate={mutate}/>} {tab==="conjunt"&&group&&<JointView key={`${course.id}:${group.code}`} db={db} course={course} groupCode={group.code}/>} {tab==="pesosra"&&<RaWeights course={course}/>} {tab==="resultatsut"&&group&&<UnitResultsScreen key={`${course.id}:${group.id}`} course={course} group={group}/>} {tab==="informes"&&<Reports course={course}/>} {tab==="configuracio"&&<Config course={course} mutate={mutate} msg={setMessage}/>} {tab==="dades"&&<Data course={course} db={db} mutate={mutate} replace={setDb} msg={setMessage} repo={repo} fileConn={fileConn} setFileConn={setFileConn}/>} {tab==="arxivats"&&<Archived course={course} mutate={mutate}/>} {tab==="ajuda"&&<Help course={course}/>} {tab==="ajudaextra"&&<ExtraordinariaHelp/>} {tab==="presentacio"&&<Presentacio/>}</section>}
 </main>{course&&group&&chooseReport&&<div className="modal"><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="report-picker-title"><div className="panelHeader"><h2 id="report-picker-title">Tria l’alumne de l’informe</h2><button aria-label="Tancar" onClick={()=>setChooseReport(false)}><X/></button></div><p className="muted">Grup {group.code} · Inclou alumnes actius, arxivats i de baixa.</p>{group.enrollments.map(enrollment=>{const student=group.students.find(s=>s.id===enrollment.studentId);return student?<div className="statusRow" key={enrollment.id}><span>{student.name} · {enrollment.status==="active"?"Actiu":enrollment.status==="archived"?"Arxivat":"Baixa"}</span><div className="actionRow"><button onClick={()=>{setReport(enrollment.id);setChooseReport(false);}}>Obrir informe</button></div></div>:null;})}{!group.enrollments.length&&<p>El grup no té alumnes.</p>}</div></div>}{course&&group&&report&&<StudentReport key={course.id+group.id+report} course={course} group={group} enrollmentId={report} close={()=>setReport(null)} mutate={mutate}/>}</div>
}
const titles={resum:"Com va el grup?",cursos:"Gestió de cursos",alumnes:"Alumnes i matrícules",notes:"Qualificacions",inicial:"Avaluació inicial",activitats:"Activitats",activitatsextra:"Activitats extraordinàries",graelles:"Graelles globals",extraordinaria:"Convocatòria extraordinària",analisigrup:"Anàlisi del grup",analisialumne:"Anàlisi de l’alumne",conjunt:"Vista conjunta de mòduls",resultatsut:"Resultats per unitat de treball",pesosra:"Com sumen les tasques a cada RA",informes:"Informes i extraccions",configuracio:"Configuració comuna",dades:"Dades locals",arxivats:"Elements arxivats",aparenca:"Aparença",ajuda:"Com es calculen les notes",ajudaextra:"Com funciona l’extraordinària",presentacio:"Presentació del mòdul"};
function Nav({on,icon,click,children}:{on:boolean;icon:ReactNode;click:()=>void;children:ReactNode}){return <button className={on?"active":""} onClick={click}>{icon}{children}</button>}
function fileTitle(c:FileConnection){return c.status==="connected"?"Fitxer connectat":c.status==="needs-permission"?"Cal reconnectar":"Desament local"}
function fileSubtitle(c:FileConnection){switch(c.status){case"connected":return c.fileName;case"needs-permission":return `${c.fileName} · toca per reconnectar`;case"unsupported":return"IndexedDB · fora de línia";default:return"IndexedDB · connecta un fitxer a Dades"}}
function fileIcon(c:FileConnection){return c.status==="needs-permission"?<AlertTriangle/>:<Save/>}
