import {createPortal} from "react-dom";
import {GraduationCap, Printer, X} from "lucide-react";
import type {AcademicCourse, Group} from "../../src/model/domain";
import {summarizeStudent} from "../../src/model/studentSummary";
import {ModuleSummary, ProjectedScore} from "../components/ModuleSummary";
import {ReportLogo} from "../components/shared";
import {MyRaBars} from "../components/MyRaBars";

/** Informe breu per a l'alumne: només la nota projectada del mòdul, l'estat dels RA i, si no se supera, la causa. */
function StudentSummaryPage({course, group, enrollmentId}: {course: AcademicCourse; group: Group; enrollmentId: string}) {
  const student = group.students.find(s => s.id === group.enrollments.find(e => e.id === enrollmentId)?.studentId);
  const s = summarizeStudent(course, group, enrollmentId);
  const today = new Date().toLocaleDateString("ca", {day: "2-digit", month: "2-digit", year: "numeric"});
  return <section className="initialPage"><ReportLogo/>
      <div className="reportHead"><GraduationCap/><div><small>INFORME D'AVALUACIÓ DE L'ALUMNE</small><h1>{student?.name ?? "Alumne"}</h1><p>{course.configuration.level} · Grup {group.code} · {course.academicYear} · {course.configuration.moduleName} · Dades a {today}</p></div>
        <ProjectedScore summary={s}/>
      </div>
      <ModuleSummary summary={s}/>
      <MyRaBars course={course} group={group} enrollmentId={enrollmentId} report title="Resultats d'aprenentatge: què porto i què em falta — convocatòria ordinària"/>
      <p className="muted" style={{fontSize: 10.5, margin: "10px 0 0"}}>Un RA queda assolit quan se superen les activitats obligatòries i la nota és igual o superior a {course.configuration.requiredActivityMinGrade}. Aquest informe no substitueix la resolució final del mòdul.</p>
      <footer>{course.configuration.moduleName} · Informe de l'alumne · Dades locals</footer>
    </section>;
}

/** Informe breu per a l'alumne: d'un alumne o de tots els alumnes del grup (un per pàgina). */
export function StudentSummaryReport({course, group, enrollmentIds, close}: {course: AcademicCourse; group: Group; enrollmentIds: string[]; close: () => void}) {
  return createPortal(<div className="modal"><div className="report initialReport" role="dialog" aria-modal="true" aria-label="Informe per a l'alumne">
    <div className="noPrint reportActions"><button onClick={close} autoFocus><X/>Tanca</button><button className="dark" onClick={() => window.print()}><Printer/>Imprimeix{enrollmentIds.length > 1 ? ` ${enrollmentIds.length} informes` : ""}</button></div>
    {enrollmentIds.map(id => <StudentSummaryPage key={id} course={course} group={group} enrollmentId={id}/>)}
  </div></div>, document.body);
}
