import {PieChart, Printer} from "lucide-react";
import type {AcademicCourse} from "../../src/model/domain";
import {RaWeightsExplainer} from "../components/RaWeightsExplainer";

/** Pantalla per explicar a l'alumnat com sumen les tasques a cada RA (projectable i imprimible). */
export function RaWeights({course}: {course: AcademicCourse}) {
  return <div className="managementScreen">
    <article className="panel managementPanel">
      <div className="managementHeader">
        <div className="managementTitle"><span className="sectionIcon"><PieChart/></span><div><h2>Com sumen les tasques a cada RA</h2><p>{course.configuration.moduleName} · mapes i exemples amb els pesos reals del mòdul. Es pot projectar a classe o imprimir.</p></div></div>
        <div className="actionRow"><button className="dark" onClick={() => window.print()}><Printer/>Imprimeix</button></div>
      </div>
    </article>
    <RaWeightsExplainer course={course}/>
  </div>;
}
