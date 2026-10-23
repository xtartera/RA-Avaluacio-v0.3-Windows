import type {InitialObservation, ObservationFactor, ObservationKey, ObservationLevel} from "./domain.ts";
import {givenName} from "./diagnostic.ts";

export interface ObservationItem {
  key: ObservationKey;
  label: string;
  /** Què s'observa (descripció per al professorat). */
  hint: string;
  /** Ancoratges dels extrems de l'escala. */
  low: string;
  high: string;
}

/** Ítems de l'observació a l'aula. Descriuen què fa l'alumne amb la tasca, pel canal que sigui. */
export const OBSERVATION_ITEMS: ObservationItem[] = [
  {key: "autonomia", label: "Autonomia", hint: "Avança per ell mateix davant d'un enunciat o demana ajuda només quan cal.", low: "Necessita ajuda a cada pas", high: "Resol sol i només consulta el que cal"},
  {key: "entorn", label: "Maneig de l'entorn", hint: "Màquines virtuals, terminal, finestres i fitxers.", low: "Es perd amb les eines bàsiques", high: "Es mou amb soltesa i sense errors d'entorn"},
  {key: "errors", label: "Resolució d'errors", hint: "Què fa quan alguna cosa falla: llegeix el missatge, prova, busca.", low: "Es bloqueja o avisa de seguida", high: "Llegeix el missatge, busca i prova hipòtesis"},
  {key: "organitzacio", label: "Organització del treball", hint: "Ordre, material, ritme i si deixa constància del que fa.", low: "Desordenat; perd el fil", high: "Planifica i documenta el que fa"},
  {key: "implicacio", label: "Implicació en la tasca", hint: "Es posa a treballar, hi persisteix i col·labora amb els companys, sense importar si parla o no.", low: "Poca dedicació o no col·labora", high: "Treballa amb constància i col·labora de manera constructiva"},
  {key: "comunicacio", label: "Comunicació tècnica", hint: "Fa entendre què ha fet: oral, escrit, amb esquemes o ensenyant-ho a la màquina.", low: "No aconsegueix fer entendre què ha fet", high: "Ho explica amb claredat, pel canal que triï"},
];

export const OBSERVATION_LEVEL_LABEL: Record<ObservationLevel, string> = {1: "inicial", 2: "en procés", 3: "adequat", 4: "excel·lent"};
export const OBSERVATION_LEVEL_HINT: Record<ObservationLevel, string> = {1: "Inicial: necessita molt suport", 2: "En procés: ho fa amb ajuda freqüent", 3: "Adequat: ho fa amb poca ajuda", 4: "Excel·lent: ho fa amb autonomia i solidesa"};

export const OBSERVATION_FACTORS: {key: ObservationFactor; label: string; hint: string}[] = [
  {key: "llengua", label: "Llengua", hint: "Nouvingut o en procés d'aprenentatge de la llengua"},
  {key: "oral", label: "Expressió oral", hint: "Expressió oral inhibida"},
  {key: "ritme", label: "Ritme", hint: "Ritme o forma de treballar diferent"},
  {key: "altres", label: "Altres", hint: "Altres circumstàncies que cal tenir en compte"},
];

/** Equivalència amb la gradació 1-4-7-10 de les rúbriques. */
export const levelToTen = (level: ObservationLevel): number => ({1: 1, 2: 4, 3: 7, 4: 10} as const)[level];

const KEYS = OBSERVATION_ITEMS.map(i => i.key);
const labelOf = (key: ObservationKey) => OBSERVATION_ITEMS.find(i => i.key === key)!.label;
const listJoin = (items: string[]) => items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} i ${items[items.length - 1]}`;

export const observedKeys = (obs: Pick<InitialObservation, "levels"> | undefined) => KEYS.filter(k => obs?.levels[k] !== undefined);
export const hasObservation = (obs: Pick<InitialObservation, "levels"> | undefined) => observedKeys(obs).length > 0;

/** Mitjana (1-4) dels ítems observats; null si no n'hi ha cap. */
export function observationAverage(obs: Pick<InitialObservation, "levels"> | undefined): number | null {
  const keys = observedKeys(obs);
  return keys.length ? keys.reduce((s, k) => s + obs!.levels[k]!, 0) / keys.length : null;
}

export interface ObservationConclusion {
  sentences: string[];
  /** Avís genèric (sense explicar el motiu) quan hi ha factors de context. */
  caution: string | null;
  observed: number;
  total: number;
}

/**
 * Frases de l'observació, per regles. Quan hi ha factors de llengua o d'expressió oral, la
 * comunicació tècnica no es comenta com un punt a reforçar. Els factors mai no es mostren.
 */
export function concludeObservation(obs: InitialObservation | undefined, name: string): ObservationConclusion {
  const keys = observedKeys(obs), total = KEYS.length;
  if (!obs || !keys.length) return {sentences: [], caution: null, observed: 0, total};
  const who = givenName(name);
  const languageContext = obs.factors.includes("llengua") || obs.factors.includes("oral");
  const labels = (list: ObservationKey[]) => listJoin(list.map(k => labelOf(k).toLocaleLowerCase("ca")));
  const strong = keys.filter(k => obs.levels[k] === 4);
  const adequate = keys.filter(k => obs.levels[k] === 3);
  const weakAll = keys.filter(k => obs.levels[k]! <= 2);
  const skipped: ObservationKey[] = languageContext ? weakAll.filter(k => k === "comunicacio") : [];
  const weak = weakAll.filter(k => !skipped.includes(k));
  const sentences: string[] = [];
  if (strong.length) sentences.push(`A l'observació a l'aula, ${who} destaca en ${labels(strong)}.`);
  if (adequate.length) sentences.push(`${strong.length ? "Mostra" : `A l'observació a l'aula, ${who} mostra`} un nivell adequat en ${labels(adequate)}.`);
  if (weak.length) sentences.push(`Cal acompanyar ${labels(weak)}.`);
  if (skipped.length) sentences.push("La comunicació tècnica es valora tenint en compte el context de l'alumne.");
  if (!strong.length && !adequate.length && !weak.length && !skipped.length) sentences.push(`${who} té una observació a l'aula pendent de completar.`);
  const missing = KEYS.filter(k => !keys.includes(k));
  if (missing.length) sentences.push(`Sense observar: ${labels(missing)}.`);
  return {sentences, caution: obs.factors.length ? "Aquesta observació s'ha d'interpretar tenint en compte el context de l'alumne." : null, observed: keys.length, total};
}

export interface GroupObservationSummary {
  count: number;
  total: number;
  /** Mitjana per ítem (1-4) entre els alumnes que en tenen valoració. */
  items: {key: ObservationKey; label: string; average: number | null; observed: number}[];
}

export function summarizeGroupObservation(observations: InitialObservation[], totalStudents: number): GroupObservationSummary {
  const withData = observations.filter(hasObservation);
  return {
    count: withData.length,
    total: totalStudents,
    items: OBSERVATION_ITEMS.map(item => {
      const values = withData.map(o => o.levels[item.key]).filter((v): v is ObservationLevel => v !== undefined);
      return {key: item.key, label: item.label, average: values.length ? values.reduce((s, v) => s + v, 0) / values.length : null, observed: values.length};
    }),
  };
}

const SUPPORT_ACTIONS: Record<ObservationFactor, string[]> = {
  llengua: ["Donar les instruccions per escrit, en frases curtes i amb exemples.", "Facilitar un glossari dels termes tècnics de la unitat.", "Comprovar que entén l'enunciat abans de valorar la resposta."],
  oral: ["Oferir alternatives a l'exposició davant la classe (per escrit o en petit grup).", "Valorar la participació per altres vies que no siguin la intervenció oral."],
  ritme: ["Fragmentar les activitats en passos i fixar lliuraments intermedis.", "Donar més temps o una seqüència de tasques adaptada, sense abaixar els objectius."],
  altres: ["Concretar amb el tutor o tutora quines adaptacions calen i anotar-les als acords."],
};

/**
 * Orientacions d'acompanyament a partir dels factors de context marcats. Són genèriques i no anomenen el factor:
 * el context no s'ha d'imprimir mai com a etiqueta de l'alumne.
 */
export function supportActions(observation: InitialObservation | undefined): string[] {
  const seen = new Set<string>(), out: string[] = [];
  for (const factor of observation?.factors ?? []) for (const action of SUPPORT_ACTIONS[factor] ?? []) if (!seen.has(action)) { seen.add(action); out.push(action); }
  return out;
}
