import {useMemo, useRef, useState} from "react";
import {AlertTriangle, ClipboardList, Eye, FileUp, FileText, Plus, Printer, Trash2, X} from "lucide-react";
import {applyDiagnosticResult, createDiagnosticActivity, deleteDiagnosticActivity, diagnosticActivities, removeDiagnosticResult, type ImportDiagnosticInput} from "../../src/controllers/diagnostics";
import {matchStudent, parseDiagnosticPdf, type ParsedDiagnostic} from "../../src/controllers/diagnosticParser";
import {blockStatus, concludeDiagnostic, summarizeGroupDiagnostic, unitLabel} from "../../src/model/diagnostic";
import {newId, type AcademicCourse, type DiagnosticResult, type Group} from "../../src/model/domain";
import {deleteAttachment, putAttachment} from "../../src/model/repository";
import {activePeople, findCourse, findGroup, type Mutate} from "../lib/helpers";
import {BlockBars, downloadAttachment, LevelPill, QuestionList} from "../components/diagnosticViews";
import {InitialReport} from "./InitialReport";
import {QUESTIONNAIRES_ENABLED} from "../../src/model/features";
import {InitialObservation} from "./InitialObservation";

interface Draft {
  key: string;
  fileName: string;
  buffer: ArrayBuffer | null;
  parsed: ParsedDiagnostic | null;
  error: string | null;
  enrollmentId: string;
  fuzzy: boolean;
  include: boolean;
}

const fmt = (n: number) => n.toLocaleString("ca", {minimumFractionDigits: 1, maximumFractionDigits: 1});
const PILL = {domina: {background: "#e3f6ec", color: "#15825f"}, correcte: {background: "#e6eefc", color: "#2f5fb3"}, reforcar: {background: "#fff3d6", color: "#8a6410"}, prioritari: {background: "#fbe7ea", color: "#b23a4b"}} as const;

export function InitialAssessment({course, group, mutate, msg}: {course: AcademicCourse; group: Group; mutate: Mutate; msg: (s: string) => void}) {
  const activities = diagnosticActivities(course);
  const [activityId, setActivityId] = useState(activities[0]?.id ?? "");
  const activity = activities.find(a => a.id === activityId) ?? activities[0];
  const [newName, setNewName] = useState(`Avaluació inicial UT${activities.length + 1}`);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const [view, setView] = useState<"qüestionaris" | "observacio">(QUESTIONNAIRES_ENABLED ? "qüestionaris" : "observacio");
  const [reportFor, setReportFor] = useState<{enrollmentId: string | null} | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const people = activePeople(group);
  // Les estadístiques del grup només compten l'alumnat actiu (com la resta de l'aplicació).
  const results = useMemo(() => { const active = new Set(group.enrollments.filter(e => e.status === "active").map(e => e.id)); return activity ? group.diagnostics.filter(r => r.activityId === activity.id && active.has(r.enrollmentId)) : []; }, [group.diagnostics, group.enrollments, activity]);
  const byEnrollment = new Map(results.map(r => [r.enrollmentId, r]));
  const summary = useMemo(() => summarizeGroupDiagnostic(results), [results]);
  const locked = !!activity && !!group.activityStates.find(s => s.activityId === activity.id)?.locked;
  const nameOf = (enrollmentId: string) => group.students.find(s => s.id === group.enrollments.find(e => e.id === enrollmentId)?.studentId)?.name ?? "Alumne desconegut";

  const create = () => {
    const name = newName.trim();
    if (!name) return;
    if (course.configuration.activities.some(a => a.name.trim().toLowerCase() === name.toLowerCase())) return msg("Ja existeix una activitat amb aquest nom.");
    const id = newId("activity");
    mutate(d => { createDiagnosticActivity(findCourse(d, course.id), name, id); });
    setActivityId(id); setNewName(`Avaluació inicial UT${activities.length + 2}`);
  };

  const readFiles = async (files: FileList | null) => {
    if (!files?.length || !activity) return;
    setBusy(true);
    const candidates = people.map(p => ({enrollmentId: p.enrollment.id, name: p.student.name}));
    const next: Draft[] = [];
    const {extractPdfItems} = await import("../../src/controllers/pdfText");
    for (const file of Array.from(files)) {
      const draft: Draft = {key: newId("draft"), fileName: file.name, buffer: null, parsed: null, error: null, enrollmentId: "", fuzzy: false, include: false};
      try {
        draft.buffer = await file.arrayBuffer();
        draft.parsed = parseDiagnosticPdf(await extractPdfItems(draft.buffer));
        const match = matchStudent(candidates, draft.parsed.firstName, draft.parsed.lastName);
        draft.enrollmentId = match?.enrollmentId ?? ""; draft.fuzzy = !!match?.fuzzy;
        draft.include = !!match;
      } catch (e) { draft.error = e instanceof Error ? e.message : String(e); }
      next.push(draft);
    }
    const seen = new Set(results.map(r => r.fingerprint).filter(Boolean));
    for (const d of next) if (d.parsed?.fingerprint) { if (seen.has(d.parsed.fingerprint)) { d.parsed.warnings.push("Aquest dossier (mateixa empremta) ja s'havia importat; es substituirà."); } seen.add(d.parsed.fingerprint); }
    setDrafts(old => [...old, ...next]);
    setBusy(false);
    if (fileInput.current) fileInput.current.value = "";
  };

  const confirmImport = async () => {
    if (!activity || locked) return;
    const ready = drafts.filter(d => d.include && d.parsed && d.buffer && d.enrollmentId);
    // Un alumne només pot tenir un resultat per activitat: el darrer de la llista guanya.
    const latest = new Map(ready.map(d => [d.enrollmentId, d]));
    const chosen = [...latest.values()];
    if (!chosen.length) return msg("No hi ha cap PDF seleccionat amb alumne assignat.");
    setBusy(true);
    try {
      const staleAttachments: string[] = [];
      const jobs: ImportDiagnosticInput[] = [];
      for (const d of chosen) {
        const attachmentId = newId("pdf");
        await putAttachment(attachmentId, new Blob([d.buffer!], {type: "application/pdf"}));
        const previous = group.diagnostics.find(r => r.activityId === activity.id && r.enrollmentId === d.enrollmentId);
        if (previous?.attachmentId) staleAttachments.push(previous.attachmentId);
        jobs.push({activityId: activity.id, enrollmentId: d.enrollmentId, parsed: d.parsed!, fileName: d.fileName, attachmentId});
      }
      mutate(db => { const g = findGroup(db, course.id, group.id); for (const job of jobs) applyDiagnosticResult(db, g, job); });
      await Promise.all(staleAttachments.map(deleteAttachment));
      msg(`${chosen.length} resultat(s) importat(s) a «${activity.name}». No afecten la nota del mòdul.`);
      setDrafts([]);
    } catch (e) { msg(e instanceof Error ? e.message : String(e)); }
    setBusy(false);
  };

  const remove = async (result: DiagnosticResult) => {
    if (!confirm(`Eliminar el resultat de ${nameOf(result.enrollmentId)} i la còpia del PDF? No es pot desfer.`)) return;
    mutate(d => { removeDiagnosticResult(d, findGroup(d, course.id, group.id), result.id); });
    if (result.attachmentId) await deleteAttachment(result.attachmentId).catch(() => undefined);
  };

  const removeActivity = async () => {
    if (!activity || prompt(`Escriu «${activity.name}» per eliminar l'avaluació inicial, els seus resultats i els PDF. Aquesta acció no es pot desfer.`) !== activity.name) return;
    const attachments = course.groups.flatMap(g => g.diagnostics.filter(r => r.activityId === activity.id).map(r => r.attachmentId).filter((x): x is string => !!x));
    mutate(d => { deleteDiagnosticActivity(d, findCourse(d, course.id), activity.id); });
    await Promise.all(attachments.map(id => deleteAttachment(id).catch(() => undefined)));
    setActivityId(activities.find(a => a.id !== activity.id)?.id ?? "");
  };

  const detailResult = results.find(r => r.id === detail);
  const blockHeaders = results[0]?.blocks ?? [];

  return <div className="managementScreen">
    <article className="panel managementPanel">
      <div className="managementHeader">
        <div className="managementTitle"><span className="sectionIcon"><ClipboardList/></span><div><h2>Avaluació inicial</h2><p>{QUESTIONNAIRES_ENABLED ? "Qüestionaris diagnòstics del quadern digital. " : "Observació a l’aula i resultats acumulats de la UT. "}<b>No compten per a la nota</b>, els RA ni els lliuraments: només serveixen per generar conclusions.</p></div></div>
        <div className="actionRow">
          {QUESTIONNAIRES_ENABLED && <div className="switch" role="group" aria-label="Vista"><button className={view === "qüestionaris" ? "active" : ""} aria-pressed={view === "qüestionaris"} onClick={() => setView("qüestionaris")}>Qüestionaris</button><button className={view === "observacio" ? "active" : ""} aria-pressed={view === "observacio"} onClick={() => setView("observacio")}>Observació</button></div>}
          {view === "qüestionaris" && <>
          <input aria-label="Nom de la nova avaluació inicial" value={newName} onChange={e => setNewName(e.target.value)} style={{border: "1px solid var(--line)", borderRadius: 9, padding: "8px 10px", minWidth: 220}}/>
          <button className="dark" onClick={create} disabled={!newName.trim()}><Plus/>Nova avaluació inicial</button>
          </>}
        </div>
      </div>
      {view === "observacio" ? <InitialObservation course={course} group={group} mutate={mutate} msg={msg} openReport={id => setReportFor({enrollmentId: id})}/> : !activity ? <div className="tableEmpty"><ClipboardList/><strong>Encara no hi ha cap avaluació inicial</strong><span>Crea-ne una (per exemple «Avaluació inicial UT1» i «Avaluació inicial UT2») i després importa-hi els PDF dels alumnes.</span></div> : <>
        <div className="managementToolbar" style={{alignItems: "end", gap: 14, flexWrap: "wrap"}}>
          <label style={{display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--muted)"}}>Avaluació<select value={activity.id} onChange={e => { setActivityId(e.target.value); setDrafts([]); setDetail(null); }}>{activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
          <div className="actionRow" style={{marginLeft: "auto"}}>
            <label className="buttonLike" style={{opacity: locked || busy ? .5 : 1}}><FileUp/>{busy ? "Llegint…" : "Importa PDF (un o diversos)"}<input ref={fileInput} hidden type="file" accept="application/pdf,.pdf" multiple disabled={locked || busy} onChange={e => void readFiles(e.target.files)}/></label>
            <button disabled={!results.length} style={{opacity: results.length ? 1 : .5}} onClick={() => setReportFor({enrollmentId: null})} title="Resum del grup i un informe per alumne, per imprimir-los tots"><Printer/>Informe del grup</button>
            <button onClick={() => void removeActivity()} title="Elimina l'avaluació amb els resultats i els PDF"><Trash2/>Elimina</button>
          </div>
        </div>
        {locked && <div className="warnNote"><AlertTriangle size={15}/><span>L'activitat està <b>bloquejada</b> a Notes: no s'hi poden importar resultats fins que es desbloquegi.</span></div>}
        <p className="muted" style={{margin: "0 22px 12px", fontSize: 12}}>Cada PDF és el dossier imprès del quadern digital d'un alumne. Es llegeix en aquest ordinador (res no surt d'aquí) i se'n guarda una còpia al navegador.</p>

        {drafts.length > 0 && <div style={{margin: "0 22px 18px"}} className="reportBlock">
          <h3>Previsualització de la importació · {drafts.filter(d => d.include).length} de {drafts.length} PDF seleccionats</h3>
          <div className="managementTableScroll"><table className="managementTable"><thead><tr><th>Importa</th><th>Fitxer</th><th>Nom al PDF</th><th>Alumne de l'aplicació</th><th>Nota</th><th>Avisos</th></tr></thead><tbody>{drafts.map(d => {
            const unit = d.parsed?.unit ?? null, mismatch = unit !== null && !new RegExp(`\\bUT\\s*${unit}\\b`, "i").test(activity.name);
            const existing = d.enrollmentId && byEnrollment.has(d.enrollmentId);
            const warnings = [...(d.parsed?.warnings ?? []), ...(mismatch ? [`Aquest PDF és de la UT${unit} i l'activitat és «${activity.name}».`] : []), ...(d.fuzzy ? [`El nom del PDF («${d.parsed?.firstName} ${d.parsed?.lastName}») s'assembla però no coincideix exactament amb l'alumne assignat: comprova-ho.`] : []), ...(existing ? ["Ja té un resultat en aquesta activitat; es substituirà."] : [])];
            return <tr key={d.key}>
              <td><input type="checkbox" aria-label={`Importa ${d.fileName}`} checked={d.include} disabled={!d.parsed || !d.enrollmentId} onChange={e => setDrafts(list => list.map(x => x.key === d.key ? {...x, include: e.target.checked} : x))}/></td>
              <td title={d.fileName} style={{maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{d.fileName}</td>
              <td>{d.parsed ? `${d.parsed.firstName} ${d.parsed.lastName}`.trim() || "—" : <span className="risk">—</span>}</td>
              <td>{d.parsed ? <select aria-label={`Alumne per a ${d.fileName}`} value={d.enrollmentId} onChange={e => setDrafts(list => list.map(x => x.key === d.key ? {...x, enrollmentId: e.target.value, fuzzy: false, include: !!e.target.value} : x))}><option value="">— Tria l'alumne —</option>{people.map(p => <option key={p.enrollment.id} value={p.enrollment.id}>{p.student.name}</option>)}</select> : "—"}</td>
              <td><b>{d.parsed ? fmt(d.parsed.score) : "—"}</b></td>
              <td style={{fontSize: 11.5}}>{d.error ? <span className="risk"><AlertTriangle size={13}/> {d.error}</span> : warnings.length ? <span style={{color: "#7a5c0c"}}>{warnings.join(" ")}</span> : <span className="ok">Correcte</span>}</td>
            </tr>; })}</tbody></table></div>
          <div className="actionRow" style={{marginTop: 12}}><button onClick={() => setDrafts([])}><X/>Descarta</button><button className="primaryAction" disabled={busy || locked || !drafts.some(d => d.include && d.enrollmentId)} onClick={() => void confirmImport()}><FileUp/>Importa els seleccionats</button></div>
        </div>}

        {results.length > 0 && <div style={{margin: "0 22px 18px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14}}>
          <div className="reportBlock"><h3>Resum del grup · {results.length} de {people.length} alumnes</h3>
            <div style={{display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12}}><strong style={{fontSize: 24}}>{fmt(summary.averageScore)}</strong><span className="muted" style={{alignSelf: "center"}}>nota mitjana</span>{(["alt", "adequat", "en-proces", "suport"] as const).map(l => summary.levels[l] > 0 && <span className="bonus" key={l}>{summary.levels[l]} amb nivell {l === "suport" ? "de suport" : l === "en-proces" ? "en procés" : l}</span>)}</div>
            <BlockBars blocks={summary.blocks.map(b => ({number: b.number, title: b.title, correct: 0, wrong: 0, unknown: 0, total: 0, pct: b.averagePct, minutes: null}))}/>
            <p className="muted" style={{fontSize: 11, margin: "10px 0 0"}}>«No ho sé»: {Math.round(summary.unknownPct)} % de les respostes.</p>
          </div>
          <div className="reportBlock"><h3>Preguntes més fallades</h3>
            {summary.hardest.length ? <ol style={{margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8, fontSize: 12}}>{summary.hardest.map(h => <li key={h.question.number}><b>{Math.round(h.failPct)} % de fallades</b> · P{h.question.number}: {h.question.text}{h.commonWrong && <div className="muted" style={{fontSize: 11}}>Errada més repetida ({h.commonWrong.count}): «{h.commonWrong.answer}»</div>}</li>)}</ol> : <p className="muted" style={{fontSize: 12}}>Cap pregunta supera el 40 % de fallades.</p>}
          </div>
        </div>}

        <div className="managementTableScroll"><table className="managementTable"><thead><tr><th>Alumne</th><th>Nota</th><th>Nivell</th>{blockHeaders.map(b => <th key={b.number} title={b.title}>B{b.number}</th>)}<th>Temps</th><th>Accions</th></tr></thead><tbody>{people.map(({student, enrollment}) => {
          const r = byEnrollment.get(enrollment.id);
          if (!r) return <tr key={enrollment.id}><td><strong>{student.name}</strong></td><td colSpan={3 + blockHeaders.length} className="muted">Sense qüestionari importat</td><td><div className="actionRow"><button onClick={() => setReportFor({enrollmentId: enrollment.id})} aria-label={`Informe de ${student.name}`} title="Informe amb els resultats acumulats de la UT i l'observació (sense qüestionari)"><FileText/></button></div></td></tr>;
          return <tr key={enrollment.id}>
            <td><strong>{student.name}</strong>{r.warnings.length > 0 && <span title={r.warnings.join("\n")} style={{marginLeft: 6, color: "#c99a1c"}}><AlertTriangle size={13} aria-label="Té avisos"/></span>}</td>
            <td><b>{fmt(r.score)}</b></td>
            <td><LevelPill score={r.score}/></td>
            {blockHeaders.map(h => { const b = r.blocks.find(x => x.number === h.number); return <td key={h.number}>{b ? <span className="bonus" style={PILL[blockStatus(b.pct)]} title={`${b.title}: ${b.correct} de ${b.total}`}>{Math.round(b.pct)} %</span> : "—"}</td>; })}
            <td style={{whiteSpace: "nowrap", fontSize: 12}}>{r.activeMinutes !== null ? `${r.activeMinutes} min` : "—"}</td>
            <td><div className="actionRow"><button onClick={() => setDetail(r.id)} aria-label={`Detall de ${student.name}`} title="Veure les preguntes i la conclusió"><Eye/></button><button onClick={() => setReportFor({enrollmentId: enrollment.id})} aria-label={`Informe d'avaluació inicial de ${student.name}`} title="Informe d'avaluació inicial d'aquest alumne"><FileText/></button><button onClick={() => void remove(r)} aria-label={`Elimina el resultat de ${student.name}`} title="Elimina el resultat"><Trash2/></button></div></td>
          </tr>; })}</tbody></table>{!people.length && <div className="tableEmpty"><strong>El grup no té alumnes actius</strong></div>}</div>
      </>}
    </article>

    {reportFor && (activity || reportFor.enrollmentId) && <InitialReport course={course} group={group} activityId={reportFor.enrollmentId ? null : activity!.id} enrollmentId={reportFor.enrollmentId} mutate={mutate} close={() => setReportFor(null)}/>}

    {detailResult && <div className="modal" onKeyDown={e => { if (e.key === "Escape") setDetail(null); }}><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="diag-detail-title" style={{width: "min(820px,100%)", maxHeight: "88vh", overflowY: "auto"}}>
      <div className="panelHeader"><h2 id="diag-detail-title">{nameOf(detailResult.enrollmentId)} · {unitLabel(detailResult)}</h2><button aria-label="Tanca" autoFocus onClick={() => setDetail(null)}><X/></button></div>
      <div style={{display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap", margin: "4px 0 12px"}}><strong style={{fontSize: 26}}>{fmt(detailResult.score)}</strong><span className="muted">sobre 10 · {detailResult.correct} de {detailResult.total}</span><LevelPill score={detailResult.score}/></div>
      <BlockBars blocks={detailResult.blocks}/>
      <p style={{fontSize: 13, lineHeight: 1.55, margin: "16px 0"}}>{concludeDiagnostic(detailResult, results, nameOf(detailResult.enrollmentId)).text}</p>
      <div className="muted" style={{fontSize: 11.5, margin: "0 0 14px"}}>Temps registrat: {detailResult.activeMinutes ?? "—"} min d'activitat · {detailResult.estimatedMinutes ?? "—"} min estimats · {detailResult.sessions ?? "—"} sessió(ns) · {detailResult.integrity ?? "integritat desconeguda"}{detailResult.fingerprint ? ` · ${detailResult.fingerprint}` : ""}</div>
      <QuestionList questions={detailResult.questions}/>
      <div className="actionRow dialogActions" style={{marginTop: 16}}>{detailResult.attachmentId && <button onClick={() => void downloadAttachment(detailResult, msg)}>Descarrega el PDF original</button>}<button className="primaryAction" onClick={() => setDetail(null)}>Tanca</button></div>
    </div></div>}
  </div>;
}
