import type {ReactNode} from "react";
import {Upload} from "lucide-react";

export function ExcelInput({label,run,msg}:{label:string;run:(f:File)=>Promise<void>;msg:(s:string)=>void}){return <label className="buttonLike"><Upload/>{label}<input hidden type="file" accept=".xlsx,.xls,.xlsm" onChange={async e=>{const f=e.target.files?.[0];if(f)try{await run(f)}catch(x){msg(x instanceof Error?x.message:String(x))}e.target.value=""}}/></label>}
export function Card({l,v,n,children}:{l:string;v:string;n:string;children?:ReactNode}){return <article><label>{l}</label><strong>{v}</strong><span>{n}</span>{children}</article>}
export function Histogram({bands}:{bands:{label:string;range:string;cls:string;count:number}[]}){const max=Math.max(1,...bands.map(b=>b.count));return <div className="histogram">{bands.map(b=><div key={b.label}><b>{b.count}</b><i className={b.cls} style={{height:`${b.count/max*100}%`}}/><span>{b.label}<br/>{b.range}</span></div>)}</div>}
export function PassBar({passed,failed}:{passed:number;failed:number}){return <div className="statBar"><i className="pass" style={{flexGrow:passed||.0001}}/><i className="fail" style={{flexGrow:failed||.0001}}/></div>}
export function Toggle({on,click,title}:{on:boolean;click:()=>void;title?:string}){return <button type="button" role="switch" aria-checked={on} title={title} className={"toggle"+(on?" on":"")} onClick={click}><i/></button>}
