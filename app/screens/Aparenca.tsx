import {Check, Palette as PaletteIcon} from "lucide-react";
import {DEFAULT_PALETTE, PALETTES, type PaletteId} from "../lib/theme";

export function Aparenca({palette,setPalette}:{palette:PaletteId;setPalette:(id:PaletteId)=>void}){
 return <article className="panel" style={{maxWidth:820}}>
  <div className="panelHeader"><h2><PaletteIcon size={18} style={{verticalAlign:-3,marginRight:8}}/>Paleta de colors</h2></div>
  <p className="muted">Tria com es veu l’aplicació en aquest ordinador: barra lateral, botons, insígnies i targetes. És una preferència personal — no afecta cap dada del curs ni cap càlcul de notes, i els informes imprimibles es mantenen sempre amb la paleta «Blau clàssic» per coherència en paper.</p>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:14,marginTop:18}}>
   {PALETTES.map(p=>{const active=palette===p.id;return <button key={p.id} aria-pressed={active} onClick={()=>setPalette(p.id)} style={{textAlign:"left",border:active?"2px solid var(--primary)":"1px solid var(--line)",borderRadius:15,padding:13,background:active?"var(--tint-a)":"white",cursor:"pointer",display:"flex",flexDirection:"column",gap:11,font:"inherit"}}>
    <div data-palette={p.id} style={{borderRadius:11,overflow:"hidden",border:"1px solid #00000014",boxShadow:"0 4px 14px #17233c14"}}>
     <div style={{background:"var(--sidebar-bg)",padding:9,display:"flex",alignItems:"center",gap:8}}>
      <div style={{width:20,height:20,borderRadius:6,flexShrink:0,background:"linear-gradient(145deg,var(--brand-logo-1),var(--brand-logo-2))"}}/>
      <div style={{flex:1,height:16,borderRadius:5,background:"linear-gradient(90deg,var(--sidebar-hover-1),var(--sidebar-hover-2))",boxShadow:"inset 3px 0 var(--sidebar-active-accent)"}}/>
     </div>
     <div style={{background:"white",padding:11,display:"flex",alignItems:"center",gap:8}}>
      <div style={{width:28,height:22,borderRadius:7,flexShrink:0,background:"linear-gradient(145deg,var(--primary),var(--primary-2))"}}/>
      <span style={{display:"inline-block",padding:"4px 8px",borderRadius:14,background:"#e9f8f2",color:"#15825f",fontSize:9,fontWeight:800}}>Assolit</span>
     </div>
    </div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
     <strong style={{fontSize:13}}>{p.name}</strong>
     {active&&<Check size={16} color="var(--primary)"/>}
    </div>
   </button>})}
  </div>
  {palette!==DEFAULT_PALETTE&&<button className="buttonLike" style={{marginTop:18}} onClick={()=>setPalette(DEFAULT_PALETTE)}>Torna a la paleta per defecte</button>}
 </article>
}
