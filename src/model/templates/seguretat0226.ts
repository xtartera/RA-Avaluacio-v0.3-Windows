import {createCourse, emptyConfiguration, newId, type AcademicCourse, type Activity, type ActivityCriterionLink, type AssessmentCriterion, type LearningResult, type WorkUnit} from "../domain.ts";

/**
 * Plantilla del mòdul 0226 Seguretat informàtica (2n SMX), segons la programació didàctica del curs 2026/2027.
 * És un curs independent: té la seva configuració (pesos explícits, mitjana ponderada) i no toca la de cap altre mòdul.
 * L'RA6 (empresa, 10 %) queda fora: es resol a la junta d'avaluació. Els RA1-RA5 conserven els pesos de la programació (sumen 90 %), així que quan s'afegeixi l'RA6 no caldrà tocar cap pes.
 *
 * Suposicions que cal revisar amb el professorat del mòdul:
 *  - A la UD2 la programació cita criteris «1.x» (còpia de la UD1); s'han interpretat com 2.1-2.4 i 2.5-2.6.
 *  - Cada activitat reparteix la seva part a parts iguals entre els criteris que treballa.
 *  - Les activitats es reparteixen per UT: UD1 → UT 1 … UD5 → UT 5.
 */

type Kind = "pract" | "apte" | "pe";
interface ActSpec {name: string; kind: Kind; /** % dins l'RA (0 per a les Apte). */ pct: number; cas: number[]}
interface RaSpec {code: string; description: string; /** Pes al mòdul, en %, segons la programació. */ weight: number; term: number; unit: string; cas: string[]; acts: ActSpec[]}

const range = (a: number, b: number) => Array.from({length: b - a + 1}, (_, i) => a + i);

const RAS: RaSpec[] = [
  {code: "RA1", description: "Aplica mesures de seguretat passiva en sistemes informàtics descrivint característiques d'entorns i relacionant-les amb les seves necessitats.", weight: 16, term: 1, unit: "UD1: Seguretat Passiva", cas: [
    "Valora la importància de mantenir la informació segura.", "Descriu les diferències entre seguretat física i lògica.", "Defineix les característiques de la ubicació física i condicions ambientals dels equips i servidors.",
    "Identifica la necessitat de protegir físicament els sistemes informàtics.", "Verifica el funcionament dels sistemes d'alimentació ininterrompuda.", "Selecciona els punts d'aplicació dels sistemes d'alimentació ininterrompuda.",
    "Esquematitza les característiques d'una política de seguretat basada en llistes de control d'accés.", "Valora la importància d'establir una política de contrasenyes.", "Valora els avantatges que suposa la utilització de sistemes biomètrics."], acts: [
    {name: "A1.1.1", kind: "apte", pct: 0, cas: range(1, 4)}, {name: "A1.1.2", kind: "apte", pct: 0, cas: range(1, 4)}, {name: "A1.1.3", kind: "apte", pct: 0, cas: range(1, 4)},
    {name: "A1.2.1", kind: "apte", pct: 0, cas: [5, 6]}, {name: "A1.2.2", kind: "pract", pct: 5, cas: [5, 6]},
    {name: "A1.3.1", kind: "pract", pct: 15, cas: [7, 8, 9]}, {name: "PE1.1", kind: "pe", pct: 80, cas: range(1, 9)}]},
  {code: "RA2", description: "Gestiona dispositius d'emmagatzematge descrivint els procediments efectuats i aplicant tècniques per assegurar la integritat de la informació.", weight: 18, term: 1, unit: "UD2: Dispositius d'emmagatzematge", cas: [
    "Interpreta la documentació tècnica relativa a la política d'emmagatzematge.", "Té en compte factors inherents a l'emmagatzematge de la informació (rendiment, disponibilitat, accessibilitat, entre d'altres).",
    "Classifica i enumera els principals mètodes d'emmagatzematge inclosos els sistemes d'emmagatzematge en xarxa.", "Descriu les tecnologies d'emmagatzematge redundant i distribuït.",
    "Selecciona estratègies per a la realització de còpies de seguretat.", "Té en compte la freqüència i l'esquema de rotació.", "Realitza còpies de seguretat amb diferents estratègies.",
    "Identifica les característiques dels mitjans d'emmagatzematge remots i extraïbles.", "Utilitza mitjans d'emmagatzematge remots i extraïbles.", "Crea i restaura imatges de suport de sistemes en funcionament."], acts: [
    {name: "A2.1.1", kind: "apte", pct: 0, cas: range(1, 4)}, {name: "A2.1.2", kind: "pract", pct: 3, cas: range(1, 4)}, {name: "A2.1.3", kind: "pract", pct: 3, cas: range(1, 4)},
    {name: "A2.2.1", kind: "pract", pct: 10, cas: [5, 6]}, {name: "A2.2.2", kind: "pract", pct: 10, cas: [5, 6]}, {name: "PE2.1", kind: "pe", pct: 74, cas: range(1, 10)}]},
  {code: "RA3", description: "Aplica mecanismes de seguretat activa descrivint-ne les característiques i relacionant-les amb les necessitats d'ús del sistema informàtic.", weight: 18, term: 1, unit: "UD3: Seguretat Activa", cas: [
    "Classifica els principals tipus de programari maliciós.", "Realitza actualitzacions periòdiques dels sistemes per a corregir possibles vulnerabilitats.", "Verifica l'origen i l'autenticitat de les aplicacions que s'instal·len en els sistemes.",
    "Instal·la, prova i actualitza aplicacions específiques per a la detecció i eliminació de programari maliciós.", "Aplica tècniques de recuperació de dades."], acts: [
    {name: "A3.1.1", kind: "pract", pct: 3, cas: [1, 2, 3]}, {name: "A3.1.2", kind: "pract", pct: 3, cas: [1, 2, 3]}, {name: "A3.4.1", kind: "pract", pct: 3, cas: [4]},
    {name: "A3.5.1", kind: "pract", pct: 3, cas: [5]}, {name: "A3.6.1", kind: "pract", pct: 3, cas: [5]}, {name: "PE3.1", kind: "pe", pct: 85, cas: range(1, 5)}]},
  {code: "RA4", description: "Assegura la privadesa de la informació transmesa en xarxes informàtiques descrivint vulnerabilitats i instal·lant programari específic.", weight: 26, term: 2, unit: "UD4: Tallafocs i monitoratge de xarxes", cas: [
    "Identifica la necessitat d'inventariar i controlar els serveis de xarxa.", "Contrasta la incidència de les tècniques d'enginyeria social en els fraus informàtics i robatoris d'informació.",
    "Dedueix la importància de minimitzar el volum de trànsit generat per la publicitat i el correu brossa.", "Aplica mesures per evitar el monitoratge de xarxes cablejades.",
    "Classifica i valora les propietats de seguretat dels protocols usats en xarxes sense fils.", "Descriu sistemes d'identificació com la signatura electrònica, certificat digital, entre altres.",
    "Utilitza sistemes d'identificació com la signatura electrònica, certificat digital, entre altres.", "Instal·la i configura un tallafocs en un equip o servidor."], acts: [
    {name: "A4.1.1", kind: "pract", pct: 5, cas: range(1, 5)}, {name: "A4.1.2", kind: "pract", pct: 10, cas: range(1, 5)}, {name: "A4.2.1", kind: "pract", pct: 3, cas: [6, 7]},
    {name: "A4.2.2", kind: "pract", pct: 5, cas: [6, 7]}, {name: "A4.3.1", kind: "pract", pct: 5, cas: [8]}, {name: "PE4.1", kind: "pe", pct: 72, cas: range(1, 8)}]},
  {code: "RA5", description: "Reconeix la legislació i normativa sobre seguretat i protecció de dades analitzant-ne les repercussions de l'incompliment.", weight: 12, term: 2, unit: "UD5: Legislació de seguretat i protecció de dades", cas: [
    "Descriu la legislació sobre protecció de dades de caràcter personal.", "Determina la necessitat de controlar l'accés a la informació personal emmagatzemada.",
    "Identifica les figures legals que intervenen en el tractament i manteniment dels fitxers de dades.", "Contrasta l'obligació de posar a disposició de les persones les dades personals que els concerneixen.",
    "Descriu la legislació actual sobre els serveis de la societat de la informació i comerç electrònic.", "Contrasta les normes sobre gestió de seguretat de la informació."], acts: [
    {name: "A5.1.1", kind: "pract", pct: 5, cas: range(1, 4)}, {name: "A5.1.2", kind: "pract", pct: 5, cas: range(1, 4)}, {name: "A5.1.3", kind: "pract", pct: 3, cas: range(1, 4)},
    {name: "A5.2.1", kind: "pract", pct: 5, cas: [5, 6]}, {name: "A5.2.2", kind: "pract", pct: 5, cas: [5, 6]}, {name: "A5.3.1", kind: "pract", pct: 5, cas: [5, 6]}, {name: "PE5.1", kind: "pe", pct: 72, cas: range(1, 6)}]},
];

const TYPE_NAME: Record<Kind, string> = {pract: "Pràctica", apte: "Apte/No apte", pe: "Prova escrita"};

/** Crea el curs «Seguretat informàtica» (0226) amb els RA1-RA5, les 5 UD, les activitats i els pesos de la programació. */
export function buildSeguretatCourse(academicYear: string, groupCodes: string[] = ["A", "B"]): AcademicCourse {
  const course = createCourse(academicYear, emptyConfiguration(), false, groupCodes);
  const cfg = course.configuration;
  cfg.moduleName = "Seguretat informàtica"; cfg.abbreviation = "SI";
  cfg.termCount = RAS.length; cfg.raAveraging = "weighted"; cfg.weightMode = "explicit"; cfg.roundingThreshold = .75; cfg.requiredActivityMinGrade = 5; cfg.requiredByAverage = false;
  const types = (Object.keys(TYPE_NAME) as Kind[]).map(k => ({kind: k, id: newId("type")}));
  cfg.activityTypes = types.map(t => ({id: t.id, name: TYPE_NAME[t.kind], weight: 0, status: "active" as const}));
  const learningResults: LearningResult[] = [], criteria: AssessmentCriterion[] = [], activities: Activity[] = [], links: ActivityCriterionLink[] = [], workUnits: WorkUnit[] = [];
  let activityOrder = 0;
  RAS.forEach((spec, ri) => {
    const ra: LearningResult = {id: newId("ra"), code: spec.code, description: spec.description, order: ri + 1, status: "active", moduleWeight: spec.weight / 100};
    learningResults.push(ra);
    const cas = spec.cas.map((description, i) => ({id: newId("ca"), learningResultId: ra.id, code: `${ri + 1}.${i + 1}`, description, order: i + 1, status: "active" as const}));
    criteria.push(...cas);
    const unitActivities: Activity[] = [];
    for (const a of spec.acts) {
      const act: Activity = {id: newId("activity"), name: a.name, activityTypeId: types.find(t => t.kind === a.kind)!.id, term: ri + 1, date: null, order: ++activityOrder, status: "active", session: "ordinaria", recoversRaIds: [], raShares: a.pct > 0 ? [{raId: ra.id, share: a.pct / 100}] : []};
      activities.push(act); unitActivities.push(act);
      for (const n of a.cas) links.push({id: newId("link"), activityId: act.id, criterionId: cas[n - 1].id, allocation: 1 / a.cas.length});
    }
    workUnits.push({id: newId("unit"), name: spec.unit, order: ri + 1, status: "active", activityIds: unitActivities.map(a => a.id), requiredActivityIds: unitActivities.filter((_, i) => spec.acts[i].kind !== "pract").map(a => a.id), learningResultIds: [ra.id]});
  });
  Object.assign(cfg, {learningResults, criteria, activities, links, workUnits});
  return course;
}
