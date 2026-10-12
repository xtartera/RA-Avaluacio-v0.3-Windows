import {AlertTriangle, Check, X} from "lucide-react";
import {concludeObservation, OBSERVATION_ITEMS, OBSERVATION_LEVEL_LABEL, type GroupObservationSummary} from "../../src/model/observation";
import {blockStatus, diagnosticLevel, LEVEL_LABEL, type DiagnosticEvolution, type DiagnosticLevel} from "../../src/model/diagnostic";
import {getAttachment} from "../../src/model/repository";
import type {DiagnosticBlock, DiagnosticQuestion, DiagnosticResult, InitialObservation, ObservationLevel} from "../../src/model/domain";

const fmt = (n: number) => n.toLocaleString("ca", {minimumFractionDigits: 1, maximumFractionDigits: 1});
const LEVEL_STYLE: Record<DiagnosticLevel, {background: string; color: string}> = {
  alt: {background: "#e3f6ec", color: "#15825f"},
  adequat: {background: "#e6eefc", color: "#2f5fb3"},
  "en-proces": {background: "#fff3d6", color: "#8a6410"},
  suport: {background: "#fbe7ea", color: "#b23a4b"},
};
const BAR_STYLE = {domina: "#15825f", correcte: "var(--blue)", reforcar: "#c99a1c", prioritari: "#c54c5c"} as const;

export function LevelPill({score}: {score: number}) {
  const level = diagnosticLevel(score);
  return <span className="bonus" style={LEVEL_STYLE[level]}>Nivell {LEVEL_LABEL[level]}</span>;
}

/** Percentatge d'encerts per bloc, amb el nombre de preguntes i l'estat escrit (no només color). */
export function BlockBars({blocks}: {blocks: DiagnosticBlock[]}) {
  const wording = {domina: "domina", correcte: "correcte", reforcar: "cal reforçar", prioritari: "prioritari"} as const;
  return <div style={{display: "flex", flexDirection: "column", gap: 10}}>{blocks.map(b => {
    const status = blockStatus(b.pct);
    return <div key={b.number}>
      <div style={{display: "flex", justifyContent: "space-between", gap: 12, fontSize: 11.5, marginBottom: 4}}>
        <span>{b.number}. {b.title}</span>
        <b style={{whiteSpace: "nowrap"}}>{b.total > 0 && <>{b.correct} de {b.total} · </>}{Math.round(b.pct)} % <span className="muted" style={{fontWeight: 600}}>· {wording[status]}</span></b>
      </div>
      <div className="barTrack" role="img" aria-label={`${b.title}: ${Math.round(b.pct)} % d'encerts`}><i style={{width: `${b.pct}%`, background: BAR_STYLE[status]}}/></div>
    </div>;
  })}</div>;
}

export function QuestionList({questions}: {questions: DiagnosticQuestion[]}) {
  return <ol style={{margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8}}>{questions.map(q => <li key={q.number} style={{display: "grid", gridTemplateColumns: "22px 1fr", gap: 8, fontSize: 12, alignItems: "start"}}>
    <span style={{color: q.correct ? "#15825f" : "#c54c5c"}} aria-label={q.correct ? "Correcta" : "Incorrecta"}>{q.correct ? <Check size={15}/> : <X size={15}/>}</span>
    <div><div><b>{q.number}.</b> {q.text}</div>
      <div className="muted" style={{fontSize: 11.5}}>{q.unknown ? "Va respondre «No ho sé»" : q.answer.length ? <>{q.kind === "text" ? "Va escriure" : "Va marcar"}: <b style={{color: q.correct ? undefined : "#b23a4b"}}>{q.answer.join(" · ")}</b></> : "Sense resposta"}</div></div>
  </li>)}</ol>;
}

export async function downloadAttachment(result: DiagnosticResult, onError: (message: string) => void) {
  try {
    const blob = result.attachmentId ? await getAttachment(result.attachmentId) : null;
    if (!blob) return onError("No s'ha trobat la còpia del PDF en aquest navegador (només es desa en local, fora de la còpia JSON).");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob); link.download = result.fileName; link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  } catch (e) { onError(e instanceof Error ? e.message : String(e)); }
}

/** Comparació de les avaluacions inicials d'un alumne (UT1, UT2…): nota, nivell i lectura per UT. */
export function InitialEvolution({evolution}: {evolution: DiagnosticEvolution}) {
  const {rows, delta, sentences} = evolution;
  return <div>
    <div style={{display: "grid", gridTemplateColumns: `repeat(${rows.length}, minmax(0,1fr))`, gap: 14, marginBottom: 14}}>{rows.map(r => <div className="reportStat" key={r.result.id} style={{border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px"}}>
      <span style={{fontSize: 10, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: "#65738a"}}>{r.label}</span>
      <div style={{display: "flex", alignItems: "baseline", gap: 8, margin: "4px 0 8px"}}><strong style={{fontSize: 26}}>{fmt(r.result.score)}</strong><span className="muted" style={{fontSize: 11.5}}>sobre 10 · {r.result.correct} de {r.result.total}</span></div>
      <div className="barTrack" role="img" aria-label={`${r.label}: ${fmt(r.result.score)} sobre 10`}><i style={{width: `${r.result.score * 10}%`, background: "var(--blue)"}}/></div>
      <div style={{marginTop: 8, display: "flex"}}><LevelPill score={r.result.score}/></div>
    </div>)}</div>
    {delta !== null && <p style={{margin: "0 0 10px", fontSize: 13}}><b>{Math.abs(delta) < 0.5 ? "Estable" : delta > 0 ? `+${fmt(delta)} punts` : `−${fmt(-delta)} punts`}</b> <span className="muted">entre la {rows[0].label} i la {rows[rows.length - 1].label}</span></p>}
    <ul className="reportList" style={{marginTop: 0}}>{sentences.map((s, i) => <li key={i}>{s}</li>)}</ul>
  </div>;
}

const OBS_TONE: Record<ObservationLevel, string> = {1: "#c54c5c", 2: "#c99a1c", 3: "var(--blue)", 4: "#15825f"};

/** Observació a l'aula d'un alumne: nivell per ítem i frases. No mostra mai els factors de context ni la nota breu. */
export function ObservationBlock({observation, name}: {observation: InitialObservation | undefined; name: string}) {
  const c = concludeObservation(observation, name);
  if (!observation || !c.observed) return null;
  return <div style={{display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 22, alignItems: "start"}} className="diagnosticGrid">
    <div style={{display: "flex", flexDirection: "column", gap: 9}}>{OBSERVATION_ITEMS.map(item => {
      const level = observation.levels[item.key];
      return <div key={item.key}>
        <div style={{display: "flex", justifyContent: "space-between", gap: 12, fontSize: 11.5, marginBottom: 4}}><span>{item.label}</span><b style={{whiteSpace: "nowrap"}}>{level ? <>{level} de 4 <span className="muted" style={{fontWeight: 600}}>· {OBSERVATION_LEVEL_LABEL[level]}</span></> : <span className="muted" style={{fontWeight: 600}}>no observat</span>}</b></div>
        <div role="img" aria-label={`${item.label}: ${level ? `${level} de 4` : "no observat"}`} style={{display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 3}}>{[1, 2, 3, 4].map(n => <i key={n} style={{height: 8, borderRadius: 4, background: level && n <= level ? OBS_TONE[level] : "#edf1f5"}}/>)}</div>
      </div>;
    })}</div>
    <div>
      <ul className="reportList" style={{marginTop: 0}}>{c.sentences.map((s, i) => <li key={i}>{s}</li>)}</ul>
      {c.caution && <div className="warnNote" style={{marginTop: 10, marginBottom: 0}}><AlertTriangle size={15}/><span>{c.caution}</span></div>}
    </div>
  </div>;
}

/** Mitjana de l'observació a l'aula per ítem, a nivell de grup. */
export function GroupObservationBars({summary}: {summary: GroupObservationSummary}) {
  return <div style={{display: "flex", flexDirection: "column", gap: 10}}>{summary.items.map(item => <div key={item.key}>
    <div style={{display: "flex", justifyContent: "space-between", gap: 12, fontSize: 11.5, marginBottom: 4}}><span>{item.label}</span><b style={{whiteSpace: "nowrap"}}>{item.average === null ? <span className="muted">sense dades</span> : <>{item.average.toLocaleString("ca", {minimumFractionDigits: 1, maximumFractionDigits: 1})} de 4 <span className="muted" style={{fontWeight: 600}}>· {item.observed} alumnes</span></>}</b></div>
    <div className="barTrack" role="img" aria-label={`${item.label}: ${item.average === null ? "sense dades" : `${item.average.toFixed(1)} de 4`}`}><i style={{width: `${item.average === null ? 0 : item.average / 4 * 100}%`, background: "var(--blue)"}}/></div>
  </div>)}</div>;
}
