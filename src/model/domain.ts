export type Id = string;
export type GroupCode = string;
export type GradeStatus = "pending" | "graded" | "not_presented";
export type EntityStatus = "active" | "archived";

export interface LearningResult {
  id: Id;
  code: string;
  description: string;
  order: number;
  status: EntityStatus;
}

export interface AssessmentCriterion {
  id: Id;
  learningResultId: Id;
  code: string;
  description: string;
  order: number;
  status: EntityStatus;
}

export interface ActivityType {
  id: Id;
  name: string;
  weight: number;
  status: EntityStatus;
}

export interface Activity {
  id: Id;
  name: string;
  activityTypeId: Id;
  term: number;
  date: string | null;
  order: number;
  status: EntityStatus;
}

export interface ActivityCriterionLink {
  id: Id;
  activityId: Id;
  criterionId: Id;
  allocation: number;
}

export interface WorkUnit {
  id: Id;
  name: string;
  activityIds: Id[];
  requiredActivityIds: Id[];
  learningResultIds: Id[];
  order: number;
  status: EntityStatus;
}

export type RaAveraging = "simple" | "weighted";
export type CicleNivell = "Grau mitjà" | "Grau superior";

export interface ModuleConfiguration {
  moduleName: string;
  abbreviation: string;
  level: string;
  cicle: string;
  cicleNivell: CicleNivell;
  curs: string;
  termCount: number;
  learningResults: LearningResult[];
  criteria: AssessmentCriterion[];
  activityTypes: ActivityType[];
  activities: Activity[];
  links: ActivityCriterionLink[];
  workUnits: WorkUnit[];
  raAveraging: RaAveraging;
  roundingThreshold: number;
  requiredActivityMinGrade: number;
  riskThreshold: number;
}

export interface Student {
  id: Id;
  name: string;
}

export interface Enrollment {
  id: Id;
  studentId: Id;
  groupId: Id;
  status: "active" | "archived" | "withdrawn";
  createdAt: string;
}

export interface GradeBonus {
  id: Id;
  value: 0.5 | 1;
  reason: string;
  source: "manual" | "excel";
  historicalException?: boolean;
  createdAt: string;
}

export interface Grade {
  id: Id;
  enrollmentId: Id;
  activityId: Id;
  status: GradeStatus;
  baseValue: number | null;
  bonuses: GradeBonus[];
  updatedAt: string;
}

export interface GradeHistoryEntry {
  id: Id;
  gradeId: Id;
  at: string;
  action: string;
  previous: Grade | null;
  next: Grade | null;
}

export interface GroupActivityState {
  activityId: Id;
  automaticEvaluatedAt: string | null;
  manualOverride: "evaluated" | "pending" | null;
}

export interface StudentReportComment {
  enrollmentId: Id;
  text: string;
  cutoffLabel: string;
  updatedAt: string;
}

export interface Group {
  id: Id;
  code: GroupCode;
  name: string;
  capacity: 25;
  enrollments: Enrollment[];
  students: Student[];
  grades: Grade[];
  activityStates: GroupActivityState[];
  comments: StudentReportComment[];
}

export interface ImportBatch {
  id: Id;
  fileName: string;
  importedAt: string;
  warnings: string[];
}

export interface AcademicCourse {
  id: Id;
  academicYear: string;
  active: boolean;
  archived: boolean;
  isTest: boolean;
  configuration: ModuleConfiguration;
  groups: Group[];
  imports: ImportBatch[];
  createdAt: string;
  updatedAt: string;
}

export interface AppDatabase {
  schemaVersion: 1;
  courses: AcademicCourse[];
  gradeHistory: GradeHistoryEntry[];
}

export const nowIso = () => new Date().toISOString();
export const newId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export function emptyGroup(code: GroupCode): Group {
  return {
    id: newId("group"), code, name: `Grup ${code}`, capacity: 25,
    enrollments: [], students: [], grades: [], activityStates: [], comments: [],
  };
}

export function emptyConfiguration(): ModuleConfiguration {
  return {
    moduleName: "Sistemes Operatius en Xarxa", abbreviation: "SOX", level: "2n SMX",
    cicle: "SMX", cicleNivell: "Grau mitjà", curs: "2n", termCount: 2,
    learningResults: [], criteria: [], activityTypes: [], activities: [], links: [], workUnits: [], raAveraging: "simple", roundingThreshold: .75, requiredActivityMinGrade: 5, riskThreshold: 4,
  };
}

export function migrateDatabase(data: AppDatabase): AppDatabase {
  for (const course of data.courses) {
    if (!course.configuration.workUnits) course.configuration.workUnits = [];
    if (!course.configuration.raAveraging) course.configuration.raAveraging = "simple";
    if (course.configuration.roundingThreshold === undefined) course.configuration.roundingThreshold = .75;
    if (course.configuration.requiredActivityMinGrade === undefined) course.configuration.requiredActivityMinGrade = 5;
    if (course.configuration.riskThreshold === undefined) course.configuration.riskThreshold = 4;
    if (!course.configuration.cicle) course.configuration.cicle = "SMX";
    if (!course.configuration.cicleNivell) course.configuration.cicleNivell = "Grau mitjà";
    if (!course.configuration.curs) course.configuration.curs = "2n";
    if (!course.configuration.termCount) course.configuration.termCount = 2;
  }
  return data;
}

export function createCourse(academicYear: string, configuration = emptyConfiguration(), isTest = false, groupCodes: GroupCode[] = ["A", "B"]): AcademicCourse {
  const timestamp = nowIso();
  return {
    id: newId("course"), academicYear, active: true, archived: false, isTest,
    configuration: structuredClone(configuration), groups: groupCodes.map(emptyGroup),
    imports: [], createdAt: timestamp, updatedAt: timestamp,
  };
}

export function groupCoursesByCicle(courses: AcademicCourse[]): [string, AcademicCourse[]][] {
  const groups = new Map<string, AcademicCourse[]>();
  for (const c of courses) {
    const key = `${c.configuration.cicle} · ${c.configuration.cicleNivell} · ${c.configuration.curs}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(c);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "ca"))
    .map(([key, list]) => [key, list.slice().sort((a, b) => b.academicYear.localeCompare(a.academicYear, "ca"))]);
}
