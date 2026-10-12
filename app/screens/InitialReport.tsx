import {ReportLogo} from "../components/shared";
import {useState} from "react";
import {createPortal} from "react-dom";
import {AlertTriangle, ClipboardList, MessageSquarePlus, Printer, Save, X} from "lucide-react";
import {compareDiagnostics, concludeDiagnostic, diagnosticLevel, orderByUnit, summarizeGroupDiagnostic, unitLabel, unitTopic, LEVEL_LABEL} from "../../src/model/diagnostic";
import type {AcademicCourse, DiagnosticResult, Group} from "../../src/model/domain";
import {findGroup, type Mutate} from "../lib/helpers";
import {BlockBars, GroupObservationBars, InitialEvolution, LevelPill, ObservationBlock, QuestionList} from "../components/diagnosticViews";
import {hasObservation, summarizeGroupObservation} from "../../src/model/observation";

const fmt = (n: number) => n.toLocaleString("ca", {minimumFractionDigits: 1, maximumFractionDigits: 1});
const nameOf = (group: Group, enrollmentId: string) => group.students.find(s => s.id === group.enrollments.find(e => e.id === enrollmentId)?.studentId)?.name ?? "Alumne";

/**
 * Informe d'avaluació inicial: document propi, independent de l'informe individual del curs
 * (no barreja notes ordinàries, RA ni projeccions). Ho pot mostrar per a un alumne o per a tot el grup.
 */
export function InitialReport({course, group, activityId, enrollmentId, mutate, close}: {course: AcademicCourse; group: Group; activityId: string | null; enrollmentId: string | null; mutate: Mutate; close: () => void}) {
  const activities = course.configuration.activities.filter(a => a.session === "diagnostica");
  const activity = activities.find(a => a.id === activityId);
  // Per a un alumne sense activitat concreta: totes les seves avaluacions inicials (UT1, UT2…), una pàgina per UT.
  const activeIds = new Set(group.enrollments.filter(e => e.status === "active").map(e => e.id));
  const activePeers = group.diagnostics.filter(r => activeIds.has(r.enrollmentId));
  const all = group.diagnostics.filter(r => r.activityId === activityId && activeIds.has(r.enrollmentId)).sort((a, b) => nameOf(group, a.enrollmentId).localeCompare(nameOf(group, b.enrollmentId), "ca"));
  const mine = group.diagnostics.filter(r => r.enrollmentId === enrollmentId && (!activityId || r.activityId === activityId) && activities.some(a => a.id === r.activityId));
  const results = enrollmentId ? orderByUnit(mine) : all;
  const pendingNames = enrollmentId && !activityId ? activities.filter(a => !mine.some(r => r.activityId === a.id)).map(a => a.name) : [];
  const evolution = enrollmentId && !activityId && results.length > 0 ? compareDiagnostics(results, nameOf(group, enrollmentId), pendingNames) : null;
  const showSummary = !!evolution && (results.length > 1 || pendingNames.length > 0);
  // Observació a l'aula (només a l'informe d'un alumne; mai no mostra factors de context ni la nota breu).
  const obs = enrollmentId ? group.observations.find(o => o.enrollmentId === enrollmentId) : undefined;
  const hasObs = hasObservation(obs);
  const groupObs = summarizeGroupObservation(group.observations.filter(o => activeIds.has(o.enrollmentId)), activeIds.size);
  const observationBlock = (name: string) => <div className="reportBlock tightPrint" style={{margin: "18px 0"}}><h3>Observació a l’aula · no compta per a la nota</h3><ObservationBlock observation={obs} name={name}/></div>;
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const single = !!enrollmentId;
  const commentOf = (r: DiagnosticResult) => drafts[r.id] ?? r.comment ?? "";
  const save = () => { mutate(d => { const g = findGroup(d, course.id, group.id); for (const [id, text] of Object.entries(drafts)) { const r = g.diagnostics.find(x => x.id === id); if (r) r.comment = text.trim() || undefined; } }); setDrafts({}); setDirty(false); };
  const summary = summarizeGroupDiagnostic(all);

  // Portal al <body>: fora de <main>, que s'amaga en imprimir.
  return createPortal(<div className="modal"><div className="report initialReport" role="dialog" aria-modal="true" aria-labelledby="initial-report-title">
    <div className="noPrint reportActions"><button onClick={close} autoFocus><X/>Tanca</button>{single && <button onClick={save} disabled={!dirty}><Save/>Desa</button>}<button className="dark" onClick={() => window.print()}><Printer/>Imprimeix</button></div>
    {showSummary && evolution && <section className="initialPage"><ReportLogo/>
      <div className="reportHead"><ClipboardList/><div><small>INFORME D’AVALUACIÓ INICIAL · RESUM</small><h1 id="initial-report-title">{nameOf(group, enrollmentId!)}</h1><p>{course.configuration.level} · Grup {group.code} · {course.academicYear}</p></div></div>
      <div className="reportBlock tightPrint" style={{margin: "18px 0"}}><h3>Comparació de les avaluacions inicials</h3><InitialEvolution evolution={evolution}/></div>
      {hasObs && observationBlock(nameOf(group, enrollmentId!))}
      <p className="muted" style={{fontSize: 10.5}}>Les UT tenen blocs diferents: la comparació es fa amb la nota global i el nivell. Descriu dades i no substitueix el criteri docent. No compta per a la nota del mòdul.</p>
      <footer>{course.configuration.moduleName} · Avaluació inicial · Dades locals</footer>
    </section>}

    {single && !results.length && hasObs && <section className="initialPage"><ReportLogo/>
      <div className="reportHead"><ClipboardList/><div><small>INFORME D’AVALUACIÓ INICIAL · OBSERVACIÓ</small><h1 id="initial-report-title">{nameOf(group, enrollmentId!)}</h1><p>{course.configuration.level} · Grup {group.code} · {course.academicYear}</p></div></div>
      {observationBlock(nameOf(group, enrollmentId!))}
      <footer>{course.configuration.moduleName} · Avaluació inicial · Dades locals</footer>
    </section>}

    {!results.length && !hasObs && <><h1 id="initial-report-title">Avaluació inicial</h1><p role="status">No hi ha resultats importats per a aquesta avaluació.</p></>}

    {!single && results.length > 0 && <section className="initialPage"><ReportLogo/>
      <div className="reportHead"><ClipboardList/><div><small>INFORME D’AVALUACIÓ INICIAL · GRUP</small><h1 id="initial-report-title">{activity?.name ?? "Avaluació inicial"}</h1><p>{course.configuration.level} · Grup {group.code} · {course.academicYear}</p></div><div className="bigScore"><span>NOTA MITJANA</span><strong>{fmt(summary.averageScore)}</strong><em>{results.length} alumnes</em></div></div>
      <div className="reportStats">
        {(["alt", "adequat", "en-proces", "suport"] as const).map(l => <div className="reportStat" key={l}><span>Nivell {LEVEL_LABEL[l]}</span><strong>{summary.levels[l]}</strong><em>{results.length ? Math.round(summary.levels[l] / results.length * 100) : 0}% de l’alumnat</em></div>)}
      </div>
      <div className="reportRow3" style={{gridTemplateColumns: "1fr 1fr"}}>
        <div className="reportBlock"><h3>Resultat mitjà per bloc</h3><BlockBars blocks={summary.blocks.map(b => ({number: b.number, title: b.title, correct: 0, wrong: 0, unknown: 0, total: 0, pct: b.averagePct, minutes: null}))}/></div>
        <div className="reportBlock"><h3>Preguntes més fallades</h3>{summary.hardest.length ? <ol className="reportList" style={{marginTop: 0}}>{summary.hardest.map(h => <li key={h.question.number}><b>{Math.round(h.failPct)}%</b> · P{h.question.number}: {h.question.text}{h.commonWrong && <><br/><span className="muted">Errada més repetida ({h.commonWrong.count}): «{h.commonWrong.answer}»</span></>}</li>)}</ol> : <p className="muted" style={{fontSize: 12}}>Cap pregunta supera el 40 % de fallades.</p>}</div>
      </div>
      {groupObs.count > 0 && <div className="reportBlock tightPrint" style={{margin: "18px 0"}}><h3>Observació a l’aula · mitjana del grup ({groupObs.count} de {groupObs.total} alumnes)</h3><GroupObservationBars summary={groupObs}/></div>}
      <div className="reportBlock tightPrint" style={{margin: "18px 0"}}><h3>Resultats per alumne</h3><table><thead><tr><th>Alumne</th><th>Nota</th><th>Nivell</th>{all[0]?.blocks.map(b => <th key={b.number} title={b.title}>B{b.number}</th>)}</tr></thead><tbody>{results.map(r => <tr key={r.id}><td>{nameOf(group, r.enrollmentId)}</td><td><b>{fmt(r.score)}</b></td><td>{LEVEL_LABEL[diagnosticLevel(r.score)]}</td>{r.blocks.map(b => <td key={b.number}>{Math.round(b.pct)}%</td>)}</tr>)}</tbody></table></div>
      <div className="reportBlock actionsCard"><h3>Seguiment suggerit</h3><ul className="reportList">{groupFollowUp(summary, results).map((t, i) => <li key={i}>{t}</li>)}</ul></div>
      <footer>{course.configuration.moduleName} · Avaluació inicial · No compta per a la nota · Dades locals</footer>
    </section>}

    {results.map((r, idx) => {
      const name = nameOf(group, r.enrollmentId), c = concludeDiagnostic(r, activePeers, name);
      return <section className="initialPage" key={r.id}><ReportLogo/>
        <div className="reportHead"><ClipboardList/><div><small>INFORME D’AVALUACIÓ INICIAL · {unitLabel(r)}</small><h1 id={single && !showSummary ? "initial-report-title" : undefined}>{name}</h1><p>{course.configuration.level} · Grup {group.code} · {course.academicYear}{unitTopic(r.title) ? ` · ${unitTopic(r.title)}` : ""}</p></div><div className="bigScore"><span>NOTA</span><strong>{fmt(r.score)}</strong><em>sobre 10 · <LevelPill score={r.score}/></em></div></div>
        <div className="reportStats">
          <div className="reportStat"><span>Encerts</span><strong>{r.correct} de {r.total}</strong><em>{Math.round(r.correct / r.total * 100)}% de les preguntes</em></div>
          <div className="reportStat"><span>Blocs a reforçar</span><strong>{c.weak.length}</strong><em>{c.weak.length ? c.weak.map(b => `B${b.number}`).join(", ") : "Cap bloc per sota del 60 %"}</em></div>
          <div className="reportStat"><span>«No ho sé»</span><strong>{r.questions.filter(q => q.unknown).length}</strong><em>preguntes reconegudes com a desconegudes</em></div>
          <div className="reportStat"><span>Temps registrat</span><strong>{r.activeMinutes ?? "—"} min</strong><em>{r.submittedAt ? `Lliurat el ${new Date(r.submittedAt).toLocaleString("ca", {dateStyle: "short", timeStyle: "short"})}` : "Data desconeguda"}</em></div>
        </div>
        <div className="reportRow3" style={{gridTemplateColumns: "1fr 1fr"}}>
          <div className="reportBlock"><h3>Resultat per bloc</h3><BlockBars blocks={r.blocks}/></div>
          <div className="reportBlock diagCard"><h3>Conclusions</h3><ul className="reportList" style={{marginTop: 0}}>{c.sentences.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
        </div>
        {single && !showSummary && idx === 0 && hasObs && observationBlock(name)}
        {c.cautions.length > 0 && <div className="warnNote"><AlertTriangle size={15}/><span>{c.cautions.join(" ")}</span></div>}
        <div className="reportRow3" style={{gridTemplateColumns: "1fr 1fr"}}>
          <div className="reportBlock reinforceCard"><h3>Preguntes errades o sense resposta</h3>{c.misses.length ? <QuestionList questions={c.misses.map(m => m.question)}/> : <p className="muted" style={{fontSize: 12}}>Cap: totes les preguntes són correctes.</p>}</div>
          <div className="reportBlock actionsCard"><h3>Accions suggerides</h3><ol className="reportList" style={{marginTop: 0}}>{(c.actions.length ? c.actions : ["Cap acció específica: el resultat d’entrada no mostra dificultats."]).map((a, i) => <li key={i}>{a}</li>)}</ol></div>
        </div>
        <div className="comment"><small>COMENTARI DE L’AVALUACIÓ INICIAL</small>
          {single ? <><textarea aria-label="Comentari de l’avaluació inicial" value={commentOf(r)} onChange={e => { setDrafts(d => ({...d, [r.id]: e.target.value})); setDirty(true); }}/><div className="noPrint actionRow" style={{marginTop: 8}}><button onClick={() => { const text = commentOf(r).trim() ? `${commentOf(r).trimEnd()}\n\n${c.text}` : c.text; setDrafts(d => ({...d, [r.id]: text})); setDirty(true); }}><MessageSquarePlus/>Afegeix la conclusió al comentari</button></div></> : <p style={{whiteSpace: "pre-wrap", margin: "6px 0 0"}}>{r.comment ?? ""}</p>}
        </div>
        <p className="muted" style={{fontSize: 10.5, margin: "10px 0 0"}}>Conclusions generades per regles a partir de les respostes del qüestionari; descriuen dades i no substitueixen el criteri docent. Aquesta avaluació no compta per a la nota del mòdul.</p>
        <footer>{course.configuration.moduleName} · {activities.find(a => a.id === r.activityId)?.name ?? "Avaluació inicial"} · Dades locals</footer>
      </section>;
    })}
  </div></div>, document.body);
}

function groupFollowUp(summary: ReturnType<typeof summarizeGroupDiagnostic>, results: DiagnosticResult[]): string[] {
  const out: string[] = [];
  const weakest = [...summary.blocks].sort((a, b) => a.averagePct - b.averagePct)[0];
  if (weakest && weakest.averagePct < 85) out.push(`Bloc més feble del grup: «${weakest.title}» (${Math.round(weakest.averagePct)} % d’encerts de mitjana). Planificar-hi un reforç inicial.`);
  const top = summary.hardest[0];
  if (top) out.push(`Pregunta més fallada: P${top.question.number} (${Math.round(top.failPct)} % de fallades).${top.commonWrong ? ` Errada més repetida: «${top.commonWrong.answer}».` : ""}`);
  const support = results.filter(r => diagnosticLevel(r.score) === "suport" || diagnosticLevel(r.score) === "en-proces").length;
  if (support) out.push(`${support} ${support === 1 ? "alumne comença" : "alumnes comencen"} amb nivell en procés o de suport: fer-ne seguiment des de l’inici.`);
  if (summary.unknownPct < 3) out.push("Gairebé ningú no ha fet servir «No ho sé»: les errades poden reflectir idees errònies, no només desconeixement.");
  return out.length ? out : ["Resultats d’entrada sense dificultats destacables."];
}
