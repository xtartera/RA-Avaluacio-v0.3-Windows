import {useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {marked} from "marked";
import {Printer, X} from "lucide-react";
import type {AcademicCourse} from "../../src/model/domain";
import {calcNotesMarkdown} from "../../src/model/calcDoc";
import {RaWeightsExplainer} from "../components/RaWeightsExplainer";
import {RaWorkedExample} from "../components/RaWorkedExample";

/** Cos del document: el text generat amb les dades del mòdul amb, després de la cascada de pesos (apartat 2), els mapes visuals i la calculadora d'exemple. */
function HelpBody({course}: {course?: AcademicCourse}) {
  const [parts, setParts] = useState<[string, string] | null>(null);
  useEffect(() => {
    let alive = true;
    if (!course) { setParts(["<p>Cal un curs actiu per mostrar el document.</p>", ""]); return; }
    const text = calcNotesMarkdown(course), i = text.search(/\n## 3\./);
    const [first, rest] = i > 0 ? [text.slice(0, i), text.slice(i)] : [text, ""];
    Promise.all([marked.parse(first), rest ? marked.parse(rest) : ""]).then(([a, b]) => { if (alive) setParts([a, b]); });
    return () => { alive = false; };
  }, [course]);
  if (parts === null) return <article className="panel helpContent">Carregant…</article>;
  return <>
    <style>{`@media print{.helpBody .panel{box-shadow:none;border:0;padding:0}.helpBody .helpContent h2{break-after:avoid}.helpBody .helpContent table,.helpBody .helpContent pre,.helpBody .helpContent svg{break-inside:avoid}.helpBody .helpContent svg{max-width:100%}.helpBody .helpContent{max-width:none}.helpBody .helpContent pre{overflow:visible;white-space:pre-wrap;word-break:break-word}.helpBody .helpContent pre code{white-space:pre-wrap;word-break:break-word}.helpBody .helpContent table{display:table;overflow:visible;table-layout:auto}.helpBody .helpContent th{white-space:normal}.helpBody .helpContent th,.helpBody .helpContent td{padding:6px 8px;overflow-wrap:break-word}.helpBody .helpContent th:first-child,.helpBody .helpContent td:first-child{min-width:5.5em}.helpReport,.helpReport *{box-sizing:border-box}.helpReport div[style*="overflow"]{overflow:visible!important;max-height:none!important}.helpReport table{max-width:100%}.helpReport table.rwxHeat{table-layout:fixed;width:100%;border-spacing:2px}.helpReport .rwxHeat th{font-size:9px;padding:2px;position:static}.helpReport .rwxHeat td{min-width:0;height:20px;font-size:9px}.helpReport .rwxHeat td.l{white-space:normal;font-size:9px;width:31%;padding:0 4px}.helpReport .rwxHeat .req{display:inline-block;font-size:7.5px;margin-left:3px;padding:0 4px}.helpReport .rwxHeat tr.unit td{font-size:8.5px;padding:6px 2px 1px;letter-spacing:.03em}.helpReport .rwxSteps{gap:8px}.helpReport .rwxStep{padding:10px}.helpReport .rwxEx{grid-template-columns:repeat(4,1fr);gap:8px}.helpReport .rwxEx .big{font-size:20px}.helpReport .rwxStack,.helpReport .rwxMe{grid-template-columns:40px 1fr 54px}}`}</style>
    <div className="helpBody">
      <article className="panel helpContent"><div dangerouslySetInnerHTML={{__html: parts[0]}}/></article>
      {course && <div style={{margin: "18px 0"}}>
        <article className="panel helpContent" style={{marginBottom: 18}}><h2>Mapes visuals amb els pesos del teu mòdul</h2><p className="muted">Les mateixes dades de la cascada de pesos, dibuixades amb les activitats, els tipus i els RA reals d’aquest curs.</p></article>
        <RaWeightsExplainer course={course}/>
        <article className="panel helpContent" style={{marginTop: 18}}><h2>Calculadora d’exemple: com es forma la nota d’un RA</h2><RaWorkedExample course={course}/></article>
      </div>}
      {parts[1] && <article className="panel helpContent" style={{marginTop: 18}}><div dangerouslySetInnerHTML={{__html: parts[1]}}/></article>}
    </div>
  </>;
}

/** Diàleg d'impressió: l'app només imprimeix els diàlegs, no la pantalla principal. */
export function HelpPrintModal({course, close}: {course: AcademicCourse; close: () => void}) {
  return createPortal(<div className="modal"><div className="report helpReport" role="dialog" aria-modal="true" aria-label="Com es calculen les notes">
    <div className="noPrint reportActions"><button onClick={close}><X/>Tanca</button><button className="dark" onClick={() => window.print()} title="Al diàleg d'impressió tria «Desa com a PDF»"><Printer/>Imprimeix / Desa en PDF</button></div>
    <HelpBody course={course}/>
  </div></div>, document.body);
}

/**
 * «Com es calculen les notes»: el document de càlcul adaptat al mòdul, amb els mapes visuals i la calculadora d'exemple.
 * El botó «Imprimeix» obre el mateix contingut en un diàleg que es pot imprimir o desar en PDF.
 */
export function Help({course}: {course?: AcademicCourse}) {
  const [printing, setPrinting] = useState(false);
  return <div>
    <article className="panel helpContent" style={{marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12}}>
      <div><h2 style={{margin: 0}}>Com es calculen les notes{course ? ` · ${course.configuration.moduleName}` : ""}</h2><p className="muted" style={{margin: "4px 0 0"}}>Explicació amb els pesos, les regles i els exemples d'aquest mòdul. Es pot imprimir o desar en PDF.</p></div>
      {course && <button className="dark" onClick={() => setPrinting(true)}><Printer/>Imprimeix</button>}
    </article>
    <HelpBody course={course}/>
    {printing && course && <HelpPrintModal course={course} close={() => setPrinting(false)}/>}
  </div>;
}
