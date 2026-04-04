import {
  defaultFirstStudyYearWhenNoAttainments,
  firstStudyYearFromAttainmentDates,
  inferFirstYearForKoriStudyYears,
} from '../utils/inferSisuFirstStudyYear'
import type { SisuCourseUnitAttainment } from '../utils/types'

describe('firstStudyYearFromAttainmentDates', () => {
  const course = (date: string): SisuCourseUnitAttainment => ({
    type: 'CourseUnitAttainment',
    courseUnitId: 'cu',
    courseUnitGroupId: 'g',
    assessmentItemAttainmentIds: [],
    resolutionRationale: null,
    evaluationCriteria: null,
    attainmentDate: date,
    studentApplicationId: null,
    metadata: {} as SisuCourseUnitAttainment['metadata'],
    documentState: 'READY',
    id: 'a1',
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
    state: 'x',
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
  })

  it('returns min attainment calendar year minus one', () => {
    expect(
      firstStudyYearFromAttainmentDates([course('2021-06-01'), course('2020-12-10')])
    ).toBe(2019)
  })

  it('returns null when there are no usable dates', () => {
    expect(firstStudyYearFromAttainmentDates([])).toBeNull()
  })
})

describe('defaultFirstStudyYearWhenNoAttainments', () => {
  it('is several years before the current academic start', () => {
    // April → academic year that started the previous calendar August
    const y = defaultFirstStudyYearWhenNoAttainments(new Date(2026, 3, 5))
    expect(y).toBe(2015)
  })
})

describe('inferFirstYearForKoriStudyYears', () => {
  it('reads calendar year from trailing date on programme root id', () => {
    expect(
      inferFirstYearForKoriStudyYears({
        rootId: 'aalto-EDU-203002-2016-08-01',
        curriculumPeriodId: '',
      })
    ).toBe(2016)
  })

  it('reads first 20xx year from curriculumPeriodId when root has no date', () => {
    expect(
      inferFirstYearForKoriStudyYears({
        rootId: 'aalto-university-root-id',
        curriculumPeriodId: 'foo-2020-bar',
      })
    ).toBe(2020)
  })
})
