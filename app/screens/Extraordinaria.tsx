import {useState} from "react";
import {Archive, ClipboardCheck, Download, Pencil, Plus, Repeat, Users} from "lucide-react";
import {calculateFinalStudent, convocatoriaConsumida, convocatoriaExhaurida} from "../../src/model/calculation";
import {downloadConvocatoriaActaCsv} from "../../src/controllers/database";
import type {AcademicCourse, Group} from "../../src/model/domain";
import {activePeople, findCourse, findGroup, type Mutate} from "../lib/helpers";
import {ActivityEditor} from "./Activities";

export function Extraordinaria({course, group, mutate, goToGrades}: {course: AcademicCourse; group: Group; mutate: Mutate; goToGrades: (activityId: string) => void}) {
 const ras = course.configuration.learningResults.filter(r => r.status === "active");
 const recoveryActivities = course.configuration.activities.filter(a => a.session === "extraordinaria");
 const recoveryActivityFor = (raId: string) => recoveryActivities.find(a => a.status === "active" && a.recoversRaIds.includes(raId));
 const [editingActivity, setEditingActivity] = useState<string | "new" | null>(null);
 const [presetRaIds, setPresetRaIds] = useState<string[]>([]);
 const openNew = (raId?: string) => {setPresetRaIds(raId ? [raId] : []); setEditingActivity("new")};
 const toggleArchive = (activityId: string) => mutate(d => {
  const a = findCourse(d, course.id).configuration.activities.find(x => x.id === activityId)!;
  a.status = a.status === "active" ? "archived" : "active";
 });

 const people = activePeople(group).map(({student, enrollment}) => ({student, enrollment, final: calculateFinalStudent(course, group, enrollment.id)}));
 const blocked = people.filter(p => ras.some(ra => {const e = p.final.ordinaria.learningResults.get(ra.id); return !e || e.score < 5 || e.failingActivities > 0}));
 const setPresented = (enrollmentId: string, value: boolean | null) => mutate(d => {
  findGroup(d, course.id, group.id).enrollments.find(e => e.id === enrollmentId)!.convocatoria.extraordinariaPresented = value;
 });

 return <>
 <article className="panel managementPanel" style={{marginBottom: 16}}>
  <div className="managementHeader"><div className="managementTitle"><span className="sectionIcon"><ClipboardCheck/></span><div><h2>Activitats de recuperació</h2><p>Exàmens o treballs de l’extraordinària, vinculats directament als RA que recuperen (sense repartiment per CA).</p></div></div>{!!ras.length && <button className="dark" onClick={() => openNew()}><Plus/>Nova activitat de recuperació</button>}</div>
  {!ras.length ? <p className="muted" style={{padding: "0 20px 16px"}}>Cal almenys un RA actiu (a «RA, CA i pesos») per poder crear activitats de recuperació.</p>
  : !recoveryActivities.length ? <p className="muted" style={{padding: "0 20px 16px"}}>Encara no hi ha cap activitat de recuperació creada.</p>
  : <div className="managementTableScroll"><table className="managementTable">
   <thead><tr><th>Activitat</th><th>RA que recupera</th><th>Estat</th><th className="actionsHeading">Accions</th></tr></thead>
   <tbody>{recoveryActivities.map(a => <tr key={a.id} className={a.status === "archived" ? "archived" : undefined}>
    <td><strong>{a.name}</strong></td>
    <td><div style={{display: "flex", flexWrap: "wrap", gap: 6}}>{a.recoversRaIds.length ? a.recoversRaIds.map(raId => {const ra = ras.find(r => r.id === raId); return ra ? <span className="bonus" key={raId}>{ra.code}</span> : null}) : <span className="muted">Cap RA seleccionat</span>}</div></td>
    <td>{a.status === "active" ? <span className="ok">Activa</span> : <span className="risk">Arxivada</span>}</td>
    <td><div className="actionRow rowActions"><button className="dark" onClick={() => goToGrades(a.id)}><ClipboardCheck/>Qualifica</button><button onClick={() => setEditingActivity(a.id)}><Pencil/>Edita</button><button title={a.status === "active" ? "Deixa de comptar aquesta activitat, sense eliminar-ne l’historial." : "Torna a comptar aquesta activitat."} onClick={() => toggleArchive(a.id)}><Archive/>{a.status === "active" ? "Arxiva" : "Restaura"}</button></div></td>
   </tr>)}</tbody>
  </table></div>}
 </article>

 <article className="panel managementPanel">
  <div className="managementHeader"><div className="managementTitle"><span className="sectionIcon"><Repeat/></span><div><h2>Convocatòria extraordinària</h2><p>{blocked.length} alumne(s) actiu(s) del grup {group.code} amb el mòdul no superat a l’ordinària.</p></div></div><button title="Exporta una acta CSV amb l’alumnat actiu del grup: repetidor, convocatòria consumida, nota final per RA i resultat final." onClick={() => downloadConvocatoriaActaCsv(course, group)}><Download/>Exporta acta CSV</button></div>
  {!ras.length ? <div className="tableEmpty"><Repeat/><strong>Encara no hi ha cap RA actiu</strong><span>Configura els RA del mòdul a «RA, CA i pesos» abans de gestionar l’extraordinària.</span></div>
  : !blocked.length ? <div className="tableEmpty"><Users/><strong>Cap alumne pendent</strong><span>Tot l’alumnat actiu supera el mòdul a l’ordinària (o encara no hi ha prou evidència per saber-ho).</span></div>
  : <div className="managementTableScroll"><table className="managementTable">
   <thead><tr><th>Alumne</th><th>RA pendents</th><th>Presentat a l’extraordinària</th><th>Convocatòria</th><th>Resultat final</th></tr></thead>
   <tbody>{blocked.map(({student, enrollment, final}) => {
    const pendingRas = ras.filter(ra => {const e = final.ordinaria.learningResults.get(ra.id); return !e || e.score < 5 || e.failingActivities > 0});
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
        : <button title={`Crea l’activitat de recuperació de ${ra.code}`} aria-label={`Crea l’activitat de recuperació de ${ra.code} per a ${student.name}`} onClick={() => openNew(ra.id)}><Plus size={14}/></button>)}
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

 {editingActivity && <ActivityEditor course={course} activity={editingActivity === "new" ? null : recoveryActivities.find(a => a.id === editingActivity) ?? null} mutate={mutate} close={() => setEditingActivity(null)} defaultSession="extraordinaria" defaultRecoverRaIds={presetRaIds}/>}
 </>;
}
