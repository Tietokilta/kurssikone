/** @jest-environment node */

import fs from 'fs'
import path from 'path'

import { koriCourseUnitToSharedCourse } from '../utils/sisuKoriCourseUnit'
import type { SisuKoriCourseUnit } from '../utils/types'

const sample = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'koriCourseUnitSample.json'), 'utf8')
) as SisuKoriCourseUnit

describe('koriCourseUnitToSharedCourse', () => {
  it('maps Kori course unit to shared Course', () => {
    const course = koriCourseUnitToSharedCourse(sample)
    expect(course).toEqual({
      id: 'aalto-CU-1150933377-20220801',
      code: 'CS-E4770',
      groupId: 'aalto-CU-1150933377',
      nameEn: 'Designing and Building Scalable Web Applications D',
      nameFi: 'Designing and Building Scalable Web Applications D',
      creditsMin: 5,
      creditsMax: 5,
      validityStart: '2022-08-01',
      validityEnd: null,
      avgQualityScore: null,
      avgWorkloadScore: null,
      reviewCount: 0,
    })
  })
})
