import type {ElementType, ReactNode} from "react";
import {Users} from "lucide-react";
import type {ActivityInsight} from "../../src/model/calculation";
import type {Activity} from "../../src/model/domain";

export type Tone = "green" | "amber" | "blue" | "red";
export type ActivityRow = ActivityInsight & {activity: Activity};

export const DONUT_COLORS = ["#c54c5c", "#bfe8d5", "#7fd1ac", "#3aab7c", "#15825f"];

export function KpiCard({tone, icon, label, value, sub, trend, hint, onExpand}: {tone: string; icon: ReactNode; label: string; value: string; sub: string; trend?: {icon: ElementType; tone: string; text: string}; hint?: string; onExpand?: () => void}) {
 return <article className={`kpiCard tone-${tone}`} title={hint}><label>{icon}{label}{onExpand && <button type="button" className="kpiExpand" onClick={onExpand} aria-label="Veure alumnes"><Users size={14}/></button>}</label><strong>{value}</strong><span>{sub}</span>{trend && <span className={`kpiTrend tone-${trend.tone}`}><trend.icon size={12}/>{trend.text}</span>}</article>;
}

export interface TrendSeries {label: string; color: string; points: {label: string; value: number}[]; dashed?: boolean; showValues?: boolean}

export function TrendLine({series}: {series: TrendSeries[]}) {
 const w = 320, h = 130, pad = 26, max = 10;
 const pointCount = series[0]?.points.length ?? 0;
 const stepX = pointCount > 1 ? (w - pad * 2) / (pointCount - 1) : 0;
 return <>
  <svg viewBox={`0 0 ${w} ${h}`} style={{width: "100%", height: h}}>
   <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="var(--line)"/>
   {series.map(s => {
    const coords = s.points.map((p, i) => ({...p, x: pad + i * stepX, y: h - pad - p.value / max * (h - pad * 2)}));
    const path = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x},${c.y}`).join(" ");
    return <g key={s.label}>
     <path d={path} fill="none" stroke={s.color} strokeWidth={2.5} strokeDasharray={s.dashed ? "4 4" : undefined}/>
     {coords.map(c => <circle key={c.label} cx={c.x} cy={c.y} r={4} fill={s.color}/>)}
     {s.showValues !== false && coords.map(c => <text key={c.label + "v"} x={c.x} y={c.y - 11} textAnchor="middle" fontSize={12} fontWeight={800} fill="var(--ink)">{c.value.toFixed(2)}</text>)}
    </g>;
   })}
   {series[0]?.points.map((p, i) => <text key={p.label} x={pad + i * stepX} y={h - 8} textAnchor="middle" fontSize={10} fill="var(--muted)">{p.label}</text>)}
  </svg>
  {series.length > 1 && <div style={{display: "flex", gap: 14, justifyContent: "center", marginTop: 4}}>{series.map(s => <span key={s.label} style={{display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--muted)"}}><i style={{width: 8, height: 8, borderRadius: 4, background: s.color, display: "inline-block"}}/>{s.label}</span>)}</div>}
 </>;
}

export function EvoBar({tone, label, count, total}: {tone: string; label: string; count: number; total: number}) {
 const pct = total ? count / total * 100 : 0;
 return <div className="evoBar">
  <div className="evoBarLabel"><span>{label}</span><b>{count} <em>({pct.toFixed(0)}%)</em></b></div>
  <div className="barTrack"><i className={`tone-${tone}`} style={{width: `${pct}%`}}/></div>
 </div>;
}

export function Donut({bands, total, colors = DONUT_COLORS, centerLabel = "alumnes"}: {bands: {label: string; range: string; cls: string; count: number}[]; total: number; colors?: string[]; centerLabel?: string}) {
 const size = 150, r = 60, stroke = 22, cx = size / 2, cy = size / 2, circumference = 2 * Math.PI * r;
 let acc = 0;
 return <div style={{width: size, height: size, position: "relative", flexShrink: 0}}>
  <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
   <g transform={`rotate(-90 ${cx} ${cy})`}>
    {total ? bands.map((b, i) => ({b, i})).filter(x => x.b.count > 0).map(({b, i}) => {
     const frac = b.count / total;
     const len = Math.max(0, frac * circumference - (bands.length > 1 ? 2 : 0));
     const offset = -acc;
     acc += frac * circumference;
     return <circle key={b.label} cx={cx} cy={cy} r={r} fill="none" stroke={colors[i]} strokeWidth={stroke} strokeDasharray={`${len} ${circumference - len}`} strokeDashoffset={offset} style={{cursor: "default"}}><title>{`${b.label}: ${b.count} alumnes (${(frac * 100).toFixed(1)}%)`}</title></circle>;
    }) : <circle cx={cx} cy={cy} r={r} fill="none" stroke="#edf1f5" strokeWidth={stroke}/>}
   </g>
  </svg>
  <div style={{position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none"}}><div style={{textAlign: "center"}}><strong style={{fontSize: 20, display: "block"}}>{total}</strong><span style={{fontSize: 10, color: "var(--muted)"}}>{centerLabel}</span></div></div>
 </div>;
}

export function DiagList({items}: {items: {tone: Tone; icon: ElementType; text: string}[]}) {
 return <div className="diagList">{items.map((d, i) => {const Icon = d.icon; return <div className={"diagItem d" + d.tone.charAt(0).toUpperCase() + d.tone.slice(1)} key={i}><Icon size={16}/><span>{d.text}</span></div>})}</div>;
}

export function GradeBand({score, riskThreshold, provisional = false}: {score: number; riskThreshold: number; provisional?: boolean}) {
 const segments = [{to: 5, color: DONUT_COLORS[0]}, {to: 6, color: DONUT_COLORS[1]}, {to: 7, color: DONUT_COLORS[2]}, {to: 9, color: DONUT_COLORS[3]}, {to: 10, color: DONUT_COLORS[4]}];
 let from = 0;
 const pct = Math.min(100, Math.max(0, score / 10 * 100));
 const situation = provisional ? "Provisional: encara no hi ha prou evidència" : score < riskThreshold ? "Situació crítica" : score < 5 ? "Zona límit" : score < 7 ? "Assoliment satisfactori" : score < 9 ? "Bon assoliment" : "Assoliment excel·lent";
 return <div>
  <div style={{position: "relative", marginTop: 22}}>
   <div style={{display: "flex", height: 14, borderRadius: 8, overflow: "hidden"}}>{segments.map(s => {const width = (s.to - from) / 10 * 100; from = s.to; return <div key={s.to} style={{width: `${width}%`, background: s.color}}/>})}</div>
   <div style={{position: "absolute", top: -20, left: `${pct}%`, transform: "translateX(-50%)", fontWeight: 800, fontSize: 13}}>{score.toFixed(2)}</div>
   <div style={{position: "absolute", top: 14, left: `${pct}%`, transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "6px solid var(--ink)"}}/>
  </div>
  <p style={{margin: "16px 0 0", fontSize: 13}}><strong>Situació:</strong> {situation}</p>
 </div>;
}

export function ActivitySubPanel({tone, title, rows, metric, cell}: {tone: string; title: string; rows: ActivityRow[]; metric: string; cell: (row: ActivityRow) => string}) {
 return <div className={`actSub tone-${tone}`}>
  <h3>{title}</h3>
  {rows.length ? <table><thead><tr><th>Activitat</th><th>{metric}</th></tr></thead><tbody>{rows.slice(0, 5).map(r => <tr key={r.activityId}><td>{r.activity.name}</td><td>{cell(r)}</td></tr>)}</tbody></table> : <p className="muted">Sense dades per a aquesta categoria.</p>}
 </div>;
}
