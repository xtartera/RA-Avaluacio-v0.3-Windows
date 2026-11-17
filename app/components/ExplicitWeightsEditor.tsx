import type {AcademicCourse} from "../../src/model/domain";
import {activityShareInRa, raWeights} from "../../src/model/calculation";
import {explicitWeightGap, explicitWeightIssues} from "../../src/model/explicitWeights";
import {findCourse, type Mutate} from "../lib/helpers";

const num = (v: number) => (Math.round(v * 10000) / 100).toString();

/** Passa el curs al mode de pesos explícits conservant els pesos actuals (els calculats a partir dels tipus), perquè els resultats no canviïn. */
export function enableExplicitWeights(course: AcademicCourse, mutate: Mutate) {
  const rw = raWeights(course);
  const shares = new Map<string, {raId: string; share: number}[]>();
  for (const ra of course.configuration.learningResults.filter(r => r.status === "active"))
    for (const [activityId, share] of activityShareInRa(course, ra.id)) { const list = shares.get(activityId) ?? []; list.push({raId: ra.id, share}); shares.set(activityId, list); }
  mutate(d => {
    const cfg = findCourse(d, course.id).configuration;
    const fresh = !cfg.learningResults.some(r => r.moduleWeight !== undefined) && !cfg.activities.some(a => a.raShares?.length);
    cfg.weightMode = "explicit";
    if (!fresh) return;
    for (const r of cfg.learningResults) r.moduleWeight = rw.get(r.id) ?? 0;
    for (const a of cfg.activities) a.raShares = shares.get(a.id) ?? [];
  });
}

/** Editor del mode de pesos explícits: pes de cada RA al mòdul i percentatge de cada activitat dins de cada RA. */
export function ExplicitWeightsEditor({course, mutate}: {course: AcademicCourse; mutate: Mutate}) {
  const cfg = course.configuration;
  const ras = cfg.learningResults.filter(r => r.status === "active").sort((a, b) => a.order - b.order);
  const unitOf = new Map<string, number>();
  cfg.workUnits.filter(u => u.status === "active").sort((a, b) => a.order - b.order).forEach((u, i) => u.activityIds.forEach(id => { if (!unitOf.has(id)) unitOf.set(id, i); }));
  const activities = cfg.activities.filter(a => a.status === "active" && a.session === "ordinaria").sort((a, b) => (unitOf.get(a.id) ?? 99) - (unitOf.get(b.id) ?? 99) || a.order - b.order);
  const issues = explicitWeightIssues(course);
  const raTotal = ras.reduce((s, r) => s + (r.moduleWeight ?? 0), 0);
  const colTotal = (raId: string) => activities.reduce((s, a) => s + (a.raShares?.find(x => x.raId === raId)?.share ?? 0), 0);
  const setRa = (id: string, v: number | undefined) => mutate(d => { const r = findCourse(d, course.id).configuration.learningResults.find(x => x.id === id); if (r) r.moduleWeight = v; });
  const setShare = (activityId: string, raId: string, v: number) => mutate(d => {
    const a = findCourse(d, course.id).configuration.activities.find(x => x.id === activityId); if (!a) return;
    const rest = (a.raShares ?? []).filter(x => x.raId !== raId);
    a.raShares = v > 0 ? [...rest, {raId, share: v}] : rest;
  });
  const input = {width: 64, border: "1px solid var(--line)", borderRadius: 7, padding: "4px 6px", textAlign: "right" as const};
  return <div style={{marginTop: 12}}>
    <p className="muted" style={{fontSize: 12.5, margin: "0 0 10px"}}>Escriu directament el pes de cada RA a la nota del mòdul i el percentatge de cada activitat dins l'RA (com a la programació). Una activitat sense percentatge (Apte/No apte) no pesa, però pot ser obligatòria. Recorda lligar cada activitat a algun criteri del seu RA i posar la mitjana dels RA en «ponderada».</p>
    <table><thead><tr><th>RA</th><th>Descripció</th><th>Pes al mòdul (%)</th></tr></thead>
      <tbody>{ras.map(r => <tr key={r.id}><td><b>{r.code}</b></td><td style={{whiteSpace: "normal"}}>{r.description}</td><td><input type="number" min={0} max={100} step={0.5} value={r.moduleWeight === undefined ? "" : num(r.moduleWeight)} style={input} onChange={e => setRa(r.id, e.target.value === "" ? undefined : Number(e.target.value) / 100)}/></td></tr>)}
        <tr><td colSpan={2} style={{textAlign: "right"}}><b>Total</b></td><td><b style={{color: raTotal > 1.0005 ? "#c54c5c" : "#15825f"}}>{num(raTotal)} %</b>{raTotal > 0 && Math.abs(raTotal - 1) > 0.0005 && <button style={{marginLeft: 8}} title="Opcional: reparteix els pesos proporcionalment perquè sumin 100 %. No cal si falta un RA que s'afegirà després." onClick={() => mutate(d => { const rs = findCourse(d, course.id).configuration.learningResults.filter(r => r.status === "active"); const t = rs.reduce((x, r) => x + (r.moduleWeight ?? 0), 0); if (t > 0) for (const r of rs) r.moduleWeight = (r.moduleWeight ?? 0) / t; })}>Normalitza a 100 %</button>}</td></tr></tbody></table>
    <h4 style={{margin: "16px 0 6px"}}>% de cada activitat dins de cada RA</h4>
    <div className="gridScroll" style={{maxHeight: 420}}><table><thead><tr><th>Activitat</th>{ras.map(r => <th key={r.id}>{r.code}</th>)}<th title="Pes de l'activitat a la nota del mòdul">Pes al mòdul</th></tr></thead>
      <tbody>{activities.map(a => <tr key={a.id}><td>{a.name}</td>
        {ras.map(r => { const v = a.raShares?.find(x => x.raId === r.id)?.share; return <td key={r.id}><input type="number" min={0} max={100} step={0.5} value={v ? num(v) : ""} placeholder="—" style={input} onChange={e => setShare(a.id, r.id, e.target.value === "" ? 0 : Number(e.target.value) / 100)}/></td>; })}
        <td className="muted">{num((a.raShares ?? []).reduce((s, x) => s + (ras.find(r => r.id === x.raId)?.moduleWeight ?? 0) * x.share, 0))} %</td></tr>)}
        <tr><td style={{textAlign: "right"}}><b>Total per RA</b></td>{ras.map(r => { const t = colTotal(r.id); return <td key={r.id}><b style={{color: t > 0 && Math.abs(t - 1) > 0.0005 ? "#c54c5c" : t > 0 ? "#15825f" : undefined}}>{t ? `${num(t)} %` : "—"}</b></td>; })}<td/></tr></tbody></table></div>
    {explicitWeightGap(course) > 0 && <p className="muted" style={{fontSize: 12.5}}>Els RA sumen el {num(raTotal)} % del mòdul: encara falta un {num(explicitWeightGap(course))} % (per exemple, un RA que s'afegirà més endavant). La nota projectada es calcula sobre el que hi ha, i la nota acumulada són els punts guanyats sobre 10, amb un màxim del {num(raTotal * 10)}.</p>}
    {issues.length > 0 && <ul className="reportList" style={{color: "#8f3742", marginTop: 10}}>{issues.map((x, i) => <li key={i}>{x}</li>)}</ul>}
    {!issues.length && <p style={{color: "#15825f", fontSize: 12.5, fontWeight: 700}}>Els pesos quadren: les activitats de cada RA sumen el 100 % de l'RA{explicitWeightGap(course) === 0 ? " i els RA el 100 % del mòdul" : ""}.</p>}
  </div>;
}
