import {ReportLogo} from "../components/shared";
import {useState} from "react";
import {createPortal} from "react-dom";
import {AlertTriangle, ClipboardList, MessageSquarePlus, Printer, Save, X} from "lucide-react";
import {compareDiagnostics, concludeDiagnostic, diagnosticLevel, orderByUnit, summarizeGroupDiagnostic, unitLabel, unitTopic, LEVEL_LABEL} from "../../src/model/diagnostic";
import {nowIso, type AcademicCourse, type DiagnosticResult, type Group} from "../../src/model/domain";
import {findGroup, type Mutate} from "../lib/helpers";
import {BlockBars, GroupObservationBars, InitialEvolution, LevelPill, ObservationBlock, QuestionList} from "../components/diagnosticViews";
import {QUESTIONNAIRES_ENABLED} from "../../src/model/features";
import {analyzeUnits} from "../../src/model/currentEvidence";
import {hasObservation, summarizeGroupObservation, supportActions} from "../../src/model/observation";

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
  const mine = !QUESTIONNAIRES_ENABLED ? [] : group.diagnostics.filter(r => r.enrollmentId === enrollmentId && (!activityId || r.activityId === activityId) && activities.some(a => a.id === r.activityId));
  const results = enrollmentId ? orderByUnit(mine) : all;
  const pendingNames = enrollmentId && !activityId ? activities.filter(a => !mine.some(r => r.activityId === a.id)).map(a => a.name) : [];
  const evolution = enrollmentId && !activityId && results.length > 0 ? compareDiagnostics(results, nameOf(group, enrollmentId), pendingNames) : null;
  const showSummary = !!evolution && (results.length > 1 || pendingNames.length > 0);
  // Observació a l'aula (només a l'informe d'un alumne; mai no mostra factors de context ni la nota breu).
  const obs = enrollmentId ? group.observations.find(o => o.enrollmentId === enrollmentId) : undefined;
  const hasObs = hasObservation(obs);
  const groupObs = summarizeGroupObservation(group.observations.filter(o => activeIds.has(o.enrollmentId)), activeIds.size);
  const observationBlock = (name: string) => <div className="reportBlock tightPrint" style={{margin: "18px 0"}}><h3>Observació a l’aula · no compta per a la nota</h3><ObservationBlock observation={obs} name={name}/></div>;
  const unitsEv = enrollmentId && !activityId ? analyzeUnits(course, group, enrollmentId, nameOf(group, enrollmentId), {initial: results, observation: obs}) : null;
  const evidence = unitsEv?.units[0] ?? null;
  const famEv = unitsEv?.cumulative ?? evidence;
  const note = enrollmentId ? group.familyNotes.find(n => n.enrollmentId === enrollmentId) : undefined;
  const support = supportActions(obs);
  const [showSupport, setShowSupport] = useState(false);
  const [family, setFamily] = useState<{comment?: string; agreements?: string}>({});
  const today = new Date().toLocaleDateString("ca", {day: "2-digit", month: "2-digit", year: "numeric"});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const single = !!enrollmentId;
  const commentOf = (r: DiagnosticResult) => drafts[r.id] ?? r.comment ?? "";
  const save = () => { mutate(d => { const g = findGroup(d, course.id, group.id); for (const [id, text] of Object.entries(drafts)) { const r = g.diagnostics.find(x => x.id === id); if (r) r.comment = text.trim() || undefined; } }); if (enrollmentId && (family.comment !== undefined || family.agreements !== undefined)) { const merged = {comment: family.comment ?? note?.comment ?? "", agreements: family.agreements ?? note?.agreements ?? ""}; mutate(d => { const g = findGroup(d, course.id, group.id); const n = g.familyNotes.find(x => x.enrollmentId === enrollmentId); if (n) Object.assign(n, merged, {updatedAt: nowIso()}); else g.familyNotes.push({enrollmentId, ...merged, updatedAt: nowIso()}); }); setFamily({}); } setDrafts({}); setDirty(false); };
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

    {single && !results.length && hasObs && !evidence && <section className="initialPage"><ReportLogo/>
      <div className="reportHead"><ClipboardList/><div><small>INFORME D’AVALUACIÓ INICIAL · OBSERVACIÓ</small><h1 id="initial-report-title">{nameOf(group, enrollmentId!)}</h1><p>{course.configuration.level} · Grup {group.code} · {course.academicYear}</p></div></div>
      {observationBlock(nameOf(group, enrollmentId!))}
      <footer>{course.configuration.moduleName} · Avaluació inicial · Dades locals</footer>
    </section>}

    {!results.length && !hasObs && !evidence && <><h1 id="initial-report-title">Avaluació inicial</h1><p role="status">No hi ha resultats importats per a aquesta avaluació.</p></>}

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

    {unitsEv?.units.map((evidence, ui) => <section key={evidence.unitId ?? ui} className="initialPage"><ReportLogo/>
      <div className="reportHead"><ClipboardList/><div><small>{results.length || hasObs ? "INFORME D’AVALUACIÓ INICIAL · CONTRAST AMB LES ACTIVITATS CORREGIDES" : "INFORME · RESULTATS ACUMULATS DE LA UT FINS ARA"}</small><h1 id={!results.length && !hasObs ? "initial-report-title" : undefined}>{nameOf(group, enrollmentId!)}</h1><p>{course.configuration.level} · Grup {group.code} · {course.academicYear} · {evidence.unitName} · Dades a {today}</p></div>{evidence.average !== null && <div className="bigScore"><span>MITJANA ACTIVITATS</span><strong>{fmt(evidence.average)}</strong><em>{evidence.activities.length} corregides de {evidence.totalInUnit}</em></div>}</div>
      <div className="reportStats">
        <div className="reportStat"><span>Lliuraments</span><strong>{evidence.delivered} de {evidence.activities.length}</strong><em>{Math.round(evidence.deliveryPct)} % de les corregides</em></div>
        <div className="reportStat"><span>Mitjana del grup</span><strong>{evidence.groupAverage === null ? "—" : fmt(evidence.groupAverage)}</strong><em>en les mateixes activitats</em></div>
        <div className="reportStat"><span>Obligatòries</span><strong>{evidence.required.total ? `${evidence.required.passed} de ${evidence.required.total}` : "—"}</strong><em>{evidence.required.failed ? `${evidence.required.failed} per recuperar` : "superades"}</em></div>
        <div className="reportStat"><span>Avaluat de la UT</span><strong>{Math.round(evidence.coveragePct)} %</strong><em>pes de les activitats corregides</em></div>
      </div>
      {ui === 0 && !results.length && hasObs && observationBlock(nameOf(group, enrollmentId!))}
      <div className="reportBlock tightPrint" style={{margin: "14px 0"}}><h3>Resum d’indicadors</h3><table className="wrapCells"><thead><tr><th>Indicador</th><th>Valor</th><th>Com es calcula</th><th>Què en diu</th></tr></thead><tbody>{evidence.indicators.map(i => <tr key={i.name}><td><b>{i.name}</b></td><td><span className="bonus" style={{background: i.status === "ok" ? "#dff3e4" : i.status === "warn" ? "#fdf0cf" : i.status === "bad" ? "#f9dcdc" : "#eceff3", color: "#222", whiteSpace: "nowrap"}}>{i.value}</span></td><td style={{fontSize: 11}}>{i.how}</td><td style={{fontSize: 11}}>{i.reading}</td></tr>)}</tbody></table></div>
      <div className="reportRow3" style={{gridTemplateColumns: "1fr 1fr"}}>
        <div className="reportBlock diagCard"><h3>Dades observades</h3><ul className="reportList" style={{marginTop: 0}}>{evidence.sentences.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
        {(results.length > 0 || hasObs) && <div className="reportBlock actionsCard"><h3>Contrast amb l’entrada</h3>{evidence.contrast.length ? <ul className="reportList" style={{marginTop: 0}}>{evidence.contrast.map((s, i) => <li key={i}>{s}</li>)}</ul> : <p className="muted" style={{fontSize: 12}}>No hi ha avaluació inicial o observació amb què contrastar.</p>}</div>}
      </div>
      <div className="reportBlock reinforceCard tightPrint" style={{margin: "14px 0"}}><h3>Recomanacions per millorar</h3><ol className="reportList" style={{marginTop: 0}}>{evidence.recommendations.map((t, i) => <li key={i}>{t}</li>)}</ol></div>
      <div className="reportBlock tightPrint" style={{margin: "14px 0"}}><h3>Activitats corregides</h3><div className="activityChips">{evidence.activities.map(a => <span key={a.id} className={a.delivered ? "" : "missed"} title={`${a.typeName} · grup ${a.groupAverage === null ? "—" : fmt(a.groupAverage)}`}>{a.name}{a.required ? "*" : ""}: <b>{a.delivered ? fmt(a.grade!) : "no lliurada"}</b></span>)}</div><small className="muted">* examen obligatori</small></div>
      {evidence.cautions.length > 0 && <div className="warnNote"><AlertTriangle size={15}/><span>{evidence.cautions.join(" ")}</span></div>}
      <p className="muted" style={{fontSize: 10.5, margin: "10px 0 0"}}>Frases generades per regles a partir de les activitats ja corregides de la UT en curs; descriuen dades i no substitueixen el criteri docent. Aquest contrast no modifica cap nota.</p>
      <footer>{course.configuration.moduleName} · Contrast amb les activitats corregides · Dades locals</footer>
    </section>)}

    {unitsEv && unitsEv.units.length > 1 && unitsEv.cumulative && <section className="initialPage"><ReportLogo/>
      <div className="reportHead"><ClipboardList/><div><small>INFORME D’AVALUACIÓ INICIAL · EVOLUCIÓ ENTRE UT</small><h1>{nameOf(group, enrollmentId!)}</h1><p>{course.configuration.level} · Grup {group.code} · {course.academicYear} · Dades a {today}</p></div><div className="bigScore"><span>MITJANA ACUMULADA</span><strong>{unitsEv.cumulative.average === null ? "—" : fmt(unitsEv.cumulative.average)}</strong><em>{unitsEv.cumulative.activities.length} activitats corregides</em></div></div>
      <div className="reportBlock tightPrint" style={{margin: "14px 0"}}><h3>Comparació entre unitats</h3><table className="wrapCells"><thead><tr><th>Unitat</th><th>Corregides</th><th>Lliuraments</th><th>Mitjana</th><th>Grup</th><th>Obligatòries</th><th>Avaluat</th></tr></thead><tbody>{[...unitsEv.units, unitsEv.cumulative].map((u, i, all) => <tr key={u.unitId ?? "total"} style={i === all.length - 1 ? {fontWeight: 800} : undefined}><td>{i === all.length - 1 ? "Acumulat" : u.unitName}</td><td>{u.activities.length} de {u.totalInUnit}</td><td>{u.delivered} de {u.activities.length} ({Math.round(u.deliveryPct)} %)</td><td><b>{u.average === null ? "—" : fmt(u.average)}</b></td><td>{u.groupAverage === null ? "—" : fmt(u.groupAverage)}</td><td>{u.required.total ? `${u.required.passed} de ${u.required.total}` : "—"}</td><td>{Math.round(u.coveragePct)} %</td></tr>)}</tbody></table></div>
      <div className="reportRow3" style={{gridTemplateColumns: "1fr 1fr"}}>
        <div className="reportBlock diagCard"><h3>Evolució</h3><ul className="reportList" style={{marginTop: 0}}>{unitsEv.comparison.map((t, i) => <li key={i}>{t}</li>)}</ul></div>
        <div className="reportBlock reinforceCard"><h3>Recomanacions sobre el conjunt</h3><ol className="reportList" style={{marginTop: 0}}>{unitsEv.cumulative.recommendations.map((t, i) => <li key={i}>{t}</li>)}</ol></div>
      </div>
      <div className="reportBlock tightPrint" style={{margin: "14px 0"}}><h3>Resum d’indicadors acumulats</h3><table className="wrapCells"><thead><tr><th>Indicador</th><th>Valor</th><th>Què en diu</th></tr></thead><tbody>{unitsEv.cumulative.indicators.map(i => <tr key={i.name}><td><b>{i.name}</b></td><td><span className="bonus" style={{background: i.status === "ok" ? "#dff3e4" : i.status === "warn" ? "#fdf0cf" : i.status === "bad" ? "#f9dcdc" : "#eceff3", color: "#222", whiteSpace: "nowrap"}}>{i.value}</span></td><td style={{fontSize: 11}}>{i.reading}</td></tr>)}</tbody></table></div>
      <p className="muted" style={{fontSize: 10.5, margin: "10px 0 0"}}>Comparació generada per regles a partir de les activitats corregides de cada unitat; descriu dades i no substitueix el criteri docent. No modifica cap nota.</p>
      <footer>{course.configuration.moduleName} · Evolució entre UT · Dades locals</footer>
    </section>}


    {single && (famEv || hasObs) && <section className="initialPage"><ReportLogo/>
      <div className="reportHead"><ClipboardList/><div><small>INFORME D’AVALUACIÓ INICIAL · PER A LA FAMÍLIA</small><h1>{nameOf(group, enrollmentId!)}</h1><p>{course.configuration.level} · Grup {group.code} · {course.academicYear} · {course.configuration.moduleName} · Dades a {today}</p></div></div>
      <div className="reportBlock tightPrint" style={{margin: "12px 0"}}><h3>Què és aquest informe</h3><p style={{fontSize: 12, margin: 0}}>Recull com ha començat el curs l’alumne/a a partir de l’observació a l’aula{famEv ? ` i de les activitats ja corregides ${famEv.unitId ? `de ${famEv.unitName}` : "de totes les UT"}` : ""}. <b>No és la nota del mòdul</b> ni la modifica: és una fotografia del moment per poder-lo acompanyar. Una activitat no lliurada es corregeix amb un 0 i compta a la mitjana. Colors de la taula d’indicadors: <b style={{color: "#24745a"}}>verd</b> correcte, <b style={{color: "#8a6410"}}>groc</b> a vigilar, <b style={{color: "#b23a4b"}}>vermell</b> a millorar.</p></div>
      <div className="reportRow3" style={{gridTemplateColumns: "1fr 1fr"}}>
        <div className="reportBlock diagCard"><h3>Què fa bé</h3>{famEv && famEv.strengths.length ? <ul className="reportList" style={{marginTop: 0}}>{famEv.strengths.map((t, i) => <li key={i}>{t}</li>)}</ul> : <p className="muted" style={{fontSize: 12, margin: 0}}>Encara no hi ha prou dades per destacar-ne punts forts; es poden afegir al comentari del professorat.</p>}</div>
        <div className="reportBlock reinforceCard"><h3>Què es pot millorar</h3>{famEv ? <ol className="reportList" style={{marginTop: 0}}>{famEv.recommendations.slice(0, 3).map((t, i) => <li key={i}>{t}</li>)}</ol> : <p className="muted" style={{fontSize: 12, margin: 0}}>Encara no hi ha activitats corregides.</p>}</div>
      </div>
      {support.length > 0 && <div className={`reportBlock tightPrint${showSupport ? "" : " noPrint"}`} style={{margin: "10px 0"}}><h3>Com acompanyar-lo a l’aula</h3><ul className="reportList" style={{marginTop: 0}}>{support.map((t, i) => <li key={i}>{t}</li>)}</ul><label className="noPrint" style={{display: "flex", gap: 6, alignItems: "center", fontSize: 11}}><input type="checkbox" checked={showSupport} onChange={e => setShowSupport(e.target.checked)}/>Inclou-ho a la impressió (no s’hi indica el motiu; surt només si el marques)</label></div>}
      <div className="comment"><small>COMENTARI DEL PROFESSORAT</small>
        <textarea aria-label="Comentari del professorat" value={family.comment ?? note?.comment ?? ""} onChange={e => { setFamily(f => ({...f, comment: e.target.value})); setDirty(true); }} style={{minHeight: 90}}/>
      </div>
      <div className="comment" style={{marginTop: 10}}><small>ACORDS AMB L’ALUMNE I LA FAMÍLIA</small>
        <textarea aria-label="Acords amb l’alumne i la família" value={family.agreements ?? note?.agreements ?? ""} onChange={e => { setFamily(f => ({...f, agreements: e.target.value})); setDirty(true); }} style={{minHeight: 90}}/>
      </div>
      <div className="signRow"><div><span/>Professorat · data</div><div><span/>Alumne/a · data</div><div><span/>Família · data</div></div>
      <footer>{course.configuration.moduleName} · Informe per a la família · No compta per a la nota · Dades locals</footer>
    </section>}
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
