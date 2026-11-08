import {useEffect, useState} from "react";
import {marked} from "marked";
import type {AcademicCourse} from "../../src/model/domain";
import {RaWeightsExplainer} from "../components/RaWeightsExplainer";
import {RaWorkedExample} from "../components/RaWorkedExample";

/**
 * «Com es calculen les notes»: el document de càlcul amb, just després de la cascada de pesos (apartat 2),
 * els mapes visuals amb els pesos reals del mòdul i una calculadora d'exemple.
 */
export function Help({course}: {course?: AcademicCourse}) {
  const [parts, setParts] = useState<[string, string] | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/CALCUL-NOTES.md").then(r => r.text()).then(async text => {
      const i = text.search(/\n## 3\./);
      const [first, rest] = i > 0 ? [text.slice(0, i), text.slice(i)] : [text, ""];
      const html: [string, string] = [await marked.parse(first), rest ? await marked.parse(rest) : ""];
      if (alive) setParts(html);
    }).catch(() => { if (alive) setParts(["<p>No s’ha pogut carregar el document.</p>", ""]); });
    return () => { alive = false; };
  }, []);
  if (parts === null) return <article className="panel helpContent">Carregant…</article>;
  return <>
    <article className="panel helpContent"><div dangerouslySetInnerHTML={{__html: parts[0]}}/></article>
    {course && <div style={{margin: "18px 0"}}>
      <article className="panel helpContent" style={{marginBottom: 18}}><h2>Mapes visuals amb els pesos del teu mòdul</h2><p className="muted">Les mateixes dades de la cascada de pesos, dibuixades amb les activitats, els tipus i els RA reals d’aquest curs.</p></article>
      <RaWeightsExplainer course={course}/>
      <article className="panel helpContent" style={{marginTop: 18}}><h2>Calculadora d’exemple: com es forma la nota d’un RA</h2><RaWorkedExample course={course}/></article>
    </div>}
    {parts[1] && <article className="panel helpContent" style={{marginTop: 18}}><div dangerouslySetInnerHTML={{__html: parts[1]}}/></article>}
  </>;
}
