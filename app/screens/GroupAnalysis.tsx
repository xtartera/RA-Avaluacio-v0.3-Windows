import {useState} from "react";
import {AlertCircle, AlertTriangle, BookOpen, CircleCheck, CircleX, Construction, FolderClock, Gauge, PieChart as PieChartIcon, Printer, Repeat, Settings2, Sparkles, Table2, ThumbsUp, TrendingDown, TrendingUp, UserMinus, X} from "lucide-react";
import type {AcademicCourse, Group} from "../../src/model/domain";
import type {Tab} from "../lib/helpers";
import {analyzeGroup} from "../lib/groupAnalytics";
import {PassBar} from "../components/shared";
import {ActivitySubPanel, DiagList, Donut, DONUT_COLORS, EvoBar, KpiCard, TrendLine} from "../components/analysis";
import {GroupReport} from "./GroupReport";

type SubTab = "resum" | "evolucio" | "comparacio";
type Perspective = "ordinaria" | "extraordinaria" | "total";

export function GroupAnalysis({course, group, goTo}: {course: AcademicCourse; group: Group; goTo: (tab: Tab) => void}) {
 const [tab, setTab] = useState<SubTab>("resum");
 const [nameModal, setNameModal] = useState<{title: string; names: string[]} | null>(null);
 const [showReport, setShowReport] = useState(false);
 const [compareId, setCompareId] = useState<string | null>(null);
 const [perspective, setPerspective] = useState<Perspective>("ordinaria");
 const otherCandidates = course.groups.filter(x => x.id !== group.id);
 const effectiveCompareId = otherCandidates.some(o => o.id === compareId) ? compareId! : undefined;
 const g = analyzeGroup(course, group, effectiveCompareId);
 const {own, other, otherGroup, bands, withdrawnEnrollments, withdrawnNames, totalEnrolled, withdrawnPct, archivedEnrollments, archivedNames, archivedPct, hasEvolution, trendDelta, improved, worsened, stable, trendPoints, raRows, bySuccess, byDifficulty, byMissing, diagnosis, actions, coverageGapWarning, convocatoria} = g;
 const hasConvocatoria = convocatoria.blockedOrdinariaCount > 0;
 const effectivePerspective: Perspective = hasConvocatoria ? perspective : "ordinaria";

 return <>
  <div className="panelHeader" style={{marginBottom: 16}}>
   <div className="subTabs" style={{marginBottom: 0}}>
    <button className={tab === "resum" ? "active" : ""} onClick={() => setTab("resum")}>Resum</button>
    <button className={tab === "evolucio" ? "active" : ""} onClick={() => setTab("evolucio")}>Evolució</button>
    <button title="Obre la configuració de RA i CA del mòdul" onClick={() => goTo("configuracio")}><Settings2 size={14}/>RA / CA</button>
    <button title="Obre la pantalla Activitats" onClick={() => goTo("activitats")}><BookOpen size={14}/>Activitats</button>
    <button title="Obre les graelles globals de notes del grup" onClick={() => goTo("graelles")}><Table2 size={14}/>Notes de grup</button>
    <button className={tab === "comparacio" ? "active" : ""} onClick={() => setTab("comparacio")}>Comparació de grups</button>
   </div>
   <button className="dark" onClick={() => setShowReport(true)}><Printer/>Exportar informe</button>
  </div>

  {(tab === "evolucio" || tab === "comparacio") && <article className="panel"><div className="placeholderPanel"><Construction/><strong>En construcció</strong><span>Aquesta vista detallada s’anirà afegint properament.</span></div></article>}

  {tab === "resum" && <>
   {hasConvocatoria && <div className="sectionActions" style={{justifyContent: "flex-start", marginBottom: 14}}><div className="switch"><button className={effectivePerspective === "ordinaria" ? "active" : ""} onClick={() => setPerspective("ordinaria")}>Ordinària</button><button className={effectivePerspective === "extraordinaria" ? "active" : ""} onClick={() => setPerspective("extraordinaria")}>Extraordinària</button><button className={effectivePerspective === "total" ? "active" : ""} onClick={() => setPerspective("total")}>Total</button></div></div>}
   {hasConvocatoria && effectivePerspective !== "ordinaria" && <p className="muted" style={{margin: "-8px 0 14px", fontSize: 11}}>L’evolució, la distribució de l’alumnat, les activitats destacades i la comparació entre grups més avall segueixen corresponent a la <b>convocatòria ordinària</b>.</p>}

   {effectivePerspective === "ordinaria" && <div className="kpiRow kpi8">
    <KpiCard tone="blue" icon={<Gauge size={14}/>} label="Nota projectada" value={`${own.average.toFixed(2)} / 10`} sub={own.count ? `${own.count} alumnes actius` : "Sense alumnat actiu"} trend={hasEvolution && Math.abs(trendDelta) >= .01 ? {icon: trendDelta > 0 ? TrendingUp : TrendingDown, tone: trendDelta > 0 ? "green" : "red", text: `${trendDelta > 0 ? "+" : ""}${trendDelta.toFixed(2)} respecte a la UT 1`} : undefined} hint="Mitjana ponderada de tots els RA. És una projecció global; no implica per si sola l'aprovat del mòdul."/>
    <KpiCard tone="green" icon={<ThumbsUp size={14}/>} label="Aprovats" value={`${own.passedPct.toFixed(0)}%`} sub={`${own.passed} de ${own.withEvidenceCount} amb RA avaluats`} hint="Alumnes amb tots i cadascun dels RA avaluats assolits (nota ≥5 i cap activitat obligatòria suspesa), segons normativa. No es basa en la mitjana global." onExpand={() => setNameModal({title: "Aprovats (tots els RA assolits)", names: own.passedNames})}/>
    <KpiCard tone="amber" icon={<AlertCircle size={14}/>} label="Zona límit" value={`${own.borderlinePct.toFixed(0)}%`} sub={`${own.borderline} de ${own.withEvidenceCount} amb RA avaluats`} hint="Alumnes amb exactament 1 RA no assolit (la resta assolits). No mira la mitjana global, sinó el nombre de RA suspesos." onExpand={() => setNameModal({title: "Zona límit (1 RA no assolit)", names: own.borderlineNames})}/>
    <KpiCard tone="red" icon={<AlertTriangle size={14}/>} label="En risc" value={`${own.riskPct.toFixed(0)}%`} sub={`${own.risk} de ${own.withEvidenceCount} amb RA avaluats`} hint="Alumnes amb 2 o més RA no assolits. No mira la mitjana global, sinó el nombre de RA suspesos." onExpand={() => setNameModal({title: "En risc (2 o més RA no assolits)", names: own.riskNames})}/>
    <KpiCard tone="violet" icon={<Sparkles size={14}/>} label="Excel·lència" value={`${own.excellencePct.toFixed(0)}%`} sub={`${own.excellence} de ${own.withEvidenceCount} amb RA avaluats`} hint="Alumnes amb tots els RA assolits i, a més, nota global ≥8. Un alumne amb algun RA no assolit mai compta com a excel·lent, tingui la nota que tingui." onExpand={() => setNameModal({title: "Excel·lència (tots els RA assolits i nota ≥8)", names: own.excellenceNames})}/>
    <KpiCard tone="red" icon={<UserMinus size={14}/>} label="Baixes" value={`${withdrawnPct.toFixed(0)}%`} sub={`${withdrawnEnrollments.length} de ${totalEnrolled} matriculats`} hint="Alumnes matriculats en aquest grup que han causat baixa (estat 'Baixa' a la pantalla Alumnes)." onExpand={() => setNameModal({title: "Alumnes de baixa", names: withdrawnNames})}/>
    <KpiCard tone="slate" icon={<FolderClock size={14}/>} label="Arxivats" value={`${archivedPct.toFixed(0)}%`} sub={`${archivedEnrollments.length} de ${totalEnrolled} matriculats`} hint="Alumnes matriculats en aquest grup que s'han arxivat (estat 'Arxivat' a la pantalla Alumnes)." onExpand={() => setNameModal({title: "Alumnes arxivats", names: archivedNames})}/>
    <KpiCard tone="slate" icon={<PieChartIcon size={14}/>} label="Cobertura avaluada" value={`${own.coverage.toFixed(0)}%`} sub="del pes total del mòdul" hint="Percentatge del pes total del mòdul del qual ja hi ha prou evidències qualificades."/>
   </div>}
   {effectivePerspective === "ordinaria" && own.noEvidenceCount > 0 && <p className="muted" style={{margin: "-8px 0 16px", fontSize: 11}}>Aprovats, zona límit, en risc i excel·lència es calculen sobre els {own.withEvidenceCount} alumnes amb algun RA ja avaluat ({own.noEvidenceCount} més encara sense cap RA avaluat).</p>}

   {effectivePerspective === "extraordinaria" && <div className="kpiRow">
    <KpiCard tone="slate" icon={<Repeat size={14}/>} label="Alumnes que recuperen" value={`${convocatoria.blockedOrdinariaCount}`} sub={`de ${own.count} actius`}/>
    <KpiCard tone="green" icon={<CircleCheck size={14}/>} label="Ja recuperats" value={`${convocatoria.recoveredNames.length}`} sub="ja superen el mòdul" onExpand={() => setNameModal({title: "Recuperats a l’extraordinària", names: convocatoria.recoveredNames})}/>
    <KpiCard tone={convocatoria.stillBlockedNames.length ? "red" : "slate"} icon={<CircleX size={14}/>} label="Encara pendents" value={`${convocatoria.stillBlockedNames.length}`} sub="no superen el mòdul encara" onExpand={() => setNameModal({title: "Encara no superen el mòdul", names: convocatoria.stillBlockedNames})}/>
    <KpiCard tone={convocatoria.exhaustedNames.length ? "red" : "slate"} icon={<AlertTriangle size={14}/>} label="Convocatòries exhaurides" value={`${convocatoria.exhaustedNames.length}`} sub="a la 4a convocatòria" onExpand={() => setNameModal({title: "Convocatòries exhaurides", names: convocatoria.exhaustedNames})}/>
    <KpiCard tone="amber" icon={<UserMinus size={14}/>} label="Alumnat repetidor" value={`${convocatoria.repeaterCount}`} sub={`de ${own.count} actius`}/>
   </div>}

   {effectivePerspective === "total" && <div className="kpiRow">
    <KpiCard tone="blue" icon={<Gauge size={14}/>} label="Nota final mitjana" value={`${convocatoria.finalAverage.toFixed(2)} / 10`} sub="ordinària + extraordinària"/>
    <KpiCard tone="green" icon={<ThumbsUp size={14}/>} label="Aprovats finals" value={`${convocatoria.passedFinalPct.toFixed(0)}%`} sub={`${convocatoria.passedFinalCount} de ${own.count} actius`}/>
    <KpiCard tone={convocatoria.stillBlockedNames.length ? "red" : "slate"} icon={<CircleX size={14}/>} label="Encara no superen" value={`${convocatoria.stillBlockedNames.length}`} sub={`de ${own.count} actius`} onExpand={() => setNameModal({title: "Encara no superen el mòdul", names: convocatoria.stillBlockedNames})}/>
    <KpiCard tone={convocatoria.exhaustedNames.length ? "red" : "slate"} icon={<AlertTriangle size={14}/>} label="Convocatòries exhaurides" value={`${convocatoria.exhaustedNames.length}`} sub="a la 4a convocatòria" onExpand={() => setNameModal({title: "Convocatòries exhaurides", names: convocatoria.exhaustedNames})}/>
   </div>}

   <div className="analysisRow">
    <article className="panel"><div className="panelHeader"><h2>Evolució de la nota projectada{hasConvocatoria ? " (ordinària)" : ""}</h2></div>{hasEvolution ? <TrendLine series={[{label: "Grup", color: "var(--blue)", points: trendPoints}]}/> : <p className="muted">Sense alumnat actiu.</p>}</article>
    <article className="panel"><div className="panelHeader"><h2>Distribució de l’alumnat{hasConvocatoria ? " (ordinària)" : ""}</h2></div><p className="muted" style={{margin: "0 0 12px"}}>Per nota global ponderada, no per assoliment de RA: un alumne pot sortir en una franja alta i, tot i així, estar en risc o en zona límit (vegeu els indicadors de dalt).</p>{own.count ? <div style={{display: "flex", alignItems: "center", gap: 14}}>
     <Donut bands={bands} total={own.count}/>
     <div className="donutLegend" style={{flex: 1}}>{bands.map((b, i) => <div key={b.label}><span><i style={{background: DONUT_COLORS[i]}}/>{b.label} ({b.range})</span><b>{b.count} <em>({own.count ? (b.count / own.count * 100).toFixed(0) : 0}%)</em></b></div>)}</div>
    </div> : <p className="muted">Sense alumnat actiu.</p>}</article>
    <article className="panel"><div className="panelHeader"><h2>Evolució individual agregada</h2></div>{hasEvolution ? <>
     <div className="evoBars">
      <EvoBar tone="green" label="Milloren" count={improved} total={own.count}/>
      <EvoBar tone="slate" label="Es mantenen" count={stable} total={own.count}/>
      <EvoBar tone="red" label="Empitjoren" count={worsened} total={own.count}/>
     </div>
     <p className="muted" style={{marginTop: 10, fontSize: 11}}>Respecte a la nota projectada al final de la UT 1.</p>
    </> : <p className="muted">Sense alumnat actiu.</p>}</article>
   </div>

   {effectivePerspective === "ordinaria" && <article className="panel" style={{marginBottom: 16}}><div className="panelHeader"><h2>Assoliment per Resultat d’Aprenentatge{hasConvocatoria ? " (ordinària)" : ""}</h2></div><p className="muted" style={{margin: "0 0 12px"}}>Un alumne "aprova" un RA quan aquest RA arriba a nota ≥5 i no té cap activitat obligatòria suspesa vinculada.</p>{raRows.length ? <table><thead><tr><th>RA</th><th>Mitjana</th><th style={{width: 260}}>Aprovats / suspesos</th></tr></thead><tbody>{raRows.map(r => <tr key={r.ra.id}><td><b>{r.ra.code}</b><br/><span className="muted" style={{fontSize: 11}}>{r.ra.description}</span></td><td>{r.average !== null ? r.average.toFixed(2) : <span className="pending">Pendent</span>}</td><td>{r.achievementPct !== null ? <><div style={{display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 5}}><span>{r.achievementPct.toFixed(0)}% assoliment</span><span className="muted">{r.passed}/{r.total}</span></div><PassBar passed={r.passed} failed={r.failed}/></> : <span className="pending">Evidència insuficient</span>}</td></tr>)}</tbody></table> : <p className="muted">Encara no hi ha cap RA actiu.</p>}</article>}

   {effectivePerspective === "extraordinaria" && <article className="panel" style={{marginBottom: 16}}><div className="panelHeader"><h2>RA a recuperar — convocatòria extraordinària</h2></div>{convocatoria.raRowsExtra.length ? <table><thead><tr><th>RA</th><th>Alumnes que el recuperen</th><th>Recuperats</th><th>Pendents</th><th>Mitjana recuperació</th></tr></thead><tbody>{convocatoria.raRowsExtra.map(r => <tr key={r.ra.id}><td><b>{r.ra.code}</b><br/><span className="muted" style={{fontSize: 11}}>{r.ra.description}</span></td><td>{r.needingCount}</td><td className="ok">{r.recoveredCount}</td><td className={r.pendingCount ? "risk" : "muted"}>{r.pendingCount}</td><td>{r.average !== null ? r.average.toFixed(2) : <span className="pending">Encara sense qualificar</span>}</td></tr>)}</tbody></table> : <p className="muted">Cap RA necessita recuperació.</p>}</article>}

   {effectivePerspective === "total" && <article className="panel" style={{marginBottom: 16}}><div className="panelHeader"><h2>Assoliment per Resultat d’Aprenentatge — resolució final</h2></div><table><thead><tr><th>RA</th><th>Mitjana final</th><th style={{width: 260}}>Assolits / no assolits</th></tr></thead><tbody>{convocatoria.raRowsFinal.map(r => <tr key={r.ra.id}><td><b>{r.ra.code}</b><br/><span className="muted" style={{fontSize: 11}}>{r.ra.description}</span></td><td>{r.average !== null ? r.average.toFixed(2) : "—"}</td><td>{r.achievementPct !== null ? <><div style={{display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 5}}><span>{r.achievementPct.toFixed(0)}% assoliment</span><span className="muted">{r.passed}/{r.total}</span></div><PassBar passed={r.passed} failed={r.failed}/></> : "—"}</td></tr>)}</tbody></table></article>}

   {hasConvocatoria && <article className="panel"><div className="panelHeader"><h2>Convocatòria extraordinària — detall per alumne</h2><button title="Obre la pantalla Extraordinària" onClick={() => goTo("extraordinaria")}>Gestiona-la</button></div><p className="muted" style={{margin: "0 0 12px"}}>{convocatoria.blockedOrdinariaCount} alumne(s) amb el mòdul no superat a l’ordinària · {convocatoria.passedFinalPct.toFixed(0)}% d’aprovats finals (comptant la recuperació) · {convocatoria.exhaustedNames.length} amb convocatòries exhaurides.</p><div style={{display: "flex", flexWrap: "wrap", gap: 20}}>
    <div><span className="muted" style={{fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em"}}>Recuperats</span><p style={{margin: "4px 0 0", fontSize: 12}}>{convocatoria.recoveredNames.length ? convocatoria.recoveredNames.join(", ") : "Cap encara."}</p></div>
    <div><span className="muted" style={{fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em"}}>Encara no superen el mòdul</span><p style={{margin: "4px 0 0", fontSize: 12}}>{convocatoria.stillBlockedNames.length ? convocatoria.stillBlockedNames.join(", ") : "Cap."}</p></div>
    {convocatoria.exhaustedNames.length > 0 && <div><span className="risk" style={{fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em"}}>Convocatòries exhaurides</span><p style={{margin: "4px 0 0", fontSize: 12}}>{convocatoria.exhaustedNames.join(", ")}</p></div>}
   </div></article>}

   <article className="panel"><div className="panelHeader"><h2>Activitats destacades</h2></div>
    <div className="actGrid">
     <ActivitySubPanel tone="green" title="Major èxit" rows={bySuccess} metric="Mitjana" cell={r => r.average!.toFixed(2)}/>
     <ActivitySubPanel tone="red" title="Més dificultat" rows={byDifficulty} metric="% suspesos" cell={r => r.failPct !== null ? `${r.failPct.toFixed(0)}%` : "—"}/>
     <ActivitySubPanel tone="amber" title="Més no lliuraments" rows={byMissing} metric="% no lliurats" cell={r => `${r.notPresentedPct.toFixed(0)}%`}/>
    </div>
   </article>

   <div className="analysisRow two">
    <article className="panel"><div className="panelHeader"><h2>Comparació entre grups</h2>{otherCandidates.length > 1 && <select value={otherGroup?.id ?? ""} onChange={e => setCompareId(e.target.value || null)}>{otherCandidates.map(o => <option key={o.id} value={o.id}>Compara amb {o.name}</option>)}</select>}</div><p className="muted" style={{margin: "0 0 12px"}}>Aprovats, en risc i excel·lència es calculen per assoliment de RA (vegeu els indicadors de dalt), no per la mitjana global.</p>{otherGroup && other ? <>
     {coverageGapWarning && <div className="warnNote"><AlertTriangle size={15}/><span>La comparació s’ha d’interpretar amb precaució: el Grup {group.code} té un {own.coverage.toFixed(0)}% de cobertura avaluada i el Grup {otherGroup.code} un {other.coverage.toFixed(0)}%.</span></div>}
     <table><thead><tr><th>Indicador</th><th>Grup {group.code}</th><th>Grup {otherGroup.code}</th></tr></thead><tbody>
      <tr><td>Nota projectada</td><td>{own.average.toFixed(2)}</td><td>{other.average.toFixed(2)}</td></tr>
      <tr><td>Aprovats</td><td>{own.passedPct.toFixed(0)}%</td><td>{other.passedPct.toFixed(0)}%</td></tr>
      <tr><td>En risc</td><td>{own.riskPct.toFixed(0)}%</td><td>{other.riskPct.toFixed(0)}%</td></tr>
      <tr><td>Excel·lència</td><td>{own.excellencePct.toFixed(0)}%</td><td>{other.excellencePct.toFixed(0)}%</td></tr>
      <tr><td>Desviació estàndard</td><td>{own.stdDev.toFixed(2)}</td><td>{other.stdDev.toFixed(2)}</td></tr>
      <tr><td>Taxa de lliurament</td><td>{own.delivery.toFixed(0)}%</td><td>{other.delivery.toFixed(0)}%</td></tr>
      <tr><td>Cobertura avaluada</td><td>{own.coverage.toFixed(0)}%</td><td>{other.coverage.toFixed(0)}%</td></tr>
     </tbody></table>
    </> : <p className="muted">Aquest curs només té un grup actiu.</p>}</article>
    <div style={{display: "flex", flexDirection: "column", gap: 16}}>
     <article className="panel diagCard"><div className="panelHeader"><h2>Diagnosi automàtica</h2></div><DiagList items={diagnosis}/></article>
     <article className="panel actionsCard"><div className="panelHeader"><h2>Conclusions i accions suggerides</h2></div><ol>{actions.map((a, i) => <li key={i}>{a}</li>)}</ol><footer>«Les dades no substitueixen el criteri docent, però ens ajuden a prendre millors decisions.»</footer></article>
    </div>
   </div>
  </>}
  {nameModal && <NameListModal title={nameModal.title} names={nameModal.names} close={() => setNameModal(null)}/>}
  {showReport && <GroupReport course={course} group={group} close={() => setShowReport(false)} compareGroupId={effectiveCompareId}/>}
 </>;
}

function NameListModal({title, names, close}: {title: string; names: string[]; close: () => void}) {
 return <div className="modal" onClick={close}><div className="dialog" style={{width: "min(420px,100%)"}} onClick={e => e.stopPropagation()}>
  <div className="panelHeader"><h2>{title}</h2><button onClick={close}><X/></button></div>
  {names.length ? <ul style={{margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8, maxHeight: 420, overflowY: "auto"}}>{names.map(n => <li key={n} style={{padding: "9px 12px", borderRadius: 9, background: "#f5f8fd", fontSize: 13}}>{n}</li>)}</ul> : <p className="muted">Cap alumne en aquesta categoria.</p>}
  <p className="muted" style={{margin: "14px 0 0", fontSize: 11}}>{names.length} alumne{names.length === 1 ? "" : "s"}.</p>
 </div></div>;
}
