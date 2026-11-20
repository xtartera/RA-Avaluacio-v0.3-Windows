import {createPortal} from "react-dom";
import {Printer, X} from "lucide-react";
import {buildRegister} from "../../src/controllers/gradesExport";
import type {AcademicCourse, Group} from "../../src/model/domain";
import {ReportLogo} from "./shared";

/**
 * Registre de notes en paper: una taula per grup amb les notes introduïdes, agrupades per UT, en pàgines horitzontals.
 * És una còpia de lectura pensada per imprimir o desar en PDF.
 */
export function GradesRegister({course, groups, close}: {course: AcademicCourse; groups: Group[]; close: () => void}) {
  const register = buildRegister(course, groups);
  return createPortal(<div className="modal" onKeyDown={e => { if (e.key === "Escape") close(); }}>
    <div className="report registerDoc" role="dialog" aria-modal="true" aria-label="Registre de notes">
      <div className="noPrint reportActions"><button onClick={close} autoFocus><X/>Tanca</button><button className="dark" onClick={() => window.print()}><Printer/>Imprimeix ({register.pages.length} pàgines)</button></div>
      {register.pages.map((page, index) => { const hasDates = page.columns.some(c => c.date); return <section className="registerPage" key={index}>
        <div className="registerHead">
          <ReportLogo/>
          <div><small>REGISTRE DE NOTES</small><h1>{register.title}</h1><p>{page.groupName}{page.parts > 1 ? ` · full ${page.part} de ${page.parts}` : ""} · {register.generated}</p></div>
        </div>
        <table className="registerTable">
          <thead>
            <tr><th rowSpan={hasDates ? 4 : 3} className="registerName">Alumne</th>{page.units.map((u, i) => <th key={i} colSpan={u.span} className="registerUnit">{u.name}</th>)}</tr>
            <tr>{page.columns.map((c, i) => <th key={i} className="registerAct">{c.name}</th>)}</tr>
            <tr>{page.columns.map((c, i) => <th key={i} className="registerMeta">{c.type}{c.weight ? ` · ${c.weight}` : ""}</th>)}</tr>
            {hasDates && <tr>{page.columns.map((c, i) => <th key={i} className="registerMeta">{c.date}</th>)}</tr>}
          </thead>
          <tbody>
            {page.rows.map((row, i) => <tr key={i}><td className="registerName">{row.name}</td>{row.cells.map((cell, k) => <td key={k} className={cell === "NP" ? "registerNp" : undefined}>{cell}</td>)}</tr>)}
            {!page.rows.length && <tr><td colSpan={page.columns.length + 1} className="muted">Aquest grup no té alumnes actius.</td></tr>}
          </tbody>
        </table>
        <footer className="registerFoot">
          <span>NP = no presentat · cel·la buida = pendent d'avaluar · la nota inclou les bonificacions.</span>
          <span>Signatura del professor: ______________________ &nbsp; Data: ____________</span>
        </footer>
      </section>; })}
    </div>
  </div>, document.body);
}
