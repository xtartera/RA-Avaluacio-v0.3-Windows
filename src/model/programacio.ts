import {activityShareInRa, raWeights} from "./calculation.ts";
import {explicitWeightGap} from "./explicitWeights.ts";
import type {AcademicCourse, ProgramacioData} from "./domain.ts";

/** Textos per defecte de la programació: el que el professor no hagi escrit. Són editables i es poden revisar abans d'imprimir. */
export interface ProgramDefaults {
  departament: string; familia: string; nomCicle: string; grup: string;
  competenciaGeneral: string; capacitatsClau: string; competencies: string; objectius: string;
  estrategies: string; tac: string; diversitat: string; organitzacio: string; assistencia: string; termini: string;
  avaluacio: string; espais: string; normativa: string;
}

const yearShort = (academicYear: string) => academicYear.replace(/\D/g, "").length >= 8 ? `${academicYear.replace(/\D/g, "").slice(2, 4)}${academicYear.replace(/\D/g, "").slice(6, 8)}` : academicYear.replace(/\W/g, "");
export const programYearLabel = (academicYear: string) => academicYear.replace("–", "/").replace("-", "/");

export function programDefaults(course: AcademicCourse): ProgramDefaults {
  const cfg = course.configuration;
  return {
    departament: "Informàtica", familia: "Informàtica i telecomunicacions",
    nomCicle: cfg.cicleNivell === "Grau mitjà" && cfg.cicle === "SMX" ? "CFGM Sistemes microinformàtics i xarxes" : `${cfg.cicleNivell === "Grau mitjà" ? "CFGM" : "CFGS"} ${cfg.cicle}`,
    grup: `${cfg.curs.replace(/\D/g, "") || "2"}${cfg.cicle}`,
    competenciaGeneral: "La competència general d'aquest títol consisteix a instal·lar, configurar i mantenir sistemes microinformàtics, aïllats o en xarxa, així com xarxes locals en petits entorns, assegurant-ne el funcionament amb la qualitat i la seguretat exigides i atenent el client en els casos requerits. (Verifica el text amb el Reial decret del títol.)",
    capacitatsClau: "Són les capacitats transversals que afecten diferents llocs de treball i que són transferibles a noves situacions de treball. Entre aquestes capacitats destaquen les d'autonomia, d'innovació, d'organització del treball, de responsabilitat, de relació interpersonal, de treball en equip i de resolució de problemes.",
    competencies: "Completa aquí les competències professionals, personals i socials del títol associades al mòdul professional (segons el Reial decret del títol i el currículum del Departament).",
    objectius: "Completa aquí els objectius generals del cicle associats al mòdul professional (segons el Reial decret del títol i el currículum del Departament).",
    estrategies: "L'enfocament pedagògic combina sessions teoricopràctiques i sessions pràctiques orientades al desenvolupament d'activitats i projectes, amb metodologies actives que situen l'alumnat com a protagonista del seu aprenentatge: constructivisme, aprenentatge cooperatiu, aprenentatge observacional i aprenentatge basat en projectes (ABP).",
    tac: "L'eina principal de treball, comunicació i relació amb l'alumnat serà l'aula virtual (Moodle). Els materials didàctics inclouran recursos multimèdia i exemples pràctics. Per al seguiment més personalitzat o les revisions de correccions es prioritzarà el contacte presencial i, quan sigui necessari, el correu electrònic.",
    diversitat: "Es contemplen mesures per atendre la diversitat de ritmes i necessitats: adaptacions de materials i activitats per a l'alumnat amb necessitats específiques de suport educatiu, tutories individualitzades de seguiment i orientació, recursos addicionals a l'aula virtual i dinàmiques de treball cooperatiu.",
    organitzacio: "El mòdul professional s'organitza mitjançant activitats d'ensenyament-aprenentatge (AEA) al llarg del curs. Es planifica una seqüència progressiva que permet abordar els continguts de manera estructurada i coherent amb els altres mòduls del cicle.",
    assistencia: "L'assistència és obligatòria. En el cas de superar el 20% de faltes, l'alumnat perdrà el dret a l'avaluació contínua i haurà d'anar a segona convocatòria (juny) per superar el mòdul.",
    termini: "Només s'acceptaran les tasques, reptes i activitats dins del termini indicat. Només en casos justificats, i sota el criteri de l'equip docent, es podran admetre fora de termini.",
    avaluacio: "Al començament del mòdul, l'equip docent proporcionarà informació detallada sobre els resultats d'aprenentatge, els criteris d'avaluació, els continguts i els diferents instruments d'avaluació utilitzats. Els alumnes poden presentar-se a dues convocatòries en el curs escolar; la primera convocatòria (ordinària) sempre comptabilitza i, a la de juny, si l'alumne no es presenta no comptabilitza. Per superar el mòdul professional, els alumnes tenen dret a presentar-se fins a quatre convocatòries; si no se supera en aquestes quatre es pot sol·licitar una convocatòria extraordinària a la direcció del centre. Si es detecta alguna activitat copiada, tant l'alumne que ha copiat com aquell que s'ha deixat copiar quedaran automàticament suspesos. L'avaluació és contínua i formativa.",
    espais: "Els espais destinats al desenvolupament de les activitats del mòdul seran les aules i els tallers d'informàtica assignats als grups, amb ordinadors per a l'alumnat, connexió a Internet i pissarra digital interactiva. Els recursos didàctics seran principalment eines i recursos de codi lliure. L'alumnat tindrà accés a un campus virtual amb els materials, l'enunciat de les activitats i els terminis de lliurament, el lliurament de les activitats i la consulta contínua de les qualificacions.",
    normativa: "Llei orgànica 3/2022, de 31 de març, d'ordenació i integració de la formació professional.\nReial decret 659/2023, de 18 de juliol, pel qual es desplega l'ordenació del sistema de formació professional.\nReial decret 1691/2007, de 14 de desembre, pel qual s'estableix el títol de Tècnic en Sistemes microinformàtics i xarxes i se'n fixen els ensenyaments mínims.\n[Completa amb el currículum del cicle a Catalunya i l'ordre d'avaluació vigent del Departament d'Educació i Formació Professional.]",
  };
}

/** Valor efectiu: el que ha escrit el professor o, si és buit, el text per defecte. */
export const programValue = (course: AcademicCourse, key: keyof ProgramDefaults): string => (course.configuration.programacio?.[key] as string | undefined)?.trim() ? (course.configuration.programacio![key] as string) : programDefaults(course)[key];

export const programFileName = (course: AcademicCourse): string => `PD_CF_${course.configuration.cicle}_${(course.configuration.programacio?.codiModul || course.configuration.abbreviation || "MP").replace(/\W/g, "")}_${yearShort(course.academicYear)}`;

const pct = (v: number) => Math.round(v * 1000) / 10;

export interface ProgramRa {id: string; code: string; description: string; weight: number; cas: {code: string; description: string}[]; contingut: string; inici: string; fi: string}
export interface ProgramActivity {id: string; name: string; type: string; required: boolean}
export interface ProgramUnitView {id: string; index: number; name: string; ras: string[]; cas: string[]; activities: ProgramActivity[]; hores: string}
export interface ProgramContent {
  ras: ProgramRa[];
  /** Tipus d'activitat (instruments) amb el nombre d'activitats de cadascun. */
  instruments: {name: string; count: number}[];
  /** Matriu RA × activitat: % de l'activitat dins de la nota de l'RA. */
  columns: {id: string; name: string}[];
  matrix: {code: string; cells: (number | null)[]; total: number}[];
  qmp: string;
  gap: number;
  weightMode: "types" | "explicit";
  requiredNames: string[];
  units: ProgramUnitView[];
}

/** Dades derivades de la configuració del curs que la programació didàctica ha de mostrar: RA, CA, instruments, matriu de pesos, fórmula de la nota i AEA. */
export function programContent(course: AcademicCourse): ProgramContent {
  const cfg = course.configuration, data: ProgramacioData = cfg.programacio ?? {};
  const activities = cfg.activities.filter(a => a.status === "active" && a.session === "ordinaria");
  const rw = raWeights(course);
  const ras = cfg.learningResults.filter(r => r.status === "active").sort((a, b) => a.order - b.order);
  const progRas: ProgramRa[] = ras.map(r => ({
    id: r.id, code: r.code, description: r.description, weight: rw.get(r.id) ?? 0,
    cas: cfg.criteria.filter(c => c.status === "active" && c.learningResultId === r.id).sort((a, b) => a.order - b.order).map(c => ({code: c.code, description: c.description})),
    contingut: data.raContinguts?.[r.id] ?? "", inici: data.raDates?.[r.id]?.inici ?? "", fi: data.raDates?.[r.id]?.fi ?? "",
  }));
  const typeName = new Map(cfg.activityTypes.map(t => [t.id, t.name]));
  const counts = new Map<string, number>();
  for (const a of activities) counts.set(typeName.get(a.activityTypeId) ?? "Sense tipus", (counts.get(typeName.get(a.activityTypeId) ?? "Sense tipus") ?? 0) + 1);
  const units = cfg.workUnits.filter(u => u.status === "active").sort((a, b) => a.order - b.order);
  const required = new Set(units.flatMap(u => u.requiredActivityIds));
  const columns = activities.map(a => ({id: a.id, name: a.name}));
  const matrix = ras.map(r => {
    const shares = activityShareInRa(course, r.id), cells = activities.map(a => { const s = shares.get(a.id); return s ? pct(s) : null; });
    return {code: r.code, cells, total: cells.reduce<number>((s, c) => s + (c ?? 0), 0)};
  });
  const gap = cfg.weightMode === "explicit" ? explicitWeightGap(course) : 0;
  const fmtW = (v: number) => (Math.round(v * 10000) / 10000).toLocaleString("ca");
  const terms = progRas.map(r => `${fmtW(r.weight)}·${r.code}`);
  const qmp = `Qmp = ${terms.join(" + ")}${gap > 0.0005 ? ` + ${fmtW(gap)}·RAemp` : ""}`;
  const unitViews: ProgramUnitView[] = units.map((u, i) => {
    const acts = activities.filter(a => u.activityIds.includes(a.id));
    const caIds = new Set(cfg.links.filter(l => acts.some(a => a.id === l.activityId)).map(l => l.criterionId));
    return {
      id: u.id, index: i + 1, name: u.name,
      ras: ras.filter(r => u.learningResultIds.includes(r.id) || cfg.criteria.some(c => c.learningResultId === r.id && caIds.has(c.id))).map(r => r.code),
      cas: cfg.criteria.filter(c => caIds.has(c.id)).sort((a, b) => a.code.localeCompare(b.code, "ca", {numeric: true})).map(c => c.code),
      activities: acts.map(a => ({id: a.id, name: a.name, type: typeName.get(a.activityTypeId) ?? "Sense tipus", required: required.has(a.id) || u.requiredActivityIds.includes(a.id)})),
      hores: data.units?.[u.id]?.hores ?? "",
    };
  });
  return {
    ras: progRas, instruments: [...counts].map(([name, count]) => ({name, count})), columns, matrix, qmp, gap, weightMode: cfg.weightMode,
    requiredNames: activities.filter(a => required.has(a.id)).map(a => a.name), units: unitViews,
  };
}
