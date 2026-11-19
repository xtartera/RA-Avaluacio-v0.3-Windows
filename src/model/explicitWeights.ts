import type {AcademicCourse} from "./domain.ts";

const EPS = 0.0005;
const pct = (v: number) => `${(v * 100).toLocaleString("ca", {maximumFractionDigits: 2})} %`;

/** Part del mòdul (0..1) que encara no està repartida entre els RA (per exemple, un RA que s'afegirà més endavant); 0 si els RA ja sumen el 100 %. */
export function explicitWeightGap(course: AcademicCourse): number {
  const cfg = course.configuration;
  if (cfg.weightMode !== "explicit") return 0;
  const total = cfg.learningResults.filter(r => r.status === "active").reduce((s, r) => s + (r.moduleWeight ?? 0), 0);
  return total < 1 - EPS ? 1 - total : 0;
}

/**
 * Avisos de coherència del mode de pesos explícits: els RA no poden passar del 100 % del mòdul, les activitats de cada RA el 100 % de l'RA,
 * i cada activitat amb part d'un RA hauria d'estar vinculada a algun criteri d'aquell RA (si no, el seu pes no arriba a la nota).
 * Retorna una llista buida si tot quadra o el curs no usa aquest mode.
 */
export function explicitWeightIssues(course: AcademicCourse): string[] {
  const cfg = course.configuration;
  if (cfg.weightMode !== "explicit") return [];
  const issues: string[] = [];
  const ras = cfg.learningResults.filter(r => r.status === "active").sort((a, b) => a.order - b.order);
  const total = ras.reduce((s, r) => s + (r.moduleWeight ?? 0), 0);
  // Per sota del 100 % és vàlid (falta algun RA que s'afegirà després, com l'empresa); per sobre no té sentit.
  if (total > 1 + EPS) issues.push(`Els pesos dels RA al mòdul sumen ${pct(total)} i no poden passar del 100 %.`);
  const activities = cfg.activities.filter(a => a.status === "active" && a.session === "ordinaria");
  for (const ra of ras) {
    const shares = activities.map(a => ({a, share: a.raShares?.find(s => s.raId === ra.id)?.share ?? 0})).filter(x => x.share > 0);
    const sum = shares.reduce((s, x) => s + x.share, 0);
    if (!shares.length) { if ((ra.moduleWeight ?? 0) > 0) issues.push(`${ra.code} té pes al mòdul però cap activitat amb part dins l'RA.`); continue; }
    if (Math.abs(sum - 1) > EPS) issues.push(`Les activitats de ${ra.code} sumen ${pct(sum)} de l'RA i haurien de sumar 100 %.`);
    const criteria = new Set(cfg.criteria.filter(c => c.status === "active" && c.learningResultId === ra.id).map(c => c.id));
    for (const x of shares) if (!cfg.links.some(l => l.activityId === x.a.id && criteria.has(l.criterionId))) issues.push(`${x.a.name} té part de ${ra.code} però no està vinculada a cap criteri d'aquest RA.`);
  }
  const raWeight = new Map(ras.map(r => [r.id, r.moduleWeight ?? 0]));
  for (const a of activities) {
    const parts = (a.raShares ?? []).filter(s => s.share > 0);
    if (parts.length < 2) continue;
    // Una activitat amb part de diversos RA ha de repartir el seu pes entre els criteris de cada RA en la mateixa proporció que el pes que hi aporta.
    const total = parts.reduce((s, x) => s + (raWeight.get(x.raId) ?? 0) * x.share, 0);
    const ok = total > 0 && parts.every(x => {
      const raCriteria = new Set(cfg.criteria.filter(c => c.learningResultId === x.raId).map(c => c.id));
      const allocated = cfg.links.filter(l => l.activityId === a.id && raCriteria.has(l.criterionId)).reduce((s, l) => s + l.allocation, 0);
      return Math.abs(allocated - (raWeight.get(x.raId) ?? 0) * x.share / total) <= EPS;
    });
    if (!ok) issues.push(`${a.name} té part de més d'un RA: el repartiment entre criteris (vincles) ha de seguir la mateixa proporció.`);
  }
  return issues;
}
