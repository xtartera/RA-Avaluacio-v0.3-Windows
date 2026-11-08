import {useMemo, useState} from "react";
import {activityShareInRa} from "../../src/model/calculation";
import {countsForGrade, type AcademicCourse} from "../../src/model/domain";
import {TYPE_COLORS} from "./RaWeightsExplainer";

const pct = (v: number) => `${(v * 100).toLocaleString("ca", {minimumFractionDigits: 1, maximumFractionDigits: 1})} %`;
const n2 = (v: number) => v.toLocaleString("ca", {minimumFractionDigits: 2, maximumFractionDigits: 2});
const gradeColor = (g: number) => g >= 7 ? "#22a06b" : g >= 5 ? "#e0a31a" : "#d64558";

/** Calculadora d'exemple: tria un RA, escriu notes a les tasques i veu com se'n forma la nota (acumulada i estimada). */
export function RaWorkedExample({course}: {course: AcademicCourse}) {
  const cfg = course.configuration;
  const ras = cfg.learningResults.filter(r => r.status === "active").sort((a, b) => a.order - b.order);
  const [raId, setRaId] = useState(ras[0]?.id ?? "");
  const [grades, setGrades] = useState<Record<string, string>>({});
  const types = cfg.activityTypes.filter(t => t.status === "active");
  const typeColor = (typeId: string) => TYPE_COLORS[Math.max(0, types.findIndex(t => t.id === typeId)) % TYPE_COLORS.length];
  const parts = useMemo(() => {
    const shares = activityShareInRa(course, raId);
    const unitOrder = new Map<string, number>(), unitName = new Map<string, string>();
    cfg.workUnits.filter(u => u.status === "active").sort((a, b) => a.order - b.order).forEach((u, ui) => u.activityIds.forEach(id => { if (!unitOrder.has(id)) { unitOrder.set(id, ui * 1000 + (cfg.activities.find(a => a.id === id)?.order ?? 0)); unitName.set(id, u.name); } }));
    return [...shares].filter(([, s]) => s > 0).map(([id, share]) => ({a: cfg.activities.find(x => x.id === id)!, share})).filter(p => p.a && p.a.status === "active" && p.a.session === "ordinaria" && countsForGrade(p.a))
      .sort((x, y) => (unitOrder.get(x.a.id) ?? 1e6) - (unitOrder.get(y.a.id) ?? 1e6)).map(p => ({...p, unit: unitName.get(p.a.id) ?? "Sense UT"}));
  }, [course, cfg, raId]);
  if (!ras.length) return null;
  const value = (id: string) => { const t = (grades[id] ?? "").replace(",", ".").trim(); if (t === "") return null; const v = Number(t); return Number.isFinite(v) ? Math.max(0, Math.min(10, v)) : null; };
  const earned = parts.reduce((s, p) => s + p.share * (value(p.a.id) ?? 0), 0);
  const gradedShare = parts.filter(p => value(p.a.id) !== null).reduce((s, p) => s + p.share, 0);
  const estimated = gradedShare > 0 ? earned / gradedShare : null;
  const ra = ras.find(r => r.id === raId);
  const fillAll = (v: string) => setGrades(Object.fromEntries(parts.map(p => [p.a.id, v])));

  return <div>
    <p className="muted" style={{margin: "0 0 12px"}}>Tria un RA i escriu una nota (de 0 a 10) a les tasques. Veuràs què aporta cada una a la nota de l'RA. Una tasca sense nota compta 0 a la <b>nota acumulada</b> (la de la graella) i no compta a la <b>nota estimada</b>.</p>
    <div style={{display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12}}>
      <label style={{display: "flex", gap: 8, alignItems: "center", fontSize: 13}}>RA<select value={raId} onChange={e => { setRaId(e.target.value); setGrades({}); }}>{ras.map(r => <option key={r.id} value={r.id}>{r.code}</option>)}</select></label>
      <button onClick={() => fillAll("10")}>Tot 10</button><button onClick={() => fillAll("5")}>Tot 5</button><button onClick={() => setGrades({})}>Esborra</button>
      <span className="muted" style={{fontSize: 12}}>{ra?.description.slice(0, 110)}</span>
    </div>
    <div className="rwxMeBar" style={{height: 46}}>{parts.map(p => { const g = value(p.a.id); return <div key={p.a.id} className="seg" style={{flex: p.share}} title={`${p.a.name} · ${pct(p.share)} de l'RA${g === null ? " · sense nota" : ` · nota ${g}`}`}>{g !== null && <div className="fill" style={{height: `${g * 10}%`, background: gradeColor(g)}}/>}<i className="tdot" style={{background: typeColor(p.a.activityTypeId)}}/></div>; })}</div>
    <div style={{display: "flex", gap: 24, flexWrap: "wrap", margin: "14px 0"}}>
      <div><span className="muted" style={{fontSize: 11}}>Nota acumulada (graella)</span><strong style={{display: "block", fontSize: 28}}>{n2(earned)}</strong></div>
      <div><span className="muted" style={{fontSize: 11}}>Nota estimada (només el que té nota)</span><strong style={{display: "block", fontSize: 28}}>{estimated === null ? "—" : n2(estimated)}</strong></div>
      <div><span className="muted" style={{fontSize: 11}}>Part de l'RA amb nota</span><strong style={{display: "block", fontSize: 28}}>{pct(gradedShare)}</strong></div>
    </div>
    <div style={{overflow: "auto", maxHeight: 380}}><table><thead><tr><th>Tasca</th><th>Pes dins l'RA</th><th>Nota</th><th>Aporta a l'RA</th></tr></thead><tbody>
      {parts.map(p => { const g = value(p.a.id); return <tr key={p.a.id}><td><span style={{display: "inline-block", width: 10, height: 10, borderRadius: 3, marginRight: 6, background: typeColor(p.a.activityTypeId)}}/>{p.a.name} <span className="muted" style={{fontSize: 11}}>{p.unit}</span></td><td>{pct(p.share)}</td><td><input aria-label={`Nota de ${p.a.name}`} inputMode="decimal" value={grades[p.a.id] ?? ""} onChange={e => setGrades(s => ({...s, [p.a.id]: e.target.value}))} placeholder="—" style={{width: 70, border: "1px solid var(--line)", borderRadius: 8, padding: "5px 8px", textAlign: "right"}}/></td><td>{g === null ? <span className="muted">0,00 (sense nota)</span> : <b>{n2(p.share * g)}</b>}</td></tr>; })}
      <tr style={{fontWeight: 800}}><td>Total</td><td>{pct(parts.reduce((s, p) => s + p.share, 0))}</td><td/><td>{n2(earned)}</td></tr>
    </tbody></table></div>
    <p className="muted" style={{fontSize: 12, margin: "8px 0 0"}}>Aporta = pes dins l'RA × nota. La nota acumulada és la suma de les aportacions; la nota estimada divideix aquesta suma pel pes de les tasques que ja tenen nota.</p>
  </div>;
}
