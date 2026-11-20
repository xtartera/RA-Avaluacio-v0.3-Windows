import {useMemo, useState} from "react";
import {createPortal} from "react-dom";
import {FileDown, FileText, Printer, X} from "lucide-react";
import type {AcademicCourse, AppDatabase, Group} from "../../src/model/domain";
import {jointCourses} from "../../src/model/joint";
import {analyzeCurrentEvidence, TRAFFIC_ORDER, type CurrentEvidence, type TrafficColor} from "../../src/model/currentEvidence";
import {TrafficChip} from "../components/diagnosticViews";
import {InitialReport} from "./InitialReport";
import type {Mutate} from "../lib/helpers";

const fmt = (n: number | null) => n === null ? "—" : n.toLocaleString("ca", {minimumFractionDigits: 1, maximumFractionDigits: 1});
const COLORS: TrafficColor[] = ["vermell", "groc", "verd", "gris"];
const DOT: Record<TrafficColor, string> = {vermell: "#d64558", groc: "#e0a31a", verd: "#2f9e6a", gris: "#98a4b5"};

interface Row {enrollmentId: string; name: string; ev: CurrentEvidence | null}

/** Resum del grup: semàfor per alumne, prioritats i impressió de tots els informes. */
export function InitialGroupSummary({db, course, group, mutate, openReport}: {db: AppDatabase; course: AcademicCourse; group: Group; mutate: Mutate; openReport: (enrollmentId: string) => void}) {
  const [printing, setPrinting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const modules = jointCourses(db, course);
  const download = async (build: () => Promise<Blob>, fileName: string) => {
    setBusy(true);
    try {
      const blob = await build();
      const url = URL.createObjectURL(blob), link = document.createElement("a");
      link.href = url; link.download = fileName;
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    } finally { setBusy(false); }
  };
  const year = course.academicYear.replace(/[^0-9]+/g, "-");
  const downloadActa = async (kind: "preavaluacio" | "avaluacio1", joint: boolean) => {
    const {buildActaDocx, buildJointActaDocx} = await import("../lib/preevaluationDoc");
    const label = kind === "preavaluacio" ? "preavaluacio" : "1a_avaluacio";
    setBusyKey(`${kind}-${joint ? "tots" : "un"}`);
    try { await download(joint ? () => buildJointActaDocx(kind, modules, group.code) : () => buildActaDocx(kind, course, group),
      joint ? `Acta_${label}_tots_els_moduls_${group.code}_${year}.docx` : `Acta_${label}_${course.configuration.abbreviation}_${group.code}_${year}.docx`); } finally { setBusyKey(null); }
  };
  const rows: Row[] = useMemo(() => group.enrollments.filter(e => e.status === "active").map(e => {
    const name = group.students.find(s => s.id === e.studentId)?.name ?? "—";
    return {enrollmentId: e.id, name, ev: analyzeCurrentEvidence(course, group, e.id, name, {unitId: null, observation: group.observations.find(o => o.enrollmentId === e.id)})};
  }).sort((a, b) => TRAFFIC_ORDER[a.ev?.traffic.color ?? "gris"] - TRAFFIC_ORDER[b.ev?.traffic.color ?? "gris"] || a.name.localeCompare(b.name, "ca")), [course, group]);
  const count = (c: TrafficColor) => rows.filter(r => (r.ev?.traffic.color ?? "gris") === c).length;
  const attention = rows.filter(r => r.ev && (r.ev.traffic.color === "vermell" || r.ev.traffic.color === "groc"));

  if (!rows.length) return <div className="tableEmpty"><strong>El grup no té alumnes actius</strong></div>;
  return <>
    <div className="managementToolbar" style={{gap: 14, flexWrap: "wrap"}}>
      <div style={{display: "flex", gap: 10, flexWrap: "wrap"}}>{COLORS.map(c => <span key={c} className="bonus" style={{display: "inline-flex", alignItems: "center", gap: 6, background: "#f5f8fc", color: "#40536f", fontWeight: 700}}><i style={{width: 10, height: 10, borderRadius: "50%", background: DOT[c], display: "inline-block"}}/>{c.charAt(0).toUpperCase() + c.slice(1)}: {count(c)}</span>)}</div>
      <div className="actionRow" style={{marginLeft: "auto"}}><button className="dark" onClick={() => setPrinting(true)} title="Un informe per alumne, per imprimir-los tots"><Printer/>Imprimeix tots els informes</button></div>
    </div>
    <div className="actaCards" aria-label="Actes d'avaluació en Word">
      {([
        {kind: "preavaluacio" as const, title: "Acta de preavaluació", text: "Primers resultats d'activitats: un comentari i un semàfor per alumne, per a la sessió de preavaluació."},
        {kind: "avaluacio1" as const, title: "Acta de la 1a avaluació", text: "Resultats d'aprenentatge: els RA assolits, els que van en curs (amb la nota i el que en falta) i els que cal recuperar, sempre en positiu."},
      ]).map(card => <article className="actaCard" key={card.kind}>
        <div className="actaCardHead"><b><FileText size={18}/></b><div><strong>{card.title}</strong><span className="desc">{card.text}</span></div><span className="actaCardTag">WORD</span></div>
        <div className="actaCardActions">
          <button onClick={() => void downloadActa(card.kind, false)} disabled={busy} title="Només els alumnes d'aquest mòdul, amb un semàfor gran per alumne. Editable i es pot pujar a Drive">
            <FileDown/><span><b>{busyKey === `${card.kind}-un` ? "Generant…" : `Aquest mòdul · ${course.configuration.abbreviation}`}</b><small>Un semàfor per alumne</small></span>
          </button>
          {modules.length > 1 && <button onClick={() => void downloadActa(card.kind, true)} disabled={busy} title="Per cada alumne, el comentari de cadascun dels seus mòduls i un sol semàfor circular dividit en parts">
            <FileDown/><span><b>{busyKey === `${card.kind}-tots` ? "Generant…" : `Tots els mòduls · ${modules.length}`}</b><small>Un sol semàfor dividit en parts</small></span>
          </button>}
        </div>
      </article>)}
    </div>
    {attention.length > 0 && <div className="reportBlock" style={{margin: "14px 22px"}}><h3>Alumnes a atendre ({attention.length})</h3><ul className="reportList" style={{marginTop: 0}}>{attention.map(r => <li key={r.enrollmentId}><b>{r.name}</b> · <TrafficChip traffic={r.ev!.traffic} withReasons/></li>)}</ul></div>}
    <div className="managementTableScroll"><table className="managementTable obsTable"><thead><tr><th>Alumne</th><th>Semàfor</th><th title="Activitats corregides amb nota superior a 0">Lliuraments</th><th title="Mitjana de les activitats corregides; un 0 compta com a 0">Mitjana</th><th>Grup</th><th title="Mitjana només de les activitats lliurades">Quan lliura</th><th>Obligatòries</th><th>Avaluat</th><th>Informe</th></tr></thead><tbody>{rows.map(r => <tr key={r.enrollmentId}>
      <td><strong>{r.name}</strong></td>
      <td>{r.ev ? <TrafficChip traffic={r.ev.traffic}/> : <span className="muted">Sense activitats corregides</span>}</td>
      <td>{r.ev ? `${r.ev.delivered} de ${r.ev.activities.length}` : "—"}</td>
      <td><b>{fmt(r.ev?.average ?? null)}</b></td>
      <td>{fmt(r.ev?.groupAverage ?? null)}</td>
      <td>{fmt(r.ev?.averageDelivered ?? null)}</td>
      <td>{r.ev?.required.total ? `${r.ev.required.passed} de ${r.ev.required.total}` : "—"}</td>
      <td>{r.ev ? `${Math.round(r.ev.coveragePct)} %` : "—"}</td>
      <td><div className="actionRow"><button onClick={() => openReport(r.enrollmentId)} aria-label={`Informe de ${r.name}`} title="Informe d'aquest alumne">Informe</button></div></td>
    </tr>)}</tbody></table></div>
    <p className="muted" style={{fontSize: 11, margin: "12px 22px"}}>El color és la mitjana de les activitats corregides (un 0 compta com a 0): <b>verd</b> 7 o més, <b>groc</b> de 5 a menys de 7, <b>vermell</b> menys de 5 o un examen obligatori per recuperar; <b>gris</b> si hi ha menys de 2 activitats corregides. La constància baixa, l’evolució a la baixa i estar molt per sota del grup surten com a avís, sense canviar el color. Descriu dades i no substitueix el criteri docent.</p>
    {printing && createPortal(<div className="modal"><div className="report initialReport" role="dialog" aria-modal="true" aria-label="Informes de tot el grup">
      <div className="noPrint reportActions"><button onClick={() => setPrinting(false)} autoFocus><X/>Tanca</button><button className="dark" onClick={() => window.print()}><Printer/>Imprimeix</button></div>
      {rows.filter(r => r.ev).map(r => <InitialReport key={r.enrollmentId} embedded course={course} group={group} activityId={null} enrollmentId={r.enrollmentId} mutate={mutate} close={() => setPrinting(false)}/>)}
    </div></div>, document.body)}
  </>;
}
