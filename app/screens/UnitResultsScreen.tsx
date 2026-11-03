import {useState} from "react";
import {FileText, Printer, Table2} from "lucide-react";
import {UnitStudentReport} from "./UnitStudentReport";
import type {AcademicCourse, Group} from "../../src/model/domain";
import {analyzeGroupUnits, type RaOutcome, type UnitStatus} from "../../src/model/unitResults";

const fmt = (n: number | null) => n === null ? "—" : n.toLocaleString("ca", {minimumFractionDigits: 2, maximumFractionDigits: 2});
const UNIT: Record<UnitStatus, {bg: string; fg: string; label: string}> = {
  superada: {bg: "#dff3e4", fg: "#1d6b48", label: "Superada"},
  "no-superada": {bg: "#f9dcdc", fg: "#a12f40", label: "No superada"},
  "en-curs": {bg: "#e6eefc", fg: "#2f5fb3", label: "En curs"},
  "sense-dades": {bg: "#eceff3", fg: "#7d899d", label: "Sense dades"},
};
const RA: Record<RaOutcome, {bg: string; fg: string; label: string}> = {
  superat: {bg: "#dff3e4", fg: "#1d6b48", label: "Assolit"},
  suspes: {bg: "#f9dcdc", fg: "#a12f40", label: "No assolit"},
  "en-curs": {bg: "#e6eefc", fg: "#2f5fb3", label: "En curs"},
  "sense-dades": {bg: "#eceff3", fg: "#7d899d", label: "—"},
  "sense-ut": {bg: "#eceff3", fg: "#7d899d", label: "Sense UT"},
};
const pill = (c: {bg: string; fg: string}) => ({background: c.bg, color: c.fg, fontWeight: 800, whiteSpace: "nowrap" as const, display: "inline-block", minWidth: 52, textAlign: "center" as const});

/** Nota de cada UT i RA superats o suspesos del grup triat (el grup es tria amb el botó A / B de dalt, com a la resta de pantalles). */
export function UnitResultsScreen({course, group}: {course: AcademicCourse; group: Group}) {
  const [query, setQuery] = useState("");
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [report, setReport] = useState<string[] | null>(null);
  const all = analyzeGroupUnits(course, group);
  const q = query.trim().toLocaleLowerCase("ca");
  const rows = all.filter(r => r.name.toLocaleLowerCase("ca").includes(q) && (!onlyIssues || r.units.some(u => u.status === "no-superada") || r.ras.some(a => a.outcome === "suspes")));
  const min = course.configuration.requiredActivityMinGrade;
  const unitNames = all[0]?.units.map(u => u.unitName) ?? [], raCodes = all[0]?.ras.map(a => a.code) ?? [];
  const countUnit = (index: number, s: UnitStatus) => all.filter(r => r.units[index]?.status === s).length;
  const countRa = (index: number, s: RaOutcome) => all.filter(r => r.ras[index]?.outcome === s).length;

  return <div className="managementScreen">
    <article className="panel managementPanel">
      <div className="managementHeader">
        <div className="managementTitle"><span className="sectionIcon"><Table2/></span><div><h2>Resultats per unitat de treball</h2><p>Grup {group.code} · {all.length} alumnes. La nota de l’RA és la de la graella de resultats d’aprenentatge (acumulada: el que encara no té nota compta 0). Un RA s’assoleix amb les obligatòries de la UT ≥ {min} i la nota ≥ {min}; no s’assoleix si hi ha una obligatòria suspesa o, quan la UT ja està tota corregida, la nota és inferior a {min}; mentrestant és «en curs». El RA assolit mostra la nota; el no assolit, el motiu.</p></div></div>
        <div className="actionRow"><button className="dark" onClick={() => setReport(rows.map(r => r.enrollmentId))} disabled={!rows.length} title="Un informe breu per alumne de la llista, per imprimir-los tots"><Printer/>Imprimeix els informes</button></div>
      </div>
      <div className="managementToolbar">
        <label className="searchField"><input aria-label="Cerca alumne" placeholder="Cerca alumne" value={query} onChange={e => setQuery(e.target.value)}/></label>
        <div className="filterPills"><button aria-pressed={!onlyIssues} onClick={() => setOnlyIssues(false)}>Tots <span>{all.length}</span></button><button aria-pressed={onlyIssues} onClick={() => setOnlyIssues(true)}>Amb suspesos <span>{all.filter(r => r.units.some(u => u.status === "no-superada") || r.ras.some(a => a.outcome === "suspes")).length}</span></button></div>
        <div style={{display: "flex", gap: 6, flexWrap: "wrap"}}>{(["superada", "no-superada", "en-curs", "sense-dades"] as UnitStatus[]).map(s => <span key={s} className="bonus" style={pill(UNIT[s])}>{UNIT[s].label}</span>)}</div>
      </div>
      <div className="managementTableScroll"><table className="managementTable">
        <thead>
          <tr><th rowSpan={2}>Alumne</th><th colSpan={unitNames.length} style={{textAlign: "center"}}>Nota de la UT (RA que tanca)</th><th colSpan={raCodes.length} style={{textAlign: "center"}}>Resultats d’aprenentatge</th></tr>
          <tr>{unitNames.map(n => <th key={n}>{n}</th>)}{raCodes.map(c => <th key={c}>{c}</th>)}</tr>
          <tr><th className="muted" style={{fontWeight: 600}}>Superades / no superades</th>{unitNames.map((n, i) => <th key={n} className="muted" style={{fontWeight: 600, fontSize: 10.5}}>{countUnit(i, "superada")} / {countUnit(i, "no-superada")}</th>)}{raCodes.map((c, i) => <th key={c} className="muted" style={{fontWeight: 600, fontSize: 10.5}}>{countRa(i, "superat")} / {countRa(i, "suspes")}</th>)}</tr>
        </thead>
        <tbody>{rows.map(r => <tr key={r.enrollmentId}>
          <td><div style={{display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8}}><strong>{r.name}</strong><div className="actionRow"><button onClick={() => setReport([r.enrollmentId])} aria-label={`Informe de ${r.name}`} title="Informe breu de resultats per UT i RA"><FileText/></button></div></div></td>
          {r.units.map(u => <td key={u.unitId} title={`${u.unitName}: ${UNIT[u.status].label}${u.reason ? ` · ${u.reason}` : ""}`}><span className="bonus" style={pill(UNIT[u.status])}>{u.status === "sense-dades" ? "—" : fmt(u.nota)}</span></td>)}
          {r.ras.map(a => <td key={a.code} title={`${a.code}${a.unitNames.length ? ` · tancat per ${a.unitNames.join(", ")}` : ""}${a.reason ? ` · ${a.reason}` : ""}`}><span className="bonus" style={pill(RA[a.outcome])}>{a.outcome === "superat" && a.nota !== null ? fmt(a.nota) : RA[a.outcome].label}</span></td>)}
        </tr>)}</tbody>
      </table>{!rows.length && <div className="tableEmpty"><strong>{all.length ? "Cap alumne coincideix amb la cerca o el filtre" : "El grup no té alumnes actius"}</strong></div>}</div>
      <div className="managementFooter">Mostrant {rows.length} de {all.length} alumnes · passa el ratolí per sobre d’una cel·la per veure’n el motiu.</div>
    </article>
  {report && <UnitStudentReport course={course} group={group} enrollmentIds={report} close={() => setReport(null)}/>}
  </div>;
}
