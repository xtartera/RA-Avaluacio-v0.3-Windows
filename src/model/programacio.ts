import {activityShareInRa, raWeights} from "./calculation.ts";
import {explicitWeightGap} from "./explicitWeights.ts";
import type {AcademicCourse, ProgramacioData, ProgramSequenceRow} from "./domain.ts";
import {SMX_CAPACITATS_CLAU, SMX_COMPETENCIA_GENERAL, SMX_NORMATIVA, smxCppesText, smxModuleOf, smxOgText} from "./programacioNormativa.ts";

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
  const cfg = course.configuration, smx = cfg.cicle === "SMX", ref = smxModuleOf(course);
  return {
    departament: "Informàtica", familia: "Informàtica i telecomunicacions",
    nomCicle: cfg.cicleNivell === "Grau mitjà" && cfg.cicle === "SMX" ? "CFGM Sistemes microinformàtics i xarxes" : `${cfg.cicleNivell === "Grau mitjà" ? "CFGM" : "CFGS"} ${cfg.cicle}`,
    grup: `${cfg.curs.replace(/\D/g, "") || "2"}${cfg.cicle}`,
    competenciaGeneral: smx ? SMX_COMPETENCIA_GENERAL : "Completa aquí la competència general del títol (segons el Reial decret del títol).",
    capacitatsClau: smx ? SMX_CAPACITATS_CLAU : "Són les capacitats transversals que afecten diferents llocs de treball i que són transferibles a noves situacions de treball.",
    competencies: ref ? smxCppesText(ref) : "Completa aquí les competències professionals, personals i socials del títol associades al mòdul professional (segons el Reial decret del títol i el currículum del Departament).",
    objectius: ref ? smxOgText(ref) : "Completa aquí els objectius generals del cicle associats al mòdul professional (segons el Reial decret del títol i el currículum del Departament).",
    estrategies: "L'enfocament pedagògic combina sessions teoricopràctiques i sessions pràctiques orientades al desenvolupament d'activitats i projectes, amb metodologies actives que situen l'alumnat com a protagonista del seu aprenentatge: constructivisme, aprenentatge cooperatiu, aprenentatge observacional i aprenentatge basat en projectes (ABP).",
    tac: "L'eina principal de treball, comunicació i relació amb l'alumnat serà l'aula virtual (Moodle). Els materials didàctics inclouran recursos multimèdia i exemples pràctics. Per al seguiment més personalitzat o les revisions de correccions es prioritzarà el contacte presencial i, quan sigui necessari, el correu electrònic.",
    diversitat: "Es contemplen mesures per atendre la diversitat de ritmes i necessitats: adaptacions de materials i activitats per a l'alumnat amb necessitats específiques de suport educatiu, tutories individualitzades de seguiment i orientació, recursos addicionals a l'aula virtual i dinàmiques de treball cooperatiu.",
    organitzacio: "El mòdul professional s'organitza mitjançant activitats d'ensenyament-aprenentatge (AEA) al llarg del curs. Es planifica una seqüència progressiva que permet abordar els continguts de manera estructurada i coherent amb els altres mòduls del cicle.",
    assistencia: "L'assistència és obligatòria. En el cas de superar el 20% de faltes, l'alumnat perdrà el dret a l'avaluació contínua i haurà d'anar a segona convocatòria (juny) per superar el mòdul.",
    termini: "Només s'acceptaran les tasques, reptes i activitats dins del termini indicat. Només en casos justificats, i sota el criteri de l'equip docent, es podran admetre fora de termini.",
    avaluacio: "Al començament del mòdul, l'equip docent proporcionarà informació detallada sobre els resultats d'aprenentatge, els criteris d'avaluació, els continguts i els diferents instruments d'avaluació utilitzats. Els alumnes poden presentar-se a dues convocatòries en el curs escolar; la primera convocatòria (ordinària) sempre comptabilitza i, a la de juny, si l'alumne no es presenta no comptabilitza. Per superar el mòdul professional, els alumnes tenen dret a presentar-se fins a quatre convocatòries; si no se supera en aquestes quatre es pot sol·licitar una convocatòria extraordinària a la direcció del centre. Si es detecta alguna activitat copiada, tant l'alumne que ha copiat com aquell que s'ha deixat copiar quedaran automàticament suspesos. L'avaluació és contínua i formativa.",
    espais: "Els espais destinats al desenvolupament de les activitats del mòdul seran les aules i els tallers d'informàtica assignats als grups, amb ordinadors per a l'alumnat, connexió a Internet i pissarra digital interactiva. Els recursos didàctics seran principalment eines i recursos de codi lliure. L'alumnat tindrà accés a un campus virtual amb els materials, l'enunciat de les activitats i els terminis de lliurament, el lliurament de les activitats i la consulta contínua de les qualificacions.",
    normativa: smx
      ? [...SMX_NORMATIVA, "[Completa, si escau, amb l'ordre d'avaluació vigent del Departament d'Educació i Formació Professional.]"].join("\n")
      : "Llei orgànica 3/2022, de 31 de març, d'ordenació i integració de la formació professional.\nReial decret 659/2023, de 18 de juliol, pel qual es desplega l'ordenació del sistema de formació professional.\n[Completa amb el reial decret del títol, el currículum a Catalunya i l'ordre d'avaluació vigent.]",
  };
}

const firstText = (...v: (string | undefined)[]) => v.find(x => x && x.trim()) ?? "";
/** Codi del mòdul: el que ha escrit el professor o, si no, el del mòdul SMX de referència. */
export const programCodi = (course: AcademicCourse): string => firstText(course.configuration.programacio?.codiModul, smxModuleOf(course)?.codi);
/** Hores al centre i d'estada a l'empresa: les escrites pel professor o, si no, les de les Orientacions 2024-2026. */
export function programHores(course: AcademicCourse): {centre: string; empresa: string} {
  const d = course.configuration.programacio, ref = smxModuleOf(course);
  return {centre: firstText(d?.horesCentre, ref ? String(ref.horesCentre) : ""), empresa: firstText(d?.horesEmpresa, ref ? String(ref.horesEmpresa) : "")};
}

/** Valor efectiu: el que ha escrit el professor o, si és buit, el text per defecte. */
export const programValue = (course: AcademicCourse, key: keyof ProgramDefaults): string => (course.configuration.programacio?.[key] as string | undefined)?.trim() ? (course.configuration.programacio![key] as string) : programDefaults(course)[key];

export const programFileName = (course: AcademicCourse): string => `PD_CF_${course.configuration.cicle}_${(programCodi(course) || course.configuration.abbreviation || "MP").replace(/\W/g, "")}_${yearShort(course.academicYear)}`;

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

/** Continguts orientatius del currículum per a l'RA ri, només si el mòdul té tants RA com blocs de continguts de referència. */
const refContingut = (ref: ReturnType<typeof smxModuleOf>, nRas: number, ri: number) => (ref && ref.continguts.length === nRas ? ref.continguts[ri].join("\n") : "");

/** Dades derivades de la configuració del curs que la programació didàctica ha de mostrar: RA, CA, instruments, matriu de pesos, fórmula de la nota i AEA. */
export function programContent(course: AcademicCourse): ProgramContent {
  const cfg = course.configuration, data: ProgramacioData = cfg.programacio ?? {};
  const activities = cfg.activities.filter(a => a.status === "active" && a.session === "ordinaria");
  const rw = raWeights(course);
  const ras = cfg.learningResults.filter(r => r.status === "active").sort((a, b) => a.order - b.order);
  const ref = smxModuleOf(course);
  const progRas: ProgramRa[] = ras.map((r, ri) => ({
    id: r.id, code: r.code, description: r.description, weight: rw.get(r.id) ?? 0,
    cas: cfg.criteria.filter(c => c.status === "active" && c.learningResultId === r.id).sort((a, b) => a.order - b.order).map(c => ({code: c.code, description: c.description})),
    contingut: data.raContinguts?.[r.id] ?? refContingut(ref, ras.length, ri), inici: data.raDates?.[r.id]?.inici ?? "", fi: data.raDates?.[r.id]?.fi ?? "",
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

const quoted = (s: string) => `«${s.trim().replace(/\.$/, "")}»`;
const caRange = (codes: string[]) => codes.join(", ");

/**
 * Descripció per defecte d'una AEA, construïda només amb dades de la configuració i del currículum:
 * RA que treballa, activitats i instruments, criteris d'avaluació cobertors i continguts orientatius dels RA.
 * El professor la pot substituir a l'editor.
 */
export function programUnitDescription(u: ProgramUnitView, ras: ProgramRa[]): string {
  const rs = u.ras.map(code => ras.find(r => r.code === code)).filter((r): r is ProgramRa => !!r);
  const parts: string[] = [];
  if (rs.length) parts.push(`Aquesta AEA treballa ${rs.length > 1 ? "els resultats d'aprenentatge" : "el resultat d'aprenentatge"} ${rs.map(r => `${r.code}: ${quoted(r.description)}`).join("; ")}.`);
  else parts.push(`Aquesta AEA («${u.name}») encara no té resultats d'aprenentatge associats.`);
  if (u.activities.length) {
    const byType = new Map<string, number>();
    u.activities.forEach(a => byType.set(a.type, (byType.get(a.type) ?? 0) + 1));
    const req = u.activities.filter(a => a.required).length;
    parts.push(`Es desenvolupa amb ${u.activities.length} ${u.activities.length === 1 ? "activitat" : "activitats"} d'ensenyament-aprenentatge (${[...byType].map(([t, n]) => `${t}: ${n}`).join(", ")})${req ? `, de les quals ${req} ${req === 1 ? "és obligatòria" : "són obligatòries"}` : ""}${u.cas.length ? `, i permet avaluar els criteris ${caRange(u.cas)}` : ""}.`);
  }
  const conts = rs.flatMap(r => r.contingut.split(/\r?\n/).map(x => x.trim().replace(/\.$/, "")).filter(Boolean));
  if (conts.length) parts.push(`Continguts que es treballen: ${conts.join("; ")}.`);
  return parts.join("\n\n");
}

/** Durada d'un examen (en hores); la resta d'activitats ocupen sessions senceres d'1 hora. */
export const EXAM_HOURS = 2;
export const isExamActivity = (type: string) => /prova|examen/i.test(type);

/** Reparteix `total` enter segons pesos pel mètode del residu més gran (la suma és exactament `total`). */
export function apportion(total: number, weights: number[]): number[] {
  if (!weights.length) return [];
  const t = Math.max(0, Math.round(total)), sum = weights.reduce((s, w) => s + w, 0), w = sum > 0 ? weights : weights.map(() => 1), s2 = sum > 0 ? sum : weights.length;
  const raw = w.map(x => t * x / s2), out = raw.map(Math.floor);
  let rest = t - out.reduce((a, b) => a + b, 0);
  raw.map((r, i) => [r - out[i], i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]).forEach(([, i]) => { if (rest > 0) { out[i]++; rest--; } });
  return out;
}

export interface ProgramHoursPlan {
  /** Hores de cada AEA i de cada activitat. */
  unit: Record<string, number>; activity: Record<string, number>;
  moduleTotal: number; assigned: number; warnings: string[];
}

/**
 * Repartiment d'hores. Les hores de l'AEA són les que ha escrit el professor o, si no, surten de repartir les hores del mòdul
 * al centre entre les AEA segons el pes de les seves activitats. Dins de cada AEA, els exàmens fan 2 h, la resta d'activitats
 * mínim 1 h, i les hores que sobren es reparteixen en sessions senceres segons el pes de l'activitat a la nota dels RA.
 * Les hores fixades a mà per activitat es respecten.
 */
export function programHoursPlan(course: AcademicCourse, c: ProgramContent = programContent(course)): ProgramHoursPlan {
  const data = course.configuration.programacio ?? {}, warnings: string[] = [];
  const moduleTotal = Math.round(Number(programHores(course).centre)) || 0;
  const colIdx = new Map(c.columns.map((col, i) => [col.id, i]));
  const weightOf = (id: string) => { const i = colIdx.get(id); const w = i === undefined ? 0 : c.matrix.reduce((s, r) => s + (r.cells[i] ?? 0), 0) / 100; return w > 0 ? w : 0.25; };
  const fixedAct = (uid: string, aid: string) => { const n = Math.round(Number(data.units?.[uid]?.activityHours?.[aid])); return n > 0 ? n : undefined; };
  const baseOf = (a: ProgramActivity) => isExamActivity(a.type) ? EXAM_HOURS : 1;
  const fixedUnit = (uid: string) => { const n = Math.round(Number(data.units?.[uid]?.hores)); return n > 0 ? n : 0; };
  const minOf = (u: ProgramUnitView) => u.activities.reduce((s, a) => s + (fixedAct(u.id, a.id) ?? baseOf(a)), 0);

  const unit: Record<string, number> = {}, activity: Record<string, number> = {};
  const auto = c.units.filter(u => !fixedUnit(u.id));
  c.units.forEach(u => { if (fixedUnit(u.id)) unit[u.id] = fixedUnit(u.id); });
  if (auto.length) {
    const pool = moduleTotal - c.units.reduce((s, u) => s + fixedUnit(u.id), 0), mins = auto.map(minOf), extra = pool - mins.reduce((a, b) => a + b, 0);
    if (!moduleTotal) { auto.forEach((u, i) => { unit[u.id] = mins[i]; }); warnings.push("Falten les hores del mòdul al centre: cada AEA té només el mínim (examen 2 h, la resta 1 h per activitat)."); }
    else if (extra >= 0) { const add = apportion(extra, auto.map(u => u.activities.reduce((s, a) => s + weightOf(a.id), 0))); auto.forEach((u, i) => { unit[u.id] = mins[i] + add[i]; }); }
    else { auto.forEach((u, i) => { unit[u.id] = mins[i]; }); warnings.push(`Les activitats necessiten com a mínim ${mins.reduce((a, b) => a + b, 0)} h i només queden ${Math.max(pool, 0)} h del mòdul per repartir.`); }
  }
  for (const u of c.units) {
    const H = unit[u.id], free = u.activities.filter(a => fixedAct(u.id, a.id) === undefined);
    u.activities.forEach(a => { const f = fixedAct(u.id, a.id); if (f !== undefined) activity[a.id] = f; });
    free.forEach(a => { activity[a.id] = baseOf(a); });
    const extra = H - u.activities.reduce((s, a) => s + activity[a.id], 0);
    if (extra > 0) {
      const targets = free.filter(a => !isExamActivity(a.type)), pool = targets.length ? targets : free;
      if (pool.length) { const add = apportion(extra, pool.map(a => weightOf(a.id))); pool.forEach((a, i) => { activity[a.id] += add[i]; }); }
      else warnings.push(`${u.name}: ${extra} h sense activitat on repartir-les.`);
    } else if (extra < 0) warnings.push(`${u.name}: les activitats sumen ${H - extra} h i l'AEA en té ${H}.`);
  }
  const assigned = c.units.reduce((s, u) => s + u.activities.reduce((t, a) => t + (activity[a.id] ?? 0), 0), 0);
  if (moduleTotal && assigned !== moduleTotal) warnings.push(`Hores repartides: ${assigned} h; el mòdul en té ${moduleTotal} h.`);
  return {unit, activity, moduleTotal, assigned, warnings};
}

/** Seqüència per defecte d'una AEA: una fila per activitat, amb la temporització del repartiment d'hores. */
export function programSequenceFromActivities(u: ProgramUnitView, plan: ProgramHoursPlan): ProgramSequenceRow[] {
  return u.activities.map(a => ({
    text: `${a.type}: ${a.name}`, organitzacio: "Individual", temps: `${plan.activity[a.id] ?? 1} h`,
    metodologia: isExamActivity(a.type) ? "Prova escrita individual presencial" : "Treball individual amb el suport del professor",
    recursos: isExamActivity(a.type) ? "Enunciat de la prova" : "Ordinador, pissarra digital", localitzacio: "Aula",
  }));
}

/** Activitat de l'AEA a què correspon una fila de seqüència (pel text «Tipus: nom» o pel nom). */
export function programRowActivity(row: ProgramSequenceRow, u: ProgramUnitView): ProgramActivity | undefined {
  const t = row.text.trim();
  return u.activities.find(a => t === `${a.type}: ${a.name}`) ?? u.activities.find(a => t.includes(a.name));
}

/** Seqüència amb la temporització del repartiment d'hores: omple les files sense temps o, amb `overwrite`, totes les que corresponen a una activitat. */
export function programSequenceWithHours(seq: ProgramSequenceRow[], u: ProgramUnitView, plan: ProgramHoursPlan, overwrite = false): ProgramSequenceRow[] {
  return seq.filter(r => !isLegacyIntroRow(r)).map(row => { const a = programRowActivity(row, u); return a && plan.activity[a.id] && (overwrite || !row.temps.trim()) ? {...row, temps: `${plan.activity[a.id]} h`} : row; });
}

/** Fila «Presentació de l'AEA» de 30 min que generava la versió anterior del botó: no encaixa amb el repartiment per sessions d'1 hora. */
export const isLegacyIntroRow = (r: ProgramSequenceRow) => /^presentaci[óo] de l.AEA$/i.test(r.text.trim()) && /^30\s*min/i.test(r.temps.trim());

/** Hores d'una temporització escrita com «3 h», «1,5 h» o «30 min» (0 si no s'entén). */
export function parseHours(temps: string): number {
  const t = temps.trim().toLowerCase().replace(",", "."), h = t.match(/(\d+(?:\.\d+)?)\s*h/), m = t.match(/(\d+(?:\.\d+)?)\s*min/);
  return (h ? Number(h[1]) : 0) + (m ? Number(m[1]) / 60 : 0) || (/^\d+(\.\d+)?$/.test(t) ? Number(t) : 0);
}
export const sequenceHours = (seq: ProgramSequenceRow[]) => Math.round(seq.reduce((s, r) => s + parseHours(r.temps), 0) * 100) / 100;
