import type {StudentSummary} from "./studentSummary.ts";

const n1 = (v: number) => v.toLocaleString("ca", {minimumFractionDigits: 1, maximumFractionDigits: 1});
const list = (items: string[]) => items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} i ${items[items.length - 1]}`;

/**
 * Comentari personalitzat de 3-4 línies sobre el rendiment global al mòdul, a partir de l'estat dels RA, la cobertura i la nota projectada.
 * Llenguatge neutre (sense gènere) i orientat a què fer a continuació; no substitueix la valoració del professorat.
 */
export function moduleComment(summary: StudentSummary): string {
  const total = summary.ras.length, assolits = summary.ras.filter(r => r.state === "assolit"), fallits = summary.ras.filter(r => r.state === "no-assolit");
  const cov = Math.round(summary.coverage), p = summary.projected;
  const progress = `S'ha avaluat un ${cov} % del mòdul${total ? `: ${assolits.length} de ${total} RA assolits${fallits.length ? ` i ${fallits.length} no assolit${fallits.length > 1 ? "s" : ""} (${list(fallits.map(r => r.code))})` : ""}` : ""}.`;

  if (summary.provisional) {
    return `${progress} Encara hi ha poques activitats avaluades per poder valorar el rendiment global, i per això la nota projectada és provisional. ${fallits.length ? "Convé revisar quant abans què cal recuperar. " : ""}El més important ara és continuar lliurant les activitats a temps, perquè cada tasca corregida aporta una imatge més fiable del progrés.`;
  }
  if (summary.status === "superat") {
    if (p >= 8) return `${progress} El rendiment global és molt bo: la nota projectada és de ${n1(p)} i es manté de manera sostinguda. Aquest és un bon moment per aprofundir en els continguts i, si es vol, ajudar els companys. Convé mantenir la constància fins a final de curs.`;
    if (p >= 6.5) return `${progress} El rendiment global és bo: la nota projectada és de ${n1(p)}. Hi ha marge per millorar si es cuiden les activitats amb menys nota i es lliuren totes a temps. Mantenir el ritme actual assegura el resultat.`;
    return `${progress} El mòdul va aprovat però just: la nota projectada és de ${n1(p)}. Per assegurar-lo, el que més ajudarà és lliurar totes les activitats a temps i repassar les que han sortit amb menys nota. Cal vigilar que cap RA quedi en risc.`;
  }
  // No superat de moment.
  const required = summary.requiredFailed.length ? `Cal recuperar les activitats obligatòries suspeses (${list(summary.requiredFailed)}). ` : "";
  const ras = fallits.length ? `${fallits.length > 1 ? `Els ${list(fallits.map(r => r.code))} no estan assolits` : `El ${fallits[0].code} no està assolit`} de moment. ` : "";
  return `${progress} Ara mateix el mòdul no està superat. ${required}${ras}Encara hi ha marge per recuperar-ho: les activitats pendents poden millorar el resultat. Es recomana parlar-ne amb el professorat per acordar un pla de recuperació.`;
}
