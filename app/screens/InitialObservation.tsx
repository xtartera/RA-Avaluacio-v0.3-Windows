import {useState} from "react";
import {Download, Eye, FileText, Info, ShieldCheck, Upload} from "lucide-react";
import {applyObservationRows, buildObservationCsv, parseObservationCsv} from "../../src/controllers/observationCsv";
import {nowIso, type AcademicCourse, type Group, type ObservationFactor, type ObservationKey, type ObservationLevel} from "../../src/model/domain";
import {hasObservation, observationAverage, OBSERVATION_FACTORS, OBSERVATION_ITEMS, OBSERVATION_LEVEL_HINT} from "../../src/model/observation";
import {activePeople, findGroup, type Mutate} from "../lib/helpers";

const HELP_CSV = 'Importa les observacions d\'un CSV (separador «;» o «,»).\nCapçalera: alumne;autonomia;entorn;errors;organitzacio;implicacio;comunicacio;factors;nota\nValors d\'1 a 4 (buit = no observat); factors separats per «|»: llengua, oral, ritme, altres.\nSubstitueix l\'observació dels alumnes que hi coincideixen pel nom.';
const LEVELS: ObservationLevel[] = [1, 2, 3, 4];
const LEVEL_TONE: Record<ObservationLevel, {background: string; color: string}> = {
  1: {background: "#fbe7ea", color: "#b23a4b"},
  2: {background: "#fff3d6", color: "#8a6410"},
  3: {background: "#e6eefc", color: "#2f5fb3"},
  4: {background: "#e3f6ec", color: "#15825f"},
};

/**
 * Graella ràpida de l'observació a l'aula: una fila per alumne, sis ítems d'1 a 4, factors de context i una nota.
 * Es desa en cada clic. No compta per a la nota i els factors i la nota no s'imprimeixen mai.
 */
export function InitialObservation({course, group, mutate, msg, openReport}: {course: AcademicCourse; group: Group; mutate: Mutate; msg: (s: string) => void; openReport?: (enrollmentId: string) => void}) {
  const people = activePeople(group);
  const [query, setQuery] = useState("");
  const byEnrollment = new Map(group.observations.map(o => [o.enrollmentId, o]));
  const observed = people.filter(p => hasObservation(byEnrollment.get(p.enrollment.id))).length;
  const visible = people.filter(p => p.student.name.toLocaleLowerCase("ca").includes(query.trim().toLocaleLowerCase("ca")));

  const update = (enrollmentId: string, change: (o: {levels: Partial<Record<ObservationKey, ObservationLevel>>; factors: ObservationFactor[]; note?: string}) => void) =>
    mutate(d => {
      const g = findGroup(d, course.id, group.id);
      let o = g.observations.find(x => x.enrollmentId === enrollmentId);
      if (!o) { o = {enrollmentId, levels: {}, factors: [], updatedAt: nowIso()}; g.observations.push(o); }
      change(o); o.updatedAt = nowIso();
      // Una observació sense cap valoració, factor ni nota no té sentit de guardar-la.
      if (!hasObservation(o) && !o.factors.length && !o.note) g.observations = g.observations.filter(x => x !== o);
    });

  const candidates = people.map(p => ({enrollmentId: p.enrollment.id, name: p.student.name}));
  const importCsv = async (file: File | undefined) => {
    if (!file) return;
    try {
      const {rows, warnings} = parseObservationCsv(await file.text());
      const probe = applyObservationRows(structuredClone(group), candidates, rows);
      if (!probe.applied) return msg(`Cap alumne del fitxer coincideix amb el grup ${group.code}.${probe.unmatched.length ? ` No trobats: ${probe.unmatched.slice(0, 5).join("; ")}.` : ""}`);
      const detail = [probe.replaced ? `se'n substituirà l'observació de ${probe.replaced}` : "", probe.unmatched.length ? `${probe.unmatched.length} no es troben al grup (${probe.unmatched.slice(0, 3).join("; ")}${probe.unmatched.length > 3 ? "…" : ""})` : "", warnings.length ? `${warnings.length} avís(os) de format` : ""].filter(Boolean).join(" · ");
      if (!confirm(`S'importaran ${probe.applied} observacions al grup ${group.code}.${detail ? `
${detail}.` : ""}
Continuar?`)) return;
      mutate(d => { applyObservationRows(findGroup(d, course.id, group.id), candidates, rows); });
      msg(`${probe.applied} observació(ns) importada(es). No afecten la nota del mòdul.`);
    } catch (e) { msg(e instanceof Error ? e.message : String(e)); }
  };
  const exportCsv = () => {
    const blob = new Blob(["﻿" + buildObservationCsv(candidates, group.observations)], {type: "text/csv;charset=utf-8"});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob); link.download = `observacio-inicial-${course.configuration.abbreviation}-${group.code}-${new Date().toISOString().slice(0, 10)}.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };

  return <>
    <div style={{padding: "0 22px"}}>
      <div className="warnNote" style={{background: "#eef4ff", borderColor: "#cfdcf5", color: "#2f4f86"}}><Info size={15}/><span><b>No compta per a la nota.</b> Descriu què fa l'alumne amb la tasca, pel canal que sigui (oral, escrit, esquemes o demostrant-ho a la màquina): una valoració per ítem, d'1 a 4, a l'inici del curs. Clica el nivell triat una altra vegada per deixar-lo «no observat».</span></div>
      <div style={{display: "flex", gap: 8, flexWrap: "wrap", margin: "0 0 12px"}}>{LEVELS.map(l => <span className="bonus" key={l} style={LEVEL_TONE[l]}>{l} · {OBSERVATION_LEVEL_HINT[l]}</span>)}</div>
      <div className="warnNote" style={{background: "#f3fbf7", borderColor: "#cfeadb", color: "#256b4d"}}><ShieldCheck size={15}/><span><b>Privacitat:</b> els factors de context ajuden a interpretar l'observació però <b>no són cap diagnòstic</b> i <b>no s'imprimeixen mai</b> als informes (només hi surt un avís genèric). Tampoc no hi surt la nota breu.</span></div>
    </div>
    <div className="managementToolbar" style={{alignItems: "center", gap: 14, flexWrap: "wrap"}}>
      <label className="searchField"><Eye/><input aria-label="Cerca alumne" placeholder="Cerca un alumne…" value={query} onChange={e => setQuery(e.target.value)}/></label>
      <span className="muted" style={{fontSize: 12.5}}><b>{observed} de {people.length}</b> alumnes amb alguna observació</span>
      <div className="actionRow" style={{marginLeft: "auto"}}>
        <label className="buttonLike" title={HELP_CSV}><Upload/>Importa CSV<input hidden type="file" accept=".csv,text/csv" onChange={e => { void importCsv(e.target.files?.[0]); e.target.value = ""; }}/></label>
        <button onClick={exportCsv} title="Descarrega les observacions actuals en un CSV (inclou factors i notes: és només per a tu)"><Download/>Exporta CSV</button>
      </div>
    </div>
    <div className="managementTableScroll"><table className="managementTable obsTable"><thead><tr><th style={{position: "sticky", left: 0, zIndex: 2, background: "#fafbfd"}}>Alumne</th>{OBSERVATION_ITEMS.map(i => <th key={i.key} title={`${i.hint}\n1: ${i.low}\n4: ${i.high}`}>{i.label}</th>)}<th>Mitjana</th><th title="Context per interpretar l'observació. No s'imprimeix.">Context</th><th>Nota breu</th></tr></thead>
      <tbody>{visible.map(({student, enrollment}) => {
        const o = byEnrollment.get(enrollment.id), avg = observationAverage(o);
        return <tr key={enrollment.id}>
          <td style={{position: "sticky", left: 0, zIndex: 1, background: "white"}}><div style={{display: "flex", alignItems: "center", gap: 6, justifyContent: "space-between"}}><strong>{student.name}</strong>{openReport && <div className="actionRow"><button onClick={() => openReport(enrollment.id)} aria-label={`Informe de ${student.name}`} title="Informe amb l'observació i els resultats acumulats de la UT"><FileText/></button></div>}</div></td>
          {OBSERVATION_ITEMS.map(item => <td key={item.key}><div role="radiogroup" aria-label={`${item.label} de ${student.name}`} style={{display: "inline-flex", gap: 3}}>{LEVELS.map(l => {
            const on = o?.levels[item.key] === l;
            return <button key={l} role="radio" aria-checked={on} title={`${item.label}: ${OBSERVATION_LEVEL_HINT[l]}`} onClick={() => update(enrollment.id, x => { if (x.levels[item.key] === l) delete x.levels[item.key]; else x.levels[item.key] = l; })}
              style={{width: 26, height: 26, borderRadius: 8, border: on ? "1px solid transparent" : "1px solid var(--line)", background: on ? LEVEL_TONE[l].background : "white", color: on ? LEVEL_TONE[l].color : "#8a96a8", fontWeight: 800, fontSize: 12, cursor: "pointer", padding: 0, outlineOffset: 2}}>{l}</button>;
          })}</div></td>)}
          <td><b>{avg === null ? "—" : avg.toLocaleString("ca", {minimumFractionDigits: 1, maximumFractionDigits: 1})}</b></td>
          <td><div style={{display: "flex", gap: 4, flexWrap: "wrap", minWidth: 0}}>{OBSERVATION_FACTORS.map(f => { const on = !!o?.factors.includes(f.key); return <button key={f.key} aria-pressed={on} title={f.hint} onClick={() => update(enrollment.id, x => { x.factors = on ? x.factors.filter(k => k !== f.key) : [...x.factors, f.key]; })} style={{borderRadius: 14, border: on ? "1px solid #b7c8ee" : "1px solid var(--line)", background: on ? "#e6eefc" : "white", color: on ? "#2f5fb3" : "#8a96a8", fontSize: 10.5, fontWeight: 700, padding: "3px 8px", cursor: "pointer"}}>{f.label}</button>; })}</div></td>
          <td><NoteField key={`${enrollment.id}:${o?.note ?? ""}`} value={o?.note ?? ""} label={`Nota breu de ${student.name}`} save={text => update(enrollment.id, x => { x.note = text.trim() || undefined; })}/></td>
        </tr>;
      })}</tbody></table>{!visible.length && <div className="tableEmpty"><strong>Cap alumne coincideix amb la cerca</strong></div>}</div>
  </>;
}

function NoteField({value, label, save}: {value: string; label: string; save: (text: string) => void}) {
  const [draft, setDraft] = useState(value);
  return <input aria-label={label} placeholder="—" value={draft} onChange={e => setDraft(e.target.value)} onBlur={() => { if (draft !== value) save(draft); }} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} style={{border: "1px solid var(--line)", borderRadius: 9, padding: "6px 9px", minWidth: 0, width: "100%", font: "inherit", fontSize: 12}}/>;
}
