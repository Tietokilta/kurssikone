import { matchCompletedCourse, type CompletedCourse } from '../utils/recentAttainmentCourse'

const courses: CompletedCourse[] = [
  {
    code: 'CS-E4580',
    names: ['Programming Parallel Computers D', 'Rinnakkaislaskennan ohjelmointi D'],
    dates: ['31.5.2026'],
  },
  { code: 'CS-A1110', names: ['Programming 1'], dates: ['1.12.2023'] },
  { code: 'CS-A1111', names: ['Programming 1'], dates: ['7.5.2026'] },
  { code: 'ELEC-A1', names: ['Training'], dates: ['21.5.2026'] },
  { code: 'ELEC-A2', names: ['Training, advanced'], dates: ['21.5.2026'] },
]

describe('matchCompletedCourse', () => {
  it('matches a widget row by course name in any language', () => {
    expect(
      matchCompletedCourse(courses, ' Programming Parallel Computers D,  5 cr, 31.5.2026', '31.5.2026')
    ).toEqual({ code: 'CS-E4580', name: 'Programming Parallel Computers D' })
    expect(
      matchCompletedCourse(courses, 'Rinnakkaislaskennan ohjelmointi D, 5 op, 31.5.2026', '31.5.2026')
    ).toEqual({ code: 'CS-E4580', name: 'Rinnakkaislaskennan ohjelmointi D' })
  })

  it('uses the completion date to tell apart courses with the same name', () => {
    expect(matchCompletedCourse(courses, 'Programming 1, 5 cr, 7.5.2026', '7.5.2026')?.code).toBe(
      'CS-A1111'
    )
    expect(matchCompletedCourse(courses, 'Programming 1, 5 cr, 2.2.2020', '2.2.2020')).toBeNull()
  })

  it('prefers the longest matching name', () => {
    expect(
      matchCompletedCourse(courses, 'Training, advanced, 10 cr, 21.5.2026', '21.5.2026')?.code
    ).toBe('ELEC-A2')
    expect(matchCompletedCourse(courses, 'Training, 10 cr, 21.5.2026', '21.5.2026')?.code).toBe(
      'ELEC-A1'
    )
  })

  it('returns null for an unknown course', () => {
    expect(matchCompletedCourse(courses, 'Semantic Web D, 5 cr, 15.4.2026', '15.4.2026')).toBeNull()
  })

  it('ignores punctuation, spacing and casing differences in names', () => {
    expect(
      matchCompletedCourse(courses, 'programming  parallel computers D , 5 cr', '31.5.2026')?.code
    ).toBe('CS-E4580')
  })

  it('falls back to the only course completed on the row date', () => {
    expect(matchCompletedCourse(courses, 'Some other title, 5 cr, 31.5.2026', '31.5.2026')?.code).toBe(
      'CS-E4580'
    )
    expect(matchCompletedCourse(courses, 'Some other title, 5 cr, 21.5.2026', '21.5.2026')).toBeNull()
  })
})
