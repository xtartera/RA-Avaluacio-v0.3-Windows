import {useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {FileText, Plus, Printer, Trash2, X} from "lucide-react";
import type {AcademicCourse, ProgramacioData, ProgramSequenceRow} from "../../src/model/domain";
import {programContent, programDefaults, programFileName, programValue, programYearLabel, type ProgramDefaults} from "../../src/model/programacio";
import {LOGO_SRC} from "../components/shared";
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
  const cfg = course.configuration, data: ProgramacioData = cfg.programacio ?? {}, defaults = programDefaults(course), content = programContent(course);
  const [doc, setDoc] = useState(false);
  const set = (patch: Partial<ProgramacioData>) => mutate(d => { const c = findCourse(d, course.id).configuration; c.programacio = {...(c.programacio ?? {}), ...patch}; });
  const setUnit = (id: string, patch: Partial<NonNullable<ProgramacioData["units"]>[string]>) => set({units: {...(data.units ?? {}), [id]: {...(data.units?.[id] ?? {}), ...patch}}});
  const text = (key: keyof ProgramDefaults) => programValue(course, key);
  const textFields: [keyof ProgramDefaults, string, number][] = [["competenciaGeneral", "1. Competència general del títol", 3], ["capacitatsClau", "2. Capacitats clau", 3], ["competencies", "3.1 Competències professionals, personals i socials", 5], ["objectius", "3.2 Objectius generals associats al mòdul", 5], ["estrategies", "4.1 Estratègies metodològiques", 5], ["tac", "Eines TAC", 3], ["diversitat", "Atenció a la diversitat", 3], ["organitzacio", "4.2 Organització del mòdul", 3], ["assistencia", "Assistència", 2], ["termini", "Terminis de lliurament", 2], ["avaluacio", "5. Avaluació i qualificació (text introductori)", 7], ["espais", "6. Espais, equipaments i recursos", 5], ["normativa", "Marc normatiu (una norma per línia)", 6]];
  const versions = data.versions ?? [];
  return <div className="managementScreen"><article className="panel managementPanel">
    <div className="managementHeader"><div className="managementTitle"><span className="sectionIcon"><FileText/></span><div><h2>Programació didàctica · {cfg.moduleName}</h2><p>{programYearLabel(course.academicYear)} · {cfg.level}. Els RA, CA, activitats, instruments, pesos i regles de qualificació es llegeixen de la configuració del mòdul; la resta s'escriu aquí.</p></div></div>
      <div className="actionRow"><button className="dark" onClick={() => setDoc(true)}><Printer/>Genera el document (PDF)</button></div></div>
    <p className="muted" style={{fontSize: 12, margin: "4px 0 12px"}}>Els camps buits mostren un text per defecte que pots editar. Revisa'l abans d'imprimir; en especial el marc normatiu, les competències i els objectius, que cal completar amb el currículum del cicle.</p>

    <details open><summary><b>Dades generals i gestió de la programació</b></summary>
      <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10, margin: "10px 0"}}>
        <TextField label="Departament" value={data.departament ?? defaults.departament} onSave={v => set({departament: v})}/>
        <TextField label="Família professional" value={data.familia ?? defaults.familia} onSave={v => set({familia: v})}/>
        <TextField label="Cicle formatiu" value={data.nomCicle ?? defaults.nomCicle} onSave={v => set({nomCicle: v})}/>
        <TextField label="Codi del cicle (p. ex. ICB0)" value={data.codiCicle ?? ""} onSave={v => set({codiCicle: v})}/>
        <TextField label="Codi del mòdul (p. ex. 0226)" value={data.codiModul ?? ""} onSave={v => set({codiModul: v})}/>
        <TextField label="Grup/s" value={data.grup ?? defaults.grup} onSave={v => set({grup: v})}/>
        <TextField label="Hores al centre educatiu" value={data.horesCentre ?? ""} onSave={v => set({horesCentre: v})}/>
        <TextField label="Hores d'estada a l'empresa" value={data.horesEmpresa ?? ""} onSave={v => set({horesEmpresa: v})}/>
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
      <div style={{display: "grid", gap: 12, margin: "10px 0"}}>{content.units.map(u => { const pu = data.units?.[u.id] ?? {}, seq = pu.sequencia ?? []; return <div key={u.id} style={{border: "1px solid var(--line)", borderRadius: 10, padding: 10}}>
        <b>AEA{u.index}. {u.name}</b> <span className="muted" style={{fontSize: 12}}>· {u.ras.join(", ") || "sense RA"} · {u.activities.length} activitats</span>
        <div style={{display: "grid", gridTemplateColumns: "110px 1fr", gap: 10, marginTop: 6}}>
          <TextField label="Hores" value={pu.hores ?? ""} onSave={v => setUnit(u.id, {hores: v})}/>
          <TextField label="Organitzadors previs (p. ex. AEA1, AEA2)" value={pu.organitzadors ?? ""} onSave={v => setUnit(u.id, {organitzadors: v})}/>
        </div>
        <AreaField label="Descripció" rows={3} value={pu.descripcio ?? ""} onSave={v => setUnit(u.id, {descripcio: v})}/>
        <AreaField label="Capacitats clau (una per línia)" rows={3} value={pu.capacitats ?? "Autonomia\nResolució de problemes\nOrganització del treball\nResponsabilitat"} onSave={v => setUnit(u.id, {capacitats: v})}/>
        <AreaField label="Documentació" rows={2} value={pu.documentacio ?? "Moodle de l'assignatura, enllaços de documentació, exemples i enunciats de les activitats."} onSave={v => setUnit(u.id, {documentacio: v})}/>
        <h4 style={{margin: "10px 0 4px", fontSize: 12.5}}>Seqüència</h4>
        <table><thead><tr><th>Seqüència</th><th>Organització aula</th><th>Temporització</th><th>Metodologia</th><th>Recursos</th><th>Localització</th><th/></tr></thead><tbody>
          {seq.map((row, i) => <tr key={i}>{(["text", "organitzacio", "temps", "metodologia", "recursos", "localitzacio"] as const).map(k => <td key={k}><input key={row[k]} defaultValue={row[k]} style={box} onBlur={e => setUnit(u.id, {sequencia: seq.map((x, j) => j === i ? {...x, [k]: e.target.value} : x)})}/></td>)}<td><button aria-label="Treu la fila" onClick={() => setUnit(u.id, {sequencia: seq.filter((_, j) => j !== i)})}><Trash2 size={14}/></button></td></tr>)}
        </tbody></table>
        <div className="actionRow" style={{marginTop: 6}}>
          <button onClick={() => setUnit(u.id, {sequencia: [...seq, {...EMPTY_ROW}]})}><Plus size={14}/>Afegeix fila</button>
          <button title="Crea una fila de seqüència per cada activitat de la UT (substitueix la seqüència actual)" onClick={() => { if (!seq.length || confirm("Això substitueix la seqüència actual. Continuar?")) setUnit(u.id, {sequencia: [{...EMPTY_ROW, text: "Presentació de l'AEA", metodologia: "Presentació del professor", temps: "30 min"}, ...u.activities.map(a => ({...EMPTY_ROW, text: `${a.type}: ${a.name}`}))]}); }}>Genera a partir de les activitats</button>
        </div>
      </div>; })}</div>
    </details>
    {doc && <ProgramacioDocument course={course} close={() => setDoc(false)}/>}
  </article></div>;
}

// ───────────────────────── Document ─────────────────────────

const CSS = `
.pdDoc{--g1:#1b5e3b;--g2:#2e7d4f;--g3:#6bb48a;--g4:#d3ebdc;--g5:#eef7f1;color:#1d2a22;font-size:12px;line-height:1.45}
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
.pdDoc .pdFormula{background:var(--g4);border:1px solid var(--g2);border-radius:4px;padding:7px 10px;font-weight:700;color:var(--g1);margin:6px 0}
.pdDoc .pdWarn{background:#fff4d6;border:1px solid #e8c766;padding:6px 10px;border-radius:4px;font-size:10.5px}
@media print{.pdDoc{padding:0!important}.pdDoc .pdT th,.pdDoc .pdBar,.pdDoc .pdT td.k,.pdDoc .pdFormula,.pdDoc .pdT tbody tr:nth-child(even) td{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
`;

const lines = (s: string) => s.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
const Paras = ({text}: {text: string}) => <>{text.split(/\n{2,}|\r\n\r\n/).map((p, i) => <p key={i}>{p}</p>)}</>;
const Bullets = ({text}: {text: string}) => <ul>{lines(text).map((l, i) => <li key={i}>{l}</li>)}</ul>;
const dash = (v?: string) => (v && v.trim() ? v : "—");

export function ProgramacioDocument({course, close}: {course: AcademicCourse; close: () => void}) {
  const cfg = course.configuration, data: ProgramacioData = cfg.programacio ?? {}, defaults = programDefaults(course), c = programContent(course);
  const text = (key: keyof ProgramDefaults) => programValue(course, key);
  const year = programYearLabel(course.academicYear), file = programFileName(course), today = new Date().toLocaleDateString("ca", {day: "2-digit", month: "2-digit", year: "numeric"});
  const centre = data.horesCentre ?? "", emp = data.horesEmpresa ?? "", total = Number(centre) + Number(emp);
  const versions = data.versions?.length ? data.versions : [{version: "01", data: today, descripcio: "Primera versió", aprovacio: data.elaboratPer ?? ""}];
  const min = cfg.requiredActivityMinGrade, roundTh = cfg.roundingThreshold;
  useEffect(() => {
    // Número de pàgina al peu (navegadors que suporten les caixes de marge de @page) i marges d'impressió només mentre el document és obert.
    const style = document.createElement("style");
    style.textContent = `@media print{@page{size:A4;margin:12mm 12mm 16mm;@bottom-right{content:"Pàgina " counter(page) " de " counter(pages);font-size:9px;color:#3d4f44}}}`;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, []);
  const header = <div className="pdHead"><div><b>Generalitat de Catalunya · Departament d'Ensenyament</b><br/><b>Institut Cirvianum de Torelló</b><br/>C/ Ausies March, s/n · 08519 TORELLÓ · Tel. 93 859 17 58</div><img src={LOGO_SRC} alt="Institut Cirvianum" height={44}/></div>;
  const footer = <div className="pdFoot"><span>Nom arxiu: {file}</span><span>Data: {today}</span><span>Elaborat: {dash(data.elaboratPer)}</span></div>;
  const sections = ["0. Gestió de la programació", "1. Competència general del títol", "2. Capacitats clau", "3. Competències professionals, personals i socials i objectius generals", "4. Estratègies metodològiques i organització del MP", "5. Avaluació i qualificació del MP", "6. Espais, equipaments i recursos del MP", "7. Programació del mòdul professional", "8. Programació d'activitats d'ensenyament-aprenentatge"];
  const requiredText = cfg.requiredByAverage
    ? `La mitjana de les activitats obligatòries de cada unitat de treball ha de ser igual o superior a ${min}.`
    : `Cada activitat obligatòria ha d'estar entregada i tenir una qualificació igual o superior a ${min}.`;
  return createPortal(<div className="modal"><div className="report pdDoc" role="dialog" aria-modal="true" aria-label="Programació didàctica">
    <style>{CSS}</style>
    <div className="noPrint reportActions"><button onClick={close}><X/>Tanca</button><button className="dark" onClick={() => window.print()} title="Al diàleg d'impressió tria «Desa com a PDF»"><Printer/>Imprimeix / Desa en PDF</button></div>
    <table className="pdFrame"><thead><tr><td>{header}</td></tr></thead>
      <tbody><tr><td>
        <div className="pdCover"><h1>PROGRAMACIONS CICLES FORMATIUS</h1><h2>CURS {year}</h2></div>
        <table className="pdT"><tbody>
          <tr><td className="k">Departament</td><td>{data.departament ?? defaults.departament}</td><td className="k">Grup/s</td><td>{data.grup ?? defaults.grup}</td></tr>
          <tr><td className="k">Família professional</td><td colSpan={3}>{data.familia ?? defaults.familia}</td></tr>
          <tr><td className="k">Cicle formatiu</td><td>{data.nomCicle ?? defaults.nomCicle}</td><td className="k">Codi</td><td>{dash(data.codiCicle)}</td></tr>
          <tr><td className="k">Mòdul professional</td><td colSpan={3}>{dash(data.codiModul)} - {cfg.moduleName}</td></tr>
          <tr><td className="k">Hores centre educatiu</td><td>{dash(centre)}</td><td className="k">Hores estada a l'empresa</td><td>{dash(emp)}</td></tr>
          <tr><td className="k">Hores totals</td><td colSpan={3}>{centre && emp ? total : dash(centre)}</td></tr>
        </tbody></table>

        <div className="pdBreak"/><div className="pdBar" style={{marginTop: 0}}>Índex de continguts</div>
        <ul style={{listStyle: "none", margin: 0}}>{sections.map(s => <li key={s} style={{padding: "3px 0", borderBottom: "1px dotted var(--g3)", fontWeight: s.match(/^[0-9]\./) ? 700 : 400}}>{s}</li>)}</ul>

        <div className="pdBreak"/><div className="pdBar" style={{marginTop: 0}}>0. GESTIÓ DE LA PROGRAMACIÓ</div>
        <table className="pdT"><thead><tr><th/><th>Realitzat per</th><th>Revisat per</th><th>Aprovat per</th></tr></thead><tbody>
          <tr><td className="k">Nom i cognoms</td><td>{dash(data.elaboratPer)}</td><td>{dash(data.revisatPer)}</td><td>{dash(data.aprovatPer)}</td></tr>
          <tr><td className="k">Càrrec</td><td>{data.carrecElaborat ?? "Professor del mòdul"}</td><td>{data.carrecRevisat ?? "Cap de Departament"}</td><td>{data.carrecAprovat ?? "Cap d'Estudis"}</td></tr>
          <tr><td className="k">Data</td><td>{dash(data.dataElaborat)}</td><td>{dash(data.dataRevisat)}</td><td>{dash(data.dataAprovat)}</td></tr></tbody></table>
        <table className="pdT"><thead><tr><th>Versió</th><th>Data</th><th>Descripció de la modificació</th><th>Aprovació</th></tr></thead><tbody>{versions.map((v, i) => <tr key={i}><td>{v.version}</td><td>{v.data}</td><td>{v.descripcio}</td><td>{v.aprovacio}</td></tr>)}</tbody></table>
        <h3>Marc normatiu</h3><Bullets text={text("normativa")}/>

        <div className="pdBar">1. COMPETÈNCIA GENERAL DEL TÍTOL</div><Paras text={text("competenciaGeneral")}/>
        <div className="pdBar">2. CAPACITATS CLAU</div><Paras text={text("capacitatsClau")}/>
        <div className="pdBar">3. COMPETÈNCIES PROFESSIONALS, PERSONALS I SOCIALS I OBJECTIUS GENERALS ASSOCIATS AL MÒDUL PROFESSIONAL</div>
        <h3>3.1. Competències professionals, personals i socials</h3><Paras text={text("competencies")}/>
        <h3>3.2. Objectius generals associats al mòdul professional</h3><Paras text={text("objectius")}/>

        <div className="pdBar pdBreak">4. ESTRATÈGIES METODOLÒGIQUES I ORGANITZACIÓ DEL MP</div>
        <h3>4.1. Estratègies metodològiques</h3><Paras text={text("estrategies")}/>
        <h4>Eines TAC (Tecnologies de l'Aprenentatge i el Coneixement)</h4><Paras text={text("tac")}/>
        <h4>Atenció a la diversitat</h4><Paras text={text("diversitat")}/>
        <h3>4.2. Organització del MP</h3><Paras text={text("organitzacio")}/>
        <p><b>{text("assistencia")}</b></p><p>{text("termini")}</p>

        <div className="pdBar pdBreak">5. AVALUACIÓ I QUALIFICACIÓ DEL MP</div>
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

        <div className="pdBar pdBreak">6. ESPAIS, EQUIPAMENTS I RECURSOS DEL MP</div><Paras text={text("espais")}/>

        <div className="pdBar pdBreak">7. PROGRAMACIÓ DEL MÒDUL PROFESSIONAL</div>
        <h3>7.1 Resultats d'aprenentatge, criteris d'avaluació i continguts</h3>
        {c.ras.map((r, i) => <div key={r.id} className="pdKeep"><h4>7.1.{i + 1} {r.code}. {r.description}</h4>
          <p><b>Criteris d'avaluació</b></p><ul style={{listStyle: "none", margin: "0 0 0 4px"}}>{r.cas.map(ca => <li key={ca.code}>{ca.code} {ca.description}</li>)}</ul>
          <p><b>Continguts</b></p>{r.contingut ? <Bullets text={r.contingut}/> : <p className="pdWarn">Continguts pendents de completar.</p>}</div>)}
        <h3 className="pdBreak">7.2 Activitats d'ensenyament i aprenentatge</h3>
        <p>Entenem com a activitat d'ensenyament i aprenentatge (AEA) el conjunt d'accions d'ensenyament i aprenentatge contextualitzades en funció de l'alumnat, els recursos i l'adaptació a l'entorn que es proposen per a l'assoliment dels resultats d'aprenentatge establerts.</p>
        <table className="pdT"><thead><tr><th>AEA</th><th>Hores</th><th>RA</th><th>CA</th><th>Instruments d'avaluació</th></tr></thead><tbody>
          {c.units.map(u => { const byType = new Map<string, string[]>(); u.activities.forEach(a => byType.set(a.type, [...(byType.get(a.type) ?? []), a.name])); return <tr key={u.id}><td><b>AEA{u.index}</b>. {u.name}</td><td>{dash(u.hores)}</td><td>{u.ras.join(", ") || "—"}</td><td>{u.cas.join(", ") || "—"}</td><td>{[...byType].map(([t, n]) => <div key={t}><b>{t}:</b> {n.join(", ")}</div>)}</td></tr>; })}</tbody></table>

        <div className="pdBar pdBreak">8. PROGRAMACIÓ D'ACTIVITATS D'ENSENYAMENT-APRENENTATGE</div>
        {c.units.map((u, ui) => { const pu = data.units?.[u.id] ?? {}, seq = pu.sequencia ?? [], byType = new Map<string, string[]>(); u.activities.forEach(a => byType.set(a.type, [...(byType.get(a.type) ?? []), a.name + (a.required ? " *" : "")]));
          return <div key={u.id} className={ui ? "pdBreak" : undefined}>
            <h3>8.{ui + 1} AEA{u.index}. {u.name}</h3>
            <table className="pdT"><tbody>
              <tr><td className="k">Mòdul professional</td><td>{dash(data.codiModul)}. {cfg.moduleName}</td><td className="k">Codi activitat</td><td>AEA{u.index}</td></tr>
              <tr><td className="k">Nom activitat</td><td>{u.name}</td><td className="k">Durada</td><td>{pu.hores ? `${pu.hores}h` : "—"}</td></tr>
              <tr><td className="k">Descripció</td><td colSpan={3}>{pu.descripcio ? <Paras text={pu.descripcio}/> : <span className="pdWarn">Descripció pendent de completar.</span>}</td></tr></tbody></table>
            <table className="pdT"><thead><tr><th>Resultats d'aprenentatge</th><th>Criteris d'avaluació</th><th>Continguts</th><th>Capacitats clau</th></tr></thead><tbody>
              {u.ras.map((code, i) => { const r = c.ras.find(x => x.code === code)!; const cas = r.cas.filter(ca => u.cas.includes(ca.code)).map(ca => ca.code); return <tr key={code}><td><b>{r.code}</b>: {r.description}</td><td>{cas.join(", ") || "—"}</td><td>{r.contingut ? lines(r.contingut).join("; ") : "—"}</td>{i === 0 && <td rowSpan={u.ras.length}><Bullets text={pu.capacitats ?? "Autonomia\nResolució de problemes\nOrganització del treball\nResponsabilitat"}/></td>}</tr>; })}</tbody></table>
            <table className="pdT"><tbody><tr><td className="k">Organitzadors previs</td><td>{dash(pu.organitzadors)}</td></tr></tbody></table>
            <table className="pdT pdKeep"><thead><tr><th>Seqüència</th><th>Organització aula</th><th>Temporització</th><th>Metodologia</th><th>Recursos</th><th>Localització</th></tr></thead><tbody>
              {seq.length ? seq.map((row, i) => <tr key={i}><td>{i + 1}. {row.text}</td><td>{row.organitzacio}</td><td>{row.temps}</td><td>{row.metodologia}</td><td>{row.recursos}</td><td>{row.localitzacio}</td></tr>) : <tr><td colSpan={6}><span className="pdWarn">Seqüència pendent de completar.</span></td></tr>}</tbody></table>
            <table className="pdT"><tbody>
              <tr><td className="k">Documentació</td><td>{pu.documentacio ?? "Moodle de l'assignatura, enllaços de documentació, exemples i enunciats de les activitats."}</td></tr>
              <tr><td className="k">Instruments d'avaluació</td><td>{[...byType].map(([t, n]) => <div key={t}><b>{t}:</b> {n.join(", ")}</div>)}<small>* activitat obligatòria</small></td></tr></tbody></table>
          </div>; })}
      </td></tr></tbody>
      <tfoot><tr><td>{footer}</td></tr></tfoot></table>
  </div></div>, document.body);
}

