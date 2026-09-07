import {useState} from "react";
import {createPortal} from "react-dom";
import {AlertTriangle, FileSpreadsheet, Printer, X} from "lucide-react";
import {activityWeights, raWeights, theoreticalActivityWeights, theoreticalRaWeights} from "../../src/model/calculation";
import type {AcademicCourse} from "../../src/model/domain";
import {raShares, typeColor, useGridMaxHeight} from "../lib/helpers";

export function Reports({course}:{course:AcademicCourse}){
 return <>
  <div className="panelHeader" style={{marginBottom:16}}><h2>Informes i extraccions de dades</h2></div>
  <ActivityContributionReport course={course}/>
 </>;
}

function ActivityContributionReport({course}:{course:AcademicCourse}){
 const[scenario,setScenario]=useState<"real"|"teoric">("real");
 const[showPrint,setShowPrint]=useState(false);
 const cfg=course.configuration,types=cfg.activityTypes.filter(t=>t.status==="active"),ras=cfg.learningResults.filter(r=>r.status==="active");
 const activities=cfg.activities.filter(a=>types.some(t=>t.id===a.activityTypeId));
 const weights=scenario==="real"?activityWeights(course):theoreticalActivityWeights(course);
 const raW=scenario==="real"?raWeights(course):theoreticalRaWeights(course);
 const total=[...weights.values()].reduce((sum,w)=>sum+w,0);
 const{ref,maxH}=useGridMaxHeight<HTMLDivElement>();
 return <article className="panel tablePanel">
  <div style={{padding:"20px 22px 0"}}>
   <div className="panelHeader">
    <h2><FileSpreadsheet size={16} style={{verticalAlign:"-3px",marginRight:6,color:"var(--blue)"}}/>Contribució de les activitats a la nota global</h2>
    <button className="dark" onClick={()=>setShowPrint(true)}><Printer/>Imprimeix informe</button>
   </div>
   <p className="muted" style={{margin:"6px 0 14px"}}>Pes de cada activitat sobre la nota del mòdul, per tipus. «Curs complet (100%)» mostra el repartiment previst si cap activitat estigués arxivada; «Pes real actual» mostra el repartiment que s’aplica ara mateix, recalculat segons les activitats arxivades i el seu efecte sobre la resta d’activitats del mateix tipus.</p>
   <div className="sectionActions" style={{justifyContent:"flex-start",flexWrap:"wrap",gap:14,marginBottom:14}}>
    <div className="switch">
     <button className={scenario==="real"?"active":""} onClick={()=>setScenario("real")}>Pes real actual</button>
     <button className={scenario==="teoric"?"active":""} onClick={()=>setScenario("teoric")}>Curs complet (100%)</button>
    </div>
    <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:8}}>
     <span className="muted" style={{fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:".06em"}}>Pes de cada RA en aquesta vista</span>
     {ras.map(ra=><span className="bonus" key={ra.id} title={ra.description}>{ra.code} {((raW.get(ra.id)??0)*100).toFixed(1)}%</span>)}
    </div>
   </div>
   {Math.abs(total-1)>=.005&&<p className="risk" style={{display:"inline-flex",alignItems:"center",gap:6,marginBottom:14}}><AlertTriangle size={13}/> Aquesta vista suma {(total*100).toFixed(1)}%, no el 100%{scenario==="real"?" — hi ha algun tipus d’activitat sense cap activitat activa":""}.</p>}
  </div>
  <div className="gridScroll" ref={ref} style={{maxHeight:maxH}}>
   <table>
    <thead><tr><th>Activitat</th><th>Tipus</th><th>Estat</th><th>RA treballats</th><th>Pes sobre la nota global</th></tr></thead>
    <tbody>{activities.map(a=>{const type=types.find(t=>t.id===a.activityTypeId)!,w=weights.get(a.id)??0,shares=raShares(cfg,a.id);return <tr key={a.id} className={a.status==="archived"?"archived":""}><td><strong>{a.name}</strong></td><td><span style={{color:typeColor(course,type.id)}}>{type.name}</span></td><td>{a.status==="active"?<span className="ok">Activa</span>:<span className="risk">Arxivada</span>}</td><td>{shares.length?<div style={{display:"flex",flexWrap:"wrap",gap:6}}>{shares.map(s=><span className="bonus" key={s.code} title={`${s.code}: suma dels CA amb valor a aquesta activitat`}>{s.code} {(s.pct*100).toFixed(0)}%</span>)}</div>:<span className="muted">Sense relacions</span>}</td><td className="score">{(w*100).toFixed(1)}%</td></tr>})}</tbody>
   </table>
  </div>
  {showPrint&&<ActivityContributionPrintReport course={course} close={()=>setShowPrint(false)}/>}
 </article>;
}

function ActivityContributionPrintReport({course,close}:{course:AcademicCourse;close:()=>void}){
 const cfg=course.configuration,types=cfg.activityTypes.filter(t=>t.status==="active"),ras=cfg.learningResults.filter(r=>r.status==="active");
 const activities=cfg.activities.filter(a=>types.some(t=>t.id===a.activityTypeId));
 const real=activityWeights(course),teoric=theoreticalActivityWeights(course);
 const realRa=raWeights(course),teoricRa=theoreticalRaWeights(course);
 const realTotal=[...real.values()].reduce((sum,w)=>sum+w,0),teoricTotal=[...teoric.values()].reduce((sum,w)=>sum+w,0);
 const activeCount=activities.filter(a=>a.status==="active").length;
 return createPortal(<div className="modal"><div className="report">
  <div className="noPrint reportActions"><button onClick={close}><X/>Tanca</button><button className="dark" onClick={()=>window.print()}><Printer/>Imprimeix</button></div>

  <div className="reportHead"><FileSpreadsheet/><div><small>INFORME DE CONTRIBUCIÓ D’ACTIVITATS</small><h1>Contribució de les activitats a la nota global</h1><p>{cfg.level} · {cfg.moduleName} · {course.academicYear}</p></div><div className="bigScore"><span>ACTIVITATS ACTIVES</span><strong>{activeCount}</strong><em>de {activities.length} en total</em></div></div>

  <h2>Pes de cada RA sobre la nota global</h2>
  <div className="reportRow3" style={{gridTemplateColumns:"1fr 1fr"}}>
   <div className="reportBlock">
    <h3>Curs complet (100%)</h3>
    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{ras.map(ra=><span className="bonus" key={ra.id}>{ra.code} {((teoricRa.get(ra.id)??0)*100).toFixed(1)}%</span>)}</div>
    {Math.abs(teoricTotal-1)>=.005&&<p className="risk" style={{marginTop:8}}><AlertTriangle size={13}/> Suma {(teoricTotal*100).toFixed(1)}%, no el 100%</p>}
   </div>
   <div className="reportBlock">
    <h3>Pes real actual</h3>
    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{ras.map(ra=><span className="bonus" key={ra.id}>{ra.code} {((realRa.get(ra.id)??0)*100).toFixed(1)}%</span>)}</div>
    {Math.abs(realTotal-1)>=.005&&<p className="risk" style={{marginTop:8}}><AlertTriangle size={13}/> Suma {(realTotal*100).toFixed(1)}%, no el 100% — hi ha algun tipus d’activitat sense cap activitat activa</p>}
   </div>
  </div>

  <h2>Detall per activitat</h2>
  <table><thead><tr><th>Activitat</th><th>Tipus</th><th>Estat</th><th>RA treballats</th><th>Pes teòric (100%)</th><th>Pes real actual</th></tr></thead>
   <tbody>{activities.map(a=>{const type=types.find(t=>t.id===a.activityTypeId)!,th=teoric.get(a.id)??0,re=real.get(a.id)??0,shares=raShares(cfg,a.id);return <tr key={a.id} className={a.status==="archived"?"archived":""}><td><strong>{a.name}</strong></td><td>{type.name}</td><td>{a.status==="active"?"Activa":"Arxivada"}</td><td>{shares.length?shares.map(s=>`${s.code} ${(s.pct*100).toFixed(0)}%`).join(" · "):"—"}</td><td>{(th*100).toFixed(1)}%</td><td>{(re*100).toFixed(1)}%</td></tr>})}</tbody>
  </table>

  <footer>{cfg.moduleName} · {course.academicYear} · Dades locals</footer>
 </div></div>, document.body);
}
