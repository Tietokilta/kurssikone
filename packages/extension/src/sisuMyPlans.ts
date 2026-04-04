/**
 * Types for Sisu Osuva `GET /osuva/api/my-plans`
 */

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
