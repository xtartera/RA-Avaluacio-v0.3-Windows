import {useState} from "react";
import {createPortal} from "react-dom";
import {ClipboardCheck, Printer, Repeat, Users, X} from "lucide-react";
import {calculateFinalStudent, convocatoriaConsumida, convocatoriaExhaurida, raIsFailing} from "../../src/model/calculation";
import {summarizeConvocatoria} from "../lib/groupAnalytics";
import type {AcademicCourse, Group} from "../../src/model/domain";
import {activePeople, findGroup, type Mutate} from "../lib/helpers";

export function Extraordinaria({course, group, mutate, goToGrades, goToActivitatsExtra}: {course: AcademicCourse; group: Group; mutate: Mutate; goToGrades: (activityId: string) => void; goToActivitatsExtra: () => void}) {
 const [showActa, setShowActa] = useState(false);
 const ras = course.configuration.learningResults.filter(r => r.status === "active");
 const recoveryActivityFor = (raId: string) => course.configuration.activities.find(a => a.status === "active" && a.session === "extraordinaria" && a.recoversRaIds.includes(raId));
 const people = activePeople(group).map(({student, enrollment}) => ({student, enrollment, final: calculateFinalStudent(course, group, enrollment.id)}));
 const blocked = people.filter(p => ras.some(ra => raIsFailing(p.final.ordinaria.learningResults.get(ra.id))));
 const setPresented = (enrollmentId: string, value: boolean | null) => mutate(d => {
  findGroup(d, course.id, group.id).enrollments.find(e => e.id === enrollmentId)!.convocatoria.extraordinariaPresented = value;
 });

 return <>
 <article className="panel managementPanel">
  <div className="managementHeader"><div className="managementTitle"><span className="sectionIcon"><Repeat/></span><div><h2>Convocatòria extraordinària</h2><p>{blocked.length} alumne(s) actiu(s) del grup {group.code} amb el mòdul no superat a l’ordinària. Les activitats de recuperació es defineixen a «Activitats extraordinàries».</p></div></div><button className="dark" title="Obre una acta imprimible amb l’alumnat actiu del grup: repetidor, convocatòria consumida, RA pendents i resultat final." onClick={() => setShowActa(true)}><Printer/>Imprimeix acta</button></div>
  {!ras.length ? <div className="tableEmpty"><Repeat/><strong>Encara no hi ha cap RA actiu</strong><span>Configura els RA del mòdul a «RA, CA i pesos» abans de gestionar l’extraordinària.</span></div>
  : !blocked.length ? <div className="tableEmpty"><Users/><strong>Cap alumne pendent</strong><span>Tot l’alumnat actiu supera el mòdul a l’ordinària (o encara no hi ha prou evidència per saber-ho).</span></div>
  : <div className="managementTableScroll"><table className="managementTable">
   <thead><tr><th>Alumne</th><th>RA pendents</th><th>Presentat a l’extraordinària</th><th>Convocatòria</th><th>Resultat final</th></tr></thead>
   <tbody>{blocked.map(({student, enrollment, final}) => {
    const pendingRas = ras.filter(ra => raIsFailing(final.ordinaria.learningResults.get(ra.id)));
    const consumed = convocatoriaConsumida(enrollment), exhaurida = convocatoriaExhaurida(enrollment);
    const presented = enrollment.convocatoria.extraordinariaPresented;
    return <tr key={enrollment.id}>
     <td><div className="studentIdentity"><span className="studentAvatar" aria-hidden="true">{student.name.split(/\s+/).slice(0, 2).map(n => n[0]).join("")}</span><strong>{student.name}</strong>{enrollment.convocatoria.isRepeater && <span className="bonus" title="Alumne repetidor">Repetidor</span>}</div></td>
     <td><div style={{display: "flex", flexWrap: "wrap", gap: 8}}>{pendingRas.map(ra => {
      const r = final.learningResults.get(ra.id)!;
      const recovery = recoveryActivityFor(ra.id);
      return <div key={ra.id} style={{display: "flex", alignItems: "center", gap: 4}}>
       <span className={r.achieved ? "ok" : "risk"} title={`${r.source === "extraordinaria" ? "Recuperat a l’extraordinària" : "Ordinària"}: ${r.score.toFixed(2)}`}>{ra.code} {r.achieved ? "recuperat" : "pendent"}</span>
       {!r.achieved && (recovery
        ? <button title={`Qualifica «${recovery.name}»`} aria-label={`Qualifica la recuperació de ${ra.code} de ${student.name}`} onClick={() => goToGrades(recovery.id)}><ClipboardCheck size={14}/></button>
        : <button className="risk" style={{border: 0, background: "none", padding: 0, fontSize: 11, cursor: "pointer"}} title="Encara no hi ha cap activitat de recuperació per a aquest RA" onClick={goToActivitatsExtra}>sense activitat →</button>)}
      </div>;
     })}</div></td>
     <td><select aria-label={`Presentat a l’extraordinària: ${student.name}`} value={presented === null ? "pendent" : presented ? "si" : "no"} onChange={e => setPresented(enrollment.id, e.target.value === "pendent" ? null : e.target.value === "si")}>
      <option value="pendent">Pendent</option><option value="si">Sí</option><option value="no">No</option>
     </select></td>
     <td><span className={exhaurida ? "risk" : undefined}>{consumed}/4{exhaurida ? " · Exhaurida" : ""}</span></td>
     <td>{final.modulePassed ? <span className="ok">Mòdul superat</span> : <span className="risk">Mòdul no superat</span>}</td>
    </tr>;
   })}</tbody>
  </table></div>}
  <footer className="managementFooter">Només es mostren els alumnes actius amb el mòdul no superat a l’ordinària (algun RA amb nota &lt;5 o amb una activitat obligatòria suspesa). La nota de recuperació substitueix la de l’ordinària tal qual, sense límit superior. La convocatòria (0-4) es compta sola: baseline heretat (gestiona’l a «Alumnes» → «⋯» → «Gestiona convocatòria») + 1 per l’ordinària d’enguany + 1 si es presenta a l’extraordinària.</footer>
 </article>
 {showActa && <ActaExtraordinariaPrintReport course={course} group={group} close={() => setShowActa(false)}/>}
 </>;
}

function ActaExtraordinariaPrintReport({course, group, close}: {course: AcademicCourse; group: Group; close: () => void}) {
 const ras = course.configuration.learningResults.filter(r => r.status === "active");
 const summary = summarizeConvocatoria(course, group);
 const activeCount = activePeople(group).length;
 const people = activePeople(group).map(({student, enrollment}) => ({student, enrollment, final: calculateFinalStudent(course, group, enrollment.id)}));
 const blocked = people.filter(p => ras.some(ra => raIsFailing(p.final.ordinaria.learningResults.get(ra.id))));
 const presentedLabel = (v: boolean | null) => v === null ? "Pendent" : v ? "Sí" : "No";
 return createPortal(<div className="modal"><div className="report">
  <div className="noPrint reportActions"><button onClick={close}><X/>Tanca</button><button className="dark" onClick={() => window.print()}><Printer/>Imprimeix</button></div>

  <div className="reportHead"><Repeat/><div><small>ACTA DE CONVOCATÒRIA EXTRAORDINÀRIA</small><h1>Grup {group.code}</h1><p>{course.configuration.moduleName} · {course.configuration.level} · {course.academicYear}</p></div><div className="bigScore"><span>APROVATS FINALS</span><strong>{summary.passedFinalPct.toFixed(0)}%</strong><em>{summary.passedFinalCount} de {activeCount} alumnes actius</em></div></div>

  <div className="reportStats cols6">
   <div className="reportStat"><span>Passen a extraordinària</span><strong>{summary.blockedOrdinariaCount}</strong><em>amb algun RA no assolit</em></div>
   <div className="reportStat"><span>Recuperats</span><strong>{summary.recoveredNames.length}</strong><em>ja superen el mòdul</em></div>
   <div className="reportStat"><span>Encara no superen</span><strong>{summary.stillBlockedNames.length}</strong><em>mòdul no superat</em></div>
   <div className="reportStat"><span>Convocatòries exhaurides</span><strong>{summary.exhaustedNames.length}</strong><em>a la 4a convocatòria</em></div>
   <div className="reportStat"><span>Alumnat repetidor</span><strong>{summary.repeaterCount}</strong><em>d’aquest grup</em></div>
   <div className="reportStat"><span>Nota final mitjana</span><strong>{summary.finalAverage.toFixed(2)}</strong><em>ordinària + extraordinària</em></div>
  </div>

  <h2>Detall per alumne</h2>
  {blocked.length ? <table><thead><tr><th>Alumne</th><th>RA pendents a l’ordinària</th><th>Presentat</th><th>Convocatòria</th><th>Resultat final</th></tr></thead>
   <tbody>{blocked.map(({student, enrollment, final}) => {
    const pendingRas = ras.filter(ra => raIsFailing(final.ordinaria.learningResults.get(ra.id)));
    const consumed = convocatoriaConsumida(enrollment), exhaurida = convocatoriaExhaurida(enrollment);
    return <tr key={enrollment.id}>
     <td><strong>{student.name}</strong>{enrollment.convocatoria.isRepeater && <><br/><small className="muted">Repetidor</small></>}</td>
     <td>{pendingRas.map(ra => `${ra.code} (${final.learningResults.get(ra.id)!.achieved ? "recuperat" : "pendent"})`).join(", ")}</td>
     <td>{presentedLabel(enrollment.convocatoria.extraordinariaPresented)}</td>
     <td>{consumed}/4{exhaurida ? " · Exhaurida" : ""}</td>
     <td>{final.modulePassed ? <span className="ok">Superat</span> : <span className="risk">No superat</span>}</td>
    </tr>;
   })}</tbody>
  </table> : <p className="muted">Cap alumne actiu amb el mòdul no superat a l’ordinària.</p>}

  <footer>{course.configuration.moduleName} · Grup {group.code} · {course.academicYear} · Dades locals</footer>
 </div></div>, document.body);
}
