import {useState} from "react";
import {createPortal} from "react-dom";
import {X} from "lucide-react";
import {calculateStudent} from "../../src/model/calculation";
import {newId, nowIso, type AcademicCourse, type Group} from "../../src/model/domain";
import {findGroup, type Mutate} from "../lib/helpers";

const fmt = (v: number) => v.toLocaleString("ca", {minimumFractionDigits: 2, maximumFractionDigits: 2});

/**
 * Ajusts del professor sobre la nota d'un RA o sobre la nota final del mòdul. Sempre amb motiu; la nota calculada es conserva i es mostra al costat.
 * Un ajust d'RA substitueix la nota de l'RA i no queda bloquejat per cap obligatòria; un ajust final decideix la nota del mòdul.
 */
export function AdjustmentsModal({course, group, enrollmentId, mutate, msg, close}: {course: AcademicCourse; group: Group; enrollmentId: string; mutate: Mutate; msg: (s: string) => void; close: () => void}) {
  const enrollment = group.enrollments.find(e => e.id === enrollmentId), student = group.students.find(s => s.id === enrollment?.studentId);
  const [draft, setDraft] = useState<Record<string, {value: string; reason: string}>>({});
  if (!enrollment || !student) return null;
  const calc = calculateStudent(course, group, enrollmentId);
  const ras = course.configuration.learningResults.filter(r => r.status === "active").sort((a, b) => a.order - b.order);
  const get = (key: string) => draft[key] ?? {value: "", reason: ""};
  const set = (key: string, patch: Partial<{value: string; reason: string}>) => setDraft(d => ({...d, [key]: {...get(key), ...patch}}));
  /** Posa (o treu, amb next = null) l'ajust d'un RA o el final, el registra i deixa l'estat anterior per poder-lo desfer. */
  const setAdjustment = (g: Group, raId: string | undefined, next: {value: number; reason: string} | null, logIt = true) => {
    const list = raId ? (g.raAdjustments ??= []) : (g.finalAdjustments ??= []);
    const idx = (list as {enrollmentId: string; raId?: string}[]).findIndex(a => a.enrollmentId === enrollmentId && a.raId === raId);
    const prev = idx >= 0 ? {value: list[idx].value, reason: list[idx].reason} : null;
    if (idx >= 0) list.splice(idx, 1);
    if (next) (list as unknown[]).push({id: newId("adj"), enrollmentId, ...(raId ? {raId} : {}), value: next.value, reason: next.reason, createdAt: nowIso()});
    if (logIt) (g.adjustmentLog ??= []).push({id: newId("adjlog"), enrollmentId, raId, at: nowIso(), previous: prev, next});
    return prev;
  };
  const [last, setLast] = useState<{raId?: string; label: string; previous: {value: number; reason: string} | null} | null>(null);
  const labelOf = (raId?: string) => raId ? ras.find(r => r.id === raId)?.code ?? "RA" : "la nota final";
  const apply = (kind: "ra" | "final", raId?: string) => {
    const key = kind === "final" ? "final" : raId!, {value: raw, reason} = get(key), value = Number(raw.replace(",", "."));
    if (!raw.trim() || !Number.isFinite(value) || value < 0 || value > 10) return msg("La nota ha d'estar entre 0 i 10.");
    if (!reason.trim()) return msg("Cal indicar el motiu de l'ajust.");
    let previous: {value: number; reason: string} | null = null;
    mutate(d => { previous = setAdjustment(findGroup(d, course.id, group.id), raId, {value, reason: reason.trim()}); });
    setLast({raId, label: labelOf(raId), previous});
    setDraft(d => { const {[key]: _, ...rest} = d; return rest; });
  };
  const remove = (kind: "ra" | "final", raId?: string) => {
    let previous: {value: number; reason: string} | null = null;
    mutate(d => { previous = setAdjustment(findGroup(d, course.id, group.id), raId, null); });
    setLast({raId, label: labelOf(raId), previous});
  };
  const undo = () => { if (!last) return; mutate(d => { setAdjustment(findGroup(d, course.id, group.id), last.raId, last.previous); }); setLast(null); };
  const input = {width: 70, border: "1px solid var(--line)", borderRadius: 7, padding: "4px 6px", textAlign: "right" as const};
  const reasonInput = {width: "100%", border: "1px solid var(--line)", borderRadius: 7, padding: "4px 6px"};
  const row = (key: string, kind: "ra" | "final", label: string, calculated: number, current: {value: number; reason: string} | undefined, raId?: string) =>
    <tr key={key}><td><b>{label}</b></td><td>{fmt(calculated)}</td>
      <td>{current ? <><b>{fmt(current.value)}</b><br/><small className="muted">{current.reason}</small></> : <span className="muted">—</span>}</td>
      <td><input aria-label={`Nova nota ${label}`} inputMode="decimal" placeholder="0–10" style={input} value={get(key).value} onChange={e => set(key, {value: e.target.value})}/></td>
      <td><input aria-label={`Motiu ${label}`} placeholder="Motiu (obligatori)" style={reasonInput} value={get(key).reason} onChange={e => set(key, {reason: e.target.value})}/></td>
      <td style={{whiteSpace: "nowrap"}}><button type="button" onClick={() => apply(kind, raId)}>Aplica</button>{current && <button type="button" style={{marginLeft: 6}} onClick={() => remove(kind, raId)}>Treu</button>}</td></tr>;
  const log = (group.adjustmentLog ?? []).filter(l => l.enrollmentId === enrollmentId).slice().reverse();
  const finalAdj = (group.finalAdjustments ?? []).find(a => a.enrollmentId === enrollmentId);
  return createPortal(<div className="modal" onKeyDown={e => { if (e.key === "Escape") close(); }}><div className="dialog" style={{width: "min(940px,100%)"}} role="dialog" aria-modal="true" aria-labelledby="adjustments-title">
    <div className="panelHeader"><h2 id="adjustments-title">Ajusts del professor · {student.name}</h2><button type="button" aria-label="Tancar" onClick={close}><X/></button></div>
    <p className="muted" style={{fontSize: 12.5, margin: "0 0 10px"}}>Decideix tu la nota d'un RA o la nota final del mòdul, a l'alça o a la baixa i sense límit. El motiu és obligatori i es conserva; la nota calculada no es perd. Un ajust d'RA substitueix la nota de l'RA i el deixa de bloquejar una obligatòria suspesa. Els ajustos sobre la nota d'una activitat es fan a Notes (botó ±).</p>
    <table><thead><tr><th>RA / mòdul</th><th>Calculada</th><th>Decidida</th><th>Nova nota</th><th>Motiu</th><th/></tr></thead>
      <tbody>
        {ras.map(ra => { const x = calc.learningResults.get(ra.id); return row(ra.id, "ra", ra.code, x?.adjusted ? x.adjusted.calculated : x?.score ?? 0, x?.adjusted ? {value: x.score, reason: x.adjusted.reason} : undefined, ra.id); })}
        {row("final", "final", "Nota final del mòdul", calc.finalAdjustment ? calc.finalAdjustment.calculated : calc.globalScore, finalAdj ? {value: finalAdj.value, reason: finalAdj.reason} : undefined)}
      </tbody></table>
    {last && <div className="undoBar" style={{margin: "10px 0"}}><span role="status">Canvi fet a {last.label}.</span><button type="button" onClick={undo}>Desfer</button></div>}
    {log.length > 0 && <details style={{marginTop: 10}}><summary>Historial d'ajustos ({log.length})</summary><ul className="reportList" style={{fontSize: 12}}>{log.map(l => <li key={l.id}>{new Date(l.at).toLocaleString("ca")} · {labelOf(l.raId)}: {l.previous ? fmt(l.previous.value) : "sense ajust"} → {l.next ? `${fmt(l.next.value)} (${l.next.reason})` : "ajust tret"}</li>)}</ul></details>}
    <div className="actionRow dialogActions"><button type="button" onClick={close}>Tanca</button></div>
  </div></div>, document.body);
}
