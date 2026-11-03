import {createPortal} from "react-dom";
import {GraduationCap, Printer, X} from "lucide-react";
import type {AcademicCourse, Group} from "../../src/model/domain";
import {summarizeStudent, type RaState, type SummaryStatus} from "../../src/model/studentSummary";
import {ReportLogo} from "../components/shared";

const STATUS: Record<SummaryStatus, {bg: string; fg: string; label: string}> = {
  superat: {bg: "#dff3e4", fg: "#1d6b48", label: "Superat de moment"},
  "no-superat": {bg: "#f9dcdc", fg: "#a12f40", label: "No superat de moment"},
  pendent: {bg: "#e6eefc", fg: "#2f5fb3", label: "Pendent d'avaluar"},
};
const RA: Record<RaState, {bg: string; fg: string; label: string}> = {
  assolit: {bg: "#dff3e4", fg: "#1d6b48", label: "Assolit"},
  "no-assolit": {bg: "#f9dcdc", fg: "#a12f40", label: "No assolit"},
  "en-curs": {bg: "#eceff3", fg: "#52647c", label: "En curs"},
};

/** Informe breu per a l'alumne: només la nota projectada del mòdul, l'estat dels RA i, si no se supera, la causa. */
export function StudentSummaryReport({course, group, enrollmentId, close}: {course: AcademicCourse; group: Group; enrollmentId: string; close: () => void}) {
  const student = group.students.find(s => s.id === group.enrollments.find(e => e.id === enrollmentId)?.studentId);
  const s = summarizeStudent(course, group, enrollmentId), st = STATUS[s.status];
  const today = new Date().toLocaleDateString("ca", {day: "2-digit", month: "2-digit", year: "numeric"});
  return createPortal(<div className="modal"><div className="report initialReport" role="dialog" aria-modal="true" aria-label="Informe per a l'alumne">
    <div className="noPrint reportActions"><button onClick={close} autoFocus><X/>Tanca</button><button className="dark" onClick={() => window.print()}><Printer/>Imprimeix</button></div>
    <section className="initialPage"><ReportLogo/>
      <div className="reportHead"><GraduationCap/><div><small>INFORME D'AVALUACIÓ DE L'ALUMNE</small><h1>{student?.name ?? "Alumne"}</h1><p>{course.configuration.level} · Grup {group.code} · {course.academicYear} · {course.configuration.moduleName} · Dades a {today}</p></div>
        <div className="bigScore"><span>NOTA PROJECTADA DEL MÒDUL</span><strong>{s.projected.toFixed(2)}</strong><em>{s.provisional ? `provisional · avaluat el ${Math.round(s.coverage)} %` : `avaluat el ${Math.round(s.coverage)} %`}</em></div>
      </div>
      <div style={{margin: "14px 0 6px"}}><span className="bonus" style={{background: st.bg, color: st.fg, fontWeight: 800, fontSize: 13, padding: "5px 14px"}}>{st.label}</span></div>
      {s.status === "no-superat" && <div className="reportBlock reinforceCard tightPrint" style={{margin: "12px 0"}}><h3>Causa</h3><ul className="reportList" style={{marginTop: 0}}>{s.causes.map((c, i) => <li key={i}>{c}</li>)}</ul>{s.requiredFailed.length > 0 && <p style={{fontSize: 11.5, margin: "6px 0 0"}}>Les activitats obligatòries s'han de superar per assolir els RA, independentment de la resta de resultats.</p>}</div>}
      {s.status === "pendent" && <p className="muted" style={{fontSize: 12}}>Encara no hi ha prou activitats avaluades per valorar el mòdul: la nota projectada és provisional.</p>}
      <div className="reportBlock tightPrint" style={{margin: "12px 0"}}><h3>Resultats d'aprenentatge</h3>
        <table className="wrapCells"><thead><tr><th>RA</th><th>Estat</th><th>Causa</th></tr></thead><tbody>{s.ras.map(r => <tr key={r.code}><td style={{width: "55%"}}><b>{r.code}</b> · {r.description}</td><td><span className="bonus" style={{background: RA[r.state].bg, color: RA[r.state].fg, fontWeight: 800}}>{RA[r.state].label}</span></td><td style={{fontSize: 11.5}}>{r.causes.join("; ") || "—"}</td></tr>)}</tbody></table>
      </div>
      <p className="muted" style={{fontSize: 10.5, margin: "10px 0 0"}}>La nota projectada és una estimació amb el que s'ha avaluat fins ara i pot canviar quan s'avaluïn la resta d'activitats. Un RA queda assolit quan se superen les activitats obligatòries i la nota és igual o superior a {course.configuration.requiredActivityMinGrade}. Aquest informe no substitueix la resolució final del mòdul.</p>
      <footer>{course.configuration.moduleName} · Informe de l'alumne · Dades locals</footer>
    </section>
  </div></div>, document.body);
}
