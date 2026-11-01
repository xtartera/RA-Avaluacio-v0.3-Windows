import {createPortal} from "react-dom";
import {ClipboardList, Printer, X} from "lucide-react";
import type {AcademicCourse, Group} from "../../src/model/domain";
import {analyzeUnitResults, type UnitResult, type UnitStatus} from "../../src/model/unitResults";
import {ReportLogo} from "../components/shared";

const fmt = (n: number | null) => n === null ? "—" : n.toLocaleString("ca", {minimumFractionDigits: 1, maximumFractionDigits: 1});
const STATUS: Record<UnitStatus, {bg: string; fg: string; label: string}> = {
  superada: {bg: "#dff3e4", fg: "#1d6b48", label: "Superada"},
  "no-superada": {bg: "#f9dcdc", fg: "#a12f40", label: "No superada"},
  "en-curs": {bg: "#e6eefc", fg: "#2f5fb3", label: "En curs"},
  "sense-dades": {bg: "#eceff3", fg: "#7d899d", label: "Sense dades"},
};

/** Motiu d'una UT no superada sense revelar la nota: només les obligatòries no superades o que no s'arriba al mínim. */
function suspensionReason(unit: UnitResult): string {
  const failed = unit.required.filter(q => q.passed === false).map(q => q.name);
  if (failed.length) return `no s'han superat les activitats obligatòries (${failed.join(", ")})`;
  return "les obligatòries estan superades, però la nota de l'RA no arriba al mínim exigit";
}

/** Què es mostra de l'RA segons l'estat de la UT que el tanca: nota si se supera; motiu si se suspèn; avís si encara és en curs. */
function raResult(unit: UnitResult, ra: UnitResult["ras"][number]) {
  if (ra.outcome === "superat") return <><b style={{fontSize: 14, color: "#1d6b48"}}>{ra.estimated === null ? "Superat" : fmt(ra.estimated)}</b><br/><span className="muted" style={{fontSize: 10.5}}>Superat{ra.coverage < 99.5 ? ` · provisional, ${Math.round(ra.coverage)} % avaluat` : ""}</span></>;
  if (ra.outcome === "suspes") return <><b style={{color: "#a12f40"}}>Suspès</b><br/><span style={{fontSize: 11}}>Motiu: {suspensionReason(unit)}.</span></>;
  if (ra.outcome === "en-curs") return <><b style={{color: "#2f5fb3"}}>En curs</b><br/><span className="muted" style={{fontSize: 10.5}}>{ra.reason}</span></>;
  return <span className="muted">—</span>;
}

/** Pàgina breu d'un alumne: cada UT amb els RA que tanca. Amb nota si se superen; amb el motiu si se suspenen. */
export function UnitStudentPage({course, group, enrollmentId}: {course: AcademicCourse; group: Group; enrollmentId: string}) {
  const name = group.students.find(s => s.id === group.enrollments.find(e => e.id === enrollmentId)?.studentId)?.name ?? "Alumne";
  const units = analyzeUnitResults(course, group, enrollmentId, name).filter(u => u.status !== "sense-dades");
  const today = new Date().toLocaleDateString("ca", {day: "2-digit", month: "2-digit", year: "numeric"});
  const min = course.configuration.requiredActivityMinGrade;
  return <section className="initialPage"><ReportLogo/>
    <div className="reportHead"><ClipboardList/><div><small>INFORME DE RESULTATS PER UNITAT DE TREBALL</small><h1>{name}</h1><p>{course.configuration.level} · Grup {group.code} · {course.academicYear} · {course.configuration.moduleName} · Dades a {today}</p></div></div>
    {!units.length ? <p className="muted" style={{margin: "18px 0"}}>Encara no hi ha cap unitat amb activitats corregides.</p> : units.map(u => {
      const st = STATUS[u.status];
      return <div key={u.unitId} className="reportBlock tightPrint" style={{margin: "12px 0"}}>
        <div style={{display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6}}>
          <h3 style={{margin: 0}}>{u.unitName}</h3>
          <span className="bonus" style={{background: st.bg, color: st.fg, fontWeight: 800}}>{st.label}</span>
          <span style={{fontSize: 12}}>{u.delivered} lliurades de {u.corrected} corregides ({u.totalActivities} a la UT)</span>
        </div>
        {u.required.length > 0 && <p style={{fontSize: 11.5, margin: "0 0 6px"}}>Obligatòries: {u.required.map((q, i) => <span key={q.name}>{i ? " · " : ""}{q.name} <b style={{color: q.passed === false ? "#a12f40" : q.passed ? "#1d6b48" : undefined}}>{q.grade === null ? (q.passed === false ? "no presentat" : "pendent") : fmt(q.grade)}{q.passed === true ? " ✔" : q.passed === false ? " ✖" : ""}</b></span>)}</p>}
        <table className="wrapCells"><thead><tr><th>RA</th><th>Resultat</th></tr></thead><tbody>{u.ras.map(ra => <tr key={ra.code}><td style={{width: "62%"}}><b>{ra.code}</b> · {ra.description}</td><td>{raResult(u, ra)}</td></tr>)}{!u.ras.length && <tr><td colSpan={2} className="muted">Aquesta unitat no té RA associats.</td></tr>}</tbody></table>
      </div>;
    })}
    <p className="muted" style={{fontSize: 10.5, margin: "10px 0 0"}}>Cada RA que tanca la UT se supera amb les obligatòries ≥ {min} i la seva nota (amb totes les activitats vinculades ja corregides, arrodonida amb el llindar de {course.configuration.roundingThreshold}) ≥ {min}. Un RA superat mostra la nota calculada amb totes les activitats vinculades ja corregides; si està suspès no té nota i només s'indica el motiu. Descriu dades i no substitueix el criteri docent.</p>
    <footer>{course.configuration.moduleName} · Resultats per UT · Dades locals</footer>
  </section>;
}

/** Finestra imprimible amb l'informe d'un alumne o de tots els del grup. */
export function UnitStudentReport({course, group, enrollmentIds, close}: {course: AcademicCourse; group: Group; enrollmentIds: string[]; close: () => void}) {
  return createPortal(<div className="modal"><div className="report initialReport" role="dialog" aria-modal="true" aria-label="Informe de resultats per UT">
    <div className="noPrint reportActions"><button onClick={close} autoFocus><X/>Tanca</button><button className="dark" onClick={() => window.print()}><Printer/>Imprimeix</button></div>
    {enrollmentIds.map(id => <UnitStudentPage key={id} course={course} group={group} enrollmentId={id}/>)}
  </div></div>, document.body);
}
