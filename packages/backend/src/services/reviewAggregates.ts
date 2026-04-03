import { sequelize } from '../utils/db'

/** Recompute stored review aggregates for all course rows matching the given course code. */
export async function refreshCourseReviewAggregates(courseCode: string): Promise<void> {
  await sequelize.query(
    `
    UPDATE courses AS c
    SET
      avg_quality_score = stats.avg_q,
      avg_workload_score = stats.avg_w,
      review_count = stats.cnt
    FROM (
      SELECT
        ROUND(AVG(quality_score)::numeric, 2) AS avg_q,
        ROUND(AVG(workload_score)::numeric, 2) AS avg_w,
        COUNT(*)::int AS cnt
      FROM reviews
      WHERE course_code = :courseCode
    ) AS stats
    WHERE c.code = :courseCode
    `,
    { replacements: { courseCode } }
  )
}
