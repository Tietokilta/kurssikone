export interface SisuStudyPlanMetadata {
  revision: number
  createdBy: string
  createdOn: string
  lastModifiedBy: string
  lastModifiedOn: string
  modificationOrdinal: number
}

export interface SisuModuleSelection {
  moduleId: string
  parentModuleId: string | null
}

export interface SisuCourseUnitSelection {
  courseUnitId: string
  parentModuleId: string
  completionMethodId: string | null
  substitutedBy: unknown[]
  substituteFor: unknown[]
  plannedPeriods: string[]
  gradeRaiseAttempt: unknown | null
}

export interface SisuAssessmentItemSelection {
  assessmentItemId: string
  courseUnitId: string
}

export interface SisuTimelineNote {
  text: string
  notePeriods: string[]
}

export interface SisuCustomStudyDraft {
  id: string
  parentModuleId: string
  name: string
  description: string
  location: string
  credits: number
  plannedPeriods: string[]
}

export interface SisuStudyPlan {
  metadata: SisuStudyPlanMetadata
  documentState: string
  id: string
  rootId: string
  learningOpportunityId: string
  userId: string
  name: string
  curriculumPeriodId: string
  moduleSelections: SisuModuleSelection[]
  courseUnitSelections: SisuCourseUnitSelection[]
  customModuleAttainmentSelections: unknown[]
  customCourseUnitAttainmentSelections: unknown[]
  assessmentItemSelections: SisuAssessmentItemSelection[]
  timelineNotes: SisuTimelineNote[]
  customStudyDrafts: SisuCustomStudyDraft[]
  primary: boolean
}

export type SisuMyPlansResponse = SisuStudyPlan[]

/** ORI attainments API (`/ori/api/attainments`); shapes from `data/attainments.json`. */
export interface SisuAttainmentAcceptorPerson {
  text: string | null
  personId: string
  roleUrn: string
  title: string | null
}

export interface SisuAttainmentOrganisation {
  organisationId: string
  educationalInstitutionUrn: string | null
  roleUrn: string
  share: number
}

export interface SisuAttainmentGradeAverage {
  gradeScaleId: string
  value: number | null
  totalIncludedCredits: number
  method: string
}

export interface SisuAttainmentReferenceNode {
  type: 'AttainmentReferenceNode'
  attainmentId: string
}

export interface SisuAttainmentBase {
  metadata: SisuStudyPlanMetadata
  documentState: string
  id: string
  personId: string
  personFirstNames: string | null
  personLastName: string | null
  personStudentNumber: string | null
  verifierPersonId: string | null
  studyRightId: string
  registrationDate: string
  expiryDate: string | null
  attainmentLanguageUrn: string | null
  acceptorPersons: SisuAttainmentAcceptorPerson[]
  organisations: SisuAttainmentOrganisation[]
  state: string
  misregistration: boolean
  misregistrationRationale: string | null
  primary: boolean
  credits: number
  studyWeeks: number | null
  gradeScaleId: string | null
  gradeId: number | null
  gradeAverage: SisuAttainmentGradeAverage | null
  additionalInfo: Record<string, string> | null
  administrativeNote: string | null
  studyFieldUrn: string | null
  workflowId: string | null
  moduleContentApplicationId: string | null
  creditTransferInfo: unknown | null
  cooperationNetworkStatus: unknown | null
  rdiCredits: number | null
  collaborationInstitution: unknown | null
  enrolmentRightId: string | null
  s2r2Classification: unknown | null
}

export interface SisuCourseUnitAttainment extends SisuAttainmentBase {
  type: 'CourseUnitAttainment'
  courseUnitId: string
  courseUnitGroupId: string
  assessmentItemAttainmentIds: string[]
  resolutionRationale: string | null
  evaluationCriteria: unknown | null
  attainmentDate: string
  studentApplicationId: string | null
}

export interface SisuAssessmentItemAttainment extends SisuAttainmentBase {
  type: 'AssessmentItemAttainment'
  courseUnitId: string
  courseUnitGroupId: string
  assessmentItemId: string
  courseUnitRealisationId: string
  attainmentDate: string
  primaryStatus?: string
  studentApplicationId: string | null
}

export interface SisuDegreeProgrammeAttainment extends SisuAttainmentBase {
  type: 'DegreeProgrammeAttainment'
  moduleId: string
  moduleGroupId: string
  nodes: SisuAttainmentReferenceNode[]
  embeddedModules: unknown[]
  acceptorOrganisationIds: string[]
  educationClassificationUrn: string
  secondaryEducationClassificationUrn: string | null
  degreeTitleUrn: string
  honoraryTitleUrn: string | null
  internationalContractualDegree: unknown | null
  attainmentDate: string
  studentApplicationId: string | null
}

export interface SisuModuleAttainment extends SisuAttainmentBase {
  type: 'ModuleAttainment'
  moduleId: string
  moduleGroupId: string
  nodes: SisuAttainmentReferenceNode[]
  embeddedModules: unknown[]
  resolutionRationale: string | null
  attainmentDate: string
  studentApplicationId: string | null
}

export interface SisuCustomCourseUnitAttainment extends SisuAttainmentBase {
  type: 'CustomCourseUnitAttainment'
  name: Record<string, string>
  studyLevelUrn: string
  courseUnitTypeUrn: string
  code: string
  customStudyDraftId: string
  attainmentDate: string
  studentApplicationId: string | null
}

export type SisuAttainment =
  | SisuCourseUnitAttainment
  | SisuAssessmentItemAttainment
  | SisuDegreeProgrammeAttainment
  | SisuModuleAttainment
  | SisuCustomCourseUnitAttainment

export type SisuAttainmentsResponse = SisuAttainment[]

/** Kori study-years API (`/kori/api/study-years`); shapes from `data/studyYears.json`. */
export interface SisuDateRange {
  startDate: string
  endDate: string
}

export interface SisuLocalizedName {
  en?: string
  fi?: string
  sv?: string
}

export interface SisuStudyPeriod {
  locator: string
  valid: SisuDateRange
  name: SisuLocalizedName
  size: number
  visibleByDefault: boolean
  includedInTargetCreditsCalculation: boolean
  startDate: string
}

export interface SisuStudyTerm {
  valid: SisuDateRange
  name: SisuLocalizedName
  studyPeriods: SisuStudyPeriod[]
}

export interface SisuStudyYear {
  valid: SisuDateRange
  org: string
  studyTerms: SisuStudyTerm[]
  name: string
  startYear: number
}

export type SisuStudyYearsResponse = SisuStudyYear[]

/** Kori course-units API (`/kori/api/course-units`); subset from `data/course-units-sisu.har`. */
export interface SisuKoriCourseUnit {
  id: string
  groupId: string
  code: string
  name: SisuLocalizedName
  credits: { min: number; max: number }
  validityPeriod?: { startDate?: string; endDate?: string | null }
}

export type SisuKoriCourseUnitsResponse = SisuKoriCourseUnit[]
