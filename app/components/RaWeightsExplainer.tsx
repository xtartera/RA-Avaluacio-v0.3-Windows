import {Fragment, useMemo, useState} from "react";
import {activityShareInRa, activityWeights} from "../../src/model/calculation";
import {countsForGrade, type AcademicCourse} from "../../src/model/domain";

export const TYPE_COLORS = ["#14b8a6", "#8b5cf6", "#f59e0b", "#3b82f6", "#ec4899", "#64748b"];
const pct = (v: number, d = 1) => `${(v * 100).toLocaleString("ca", {minimumFractionDigits: d, maximumFractionDigits: d})} %`;

interface Act {id: string; name: string; type: string; typeIndex: number; unit: string; closes: string[]; required: boolean; global: number}

/**
 * Explicació visual de com sumen les tasques a cada RA: pesos dels tipus, mapa de calor tasca × RA,
 * barres per RA i un exemple triat. Pensat per projectar a classe i imprimir.
 */
export function RaWeightsExplainer({course}: {course: AcademicCourse}) {
  const cfg = course.configuration;
  const data = useMemo(() => {
    const ras = cfg.learningResults.filter(r => r.status === "active").sort((a, b) => a.order - b.order);
    const weights = activityWeights(course);
    const shares = new Map(ras.map(r => [r.id, activityShareInRa(course, r.id)]));
    const types = cfg.activityTypes.filter(t => t.status === "active");
    const ordinary = new Map(cfg.activities.filter(a => a.status === "active" && a.session === "ordinaria" && countsForGrade(a)).map(a => [a.id, a]));
    const units = cfg.workUnits.filter(u => u.status === "active").sort((a, b) => a.order - b.order).map(u => ({
      name: u.name, closes: u.learningResultIds.map(id => ras.find(r => r.id === id)?.code).filter((c): c is string => !!c),
      acts: u.activityIds.map(id => ordinary.get(id)).filter((a): a is NonNullable<typeof a> => !!a).sort((a, b) => a.order - b.order).map((a): Act => {
        const ti = Math.max(0, types.findIndex(t => t.id === a.activityTypeId));
        return {id: a.id, name: a.name, type: types[ti]?.name ?? "", typeIndex: ti, unit: u.name, closes: [], required: u.requiredActivityIds.includes(a.id), global: weights.get(a.id) ?? 0};
      }),
    })).filter(u => u.acts.length);
    const criteriaOf = (raId: string) => cfg.criteria.filter(c => c.status === "active" && c.learningResultId === raId);
    const caCount = (actId: string, raId: string) => { const ids = new Set(cfg.links.filter(l => l.activityId === actId).map(l => l.criterionId)); return criteriaOf(raId).filter(c => ids.has(c.id)).length; };
    return {ras, shares, types, units, acts: units.flatMap(u => u.acts), caCount, criteriaOf};
  }, [course, cfg]);

  const {ras, shares, types, units, acts, caCount, criteriaOf} = data;
  const share = (a: Act, raId: string) => shares.get(raId)?.get(a.id) ?? 0;
  const maxShare = Math.max(0.0001, ...acts.flatMap(a => ras.map(r => share(a, r.id))));
  // Exemple per defecte: la tasca que més pesa dins d'un RA en proporció al seu pes sobre el mòdul.
  const defaultEx = acts.slice().sort((a, b) => Math.max(...ras.map(r => share(b, r.id))) / (b.global || 1) - Math.max(...ras.map(r => share(a, r.id))) / (a.global || 1))[0]?.id ?? "";
  const [exId, setExId] = useState(defaultEx);
  const ex = acts.find(a => a.id === exId) ?? acts[0];
  if (!ras.length || !acts.length || !ex) return <article className="panel"><p className="muted">Cal tenir RA, criteris i activitats configurats (a Configuració) perquè es pugui explicar.</p></article>;
  const color = (a: Act) => TYPE_COLORS[a.typeIndex % TYPE_COLORS.length];
  const shade = (v: number) => v ? `rgba(37,99,235,${0.12 + 0.78 * Math.min(1, v / maxShare)})` : "#f3f6fb";
  const typeLegend = <div className="rwxLegend">{types.map((t, i) => <span key={t.id}><i style={{background: TYPE_COLORS[i % TYPE_COLORS.length]}}/>{t.name}</span>)}</div>;
  const maxEx = Math.max(...ras.map(r => share(ex, r.id)));

  return <div className="rwx">
    <article className="panel"><h2>1 · En tres passos</h2><p className="muted">Cada tasca no suma el mateix a tots els RA: depèn del tipus de tasca i de quins criteris d’avaluació (CA) treballa.</p>
      <div className="rwxSteps">
        <div className="rwxStep"><span className="n">1</span><h3>Cada tipus de tasca té un pes</h3><p>El pes del tipus es reparteix entre totes les tasques d’aquell tipus.</p>
          <div className="rwxTypeBar">{types.map((t, i) => <div key={t.id} style={{flex: t.weight, background: TYPE_COLORS[i % TYPE_COLORS.length]}} title={`${t.name}: ${pct(t.weight, 0)}`}>{pct(t.weight, 0)}</div>)}</div>{typeLegend}</div>
        <div className="rwxStep"><span className="n">2</span><h3>Cada tasca treballa uns criteris (CA)</h3><p>Una tasca com <b>{ex.name}</b> pot treballar criteris de molts RA alhora.</p>
          <div className="rwxChips">{ras.map(r => <span key={r.id}>{r.code}: <b>{caCount(ex.id, r.id)}</b> de {criteriaOf(r.id).length} CA</span>)}</div></div>
        <div className="rwxStep"><span className="n">3</span><h3>Els criteris formen cada RA</h3><p>La nota d’un RA és la mitjana dels seus criteris, i cada criteri el formen les tasques que el treballen.</p>
          {ras.map(r => <div className="rwxRaRow" key={r.id}><b>{r.code}</b><div className="rwxCa">{criteriaOf(r.id).map(c => <span key={c.id} title={c.description}/>)}</div></div>)}</div>
      </div></article>

    <article className="panel"><h2>2 · Mapa: quina tasca compta per a quin RA</h2><p className="muted">Com més fort el color, més pes té aquella tasca dins la nota d’aquell RA. Una casella buida vol dir que no hi compta.</p>
      <div className="rwxLegend"><span>Pes dins l’RA:</span>{[0.1, 0.35, 0.6, 0.85, 1].map(t => <span key={t}><i style={{background: shade(maxShare * t)}}/>{pct(maxShare * t, 0)}</span>)}</div>
      <div style={{overflow: "auto"}}><table className="rwxHeat"><thead><tr><th className="l">Tasca</th>{ras.map(r => <th key={r.id} title={r.description}>{r.code}</th>)}</tr></thead><tbody>
        {units.map(u => <Fragment key={u.name}><tr className="unit"><td colSpan={ras.length + 1}>{u.name} · tanca {u.closes.join(", ") || "—"}</td></tr>
          {u.acts.map(a => <tr key={a.id}><td className="l"><span className="dot" style={{background: color(a)}}/>{a.name}{a.required && <span className="req">OBLIGATÒRIA</span>}</td>
            {ras.map(r => { const v = share(a, r.id); return <td key={r.id} style={{background: shade(v), color: v / maxShare > 0.55 ? "#fff" : "#1c2a44"}} title={`${a.name} → ${r.code}: ${v ? pct(v) : "no hi compta"} (${caCount(a.id, r.id)} CA)`}>{v ? pct(v, 0) : ""}</td>; })}</tr>)}</Fragment>)}
      </tbody></table></div><p className="muted" style={{fontSize: 12.5}}>Cada columna suma 100 %: és tot el que decideix la nota d’aquell RA.</p></article>

    <article className="panel"><h2>3 · Què decideix cada RA</h2><p className="muted">Cada barra és un RA sencer. Cada bloc és una tasca, pintada pel seu tipus; com més ample, més pesa.</p>{typeLegend}
      {ras.map(r => { const parts = acts.filter(a => share(a, r.id) > 0).sort((a, b) => share(b, r.id) - share(a, r.id)); return <div className="rwxStack" key={r.id}><b>{r.code}</b><div><div className="rwxBar">{parts.map(a => <div key={a.id} style={{flex: share(a, r.id), background: color(a)}} title={`${a.name} (${a.unit}) · ${pct(share(a, r.id))} del ${r.code}`}/>)}</div><span className="muted" style={{fontSize: 11.5}}>{r.description.slice(0, 130)}</span></div><span className="muted" style={{fontSize: 12}}>{parts.length} tasques</span></div>; })}</article>

    <article className="panel"><h2>4 · Un exemple: una sola tasca, molts RA</h2><p className="muted">Una tasca pot comptar molt poc per a la nota del mòdul i, en canvi, pesar molt dins d’un RA.</p>
      <label className="noPrint" style={{display: "flex", gap: 8, alignItems: "center", fontSize: 13, margin: "0 0 12px"}}>Tasca de l’exemple<select value={ex.id} onChange={e => setExId(e.target.value)}>{acts.map(a => <option key={a.id} value={a.id}>{a.unit} · {a.name}</option>)}</select></label>
      <div className="rwxVs"><div><b>{ex.name}</b> · pes sobre el mòdul</div><div className="g">{pct(ex.global)}</div><div>… però dins d’un RA pot arribar a pesar</div><div className="g">{pct(maxEx, 0)}</div></div>
      <div className="rwxEx">{ras.map(r => <div key={r.id}><b>{r.code}</b><div className="big">{share(ex, r.id) ? pct(share(ex, r.id), 0) : "—"}</div><span>{caCount(ex.id, r.id)} de {criteriaOf(r.id).length} criteris</span></div>)}</div></article>
  </div>;
}
