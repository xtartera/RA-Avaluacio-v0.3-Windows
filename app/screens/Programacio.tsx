import {useEffect, useLayoutEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {FileText, Plus, Printer, Trash2, X} from "lucide-react";
import type {AcademicCourse, ProgramacioData, ProgramSequenceRow} from "../../src/model/domain";
import {programCodi, programContent, programHoursPlan, programRowActivity, programSequenceFromActivities, sequenceHours, isLegacyIntroRow, programSequenceWithHours, programUnitDescription, programDefaults, programFileName, programHores, programValue, programYearLabel, type ProgramDefaults} from "../../src/model/programacio";
import {smxModuleOf} from "../../src/model/programacioNormativa";
import {LOGO_SRC} from "../components/shared";
import {paginateElement} from "../lib/pagination";
import {findCourse, type Mutate} from "../lib/helpers";

// ───────────────────────── Editor ─────────────────────────

const box = {border: "1px solid var(--line)", borderRadius: 8, padding: "6px 8px", width: "100%", font: "inherit"} as const;

function TextField({label, value, placeholder, onSave, wide}: {label: string; value: string; placeholder?: string; onSave: (v: string) => void; wide?: boolean}) {
  return <label style={{display: "grid", gap: 3, fontSize: 12, gridColumn: wide ? "1 / -1" : undefined}}><span className="muted">{label}</span><input key={value} defaultValue={value} placeholder={placeholder} style={box} onBlur={e => { if (e.target.value !== value) onSave(e.target.value); }}/></label>;
}
function AreaField({label, value, rows = 4, onSave}: {label: string; value: string; rows?: number; onSave: (v: string) => void}) {
  return <label style={{display: "grid", gap: 3, fontSize: 12}}><span className="muted">{label}</span><textarea key={value} defaultValue={value} rows={rows} style={box} onBlur={e => { if (e.target.value !== value) onSave(e.target.value); }}/></label>;
}

const EMPTY_ROW: ProgramSequenceRow = {text: "", organitzacio: "Individual", temps: "", metodologia: "Treball individual amb el suport del professor", recursos: "Ordinador, pissarra digital", localitzacio: "Aula"};

export function Programacio({course, mutate}: {course: AcademicCourse; mutate: Mutate}) {
  const cfg = course.configuration, data: ProgramacioData = cfg.programacio ?? {}, defaults = programDefaults(course), content = programContent(course), plan = programHoursPlan(course, content);
  const [doc, setDoc] = useState(false);
  const set = (patch: Partial<ProgramacioData>) => mutate(d => { const c = findCourse(d, course.id).configuration; c.programacio = {...(c.programacio ?? {}), ...patch}; });
  const setUnit = (id: string, patch: Partial<NonNullable<ProgramacioData["units"]>[string]>) => set({units: {...(data.units ?? {}), [id]: {...(data.units?.[id] ?? {}), ...patch}}});
  const text = (key: keyof ProgramDefaults) => programValue(course, key);
  const textFields: [keyof ProgramDefaults, string, number][] = [["competenciaGeneral", "1. Competència general del títol", 3], ["capacitatsClau", "2. Capacitats clau", 3], ["competencies", "3.1 Competències professionals, personals i socials", 5], ["objectius", "3.2 Objectius generals associats al mòdul", 5], ["estrategies", "4.1 Estratègies metodològiques", 5], ["tac", "Eines TAC", 3], ["diversitat", "Atenció a la diversitat", 3], ["organitzacio", "4.2 Organització del mòdul", 3], ["assistencia", "Assistència", 2], ["termini", "Terminis de lliurament", 2], ["avaluacio", "5. Avaluació i qualificació (text introductori)", 7], ["espais", "6. Espais, equipaments i recursos", 5], ["normativa", "Marc normatiu (una norma per línia)", 6]];
  const versions = data.versions ?? [];
  return <div className="managementScreen"><article className="panel managementPanel">
    <div className="managementHeader"><div className="managementTitle"><span className="sectionIcon"><FileText/></span><div><h2>Programació didàctica · {cfg.moduleName}</h2><p>{programYearLabel(course.academicYear)} · {cfg.level}. Els RA, CA, activitats, instruments, pesos i regles de qualificació es llegeixen de la configuració del mòdul; la resta s'escriu aquí.</p></div></div>
      <div className="actionRow"><button className="dark" onClick={() => setDoc(true)}><Printer/>Genera el document (PDF)</button></div></div>
    <p className="muted" style={{fontSize: 12, margin: "4px 0 12px"}}>Els camps buits mostren un text per defecte que pots editar. Per als mòduls SOX i SI (CFGM SMX) hi surten ja el codi, les hores, la competència general, les competències professionals, personals i socials, els objectius generals i el marc normatiu, extrets del Decret 193/2013 i de les Orientacions als centres 2024-2026 (còpia a <i>docs/normativa</i>). Revisa'ls abans d'imprimir.</p>

    <details open><summary><b>Dades generals i gestió de la programació</b></summary>
      <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10, margin: "10px 0"}}>
        <TextField label="Departament" value={data.departament ?? defaults.departament} onSave={v => set({departament: v})}/>
        <TextField label="Família professional" value={data.familia ?? defaults.familia} onSave={v => set({familia: v})}/>
        <TextField label="Cicle formatiu" value={data.nomCicle ?? defaults.nomCicle} onSave={v => set({nomCicle: v})}/>
        <TextField label="Codi del cicle (p. ex. ICB0)" value={data.codiCicle ?? ""} onSave={v => set({codiCicle: v})}/>
        <TextField label="Codi del mòdul (p. ex. 0226)" value={programCodi(course)} onSave={v => set({codiModul: v})}/>
        <TextField label="Grup/s" value={data.grup ?? defaults.grup} onSave={v => set({grup: v})}/>
        <TextField label="Hores al centre educatiu" value={programHores(course).centre} onSave={v => set({horesCentre: v})}/>
        <TextField label="Hores d'estada a l'empresa" value={programHores(course).empresa} onSave={v => set({horesEmpresa: v})}/>
      </div>
      <table><thead><tr><th/><th>Nom i cognoms</th><th>Càrrec</th><th>Data</th></tr></thead><tbody>
        {([["Realitzat per", "elaboratPer", "carrecElaborat", "dataElaborat", "Professor del mòdul"], ["Revisat per", "revisatPer", "carrecRevisat", "dataRevisat", "Cap de Departament"], ["Aprovat per", "aprovatPer", "carrecAprovat", "dataAprovat", "Cap d'Estudis"]] as const).map(([label, n, c, d, carrec]) => <tr key={n}><td><b>{label}</b></td>
          <td><input key={data[n] ?? ""} defaultValue={data[n] ?? ""} style={box} onBlur={e => set({[n]: e.target.value})}/></td>
          <td><input key={data[c] ?? carrec} defaultValue={data[c] ?? carrec} style={box} onBlur={e => set({[c]: e.target.value})}/></td>
          <td><input key={data[d] ?? ""} defaultValue={data[d] ?? ""} placeholder="dd/mm/aaaa" style={{...box, width: 120}} onBlur={e => set({[d]: e.target.value})}/></td></tr>)}
      </tbody></table>
      <h4 style={{margin: "12px 0 6px"}}>Llistat de modificacions</h4>
      <table><thead><tr><th>Versió</th><th>Data</th><th>Descripció</th><th>Aprovació</th><th/></tr></thead><tbody>
        {versions.map((v, i) => <tr key={i}>{(["version", "data", "descripcio", "aprovacio"] as const).map(k => <td key={k}><input key={v[k]} defaultValue={v[k]} style={box} onBlur={e => set({versions: versions.map((x, j) => j === i ? {...x, [k]: e.target.value} : x)})}/></td>)}<td><button aria-label="Treu la versió" onClick={() => set({versions: versions.filter((_, j) => j !== i)})}><Trash2 size={14}/></button></td></tr>)}
      </tbody></table>
      <button style={{marginTop: 6}} onClick={() => set({versions: [...versions, {version: String(versions.length + 1).padStart(2, "0"), data: new Date().toLocaleDateString("ca"), descripcio: versions.length ? "Nova versió" : "Primera versió", aprovacio: data.elaboratPer ?? ""}]})}><Plus size={14}/>Afegeix versió</button>
    </details>

    <details style={{marginTop: 14}}><summary><b>Redacció dels apartats</b></summary>
      <div style={{display: "grid", gap: 10, margin: "10px 0"}}>{textFields.map(([k, label, rows]) => <AreaField key={k} label={label} rows={rows} value={text(k)} onSave={v => set({[k]: v} as Partial<ProgramacioData>)}/>)}</div>
    </details>

    <details style={{marginTop: 14}}><summary><b>Resultats d'aprenentatge: continguts i dates</b></summary>
      <div style={{display: "grid", gap: 12, margin: "10px 0"}}>{content.ras.map(r => <div key={r.id} style={{border: "1px solid var(--line)", borderRadius: 10, padding: 10}}>
        <b>{r.code}</b> <span className="muted" style={{fontSize: 12}}>{r.description}</span>
        <div style={{display: "grid", gridTemplateColumns: "1fr 140px 140px", gap: 10, marginTop: 6}}>
          <AreaField label="Continguts (un per línia)" rows={3} value={r.contingut} onSave={v => set({raContinguts: {...(data.raContinguts ?? {}), [r.id]: v}})}/>
          <TextField label="Data inici" placeholder="dd/mm/aaaa" value={r.inici} onSave={v => set({raDates: {...(data.raDates ?? {}), [r.id]: {inici: v, fi: r.fi}}})}/>
          <TextField label="Data final" placeholder="dd/mm/aaaa" value={r.fi} onSave={v => set({raDates: {...(data.raDates ?? {}), [r.id]: {inici: r.inici, fi: v}}})}/>
        </div></div>)}</div>
    </details>

    <details style={{marginTop: 14}}><summary><b>Activitats d'ensenyament-aprenentatge (UT)</b></summary>
      <p className="muted" style={{fontSize: 12}}>Cada unitat de treball de la configuració és una AEA. El nom, els RA, els CA i els instruments d'avaluació surten de les activitats; aquí hi afegeixes les hores, la descripció i la seqüència.</p>
      <p style={{fontSize: 12, margin: "4px 0"}}><b>Repartiment d'hores:</b> {plan.assigned} h repartides{plan.moduleTotal ? ` de ${plan.moduleTotal} h del mòdul al centre` : ""}. Els exàmens fan {2} h i la resta d'activitats sessions senceres d'1 h o més.</p>
      {plan.warnings.map((w, i) => <p key={i} className="pdWarn" style={{fontSize: 12, margin: "2px 0"}}>⚠ {w}</p>)}
      <div style={{display: "grid", gap: 12, margin: "10px 0"}}>{content.units.map(u => { const pu = data.units?.[u.id] ?? {}, seq = pu.sequencia ?? []; return <div key={u.id} style={{border: "1px solid var(--line)", borderRadius: 10, padding: 10}}>
        <b>AEA{u.index}. {u.name}</b> <span className="muted" style={{fontSize: 12}}>· {u.ras.join(", ") || "sense RA"} · {u.activities.length} activitats</span>
        <div style={{display: "grid", gridTemplateColumns: "110px 1fr", gap: 10, marginTop: 6}}>
          <TextField label={`Hores de l'AEA (buit = repartiment automàtic: ${plan.unit[u.id]} h)`} value={pu.hores ?? ""} placeholder={`${plan.unit[u.id]}`} onSave={v => setUnit(u.id, {hores: v})}/>
          <TextField label="Organitzadors previs (p. ex. AEA1, AEA2)" value={pu.organitzadors ?? ""} onSave={v => setUnit(u.id, {organitzadors: v})}/>
        </div>
        <table style={{marginTop: 6}}><thead><tr><th>Activitat</th><th style={{width: 90}}>Hores</th></tr></thead><tbody>
          {u.activities.map(a => { const fixed = pu.activityHours?.[a.id] !== undefined; return <tr key={a.id}><td>{a.name} <span className="muted">· {a.type}{a.required ? " · obligatòria" : ""}</span></td>
            <td><input key={`${a.id}-${plan.activity[a.id]}-${fixed}`} type="number" min={1} step={1} defaultValue={plan.activity[a.id]} style={{...box, width: 70, fontWeight: fixed ? 700 : 400}} onBlur={e => { const n = Math.round(Number(e.target.value)); if (n > 0 && n !== plan.activity[a.id]) setUnit(u.id, {activityHours: {...(pu.activityHours ?? {}), [a.id]: n}}); }}/></td></tr>; })}
          <tr><td><b>Total AEA</b> <span className="muted">· examen {2} h, la resta sessions d'1 h o més</span></td><td><b>{u.activities.reduce((s, a) => s + (plan.activity[a.id] ?? 0), 0)} h</b></td></tr></tbody></table>
        {pu.activityHours && Object.keys(pu.activityHours).length > 0 && <button style={{marginTop: 4}} onClick={() => setUnit(u.id, {activityHours: {}})}>Restableix el repartiment automàtic de l'AEA</button>}
        <AreaField label="Descripció (es genera a partir dels RA, activitats i continguts; edita-la si cal)" rows={5} value={pu.descripcio ?? programUnitDescription(u, content.ras)} onSave={v => setUnit(u.id, {descripcio: v})}/>
        <AreaField label="Capacitats clau (una per línia)" rows={3} value={pu.capacitats ?? "Autonomia\nResolució de problemes\nOrganització del treball\nResponsabilitat"} onSave={v => setUnit(u.id, {capacitats: v})}/>
        <AreaField label="Documentació" rows={2} value={pu.documentacio ?? "Moodle de l'assignatura, enllaços de documentació, exemples i enunciats de les activitats."} onSave={v => setUnit(u.id, {documentacio: v})}/>
        <h4 style={{margin: "10px 0 4px", fontSize: 12.5}}>Seqüència</h4>
        <table><thead><tr><th>Seqüència</th><th>Organització aula</th><th>Temporització</th><th>Metodologia</th><th>Recursos</th><th>Localització</th><th/></tr></thead><tbody>
          {seq.map((row, i) => <tr key={i}>{(["text", "organitzacio", "temps", "metodologia", "recursos", "localitzacio"] as const).map(k => <td key={k}><input key={row[k]} defaultValue={row[k]} placeholder={k === "temps" ? `${plan.activity[programRowActivity(row, u)?.id ?? ""] ?? ""} h` : undefined} style={box} onBlur={e => setUnit(u.id, {sequencia: seq.map((x, j) => j === i ? {...x, [k]: e.target.value} : x)})}/></td>)}<td><button aria-label="Treu la fila" onClick={() => setUnit(u.id, {sequencia: seq.filter((_, j) => j !== i)})}><Trash2 size={14}/></button></td></tr>)}
        </tbody></table>
        {seq.length > 0 && (seq.some(isLegacyIntroRow) || sequenceHours(seq) !== plan.unit[u.id]) && <p className="pdWarn" style={{fontSize: 12, margin: "4px 0"}}>⚠ La seqüència suma {sequenceHours(seq)} h i l'AEA en té {plan.unit[u.id]} h{seq.some(isLegacyIntroRow) ? " (la fila de presentació de 30 min és fora del repartiment)" : ""}. El botó «Omple la temporització amb el repartiment d'hores» ho corregeix.</p>}
        <div className="actionRow" style={{marginTop: 6}}>
          <button onClick={() => setUnit(u.id, {sequencia: [...seq, {...EMPTY_ROW}]})}><Plus size={14}/>Afegeix fila</button>
          {seq.length > 0 && <button title="Posa a cada fila d'activitat les hores del repartiment (substitueix la temporització actual)" onClick={() => setUnit(u.id, {sequencia: programSequenceWithHours(seq, u, plan, true)})}>Omple la temporització amb el repartiment d'hores</button>}
          <button title="Crea una fila de seqüència per cada activitat amb la seva temporització (substitueix la seqüència actual)" onClick={() => { if (!seq.length || confirm("Això substitueix la seqüència actual. Continuar?")) setUnit(u.id, {sequencia: [...programSequenceFromActivities(u, plan)]}); }}>Genera a partir de les activitats</button>
        </div>
      </div>; })}</div>
    </details>
    {doc && <ProgramacioDocument course={course} close={() => setDoc(false)}/>}
  </article></div>;
}

// ───────────────────────── Document ─────────────────────────

const CSS = `
.pdDoc{text-rendering:geometricPrecision;--g1:#1b5e3b;--g2:#2e7d4f;--g3:#6bb48a;--g4:#d3ebdc;--g5:#eef7f1;color:#1d2a22;font-size:12px;line-height:1.45}
.pdDoc table{border-collapse:collapse;width:100%}
.pdDoc .pdFrame>thead>tr>td,.pdDoc .pdFrame>tbody>tr>td,.pdDoc .pdFrame>tfoot>tr>td{border:0;padding:0;white-space:normal}
.pdDoc .pdT{margin:6px 0 12px}
.pdDoc .pdT th,.pdDoc .pdT td{border:1px solid var(--g3);padding:4px 6px;text-align:left;vertical-align:top;font-size:11px;white-space:normal}
.pdDoc .pdT th{background:var(--g2);color:#fff;font-weight:700}
.pdDoc .pdT tbody tr:nth-child(even) td{background:var(--g5)}
.pdDoc .pdT td.k{background:var(--g4);font-weight:700;width:26%}
.pdDoc .pdBar{background:var(--g1);color:#fff;font-size:14px;font-weight:800;padding:7px 10px;margin:18px 0 8px;border-radius:3px;break-after:avoid}
.pdDoc h3{color:var(--g1);font-size:13px;margin:12px 0 4px;border-bottom:2px solid var(--g3);padding-bottom:2px;break-after:avoid}
.pdDoc h4{color:var(--g2);font-size:12px;margin:8px 0 3px;break-after:avoid}
.pdDoc p{margin:4px 0;text-align:justify}.pdDoc ul{margin:4px 0 4px 18px;padding:0}
.pdDoc .pdHead{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid var(--g1);padding:0 0 6px;margin-bottom:8px;font-size:10px}
.pdDoc .pdHead b{color:var(--g1);font-size:12px}
.pdDoc .pdFoot{display:flex;justify-content:space-between;border-top:2px solid var(--g1);padding-top:4px;margin-top:8px;font-size:9.5px;color:#3d4f44}
.pdDoc .pdCover{text-align:center;margin:90px 0 40px}.pdDoc .pdCover h1{color:var(--g1);font-size:22px;margin:0 0 8px}.pdDoc .pdCover h2{color:var(--g2);font-size:17px;margin:0 0 34px}
.pdDoc .pdMatrix th,.pdDoc .pdMatrix td{font-size:8px;padding:2px;text-align:center}
.pdDoc .pdMatrix th.v{writing-mode:vertical-rl;transform:rotate(180deg);height:70px;white-space:nowrap;text-align:left}
.pdDoc .pdMatrix td.f{text-align:left;font-weight:700;background:var(--g4)}
.pdDoc .pdBreak{break-before:page}.pdDoc .pdKeep{break-inside:avoid}
.pdDoc .pdBar,.pdDoc h3,.pdDoc h4{break-inside:avoid}
.pdDoc .pdFormula{background:var(--g4);border:1px solid var(--g2);border-radius:4px;padding:7px 10px;font-weight:700;color:var(--g1);margin:6px 0}
.pdDoc .pdWarn{background:#fff4d6;border:1px solid #e8c766;padding:6px 10px;border-radius:4px;font-size:10.5px}
@media print{.pdDoc{padding:0!important}.pdDoc .pdT th,.pdDoc .pdBar,.pdDoc .pdT td.k,.pdDoc .pdFormula,.pdDoc .pdT tbody tr:nth-child(even) td{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
`;

const lines = (s: string) => s.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
const Paras = ({text}: {text: string}) => <>{text.split(/\n{2,}|\r\n\r\n/).map((p, i) => <p key={i}>{p}</p>)}</>;
const Items = ({text}: {text: string}) => <>{lines(text).map((l, i) => <p key={i} style={{margin: "3px 0"}}>{l}</p>)}</>;
const Bullets =({text}: {text: string}) => <ul>{lines(text).map((l, i) => <li key={i}>{l}</li>)}</ul>;
const dash = (v?: string) => (v && v.trim() ? v : "—");

export function ProgramacioDocument({course, close}: {course: AcademicCourse; close: () => void}) {
  const cfg = course.configuration, data: ProgramacioData = cfg.programacio ?? {}, defaults = programDefaults(course), c = programContent(course), plan = programHoursPlan(course, c);
  const text = (key: keyof ProgramDefaults) => programValue(course, key);
  const year = programYearLabel(course.academicYear), file = programFileName(course), today = new Date().toLocaleDateString("ca", {day: "2-digit", month: "2-digit", year: "numeric"});
  const {centre, empresa: emp} = programHores(course), total = Number(centre) + Number(emp), codi = programCodi(course), ref = smxModuleOf(course);
  const versions = data.versions?.length ? data.versions : [{version: "01", data: today, descripcio: "Primera versió", aprovacio: data.elaboratPer ?? ""}];
  const min = cfg.requiredActivityMinGrade, roundTh = cfg.roundingThreshold;
  useEffect(() => {
    // Número de pàgina al peu (navegadors que suporten les caixes de marge de @page) i marges d'impressió només mentre el document és obert.
    const style = document.createElement("style");
    style.textContent = `@media print{@page{size:A4;margin:12mm 12mm 16mm;@bottom-right{content:"Pàgina " counter(page) " de " counter(pages);font-size:9px;color:#3d4f44}}}`;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, []);
  const frameRef = useRef<HTMLTableElement>(null);
  const [pages, setPages] = useState<Record<string, number>>({});
  useLayoutEffect(() => {
    // Chrome no admet target-counter(): es mesura el document a l'amplada de la pàgina impresa i se simula la paginació.
    let dead = false;
    const run = () => {
      const frame = frameRef.current; if (!frame || dead) return;
      const box = document.createElement("div");
      box.className = "pdDoc"; box.style.cssText = `position:absolute;left:-99999px;top:0;width:calc(186mm - 2px);visibility:hidden`;
      const st = document.createElement("style"); st.textContent = CSS; box.appendChild(st);
      box.appendChild(frame.cloneNode(true)); document.body.appendChild(box);
      try {
        const f = box.querySelector("table.pdFrame")!, head = f.querySelector(":scope > thead")!.getBoundingClientRect().height, foot = f.querySelector(":scope > tfoot")!.getBoundingClientRect().height;
        const cap = (269 / 25.4) * 96 - head - foot;
        const res = paginateElement(f.querySelector(":scope > tbody > tr > td")!, cap);
        if (!dead) setPages(prev => JSON.stringify(prev) === JSON.stringify(res) ? prev : res);
      } finally { box.remove(); }
    };
    run(); document.fonts?.ready.then(run);
    return () => { dead = true; };
  }, [course]);
  const header = <div className="pdHead"><div><b>Generalitat de Catalunya · Departament d'Ensenyament</b><br/><b>Institut Cirvianum de Torelló</b><br/>C/ Ausies March, s/n · 08519 TORELLÓ · Tel. 93 859 17 58</div><img src={LOGO_SRC} alt="Institut Cirvianum" height={44}/></div>;
  const footer = <div className="pdFoot"><span>Nom arxiu: {file}</span><span>Data: {today}</span><span>Elaborat: {dash(data.elaboratPer)}</span></div>;
  const sections = ["0. Gestió de la programació", "1. Competència general del títol", "2. Capacitats clau", "3. Competències professionals, personals i socials i objectius generals", "4. Estratègies metodològiques i organització del MP", "5. Avaluació i qualificació del MP", "6. Espais, equipaments i recursos del MP", "7. Programació del mòdul professional", "8. Programació d'activitats d'ensenyament-aprenentatge"];
  const requiredText = cfg.requiredByAverage
    ? `La mitjana de les activitats obligatòries de cada unitat de treball ha de ser igual o superior a ${min}.`
    : `Cada activitat obligatòria ha d'estar entregada i tenir una qualificació igual o superior a ${min}.`;
  return createPortal(<div className="modal"><div className="report pdDoc" role="dialog" aria-modal="true" aria-label="Programació didàctica">
    <style>{CSS}</style>
    <div className="noPrint reportActions"><button onClick={close}><X/>Tanca</button><button className="dark" onClick={() => window.print()} title="Al diàleg d'impressió tria «Desa com a PDF»"><Printer/>Imprimeix / Desa en PDF</button></div>
    <table className="pdFrame" ref={frameRef}><thead><tr><td>{header}</td></tr></thead>
      <tbody><tr><td>
        <div className="pdCover"><h1>PROGRAMACIONS CICLES FORMATIUS</h1><h2>CURS {year}</h2></div>
        <table className="pdT"><tbody>
          <tr><td className="k">Departament</td><td>{data.departament ?? defaults.departament}</td><td className="k">Grup/s</td><td>{data.grup ?? defaults.grup}</td></tr>
          <tr><td className="k">Família professional</td><td colSpan={3}>{data.familia ?? defaults.familia}</td></tr>
          <tr><td className="k">Cicle formatiu</td><td>{data.nomCicle ?? defaults.nomCicle}</td><td className="k">Codi</td><td>{dash(data.codiCicle)}</td></tr>
          <tr><td className="k">Mòdul professional</td><td colSpan={3}>{dash(codi)} - {cfg.moduleName}</td></tr>
          <tr><td className="k">Hores centre educatiu</td><td>{dash(centre)}</td><td className="k">Hores estada a l'empresa</td><td>{dash(emp)}</td></tr>
          <tr><td className="k">Hores totals</td><td colSpan={3}>{centre && emp ? total : dash(centre)}</td></tr>
        </tbody></table>

        <div className="pdBreak"/><div className="pdBar" style={{marginTop: 0}}>Índex de continguts</div>
        <ul style={{listStyle: "none", margin: 0}}>{sections.map((s, i) => <li key={s} style={{padding: "3px 0", borderBottom: "1px dotted var(--g3)", display: "flex", justifyContent: "space-between", gap: 12, fontWeight: 700}}><span>{s}</span><span>{pages[`s${i}`] ?? ""}</span></li>).flatMap((li, i) => i === 8 ? [li, ...c.units.map((u, ui) => <li key={`a${ui}`} style={{padding: "2px 0 2px 18px", borderBottom: "1px dotted var(--g3)", display: "flex", justifyContent: "space-between", gap: 12, fontSize: 11}}><span>8.{ui + 1} AEA{u.index}. {u.name}</span><span>{pages[`a${ui}`] ?? ""}</span></li>)] : [li])}</ul>

        <div className="pdBreak"/><div className="pdBar" style={{marginTop: 0}} data-toc="s0">0. GESTIÓ DE LA PROGRAMACIÓ</div>
        <table className="pdT"><thead><tr><th/><th>Realitzat per</th><th>Revisat per</th><th>Aprovat per</th></tr></thead><tbody>
          <tr><td className="k">Nom i cognoms</td><td>{dash(data.elaboratPer)}</td><td>{dash(data.revisatPer)}</td><td>{dash(data.aprovatPer)}</td></tr>
          <tr><td className="k">Càrrec</td><td>{data.carrecElaborat ?? "Professor del mòdul"}</td><td>{data.carrecRevisat ?? "Cap de Departament"}</td><td>{data.carrecAprovat ?? "Cap d'Estudis"}</td></tr>
          <tr><td className="k">Data</td><td>{dash(data.dataElaborat)}</td><td>{dash(data.dataRevisat)}</td><td>{dash(data.dataAprovat)}</td></tr></tbody></table>
        <table className="pdT"><thead><tr><th>Versió</th><th>Data</th><th>Descripció de la modificació</th><th>Aprovació</th></tr></thead><tbody>{versions.map((v, i) => <tr key={i}><td>{v.version}</td><td>{v.data}</td><td>{v.descripcio}</td><td>{v.aprovacio}</td></tr>)}</tbody></table>
        <h3>Marc normatiu</h3><Bullets text={text("normativa")}/>

        <div className="pdBar" data-toc="s1">1. COMPETÈNCIA GENERAL DEL TÍTOL</div><Paras text={text("competenciaGeneral")}/>
        <div className="pdBar" data-toc="s2">2. CAPACITATS CLAU</div><Paras text={text("capacitatsClau")}/>
        <div className="pdBar" data-toc="s3">3. COMPETÈNCIES PROFESSIONALS, PERSONALS I SOCIALS I OBJECTIUS GENERALS ASSOCIATS AL MÒDUL PROFESSIONAL</div>
        <h3>3.1. Competències professionals, personals i socials</h3><Items text={text("competencies")}/>
        <h3>3.2. Objectius generals associats al mòdul professional</h3><Items text={text("objectius")}/>

        <div className="pdBar" data-toc="s4">4. ESTRATÈGIES METODOLÒGIQUES I ORGANITZACIÓ DEL MP</div>
        <h3>4.1. Estratègies metodològiques</h3><Paras text={text("estrategies")}/>
        <h4>Eines TAC (Tecnologies de l'Aprenentatge i el Coneixement)</h4><Paras text={text("tac")}/>
        <h4>Atenció a la diversitat</h4><Paras text={text("diversitat")}/>
        <h3>4.2. Organització del MP</h3><Paras text={text("organitzacio")}/>
        {ref && centre && emp && <p>El mòdul es cursa a {ref.curs} curs, amb {centre} hores al centre educatiu i {emp} hores d'estada a l'empresa ({total} hores totals). L'estada a l'empresa es planifica d'acord amb les Orientacions als centres per a la distribució del cicle i els documents d'organització i gestió del centre.</p>}
        {ref && centre && emp && <table className="pdT pdKeep"><thead><tr><th>Distribució horària del mòdul</th><th>Hores</th></tr></thead><tbody><tr><td>Hores al centre educatiu</td><td>{centre}</td></tr><tr><td>Hores d'estada a l'empresa</td><td>{emp}</td></tr><tr><td><b>Hores totals</b></td><td><b>{total}</b></td></tr></tbody></table>}
        {ref && <p>El mòdul s'organitza per resultats d'aprenentatge (RA), que aquesta programació concreta en activitats d'ensenyament-aprenentatge (AEA).</p>}
        <p><b>{text("assistencia")}</b></p><p>{text("termini")}</p>

        <div className="pdBar" data-toc="s5">5. AVALUACIÓ I QUALIFICACIÓ DEL MP</div>
        <Paras text={text("avaluacio")}/>
        <p>S'utilitzaran els instruments d'avaluació següents: {c.instruments.map(i => `${i.name} (${i.count})`).join(", ") || "—"}.</p>
        <p>El mòdul s'estructura en {c.ras.length} resultats d'aprenentatge (RA){data.raDates && Object.keys(data.raDates).length ? ", amb les dates següents" : ""}.</p>
        <table className="pdT pdKeep"><thead><tr><th>Resultat d'aprenentatge</th><th>Pes al mòdul</th><th>Data inici</th><th>Data final</th></tr></thead><tbody>
          {c.ras.map(r => <tr key={r.id}><td><b>{r.code}</b> {r.description}</td><td>{(Math.round(r.weight * 1000) / 10).toLocaleString("ca")} %</td><td>{dash(r.inici)}</td><td>{dash(r.fi)}</td></tr>)}</tbody></table>
        <p>La qualificació del mòdul professional es determina segons la importància de cada RA. El quadre següent mostra com contribueix cada activitat a la qualificació de cada RA (percentatge dins l'RA).</p>
        <div style={{overflowX: "auto"}}><table className="pdT pdMatrix"><thead><tr><th/>{c.columns.map(col => <th className="v" key={col.id}>{col.name}</th>)}<th>Total</th></tr></thead>
          <tbody>{c.matrix.map(r => <tr key={r.code}><td className="f">{r.code}</td>{r.cells.map((v, i) => <td key={i}>{v === null ? "" : v}</td>)}<td><b>{Math.round(r.total)}</b></td></tr>)}</tbody></table></div>
        <h4>Condicions per superar cada RA</h4>
        <ul><li>La nota de l'RA ha de ser igual o superior a {min}.</li><li>{requiredText}{c.requiredNames.length ? ` Activitats obligatòries: ${c.requiredNames.join(", ")}.` : " (Aquest mòdul no té activitats obligatòries definides.)"}</li><li>Si no es compleixen aquestes condicions, l'RA no es considera assolit.</li></ul>
        <h4>Qualificació del mòdul professional</h4>
        <div className="pdFormula">{c.qmp}</div>
        {c.gap > 0.0005 && <p>L'RAemp correspon al resultat d'aprenentatge que avalua l'empresa; es resol a la junta d'avaluació i s'hi incorpora la seva part de la nota.</p>}
        <p>Per superar el mòdul professional cal assolir TOTS els resultats d'aprenentatge de manera independent. La qualificació final s'arrodoneix a l'enter amb el criteri següent: a partir de {(roundTh).toLocaleString("ca")} de decimals s'arrodoneix cap amunt.</p>

        <div className="pdBar" data-toc="s6">6. ESPAIS, EQUIPAMENTS I RECURSOS DEL MP</div><Paras text={text("espais")}/>

        <div className="pdBar" data-toc="s7">7. PROGRAMACIÓ DEL MÒDUL PROFESSIONAL</div>
        <h3>7.1 Resultats d'aprenentatge, criteris d'avaluació i continguts</h3>
        {c.ras.map((r, i) => <div key={r.id}><h4>7.1.{i + 1} {r.code}. {r.description}</h4>
          <p style={{breakAfter: "avoid"}}><b>Criteris d'avaluació</b></p><ul style={{listStyle: "none", margin: "0 0 0 4px"}}>{r.cas.map(ca => <li key={ca.code}>{ca.code} {ca.description}</li>)}</ul>
          <p style={{breakAfter: "avoid"}}><b>Continguts</b></p>{r.contingut ? <Bullets text={r.contingut}/> : <p className="pdWarn">Continguts pendents de completar.</p>}</div>)}
        <h3>7.2 Activitats d'ensenyament i aprenentatge</h3>
        <p>Entenem com a activitat d'ensenyament i aprenentatge (AEA) el conjunt d'accions d'ensenyament i aprenentatge contextualitzades en funció de l'alumnat, els recursos i l'adaptació a l'entorn que es proposen per a l'assoliment dels resultats d'aprenentatge establerts.</p>
        <table className="pdT"><thead><tr><th>AEA</th><th>Hores</th><th>RA</th><th>CA</th><th>Instruments d'avaluació</th></tr></thead><tbody>
          {c.units.map(u => { const byType = new Map<string, string[]>(); u.activities.forEach(a => byType.set(a.type, [...(byType.get(a.type) ?? []), a.name])); return <tr key={u.id}><td><b>AEA{u.index}</b>. {u.name}</td><td>{plan.unit[u.id] ?? "—"}</td><td>{u.ras.join(", ") || "—"}</td><td>{u.cas.join(", ") || "—"}</td><td>{[...byType].map(([t, n]) => <div key={t}><b>{t}:</b> {n.join(", ")}</div>)}</td></tr>; })}</tbody></table>

        <div className="pdBar" data-toc="s8">8. PROGRAMACIÓ D'ACTIVITATS D'ENSENYAMENT-APRENENTATGE</div>
        <table className="pdT pdKeep"><thead><tr><th>AEA</th><th>Activitats</th><th>Durada (h)</th></tr></thead><tbody>{c.units.map(u => <tr key={u.id}><td>AEA{u.index}. {u.name}</td><td>{u.activities.map(a => `${a.name} (${plan.activity[a.id]} h)`).join(", ") || "—"}</td><td>{plan.unit[u.id]}</td></tr>)}<tr><td colSpan={2}><b>Total</b></td><td><b>{plan.assigned}</b></td></tr></tbody></table>
        {c.units.map((u, ui) => { const pu = data.units?.[u.id] ?? {}, seq = pu.sequencia?.length ? programSequenceWithHours(pu.sequencia, u, plan) : programSequenceFromActivities(u, plan), byType = new Map<string, string[]>(); u.activities.forEach(a => byType.set(a.type, [...(byType.get(a.type) ?? []), a.name + (a.required ? " *" : "")]));
          return <div key={u.id}>
            <h3 data-toc={`a${ui}`}>8.{ui + 1} AEA{u.index}. {u.name}</h3>
            <table className="pdT pdKeep"><tbody>
              <tr><td className="k">Mòdul professional</td><td>{dash(codi)}. {cfg.moduleName}</td><td className="k">Codi activitat</td><td>AEA{u.index}</td></tr>
              <tr><td className="k">Nom activitat</td><td>{u.name}</td><td className="k">Durada</td><td>{plan.unit[u.id] ? `${plan.unit[u.id]}h` : "—"}</td></tr>
              <tr><td className="k">Descripció</td><td colSpan={3}><Paras text={pu.descripcio?.trim() ? pu.descripcio : programUnitDescription(u, c.ras)}/></td></tr></tbody></table>
            <table className="pdT"><thead><tr><th>Resultats d'aprenentatge</th><th>Criteris d'avaluació</th><th>Continguts</th><th>Capacitats clau</th></tr></thead><tbody>
              {u.ras.map((code, i) => { const r = c.ras.find(x => x.code === code)!; const cas = r.cas.filter(ca => u.cas.includes(ca.code)).map(ca => ca.code); return <tr key={code}><td><b>{r.code}</b>: {r.description}</td><td>{cas.join(", ") || "—"}</td><td>{r.contingut ? lines(r.contingut).join("; ") : "—"}</td>{i === 0 && <td rowSpan={u.ras.length}><Bullets text={pu.capacitats ?? "Autonomia\nResolució de problemes\nOrganització del treball\nResponsabilitat"}/></td>}</tr>; })}</tbody></table>
            <table className="pdT pdKeep"><tbody><tr><td className="k">Organitzadors previs</td><td>{dash(pu.organitzadors)}</td></tr></tbody></table>
            <table className="pdT pdKeep"><thead><tr><th>Seqüència</th><th>Organització aula</th><th>Temporització</th><th>Metodologia</th><th>Recursos</th><th>Localització</th></tr></thead><tbody>
              {seq.length ? seq.map((row, i) => <tr key={i}><td>{i + 1}. {row.text}</td><td>{row.organitzacio}</td><td>{row.temps}</td><td>{row.metodologia}</td><td>{row.recursos}</td><td>{row.localitzacio}</td></tr>).concat([<tr key="total"><td><b>Total</b></td><td/><td><b>{sequenceHours(seq)} h</b></td><td/><td/><td/></tr>]) : <tr><td colSpan={6}><span className="pdWarn">Aquesta AEA no té activitats.</span></td></tr>}</tbody></table>
            <table className="pdT pdKeep"><tbody>
              <tr><td className="k">Documentació</td><td>{pu.documentacio ?? "Moodle de l'assignatura, enllaços de documentació, exemples i enunciats de les activitats."}</td></tr>
              <tr><td className="k">Instruments d'avaluació</td><td>{[...byType].map(([t, n]) => <div key={t}><b>{t}:</b> {n.join(", ")}</div>)}<small>* activitat obligatòria</small></td></tr></tbody></table>
          </div>; })}
      </td></tr></tbody>
      <tfoot><tr><td>{footer}</td></tr></tfoot></table>
  </div></div>, document.body);
}

