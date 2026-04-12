/** @jest-environment node */

import fs from 'fs'
import path from 'path'
import { buildCompletedSelections, countsAsTimelineCompletion } from '../utils/timelinePageData'
import { createPeriodIndex } from '../utils/studyYearPeriods'
import type {
  SisuAssessmentItemAttainment,
  SisuAttainment,
  SisuCourseUnitAttainment,
  SisuCustomCourseUnitAttainment,
} from '../utils/types'
import type { Course } from '@kurssikone/shared/src/types'

const studyYearsPath = path.join(__dirname, 'data', 'studyYears.json')

function loadPeriodIndex() {
  const raw = fs.readFileSync(studyYearsPath, 'utf8').replace(/^\uFEFF/, '')
  const studyYears = JSON.parse(raw)
  return createPeriodIndex(studyYears, 'aalto-university-root-id', true)
}

function attainmentBase(
  overrides: Partial<SisuCourseUnitAttainment> & { state: string }
): Pick<
  SisuCourseUnitAttainment,
  | 'metadata'
  | 'documentState'
  | 'id'
  | 'personId'
  | 'personFirstNames'
  | 'personLastName'
  | 'personStudentNumber'
  | 'verifierPersonId'
  | 'studyRightId'
  | 'registrationDate'
  | 'expiryDate'
  | 'attainmentLanguageUrn'
  | 'acceptorPersons'
  | 'organisations'
  | 'state'
  | 'misregistration'
  | 'misregistrationRationale'
  | 'primary'
  | 'credits'
  | 'studyWeeks'
  | 'gradeScaleId'
  | 'gradeId'
  | 'gradeAverage'
  | 'additionalInfo'
  | 'administrativeNote'
  | 'studyFieldUrn'
  | 'workflowId'
  | 'moduleContentApplicationId'
  | 'creditTransferInfo'
  | 'cooperationNetworkStatus'
  | 'rdiCredits'
  | 'collaborationInstitution'
  | 'enrolmentRightId'
  | 's2r2Classification'
> {
  const date = '2020-09-15'
  return {
    metadata: {} as SisuCourseUnitAttainment['metadata'],
    documentState: 'READY',
    id: 'id',
    personId: 'p',
    personFirstNames: null,
    personLastName: null,
    personStudentNumber: null,
    verifierPersonId: null,
    studyRightId: 'sr',
    registrationDate: date,
    expiryDate: null,
    attainmentLanguageUrn: null,
    acceptorPersons: [],
    organisations: [],
    state: overrides.state,
    misregistration: false,
    misregistrationRationale: null,
    primary: true,
    credits: 5,
    studyWeeks: null,
    gradeScaleId: null,
    gradeId: null,
    gradeAverage: null,
    additionalInfo: null,
    administrativeNote: null,
    studyFieldUrn: null,
    workflowId: null,
    moduleContentApplicationId: null,
    creditTransferInfo: null,
    cooperationNetworkStatus: null,
    rdiCredits: null,
    collaborationInstitution: null,
    enrolmentRightId: null,
    s2r2Classification: null,
  }
}

function courseUnitAttainment(
  courseUnitId: string,
  attainmentDate: string,
  state: string
): SisuCourseUnitAttainment {
  return {
    type: 'CourseUnitAttainment',
    ...attainmentBase({ state }),
    courseUnitId,
    courseUnitGroupId: 'g',
    assessmentItemAttainmentIds: [],
    resolutionRationale: null,
    evaluationCriteria: null,
    attainmentDate,
    studentApplicationId: null,
  }
}

function assessmentItemAttainment(
  courseUnitId: string,
  attainmentDate: string,
  state: string,
  primaryStatus?: string
): SisuAssessmentItemAttainment {
  return {
    type: 'AssessmentItemAttainment',
    ...attainmentBase({ state }),
    courseUnitId,
    courseUnitGroupId: 'g',
    assessmentItemId: 'ai',
    courseUnitRealisationId: 'cur',
    attainmentDate,
    primaryStatus,
    studentApplicationId: null,
  }
}

function customCourseUnitAttainment(
  id: string,
  attainmentDate: string,
  registrationDate: string,
  state: string,
  nameEn: string
): SisuCustomCourseUnitAttainment {
  return {
    type: 'CustomCourseUnitAttainment',
    ...attainmentBase({ state }),
    name: { en: nameEn },
    studyLevelUrn: 'urn:study-level:bachelor',
    courseUnitTypeUrn: 'urn:type:course',
    code: 'CS-E4190',
    customStudyDraftId: 'draft-1',
    attainmentDate,
    registrationDate,
    studentApplicationId: null,
    id,
  }
}

describe('countsAsTimelineCompletion', () => {
  it('treats state INCLUDED as completion', () => {
    const a = courseUnitAttainment('cu1', '2020-09-15', 'INCLUDED')
    expect(countsAsTimelineCompletion(a)).toBe(true)
  })

  it('treats AssessmentItemAttainment primaryStatus INCLUDED as completion', () => {
    const a = assessmentItemAttainment('cu1', '2020-09-15', 'PASSED', 'INCLUDED')
    expect(countsAsTimelineCompletion(a)).toBe(true)
  })

  it('rejects FAILED state', () => {
    const a = courseUnitAttainment('cu1', '2020-09-15', 'FAILED')
    expect(countsAsTimelineCompletion(a)).toBe(false)
  })

  it('accepts typical passed state', () => {
    const a = courseUnitAttainment('cu1', '2020-09-15', 'PASSED')
    expect(countsAsTimelineCompletion(a)).toBe(true)
  })

  it('treats Included (mixed case) as completion', () => {
    const a = courseUnitAttainment('cu1', '2020-09-15', 'Included')
    expect(countsAsTimelineCompletion(a)).toBe(true)
  })
})

describe('buildCompletedSelections', () => {
  const periodIndex = loadPeriodIndex()
  const emptyCourseData: Record<string, Course> = {}

  it('includes CourseUnitAttainment with state INCLUDED', () => {
    const cu = 'devops-docker-cu-id'
    const attainments: SisuAttainment[] = [courseUnitAttainment(cu, '2020-09-15', 'INCLUDED')]
    const rows = buildCompletedSelections(attainments, periodIndex, emptyCourseData)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      id: cu,
      completed: true,
    })
    expect(rows[0]!.parsedPlannedPeriods[0]).toMatchObject({
      season: 'Fall',
      year: 2020,
    })
  })

  it('includes AssessmentItemAttainment with primaryStatus INCLUDED', () => {
    const cu = 'cu-assessment-included'
    const attainments: SisuAttainment[] = [
      assessmentItemAttainment(cu, '2021-02-01', 'PASSED', 'INCLUDED'),
    ]
    const rows = buildCompletedSelections(attainments, periodIndex, emptyCourseData)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ id: cu, completed: true })
  })

  it('omits FAILED attainments', () => {
    const attainments: SisuAttainment[] = [courseUnitAttainment('cu-fail', '2020-09-15', 'FAILED')]
    expect(buildCompletedSelections(attainments, periodIndex, emptyCourseData)).toHaveLength(0)
  })

  it('prefers eligible INCLUDED over earlier FAILED for the same course', () => {
    const cu = 'cu-mixed'
    const attainments: SisuAttainment[] = [
      courseUnitAttainment(cu, '2019-09-01', 'FAILED'),
      courseUnitAttainment(cu, '2020-09-15', 'INCLUDED'),
    ]
    const rows = buildCompletedSelections(attainments, periodIndex, emptyCourseData)
    expect(rows).toHaveLength(1)
    expect(rows[0]!.parsedPlannedPeriods[0]).toMatchObject({ year: 2020, season: 'Fall' })
  })

  it('includes CustomCourseUnitAttainment with INCLUDED (e.g. external / MOOC credit)', () => {
    const oid = 'ori-custom-devops-attainment-id'
    const attainments: SisuAttainment[] = [
      customCourseUnitAttainment(oid, '2020-09-15', '2020-09-01', 'INCLUDED', 'DevOps with Docker'),
    ]
    const rows = buildCompletedSelections(attainments, periodIndex, emptyCourseData)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      id: oid,
      name: 'DevOps with Docker',
      code: 'CS-E4190',
      completed: true,
    })
  })

  it('places using registrationDate when attainmentDate is outside study periods', () => {
    const cu = 'cu-reg-fallback'
    const attainments: SisuAttainment[] = [
      {
        ...courseUnitAttainment(cu, '1800-01-01', 'PASSED'),
        registrationDate: '2020-09-15',
      },
    ]
    const rows = buildCompletedSelections(attainments, periodIndex, emptyCourseData)
    expect(rows).toHaveLength(1)
    expect(rows[0]!.parsedPlannedPeriods[0]).toMatchObject({ year: 2020, season: 'Fall' })
  })
})
