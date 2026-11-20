// Noms de fitxer dels PDF per alumne (sense dependències pesades: es fa servir a la pantalla abans de generar res).


const PARTICLES = new Set(["de", "del", "la", "las", "los", "el", "els", "les", "da", "das", "do", "dos", "di", "van", "von", "der", "den", "y", "i"]);
const clean = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * «Cognom1 Cognom2, Nom Segon» → «nom.cognom1»: el primer nom i el primer cognom, sense accents ni espais ni símbols.
 * Les partícules del cognom («de la», «del»…) s'hi enganxen («de la Torre» → «delatorre»).
 */
export function studentEmailLocal(name: string): string {
  const comma = name.indexOf(",");
  let surnames: string, given: string;
  if (comma >= 0) { surnames = name.slice(0, comma); given = name.slice(comma + 1); }
  else { const tokens = name.trim().split(/\s+/); given = tokens[0] ?? ""; surnames = tokens.slice(1).join(" "); }
  const givenFirst = given.trim().split(/\s+/)[0] ?? "";
  const tokens = surnames.trim().split(/\s+/).filter(Boolean);
  const parts: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    parts.push(tokens[i]);
    if (!PARTICLES.has(tokens[i].toLowerCase().replace(/['’]$/, ""))) break;
  }
  const a = clean(givenFirst), b = clean(parts.join(""));
  return a && b ? `${a}.${b}` : clean(name) || "alumne";
}

/** Noms de fitxer .pdf únics: si dos alumnes donarien el mateix, s'hi afegeix -2, -3… */
export function uniquePdfNames(bases: string[]): string[] {
  const used = new Map<string, number>();
  return bases.map(base => {
    const stem = base.replace(/\.pdf$/i, "").trim() || "alumne";
    const count = (used.get(stem) ?? 0) + 1;
    used.set(stem, count);
    return count === 1 ? `${stem}.pdf` : `${stem}-${count}.pdf`;
  });
}

