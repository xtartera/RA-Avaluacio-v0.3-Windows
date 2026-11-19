import {activityShareInRa, activityWeights, raWeights} from "./calculation.ts";
import {explicitWeightGap} from "./explicitWeights.ts";
import {countsForGrade, type AcademicCourse, type Activity} from "./domain.ts";

/**
 * Document «Com es calculen les notes» adaptat al mòdul: el mode de pesos (per tipus d'activitat o explícit per RA), la mitjana dels RA,
 * els mínims de les obligatòries, el llindar d'arrodoniment, les UT i les activitats són les del curs, no d'un mòdul concret.
 * Retorna Markdown (amb alguns diagrames SVG). El peu «---» separa el cos de la nota final.
 */

const n = (v: number, d = 2) => v.toLocaleString("ca", {minimumFractionDigits: 0, maximumFractionDigits: d});
const p = (v: number, d = 2) => `${n(v * 100, d)} %`;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const list = (items: string[]) => items.length ? items.join(", ") : "—";

interface Node {title: string; l1: string; l2?: string; kind: "blue" | "purple"}

/** Cascada de 4 quadres + resultat: cada quadre amb el seu títol i el seu pes. */
function cascadeSvg(id: string, nodes: Node[], labels: string[]): string {
  const xs = [10, 224, 438, 652], w = [170, 170, 170, 160];
  const box = (x: number, wd: number, nd: Node) => {
    const stroke = nd.kind === "blue" ? "#3975e8" : "#795fd7", fill = nd.kind === "blue" ? "#eef2fb" : "#f3effc";
    return `<rect x="${x}" y="70" width="${wd}" height="70" rx="12" fill="${fill}" stroke="${stroke}"/>
<text x="${x + wd / 2}" y="94" text-anchor="middle" font-size="12.5" fill="#17233c" font-weight="700">${esc(nd.title)}</text>
<text x="${x + wd / 2}" y="112" text-anchor="middle" font-size="12" fill="${stroke}" font-weight="700">${esc(nd.l1)}</text>${nd.l2 ? `
<text x="${x + wd / 2}" y="128" text-anchor="middle" font-size="10" fill="#8390a3">${esc(nd.l2)}</text>` : ""}`;
  };
  const arrow = (x1: number, x2: number, label: string) => `<line x1="${x1}" y1="105" x2="${x2}" y2="105" stroke="#8390a3" stroke-width="2" marker-end="url(#${id})"/>
<text x="${(x1 + x2) / 2}" y="96" text-anchor="middle" font-size="10.5" fill="#7d899d">${esc(label)}</text>`;
  return `<svg viewBox="0 0 1000 220" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:Inter,system-ui,sans-serif">
<defs><marker id="${id}" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#8390a3"/></marker></defs>
${nodes.map((nd, i) => box(xs[i], w[i], nd)).join("\n")}
${arrow(180, 222, labels[0])}
${arrow(394, 436, labels[1])}
${arrow(608, 650, labels[2])}
${arrow(812, 854, labels[3])}
<rect x="856" y="60" width="134" height="90" rx="12" fill="#101c35"/>
<text x="923" y="96" text-anchor="middle" font-size="12" fill="#fff" font-weight="700">Nota global</text>
<text x="923" y="114" text-anchor="middle" font-size="12" fill="#fff" font-weight="700">del mòdul</text>
</svg>`;
}

function hierarchySvg(course: AcademicCourse): string {
  const explicit = course.configuration.weightMode === "explicit";
  const groups = course.groups.map(g => `Grup ${g.code}`).join(" · ") || "Grups";
  return `<svg viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:Inter,system-ui,sans-serif">
<defs><marker id="ahA" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#7d899d"/></marker></defs>
<rect x="330" y="10" width="240" height="46" rx="10" fill="#101c35"/>
<text x="450" y="38" text-anchor="middle" fill="#fff" font-size="15" font-weight="700">Curs acadèmic ${esc(course.academicYear)}</text>
<line x1="450" y1="56" x2="450" y2="80" stroke="#7d899d" stroke-width="2"/>
<line x1="220" y1="80" x2="680" y2="80" stroke="#7d899d" stroke-width="2"/>
<line x1="220" y1="80" x2="220" y2="100" stroke="#7d899d" stroke-width="2" marker-end="url(#ahA)"/>
<line x1="680" y1="80" x2="680" y2="100" stroke="#7d899d" stroke-width="2" marker-end="url(#ahA)"/>
<rect x="90" y="100" width="260" height="46" rx="10" fill="#3975e8"/>
<text x="220" y="128" text-anchor="middle" fill="#fff" font-size="14" font-weight="700">Configuració comuna</text>
<rect x="550" y="100" width="260" height="46" rx="10" fill="#795fd7"/>
<text x="680" y="128" text-anchor="middle" fill="#fff" font-size="14" font-weight="700">${esc(groups)}</text>
<line x1="150" y1="146" x2="150" y2="170" stroke="#c8d3e6" stroke-width="2" marker-end="url(#ahA)"/>
<line x1="290" y1="146" x2="290" y2="170" stroke="#c8d3e6" stroke-width="2" marker-end="url(#ahA)"/>
<line x1="610" y1="146" x2="610" y2="170" stroke="#c8d3e6" stroke-width="2" marker-end="url(#ahA)"/>
<line x1="750" y1="146" x2="750" y2="170" stroke="#c8d3e6" stroke-width="2" marker-end="url(#ahA)"/>
<rect x="40" y="170" width="220" height="40" rx="9" fill="#fff" stroke="#e4eaf2"/>
<text x="150" y="194" text-anchor="middle" fill="#17233c" font-size="12.5">RA → CA</text>
<rect x="180" y="222" width="220" height="40" rx="9" fill="#fff" stroke="#e4eaf2"/>
<text x="290" y="246" text-anchor="middle" fill="#17233c" font-size="12.5">${explicit ? "Activitats → part de l'RA → CA" : "Tipus → Activitats → CA (%)"}</text>
<rect x="500" y="170" width="220" height="40" rx="9" fill="#fff" stroke="#e4eaf2"/>
<text x="610" y="194" text-anchor="middle" fill="#17233c" font-size="12.5">Alumnes i matrícules</text>
<rect x="640" y="222" width="220" height="40" rx="9" fill="#fff" stroke="#e4eaf2"/>
<text x="750" y="246" text-anchor="middle" fill="#17233c" font-size="12.5">Notes per activitat</text>
</svg>`;
}

/** Activitat d'exemple de la cascada: la d'un tipus amb moltes activitats (mode per tipus) o la primera activitat amb pes (mode explícit). */
function exampleActivity(course: AcademicCourse): Activity | undefined {
  const cfg = course.configuration, weights = activityWeights(course);
  const ordinary = cfg.activities.filter(a => a.status === "active" && a.session === "ordinaria" && countsForGrade(a) && (weights.get(a.id) ?? 0) > 0 && cfg.links.some(l => l.activityId === a.id));
  if (cfg.weightMode === "explicit") return ordinary.find(a => (a.raShares?.length ?? 0) === 1) ?? ordinary[0];
  const count = (a: Activity) => ordinary.filter(b => b.activityTypeId === a.activityTypeId).length;
  return ordinary.slice().sort((a, b) => count(b) - count(a) || a.order - b.order)[0];
}

function cascade(course: AcademicCourse): string {
  const cfg = course.configuration, weights = activityWeights(course), rw = raWeights(course);
  const act = exampleActivity(course);
  if (!act) return "*(Quan hi hagi activitats amb criteris i pes configurats, aquí es dibuixarà un exemple amb els números reals del mòdul.)*";
  const w = weights.get(act.id) ?? 0, link = cfg.links.find(l => l.activityId === act.id)!;
  const ca = cfg.criteria.find(c => c.id === link.criterionId)!, ra = cfg.learningResults.find(r => r.id === ca.learningResultId)!;
  const gross = link.allocation * w;
  if (cfg.weightMode === "explicit") {
    const share = act.raShares?.find(s => s.raId === ra.id)?.share ?? 0, raLinks = cfg.links.filter(l => l.activityId === act.id && cfg.criteria.some(c => c.id === l.criterionId && c.learningResultId === ra.id)).length;
    return cascadeSvg("ahB", [
      {title: ra.code, l1: `pes al mòdul ${p(ra.moduleWeight ?? 0, 1)}`, kind: "blue"},
      {title: act.name, l1: `${p(share, 0)} de l'${ra.code}`, l2: `pes activitat ${p(w)}`, kind: "blue"},
      {title: `CA ${ca.code}`, l1: `pes brut ${p(gross)}`, l2: `(repartit entre ${raLinks} CA)`, kind: "purple"},
      {title: ra.code, l1: `pes global ${p(rw.get(ra.id) ?? 0, 1)}`, kind: "purple"},
    ], [`× ${p(share, 0)}`, `÷ ${raLinks} CA`, "Σ CA del RA", "× cobertura"]);
  }
  const type = cfg.activityTypes.find(t => t.id === act.activityTypeId)!, members = cfg.activities.filter(a => a.status === "active" && a.session === "ordinaria" && a.activityTypeId === act.activityTypeId).length;
  return cascadeSvg("ahB", [
    {title: `Tipus ${type.name}`, l1: `pes ${p(type.weight, 0)}`, kind: "blue"},
    {title: act.name, l1: `pes activitat ${p(w)}`, l2: `(${p(type.weight, 0)} / ${members})`, kind: "blue"},
    {title: `CA ${ca.code}`, l1: `pes brut ${p(gross)}`, l2: `(${p(w)} × ${p(link.allocation, 0)})`, kind: "purple"},
    {title: ra.code, l1: `pes global ${p(rw.get(ra.id) ?? 0, 1)}`, kind: "purple"},
  ], [`÷ ${members}`, `× ${p(link.allocation, 0)}`, "Σ CA del RA", "× cobertura"]);
}

/** Taula i comentaris sobre com pesen els diferents tipus d'activitat. */
function weightsComparison(course: AcademicCourse): string {
  const cfg = course.configuration, ras = cfg.learningResults.filter(r => r.status === "active").sort((a, b) => a.order - b.order);
  const acts = cfg.activities.filter(a => a.status === "active" && a.session === "ordinaria" && countsForGrade(a));
  if (cfg.weightMode === "explicit") {
    const rows = ras.map(ra => {
      const shares = activityShareInRa(course, ra.id);
      const parts = [...shares].filter(([, s]) => s > 0).map(([id, s]) => ({a: acts.find(x => x.id === id), s})).filter((x): x is {a: Activity; s: number} => !!x.a).sort((x, y) => y.s - x.s);
      return `| ${ra.code} | ${p(ra.moduleWeight ?? 0, 1)} | ${parts.map(x => `${x.a.name} ${p(x.s, 0)}`).join(" · ") || "—"} |`;
    });
    const multi = acts.filter(a => (a.raShares ?? []).filter(s => s.share > 0).length > 1);
    const best = ras.flatMap(ra => [...activityShareInRa(course, ra.id)].map(([id, s]) => ({ra, a: acts.find(x => x.id === id), s}))).filter(x => x.a).sort((x, y) => y.s - x.s)[0];
    const lines = [
      "En aquest mòdul el pes de cada RA al mòdul el fixa la programació, i dins de cada RA les activitats es reparteixen el 100 % de l'RA. La fórmula és la mateixa per a totes les activitats: el seu pes al mòdul és **pes de l'RA × part de l'activitat dins l'RA**, i després es reparteix entre els criteris (CA) que treballa.",
      "", "| RA | Pes al mòdul | Part de cada activitat dins l'RA |", "|---|---|---|", ...rows, "",
      ...(multi.length ? [`Una activitat pot comptar en **més d'un RA** alhora: ${multi.map(a => `**${a.name}** té part de ${(a.raShares ?? []).filter(s => s.share > 0).map(s => cfg.learningResults.find(r => r.id === s.raId)?.code).join(", ")}`).join("; ")}. El seu pes es reparteix entre els criteris de cada RA en proporció al pes que té aquell RA al mòdul.`, ""] : []),
      ...(best ? [`Les activitats amb més part dins d'un RA són les que més en decideixen la nota: per exemple, **${best.a!.name}** és el ${p(best.s, 0)} de l'${best.ra.code}. Si a més és **obligatòria** dins d'una UT, també pot bloquejar l'RA com a «No assolit» independentment de la mitjana (vegeu la secció 6).`, ""] : []),
    ];
    return lines.join("\n");
  }
  const types = cfg.activityTypes.filter(t => t.status === "active");
  const rows = types.map(t => { const k = acts.filter(a => a.activityTypeId === t.id).length; return {t, k, each: k ? t.weight / k : 0}; });
  const table = ["| Tipus d'activitat | Pes del tipus | Nre. d'activitats d'aquest tipus | Pes de cada activitat |", "|---|---|---|---|",
    ...rows.map(r => `| ${r.t.name} | ${p(r.t.weight, 0)} | ${r.k} | ${r.k ? `${p(r.t.weight, 0)} ÷ ${r.k} ≈ **${p(r.each)}**` : "—"} |`)];
  const live = rows.filter(r => r.k > 0 && r.each > 0).sort((a, b) => b.each - a.each);
  const lines = ["La fórmula `pesActivitat = pesTipus / nombreActivitatsDelTipus` és la mateixa per a **qualsevol** tipus: el que canvia és **entre quantes activitats es reparteix** el pes del tipus. Els tipus d'aquest mòdul:", "", ...table, ""];
  if (live.length >= 2) lines.push(`Per això una sola activitat de **${live[0].t.name}** (${p(live[0].each)}) pesa ${n(live[0].each / live[live.length - 1].each, 1)} vegades el que pesa una de **${live[live.length - 1].t.name}** (${p(live[live.length - 1].each)}): suspendre-la té molt més impacte en la nota del CA/RA. Si a més és **obligatòria** dins d'una UT, també pot bloquejar l'RA sencer com a «No assolit» independentment de la mitjana (vegeu la secció 6).`, "");
  lines.push("Cada tipus té el seu pes configurat a «RA, CA i pesos»; els valors de la taula són els d'aquest curs.");
  return lines.join("\n");
}

export function calcNotesMarkdown(course: AcademicCourse): string {
  const cfg = course.configuration, explicit = cfg.weightMode === "explicit", weighted = cfg.raAveraging === "weighted";
  const min = cfg.requiredActivityMinGrade, th = cfg.roundingThreshold, cov = cfg.minRaCoverage, gap = explicitWeightGap(course);
  const ras = cfg.learningResults.filter(r => r.status === "active").sort((a, b) => a.order - b.order);
  const acts = cfg.activities.filter(a => a.status === "active");
  const units = cfg.workUnits.filter(u => u.status === "active").sort((a, b) => a.order - b.order);
  const code = (id: string) => ras.find(r => r.id === id)?.code;
  const unitRows = units.map(u => `| ${esc(u.name)} | ${list(u.learningResultIds.map(code).filter((c): c is string => !!c))} | ${list(u.requiredActivityIds.map(id => acts.find(a => a.id === id)?.name).filter((x): x is string => !!x))} |`);
  const multiUnit = units.find(u => u.learningResultIds.length > 1);
  const rawPer = (d: number) => (6 + d).toLocaleString("ca", {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const lowDec = Math.max(0, Math.round((th - 0.01) * 100) / 100), thr = n(th, 2);
  const caFormula = explicit
    ? "```text\npesActivitat        = pesRA × partDeLActivitatDinsLRA\npesBrut(CA,activ.)  = %assignatAlCA × pesActivitat\npesGlobalCA         = Σ pesBrut(CA, cada activitat que hi contribueix)\npesRA               = Σ pesGlobalCA (de tots els CA d'aquell RA)\n```"
    : "```text\npesActivitat        = pesTipus / nombreActivitatsDelTipus\npesBrut(CA,activ.)  = %assignatAlCA × pesActivitat\npesGlobalCA         = Σ pesBrut(CA, cada activitat que hi contribueix)\npesRA               = Σ pesGlobalCA (de tots els CA d'aquell RA)\n```";
  const raMean = weighted
    ? "La **nota del RA** és la mitjana **ponderada** dels seus CA: cada criteri pesa segons el seu pes global (configurat a «Motor de càlcul»).\n\n```text\nnotaRA = Σ [ notaCA × pesGlobalCA ] / Σ pesGlobalCA\n```"
    : "La **nota del RA** és la mitjana aritmètica **simple** dels seus CA (no ponderada).\n\n```text\nnotaRA = mitjana( notaCA de tots els CA reals del RA )\n```";
  const globalNote = "I la **nota global** és la mitjana dels RA, ponderada pel seu pes **i** per quant se n'ha avaluat (vegeu la secció 3):\n\n```text\nnotaGlobal = Σ [ notaRA × pesRA × (coberturaRA / 100) ] / Σ [ pesRA × (coberturaRA / 100) ]\n```";
  const gapNote = gap > 0.0005
    ? `\n**Pes pendent.** Els RA configurats sumen el ${p(1 - gap, 0)} del mòdul; el ${p(gap, 0)} restant (per exemple, un RA que avalua l'empresa) no es calcula a l'aplicació i es resol a la junta d'avaluació. La nota que mostra l'aplicació es **projecta sobre els RA que hi ha**: no es divideix per 100, sinó pel pes configurat.\n`
    : "";
  const sox = cfg.abbreviation === "SOX";

  return `# Com es calculen les notes

Aquest document explica, pas a pas i amb diagrames, com l'aplicació calcula la nota de cada criteri d'avaluació (CA), de cada resultat d'aprenentatge (RA) i la nota global del mòdul **${esc(cfg.moduleName)}**. També explica què vol dir "cobertura", quan una activitat es considera avaluada, i com funcionen les unitats de treball (UT) i l'estat "No assolit".

No cal memoritzar-lo: és una referència per consultar quan una nota no surti el que s'esperava. Les xifres i els exemples són els d'aquest mòdul (${esc(course.academicYear)}).

## 1. La jerarquia de dades

Tot parteix d'un curs acadèmic, que té una **configuració comuna** (compartida pels grups ${course.groups.map(g => g.code).join(" i ") || "del mòdul"}) i, per cada grup, els seus propis **alumnes i notes**.

${hierarchySvg(course)}

- La **configuració comuna** (RA, CA, ${explicit ? "activitats, la part de cada RA que representa cada activitat" : "tipus d'activitat, activitats, relacions i ponderacions"}) és igual per a tots els grups.
- Cada **grup** té la seva pròpia llista d'alumnes i les seves pròpies notes — el mateix RA pot tenir mitjanes diferents en cada grup.

## 2. La cascada de pesos: d'una activitat a la nota global

Aquest és el nucli del motor de càlcul. ${explicit ? "Cada RA té un pes al mòdul; dins de l'RA, cada activitat en representa una part; i cada activitat \"reparteix\" el seu pes entre els CA als quals contribueix." : "Cada activitat \"reparteix\" el seu pes entre els CA als quals contribueix, i cada CA \"reparteix\" el seu pes entre els RA."} Exemple real d'aquest mòdul:

${cascade(course)}

Els mateixos passos, en fórmules:

${caFormula}

La **nota del CA** és la mitjana ponderada de les activitats **ja avaluades** que hi contribueixen (les que encara no ho estan, simplement no compten — no es tracten com un zero fins que arriben al llindar, vegeu secció 4):

\`\`\`text
notaCA = Σ [ notaTotalActivitat × pesNormalitzat(CA, activitat) ]
\`\`\`

${raMean}

${globalNote}
${gapNote}
### El mateix càlcul, amb activitats molt diferents

${weightsComparison(course)}

## 3. Cobertura: per què la nota és "projectada"

La **cobertura** d'un RA és quin percentatge del seu pes ja s'ha avaluat. Un RA amb activitats encara pendents de qualificar té una nota que és només una **projecció**, no la nota final — per això totes les pantalles mostren sempre el \`% avaluat\` al costat de la nota.

| Cobertura | Què vol dir |
|---|---|
| 0% | Cap activitat d'aquest RA s'ha avaluat encara; la nota mostrada és 0 per defecte. |
| 45% | Només s'ha avaluat una part de les activitats que hi contribueixen; la nota pot canviar molt encara. |
| 100% | Totes les activitats vinculades a aquest RA ja estan avaluades; la nota ja és estable. |

La **cobertura global** del mòdul es calcula igual, però amb el pes de totes les activitats del curs en lloc de només les d'un RA.

### Nota estimada i nota acumulada

A mitjan curs l'aplicació dona dues notes per RA i per al mòdul, que **no són el mateix**:

| | Què és | Com es calcula | Pot pujar i baixar? |
|---|---|---|---|
| **Estimada** (projectada) | Una **projecció**: com acabaria si el que falta anés com el que ja està corregit. | Només compta les activitats ja avaluades; els CA sense cap evidència es deixen fora de la mitjana de l'RA. | Sí, en qualsevol direcció. |
| **Acumulada** | El que l'alumne **ja ha guanyat**. **No és una projecció**: és un **mínim garantit**. | Tot el que no té nota (pendent o no presentat) compta **0**, i tot CA sense evidència compta 0 a la mitjana de l'RA. La nota global és «punts guanyats sobre 10» (cada RA acumulada × el seu pes al mòdul). | Només pot **pujar** a mesura que es corregeix. |

Quan tot està corregit (100 %) les dues notes són iguals. L'acumulada mai no supera l'estimada.${sox ? " És el mateix criteri que feia el full d'Excel d'origen del mòdul." : ""}

On es veuen: al **Mapa d'assoliment dels RA** (Graelles) i al seu informe imprimible, amb el selector **Acumulada / Estimada** (per defecte **Acumulada**, pintada en **verd si és ≥5 i en vermell si és <5**; a mitjan curs, amb poc avaluat, és normal que surti en vermell); a l'informe individual (a cada RA i a la nota global, com «acumulada») i a l'Anàlisi de l'alumne (columna «Acumulada»). En aquest mòdul la mitjana dels CA de cada RA és **${weighted ? "ponderada" : "simple"}** (Configuració › Motor de càlcul).

### RA provisionals: poca evidència no és «no assolit»

La nota d'un RA es calcula **només amb les activitats ja avaluades**. Per això, amb poques activitats avaluades, una sola nota pot decidir gairebé tot el valor de l'RA.

Per evitar conclusions precipitades, un RA amb menys de la **cobertura mínima** (en aquest mòdul, un **${n(cov, 0)} %**; es configura a Configuració) es mostra com a **«Provisional»**:

- no es considera assolit ni no assolit;
- no bloqueja el mòdul ni passa a l'extraordinària, i no compta com a RA en risc;
- l'informe, la graella de RA i l'informe imprimible mostren «Provisional · x % avaluat» i **amaguen la nota estimada per defecte**: clicant «Mostra nota» (informe) o la paraula «Provisional» (graelles) apareix la nota estimada, marcada amb «≈», i es torna a amagar clicant de nou. El que hi hagi visible en aquell moment és el que s'imprimeix. Al **Mapa d'assoliment dels RA** el botó **«Mostra totes les notes»** mostra d'un cop la nota estimada de tots els RA amb evidència; els RA sense cap evidència continuen sense nota;
- la nota global també s'avisa com a provisional quan la cobertura global és inferior a aquest mínim.

Excepció: si l'RA té una **activitat obligatòria suspesa** (vegeu l'apartat 6), es marca com a no assolit encara que tingui poca cobertura. Amb tot avaluat (100 %) la regla no canvia res, i amb el valor 0 es desactiva.

## 4. Quan es considera una activitat "avaluada"

Una activitat passa de "Pendent" a "Avaluada" automàticament quan arriba a **5 qualificacions** (comptant notes numèriques i "No presentat" — una bonificació sense nota base no compta). A partir d'aquell moment, els alumnes actius que encara no tinguin nota hi compten com un 0.

Aquest llindar es pot forçar manualment amb l'interruptor "Estat manual" de la pantalla Notes, si cal avançar o retardar el moment en què l'activitat comença a comptar zeros.

## 5. Bonificacions

- Una bonificació (\`+0,5\` o \`+1\`) s'afegeix a la nota base i és independent d'ella; el total pot superar 10.
- Cal un motiu, i com a màxim 3 alumnes bonificats per activitat i grup.
- **Una bonificació sense nota base no compta com a qualificació** ni fa pujar cap nota.

## 6. Unitats de treball (UT) i l'estat "No assolit"

Una UT agrupa diverses activitats i es vincula a un o més RA. D'aquestes activitats, algunes es marquen com **obligatòries**: si l'alumne en suspèn alguna (nota < ${n(min, 2)}), el RA vinculat queda com **"No assolit"**, independentment de la nota calculada — encara que la mitjana surti per sobre de 5.

**Valoració de les obligatòries per la mitjana (opció a Configuració).** Per defecte cada obligatòria ha de tenir la nota mínima per ella mateixa. Si actives «Valora les obligatòries per la seva mitjana», les obligatòries d'una UT es valoren en conjunt: el conjunt se supera si la seva mitjana és de la nota mínima o més (un «No presentat» compta 0). Mentre alguna obligatòria no tingui nota, no es dona el conjunt per suspès. **En aquest mòdul:** ${cfg.requiredByAverage ? "les obligatòries es valoren per la mitjana" : "cada obligatòria ha de superar la nota mínima per ella mateixa"}, i la nota mínima és **${n(min, 2)}**.

${units.length ? `Les UT d'aquest mòdul, amb els RA que cada una té vinculats i quines de les seves activitats són obligatòries:

| UT | RA vinculats | Activitats obligatòries d'aquesta UT |
|---|---|---|
${unitRows.join("\n")}
` : "Aquest mòdul encara no té UT configurades."}
${multiUnit ? `Fixa't que una mateixa UT pot vincular-se a **més d'un RA alhora** (com ${esc(multiUnit.name)}, amb ${list(multiUnit.learningResultIds.map(code).filter((c): c is string => !!c))}): si una activitat obligatòria d'aquella UT queda suspesa, **tots** els RA vinculats queden "No assolit", no només un.\n` : ""}
Un RA també queda "No assolit" simplement si la seva mitjana calculada no arriba a 5, encara que no hi hagi cap UT de per mig. L'aplicació distingeix els dos casos amb un motiu curt:

<svg viewBox="0 0 640 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:520px;height:auto;font-family:Inter,system-ui,sans-serif;display:block;margin:0 auto">
<defs><marker id="ahC" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#8390a3"/></marker></defs>
<rect x="170" y="10" width="300" height="46" rx="10" fill="#101c35"/>
<text x="320" y="38" text-anchor="middle" fill="#fff" font-size="13" font-weight="700">Nota d'un RA per un alumne</text>
<line x1="320" y1="56" x2="320" y2="86" stroke="#8390a3" stroke-width="2" marker-end="url(#ahC)"/>
<rect x="130" y="88" width="380" height="60" rx="10" fill="#fff" stroke="#e4eaf2"/>
<text x="320" y="112" text-anchor="middle" font-size="12.5" fill="#17233c">Alguna activitat obligatòria</text>
<text x="320" y="130" text-anchor="middle" font-size="12.5" fill="#17233c">d'una UT vinculada, suspesa?</text>
<line x1="200" y1="148" x2="140" y2="188" stroke="#c54c5c" stroke-width="2" marker-end="url(#ahC)"/>
<text x="150" y="172" font-size="11.5" fill="#c54c5c" font-weight="700">Sí</text>
<line x1="440" y1="148" x2="440" y2="188" stroke="#8390a3" stroke-width="2" marker-end="url(#ahC)"/>
<text x="452" y="172" font-size="11.5" fill="#7d899d" font-weight="700">No</text>
<rect x="30" y="190" width="220" height="60" rx="10" fill="#fff0f1" stroke="#c54c5c"/>
<text x="140" y="215" text-anchor="middle" font-size="12.5" fill="#c54c5c" font-weight="800">No assolit</text>
<text x="140" y="234" text-anchor="middle" font-size="11.5" fill="#c54c5c">Obligatòria suspesa (&lt;${n(min, 2)})</text>
<rect x="330" y="190" width="220" height="60" rx="10" fill="#fff" stroke="#e4eaf2"/>
<text x="440" y="214" text-anchor="middle" font-size="12.5" fill="#17233c">Nota calculada</text>
<text x="440" y="232" text-anchor="middle" font-size="12.5" fill="#17233c">≥ 5?</text>
<line x1="380" y1="250" x2="330" y2="290" stroke="#8390a3" stroke-width="2" marker-end="url(#ahC)"/>
<text x="330" y="274" font-size="11.5" fill="#7d899d" font-weight="700">No</text>
<line x1="500" y1="250" x2="500" y2="290" stroke="#15825f" stroke-width="2" marker-end="url(#ahC)"/>
<text x="512" y="274" font-size="11.5" fill="#15825f" font-weight="700">Sí</text>
<rect x="220" y="292" width="220" height="60" rx="10" fill="#fff0f1" stroke="#c54c5c"/>
<text x="330" y="317" text-anchor="middle" font-size="12.5" fill="#c54c5c" font-weight="800">No assolit</text>
<text x="330" y="336" text-anchor="middle" font-size="11.5" fill="#c54c5c">Mitjana &lt;5</text>
<rect x="410" y="292" width="200" height="60" rx="10" fill="#e9f8f2" stroke="#15825f"/>
<text x="510" y="325" text-anchor="middle" font-size="13" fill="#15825f" font-weight="800">Assolit</text>
</svg>

Quan un RA queda "No assolit", la nota numèrica es manté oculta per defecte a l'informe individual — un enllaç "Mostra nota" permet consultar-la igualment, tant si es vol comprovar com si es vol imprimir amb el valor visible.

## 7. Arrodoniment a l'informe final

Els taulers, taules i graelles sempre mostren **dos decimals** (la nota "de treball"). Només l'**informe individual imprimible** arrodoneix la nota de cada RA i la nota global a un **enter**, amb la regla d'aquest mòdul:

\`\`\`text
part decimal ≥ ${thr}  →  enter superior
part decimal < ${thr}  →  enter inferior
\`\`\`

Exemples: \`${rawPer(lowDec)}\` → \`6\` · \`${rawPer(th)}\` → \`7\` · \`8,20\` → \`${th <= 0.2 ? 9 : 8}\`.

L'estat d'aprovat (≥ 5) es calcula sempre amb la nota decimal, **abans** d'aquest arrodoniment — per això un alumne amb un 4,99 arrodonit a un 5 a la pantalla de l'informe continua comptant com a suspès a les estadístiques.

## 8. Resum d'un cop d'ull

| Concepte | On es veu | Es calcula a partir de |
|---|---|---|
| Pes de cada activitat | Targetes d'Activitats, Graella d'activitats | ${explicit ? "Pes de l'RA al mòdul × part de l'activitat dins l'RA" : "Pes del tipus ÷ nombre d'activitats actives d'aquell tipus"} |
| Pes de cada RA | Pantalla Activitats, Graella de RA | ${explicit ? "Pes de l'RA fixat a la configuració (Σ pesos globals dels seus CA)" : "Suma dels pesos globals dels seus CA"} |
| Nota d'un CA | (intern, no es mostra directament) | Mitjana ponderada de les activitats avaluades que hi contribueixen |
| Nota d'un RA | Resum, Graella de RA, Informe | Mitjana ${weighted ? "ponderada" : "simple"} dels seus CA |
| Cobertura | Al costat de cada nota de RA | % del pes del RA ja avaluat |
| Nota global | Resum, Alumnes, Informe | Mitjana dels RA, ponderada pel seu pes i cobertura |
| No assolit | Graella de RA, Informe | Obligatòria d'una UT suspesa (< ${n(min, 2)}), o mitjana <5 |

---

*Aquest document forma part de l'aplicació RA · Avaluació i es pot consultar des de la pantalla "Com es calcula" del menú lateral.*
`;
}
