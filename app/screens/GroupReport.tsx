import {createPortal} from "react-dom";
import {AlertTriangle, Printer, Users, X} from "lucide-react";
import type {AcademicCourse, Group} from "../../src/model/domain";
import {analyzeGroup} from "../lib/groupAnalytics";
import {ActivitySubPanel, DiagList, Donut, DONUT_COLORS, EvoBar, TrendLine} from "../components/analysis";
import {PassBar} from "../components/shared";

export function GroupReport({course, group, close, compareGroupId}: {course: AcademicCourse; group: Group; close: () => void; compareGroupId?: string}) {
 const g = analyzeGroup(course, group, compareGroupId);
 const {own, other, otherGroup, bands, withdrawnEnrollments, withdrawnNames, totalEnrolled, withdrawnPct, archivedEnrollments, archivedNames, archivedPct, hasEvolution, trendDelta, improved, worsened, stable, trendPoints, raRows, bySuccess, byDifficulty, byMissing, diagnosis, actions, coverageGapWarning, convocatoria} = g;

 return createPortal(<div className="modal"><div className="report groupReport">
  <div className="noPrint reportActions"><button onClick={close}><X/>Tanca</button><button className="dark" onClick={() => window.print()}><Printer/>Imprimeix</button></div>

  <div className="reportHead"><Users/><div><small>INFORME D’ANÀLISI DEL GRUP</small><h1>Grup {group.code}</h1><p>{course.configuration.level} · {course.configuration.moduleName} · {course.academicYear}</p></div><div className="bigScore"><span>NOTA PROJECTADA</span><strong>{own.average.toFixed(2)}</strong><em>{own.count} alumnes actius · {own.coverage.toFixed(1)}% avaluat</em></div></div>

  <div className="reportStats cols6">
   <div className="reportStat"><span>Aprovats</span><strong>{own.passedPct.toFixed(0)}%</strong><em>{own.passed} de {own.withEvidenceCount} amb RA avaluats</em></div>
   <div className="reportStat"><span>Zona límit</span><strong>{own.borderlinePct.toFixed(0)}%</strong><em>{own.borderline} de {own.withEvidenceCount} amb RA avaluats</em></div>
   <div className="reportStat"><span>En risc</span><strong>{own.riskPct.toFixed(0)}%</strong><em>{own.risk} de {own.withEvidenceCount} amb RA avaluats</em></div>
   <div className="reportStat"><span>Excel·lència</span><strong>{own.excellencePct.toFixed(0)}%</strong><em>{own.excellence} de {own.withEvidenceCount} amb RA avaluats</em></div>
   <div className="reportStat"><span>Baixes</span><strong>{withdrawnPct.toFixed(0)}%</strong><em>{withdrawnEnrollments.length} de {totalEnrolled} matriculats</em></div>
   <div className="reportStat"><span>Arxivats</span><strong>{archivedPct.toFixed(0)}%</strong><em>{archivedEnrollments.length} de {totalEnrolled} matriculats</em></div>
   <div className="reportStat"><span>Cobertura avaluada</span><strong>{own.coverage.toFixed(0)}%</strong><em>del pes total del mòdul</em></div>
  </div>
  <p className="muted" style={{margin: "-10px 0 20px", fontSize: 11}}>Aprovats, zona límit, en risc i excel·lència es calculen per assoliment de tots els RA (nota ≥5 i sense activitat obligatòria suspesa), no per la mitjana global.</p>

  <div className="reportRow3">
   <div className="reportBlock"><h3>Evolució de la nota projectada</h3>{hasEvolution ? <TrendLine series={[{label: "Grup", color: "var(--blue)", points: trendPoints}]}/> : <p className="muted" style={{fontSize: 12}}>Sense alumnat actiu.</p>}</div>
   <div className="reportBlock"><h3>Distribució de l’alumnat</h3>{own.count ? <div style={{display: "flex", alignItems: "center", gap: 12}}>
    <Donut bands={bands} total={own.count}/>
    <div className="donutLegend" style={{flex: 1}}>{bands.map((b, i) => <div key={b.label}><span><i style={{background: DONUT_COLORS[i]}}/>{b.label}</span><b>{b.count} <em>({own.count ? (b.count / own.count * 100).toFixed(0) : 0}%)</em></b></div>)}</div>
   </div> : <p className="muted" style={{fontSize: 12}}>Sense alumnat actiu.</p>}</div>
   <div className="reportBlock"><h3>Evolució individual agregada</h3>{hasEvolution ? <div className="evoBars">
    <EvoBar tone="green" label="Milloren" count={improved} total={own.count}/>
    <EvoBar tone="slate" label="Es mantenen" count={stable} total={own.count}/>
    <EvoBar tone="red" label="Empitjoren" count={worsened} total={own.count}/>
   </div> : <p className="muted" style={{fontSize: 12}}>Sense alumnat actiu.</p>}</div>
  </div>

  <h2>Assoliment per Resultat d’Aprenentatge</h2>
  {raRows.length ? <table><thead><tr><th>RA</th><th>Mitjana</th><th style={{width: 220}}>Aprovats / suspesos</th></tr></thead><tbody>{raRows.map(r => <tr key={r.ra.id}><td><b>{r.ra.code}</b><br/><span className="muted" style={{fontSize: 11}}>{r.ra.description}</span></td><td>{r.average !== null ? r.average.toFixed(2) : <span className="pending">Pendent</span>}</td><td>{r.achievementPct !== null ? <><div style={{display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 5}}><span>{r.achievementPct.toFixed(0)}%</span><span className="muted">{r.passed}/{r.total}</span></div><PassBar passed={r.passed} failed={r.failed}/></> : <span className="pending">Evidència insuficient</span>}</td></tr>)}</tbody></table> : <p className="muted">Encara no hi ha cap RA actiu.</p>}

  {convocatoria.blockedOrdinariaCount > 0 && <>
  <h2>Convocatòria extraordinària</h2>
  <div className="reportStats cols6">
   <div className="reportStat"><span>Aprovats a l’ordinària</span><strong>{own.passedPct.toFixed(0)}%</strong><em>{own.passed} de {own.withEvidenceCount} amb RA avaluats</em></div>
   <div className="reportStat"><span>Aprovats finals</span><strong>{convocatoria.passedFinalPct.toFixed(0)}%</strong><em>{convocatoria.passedFinalCount} de {own.count} alumnes actius</em></div>
   <div className="reportStat"><span>Passen a extraordinària</span><strong>{convocatoria.blockedOrdinariaCount}</strong><em>alumne(s) amb algun RA no assolit</em></div>
   <div className="reportStat"><span>Alumnat repetidor</span><strong>{convocatoria.repeaterCount}</strong><em>de {own.count} alumnes actius</em></div>
   <div className="reportStat"><span>Convocatòries exhaurides</span><strong>{convocatoria.exhaustedNames.length}</strong><em>alumne(s) a la 4a convocatòria</em></div>
  </div>
  <div style={{display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 22}}>
   <NameBlock title="Recuperats a l’extraordinària" names={convocatoria.recoveredNames} hint="No superaven l’ordinària però sí el mòdul final, amb les dades actuals de l’extraordinària."/>
   <NameBlock title="Encara no superen el mòdul" names={convocatoria.stillBlockedNames} hint="Segueixen amb algun RA no assolit després de l’extraordinària (o encara sense recuperar)."/>
   <NameBlock title="Convocatòries exhaurides" names={convocatoria.exhaustedNames} hint="Han arribat a 4 convocatòries consumides."/>
  </div>
 </>}

 <h2>Activitats destacades</h2>
  <div className="actGrid" style={{marginBottom: 22}}>
   <ActivitySubPanel tone="green" title="Major èxit" rows={bySuccess} metric="Mitjana" cell={r => r.average!.toFixed(2)}/>
   <ActivitySubPanel tone="red" title="Més dificultat" rows={byDifficulty} metric="% suspesos" cell={r => r.failPct !== null ? `${r.failPct.toFixed(0)}%` : "—"}/>
   <ActivitySubPanel tone="amber" title="Més no lliuraments" rows={byMissing} metric="% no lliurats" cell={r => `${r.notPresentedPct.toFixed(0)}%`}/>
  </div>

  {otherGroup && other && <>
   <h2>Comparació amb Grup {otherGroup.code}</h2>
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
  </>}

  <div className="reportBlock diagCard" style={{margin: "18px 0"}}><h3>Diagnosi automàtica</h3><DiagList items={diagnosis}/></div>

  <div className="reportBlock actionsCard" style={{marginBottom: 22}}><h3>Conclusions i accions suggerides</h3><ol className="reportList">{actions.map((a, i) => <li key={i}>{a}</li>)}</ol><footer>«Les dades no substitueixen el criteri docent, però ens ajuden a prendre millors decisions.»</footer></div>

  <h2>Alumnat per categoria</h2>
  <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 10}}>
   <NameBlock title="Aprovats" names={own.passedNames} hint="Alumnes amb tots i cadascun dels RA avaluats assolits (nota ≥5 i cap activitat obligatòria suspesa), segons normativa. No es basa en la mitjana global."/>
   <NameBlock title="Zona límit" names={own.borderlineNames} hint="Alumnes amb exactament 1 RA no assolit (la resta assolits). No mira la mitjana global, sinó el nombre de RA suspesos."/>
   <NameBlock title="En risc" names={own.riskNames} hint="Alumnes amb 2 o més RA no assolits. No mira la mitjana global, sinó el nombre de RA suspesos."/>
   <NameBlock title="Excel·lència" names={own.excellenceNames}/>
   <NameBlock title="Baixes" names={withdrawnNames}/>
   <NameBlock title="Arxivats" names={archivedNames}/>
  </div>

  <footer>{course.configuration.moduleName} · Grup {group.code} · Dades locals</footer>
 </div></div>, document.body);
}

function NameBlock({title, names, hint}: {title: string; names: string[]; hint?: string}) {
 return <div className="reportBlock">
  <h3>{title} ({names.length})</h3>
  {hint && <p className="muted" style={{margin: "0 0 8px", fontSize: 11, lineHeight: 1.5}}>{hint}</p>}
  {names.length ? <p style={{margin: 0, fontSize: 12, lineHeight: 1.7, color: "#3a4863"}}>{names.join(", ")}</p> : <p className="muted" style={{margin: 0, fontSize: 12}}>Cap alumne.</p>}
 </div>;
}
