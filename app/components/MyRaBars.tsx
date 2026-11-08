import {useMemo} from "react";
import type {AcademicCourse, Group} from "../../src/model/domain";
import {raContributions} from "../../src/model/raContributions";
import {summarizeStudent, type RaState} from "../../src/model/studentSummary";
import {TYPE_COLORS} from "./RaWeightsExplainer";

const pct = (v: number) => `${(v * 100).toLocaleString("ca", {maximumFractionDigits: 0})} %`;
const n1 = (v: number) => v.toLocaleString("ca", {minimumFractionDigits: 1, maximumFractionDigits: 1});
const n2 = (v: number) => v.toLocaleString("ca", {minimumFractionDigits: 2, maximumFractionDigits: 2});
const gradeColor = (g: number) => g >= 7 ? "#22a06b" : g >= 5 ? "#e0a31a" : "#d64558";
const STATE: Record<RaState, {bg: string; fg: string; label: string}> = {
  assolit: {bg: "#dff3e4", fg: "#1d6b48", label: "Assolit"},
  "no-assolit": {bg: "#f9dcdc", fg: "#a12f40", label: "No assolit"},
  "en-curs": {bg: "#e6eefc", fg: "#2f5fb3", label: "En curs"},
};

/**
 * «El meu RA»: una barra per RA amb un bloc per tasca (l'ample és el pes dins l'RA). El color omple el que l'alumne ha
 * aconseguit; el ratllat gris és el que encara no té nota. Mostra l'estat de l'RA (assolit, no assolit, en curs) amb la causa
 * i la nota acumulada de la graella. Un RA amb una obligatòria suspesa amaga la nota fins que es revela (`revealed` / `onToggle`).
 */
export function MyRaBars({course, group, enrollmentId, report = false, revealed, onToggle, title, hideScores = false, showAllScores = false}: {course: AcademicCourse; group: Group; enrollmentId: string; report?: boolean; revealed?: Set<string>; onToggle?: (raId: string) => void; title?: string; /** Sense cap xifra (ni nota de l'RA ni notes de les tasques): només colors, estats i causes. */ hideScores?: boolean; /** Mostra la nota de cada RA, també dels amb obligatòria suspesa (per defecte l'amaga fins que es revela). */ showAllScores?: boolean}) {
  const ras = useMemo(() => raContributions(course, group, enrollmentId), [course, group, enrollmentId]);
  const summary = useMemo(() => summarizeStudent(course, group, enrollmentId), [course, group, enrollmentId]);
  const typeIndex = new Map(course.configuration.activityTypes.filter(t => t.status === "active").map((t, i) => [t.id, i]));
  if (!report && !ras.some(r => r.graded > 0)) return null;
  const Wrap = report ? "div" : "article";
  const heading = title ?? "El meu RA: què porto i què em falta";
  return <Wrap className={report ? "reportBlock tightPrint rwxSplit" : "panel"} style={report ? {margin: "14px 0"} : {marginBottom: 16}}>
    {report ? <h3>{heading}</h3> : <div className="panelHeader"><h2>{heading}</h2><span className="muted" style={{fontSize: 11}}>cada bloc és una tasca; l’ample és el pes dins l’RA</span></div>}
    <div className="rwxKeys"><span><i style={{background: "#22a06b"}}/>Nota alta</span><span><i style={{background: "#e0a31a"}}/>Aprovat just</span><span><i style={{background: "#d64558"}}/>Per sota de 5</span><span><i className="hatch"/>Encara sense nota</span></div>
    {ras.map(r => {
      const missing = r.parts.filter(p => p.grade === null).reduce((s, p) => s + p.share, 0);
      const sr = summary.ras.find(q => q.code === r.code), state: RaState = sr?.state ?? "en-curs", st = STATE[state];
      const hidden = !!sr?.requiredFailed && !showAllScores && !(revealed?.has(r.raId));
      return <div className="rwxMe" key={r.raId} style={hideScores ? {gridTemplateColumns: "90px minmax(0, 1fr)"} : undefined}>
        <div><b title={r.description}>{r.code}</b><br/><span className="bonus" style={{background: st.bg, color: st.fg, fontWeight: 800, fontSize: 10.5, whiteSpace: "nowrap"}}>{st.label}</span></div>
        <div><span className="muted" style={{fontSize: 10.5, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{r.description}</span>
          <div className="rwxMeBar">{r.parts.map(p => <div key={p.activityId} className="seg" style={{flex: p.share}} title={`${p.name} (${p.unitName}) · ${pct(p.share)} del ${r.code} · ${p.grade === null ? "encara sense nota" : hideScores ? "ja té nota" : `nota ${n1(p.grade)}`}`}>{p.grade !== null && <div className="fill" style={{height: `${Math.max(0, Math.min(100, p.grade * 10))}%`, background: gradeColor(p.grade)}}/>}<i className="tdot" style={{background: TYPE_COLORS[(typeIndex.get(p.typeId) ?? 0) % TYPE_COLORS.length]}}/></div>)}</div>
          <span className="muted" style={{fontSize: 11}}>{pct(1 - missing)} del {r.code} ja té nota · queda un {pct(missing)} per fer</span>
          {state === "no-assolit" && sr?.causes.length ? <span style={{display: "block", fontSize: 11, color: "#8f3742"}}>{sr.causes.join("; ")}</span> : null}</div>
        {!hideScores && <div className="rwxScore">{hidden ? <span style={{fontSize: 13, color: "#a12f40"}}>No assolit</span> : n2(r.earned)}<small>{hidden ? "nota amagada" : "nota de la graella"}</small>{sr?.requiredFailed && onToggle && <button className="noPrint" style={{border: 0, background: "none", color: "var(--blue)", fontSize: 10, fontWeight: 700, cursor: "pointer", padding: 0}} onClick={() => onToggle(r.raId)}>{hidden ? "Mostra nota" : "Amaga"}</button>}</div>}
      </div>;
    })}
  </Wrap>;
}
