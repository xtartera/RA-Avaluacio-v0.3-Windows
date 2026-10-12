import type {DiagnosticBlock, DiagnosticQuestion, DiagnosticResult} from "./domain.ts";

export type DiagnosticLevel = "alt" | "adequat" | "en-proces" | "suport";

export const LEVEL_LABEL: Record<DiagnosticLevel, string> = {
  alt: "alt",
  adequat: "adequat",
  "en-proces": "en procés",
  suport: "amb necessitat de suport",
};

/** Franges de la nota de l'avaluació inicial (0-10). */
export function diagnosticLevel(score: number): DiagnosticLevel {
  return score >= 8 ? "alt" : score >= 6 ? "adequat" : score >= 4 ? "en-proces" : "suport";
}

export type BlockStatus = "domina" | "correcte" | "reforcar" | "prioritari";

export function blockStatus(pct: number): BlockStatus {
  return pct >= 85 ? "domina" : pct >= 60 ? "correcte" : pct >= 40 ? "reforcar" : "prioritari";
}

export const unitLabel = (result: Pick<DiagnosticResult, "unit" | "title">) => (result.unit ? `UT${result.unit}` : result.title);
/** «Avaluació inicial UT1 – Windows Server i Active Directory» → «Windows Server i Active Directory». */
export const unitTopic = (title: string) => title.split(/\s[–-]\s/).slice(1).join(" – ").trim();

/** El nom de pila d'un nom amb format «Cognoms, Nom». */
export function givenName(fullName: string): string {
  const [, rest] = fullName.split(",");
  return (rest ?? fullName).replace(/\s+/g, " ").trim();
}

const pctText = (pct: number) => `${Math.round(pct)} %`;
const listJoin = (items: string[]) => items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} i ${items[items.length - 1]}`;
/** Retalla en un límit de paraula i treu la indicació de format de l'enunciat («Escriu només l'ordre.»). */
const clip = (text: string, max = 110) => {
  const plain = text.replace(/\s*Escriu només l['’]ordre\.?$/i, "").trim();
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), max / 2)).trimEnd().replace(/[,;:]$/, "") + "…";
};
const oneDecimal = (n: number) => n.toLocaleString("ca", {minimumFractionDigits: 1, maximumFractionDigits: 1});

export interface DiagnosticMiss {
  question: DiagnosticQuestion;
  /** Frase breu amb la pregunta i el que va respondre l'alumne. */
  sentence: string;
}

export interface DiagnosticConclusion {
  level: DiagnosticLevel;
  levelLabel: string;
  headline: string;
  strong: DiagnosticBlock[];
  middle: DiagnosticBlock[];
  weak: DiagnosticBlock[];
  misses: DiagnosticMiss[];
  cautions: string[];
  actions: string[];
  /** Frases breus, en el to de la diagnosi automàtica. */
  sentences: string[];
  /** Paràgraf complet, llest per afegir al comentari de l'informe. */
  text: string;
}

function describeMiss(q: DiagnosticQuestion): string {
  const what = clip(q.text);
  if (q.unknown) return `«${what}» (va respondre «No ho sé»)`;
  if (q.kind === "text") return `«${what}» (va escriure «${q.answer[0] ?? ""}»)`;
  if (!q.answer.length) return `«${what}» (sense resposta)`;
  return `«${what}» (va marcar «${clip(q.answer.join("; "), 80)}»)`;
}

/** Conclusions d'un resultat, per regles a partir de les dades (no substitueixen el criteri docent). */
export function concludeDiagnostic(result: DiagnosticResult, peers: DiagnosticResult[], name: string): DiagnosticConclusion {
  const level = diagnosticLevel(result.score);
  const who = givenName(name);
  const strong = result.blocks.filter(b => blockStatus(b.pct) === "domina");
  const middle = result.blocks.filter(b => blockStatus(b.pct) === "correcte");
  const weak = result.blocks.filter(b => ["reforcar", "prioritari"].includes(blockStatus(b.pct)));
  const names = (blocks: DiagnosticBlock[]) => listJoin(blocks.map(b => `«${b.title}» (${pctText(b.pct)})`));
  const bloc = (blocks: DiagnosticBlock[], singular: string, plural: string) => `${blocks.length === 1 ? singular : plural} ${names(blocks)}`;
  const topic = unitTopic(result.title);
  const wrong = result.questions.filter(q => !q.correct);
  const unknownCount = result.questions.filter(q => q.unknown).length;

  const sentences: string[] = [];
  const headline = `${who} ha obtingut un ${oneDecimal(result.score)} sobre 10 (${result.correct} de ${result.total} preguntes) a l'avaluació inicial de la ${unitLabel(result)}${topic ? ` (${topic})` : ""}. El nivell d'entrada és ${LEVEL_LABEL[level]}.`;
  sentences.push(headline);
  if (strong.length) sentences.push(`Mostra un bon domini ${bloc(strong, "del bloc", "dels blocs")}.`);
  if (middle.length) sentences.push(`Té un nivell correcte, amb alguna errada, ${bloc(middle, "al bloc", "als blocs")}.`);
  if (weak.length) sentences.push(`Cal reforçar ${bloc(weak, "el bloc", "els blocs")}.`);

  const reference = peers.filter(p => p.id !== result.id && p.activityId === result.activityId);
  if (reference.length >= 3) {
    const avg = reference.reduce((s, p) => s + p.score, 0) / reference.length;
    const diff = result.score - avg;
    sentences.push(Math.abs(diff) < 0.75 ? `El resultat és semblant a la mitjana del grup (${oneDecimal(avg)}).` : diff > 0 ? `El resultat és superior a la mitjana del grup (${oneDecimal(avg)}).` : `El resultat és inferior a la mitjana del grup (${oneDecimal(avg)}).`);
  }

  // Errades concretes: prioritzem les dels blocs a reforçar.
  const weakNumbers = new Set(weak.map(b => b.number));
  const ordered = [...wrong].sort((a, b) => Number(weakNumbers.has(b.block)) - Number(weakNumbers.has(a.block)) || a.number - b.number);
  const misses = ordered.map(question => ({question, sentence: describeMiss(question)}));
  if (misses.length) sentences.push(`Errades concretes: ${misses.slice(0, 4).map(m => m.sentence).join("; ")}.`);

  if (unknownCount) sentences.push(`Ha reconegut que no sabia respondre ${unknownCount === 1 ? "1 pregunta" : `${unknownCount} preguntes`} (no ho sé).`);
  else if (wrong.length) sentences.push("No ha fet servir l'opció «No ho sé»: ha contestat totes les preguntes, també les errades, i això pot indicar idees errònies més que desconeixement.");

  const cautions: string[] = [];
  if (result.activeMinutes !== null && result.activeMinutes > 0 && result.total) {
    const seconds = result.activeMinutes * 60 / result.total;
    if (seconds < 15) cautions.push(`Ritme molt ràpid: ${result.activeMinutes} min d'activitat registrada per a ${result.total} preguntes (uns ${Math.round(seconds)} s per pregunta). Interpreta el resultat amb precaució.`);
  }
  if (result.deliveryNumber && result.deliveryNumber > 1) cautions.push(`És el lliurament núm. ${result.deliveryNumber} d'aquest alumne.`);
  for (const warning of result.warnings) cautions.push(warning);

  const actions: string[] = [];
  if (weak.length === 1) actions.push(`Reforçar «${weak[0].title}» en començar la ${unitLabel(result)}.`);
  else if (weak.length > 1) actions.push(`Reforçar els blocs ${listJoin(weak.map(b => `«${b.title}»`))} en començar la ${unitLabel(result)}.`);
  if (misses.length && !weak.length) actions.push("Repassar amb l'alumne les errades concretes de l'avaluació inicial.");
  if (!wrong.length) actions.push("Oferir activitats d'ampliació: el resultat inicial és excel·lent.");

  return {level, levelLabel: LEVEL_LABEL[level], headline, strong, middle, weak, misses, cautions, actions, sentences, text: sentences.join(" ")};
}

export interface GroupBlockSummary {number: number; title: string; averagePct: number}
export interface GroupQuestionSummary {
  question: DiagnosticQuestion;
  answered: number;
  failPct: number;
  /** Resposta incorrecta més repetida (només amb 2 o més coincidències). */
  commonWrong: {answer: string; count: number} | null;
}
export interface GroupDiagnosticSummary {
  count: number;
  averageScore: number;
  levels: Record<DiagnosticLevel, number>;
  blocks: GroupBlockSummary[];
  hardest: GroupQuestionSummary[];
  unknownPct: number;
}

/** Resum del grup d'un mateix qüestionari: blocs més febles i preguntes més fallades. */
export function summarizeGroupDiagnostic(results: DiagnosticResult[]): GroupDiagnosticSummary {
  const levels: Record<DiagnosticLevel, number> = {alt: 0, adequat: 0, "en-proces": 0, suport: 0};
  for (const r of results) levels[diagnosticLevel(r.score)]++;
  const blockMap = new Map<number, {title: string; sum: number; n: number}>();
  for (const r of results) for (const b of r.blocks) {
    const entry = blockMap.get(b.number) ?? {title: b.title, sum: 0, n: 0};
    entry.sum += b.pct; entry.n++; blockMap.set(b.number, entry);
  }
  const byNumber = new Map<number, DiagnosticQuestion[]>();
  for (const r of results) for (const q of r.questions) (byNumber.get(q.number) ?? byNumber.set(q.number, []).get(q.number)!).push(q);
  const questions: GroupQuestionSummary[] = [...byNumber.values()].map(list => {
    const failed = list.filter(q => !q.correct);
    const tally = new Map<string, number>();
    for (const q of failed) if (!q.unknown && q.answer.length) { const key = q.answer.join("; "); tally.set(key, (tally.get(key) ?? 0) + 1); }
    const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
    return {question: list[0], answered: list.length, failPct: failed.length / list.length * 100, commonWrong: top && top[1] >= 2 ? {answer: top[0], count: top[1]} : null};
  }).sort((a, b) => b.failPct - a.failPct || a.question.number - b.question.number);
  const total = results.reduce((s, r) => s + r.total, 0);
  const unknown = results.reduce((s, r) => s + r.questions.filter(q => q.unknown).length, 0);
  return {
    count: results.length,
    averageScore: results.length ? results.reduce((s, r) => s + r.score, 0) / results.length : 0,
    levels,
    blocks: [...blockMap.entries()].sort((a, b) => a[0] - b[0]).map(([number, e]) => ({number, title: e.title, averagePct: e.sum / e.n})),
    hardest: questions.filter(q => q.failPct >= 40).slice(0, 5),
    unknownPct: total ? unknown / total * 100 : 0,
  };
}

export interface EvolutionRow {
  result: DiagnosticResult;
  label: string;
  level: DiagnosticLevel;
  strongest: DiagnosticBlock | null;
  weakest: DiagnosticBlock | null;
}

export interface DiagnosticEvolution {
  rows: EvolutionRow[];
  /** Diferència de nota entre l'última i la primera avaluació inicial (null si només n'hi ha una). */
  delta: number | null;
  sentences: string[];
  text: string;
}

/** Ordena les avaluacions inicials d'un alumne per UT i, a igualtat, per data de lliurament. */
export const orderByUnit = (results: DiagnosticResult[]) =>
  [...results].sort((a, b) => (a.unit ?? 99) - (b.unit ?? 99) || (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""));

/**
 * Resum comparatiu de les avaluacions inicials d'un alumne (UT1, UT2…): descriu les dades,
 * no jutja. Les UT tenen blocs diferents, per això es compara la nota global i el nivell, i
 * els blocs fort i feble es llegeixen dins de cada UT.
 */
export function compareDiagnostics(results: DiagnosticResult[], name: string, pending: string[] = []): DiagnosticEvolution {
  const rows = orderByUnit(results).map(result => {
    const sorted = [...result.blocks].sort((a, b) => b.pct - a.pct || a.number - b.number);
    return {result, label: unitLabel(result), level: diagnosticLevel(result.score), strongest: sorted[0] ?? null, weakest: sorted.length > 1 ? sorted[sorted.length - 1] : null} satisfies EvolutionRow;
  });
  const who = givenName(name), sentences: string[] = [];
  const first = rows[0], last = rows[rows.length - 1];
  const delta = rows.length > 1 ? last.result.score - first.result.score : null;
  if (rows.length === 1) sentences.push(`${who} té l'avaluació inicial de la ${first.label} (${oneDecimal(first.result.score)} sobre 10, nivell ${LEVEL_LABEL[first.level]}).`);
  else if (rows.length > 1 && delta !== null) {
    const parts = rows.map(r => `${oneDecimal(r.result.score)} a la ${r.label}`);
    const trend = Math.abs(delta) < 0.5 ? "es manté estable" : delta > 0 ? `millora ${oneDecimal(delta)} punts` : `baixa ${oneDecimal(-delta)} punts`;
    sentences.push(`${who} ha obtingut ${listJoin(parts)}: ${trend} entre la ${first.label} i la ${last.label}.`);
    if (first.level !== last.level) sentences.push(`El nivell d'entrada passa de ${LEVEL_LABEL[first.level]} a ${LEVEL_LABEL[last.level]}.`);
  }
  for (const r of rows) {
    const bits: string[] = [];
    if (r.strongest && r.strongest.pct >= 60) bits.push(`punt fort «${r.strongest.title}» (${pctText(r.strongest.pct)})`);
    if (r.weakest && r.weakest.pct < 60) bits.push(`a reforçar «${r.weakest.title}» (${pctText(r.weakest.pct)})`);
    if (bits.length) sentences.push(`${r.label}: ${bits.join(", ")}.`);
  }
  const cautions = rows.flatMap(r => concludeDiagnostic(r.result, [], name).cautions.filter(c => /ritme/i.test(c)).map(c => `${r.label}: ${c}`));
  sentences.push(...cautions);
  if (pending.length) sentences.push(`Pendent d'importar: ${listJoin(pending)}.`);
  return {rows, delta, sentences, text: sentences.join(" ")};
}
