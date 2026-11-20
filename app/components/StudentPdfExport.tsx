import {useState} from "react";
import {createPortal} from "react-dom";
import {AlertTriangle, FileDown, FolderOpen, X} from "lucide-react";
import {studentEmailLocal, uniquePdfNames} from "../../src/controllers/studentFileName";
import type {AcademicCourse} from "../../src/model/domain";
import type {JointStudent} from "../../src/model/joint";
import {LOGO_SRC} from "./shared";

const isAbort = (e: unknown) => e instanceof DOMException && e.name === "AbortError";
/** Només lletres minúscules, xifres, punt, guionet i barra baixa: el que es pot posar en un nom de fitxer i en una adreça de correu. */
const sanitize = (value: string) => value.trim().toLowerCase().replace(/\.pdf$/i, "").replace(/[^a-z0-9._-]/g, "");

/**
 * PDF de l'«Informe conjunt d'avaluació de l'alumne» de cada alumne del grup, un fitxer per alumne anomenat com
 * l'adreça corporativa (nom.cognom.pdf). Es pot descarregar en un ZIP o desar directament en una carpeta.
 */
export function StudentPdfExport({courses, students, course, groupCode, close}: {courses: AcademicCourse[]; students: JointStudent[]; course: AcademicCourse; groupCode: string; close: () => void}) {
  const [rows, setRows] = useState(() => students.map(s => ({key: s.key, name: s.name, file: studentEmailLocal(s.name), on: true, modules: s.modules.filter(m => m.state !== "absent").length})));
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{ok: boolean; text: string} | null>(null);
  const chosen = rows.filter(r => r.on);
  const names = uniquePdfNames(chosen.map(r => sanitize(r.file)));
  const duplicated = new Set(chosen.map(r => sanitize(r.file)).filter((n, i, all) => all.indexOf(n) !== i));
  const canFolder = typeof window !== "undefined" && "showDirectoryPicker" in window;

  const update = (key: string, patch: Partial<(typeof rows)[number]>) => setRows(list => list.map(r => r.key === key ? {...r, ...patch} : r));

  const generate = async (target: "zip" | "folder") => {
    if (!chosen.length) return;
    setResult(null);
    try {
      const dir = target === "folder" ? await window.showDirectoryPicker({mode: "readwrite"}) : null;
      setBusy("Preparant…");
      const {buildJointStudentPdf, zipPdfs} = await import("../../src/controllers/studentPdf");
      const logo = await fetch(LOGO_SRC).then(r => r.ok ? r.arrayBuffer() : null).then(b => b ? new Uint8Array(b) : null).catch(() => null);
      const files: {name: string; bytes: Uint8Array}[] = [];
      for (let i = 0; i < chosen.length; i++) {
        setBusy(`Generant ${i + 1} de ${chosen.length}…`);
        await new Promise(resolve => setTimeout(resolve, 0)); // deixa respirar la pantalla
        const student = students.find(s => s.key === chosen[i].key)!;
        const {bytes} = await buildJointStudentPdf(courses, student, course, groupCode, {logo});
        if (dir) {
          const handle = await dir.getFileHandle(names[i], {create: true});
          const writable = await handle.createWritable();
          await writable.write(bytes as unknown as BufferSource);
          await writable.close();
        } else files.push({name: names[i], bytes});
      }
      if (!dir) {
        setBusy("Comprimint…");
        const blob = await zipPdfs(files);
        const year = course.academicYear.replace(/[^0-9]+/g, "-");
        const url = URL.createObjectURL(blob), a = document.createElement("a");
        a.href = url; a.download = `PDF_alumnes_${course.configuration.abbreviation}_grup_${groupCode}_${year}.zip`;
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
        setResult({ok: true, text: `S'ha descarregat un ZIP amb ${files.length} PDF.`});
      } else setResult({ok: true, text: `S'han desat ${chosen.length} PDF a la carpeta «${dir.name}».`});
    } catch (e) {
      if (!isAbort(e)) setResult({ok: false, text: `No s'han pogut generar els PDF: ${e instanceof Error ? e.message : String(e)}`});
    } finally { setBusy(null); }
  };

  return createPortal(<div className="modal" onKeyDown={e => { if (e.key === "Escape" && !busy) close(); }}>
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="pdf-export-title" style={{width: "min(820px,100%)"}}>
      <div className="panelHeader"><h2 id="pdf-export-title">PDF de l'informe de cada alumne</h2><button aria-label="Tanca" onClick={close} disabled={!!busy}><X/></button></div>
      <p className="muted" style={{margin: "0 0 10px"}}>Genera l'<strong>Informe conjunt d'avaluació de l'alumne</strong> en PDF (resum i una pàgina per mòdul) de cada alumne del grup {groupCode}, amb el nom de fitxer <strong>nom.cognom.pdf</strong>, com el correu corporatiu. Pots corregir els noms abans de generar-los.</p>
      <p className="risk" style={{display: "block", margin: "0 0 12px"}}><AlertTriangle size={13} style={{verticalAlign: "-2px"}}/> Cada PDF conté les notes i els comentaris d'un alumne: comparteix-lo només amb el seu destinatari.</p>
      <div className="actionRow" style={{marginBottom: 8}}>
        <button onClick={() => setRows(l => l.map(r => ({...r, on: true})))} disabled={!!busy}>Selecciona tots</button>
        <button onClick={() => setRows(l => l.map(r => ({...r, on: false})))} disabled={!!busy}>Treu-ne tots</button>
        <span className="muted" style={{alignSelf: "center", fontSize: 12}}>{chosen.length} de {rows.length} alumnes</span>
      </div>
      <div style={{maxHeight: "46vh", overflow: "auto", border: "1px solid var(--line)", borderRadius: 10}}>
        <table style={{width: "100%", fontSize: 12.5}}>
          <thead><tr><th style={{width: 36}}/><th>Alumne</th><th style={{width: 70}}>Mòduls</th><th style={{width: 270}}>Fitxer</th></tr></thead>
          <tbody>{rows.map(r => <tr key={r.key}>
            <td><input type="checkbox" checked={r.on} onChange={e => update(r.key, {on: e.target.checked})} aria-label={`Inclou ${r.name}`} disabled={!!busy}/></td>
            <td>{r.name}</td>
            <td>{r.modules}</td>
            <td><span style={{display: "inline-flex", alignItems: "center", gap: 4}}><input value={r.file} onChange={e => update(r.key, {file: e.target.value})} disabled={!!busy || !r.on} aria-label={`Nom del fitxer de ${r.name}`} style={{border: "1px solid " + (r.on && duplicated.has(sanitize(r.file)) ? "#d64558" : "var(--line)"), borderRadius: 6, padding: "3px 6px", width: 210, font: "inherit"}}/>.pdf</span></td>
          </tr>)}</tbody>
        </table>
      </div>
      {duplicated.size > 0 && <p className="risk" style={{display: "block", margin: "8px 0 0", fontSize: 12}}>Hi ha noms de fitxer repetits (en vermell): s'hi afegirà -2, -3… Revisa'ls o corregeix-los.</p>}
      <div className="actionRow" style={{marginTop: 14, alignItems: "center", flexWrap: "wrap"}}>
        <button className="dark" onClick={() => void generate("zip")} disabled={!!busy || !chosen.length}><FileDown/>Descarrega un ZIP</button>
        {canFolder && <button onClick={() => void generate("folder")} disabled={!!busy || !chosen.length} title="Desa els PDF directament dins una carpeta (per exemple, una carpeta compartida del Drive)"><FolderOpen/>Desa a una carpeta…</button>}
        {busy && <span className="muted" aria-live="polite">{busy}</span>}
      </div>
      {result && <p className={result.ok ? "ok" : "risk"} style={{display: "inline-block", marginTop: 10}}>{result.text}</p>}
    </div>
  </div>, document.body);
}
