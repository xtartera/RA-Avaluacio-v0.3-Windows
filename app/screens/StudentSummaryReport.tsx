import {createPortal} from "react-dom";
import {GraduationCap, Printer, X} from "lucide-react";
import type {AcademicCourse, Group} from "../../src/model/domain";
import {moduleComment} from "../../src/model/moduleComment";
import {summarizeStudent} from "../../src/model/studentSummary";
import {ModuleSummary, ProjectedScore} from "../components/ModuleSummary";
import {ReportLogo} from "../components/shared";
import {MyRaBars} from "../components/MyRaBars";

/** Informe breu per a l'alumne: només la nota projectada del mòdul, l'estat dels RA i, si no se supera, la causa. */
export function StudentSummaryPage({course, group, enrollmentId, title = "INFORME D'AVALUACIÓ DE L'ALUMNE"}: {course: AcademicCourse; group: Group; enrollmentId: string; /** Títol de l'informe; l'informe conjunt hi posa el seu. */ title?: string}) {
  const student = group.students.find(s => s.id === group.enrollments.find(e => e.id === enrollmentId)?.studentId);
  const s = summarizeStudent(course, group, enrollmentId);
  const today = new Date().toLocaleDateString("ca", {day: "2-digit", month: "2-digit", year: "numeric"});
  return <section className="initialPage"><ReportLogo/>
      <h2 style={{textAlign: "center", fontSize: 22, margin: "2px 0 10px", letterSpacing: ".01em"}}>{course.configuration.moduleName}</h2>
      <div className="reportHead"><GraduationCap/><div><small>{title}</small><h1>{student?.name ?? "Alumne"}</h1><p>{course.configuration.level} · Grup {group.code} · {course.academicYear} · {course.configuration.moduleName} · Dades a {today}</p></div>
        <ProjectedScore summary={s}/>
      </div>
      <div style={{display: "flex", alignItems: "center", gap: 16, margin: "10px 0 4px", padding: "10px 16px", border: "1px solid #c9d6ee", borderRadius: 14, background: "#f3f7fe", printColorAdjust: "exact", WebkitPrintColorAdjust: "exact"}}>
        <div style={{textAlign: "center", minWidth: 96}}><strong style={{fontSize: 34, lineHeight: 1, color: "#2f5fb3"}}>{Math.round(s.coverage)} %</strong><br/><span style={{fontSize: 10, fontWeight: 800, letterSpacing: ".05em", color: "#52607a"}}>DEL MÒDUL AVALUAT</span></div>
        <div style={{flex: 1}}><div style={{height: 14, borderRadius: 999, background: "#dbe5f6", overflow: "hidden", printColorAdjust: "exact", WebkitPrintColorAdjust: "exact"}}><div style={{width: `${Math.max(0, Math.min(100, s.coverage))}%`, height: "100%", background: "#2f5fb3", printColorAdjust: "exact", WebkitPrintColorAdjust: "exact"}}/></div><span className="muted" style={{fontSize: 11}}>Percentatge del pes total del mòdul que ja té activitats corregides{s.provisional ? " · encara poca evidència: la nota projectada és provisional" : ""}.</span></div>
      </div>
      <ModuleSummary summary={s}/>
      <MyRaBars course={course} group={group} enrollmentId={enrollmentId} report title="Resultats d'aprenentatge: què porto i què em falta — convocatòria ordinària"/>
      <div className="reportBlock tightPrint" style={{margin: "12px 0 0", background: "#fbfaf3", border: "1px solid #e4dcc0"}}><h3>Valoració global del mòdul</h3><p style={{fontSize: 12.5, lineHeight: 1.5, margin: 0}}>{moduleComment(s)}</p></div>{s.finalAdjustment&&<p className="muted" style={{fontSize: 11, margin: "6px 0 0"}}>Nota final decidida pel professor: {s.finalAdjustment.value.toFixed(2)} (calculada: {s.finalAdjustment.calculated.toFixed(2)}). Motiu: {s.finalAdjustment.reason}</p>}
      <p className="muted" style={{fontSize: 10.5, margin: "10px 0 0"}}>Un RA queda assolit quan se superen les activitats obligatòries i la nota és igual o superior a {course.configuration.requiredActivityMinGrade}. Aquest informe no substitueix la resolució final del mòdul.</p>
      <footer>{course.configuration.moduleName} · Informe de l'alumne · Dades locals</footer>
    </section>;
}

/** Informe breu per a l'alumne: d'un alumne o de tots els alumnes del grup (un per pàgina). */
export function StudentSummaryReport({course, group, enrollmentIds, close}: {course: AcademicCourse; group: Group; enrollmentIds: string[]; close: () => void}) {
  return createPortal(<div className="modal"><div className="report initialReport" role="dialog" aria-modal="true" aria-label="Informe per a l'alumne">
    <div className="noPrint reportActions"><button onClick={close} autoFocus><X/>Tanca</button><button className="dark" onClick={() => window.print()}><Printer/>Imprimeix{enrollmentIds.length > 1 ? ` ${enrollmentIds.length} informes` : ""}</button></div>
    {enrollmentIds.map(id => <StudentSummaryPage key={id} course={course} group={group} enrollmentId={id}/>)}
  </div></div>, document.body);
}
