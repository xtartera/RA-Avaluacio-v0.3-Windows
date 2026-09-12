import {useEffect, useState} from "react";
import {AlertTriangle, Award, CircleCheck, CircleX, ClipboardList, Clock3, Construction, Gauge, Lightbulb, Minus, PieChart as PieChartIcon, Printer, Repeat, ShieldCheck, Target, TrendingDown, TrendingUp} from "lucide-react";
import {totalGrade} from "../../src/model/calculation";
import type {AcademicCourse, Activity, Grade, Group} from "../../src/model/domain";
import {activePeople, raStatusReason} from "../lib/helpers";
import {analyzeStudent, analyzeStudentConvocatoria} from "../lib/studentAnalytics";
import {DiagList, GradeBand, KpiCard, TrendLine} from "../components/analysis";

type SubTab = "resum" | "evolucio" | "raca" | "activitats" | "informe";
type Perspective = "ordinaria" | "extraordinaria" | "total";

export function StudentAnalysis({course, group, focusEnrollmentId, report}: {course: AcademicCourse; group: Group; focusEnrollmentId: string | null; report: (enrollmentId: string) => void}) {
 const [tab, setTab] = useState<SubTab>("resum");
 const people = group.enrollments.map(enrollment=>({enrollment,student:group.students.find(s=>s.id===enrollment.studentId)!})).filter(p=>p.student);
 const [selected, setSelected] = useState<string | null>(focusEnrollmentId ?? people[0]?.enrollment.id ?? null);
 const [perspective, setPerspective] = useState<Perspective>("ordinaria");
 useEffect(() => { if (focusEnrollmentId) setSelected(focusEnrollmentId); }, [focusEnrollmentId]);
 useEffect(() => { setPerspective("ordinaria"); }, [selected]);
 const current = people.find(p => p.enrollment.id === selected) ?? people[0] ?? null;

 if (!current) return <article className="panel"><p className="muted">Aquest grup no té alumnat.</p></article>;
 const {enrollment, student} = current;

 const a = analyzeStudent(course, group, enrollment.id);
 const {calc, hasStudentEvidence, trendDelta, trendPoints, groupTrendPoints, raRows, withEvidence, achievedCount, riskRas, activitiesTotal, delivered, deliveryPct, typeRows, diagnosis, strengths, improve, actions} = a;
 const conv = analyzeStudentConvocatoria(course, group, enrollment.id);
 const hasConvocatoria = conv.needingRecovery.length > 0;
 const effectivePerspective: Perspective = hasConvocatoria ? perspective : "ordinaria";

 const activitiesAll = course.configuration.activities.filter(act => act.status === "active");
 const activeAll = group.enrollments.filter(e => e.status === "active");
 const recentActivities = activitiesAll.map(act => {
  const grade = group.grades.find(g => g.enrollmentId === enrollment.id && g.activityId === act.id);
  if (!grade || grade.status === "pending") return null;
  const groupGrades = activeAll.map(e => group.grades.find(g => g.enrollmentId === e.id && g.activityId === act.id)).filter(g => g?.status === "graded" && totalGrade(g) !== null) as Grade[];
  const groupAvg = groupGrades.length ? groupGrades.reduce((s, g) => s + totalGrade(g)!, 0) / groupGrades.length : null;
  return {activity: act, grade, groupAvg};
 }).filter((x): x is {activity: Activity; grade: Grade; groupAvg: number | null} => x !== null)
  .sort((x, y) => (y.activity.date ?? "").localeCompare(x.activity.date ?? "")).slice(0, 8);

 return <>
  <div className="panelHeader" style={{marginBottom: 16}}>
   <div style={{display: "flex", alignItems: "center", gap: 14}}>
    <div style={{width: 46, height: 46, borderRadius: 13, background: "linear-gradient(145deg,#3975e8,#795fd7)", display: "grid", placeItems: "center", color: "white", fontWeight: 800, fontSize: 17, flexShrink: 0}}>{student.name.charAt(0).toUpperCase()}</div>
    <div><strong style={{fontSize: 16, display: "block"}}>{student.name}</strong><span className="muted" style={{fontSize: 12}}>Grup {group.code} · {course.configuration.abbreviation}</span></div>
   </div>
   <div className="actionRow">
    <select value={enrollment.id} onChange={e => setSelected(e.target.value)}>{people.map(p => <option key={p.enrollment.id} value={p.enrollment.id}>{p.student.name}</option>)}</select>
    <button className="dark" onClick={() => report(enrollment.id)}><Printer/>Exportar informe</button>
   </div>
  </div>

  <div className="subTabs">
   <button className={tab === "resum" ? "active" : ""} onClick={() => setTab("resum")}>Resum</button>
   <button className={tab === "evolucio" ? "active" : ""} onClick={() => setTab("evolucio")}>Evolució</button>
   <button className={tab === "raca" ? "active" : ""} onClick={() => setTab("raca")}>RA / CA</button>
   <button className={tab === "activitats" ? "active" : ""} onClick={() => setTab("activitats")}>Activitats</button>
   <button className={tab === "informe" ? "active" : ""} onClick={() => setTab("informe")}>Informe</button>
  </div>

  {tab !== "resum" && <article className="panel"><div className="placeholderPanel"><Construction/><strong>En construcció</strong><span>Aquesta vista detallada s’anirà afegint properament.</span></div></article>}

  {tab === "resum" && (!hasStudentEvidence ? <article className="panel"><p className="muted">Encara no hi ha evidències suficients per a aquest alumne.</p></article> : <>
   {hasConvocatoria && <div className="sectionActions" style={{justifyContent: "flex-start", marginBottom: 14}}><div className="switch"><button className={effectivePerspective === "ordinaria" ? "active" : ""} onClick={() => setPerspective("ordinaria")}>Ordinària</button><button className={effectivePerspective === "extraordinaria" ? "active" : ""} onClick={() => setPerspective("extraordinaria")}>Extraordinària</button><button className={effectivePerspective === "total" ? "active" : ""} onClick={() => setPerspective("total")}>Total</button></div></div>}
   {hasConvocatoria && effectivePerspective !== "ordinaria" && <p className="muted" style={{margin: "-8px 0 14px", fontSize: 11}}>El gràfic d’evolució, el rendiment per tipologia, les últimes activitats i la diagnosi més avall segueixen corresponent a la <b>convocatòria ordinària</b>.</p>}

   {effectivePerspective === "ordinaria" && <div className="kpiRow">
    <KpiCard tone="blue" icon={<Gauge size={14}/>} label="Nota projectada" value={`${calc.globalScore.toFixed(2)} / 10`} sub="amb les evidències disponibles" trend={Math.abs(trendDelta) >= .01 ? {icon: trendDelta > 0 ? TrendingUp : TrendingDown, tone: trendDelta > 0 ? "green" : "red", text: `${trendDelta > 0 ? "+" : ""}${trendDelta.toFixed(2)} respecte al 1r trimestre`} : undefined}/>
    <KpiCard tone={trendDelta > .05 ? "green" : trendDelta < -.05 ? "red" : "slate"} icon={trendDelta > .05 ? <TrendingUp size={14}/> : trendDelta < -.05 ? <TrendingDown size={14}/> : <Minus size={14}/>} label="Evolució" value={`${trendDelta > 0 ? "+" : ""}${trendDelta.toFixed(2)}`} sub="punts respecte al 1r trimestre"/>
    <KpiCard tone="green" icon={<Target size={14}/>} label="RA assolits" value={`${achievedCount} de ${withEvidence.length}`} sub={`${withEvidence.length ? (achievedCount / withEvidence.length * 100).toFixed(0) : 0}% dels RA avaluats`}/>
    <KpiCard tone={riskRas.length ? "red" : "slate"} icon={<AlertTriangle size={14}/>} label="RA no assolits" value={`${riskRas.length}`} sub={riskRas.length ? riskRas.map(r => r.ra.code).join(", ") : "Cap RA no assolit"}/>
    <KpiCard tone="amber" icon={<ClipboardList size={14}/>} label="Lliuraments" value={`${deliveryPct.toFixed(0)}%`} sub={`${delivered} de ${activitiesTotal} activitats`}/>
    <KpiCard tone="slate" icon={<PieChartIcon size={14}/>} label="Cobertura avaluada" value={`${calc.globalCoverage.toFixed(0)}%`} sub="del pes total del mòdul"/>
   </div>}

   {effectivePerspective === "extraordinaria" && <div className="kpiRow">
    <KpiCard tone="slate" icon={<Repeat size={14}/>} label="RA a recuperar" value={`${conv.needingRecovery.length}`} sub={conv.needingRecovery.map(r => r.ra.code).join(", ")}/>
    <KpiCard tone="green" icon={<CircleCheck size={14}/>} label="RA recuperats" value={`${conv.recoveredCount}`} sub={`de ${conv.needingRecovery.length} pendents a l’ordinària`}/>
    <KpiCard tone={conv.pendingCount ? "red" : "slate"} icon={<CircleX size={14}/>} label="RA encara pendents" value={`${conv.pendingCount}`} sub={conv.pendingCount ? "sense recuperar encara" : "cap"}/>
    <KpiCard tone={conv.exhaurida ? "red" : "amber"} icon={<AlertTriangle size={14}/>} label="Convocatòria consumida" value={`${conv.consumed}/4`} sub={conv.exhaurida ? "Exhaurida" : "encara en disposa"}/>
    <KpiCard tone="slate" icon={<ClipboardList size={14}/>} label="Presentat a l’extraordinària" value={conv.presented === null ? "Pendent" : conv.presented ? "Sí" : "No"} sub="segons «Convocatòria extraordinària»"/>
   </div>}

   {effectivePerspective === "total" && <div className="kpiRow">
    <KpiCard tone="blue" icon={<Gauge size={14}/>} label="Nota final" value={`${conv.finalScore.toFixed(2)} / 10`} sub="ordinària + extraordinària"/>
    <KpiCard tone={conv.modulePassed ? "green" : "red"} icon={conv.modulePassed ? <CircleCheck size={14}/> : <CircleX size={14}/>} label="Resultat" value={conv.modulePassed ? "Superat" : "No superat"} sub="resolució final del mòdul"/>
    <KpiCard tone="green" icon={<Target size={14}/>} label="RA assolits (final)" value={`${conv.raRows.filter(r => r.finalAchieved).length} de ${conv.raRows.length}`} sub="ordinària + extraordinària"/>
    <KpiCard tone={conv.exhaurida ? "red" : "amber"} icon={<AlertTriangle size={14}/>} label="Convocatòria consumida" value={`${conv.consumed}/4`} sub={conv.exhaurida ? "Exhaurida" : "encara en disposa"}/>
   </div>}

   <div className="analysisRow">
    <article className="panel"><div className="panelHeader"><h2>Evolució de la nota projectada{hasConvocatoria ? " (ordinària)" : ""}</h2></div><TrendLine series={[{label: "Alumne", color: "var(--blue)", points: trendPoints}, {label: "Grup", color: "#aab4c4", dashed: true, showValues: false, points: groupTrendPoints}]}/></article>
    <article className="panel"><div className="panelHeader"><h2>Situació actual{hasConvocatoria ? " (ordinària)" : ""}</h2></div><GradeBand score={calc.globalScore} riskThreshold={course.configuration.riskThreshold}/>{hasConvocatoria && <div style={{marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line)"}}><h4 style={{margin: "0 0 4px", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em", color: "#65738a"}}>Situació final (amb extraordinària)</h4><GradeBand score={conv.finalScore} riskThreshold={course.configuration.riskThreshold}/></div>}</article>
    <article className="panel"><div className="panelHeader"><h2>Rendiment per tipologia d’activitat</h2></div>{typeRows.length ? <div style={{display: "flex", flexDirection: "column", gap: 12, marginTop: 4}}>{typeRows.map(t => <div key={t.type.id}><div style={{display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5}}><span>{t.type.name}</span><b>{t.average !== null ? t.average.toFixed(2) : "—"}</b></div><div className="barTrack"><i style={{width: `${t.average !== null ? t.average / 10 * 100 : 0}%`, background: "var(--blue)"}}/></div></div>)}</div> : <p className="muted">Encara no hi ha activitats qualificades.</p>}</article>
   </div>

   {effectivePerspective === "ordinaria" && <article className="panel" style={{marginBottom: 16}}><div className="panelHeader"><h2>Assoliment per Resultat d’Aprenentatge{hasConvocatoria ? " (ordinària)" : ""}</h2></div>{raRows.length ? <table><thead><tr><th>RA</th><th>Nota alumne</th><th>Nota grup</th><th>Cobertura</th><th style={{width: 210}}>Estat</th></tr></thead><tbody>{raRows.map(r => <tr key={r.ra.id} className={r.status === "risc" ? "raRowRisc" : r.status === "assolit" ? "raRowAssolit" : undefined}><td><b>{r.ra.code}</b><br/><span className="muted" style={{fontSize: 11}}>{r.ra.description}</span></td><td>{r.score !== null ? <span style={{display: "flex", alignItems: "center", gap: 6, fontWeight: r.status === "risc" ? 800 : 400, color: r.status === "risc" ? "#c54c5c" : undefined}}>{r.score.toFixed(2)}{r.trend === "up" ? <TrendingUp size={13} color="#15825f"/> : r.trend === "down" ? <TrendingDown size={13} color="#c54c5c"/> : r.trend === "flat" ? <Minus size={13} color="#8a96a8"/> : null}</span> : "—"}</td><td className="muted">{r.groupAvg !== null ? r.groupAvg.toFixed(2) : "—"}</td><td className="muted">{r.coverage.toFixed(0)}%</td><td>{r.status === "assolit" ? <span className="raBadge raBadge-assolit"><CircleCheck size={15}/>Assolit</span> : r.status === "risc" ? <><span className="raBadge raBadge-risc"><CircleX size={15}/>No assolit</span><div style={{fontSize: 11, marginTop: 6, lineHeight: 1.4, color: "#8f3742"}}>{r.failing > 0 && r.score! >= 5 ? <>Tot i la nota {r.score!.toFixed(2)}, no assolit: {raStatusReason({score: r.score!, failingActivities: r.failing})}, amb independència de la mitjana.</> : raStatusReason({score: r.score!, failingActivities: r.failing})}</div></> : <span className="raBadge raBadge-pendent"><Clock3 size={15}/>Pendent</span>}</td></tr>)}</tbody></table> : <p className="muted">Encara no hi ha cap RA actiu.</p>}</article>}

   {effectivePerspective === "extraordinaria" && <article className="panel" style={{marginBottom: 16}}><div className="panelHeader"><h2>RA a recuperar — convocatòria extraordinària</h2></div><table><thead><tr><th>RA</th><th>Activitat de recuperació</th><th>Nota recuperació</th><th style={{width: 160}}>Estat</th></tr></thead><tbody>{conv.needingRecovery.map(r => <tr key={r.ra.id}><td><b>{r.ra.code}</b><br/><span className="muted" style={{fontSize: 11}}>{r.ra.description}</span></td><td>{r.recoveryActivity ? r.recoveryActivity.name : <span className="muted">Encara no creada</span>}</td><td>{r.recoveryScore !== null ? r.recoveryScore.toFixed(2) : "—"}</td><td>{r.finalAchieved ? <span className="raBadge raBadge-assolit"><CircleCheck size={15}/>Recuperat</span> : <span className="raBadge raBadge-pendent"><Clock3 size={15}/>Pendent</span>}</td></tr>)}</tbody></table></article>}

   {effectivePerspective === "total" && <article className="panel" style={{marginBottom: 16}}><div className="panelHeader"><h2>Assoliment per Resultat d’Aprenentatge — resolució final</h2></div><table><thead><tr><th>RA</th><th>Nota final</th><th>Origen</th><th style={{width: 160}}>Estat</th></tr></thead><tbody>{conv.raRows.map(r => <tr key={r.ra.id}><td><b>{r.ra.code}</b><br/><span className="muted" style={{fontSize: 11}}>{r.ra.description}</span></td><td>{r.pendent ? "—" : r.finalScore.toFixed(2)}</td><td className="muted">{r.pendent ? "—" : r.source === "extraordinaria" ? "Extraordinària" : "Ordinària"}</td><td>{r.pendent ? <span className="raBadge raBadge-pendent"><Clock3 size={15}/>Pendent</span> : r.finalAchieved ? <span className="raBadge raBadge-assolit"><CircleCheck size={15}/>Assolit</span> : <span className="raBadge raBadge-risc"><CircleX size={15}/>No assolit</span>}</td></tr>)}</tbody></table></article>}

   <div className="analysisRow two">
    <article className="panel"><div className="panelHeader"><h2>Últimes activitats</h2></div>{recentActivities.length ? <table><thead><tr><th>Activitat</th><th>Data</th><th>Nota alumne</th><th>Nota grup</th></tr></thead><tbody>{recentActivities.map(r => <tr key={r.activity.id}><td>{r.activity.name}</td><td className="muted">{r.activity.date ?? "—"}</td><td>{r.grade.status === "not_presented" ? <span className="pending">No presentat</span> : totalGrade(r.grade)!.toFixed(2)}</td><td className="muted">{r.groupAvg !== null ? r.groupAvg.toFixed(2) : "—"}</td></tr>)}</tbody></table> : <p className="muted">Encara no hi ha activitats qualificades.</p>}</article>
    <div style={{display: "flex", flexDirection: "column", gap: 16}}>
     <article className="panel diagCard"><div className="panelHeader"><h2>Diagnosi automàtica</h2></div><DiagList items={diagnosis}/></article>
    </div>
   </div>

   <div className="analysisRow">
    <article className="panel actionsCard"><div className="panelHeader"><h2><ShieldCheck size={16} style={{verticalAlign: "-3px", marginRight: 6}}/>Fortaleses</h2></div><ul style={{margin: "4px 0 0", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "#1c4535"}}>{strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></article>
    <article className="panel reinforceCard"><div className="panelHeader"><h2><Award size={16} style={{verticalAlign: "-3px", marginRight: 6}}/>Aspectes a reforçar</h2></div><ul style={{margin: "4px 0 0", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "#7a5c0c"}}>{improve.map((s, i) => <li key={i}>{s}</li>)}</ul></article>
    <article className="panel actionsCard"><div className="panelHeader"><h2><Lightbulb size={16} style={{verticalAlign: "-3px", marginRight: 6}}/>Accions suggerides</h2></div><ol style={{margin: "4px 0 0", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "#1c4535"}}>{actions.map((a2, i) => <li key={i}>{a2}</li>)}</ol><footer>«Les dades orienten la presa de decisions, però no substitueixen el criteri docent.»</footer></article>
   </div>
  </>)}
 </>;
}
