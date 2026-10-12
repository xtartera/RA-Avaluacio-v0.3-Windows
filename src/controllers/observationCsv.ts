import type {Group, InitialObservation, ObservationFactor, ObservationKey, ObservationLevel} from "../model/domain.ts";
import {nowIso} from "../model/domain.ts";
import {OBSERVATION_FACTORS, OBSERVATION_ITEMS, hasObservation} from "../model/observation.ts";
import {matchStudent} from "./diagnosticParser.ts";

export interface ObservationCsvRow {
  name: string;
  levels: Partial<Record<ObservationKey, ObservationLevel>>;
  factors: ObservationFactor[];
  note?: string;
}

const KEYS = OBSERVATION_ITEMS.map(i => i.key);
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("ca").trim();
const FACTOR_ALIASES: Record<string, ObservationFactor> = {llengua: "llengua", oral: "oral", "expressio oral": "oral", ritme: "ritme", altres: "altres", altre: "altres"};

/** Divideix un text CSV en files de camps, respectant les cometes. */
function splitRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some(f => f.trim())) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some(f => f.trim())) rows.push(row);
  return rows;
}

/**
 * CSV d'observacions: capçalera amb «alumne» i, opcionalment, autonomia, entorn, errors, organitzacio,
 * implicacio, comunicacio (valors 1-4, buit = no observat), factors (separats per «|») i nota.
 * El separador pot ser «;» o «,». Els alumnes amb «Cognoms, Nom» han d'anar entre cometes si es fa servir «,».
 */
export function parseObservationCsv(content: string): {rows: ObservationCsvRow[]; warnings: string[]} {
  const text = content.replace(/^﻿/, "");
  const firstLine = text.split(/\r?\n/).find(l => l.trim()) ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) && firstLine.includes(";") ? ";" : ",";
  const table = splitRows(text, delimiter);
  if (!table.length) throw new Error("El fitxer és buit.");
  const header = table[0].map(fold);
  const col = (name: string) => header.indexOf(name);
  const nameCol = ["alumne", "nom", "alumnes"].map(col).find(i => i >= 0) ?? -1;
  if (nameCol < 0) throw new Error("Falta la columna «alumne» a la capçalera.");
  const itemCols = KEYS.map(k => ({key: k, index: col(k)})).filter(c => c.index >= 0);
  const factorCol = col("factors"), noteCol = col("nota");
  const warnings: string[] = [], rows: ObservationCsvRow[] = [];
  table.slice(1).forEach((cells, i) => {
    const line = i + 2, name = (cells[nameCol] ?? "").replace(/\s+/g, " ").trim();
    if (!name) return;
    const levels: ObservationCsvRow["levels"] = {};
    for (const {key, index} of itemCols) {
      const raw = (cells[index] ?? "").trim();
      if (!raw) continue;
      if (/^[1-4]$/.test(raw)) levels[key] = Number(raw) as ObservationLevel;
      else warnings.push(`Fila ${line} (${name}): el valor «${raw}» de «${key}» no és 1-4; s'ignora.`);
    }
    const factors: ObservationFactor[] = [];
    if (factorCol >= 0) for (const token of (cells[factorCol] ?? "").split(/[|/]/).map(t => fold(t)).filter(Boolean)) {
      const factor = FACTOR_ALIASES[token];
      if (factor) { if (!factors.includes(factor)) factors.push(factor); } else warnings.push(`Fila ${line} (${name}): el factor «${token}» no es reconeix; s'ignora.`);
    }
    const note = noteCol >= 0 ? (cells[noteCol] ?? "").trim() || undefined : undefined;
    rows.push({name, levels, factors, note});
  });
  if (!rows.length) throw new Error("El fitxer no conté cap alumne.");
  return {rows, warnings};
}

export interface ApplyObservationResult {
  applied: number;
  unmatched: string[];
  /** Alumnes que ja tenien observació i s'han substituït. */
  replaced: number;
}

/** Substitueix l'observació dels alumnes del grup que coincideixen amb el nom del CSV. */
export function applyObservationRows(group: Group, people: {enrollmentId: string; name: string}[], rows: ObservationCsvRow[]): ApplyObservationResult {
  const result: ApplyObservationResult = {applied: 0, unmatched: [], replaced: 0};
  for (const row of rows) {
    const match = matchStudent(people, row.name, "");
    if (!match) { result.unmatched.push(row.name); continue; }
    const observation: InitialObservation = {enrollmentId: match.enrollmentId, levels: row.levels, factors: row.factors, note: row.note, updatedAt: nowIso()};
    if (!hasObservation(observation) && !observation.factors.length && !observation.note) continue;
    const index = group.observations.findIndex(o => o.enrollmentId === match.enrollmentId);
    if (index >= 0) { group.observations[index] = observation; result.replaced++; } else group.observations.push(observation);
    result.applied++;
  }
  return result;
}

const quote = (s: string) => /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;

/** CSV amb les observacions actuals (per editar-lo en un full de càlcul i tornar-lo a importar). */
export function buildObservationCsv(people: {enrollmentId: string; name: string}[], observations: InitialObservation[]): string {
  const byId = new Map(observations.map(o => [o.enrollmentId, o]));
  const lines = [["alumne", ...KEYS, "factors", "nota"].join(";")];
  for (const p of people) {
    const o = byId.get(p.enrollmentId);
    lines.push([quote(p.name), ...KEYS.map(k => o?.levels[k] ?? ""), (o?.factors ?? []).join("|"), quote(o?.note ?? "")].join(";"));
  }
  return lines.join("\r\n") + "\r\n";
}

export const OBSERVATION_FACTOR_KEYS = OBSERVATION_FACTORS.map(f => f.key);
