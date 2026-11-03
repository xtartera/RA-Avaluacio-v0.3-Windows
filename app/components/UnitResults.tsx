import type {AcademicCourse, Group} from "../../src/model/domain";
import {analyzeUnitResults, type UnitStatus} from "../../src/model/unitResults";

const fmt = (n: number | null) => n === null ? "—" : n.toLocaleString("ca", {minimumFractionDigits: 1, maximumFractionDigits: 1});
const fmt2 = (n: number | null) => n === null ? "—" : n.toLocaleString("ca", {minimumFractionDigits: 2, maximumFractionDigits: 2});
const STATUS: Record<UnitStatus, {label: string; bg: string; fg: string}> = {
  superada: {label: "Superada", bg: "#dff3e4", fg: "#1d6b48"},
  "no-superada": {label: "No superada", bg: "#f9dcdc", fg: "#a12f40"},
  "en-curs": {label: "En curs", bg: "#e6eefc", fg: "#2f5fb3"},
  "sense-dades": {label: "Sense dades", bg: "#eceff3", fg: "#52647c"},
};

/**
 * Resultat de cada UT i dels RA que tanca. La UT se supera amb les obligatòries aprovades i la mitjana de les seves
 * activitats de 5 o més. La nota de l'RA té en compte totes les activitats vinculades, també les d'altres UT encara per corregir.
 */
export function UnitResults({course, group, enrollmentId, name, report = false}: {course: AcademicCourse; group: Group; enrollmentId: string; name: string; report?: boolean}) {
  const results = analyzeUnitResults(course, group, enrollmentId, name);
  if (!results.some(r => r.status !== "sense-dades")) return null;
  const min = course.configuration.requiredActivityMinGrade;
  const Wrap = report ? "div" : "article";
  return <Wrap className={report ? "reportBlock tightPrint" : "panel"} style={report ? {margin: "14px 0"} : {marginBottom: 16}}>
    {report ? <h3>Resultat per unitat de treball</h3> : <div className="panelHeader"><h2>Resultat per unitat de treball</h2><span className="muted" style={{fontSize: 11}}>la nota de l’RA és la de la graella; s’assoleix amb les obligatòries ≥ {min} i la nota ≥ {min}</span></div>}
    <table className="wrapCells"><thead><tr><th>UT</th><th>Estat</th><th>Obligatòries</th><th>Activitats</th><th>RA que tanca</th></tr></thead><tbody>{results.map(r => {
      const st = STATUS[r.status];
      return <tr key={r.unitId}>
        <td><b>{r.unitName}</b></td>
        <td><span className="bonus" style={{background: st.bg, color: st.fg, fontWeight: 800, whiteSpace: "nowrap"}}>{st.label}</span><br/><span className="muted" style={{fontSize: 10.5}}>{r.reason}</span></td>
        <td style={{fontSize: 11.5}}>{r.requiredSummary.mode === "average" && r.requiredSummary.average !== null && <div className="muted" style={{fontSize: 10.5}}>Mitjana de les obligatòries: <b>{fmt(r.requiredSummary.average)}</b> {r.requiredSummary.passed ? "✔" : "✖"}</div>}{r.required.length ? r.required.map(q => <div key={q.name}>{q.name}: <b style={{color: q.passed === false ? "#a12f40" : q.passed ? "#1d6b48" : undefined}}>{q.grade === null ? (q.passed === false ? "No presentat" : "pendent") : fmt(q.grade)}</b> {q.passed === true ? "✔" : q.passed === false ? "✖" : ""}</div>) : "—"}</td>
        <td>{r.delivered} lliurades · {r.corrected} de {r.totalActivities} corregides</td>
        <td style={{fontSize: 11.5}}>{r.ras.length ? r.ras.map(a => <div key={a.code} style={{marginBottom: 4}}><b>{a.code}</b>: <span style={{color: a.outcome === "suspes" ? "#a12f40" : a.outcome === "superat" ? "#1d6b48" : undefined, fontWeight: 800}}>{a.outcome === "superat" ? "Assolit" : a.outcome === "suspes" ? (a.failedRequired ? "No assolit per obligatòria" : "No assolit per la nota") : a.outcome === "en-curs" ? "En curs" : "—"}</span>
          {a.outcome === "suspes" && a.failedRequired
            ? <><br/><span style={{fontSize: 10.5}}>{a.reason}. La nota de l’RA a la graella és <b>{fmt2(a.accumulated)}</b>.</span></>
            : a.outcome === "superat" ? <><br/><span style={{fontSize: 10.5}}>Nota de l’RA <b>{fmt2(a.accumulated)}</b></span></> : <><br/><span className="muted" style={{fontSize: 10.5}}>{a.reason}</span></>}</div>) : "—"}</td>
      </tr>;
    })}</tbody></table>
  </Wrap>;
}
