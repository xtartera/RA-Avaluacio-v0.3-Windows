export type Id = string;
export type GroupCode = "A" | "B";
export type GradeStatus = "pending" | "graded" | "not_presented";
export type EntityStatus = "active" | "archived";

export interface LearningResult {
  id: Id;
  code: string;
  description: string;
  order: number;
  status: EntityStatus;
  requiredRule?: { activityId: Id; minimum: number };
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
  term: 1 | 2;
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

export interface ModuleConfiguration {
  moduleName: string;
  abbreviation: string;
  level: string;
  learningResults: LearningResult[];
  criteria: AssessmentCriterion[];
  activityTypes: ActivityType[];
  activities: Activity[];
  links: ActivityCriterionLink[];
}

export interface Student {
  id: Id;
  name: string;
}

export interface Enrollment {
  id: Id;
  studentId: Id;
  groupId: Id;
  status: "active" | "withdrawn";
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
    learningResults: [], criteria: [], activityTypes: [], activities: [], links: [],
  };
}

export function createCourse(academicYear: string, configuration = emptyConfiguration(), isTest = false): AcademicCourse {
  const timestamp = nowIso();
  return {
    id: newId("course"), academicYear, active: true, archived: false, isTest,
    configuration: structuredClone(configuration), groups: [emptyGroup("A"), emptyGroup("B")],
    imports: [], createdAt: timestamp, updatedAt: timestamp,
  };
}
