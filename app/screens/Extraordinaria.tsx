import {Download, Repeat, Users} from "lucide-react";
import {calculateFinalStudent, convocatoriaConsumida, convocatoriaExhaurida} from "../../src/model/calculation";
import {downloadConvocatoriaActaCsv} from "../../src/controllers/database";
import type {AcademicCourse, Group} from "../../src/model/domain";
import {activePeople, findGroup, type Mutate} from "../lib/helpers";

export function Extraordinaria({course, group, mutate}: {course: AcademicCourse; group: Group; mutate: Mutate}) {
 const ras = course.configuration.learningResults.filter(r => r.status === "active");
 const people = activePeople(group).map(({student, enrollment}) => ({student, enrollment, final: calculateFinalStudent(course, group, enrollment.id)}));
 const blocked = people.filter(p => ras.some(ra => {const e = p.final.ordinaria.learningResults.get(ra.id); return !e || e.score < 5 || e.failingActivities > 0}));
 const setPresented = (enrollmentId: string, value: boolean | null) => mutate(d => {
  findGroup(d, course.id, group.id).enrollments.find(e => e.id === enrollmentId)!.convocatoria.extraordinariaPresented = value;
 });
 return <article className="panel managementPanel">
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
     <td><div style={{display: "flex", flexWrap: "wrap", gap: 6}}>{pendingRas.map(ra => {
      const r = final.learningResults.get(ra.id)!;
      return <span key={ra.id} className={r.achieved ? "ok" : "risk"} title={`${r.source === "extraordinaria" ? "Recuperat a l’extraordinària" : "Ordinària"}: ${r.score.toFixed(2)}`}>{ra.code} {r.achieved ? "recuperat" : "pendent"}</span>;
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
 </article>;
}
