/**
 * Estima en quina pàgina impresa comença cada element marcat amb `data-toc`, simulant com el navegador reparteix el contingut
 * (Chrome no admet `target-counter()`, així que l'índex de la programació no es pot omplir amb CSS).
 * S'ha de cridar amb el contingut ja renderitzat a l'amplada de la pàgina impresa (vegeu `measureProgramPages`).
 *
 * Regles que simula: salts forçats (`.pdBreak`), títols units al bloc següent, taules `.pdKeep` sense partir,
 * files de taula senceres amb la capçalera repetida, paràgrafs partits per línies (mínim 2 al final i al principi) i marges col·lapsats.
 */

interface Unit {
  kind: "break" | "atomic" | "lines" | "rows";
  h: number; mt: number; mb: number;
  breakBefore?: boolean; keepNext?: boolean;
  lines?: number; lineH?: number;
  head?: number; rows?: number[]; rowLineH?: number;
  toc?: string;
  /** Marges que no es fusionen amb els veïns (fill d'un contenidor que crea un context de format propi, p. ex. overflow:auto). */
  addTop?: number; addBottom?: number;
}

const px = (v: string) => parseFloat(v) || 0;
const isHeading = (el: Element) => el.matches(".pdBar,h3,h4");

function collect(parent: Element, out: Unit[]) {
  for (const el of Array.from(parent.children)) {
    if (el.tagName === "STYLE" || el.tagName === "SCRIPT") continue;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    const mt = px(cs.marginTop), mb = px(cs.marginBottom), toc = el.getAttribute("data-toc") ?? undefined;
    const brk = el.classList.contains("pdBreak") || cs.breakBefore === "page";
    if (el.tagName === "DIV" && r.height < 1 && brk) { out.push({kind: "break", h: 0, mt: 0, mb: 0, breakBefore: true}); continue; }
    if (el.tagName === "DIV" && !isHeading(el) && (el.classList.contains("pdKeep") || cs.breakInside === "avoid")) { out.push({kind: "atomic", h: r.height, mt, mb, breakBefore: brk, toc}); continue; }
    const container = el.tagName === "DIV" && el.children.length > 0 && !el.matches(".pdBar,.pdFormula,.pdWarn,.pdHead,.pdFoot,.pdCover") && Array.from(el.children).some(c => /^(DIV|P|UL|TABLE|H3|H4)$/.test(c.tagName));
    if (container) {
      if (brk) out.push({kind: "break", h: 0, mt: 0, mb: 0, breakBefore: true});
      const start = out.length;
      collect(el, out);
      if (cs.overflowX !== "visible" || cs.overflowY !== "visible" || cs.display === "flow-root") {
        // Context de format de blocs: els marges del primer i l'últim fill queden dins i se sumen als dels veïns.
        const first = out[start], last = out[out.length - 1];
        if (first && first.kind !== "break") { first.addTop = first.mt; first.mt = 0; }
        if (last && last.kind !== "break") { last.addBottom = last.mb; last.mb = 0; }
      }
      continue;
    }
    if (el.tagName === "TABLE") {
      const keep = el.classList.contains("pdKeep") || cs.breakInside === "avoid";
      if (keep) { out.push({kind: "atomic", h: r.height, mt, mb, breakBefore: brk, toc}); continue; }
      const head = Array.from(el.querySelectorAll(":scope > thead")).reduce((s, t) => s + t.getBoundingClientRect().height, 0);
      const rows = Array.from(el.querySelectorAll(":scope > tbody > tr, :scope > tfoot > tr")).map(t => t.getBoundingClientRect().height);
      const td = el.querySelector("tbody td"), rowLineH = td ? px(getComputedStyle(td).lineHeight) || px(getComputedStyle(td).fontSize) * 1.4 : 16;
      out.push({kind: "rows", h: r.height, mt, mb, breakBefore: brk, head, rows, rowLineH, toc});
      continue;
    }
    if (el.tagName === "UL") {
      const items = Array.from(el.children);
      items.forEach((li, i) => { const lr = li.getBoundingClientRect(), lcs = getComputedStyle(li), lh = px(lcs.lineHeight) || px(lcs.fontSize) * 1.4; out.push({kind: "lines", h: lr.height, mt: i === 0 ? mt : 0, mb: i === items.length - 1 ? mb : 0, lines: Math.max(1, Math.round(lr.height / lh)), lineH: lh, breakBefore: i === 0 && brk}); });
      continue;
    }
    if (el.tagName === "P") {
      const lh = px(cs.lineHeight) || px(cs.fontSize) * 1.4;
      out.push({kind: "lines", h: r.height, mt, mb, lines: Math.max(1, Math.round(r.height / lh)), lineH: lh, breakBefore: brk, keepNext: cs.breakAfter === "avoid", toc});
      continue;
    }
    out.push({kind: "atomic", h: r.height, mt, mb, breakBefore: brk, keepNext: isHeading(el), toc});
  }
}

/** Alçada mínima del primer tros d'una unitat (el que cal que càpiga a la pàgina perquè hi pugui començar). */
function firstChunk(u: Unit): number {
  if (u.kind === "lines") return Math.min(u.h, 2 * (u.lineH ?? 0));
  if (u.kind === "rows") { const r0 = u.rows?.[0] ?? 0, lh = u.rowLineH || 16; return (u.head ?? 0) + (r0 > 4 * lh + 9 ? 2 * lh + 9 : r0); }
  return u.h;
}

const rows0 = (u: Unit, rh: number) => (u.rows?.[0] ?? -1) === rh;

export function paginateUnits(units: Unit[], cap: number): Record<string, number> {
  const out: Record<string, number> = {};
  let page = 1, y = 0, prevMb = 0, atTop = true, forced = true;
  const newPage = (isForced: boolean) => { page++; y = 0; prevMb = 0; atTop = true; forced = isForced; };
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    if (u.kind === "break") { if (y > 0 || !atTop) newPage(true); continue; }
    if (u.breakBefore && !atTop) newPage(true);
    const gap = () => (atTop && !forced ? 0 : Math.max(prevMb, u.mt) + (u.addTop ?? 0));
    let need = firstChunk(u);
    if (u.keepNext) {
      // Un títol ha d'anar amb el que el segueix; si el següent també és un títol, la cadena continua fins al primer bloc de contingut.
      let cur = u;
      for (let j = i + 1; j < units.length; j++) {
        const n = units[j];
        if (n.kind === "break" || n.breakBefore) break;
        need += Math.max(cur.mb, n.mt) + (n.keepNext ? n.h : firstChunk(n));
        if (!n.keepNext) break;
        cur = n;
      }
    }
    if (!atTop && y + gap() + need > cap) newPage(false);
    if (u.toc) out[u.toc] = page;
    y += gap(); atTop = false;
    if (u.kind === "atomic") {
      if (u.h > cap - y && y > 0) { /* unitat més alta que la resta de pàgina: ocupa pàgines senceres */ }
      y += u.h; while (y > cap) { page++; y -= cap; }
    } else if (u.kind === "lines") {
      let left = u.lines ?? 1; const lh = u.lineH || 17;
      for (;;) {
        const room = Math.floor((cap - y) / lh);
        if (room >= left) { y += left * lh; break; }
        let take = room;
        if (left - take < 2) take = left - 2;
        if (take < 2) {
          if (y > 0) { newPage(false); continue; }
          take = Math.max(1, Math.min(left, room));
        }
        left -= take; page++; y = 0; atTop = true; forced = false; prevMb = 0;
      }
    } else if (u.kind === "rows") {
      const head = u.head ?? 0, lh = u.rowLineH || 16, pad = 9;
      let first = true;
      for (const rh0 of u.rows ?? []) {
        let rh = rh0;
        for (let guard = 0; guard < 200; guard++) {
          const start = first ? head : 0;
          if (y + start + rh <= cap) { y += start + rh; first = false; break; }
          // Les files altes es parteixen per línies (mínim 2 a cada banda); les baixes passen senceres a la pàgina següent.
          const lines = Math.max(1, Math.round((rh - pad) / lh)), room = Math.floor((cap - y - start - 5) / lh);
          if (lines >= 4 && room >= 2) {
            const take = Math.min(room, lines - 2);
            rh -= take * lh; page++; y = head; first = false; continue;
          }
          if (y > head + 0.5 || (first && y > 0.5)) { page++; y = head; first = false; if (u.toc && rh === rh0 && y === head && out[u.toc] === page - 1 && rows0(u, rh0)) out[u.toc] = page; continue; }
          // Ja som a dalt d'una pàgina i la fila no hi cap: es parteix igualment.
          const take = Math.max(1, Math.min(lines - 1, Math.floor((cap - head - 5) / lh)));
          rh -= take * lh; page++; y = head;
        }
      }
      // La caixa de la taula afegeix vores/marges que no són a les files; es compensa amb la diferència amb l'alçada real.
      const sum = (u.head ?? 0) + (u.rows ?? []).reduce((s, v) => s + v, 0);
      y += Math.max(0, u.h - sum);
    }
    if (u.addBottom) y += u.addBottom;
    prevMb = u.mb;
  }
  out.__pages = page;
  return out;
}

export function paginateElement(root: Element, cap: number): Record<string, number> {
  const units: Unit[] = [];
  collect(root, units);
  return paginateUnits(units, cap);
}

