import type { Course } from '@kurssikompassi/shared'

import type { SisuKoriCourseUnit } from './types'

function isoDatePrefix(d: string | null | undefined): string | null {
  if (d == null || d === '') return null
  return d.split('T')[0] ?? null
}

export function koriCourseUnitToSharedCourse(unit: SisuKoriCourseUnit): Course {
  const vp = unit.validityPeriod
  return {
    id: unit.id,
    code: unit.code,
    groupId: unit.groupId ?? null,
    nameFi: unit.name?.fi ?? null,
    nameEn: unit.name?.en ?? null,
    creditsMin: unit.credits?.min ?? null,
    creditsMax: unit.credits?.max ?? null,
    validityStart: isoDatePrefix(vp?.startDate),
    validityEnd: isoDatePrefix(vp?.endDate ?? undefined),
    avgQualityScore: null,
    avgWorkloadScore: null,
    reviewCount: 0,
  }
}
