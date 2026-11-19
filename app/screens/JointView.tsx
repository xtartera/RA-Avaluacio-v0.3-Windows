import {useState} from "react";
import {createPortal} from "react-dom";
import {AlertTriangle, GraduationCap, Printer, X} from "lucide-react";
import type {AcademicCourse, AppDatabase} from "../../src/model/domain";
import {analyzeJoint, buildJointStudents, jointCourses, type JointModuleResult, type JointStudent} from "../../src/model/joint";
import {ReportLogo} from "../components/shared";
import {StudentSummaryPage} from "./StudentSummaryReport";

const fmt = (v: number) => v.toLocaleString("ca", {minimumFractionDigits: 2, maximumFractionDigits: 2});
const STATE_LABEL = {superat: "Superat de moment", "no-superat": "No superat de moment", pendent: "Pendent d'avaluar", absent: "—"} as const;
const STATE_CLASS = {superat: "ok", "no-superat": "risk", pendent: "pending", absent: "muted"} as const;

const StateChip = ({m}: {m: JointModuleResult}) => <span className={STATE_CLASS[m.state]}>{STATE_LABEL[m.state]}</span>;
const adjustmentTexts = (m: JointModuleResult) => [
  ...m.raAdjustments.map(a => `${a.code}: ${fmt(a.value)} decidida pel professor (calculada ${fmt(a.calculated)}). Motiu: ${a.reason}`),
  ...(m.finalAdjustment ? [`Nota final: ${fmt(m.finalAdjustment.value)} decidida pel professor (calculada ${fmt(m.finalAdjustment.calculated)}). Motiu: ${m.finalAdjustment.reason}`] : []),
];

/** Avís permanent: aquests documents són per a l'equip docent. */
function InternalNotice({compact = false}: {compact?: boolean}) {
  return <div role="note" style={{display: "flex", gap: 10, alignItems: "center", background: "#fff4d6", border: "1px solid #e8c766", color: "#6b4a00", borderRadius: 10, padding: compact ? "6px 10px" : "10px 14px", margin: compact ? "8px 0" : "0 0 14px", fontSize: compact ? 11 : 13, fontWeight: 700}}>
    <AlertTriangle size={compact ? 14 : 18} style={{flexShrink: 0}}/>Document intern: ús exclusiu de l'equip docent. Conté notes decidides pel professor i anàlisis comparades; no s'ha de lliurar a l'alumnat ni a les famílies.
  </div>;
}

function Cell({m}: {m: JointModuleResult}) {
  if (m.state === "absent") return <td className="muted" title="No matriculat en aquest mòdul">—</td>;
  const adj = adjustmentTexts(m);
  return <td><strong>{m.projected === null ? "—" : fmt(m.projected)}</strong> <StateChip m={m}/>{adj.length > 0 && <span title={adj.join("\n")} style={{color: "#8a5a00", fontWeight: 700, marginLeft: 4, cursor: "help"}}>✎</span>}<br/><small className="muted">{m.coverage.toFixed(0)}% avaluat{m.failed.length ? ` · no assolits: ${m.failed.join(", ")}` : ""}</small></td>;
}

export function JointView({db, course, groupCode}: {db: AppDatabase; course: AcademicCourse; groupCode: string}) {
  const courses = jointCourses(db, course), students = buildJointStudents(courses, groupCode), analysis = analyzeJoint(courses, students);
  const [view, setView] = useState<"graella" | "analisi">("graella"), [studentReport, setStudentReport] = useState<string | null>(null), [evaluationReport, setEvaluationReport] = useState<string | null>(null), [groupReport, setGroupReport] = useState<null | "menu" | "resum" | "avaluacio">(null);
  const reportStudent = students.find(s => s.key === studentReport), evaluationStudent = students.find(s => s.key === evaluationReport);
  if (courses.length < 2) return <div className="managementScreen"><InternalNotice/><article className="panel managementPanel"><p>La vista conjunta necessita almenys dos mòduls del curs {course.academicYear}. Ara només n'hi ha {courses.length}. Crea l'altre mòdul a «Cursos».</p></article></div>;
  return <div className="managementScreen">
    <InternalNotice/>
    <article className="panel managementPanel">
      <div className="managementHeader"><div className="managementTitle"><div><h2>Grup {groupCode} · {courses.map(c => c.configuration.abbreviation).join(" + ")} · {course.academicYear}</h2><p>{students.length} alumnes · cada mòdul es calcula amb els seus criteris; aquí només es llegeixen i es comparen. No hi ha cap mitjana global dels mòduls.</p></div></div>
        <div className="actionRow"><div className="switch"><button className={view === "graella" ? "active" : ""} onClick={() => setView("graella")}>Graella conjunta</button><button className={view === "analisi" ? "active" : ""} onClick={() => setView("analisi")}>Anàlisi del grup</button></div><button className="dark" onClick={() => setGroupReport("menu")}><Printer/>Informe del grup</button></div></div>
      {view === "graella" ? <GroupTable courses={courses} students={students} onReport={setStudentReport} onEvaluation={setEvaluationReport}/> : <AnalysisView courses={courses} analysis={analysis}/>}
      <p className="muted" style={{fontSize: 11, marginTop: 10}}>Els alumnes s'uneixen pel nom (sense accents, majúscules ni ordre de cognoms). ✎ = hi ha notes decidides pel professor: passa-hi el ratolí per sobre per veure el motiu.</p>
    </article>
    {evaluationStudent && <JointEvaluationReport courses={courses} student={evaluationStudent} course={course} groupCode={groupCode} close={() => setEvaluationReport(null)}/>}
    {reportStudent && <JointStudentReport courses={courses} student={reportStudent} course={course} groupCode={groupCode} close={() => setStudentReport(null)}/>}
    {groupReport === "menu" && <GroupReportChoice courses={courses} students={students} choose={setGroupReport} close={() => setGroupReport(null)}/>}
    {groupReport === "resum" && <JointGroupSummaries courses={courses} students={students} course={course} groupCode={groupCode} close={() => setGroupReport(null)}/>}
    {groupReport === "avaluacio" && <JointGroupEvaluations courses={courses} students={students} course={course} groupCode={groupCode} close={() => setGroupReport(null)}/>}
  </div>;
}

function GroupTable({courses, students, onReport, onEvaluation}: {courses: AcademicCourse[]; students: JointStudent[]; onReport?: (key: string) => void; onEvaluation?: (key: string) => void}) {
  return <div className="managementTableScroll"><table className="managementTable"><thead><tr><th>Alumne</th>{courses.map(c => <th key={c.id} title={c.configuration.moduleName}>{c.configuration.abbreviation}<small style={{display: "block", fontWeight: 400}}>{c.configuration.moduleName}</small></th>)}<th>Resum</th>{onReport && <th className="noPrint"/>}</tr></thead>
    <tbody>{students.map(s => <tr key={s.key}><td><strong>{s.name}</strong></td>{s.modules.map(m => <Cell key={m.courseId} m={m}/>)}
      <td>{s.present ? <><b>{s.passed}</b> de {s.present} superats{s.failed > 0 && <span className="risk" style={{marginLeft: 6}}>{s.failed} no superat{s.failed > 1 ? "s" : ""}</span>}</> : "—"}</td>
      {onReport && <td className="noPrint"><div className="actionRow"><button title="Informe d'avaluació de l'alumne amb tots els mòduls (una pàgina de resum i una pàgina per mòdul)" onClick={() => onEvaluation?.(s.key)}><GraduationCap/>Avaluació</button><button title="Resum intern d'una pàgina" onClick={() => onReport(s.key)}><Printer/>Resum</button></div></td>}</tr>)}</tbody></table>
    {!students.length && <div className="tableEmpty"><strong>Aquest grup no té alumnes actius als mòduls.</strong></div>}</div>;
}

const names = (list: JointStudent[]) => list.map(s => s.name).join(", ") || "Cap";

function AnalysisView({courses, analysis}: {courses: AcademicCourse[]; analysis: ReturnType<typeof analyzeJoint>}) {
  return <div style={{display: "grid", gap: 14}}>
    <table><thead><tr><th>Mòdul</th><th>Alumnes</th><th>Nota projectada mitjana</th><th>Superats</th><th>No superats</th><th>Pendents</th><th>Cobertura mitjana</th><th>Amb notes decidides</th></tr></thead>
      <tbody>{analysis.modules.map(m => <tr key={m.courseId}><td><strong>{m.moduleName}</strong></td><td>{m.students}</td><td>{m.average === null ? "—" : fmt(m.average)}</td><td className="ok">{m.passed}</td><td className={m.failed ? "risk" : undefined}>{m.failed}</td><td>{m.pending}</td><td>{m.coverage.toFixed(0)}%</td><td>{m.adjusted}</td></tr>)}</tbody></table>
    <AnalysisLists analysis={analysis} courses={courses}/>
  </div>;
}

function AnalysisLists({analysis, courses}: {analysis: ReturnType<typeof analyzeJoint>; courses: AcademicCourse[]}) {
  return <ul className="reportList" style={{lineHeight: 1.6}}>
    <li><b>No superen més d'un mòdul ({analysis.riskInSeveral.length}):</b> {names(analysis.riskInSeveral)}.</li>
    <li><b>No superen un sol mòdul ({analysis.riskInOne.length}):</b> {analysis.riskInOne.length ? analysis.riskInOne.map(s => `${s.name} (${s.modules.filter(m => m.state === "no-superat").map(m => m.abbreviation).join(", ")})`).join(", ") : "Cap"}.</li>
    <li><b>Superen tots els mòduls ({analysis.allPassed.length}):</b> {names(analysis.allPassed)}.</li>
    <li><b>Diferència de 2 punts o més entre mòduls ({analysis.gaps.length}):</b> {analysis.gaps.length ? analysis.gaps.map(g => `${g.student.name} (${g.high.abbreviation} ${fmt(g.high.projected!)} · ${g.low.abbreviation} ${fmt(g.low.projected!)})`).join(", ") : "Cap"}.</li>
    {courses.length > 1 && <li><b>Alumnes que només consten a un mòdul ({analysis.partial.length}):</b> {analysis.partial.length ? analysis.partial.map(s => `${s.name} (${s.modules.filter(m => m.state !== "absent").map(m => m.abbreviation).join(", ")})`).join(", ") : "Cap"}. Revisa que no sigui un nom escrit diferent.</li>}
  </ul>;
}

/** Nombre de pàgines que ocuparà cada tipus d'informe, perquè el professor sàpiga què imprimeix. */
const evaluationPageCount = (s: JointStudent) => 1 + s.modules.filter(m => m.enrollmentId).length;

function GroupReportChoice({courses, students, choose, close}: {courses: AcademicCourse[]; students: JointStudent[]; choose: (kind: "resum" | "avaluacio") => void; close: () => void}) {
  const pages = students.reduce((n, s) => n + evaluationPageCount(s), 0);
  return createPortal(<div className="modal" onKeyDown={e => { if (e.key === "Escape") close(); }}><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="group-report-title" style={{width: "min(620px,100%)"}}>
    <div className="panelHeader"><h2 id="group-report-title">Informe del grup</h2><button aria-label="Tanca" onClick={close}><X/></button></div>
    <p className="muted">Tria quin informe vols generar per a tots els alumnes del grup ({students.length}). Cada alumne ocupa pàgines pròpies i es poden imprimir o desar en PDF.</p>
    <div className="actionRow" style={{flexDirection: "column", alignItems: "stretch", gap: 10}}>
      <button onClick={() => choose("resum")}><strong>Resum de tots els alumnes</strong><br/><small>Una pàgina per alumne: taula amb l'estat de cada mòdul ({courses.map(c => c.configuration.abbreviation).join(", ")}), valoració global i notes decidides pel professor. {students.length} pàgines.</small></button>
      <button onClick={() => choose("avaluacio")}><strong>Avaluació de tots els alumnes</strong><br/><small>Per a cada alumne, una pàgina de resum conjunt i una pàgina completa per mòdul. {pages} pàgines.</small></button>
    </div>
  </div></div>, document.body);
}

/** Resum d'un alumne: la primera pàgina de l'informe d'avaluació conjunt (taula de mòduls i valoració global). */
function JointStudentReport({courses, student, course, groupCode, close}: {courses: AcademicCourse[]; student: JointStudent; course: AcademicCourse; groupCode: string; close: () => void}) {
  return createPortal(<div className="modal"><div className="report initialReport" role="dialog" aria-modal="true" aria-label="Resum conjunt de l'alumne">
    <div className="noPrint reportActions"><button onClick={close} autoFocus><X/>Tanca</button><button className="dark" onClick={() => window.print()}><Printer/>Imprimeix</button></div>
    <EvaluationSummary courses={courses} student={student} course={course} groupCode={groupCode} title="RESUM CONJUNT DE L'ALUMNE" withModulePages={false}/>
  </div></div>, document.body);
}

/** Resum (una pàgina per alumne) de tots els alumnes del grup. */
function JointGroupSummaries({courses, students, course, groupCode, close}: {courses: AcademicCourse[]; students: JointStudent[]; course: AcademicCourse; groupCode: string; close: () => void}) {
  return createPortal(<div className="modal"><div className="report initialReport" role="dialog" aria-modal="true" aria-label="Resum de tots els alumnes">
    <div className="noPrint reportActions"><button onClick={close} autoFocus><X/>Tanca</button><button className="dark" onClick={() => window.print()}><Printer/>Imprimeix {students.length} resums</button></div>
    {students.map(s => <EvaluationSummary key={s.key} courses={courses} student={s} course={course} groupCode={groupCode} title="RESUM CONJUNT DE L'ALUMNE" withModulePages={false}/>)}
  </div></div>, document.body);
}

/** Informe d'avaluació conjunt (resum + una pàgina per mòdul) de tots els alumnes del grup. */
function JointGroupEvaluations({courses, students, course, groupCode, close}: {courses: AcademicCourse[]; students: JointStudent[]; course: AcademicCourse; groupCode: string; close: () => void}) {
  return createPortal(<div className="modal"><div className="report initialReport" role="dialog" aria-modal="true" aria-label="Avaluació de tots els alumnes">
    <div className="noPrint reportActions"><button onClick={close} autoFocus><X/>Tanca</button><button className="dark" onClick={() => window.print()}><Printer/>Imprimeix {students.length} informes</button></div>
    {students.map(s => <EvaluationPages key={s.key} courses={courses} student={s} course={course} groupCode={groupCode}/>)}
  </div></div>, document.body);
}

/** Valoració conjunta en prosa, a partir de l'estat de cada mòdul (no hi ha cap nota global). */
function jointComment(student: JointStudent): string {
  const present = student.modules.filter(m => m.state !== "absent");
  if (!present.length) return "";
  const list = (state: JointModuleResult["state"]) => present.filter(m => m.state === state).map(m => m.moduleName);
  const join = (xs: string[]) => xs.length > 1 ? `${xs.slice(0, -1).join(", ")} i ${xs[xs.length - 1]}` : xs[0];
  const parts: string[] = [];
  if (list("superat").length) parts.push(`De moment supera ${list("superat").length === present.length ? "tots els mòduls cursats" : join(list("superat"))}`);
  if (list("no-superat").length) parts.push(`De moment no supera ${join(list("no-superat"))}${present.filter(m => m.state === "no-superat").flatMap(m => m.failed).length ? `, amb RA pendents de recuperar (${present.filter(m => m.state === "no-superat").map(m => `${m.abbreviation}: ${m.failed.join(", ") || "nota global"}`).join("; ")})` : ""}`);
  if (list("pendent").length) parts.push(`${join(list("pendent"))} ${list("pendent").length > 1 ? "són encara provisionals" : "és encara provisional"}, per falta d'evidències corregides`);
  return `${parts.join(". ")}.`;
}

/** Informe a l'estil de «Informe d'avaluació de l'alumne», amb tots els mòduls: una pàgina de resum i una pàgina completa per mòdul. */
function EvaluationSummary({courses, student, course, groupCode, title, withModulePages}: {courses: AcademicCourse[]; student: JointStudent; course: AcademicCourse; groupCode: string; title: string; withModulePages: boolean}) {
  const today = new Date().toLocaleDateString("ca", {day: "2-digit", month: "2-digit", year: "numeric"});
  const adjustments = student.modules.flatMap(m => adjustmentTexts(m).map(t => `${m.abbreviation} · ${t}`));
  return (
    <section className="initialPage"><ReportLogo/>
      <h2 style={{textAlign: "center", fontSize: 22, margin: "2px 0 10px"}}>{courses.map(c => c.configuration.moduleName).join(" · ")}</h2>
      <div className="reportHead"><GraduationCap/><div><small>{title}</small><h1>{student.name}</h1><p>{course.configuration.level} · Grup {groupCode} · {course.academicYear} · Dades a {today}</p></div></div>
      <InternalNotice compact/>
      <table><thead><tr><th>Mòdul</th><th>Nota projectada</th><th>Estat</th><th>Avaluat</th><th>RA assolits</th><th>RA no assolits</th><th>RA en curs</th></tr></thead>
        <tbody>{student.modules.map(m => <tr key={m.courseId}><td><strong>{m.moduleName}</strong></td>{m.state === "absent" ? <td colSpan={6} className="muted">No matriculat en aquest mòdul</td> : <><td><strong>{m.projected === null ? "—" : fmt(m.projected)}</strong></td><td><StateChip m={m}/></td><td>{m.coverage.toFixed(0)}%</td><td>{m.achieved.join(", ") || "—"}</td><td>{m.failed.length ? <span className="risk">{m.failed.join(", ")}</span> : "—"}</td><td>{m.inProgress.join(", ") || "—"}</td></>}</tr>)}</tbody></table>
      <div className="reportBlock tightPrint" style={{margin: "12px 0 0", background: "#fbfaf3", border: "1px solid #e4dcc0"}}><h3>Valoració global</h3><p style={{fontSize: 12.5, lineHeight: 1.5, margin: 0}}>{jointComment(student) || "Sense mòduls."}</p></div>
      {adjustments.length > 0 && <div className="reportBlock tightPrint" style={{margin: "10px 0 0"}}><h3>Notes decidides pel professor</h3><ul className="reportList" style={{fontSize: 12}}>{adjustments.map((t, i) => <li key={i}>{t}</li>)}</ul></div>}
      <p className="muted" style={{fontSize: 10.5, margin: "10px 0 0"}}>«De moment» vol dir que l'estat es basa només en el que ja està corregit; «Pendent d'avaluar» vol dir que encara no s'ha arribat al percentatge mínim d'avaluació del mòdul ({courses.map(c => `${c.configuration.abbreviation} ${c.configuration.minRaCoverage ?? 25}%`).join(", ")}), i llavors la nota és només provisional. Cada mòdul s'avalua amb els seus propis criteris; no hi ha una nota global dels mòduls.{withModulePages ? " Les pàgines següents detallen cada mòdul." : ""} Aquest informe no substitueix la resolució final.</p>
      <footer>Informe conjunt d'avaluació de l'alumne · Document intern de l'equip docent · Dades locals</footer>
    </section>
  );
}

function EvaluationPages({courses, student, course, groupCode}: {courses: AcademicCourse[]; student: JointStudent; course: AcademicCourse; groupCode: string}) {
  const pages = student.modules.map((m, i) => {
    const c = courses[i], group = c.groups.find(g => g.enrollments.some(e => e.id === m.enrollmentId));
    return m.enrollmentId && group ? {c, group, enrollmentId: m.enrollmentId, m} : null;
  }).filter((x): x is NonNullable<typeof x> => !!x);
  return <>
    <EvaluationSummary courses={courses} student={student} course={course} groupCode={groupCode} title="INFORME CONJUNT D'AVALUACIÓ DE L'ALUMNE" withModulePages/>
    {pages.map(p => <StudentSummaryPage key={p.c.id} course={p.c} group={p.group} enrollmentId={p.enrollmentId} title={`INFORME CONJUNT D'AVALUACIÓ DE L'ALUMNE · ${p.c.configuration.abbreviation}`}/>)}
  </>;
}

function JointEvaluationReport({courses, student, course, groupCode, close}: {courses: AcademicCourse[]; student: JointStudent; course: AcademicCourse; groupCode: string; close: () => void}) {
  return createPortal(<div className="modal"><div className="report initialReport" role="dialog" aria-modal="true" aria-label="Informe d'avaluació conjunt de l'alumne">
    <div className="noPrint reportActions"><button onClick={close} autoFocus><X/>Tanca</button><button className="dark" onClick={() => window.print()}><Printer/>Imprimeix</button></div>
    <EvaluationPages courses={courses} student={student} course={course} groupCode={groupCode}/>
  </div></div>, document.body);
}
