import type { Course } from '@kurssikone/shared'

import { parseKoriTeachingPeriodsFromAdditional } from './parseKoriTeachingPeriods'
import { getTodayDateIso, isCourseValidityEnded } from './teachingPeriodTimeline'
import type { SisuKoriCourseUnit } from './types'

function isoDatePrefix(d: string | null | undefined): string | null {
  if (d == null || d === '') return null
  return d.split('T')[0] ?? null
}

export function koriCourseUnitToSharedCourse(unit: SisuKoriCourseUnit): Course {
  const vp = unit.validityPeriod
  const { groups, noTeachingAcademicYearStarts } = parseKoriTeachingPeriodsFromAdditional(
    unit.additional
  )
  const todayIso = getTodayDateIso()
  const validityEnd = isoDatePrefix(vp?.endDate ?? undefined)
  const hideTeachingBecauseCourseEnded = isCourseValidityEnded(validityEnd, todayIso)
  const base: Course = {
    id: unit.id,
    code: unit.code,
    groupId: unit.groupId ?? null,
    nameFi: unit.name?.fi ?? null,
    nameEn: unit.name?.en ?? null,
    creditsMin: unit.credits?.min ?? null,
    creditsMax: unit.credits?.max ?? null,
    validityStart: isoDatePrefix(vp?.startDate),
    validityEnd,
    avgQualityScore: null,
    avgWorkloadScore: null,
    reviewCount: 0,
  }
  if (!hideTeachingBecauseCourseEnded && groups.length > 0) {
    base.teachingPeriodGroups = groups
  }
  if (!hideTeachingBecauseCourseEnded && noTeachingAcademicYearStarts.length > 0) {
    base.teachingPeriodNoTeachingYears = noTeachingAcademicYearStarts.map((academicYearStart) => ({
      academicYearStart,
    }))
  }
  return base
}
