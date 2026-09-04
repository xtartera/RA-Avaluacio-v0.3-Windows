import {Upload} from "lucide-react";
import {importEvaluationWorkbook} from "../../src/controllers/importers";
import type {AcademicCourse} from "../../src/model/domain";
import {ExcelInput} from "../components/shared";

export function Welcome({add,msg}:{add:(c:AcademicCourse)=>void;msg:(s:string)=>void}){return <section className="emptyState"><Upload/><h1>Importa l’avaluació inicial</h1><p>Selecciona la plantilla Excel o crea un curs buit.</p><ExcelInput label="Selecciona Excel" run={async f=>{const x=await importEvaluationWorkbook(f);if(confirm(`S’han detectat ${x.summary.learningResults} RA, ${x.summary.criteria} CA, ${x.summary.activities} activitats, ${x.summary.students} alumnes i ${x.summary.grades} notes. Importar?`)){add(x.course);msg("Excel importat correctament.")}}} msg={msg}/></section>}
