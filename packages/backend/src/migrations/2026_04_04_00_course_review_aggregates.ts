import { QueryInterface } from 'sequelize'
import { DataTypes } from 'sequelize'

module.exports = {
  up: async ({ context: queryInterface }: { context: QueryInterface }) => {
    const sequelize = queryInterface.sequelize

    await queryInterface.addColumn('courses', 'avg_quality_score', {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
    })
    await queryInterface.addColumn('courses', 'avg_workload_score', {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
    })
    await queryInterface.addColumn('courses', 'review_count', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    })

    await sequelize.query(`
      UPDATE courses AS c
      SET
        avg_quality_score = sub.avg_q,
        avg_workload_score = sub.avg_w,
        review_count = sub.cnt
      FROM (
        SELECT
          course_code,
          ROUND(AVG(quality_score)::numeric, 2) AS avg_q,
          ROUND(AVG(workload_score)::numeric, 2) AS avg_w,
          COUNT(*)::int AS cnt
        FROM reviews
        GROUP BY course_code
      ) AS sub
      WHERE c.code = sub.course_code
    `)

    await sequelize.query(`
      CREATE INDEX courses_avg_quality_score_idx
      ON courses (avg_quality_score DESC NULLS LAST)
    `)
    await sequelize.query(`
      CREATE INDEX courses_avg_workload_score_idx
      ON courses (avg_workload_score DESC NULLS LAST)
    `)
  },

  down: async ({ context: queryInterface }: { context: QueryInterface }) => {
    const sequelize = queryInterface.sequelize
    await sequelize.query('DROP INDEX IF EXISTS courses_avg_quality_score_idx')
    await sequelize.query('DROP INDEX IF EXISTS courses_avg_workload_score_idx')
    await queryInterface.removeColumn('courses', 'review_count')
    await queryInterface.removeColumn('courses', 'avg_workload_score')
    await queryInterface.removeColumn('courses', 'avg_quality_score')
  },
}
