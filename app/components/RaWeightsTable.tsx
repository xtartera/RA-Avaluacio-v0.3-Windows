import {Fragment} from "react";
import {activityShareInRa} from "../../src/model/calculation";
import {countsForGrade, type AcademicCourse} from "../../src/model/domain";

const pct = (n: number) => `${(n * 100).toLocaleString("ca", {minimumFractionDigits: 1, maximumFractionDigits: 1})} %`;

/** Taula del pes de cada activitat dins de cada RA (el que compta per a la nota de l'RA, no per a la del mòdul). */
export function RaWeightsTable({course}: {course: AcademicCourse}) {
  const cfg = course.configuration;
  const ras = cfg.learningResults.filter(r => r.status === "active").sort((a, b) => a.order - b.order);
  const shares = new Map(ras.map(r => [r.id, activityShareInRa(course, r.id)]));
  const units = cfg.workUnits.filter(u => u.status === "active").sort((a, b) => a.order - b.order);
  const ordinary = cfg.activities.filter(a => a.status === "active" && a.session === "ordinaria" && countsForGrade(a));
  const blocks = units.map(u => ({title: u.name, acts: ordinary.filter(a => u.activityIds.includes(a.id)).sort((a, b) => a.order - b.order), required: new Set(u.requiredActivityIds)})).filter(b => b.acts.length);
  const assigned = new Set(units.flatMap(u => u.activityIds));
  const rest = ordinary.filter(a => !assigned.has(a.id));
  if (rest.length) blocks.push({title: "Sense UT assignada", acts: rest, required: new Set<string>()});
  if (!ras.length || !blocks.length) return null;
  const col = (raId: string) => [...(shares.get(raId)?.values() ?? [])].reduce((s, v) => s + v, 0);
  return <div className="reportBlock tightPrint rwxSplit" style={{margin: "14px 0"}}>
    <h3>Pes de cada activitat dins de cada RA</h3>
    <p className="muted" style={{fontSize: 11, margin: "0 0 6px"}}>Quant compta cada activitat per a la nota de l'RA ({cfg.raAveraging === "weighted" ? "mitjana ponderada dels criteris" : "mitjana simple dels criteris"}). Una activitat amb poc pes al mòdul pot tenir molt pes dins d'un RA si hi és vinculada a molts criteris.</p>
    <table className="wrapCells"><thead><tr><th>Activitat</th>{ras.map(r => <th key={r.id} title={r.description}>{r.code}</th>)}</tr></thead><tbody>
      {blocks.map(b => <Fragment key={b.title}><tr><td colSpan={ras.length + 1} style={{background: "#f5f8fc", fontWeight: 800}}>{b.title}</td></tr>{b.acts.map(a => <tr key={a.id}><td>{a.name}{b.required.has(a.id) && <em className="muted" style={{marginLeft: 6, fontSize: 10.5}}>(obligatòria)</em>}</td>{ras.map(r => { const v = shares.get(r.id)?.get(a.id); return <td key={r.id} className={v ? undefined : "muted"}>{v ? pct(v) : "—"}</td>; })}</tr>)}</Fragment>)}
      <tr style={{fontWeight: 800}}><td>Total</td>{ras.map(r => <td key={r.id}>{pct(col(r.id))}</td>)}</tr>
    </tbody></table>
  </div>;
}
