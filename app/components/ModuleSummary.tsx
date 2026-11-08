import type {StudentSummary, SummaryStatus} from "../../src/model/studentSummary";

/** Explicació de la nota projectada, igual a tots els informes. */
export const PROJECTED_NOTE = "La nota projectada és la nota que s'espera que l'alumne obtingui al final de curs segons el seu rendiment actual. És un càlcul aproximat i pot ser ben diferent de la realitat: una estimació del professorat a partir del rendiment que mostra l'alumne ara, no una nota definitiva.";

const STATUS: Record<SummaryStatus, {bg: string; fg: string; label: string}> = {
  superat: {bg: "#dff3e4", fg: "#1d6b48", label: "Superat de moment"},
  "no-superat": {bg: "#f9dcdc", fg: "#a12f40", label: "No superat de moment"},
  pendent: {bg: "#e6eefc", fg: "#2f5fb3", label: "Pendent d'avaluar"},
};

const n2 = (v: number) => v.toLocaleString("ca", {minimumFractionDigits: 2, maximumFractionDigits: 2});

/** Nota projectada del mòdul (la mateixa a l'informe breu i al complet). */
export function ProjectedScore({summary}: {summary: StudentSummary}) {
  const st = STATUS[summary.status], color = summary.status === "pendent" ? "#6b7a92" : st.fg;
  return <div className="bigScore" style={{marginRight: 12}}><span>NOTA PROJECTADA DEL MÒDUL</span><strong style={{color}}>{n2(summary.projected)}</strong><em>{summary.provisional ? "provisional · " : ""}avaluat el {Math.round(summary.coverage)} %</em>{summary.status === "no-superat" && <div style={{marginTop: 6}}><span className="bonus" style={{background: st.bg, color: st.fg, fontWeight: 800, fontSize: 10.5, padding: "3px 10px", textTransform: "none", letterSpacing: 0, display: "inline-block"}}>Cal recuperar algun RA</span></div>}</div>;
}

const listJoin = (items: string[]) => items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} i ${items[items.length - 1]}`;

/** Estat de cada RA en llenguatge clar: avaluat completament (amb mancances o no) o encara pendent. */
function raProgress(summary: StudentSummary) {
  const done = summary.ras.filter(r => r.evaluated);
  const early = summary.ras.filter(r => !r.evaluated && r.state === "no-assolit");
  const pending = summary.ras.filter(r => !r.evaluated && r.state !== "no-assolit");
  return {done, early, pending};
}

/** Estat del mòdul (superat o no de moment), causes, estat de l'avaluació per RA i l'explicació de la nota projectada. */
export function ModuleSummary({summary}: {summary: StudentSummary}) {
  const st = STATUS[summary.status];
  const {done, early, pending} = raProgress(summary);
  const pendingCodes = pending.map(r => r.code);
  return <>
    <div style={{margin: "12px 0 6px"}}><span className="bonus" style={{background: st.bg, color: st.fg, fontWeight: 800, fontSize: 13, padding: "5px 14px"}}>{st.label}</span></div>
    {summary.status === "no-superat" && <div className="reportBlock reinforceCard tightPrint" style={{margin: "10px 0"}}><h3>Causa</h3><ul className="reportList" style={{marginTop: 0}}>{summary.causes.map((c, i) => <li key={i}>{c}</li>)}</ul>{summary.requiredFailed.length > 0 && <p style={{fontSize: 11.5, margin: "6px 0 0"}}>Les activitats obligatòries s'han de superar per assolir els RA, independentment de la resta de resultats.</p>}</div>}
    {summary.status === "pendent" && <p className="muted" style={{fontSize: 12, margin: "6px 0"}}>Encara no hi ha prou activitats avaluades per valorar el mòdul: la nota projectada és provisional.</p>}
    <div className="reportBlock tightPrint" style={{margin: "10px 0"}}><h3>Com va l'avaluació dels RA</h3>
      <ul className="reportList" style={{marginTop: 0}}>
        {done.map(r => <li key={r.code}><b>{r.code}</b>: avaluat completament ({listJoin(r.units)} corregida) · {r.state === "assolit" ? <b style={{color: "#1d6b48"}}>assolit</b> : <><b style={{color: "#a12f40"}}>no assolit</b>; hi ha mancances: {r.causes.join("; ") || "la nota no arriba al mínim exigit"}.</>}</li>)}
        {early.map(r => <li key={r.code}><b>{r.code}</b>: encara falta corregir activitats ({listJoin(r.units)}), però ja hi ha mancances: {r.causes.join("; ")}.</li>)}
        {pending.length > 0 && <li><b>{listJoin(pendingCodes)}</b>: encara pendents d'avaluar ({listJoin([...new Set(pending.flatMap(r => r.units))])}).</li>}
        {!done.length && !early.length && !pending.length && <li>Encara no hi ha cap RA configurat.</li>}
      </ul>
      <p style={{fontSize: 11.5, margin: "6px 0 0"}}>El mòdul queda <b>superat</b> si se superen <b>tots i cadascun dels RA</b> que el componen, però fins a final de curs no es pot assegurar{pendingCodes.length ? <>: a mesura que s'avaluïn {listJoin(pendingCodes)} poden aparèixer noves causes, i les actuals poden desaparèixer si es recuperen les mancances</> : <>: mentre hi hagi mancances, es poden recuperar a la convocatòria extraordinària</>}.</p>
    </div>
    <p className="muted" style={{fontSize: 11, margin: "6px 0 10px"}}><b>Nota projectada.</b> {PROJECTED_NOTE.replace("La nota projectada és ", "És ")}</p>
  </>;
}
