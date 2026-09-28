import {useState} from "react";
import {AlertTriangle, Archive, ClipboardCheck, Pencil, Plus, Repeat, Save, X} from "lucide-react";
import {conflictingRecoveryActivity, newId, type AcademicCourse, type Activity} from "../../src/model/domain";
import {findCourse, type Mutate} from "../lib/helpers";

export function ActivitatsExtraordinaries({course, mutate, goToGrades}: {course: AcademicCourse; mutate: Mutate; goToGrades: (activityId: string) => void}) {
 const [editingActivity, setEditingActivity] = useState<string | "new" | null>(null);
 const activities = course.configuration.activities.filter(a => a.session === "extraordinaria");
 const ras = course.configuration.learningResults.filter(r => r.status === "active");
 const toggleArchive = (activityId: string) => mutate(d => {
  const a = findCourse(d, course.id).configuration.activities.find(x => x.id === activityId)!;
  a.status = a.status === "active" ? "archived" : "active";
 });
 const deleteActivity = (a: Activity) => {
  if (!confirm(`Vols eliminar definitivament «${a.name}»? Aquesta acció no es pot desfer.`)) return;
  mutate(d => {
   const target = findCourse(d, course.id), removedGradeIds = new Set<string>();
   for (const g of target.groups) {
    for (const grade of g.grades.filter(x => x.activityId === a.id)) removedGradeIds.add(grade.id);
    g.grades = g.grades.filter(x => x.activityId !== a.id);
    g.activityStates = g.activityStates.filter(x => x.activityId !== a.id);
   }
   d.gradeHistory = d.gradeHistory.filter(h => !removedGradeIds.has(h.gradeId));
   target.configuration.activities = target.configuration.activities.filter(x => x.id !== a.id);
  });
 };
 return <>
  <article className="panel managementPanel">
   <div className="managementHeader"><div className="managementTitle"><span className="sectionIcon"><Repeat/></span><div><h2>Activitats extraordinàries</h2><p>Exàmens o treballs de recuperació de la convocatòria extraordinària. Cada activitat recupera directament un o més RA (sense repartiment per CA) i no compta mai en la nota de l’ordinària.</p></div></div>{!!ras.length && <button className="dark" onClick={() => setEditingActivity("new")}><Plus/>Nova activitat de recuperació</button>}</div>
   {!ras.length ? <p className="muted" style={{padding: "0 20px 16px"}}>Cal almenys un RA actiu (a «RA, CA i pesos») per poder crear-ne.</p>
   : !activities.length ? <div className="tableEmpty"><Repeat/><strong>Encara no hi ha cap activitat extraordinària</strong><span>Crea-la amb «Nova activitat de recuperació».</span></div>
   : <div className="activities">{activities.map(a => <article className={a.status === "archived" ? "archived" : undefined} key={a.id}>
     <mark title="Activitat de la convocatòria extraordinària" style={{background: "#fdecc8", color: "#9a6400"}}>Extraordinària</mark>
     <span>{course.configuration.activityTypes.find(t => t.id === a.activityTypeId)?.name}</span>
     <h2>{a.name}</h2>
     <p>{a.date ?? "Sense data"}</p>
     <div style={{display: "flex", flexWrap: "wrap", gap: 6, margin: "12px 0"}}>{a.recoversRaIds.length ? a.recoversRaIds.map(raId => {const ra = ras.find(r => r.id === raId); return ra ? <span className="bonus" key={raId} title={`Recupera ${ra.code}: ${ra.description}`}>{ra.code}</span> : null}) : <span className="muted">Cap RA seleccionat</span>}</div>
     <span className={a.status === "active" ? "ok" : "pending"} style={{display: "block", width: "fit-content", margin: "18px 0"}}>{a.status === "active" ? "Activa" : "Arxivada"}</span>
     <footer><button className="dark" onClick={() => goToGrades(a.id)}><ClipboardCheck/>Qualifica</button><button onClick={() => setEditingActivity(a.id)}><Pencil/>Edita</button><button title={a.status === "active" ? "Deixa de comptar aquesta activitat, sense eliminar-ne l’historial. Es pot restaurar." : "Torna a comptar aquesta activitat."} onClick={() => toggleArchive(a.id)}><Archive/>{a.status === "active" ? "Arxiva" : "Restaura"}</button><button title="Elimina definitivament l’activitat, les seves notes i el seu historial. No es pot desfer." onClick={() => deleteActivity(a)}>Elimina</button></footer>
    </article>)}</div>}
  </article>
  {editingActivity && <RecoveryActivityEditor course={course} activity={editingActivity === "new" ? null : activities.find(a => a.id === editingActivity) ?? null} mutate={mutate} close={() => setEditingActivity(null)}/>}
 </>;
}

function RecoveryActivityEditor({course, activity, mutate, close}: {course: AcademicCourse; activity: Activity | null; mutate: Mutate; close: () => void}) {
 const types = course.configuration.activityTypes.filter(t => t.status === "active");
 const [name, setName] = useState(activity?.name ?? "");
 const [typeId, setTypeId] = useState(activity?.activityTypeId ?? types[0]?.id ?? "");
 const [date, setDate] = useState(activity?.date ?? "");
 const [recoverIds, setRecoverIds] = useState<string[]>(activity?.recoversRaIds ?? []);
 const activeRas = course.configuration.learningResults.filter(r => r.status === "active");
 const toggleRa = (raId: string) => setRecoverIds(ids => ids.includes(raId) ? ids.filter(x => x !== raId) : [...ids, raId]);
 const conflicts = recoverIds.filter(raId => conflictingRecoveryActivity(course.configuration.activities, raId, activity?.id));
 const valid = !!name.trim() && !!typeId && !conflicts.length;
 const save = () => {
  if (!valid) return;
  mutate(d => {
   const cfg = findCourse(d, course.id).configuration;
   if (activity) {
    const x = cfg.activities.find(x => x.id === activity.id)!;
    x.name = name.trim(); x.activityTypeId = typeId; x.date = date || null; x.recoversRaIds = recoverIds;
   } else {
    const a = {id: newId("activity"), name: name.trim(), activityTypeId: typeId, term: cfg.termCount || 2, date: date || null, order: cfg.activities.length + 1, status: "active" as const, session: "extraordinaria" as const, recoversRaIds: recoverIds};
    cfg.activities.push(a);
    findCourse(d, course.id).groups.forEach(g => g.activityStates.push({activityId: a.id, automaticEvaluatedAt: null, manualOverride: null, locked: false}));
   }
  });
  close();
 };
 return <div className="modal"><div className="dialog">
  <div className="panelHeader"><h2>{activity ? "Edita l’activitat de recuperació" : "Nova activitat de recuperació"}</h2><button onClick={close}><X/></button></div>
  <div className="configRow" style={{border: 0, paddingTop: 12}}><div><span className="muted">Nom</span><input value={name} onChange={e => setName(e.target.value)} style={{width: "100%", border: "1px solid var(--line)", borderRadius: 9, padding: "8px 10px", marginTop: 4}}/></div></div>
  <div className="configRow"><div><span className="muted">Tipus d’activitat</span><select value={typeId} onChange={e => setTypeId(e.target.value)} style={{width: "100%", marginTop: 4}}>{types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div></div>
  <div className="configRow"><div><span className="muted">Data (opcional)</span><input type="date" value={date ?? ""} onChange={e => setDate(e.target.value)} style={{width: "100%", border: "1px solid var(--line)", borderRadius: 9, padding: "8px 10px", marginTop: 4}}/></div></div>
  <div className="configRow"><div><span className="muted">RA que recupera aquesta activitat</span><div style={{display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6}}>{activeRas.map(ra => {
    const conflict = conflictingRecoveryActivity(course.configuration.activities, ra.id, activity?.id);
    const checked = recoverIds.includes(ra.id);
    return <label key={ra.id} title={conflict ? `Ja té una recuperació activa: «${conflict.name}»` : ra.description} style={{display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid var(--line)", borderRadius: 9, padding: "6px 10px", opacity: conflict && !checked ? .5 : 1}}><input type="checkbox" checked={checked} disabled={!!conflict && !checked} onChange={() => toggleRa(ra.id)}/>{ra.code}</label>;
   })}</div>
   {!activeRas.length && <p className="risk" style={{marginTop: 6}}>Cal almenys un RA actiu.</p>}
   {conflicts.length > 0 && <p className="risk" style={{marginTop: 6}}><AlertTriangle size={13}/> Algun RA seleccionat ja té una altra activitat de recuperació activa.</p>}
  </div></div>
  <div className="panelHeader" style={{marginTop: 16}}><span className={types.length ? "muted" : "risk"}>{types.length ? "" : "Cal almenys un tipus d’activitat actiu."}</span><div className="actionRow"><button onClick={close}>Cancel·la</button><button className="dark" disabled={!valid} style={{opacity: valid ? 1 : .5}} onClick={save}><Save/>Desa</button></div></div>
 </div></div>;
}
