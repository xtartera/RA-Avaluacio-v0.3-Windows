import {activityIsEvaluated, activityWeights, calculateStudent, isDelivered, requiredGroupStatus, totalGrade} from "./calculation.ts";
import {countsForGrade, type AcademicCourse, type DiagnosticResult, type Group, type InitialObservation} from "./domain.ts";
import {diagnosticLevel, givenName, LEVEL_LABEL, type DiagnosticLevel} from "./diagnostic.ts";
import {observationAverage} from "./observation.ts";

export interface EvidenceActivity {
  id: string;
  name: string;
  typeName: string;
  grade: number | null;
  status: "graded" | "not_presented" | "pending";
  /** Una nota de 0 (o no presentat) vol dir que no s'ha lliurat o s'ha lliurat fora de termini. */
  delivered: boolean;
  groupAverage: number | null;
  required: boolean;
}

export interface EvidenceRa {
  code: string;
  estimated: number | null;
  coverage: number;
  provisional: boolean;
}

export type TrafficColor = "verd" | "groc" | "vermell" | "gris";

export interface Traffic {
  color: TrafficColor;
  label: string;
  /** Motius del color. */
  reasons: string[];
  /** Avisos que no canvien el color (constància, evolució, distància al grup). */
  warnings: string[];
  /** Hi ha poques dades avaluades: el color és orientatiu. */
  provisional: boolean;
}

export const TRAFFIC_LABEL: Record<TrafficColor, string> = {verd: "Va bé", groc: "A vigilar", vermell: "Cal actuar", gris: "Sense dades"};
/** Ordre de gravetat per ordenar: primer els vermells. */
export const TRAFFIC_ORDER: Record<TrafficColor, number> = {vermell: 0, groc: 1, verd: 2, gris: 3};

/** Llindars del semàfor (mitjana sobre 10, percentatge de lliuraments, evolució i diferència amb el grup). */
/**
 * El color és la mitjana de les activitats corregides (un 0 hi compta): verd ≥ 7, groc ≥ 5, vermell < 5.
 * Un examen obligatori per recuperar fa vermell. La resta de senyals són avisos que no canvien el color.
 */
export const TRAFFIC_RULES = {greenAverage: 7, redAverage: 5, minActivities: 2, warnDelivery: 80, warnTrend: -2.5, warnGroupGap: -2};

export interface EvidenceIndicator {
  name: string;
  value: string;
  /** Com es calcula. */
  how: string;
  /** Què en diu, en aquest cas. */
  reading: string;
  status: "ok" | "warn" | "bad" | "neutral";
}

export interface CurrentEvidence {
  unitId: string | null;
  unitName: string;
  /** Activitats de la UT ja avaluades al grup (corregides), siguin del tipus que siguin. */
  activities: EvidenceActivity[];
  totalInUnit: number;
  coveragePct: number;
  delivered: number;
  notPresented: number;
  zeros: number;
  deliveryPct: number;
  average: number | null;
  /** Mitjana només de les activitats lliurades (sense comptar els 0). */
  averageDelivered: number | null;
  median: number | null;
  stdev: number | null;
  groupAverage: number | null;
  deltaGroup: number | null;
  trend: {first: number; second: number; delta: number} | null;
  byType: {name: string; average: number; n: number}[];
  required: {total: number; passed: number; failed: number; pending: number};
  ras: EvidenceRa[];
  level: DiagnosticLevel | null;
  /** Frases sobre les activitats corregides. */
  sentences: string[];
  /** Frases que contrasten amb l'avaluació inicial i amb l'observació a l'aula. */
  contrast: string[];
  cautions: string[];
  /** Accions suggerides per millorar els resultats. */
  recommendations: string[];
  /** Lectura capacitat (nota quan lliura) enfront de constància (efecte de no lliurar). */
  potential: {text: string; tone: "ok" | "warn" | "bad" | "neutral"} | null;
  /** Aspectes positius (en positiu, per a la família). */
  strengths: string[];
  /** Semàfor segons els resultats actuals. */
  traffic: Traffic;
  /** Taula resum d'indicadors: valor, càlcul i lectura. */
  indicators: EvidenceIndicator[];
}

const fmt = (n: number) => n.toLocaleString("ca", {minimumFractionDigits: 1, maximumFractionDigits: 1});
const mean = (values: number[]) => values.reduce((s, v) => s + v, 0) / values.length;
const LEVEL_INDEX: Record<DiagnosticLevel, number> = {suport: 0, "en-proces": 1, adequat: 2, alt: 3};
const listJoin = (items: string[]) => items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} i ${items[items.length - 1]}`;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b), mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const ordinary = (course: AcademicCourse) => course.configuration.activities.filter(a => a.status === "active" && a.session === "ordinaria" && countsForGrade(a));

/** UT disponibles per escollir (sense cap configurada, no n'hi ha). */
export const listUnits = (course: AcademicCourse) => course.configuration.workUnits.filter(u => u.status === "active").sort((a, b) => a.order - b.order);

/**
 * UT en curs: l'última amb activitats corregides però no totes; si cap és parcial, l'última amb alguna activitat corregida.
 * Sense UT configurades, o sense cap activitat corregida, retorna null.
 */
export function currentUnitId(course: AcademicCourse, group: Group): string | null {
  const active = new Set(ordinary(course).map(a => a.id));
  let partial: string | null = null, touched: string | null = null;
  for (const unit of listUnits(course)) {
    const ids = unit.activityIds.filter(id => active.has(id));
    const done = ids.filter(id => activityIsEvaluated(group, id)).length;
    if (done > 0) touched = unit.id;
    if (done > 0 && done < ids.length) partial = unit.id;
  }
  return partial ?? touched;
}

/**
 * Dades observades de les activitats ja corregides d'una UT per a un alumne, amb frases per regles.
 * Descriu dades: no jutja ni substitueix el criteri docent.
 */
export function analyzeCurrentEvidence(course: AcademicCourse, group: Group, enrollmentId: string, name: string, options: {unitId?: string | null; initial?: DiagnosticResult[]; observation?: InitialObservation} = {}): CurrentEvidence | null {
  const cfg = course.configuration;
  const unit = options.unitId === undefined ? listUnits(course).find(u => u.id === currentUnitId(course, group)) : listUnits(course).find(u => u.id === options.unitId);
  const activeActivities = ordinary(course);
  const unitActivities = unit ? activeActivities.filter(a => unit.activityIds.includes(a.id)) : activeActivities;
  const evaluated = unitActivities.filter(a => activityIsEvaluated(group, a.id)).sort((a, b) => a.term - b.term || a.order - b.order);
  if (!evaluated.length) return null;

  const activeEnrollments = group.enrollments.filter(e => e.status === "active");
  const typeName = (id: string) => cfg.activityTypes.find(t => t.id === id)?.name ?? "Sense tipus";
  const activities: EvidenceActivity[] = evaluated.map(a => {
    const grade = group.grades.find(g => g.enrollmentId === enrollmentId && g.activityId === a.id);
    const total = totalGrade(grade);
    const peers = activeEnrollments.map(e => group.grades.find(g => g.enrollmentId === e.id && g.activityId === a.id)).filter(g => g?.status === "graded" || g?.status === "not_presented").map(g => g!.status === "graded" ? totalGrade(g) ?? 0 : 0);
    return {
      id: a.id, name: a.name, typeName: typeName(a.activityTypeId),
      grade: grade?.status === "graded" ? total : null,
      delivered: grade?.status === "graded" && total !== null && total > 0,
      status: grade?.status === "not_presented" ? "not_presented" : grade?.status === "graded" && total !== null ? "graded" : "pending",
      groupAverage: peers.length ? mean(peers) : null,
      required: unit ? unit.requiredActivityIds.includes(a.id) : listUnits(course).some(u => u.requiredActivityIds.includes(a.id)),
    };
  });

  const weights = activityWeights(course);
  const unitWeight = unitActivities.reduce((s, a) => s + (weights.get(a.id) ?? 0), 0);
  const doneWeight = evaluated.reduce((s, a) => s + (weights.get(a.id) ?? 0), 0);
  const coveragePct = unitWeight ? doneWeight / unitWeight * 100 : evaluated.length / unitActivities.length * 100;

  const graded = activities.filter(a => a.delivered);
  // Una activitat corregida amb 0 (o no presentada) és una activitat acabada amb nota 0: compta a la mitjana.
  const scoreOf = (a: EvidenceActivity) => a.delivered ? a.grade! : 0;
  const grades = activities.map(scoreOf);
  const delivered = graded.length;
  const notPresented = activities.filter(a => !a.delivered).length;
  const zeros = activities.filter(a => a.status === "graded" && a.grade === 0).length;
  const deliveryPct = delivered / activities.length * 100;
  const average = grades.length ? mean(grades) : null;
  const averageDelivered = graded.length ? mean(graded.map(scoreOf)) : null;
  const stdev = grades.length > 1 ? Math.sqrt(mean(grades.map(g => (g - average!) ** 2))) : null;
  const withGroup = activities.filter(a => a.groupAverage !== null);
  const deltaGroup = withGroup.length ? mean(withGroup.map(a => scoreOf(a) - a.groupAverage!)) : null;
  const groupAverage = withGroup.length ? mean(withGroup.map(a => a.groupAverage!)) : null;

  let trend: CurrentEvidence["trend"] = null;
  if (grades.length >= 6) {
    const half = Math.floor(grades.length / 2), first = mean(grades.slice(0, half)), second = mean(grades.slice(grades.length - half));
    trend = {first, second, delta: second - first};
  }
  const types = new Map<string, number[]>();
  for (const a of activities) (types.get(a.typeName) ?? types.set(a.typeName, []).get(a.typeName)!).push(scoreOf(a));
  const byType = [...types].map(([n, v]) => ({name: n, average: mean(v), n: v.length})).sort((a, b) => b.average - a.average);

  const requiredActs = activities.filter(a => a.required);
  // Valoració de les obligatòries com al càlcul dels RA: cadascuna, o per la mitjana si l'opció està activada.
  const requiredUnits = unit ? [unit] : listUnits(course);
  const statuses = requiredUnits.map(u => requiredGroupStatus(course, group, enrollmentId, u));
  const failedRequiredIds = new Set(statuses.flatMap(s => s.failedIds));
  const requiredPassedIds = new Set(statuses.flatMap(s => s.passed === true ? s.items.map(i => i.id) : s.items.filter(i => s.mode === "individual" && i.grade !== null && i.grade >= cfg.requiredActivityMinGrade).map(i => i.id)));
  const required = {
    total: requiredActs.length,
    passed: requiredActs.filter(a => requiredPassedIds.has(a.id)).length,
    failed: requiredActs.filter(a => failedRequiredIds.has(a.id)).length,
    pending: requiredActs.filter(a => a.status === "pending").length,
  };

  const calc = calculateStudent(course, group, enrollmentId);
  const raIds = new Set(unit?.learningResultIds ?? cfg.learningResults.map(r => r.id));
  const ras: EvidenceRa[] = cfg.learningResults.filter(r => r.status === "active" && raIds.has(r.id)).map(r => {
    const e = calc.learningResults.get(r.id);
    return {code: r.code, estimated: e && e.coverage > 0 ? e.score : null, coverage: e?.coverage ?? 0, provisional: !!e?.provisional};
  }).filter(r => r.coverage > 0);

  const level = average === null ? null : diagnosticLevel(average);
  const who = givenName(name);
  const unitName = unit?.name ?? "el conjunt de les UT";
  const sentences: string[] = [], contrast: string[] = [], cautions: string[] = [];

  if (!delivered) sentences.push(`${who} no ha lliurat cap de les ${activities.length} activitats corregides de ${unitName}: totes compten amb un 0.`);
  else {
    sentences.push(delivered === activities.length ? `${who} ha lliurat totes les activitats corregides de ${unitName} (${activities.length}).` : `${who} ha lliurat ${delivered} de les ${activities.length} activitats corregides de ${unitName} (${Math.round(deliveryPct)} %)${notPresented ? `; ${notPresented} ${notPresented === 1 ? "en blanc, tard o no presentada" : "en blanc, tard o no presentades"}` : ""}.`);
    const against = deltaGroup === null ? "" : `, ${deltaGroup > 0.5 ? "per sobre de" : deltaGroup < -0.5 ? "per sota de" : "en línia amb"} la del grup (${fmt(groupAverage!)})`;
    sentences.push(`La mitjana de les activitats corregides és ${fmt(average!)}${against}.${delivered < activities.length && averageDelivered !== null ? ` Només amb les lliurades seria ${fmt(averageDelivered)}, però les no lliurades es corregeixen amb un 0 i compten.` : ""}`);
    if (byType.length >= 2 && byType[0].average - byType[byType.length - 1].average >= 1.5) sentences.push(`Rendeix millor en ${byType[0].name} (${fmt(byType[0].average)}) que en ${byType[byType.length - 1].name} (${fmt(byType[byType.length - 1].average)}).`);
    if (trend) sentences.push(Math.abs(trend.delta) < 1 ? `Dins la unitat es manté estable (${fmt(trend.first)} a les primeres activitats i ${fmt(trend.second)} a les últimes).` : `Dins la unitat ${trend.delta > 0 ? "millora" : "baixa"}: ${fmt(trend.first)} a les primeres activitats i ${fmt(trend.second)} a les últimes.`);
    if (stdev !== null && grades.length >= 4 && stdev > 2.5) sentences.push(`Els resultats són irregulars (desviació ${fmt(stdev)}): alterna notes molt altes i molt baixes.`);
  }
  if (required.total) sentences.push(required.failed ? `Exàmens obligatoris: ${required.passed} de ${required.total} superats; en té ${required.failed} per recuperar, que decideixen els RA de la unitat.` : required.passed === required.total ? `Ha superat tots els exàmens obligatoris corregits (${required.total}).` : `Exàmens obligatoris: ${required.passed} de ${required.total} superats; la resta pendent de nota.`);
  const raText = ras.filter(r => r.estimated !== null).map(r => `${r.code} ≈${fmt(r.estimated!)} (${Math.round(r.coverage)} % avaluat${r.provisional ? ", provisional" : ""})`);
  if (raText.length) sentences.push(`Nota estimada dels RA de la unitat: ${listJoin(raText)}.`);

  if (activities.length < 3) cautions.push(`Només hi ha ${activities.length} ${activities.length === 1 ? "activitat corregida" : "activitats corregides"}: les conclusions són orientatives.`);
  if (coveragePct < (cfg.minRaCoverage ?? 25)) cautions.push(`Només s'ha avaluat un ${Math.round(coveragePct)} % de la unitat: les dades encara són provisionals.`);

  // Contrast amb l'avaluació inicial i amb l'observació a l'aula.
  const unitNumber = unit?.name.match(/UT\s*(\d+)/i)?.[1];
  const initials = options.initial ?? [];
  const initial = initials.find(r => unitNumber && r.unit === Number(unitNumber)) ?? (initials.length ? initials.slice().sort((a, b) => (a.unit ?? 99) - (b.unit ?? 99))[0] : undefined);
  if (initial && level && average !== null) {
    const initialLevel = diagnosticLevel(initial.score), diff = LEVEL_INDEX[level] - LEVEL_INDEX[initialLevel];
    const label = initial.unit ? `l'avaluació inicial de la UT${initial.unit}` : "l'avaluació inicial";
    if (diff === 0) contrast.push(`El rendiment a les activitats (${fmt(average)}, nivell ${LEVEL_LABEL[level]}) és coherent amb ${label} (${fmt(initial.score)}, nivell ${LEVEL_LABEL[initialLevel]}).`);
    else if (diff > 0) contrast.push(`Supera el nivell d'entrada: ${label} va ser ${fmt(initial.score)} (nivell ${LEVEL_LABEL[initialLevel]}) i a les activitats porta ${fmt(average)} (nivell ${LEVEL_LABEL[level]}).`);
    else contrast.push(`Està per sota del nivell d'entrada: ${label} va ser ${fmt(initial.score)} (nivell ${LEVEL_LABEL[initialLevel]}) i a les activitats porta ${fmt(average)} (nivell ${LEVEL_LABEL[level]}). Convé revisar què ha canviat (constància, dificultat de les activitats o necessitat de suport).`);
    const weak = initial.blocks.filter(b => b.pct < 60).map(b => `«${b.title}»`);
    if (weak.length) contrast.push(`L'avaluació inicial va assenyalar com a punts a reforçar ${listJoin(weak)}; es poden contrastar amb les activitats d'aquests temes.`);
  }
  const obs = options.observation;
  const implication = obs?.levels.implicacio, autonomy = obs?.levels.autonomia, obsAverage = observationAverage(obs);
  if (obs && implication !== undefined && delivered < activities.length) {
    if (implication >= 3 && deliveryPct < 60) contrast.push(`L'observació a l'aula mostrava una bona implicació (${implication} de 4), però només ha lliurat el ${Math.round(deliveryPct)} % de les activitats corregides.`);
  }
  if (obs && implication !== undefined && implication <= 2 && deliveryPct >= 90 && delivered > 0) contrast.push(`Té una constància alta (${Math.round(deliveryPct)} % de lliuraments) malgrat una implicació baixa observada a l'aula (${implication} de 4).`);
  if (obs && autonomy !== undefined && average !== null) {
    if (autonomy >= 3 && average < 5) contrast.push(`L'observació a l'aula valorava bé l'autonomia (${autonomy} de 4), però el rendiment a les activitats és baix (${fmt(average)}).`);
    else if (autonomy <= 2 && average >= 7) contrast.push(`Rendeix bé a les activitats (${fmt(average)}) tot i una autonomia baixa observada a l'aula (${autonomy} de 4): pot ser que el suport rebut hi tingui un paper.`);
  }
  void obsAverage;

  const recommendations: string[] = [];
  const missing = activities.filter(a => !a.delivered).map(a => a.name), quote = (items: string[]) => listJoin(items.slice(0, 3).map(n => `«${n}»`)) + (items.length > 3 ? ` i ${items.length - 3} més` : "");
  const failedRequired = activities.filter(a => a.required && failedRequiredIds.has(a.id)).map(a => a.name);
  let potential: CurrentEvidence["potential"] = null;
  // Anàlisi capacitat (nota quan lliura) vs. constància (efecte dels 0).
  if (average !== null && averageDelivered !== null && delivered < activities.length) {
    const gap = averageDelivered - average;
    if (averageDelivered >= 7 && gap >= 1) {
      const text = `Potencial clar: quan lliura, ho fa bé (${fmt(averageDelivered)}), però ${missing.length === 1 ? "la que no ha lliurat el porta" : `les ${missing.length} sense lliurar el porten`} a ${fmt(average)}. El problema no és de capacitat sinó de constància i compromís amb els terminis: comentar-ho amb ${who}, fixar-li lliuraments intermedis i fer-ne un seguiment setmanal.`;
      potential = {text: `Quan lliura ho fa bé (${fmt(averageDelivered)}), però no lliurar part de les activitats el deixa a ${fmt(average)}: el repte és la constància, no la capacitat.`, tone: "warn"};
      recommendations.push(text); sentences.push(`Quan lliura, treu bones notes (${fmt(averageDelivered)}); el que li baixa la mitjana és el que no lliura (${fmt(average)}).`);
    } else if (averageDelivered >= 5 && gap >= 1) { potential = {text: `Quan lliura aprova (${fmt(averageDelivered)}), però les activitats sense lliurar redueixen la mitjana a ${fmt(average)}.`, tone: "warn"}; recommendations.push(`Quan lliura, aprova (${fmt(averageDelivered)}), però ${missing.length === 1 ? "la que no ha lliurat redueix" : `les ${missing.length} sense lliurar redueixen`} la mitjana a ${fmt(average)}: millorar el compliment dels terminis és la palanca més directa per pujar la nota.`); }
    else if (averageDelivered < 5) { potential = {text: `Les notes són baixes fins i tot quan lliura (${fmt(averageDelivered)}): cal reforçar la comprensió, a més de la constància.`, tone: "bad"}; recommendations.push(`Té tant problemes de constància com de comprensió (lliurades ${fmt(averageDelivered)}, corregides ${fmt(average)}): combinar un pla de lliuraments amb sessions de reforç del contingut.`); }
  } else if (average !== null && average >= 7 && delivered === activities.length) { potential = {text: `Ho lliura tot i amb bons resultats (${fmt(average)}).`, tone: "ok"}; recommendations.push(`Treballa amb constància i amb bons resultats: reforçar-ho positivament i, si cal, proposar-li reptes d'ampliació.`); }
  if (failedRequired.length) recommendations.push(`Prioritzar la recuperació de ${quote(failedRequired)}: és obligatòria i decideix els RA de la unitat.`);
  if (missing.length) recommendations.push(`Acordar amb ${who} un calendari per lliurar o refer ${quote(missing.filter(n => !failedRequired.includes(n)).length ? missing.filter(n => !failedRequired.includes(n)) : missing)}; cada activitat pendent baixa la mitjana.`);
  if (delivered > 0 && average !== null && average < 5 && missing.length < activities.length / 2) recommendations.push(`Lliura les activitats però amb resultats baixos: revisar els errors de les correccions i oferir una sessió de reforç o exercicis guiats.`);
  const weakType = byType.length >= 2 && byType[byType.length - 1].average < 5 ? byType[byType.length - 1] : null;
  if (weakType) recommendations.push(`Reforçar el que es treballa en ${weakType.name} (mitjana ${fmt(weakType.average)}).`);
  if (trend && trend.delta <= -1) recommendations.push(`Parlar amb ${who} sobre què ha canviat en les últimes activitats i detectar si necessita suport o una altra planificació.`);
  if (stdev !== null && grades.length >= 4 && stdev > 2.5 && !missing.length) recommendations.push(`Fomentar una rutina de treball regular: els resultats alternen molt entre activitats.`);
  const initialWeak = (initial?.blocks ?? []).filter(b => b.pct < 60).map(b => b.title);
  if (initialWeak.length && average !== null && average < 7) recommendations.push(`Tornar a treballar els temes que ja eren febles a l'entrada: ${quote(initialWeak)}.`);
  if (level && initial && LEVEL_INDEX[level] < LEVEL_INDEX[diagnosticLevel(initial.score)]) recommendations.push(`Fer un seguiment més proper: està per sota del nivell amb què va començar.`);
  if (!recommendations.length) recommendations.push(average !== null && average >= 8 ? `Mantenir el ritme actual i proposar activitats d'ampliació o de recolzament als companys.` : `Mantenir el seguiment actual; no es detecta cap aspecte que calgui corregir.`);

  const strengths: string[] = [];
  if (deliveryPct >= 90 && delivered > 0) strengths.push(`Lliura les activitats amb constància (${delivered} de ${activities.length}).`);
  if (averageDelivered !== null && averageDelivered >= 7) strengths.push(`Quan lliura una activitat, ho fa amb bons resultats (mitjana ${fmt(averageDelivered)}).`);
  if (byType.length >= 2 && byType[0].average >= 7) strengths.push(`Destaca en ${byType[0].name} (${fmt(byType[0].average)}).`);
  if (trend && trend.delta >= 1) strengths.push(`Millora dins la unitat: de ${fmt(trend.first)} a ${fmt(trend.second)}.`);
  if (required.total && !required.failed && required.passed === required.total) strengths.push(`Ha superat els exàmens obligatoris corregits.`);
  if (deltaGroup !== null && deltaGroup > 0.5) strengths.push(`Està per sobre de la mitjana del grup.`);
  if (obs?.levels.implicacio !== undefined && obs.levels.implicacio >= 3) strengths.push(`Mostra implicació a l'aula.`);
  if (obs?.levels.autonomia !== undefined && obs.levels.autonomia >= 3) strengths.push(`Treballa amb autonomia.`);
  const ind: EvidenceIndicator[] = [];
  const add = (name: string, value: string, how: string, reading: string, status: EvidenceIndicator["status"]) => ind.push({name, value, how, reading, status});
  add("Constància", `${delivered} de ${activities.length} (${Math.round(deliveryPct)} %)`, "Activitats corregides amb nota superior a 0 sobre el total de corregides de la UT.", deliveryPct >= 90 ? "Lliura amb regularitat." : deliveryPct >= 60 ? "Té activitats sense lliurar." : "Deixa moltes activitats sense lliurar.", deliveryPct >= 90 ? "ok" : deliveryPct >= 60 ? "warn" : "bad");
  if (average !== null) {
    add("Mitjana de les corregides", fmt(average), "Mitjana de totes les activitats corregides; un 0 o un no presentat compta com a 0.", `Nivell ${LEVEL_LABEL[diagnosticLevel(average)]}.`, average >= 7 ? "ok" : average >= 5 ? "warn" : "bad");
    if (averageDelivered !== null && delivered < activities.length) add("Mitjana de les lliurades", fmt(averageDelivered), "Mitjana només de les activitats amb nota superior a 0.", averageDelivered - average >= 1 ? "La diferència amb l'anterior és l'efecte de les no lliurades." : "Gairebé no hi ha diferència.", "neutral");
  }
  if (deltaGroup !== null && average !== null) { const groupMean = groupAverage!; add("Posició respecte al grup", `alumne ${fmt(average)} · grup ${fmt(groupMean)}`, "Mitjana de l'alumne comparada amb la mitjana de la classe en les mateixes activitats (els 0 hi compten).", deltaGroup > 0.5 ? "Per sobre del grup." : deltaGroup < -0.5 ? "Per sota del grup." : "En línia amb el grup.", deltaGroup >= -0.5 ? "ok" : deltaGroup >= -2 ? "warn" : "bad"); }
  if (trend) add("Evolució dins la UT", `${trend.delta > 0 ? "+" : ""}${fmt(trend.delta)}`, `Mitjana de les últimes activitats (${fmt(trend.second)}) menys la de les primeres (${fmt(trend.first)}).`, Math.abs(trend.delta) < 1 ? "Estable." : trend.delta > 0 ? "Millora." : "Baixa.", trend.delta >= -1 ? "ok" : trend.delta >= -2.5 ? "warn" : "bad");
  if (stdev !== null && grades.length >= 4) add("Regularitat", fmt(stdev), "Desviació estàndard de les notes: com de dispersos són els resultats.", stdev > 2.5 ? "Resultats irregulars." : "Resultats regulars.", stdev > 2.5 ? "warn" : "ok");
  if (byType.length >= 2) add("Per tipus d'activitat", `${byType[0].name} ${fmt(byType[0].average)} · ${byType[byType.length - 1].name} ${fmt(byType[byType.length - 1].average)}`, "Mitjana per tipus (millor i pitjor).", byType[0].average - byType[byType.length - 1].average >= 1.5 ? `Rendeix millor en ${byType[0].name}.` : "Rendiment similar en tots els tipus.", byType[byType.length - 1].average < 5 ? "warn" : "ok");
  if (required.total) add("Exàmens obligatoris", `${required.passed} de ${required.total}`, `Obligatòries de la UT amb nota ≥ ${cfg.requiredActivityMinGrade}.`, required.failed ? `${required.failed} per recuperar; decideixen els RA.` : "Cap per recuperar.", required.failed ? "bad" : "ok");
  add("Avaluat de la UT", `${Math.round(coveragePct)} %`, "Pes de les activitats ja corregides sobre el total de la UT.", coveragePct < (cfg.minRaCoverage ?? 25) ? "Encara hi ha poques dades: lectura provisional." : "Hi ha prou dades per a una lectura fiable.", coveragePct < (cfg.minRaCoverage ?? 25) ? "warn" : "ok");
  if (initial && level) { const il = diagnosticLevel(initial.score), d = LEVEL_INDEX[level] - LEVEL_INDEX[il]; add("Contrast amb l'entrada", `${fmt(initial.score)} → ${fmt(average!)}`, "Nota de l'avaluació inicial comparada amb la mitjana actual (per nivell).", d === 0 ? "Coherent amb el nivell d'entrada." : d > 0 ? "Per sobre del nivell d'entrada." : "Per sota del nivell d'entrada.", d >= 0 ? "ok" : "warn"); }
  if (obs && implication !== undefined) add("Implicació observada", `${implication} de 4`, "Valoració de l'observació a l'aula.", implication >= 3 && deliveryPct < 60 ? "Bona a l'aula, però no es reflecteix en els lliuraments." : implication <= 2 && deliveryPct >= 90 ? "Baixa a l'aula, però lliura amb constància." : "Coherent amb els lliuraments.", implication >= 3 && deliveryPct < 60 ? "warn" : "neutral");

  const T = TRAFFIC_RULES, reasons: string[] = [], warnings: string[] = [];
  let color: TrafficColor = "gris";
  if (activities.length >= T.minActivities && average !== null) {
    color = average >= T.greenAverage ? "verd" : average >= T.redAverage ? "groc" : "vermell";
    reasons.push(`mitjana de ${fmt(average)}`);
    if (required.failed) { color = "vermell"; reasons.push(`${required.failed} ${required.failed === 1 ? "examen obligatori" : "exàmens obligatoris"} per recuperar`); }
    if (deliveryPct < T.warnDelivery) warnings.push(`ha lliurat el ${Math.round(deliveryPct)} % de les activitats corregides`);
    if (trend && trend.delta <= T.warnTrend) warnings.push(`evolució a la baixa (${fmt(trend.delta)})`);
    if (deltaGroup !== null && deltaGroup <= T.warnGroupGap) warnings.push(`per sota del grup (${fmt(deltaGroup)})`);
  } else reasons.push("encara hi ha poques activitats corregides");
  const traffic: Traffic = {color, label: TRAFFIC_LABEL[color], reasons, warnings, provisional: coveragePct < (cfg.minRaCoverage ?? 25)};

  return {unitId: unit?.id ?? null, unitName, activities, totalInUnit: unitActivities.length, coveragePct, delivered, notPresented, zeros, deliveryPct, average, averageDelivered, median: grades.length ? median(grades) : null, stdev, groupAverage, deltaGroup, trend, byType, required, ras, level, sentences, contrast, cautions, recommendations, potential, strengths, traffic, indicators: ind};
}

export interface GroupEvidenceSummary {
  unitName: string;
  activitiesCorrected: number;
  totalInUnit: number;
  groupAverage: number | null;
  averageDelivery: number;
  /** Alumnat el nivell actual del qual és inferior / superior / igual al de l'avaluació inicial. */
  below: string[];
  above: string[];
  coherent: number;
}

/** Resum de grup del contrast: mitjana, lliurament mitjà i alumnat amb un rendiment diferent del nivell d'entrada. */
export function summarizeGroupEvidence(course: AcademicCourse, group: Group, unitId: string | null | undefined, initialByEnrollment: Map<string, DiagnosticResult[]>): GroupEvidenceSummary | null {
  const rows = group.enrollments.filter(e => e.status === "active").map(e => {
    const name = group.students.find(s => s.id === e.studentId)?.name ?? "—";
    return {name, evidence: analyzeCurrentEvidence(course, group, e.id, name, {unitId, initial: initialByEnrollment.get(e.id)}), initial: initialByEnrollment.get(e.id)?.[0]};
  }).filter((r): r is {name: string; evidence: CurrentEvidence; initial: DiagnosticResult | undefined} => !!r.evidence);
  if (!rows.length) return null;
  const averages = rows.map(r => r.evidence.average).filter((v): v is number => v !== null);
  const below: string[] = [], above: string[] = [];
  let coherent = 0;
  for (const r of rows) {
    if (!r.initial || r.evidence.level === null) continue;
    const diff = LEVEL_INDEX[r.evidence.level] - LEVEL_INDEX[diagnosticLevel(r.initial.score)];
    if (diff <= -1) below.push(r.name); else if (diff >= 1) above.push(r.name); else coherent++;
  }
  const byName = (a: string, b: string) => a.localeCompare(b, "ca");
  return {
    unitName: rows[0].evidence.unitName, activitiesCorrected: rows[0].evidence.activities.length, totalInUnit: rows[0].evidence.totalInUnit,
    groupAverage: averages.length ? mean(averages) : null, averageDelivery: mean(rows.map(r => r.evidence.deliveryPct)),
    below: below.sort(byName), above: above.sort(byName), coherent,
  };
}

export interface UnitsEvidence {
  /** Una anàlisi per UT amb alguna activitat corregida, per ordre. */
  units: CurrentEvidence[];
  /** Totes les UT juntes; només si n'hi ha més d'una. */
  cumulative: CurrentEvidence | null;
  /** Frases que comparen una UT amb l'anterior. */
  comparison: string[];
}

/** Anàlisi de cada UT amb activitats corregides, l'acumulat i la comparació entre UT consecutives. */
export function analyzeUnits(course: AcademicCourse, group: Group, enrollmentId: string, name: string, options: {initial?: DiagnosticResult[]; observation?: InitialObservation} = {}): UnitsEvidence {
  const units: CurrentEvidence[] = [];
  for (const u of listUnits(course)) {
    // L'observació a l'aula només es contrasta a la primera UT amb dades.
    const e = analyzeCurrentEvidence(course, group, enrollmentId, name, {unitId: u.id, initial: options.initial, observation: units.length ? undefined : options.observation});
    if (e) units.push(e);
  }
  if (!listUnits(course).length) { const e = analyzeCurrentEvidence(course, group, enrollmentId, name, {unitId: null, initial: options.initial, observation: options.observation}); if (e) units.push(e); }
  const cumulative = units.length > 1 ? analyzeCurrentEvidence(course, group, enrollmentId, name, {unitId: null, initial: options.initial, observation: options.observation}) : null;
  const comparison: string[] = [];
  for (let i = 1; i < units.length; i++) {
    const a = units[i - 1], b = units[i], label = `${b.unitName} respecte a ${a.unitName}`;
    if (a.average === null || b.average === null) continue;
    const d = b.average - a.average;
    comparison.push(Math.abs(d) < 0.8 ? `${label}: la mitjana es manté (${fmt(a.average)} → ${fmt(b.average)}).` : `${label}: la mitjana ${d > 0 ? "puja" : "baixa"} de ${fmt(a.average)} a ${fmt(b.average)}.`);
    const dd = b.deliveryPct - a.deliveryPct;
    if (Math.abs(dd) >= 15) comparison.push(`${dd > 0 ? "Lliura més" : "Lliura menys"}: ${Math.round(a.deliveryPct)} % → ${Math.round(b.deliveryPct)} % de les activitats.`);
    if (b.coveragePct < (course.configuration.minRaCoverage ?? 25)) comparison.push(`${b.unitName} només té un ${Math.round(b.coveragePct)} % avaluat: la comparació és provisional.`);
  }
  if (cumulative?.average != null && units.length > 1) comparison.push(`Acumulat de totes les UT: mitjana ${fmt(cumulative.average)} i ${Math.round(cumulative.deliveryPct)} % de lliuraments${cumulative.required.total ? `; exàmens obligatoris ${cumulative.required.passed} de ${cumulative.required.total}` : ""}.`);
  return {units, cumulative, comparison};
}

