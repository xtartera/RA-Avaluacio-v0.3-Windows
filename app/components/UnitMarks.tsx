import type {AcademicCourse, Group} from "../../src/model/domain";
import {analyzeCurrentEvidence, listUnits} from "../../src/model/currentEvidence";
import {TrafficChip} from "./diagnosticViews";

const fmt = (n: number | null) => n === null ? "—" : n.toLocaleString("ca", {minimumFractionDigits: 1, maximumFractionDigits: 1});

/**
 * Nota de cada UT (mitjana de les activitats ja corregides, un 0 hi compta) i de l'acumulat, amb el semàfor.
 * Explica d'on surt el color i en què es diferencia de la nota projectada de tot el mòdul.
 */
export function UnitMarks({course, group, enrollmentId, name, report = false}: {course: AcademicCourse; group: Group; enrollmentId: string; name: string; report?: boolean}) {
  const observation = group.observations.find(o => o.enrollmentId === enrollmentId);
  const units = listUnits(course).map(u => ({unit: u, ev: analyzeCurrentEvidence(course, group, enrollmentId, name, {unitId: u.id})}));
  const total = analyzeCurrentEvidence(course, group, enrollmentId, name, {unitId: null, observation});
  if (!total) return null;
  const rows = [...units.map(({unit, ev}) => ({key: unit.id, label: unit.name, ev})), ...(units.filter(u => u.ev).length > 1 ? [{key: "total", label: "Acumulat", ev: total}] : [])];
  const Wrap = report ? "div" : "article";
  return <Wrap className={report ? "reportBlock tightPrint" : "panel"} style={report ? {margin: "14px 0"} : {marginBottom: 16}}>
    {report ? <h3>Nota per unitat de treball</h3> : <div className="panelHeader"><h2>Nota per unitat de treball</h2><span className="muted" style={{fontSize: 11}}>mitjana de les activitats corregides · un 0 compta com a 0</span></div>}
    <table className="wrapCells"><thead><tr><th>Unitat</th><th>Corregides</th><th>Lliurades</th><th>Mitjana</th><th>Grup</th><th>Avaluat</th><th>Semàfor</th></tr></thead><tbody>{rows.map(({key, label, ev}) => <tr key={key} style={key === "total" ? {fontWeight: 800} : undefined}>
      <td>{label}</td>
      {ev ? <>
        <td>{ev.activities.length} de {ev.totalInUnit}</td>
        <td>{ev.delivered} de {ev.activities.length}</td>
        <td><b>{fmt(ev.average)}</b></td>
        <td>{fmt(ev.groupAverage)}</td>
        <td>{Math.round(ev.coveragePct)} %</td>
        <td><TrafficChip traffic={ev.traffic}/></td>
      </> : <td colSpan={6} className="muted">encara sense activitats corregides</td>}
    </tr>)}</tbody></table>
    <p className="muted" style={{fontSize: 11, margin: "8px 0 0"}}>El semàfor es calcula amb la mitjana de les activitats <b>ja corregides</b>. La nota projectada de més amunt pondera els RA i els pesos de <b>tot el mòdul</b>, així que pot ser molt diferent mentre falten UT per avaluar.</p>
  </Wrap>;
}
