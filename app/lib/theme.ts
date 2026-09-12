import {useCallback, useState} from "react";

export type PaletteId="blau-classic"|"verd-pissarra"|"porpra-modern";
export interface PaletteDef{id:PaletteId;name:string;primary:string;primary2:string;sidebarBg:string}
export const PALETTES:PaletteDef[]=[
 {id:"blau-classic",name:"Blau clàssic",primary:"#3975e8",primary2:"#795fd7",sidebarBg:"#101c35"},
 {id:"verd-pissarra",name:"Verd pissarra",primary:"#0f8a5f",primary2:"#2f7a6b",sidebarBg:"#0e2a24"},
 {id:"porpra-modern",name:"Porpra modern",primary:"#7c5cd6",primary2:"#b3487a",sidebarBg:"#241a3d"},
];
export const DEFAULT_PALETTE:PaletteId="blau-classic";
const STORAGE_KEY="ra-avaluacio:palette";

export function readStoredPalette():PaletteId{
 try{const v=localStorage.getItem(STORAGE_KEY);if(v==="blau-classic"||v==="verd-pissarra"||v==="porpra-modern")return v}catch{/* localStorage no accessible: es queda amb la paleta per defecte */}
 return DEFAULT_PALETTE;
}
export function applyPalette(id:PaletteId){
 try{document.documentElement.setAttribute("data-palette",id)}catch{/* SSR o entorn sense document */}
}

export function useColorPalette(){
 const[palette,setPaletteState]=useState<PaletteId>(readStoredPalette);
 const setPalette=useCallback((id:PaletteId)=>{
  setPaletteState(id);
  applyPalette(id);
  try{localStorage.setItem(STORAGE_KEY,id)}catch{/* preferència no persistida, l’aplicació continua funcionant */}
 },[]);
 return{palette,setPalette};
}
