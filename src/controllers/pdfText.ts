import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import type {PdfItem} from "./diagnosticParser.ts";

/** Llegeix el text de cada pàgina d'un PDF, amb tipus de lletra i posició (tot en local, sense servidor). */
export async function extractPdfItems(data: ArrayBuffer): Promise<PdfItem[][]> {
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  // pdf.js «consumeix» el buffer: se li passa una còpia perquè l'original es pugui desar.
  const doc = await pdfjs.getDocument({data: new Uint8Array(data.slice(0))}).promise;
  try {
    const pages: PdfItem[][] = [];
    for (let number = 1; number <= doc.numPages; number++) {
      const content = await (await doc.getPage(number)).getTextContent();
      const items: PdfItem[] = [];
      for (const item of content.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        items.push({s: item.str, f: item.fontName, x: Math.round(item.transform[4] * 10) / 10, y: Math.round(item.transform[5] * 10) / 10});
      }
      pages.push(items);
    }
    return pages;
  } finally {
    await doc.destroy();
  }
}
