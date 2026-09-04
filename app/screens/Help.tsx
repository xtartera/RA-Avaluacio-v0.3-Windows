import {useEffect, useState} from "react";
import {marked} from "marked";

export function Help(){const[html,setHtml]=useState<string|null>(null);useEffect(()=>{let alive=true;fetch("/CALCUL-NOTES.md").then(r=>r.text()).then(async text=>{const rendered=await marked.parse(text);if(alive)setHtml(rendered)}).catch(()=>{if(alive)setHtml("<p>No s’ha pogut carregar el document.</p>")});return()=>{alive=false}},[]);return <article className="panel helpContent">{html===null?"Carregant…":<div dangerouslySetInnerHTML={{__html:html}}/>}</article>}
