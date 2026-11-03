import {useState} from "react";
import {ChevronDown, ChevronRight} from "lucide-react";
import type {AcademicCourse, Group} from "../../src/model/domain";
import {analyzeCurrentEvidence, listUnits} from "../../src/model/currentEvidence";
import {analyzeUnitResults} from "../../src/model/unitResults";
import {calculateStudent} from "../../src/model/calculation";
import {TrafficChip} from "./diagnosticViews";

const fmt = (n: number | null) => n === null ? "—" : n.toLocaleString("ca", {minimumFractionDigits: 1, maximumFractionDigits: 1});
const fmt2 = (n: number | null) => n === null ? "—" : n.toLocaleString("ca", {minimumFractionDigits: 2, maximumFractionDigits: 2});

/**
 * Fila desplegable amb tots els càlculs de suport en una sola taula (mitjanes, notes estimades i acumulades, semàfor).
 * Plegada per defecte: són dades de referència del professorat, no el resultat de l'alumne.
 */
export function SupportCalculations({course, group, enrollmentId, name}: {course: AcademicCourse; group: Group; enrollmentId: string; name: string}) {
  const [open, setOpen] = useState(false);
  const observation = group.observations.find(o => o.enrollmentId === enrollmentId);
  const units = listUnits(course);
  const total = analyzeCurrentEvidence(course, group, enrollmentId, name, {unitId: null, observation});
  if (!total) return null;
  const results = open ? analyzeUnitResults(course, group, enrollmentId, name) : [];
  const calc = open ? calculateStudent(course, group, enrollmentId) : null;
  const provisional = !!calc && calc.globalCoverage < (course.configuration.minRaCoverage ?? 25);
  const rows = open ? units.map(u => ({key: u.id, label: u.name, ev: analyzeCurrentEvidence(course, group, enrollmentId, name, {unitId: u.id}), ras: results.find(r => r.unitId === u.id)?.ras ?? []})) : [];
  const withData = rows.filter(r => r.ev).length;
  return <article className="panel" style={{marginBottom: 16, padding: 0}}>
    <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} style={{display: "flex", alignItems: "center", gap: 10, width: "100%", border: 0, background: "transparent", padding: "14px 18px", cursor: "pointer", textAlign: "left", font: "inherit"}}>
      {open ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
      <strong style={{fontSize: 15}}>Càlculs de suport</strong>
      <span className="muted" style={{fontSize: 12}}>mitjanes, notes estimades i acumulades i semàfor · només com a referència</span>
    </button>
    {open && <div style={{padding: "0 18px 16px"}}>
      <table className="wrapCells"><thead><tr><th>Unitat</th><th>Corregides</th><th>Lliurades</th><th title="Mitjana simple de les activitats corregides; un 0 compta com a 0">Mitjana activitats</th><th>Grup</th><th>Avaluat</th><th>Semàfor</th><th>RA (nota estimada · acumulada)</th></tr></thead><tbody>
        {[...rows, ...(withData > 1 ? [{key: "total", label: "Acumulat", ev: total, ras: [] as typeof results[number]["ras"]}] : [])].map(({key, label, ev, ras}) => <tr key={key} style={key === "total" ? {fontWeight: 800} : undefined}>
          <td>{label}</td>
          {ev ? <>
            <td>{ev.activities.length} de {ev.totalInUnit}</td><td>{ev.delivered} de {ev.activities.length}</td><td><b>{fmt(ev.average)}</b></td><td>{fmt(ev.groupAverage)}</td><td>{Math.round(ev.coveragePct)} %</td><td><TrafficChip traffic={ev.traffic}/></td>
            <td style={{fontSize: 11.5, fontWeight: 400}}>{ras.length ? ras.map(a => <div key={a.code}><b>{a.code}</b>: {fmt2(a.estimated)} · {fmt2(a.accumulated)} <span className="muted">({Math.round(a.coverage)} % avaluat)</span></div>) : "—"}</td>
          </> : <td colSpan={7} className="muted">encara sense activitats corregides</td>}
        </tr>)}
      </tbody></table>
      <div style={{display: "flex", gap: 22, margin: "14px 0 6px", flexWrap: "wrap"}}>
        <div><span className="muted" style={{fontSize: 11}}>Quan lliura</span><strong style={{display: "block", fontSize: 20}}>{fmt(total.averageDelivered)}</strong><span className="muted" style={{fontSize: 11}}>mitjana de les lliurades</span></div>
        <div><span className="muted" style={{fontSize: 11}}>En conjunt</span><strong style={{display: "block", fontSize: 20}}>{fmt(total.average)}</strong><span className="muted" style={{fontSize: 11}}>mitjana de les corregides (0 = no lliurada)</span></div>
        <div><span className="muted" style={{fontSize: 11}}>Constància</span><strong style={{display: "block", fontSize: 20}}>{total.delivered} de {total.activities.length}</strong><span className="muted" style={{fontSize: 11}}>activitats lliurades</span></div>
      </div>
      <p style={{margin: "0 0 8px", fontSize: 12.5}}><b>Potencial i constància:</b> {total.potential?.text ?? "Encara no hi ha prou diferència entre les dues mitjanes per extreure'n cap conclusió."}</p>
      {calc && <div style={{display: "flex", gap: 22, margin: "6px 0 10px", flexWrap: "wrap"}}>
        <div><span className="muted" style={{fontSize: 11}}>Nota projectada del mòdul{provisional ? " (provisional)" : ""}</span><strong style={{display: "block", fontSize: 20}}>{calc.globalScore.toFixed(2)}</strong><span className="muted" style={{fontSize: 11}}>pondera RA i pesos, sobre el que ja està avaluat</span></div>
        <div><span className="muted" style={{fontSize: 11}}>Nota acumulada del mòdul</span><strong style={{display: "block", fontSize: 20}}>{calc.globalAccumulated.toFixed(2)}</strong><span className="muted" style={{fontSize: 11}}>el que no té nota compta 0</span></div>
        <div><span className="muted" style={{fontSize: 11}}>Avaluat del mòdul</span><strong style={{display: "block", fontSize: 20}}>{calc.globalCoverage.toFixed(0)} %</strong><span className="muted" style={{fontSize: 11}}>del pes total</span></div>
      </div>}
      <p className="muted" style={{fontSize: 11, margin: "8px 0 0"}}>La nota estimada és sobre el que ja està avaluat; l'acumulada compta com a 0 el que encara no té nota (també d'altres UT). El semàfor es calcula amb la mitjana de les activitats corregides. Cap d'aquestes xifres decideix si un RA se supera.</p>
    </div>}
  </article>;
}
