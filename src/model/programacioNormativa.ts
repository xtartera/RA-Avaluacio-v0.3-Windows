import type {AcademicCourse} from "./domain.ts";

/**
 * Referència normativa del cicle SMX per a la programació didàctica.
 * Fonts (còpia dins `docs/normativa/`):
 *  - «mp_IC10» (Currículum vigent: RA, CA i continguts orientatius per mòdul, sense UF; còpia a docs/normativa).
 *  - Decret 193/2013, de 9 de juliol, currículum del CFGM de Sistemes microinformàtics i xarxes (DOGC 6415, 11.7.2013): marc normatiu, competència general i objectius. Les seves UF ja no s'usen: el mòdul s'organitza per RA.
 *  - Orientacions als centres educatius per a organitzar el CFGM SMX, promocions 2024-2026 i posteriors (DGFP, 24.04.2024): hores al centre i d'estada, relació CPPeS / OG amb els mòduls.
 * La lletra de les CPPeS segueix les Orientacions 2024 (t, u, v, w, x); el Decret de 2013 salta la «w».
 */

export const SMX_COMPETENCIA_GENERAL = "La competència general d'aquest títol consisteix a instal·lar, configurar i mantenir sistemes microinformàtics, aïllats o en xarxa, així com xarxes locals en petits entorns, assegurant-ne la funcionalitat i aplicant els protocols de qualitat, seguretat i respecte al medi ambient establerts.";
export const SMX_CAPACITATS_CLAU = "Són les capacitats transversals que afecten diferents llocs de treball i que són transferibles a noves situacions de treball. Entre aquestes capacitats destaquen les d'autonomia, d'innovació, d'organització de treball, de responsabilitat, de relació interpersonal, de treball en equip i de resolució de problemes. L'equip docent ha de potenciar l'adquisició de les competències professionals, personals i socials i de les capacitats clau a partir de les activitats programades per desplegar el currículum d'aquest cicle formatiu.";

export const SMX_NORMATIVA = [
  "Llei orgànica 3/2022, de 31 de març, d'ordenació i integració de la formació professional.",
  "Reial decret 659/2023, de 18 de juliol, pel qual es desplega l'ordenació del sistema de formació professional.",
  "Reial decret 1691/2007, de 14 de desembre, pel qual s'estableix el títol de Tècnic en Sistemes microinformàtics i xarxes i se'n fixen els ensenyaments mínims (modificació en tramitació).",
  "Decret 193/2013, de 9 de juliol, pel qual s'estableix el currículum del cicle formatiu de grau mitjà de Sistemes microinformàtics i xarxes (DOGC 6415, de 11.7.2013), modificat per l'Ordre EDU/186/2021, de 23 de setembre (modificació en tramitació).",
  "Orientacions als centres educatius per a organitzar el cicle formatiu de grau mitjà de Sistemes Microinformàtics i Xarxes. Promocions 2024-2026 i posteriors (Direcció General de Formació Professional, 24.4.2024).",
  "Documents d'organització i gestió del centre i Ordre de calendari escolar del curs vigent.",
];

/** Competències professionals, personals i socials (Orientacions 2024). */
export const SMX_CPPES: Record<string, string> = {
  a: "Determinar la logística associada a les operacions d'instal·lació, configuració i manteniment de sistemes microinformàtics, interpretant-ne la documentació tècnica associada i organitzant els recursos necessaris.",
  b: "Muntar i configurar ordinadors i perifèrics, assegurant-ne el funcionament en condicions de qualitat i seguretat.",
  c: "Instal·lar i configurar programari bàsic i d'aplicació, assegurant-ne el funcionament en condicions de qualitat i seguretat.",
  d: "Replantejar el cablejat i l'electrònica de xarxes locals en petits entorns i la seva connexió amb xarxes d'àrea extensa, canalitzant a un nivell superior els supòsits que així ho requereixin.",
  e: "Instal·lar i configurar xarxes locals cablejades, sense fil o mixtes, i la seva connexió a xarxes públiques, assegurant-ne el funcionament en condicions de qualitat i seguretat.",
  f: "Instal·lar, configurar i mantenir serveis multiusuari, aplicacions i dispositius compartits en un entorn de xarxa local, atenent les necessitats i requeriments especificats.",
  g: "Realitzar les proves funcionals en sistemes microinformàtics i xarxes locals, localitzant i diagnosticant disfuncions, per comprovar i ajustar el seu funcionament.",
  h: "Mantenir sistemes microinformàtics i xarxes locals, substituint-ne, actualitzant-ne i ajustant-ne els components, per assegurar el rendiment del sistema en condicions de qualitat i seguretat.",
  i: "Executar procediments establerts de recuperació de dades i aplicacions davant fallades i pèrdues de dades en el sistema, per garantir la integritat i disponibilitat de la informació.",
  j: "Elaborar documentació tècnica i administrativa del sistema, complint les normes i reglamentació del sector, per al seu manteniment i l'assistència al client.",
  k: "Elaborar pressupostos de sistemes a mida complint els requeriments del client.",
  l: "Assessorar i assistir el client, canalitzant a un nivell superior els supòsits que ho requereixin per trobar solucions adequades a les necessitats d'aquest.",
  m: "Organitzar i desenvolupar el treball assignat mantenint unes relacions professionals adequades en l'entorn de treball.",
  n: "Mantenir un esperit constant d'innovació i actualització en l'àmbit del sector informàtic.",
  o: "Utilitzar els mitjans de consulta disponibles, seleccionant-ne el més adequat en cada cas, per resoldre en temps raonable supòsits no coneguts i dubtes professionals.",
  p: "Aplicar els protocols i normes de seguretat, qualitat i respecte al medi ambient en les intervencions realitzades.",
  q: "Complir amb els objectius de la producció, col·laborant amb l'equip de treball i actuant conforme als principis de responsabilitat i tolerància.",
  r: "Adaptar-se a diferents llocs de treball i noves situacions laborals originats per canvis tecnològics i organitzatius en els processos productius.",
  s: "Resoldre problemes i prendre decisions individuals seguint les normes i procediments establerts definits dintre de l'àmbit de la seva competència.",
  t: "Exercir els seus drets i complir amb les obligacions derivades de les relacions laborals, d'acord amb el que s'estableix en la legislació vigent.",
  u: "Gestionar la seva carrera professional, analitzant les oportunitats d'ocupació, autoocupació i aprenentatge.",
  v: "Crear i gestionar una petita empresa, realitzant un estudi de viabilitat de productes, planificació de la producció i comercialització.",
  w: "Participar de forma activa en la vida econòmica, social i cultural, amb una actitud crítica i responsable.",
  x: "Interpretar en llengua anglesa documents tècnics senzills i les comunicacions bàsiques en els circuits d'una empresa del sector informàtic.",
};

/** Objectius generals del cicle (Orientacions 2024 / Decret 193/2013, apartat 5.1). */
export const SMX_OG: Record<string, string> = {
  a: "Organitzar els components físics i lògics que formen un sistema microinformàtic, interpretant-ne la documentació tècnica per aplicar els mitjans i mètodes adequats a la seva instal·lació, muntatge i manteniment.",
  b: "Identificar, acoblar i connectar components i perifèrics utilitzant les eines adequades, aplicant procediments, normes i protocols de qualitat i seguretat, per muntar i configurar ordinadors i perifèrics.",
  c: "Reconèixer i executar els procediments d'instal·lació de sistemes operatius i programes d'aplicació, aplicant protocols de qualitat, per instal·lar i configurar sistemes microinformàtics.",
  d: "Representar la posició dels equips, línies de transmissió i altres elements d'una xarxa local, analitzant la morfologia, condicions i característiques del desplegament, per replantejar el cablejat i l'electrònica de la xarxa.",
  e: "Situar i fixar equips, línies, canalitzacions i altres elements d'una xarxa local cablejada, sense fil o mixta, aplicant procediments de muntatge i protocols de qualitat i seguretat, per instal·lar i configurar xarxes locals.",
  f: "Interconnectar equips informàtics, dispositius de xarxa local i de connexió amb xarxes d'àrea extensa, executant els procediments per instal·lar i configurar xarxes locals.",
  g: "Localitzar i reparar avaries i disfuncions en els components físics i lògics per mantenir sistemes microinformàtics i xarxes locals.",
  h: "Substituir i ajustar components físics i lògics per mantenir sistemes microinformàtics i xarxes locals.",
  i: "Interpretar i seleccionar informació per elaborar documentació tècnica i administrativa, vetllant per l'ús d'estratègies i tècniques de redacció i comunicació no sexistes.",
  j: "Valorar el cost dels components físics, lògics i la mà d'obra, per elaborar pressupostos.",
  k: "Reconèixer característiques i possibilitats dels components físics i lògics, per assessorar i assistir a clients.",
  l: "Detectar i analitzar canvis tecnològics per triar noves alternatives i mantenir-se actualitzat dins del sector.",
  m: "Reconèixer i valorar incidències, determinant-ne les seves causes i descrivint-ne les accions correctores per resoldre-les.",
  n: "Analitzar i descriure procediments de qualitat, prevenció de riscos laborals i mediambientals, assenyalant les accions a realitzar en els casos definits per actuar d'acord amb les normes estandarditzades.",
  o: "Valorar les activitats de treball en un procés productiu, identificant-ne l'aportació al procés global per aconseguir els objectius de la producció.",
  p: "Identificar i valorar les oportunitats d'aprenentatge i ocupació, analitzant les ofertes i demandes del mercat laboral per gestionar la seva carrera professional.",
  q: "Reconèixer les oportunitats de negoci, identificant i analitzant demandes del mercat per crear i gestionar una petita empresa.",
  r: "Reconèixer els seus drets i deures com a agent actiu en la societat, analitzant el marc legal que regula les condicions socials i laborals per participar com a ciutadà democràtic.",
  s: "Reconèixer i seleccionar el vocabulari tècnic bàsic i les expressions més habituals en llengua anglesa per interpretar documentació tècnica senzilla i comunicar-se en situacions quotidianes a l'empresa.",
};

export interface SmxModule {
  codi: string; nom: string; abbreviation: string; curs: string;
  /** Hores al centre educatiu i d'estada a l'empresa (Orientacions 2024-2026). */
  horesCentre: number; horesEmpresa: number;
  /** Lletres de les CPPeS i dels OG que treballa el mòdul (taules 1 i 2 de les Orientacions). */
  cppes: string[]; og: string[];
  /** Continguts orientatius, un bloc per RA i en el mateix ordre (document «mp_IC10», currículum vigent organitzat per RA). */
  continguts: string[][];
}

export const SMX_MODULES: SmxModule[] = [
  {
    codi: "0224", nom: "Sistemes operatius en xarxa", abbreviation: "SOX", curs: "2n", horesCentre: 132, horesEmpresa: 66,
    cppes: ["a", "c", "e", "f", "h", "l", "m", "n", "o", "q", "r", "s"], og: ["a", "c", "d", "f", "g", "h", "i", "j", "k", "l", "m", "o"],
    continguts: [
      ["Comprovació dels requisits tècnics. Preparació de la instal·lació.", "Particions i sistema d'arxius. Components. Mètodes.", "Automatització.", "Elaboració de la documentació sobre la instal·lació i incidències.", "Instal·lació de sistemes operatius en xarxa en màquines virtuals."],
      ["Compte d'usuari i grup.", "Tipus de perfils d'usuari. Perfils mòbils.", "Gestió de grups. Tipus i àmbits. Propietats. Usuaris i grups predeterminats i especials del sistema.", "Comptes d'usuari. Plantilles."],
      ["Servei de directori i domini. Elements del servei de directori. Funcions del domini.", "Instal·lació d'un servei de directori. Configuració bàsica.", "Creació de dominis. Objectes que administra un domini: usuaris globals, grups, equips entre altres. Creació de relacions de confiança entre dominis. Creació d'agrupacions d'elements: nomenclatura."],
      ["Permisos i drets.", "Compartir arxius i directoris a través de la xarxa.", "Configuració de permisos de recurs compartit.", "Configuració d'impressores compartides en xarxa."],
      ["Arrencada del sistema operatiu en xarxa.", "Descripció de les fallades produïdes en l'arrencada: possibles solucions.", "Utilització d'eines per al control i seguiment del rendiment del sistema operatiu en xarxa.", "Gestió dels processos relatius als serveis del sistema operatiu en xarxa."],
      ["Descripció d'escenaris heterogenis.", "Instal·lació, configuració i ús de serveis de xarxa per a compartir recursos.", "Configuració de recursos compartits en xarxa.", "Seguretat dels recursos compartits en xarxa."],
    ],
  },
  {
    codi: "0226", nom: "Seguretat informàtica", abbreviation: "SI", curs: "2n", horesCentre: 99, horesEmpresa: 33,
    cppes: ["a", "c", "i", "j", "l", "n", "p", "q", "u"], og: ["a", "c", "d", "e", "g", "k", "l"],
    continguts: [
      ["Ubicació i protecció física dels equips i servidors.", "Sistemes d'alimentació ininterrompuda."],
      ["Emmagatzematge de la informació: rendiment, disponibilitat, accessibilitat.", "Emmagatzematge redundant i distribuït. Emmagatzematge remot i extraïble.", "Criptografia.", "Còpies de seguretat i imatges de suport. Mitjans d'emmagatzematge."],
      ["Identificació digital. Signatura electrònica i certificat digital.", "Seguretat en els protocols per a comunicacions sense fils.", "Utilització de tallafocs en un sistema o servidor. Llistes de control d'accés.", "Política de contrasenyes.", "Recuperació de dades.", "Programari maliciós. Classificació. Eines de protecció i desinfecció."],
      ["Mètodes per a assegurar la privacitat de la informació transmesa.", "Fraus informàtics i robatoris d'informació.", "Control del monitoratge en xarxes cablejades.", "Seguretat en xarxes sense fils.", "Sistemes d'identificació: signatura electrònica, certificats digitals i altres.", "Tallafocs en equips i servidors."],
      ["Legislació sobre protecció de dades.", "Legislació sobre els serveis de la societat de la informació i correu electrònic."],
    ],
  },
];

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Mòdul SMX de referència d'un curs (per sigles o per nom); null si no és un mòdul del cicle amb dades de referència. */
export function smxModuleOf(course: AcademicCourse): SmxModule | null {
  const cfg = course.configuration;
  if (cfg.cicle !== "SMX") return null;
  return SMX_MODULES.find(m => norm(m.abbreviation) === norm(cfg.abbreviation) || norm(m.nom) === norm(cfg.moduleName)) ?? null;
}

const letterList = (letters: string[], texts: Record<string, string>) => letters.map(l => `${l}) ${texts[l]}`).join("\n");
export const smxCppesText = (m: SmxModule) => letterList(m.cppes, SMX_CPPES);
export const smxOgText = (m: SmxModule) => letterList(m.og, SMX_OG);
