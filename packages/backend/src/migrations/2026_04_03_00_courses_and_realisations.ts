import { QueryInterface } from 'sequelize'
import { DataTypes } from 'sequelize'

module.exports = {
  up: async ({ context: queryInterface }: { context: QueryInterface }) => {
    await queryInterface.createTable('courses', {
      id: { type: DataTypes.TEXT, primaryKey: true },
      code: { type: DataTypes.TEXT, allowNull: false },
      group_id: { type: DataTypes.TEXT, allowNull: true },
      name_fi: { type: DataTypes.TEXT, allowNull: true },
      name_en: { type: DataTypes.TEXT, allowNull: true },
      credits_min: { type: DataTypes.INTEGER, allowNull: true },
      credits_max: { type: DataTypes.INTEGER, allowNull: true },
      validity_start: { type: DataTypes.DATEONLY, allowNull: true },
      validity_end: { type: DataTypes.DATEONLY, allowNull: true },
      curriculum_period_ids: { type: DataTypes.JSONB, allowNull: true },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    })

    await queryInterface.addIndex('courses', ['code'])

    await queryInterface.createTable('course_realisations', {
      id: { type: DataTypes.TEXT, primaryKey: true },
      course_id: {
        type: DataTypes.TEXT,
        allowNull: true,
        references: { model: 'courses', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      code: { type: DataTypes.TEXT, allowNull: false },
      name_fi: { type: DataTypes.TEXT, allowNull: true },
      name_en: { type: DataTypes.TEXT, allowNull: true },
      name_sv: { type: DataTypes.TEXT, allowNull: true },
      start_date: { type: DataTypes.DATEONLY, allowNull: true },
      end_date: { type: DataTypes.DATEONLY, allowNull: true },
      credits_min: { type: DataTypes.INTEGER, allowNull: true },
      credits_max: { type: DataTypes.INTEGER, allowNull: true },
      content_fi: { type: DataTypes.TEXT, allowNull: true },
      content_en: { type: DataTypes.TEXT, allowNull: true },
      learning_outcomes_en: { type: DataTypes.TEXT, allowNull: true },
      prerequisites_en: { type: DataTypes.TEXT, allowNull: true },
      teachers: { type: DataTypes.JSONB, allowNull: true },
      teacher_in_charge: { type: DataTypes.JSONB, allowNull: true },
      language_codes: { type: DataTypes.JSONB, allowNull: true },
      organization_id: { type: DataTypes.TEXT, allowNull: true },
      organization_name_en: { type: DataTypes.TEXT, allowNull: true },
      grading_scale: { type: DataTypes.TEXT, allowNull: true },
      level: { type: DataTypes.TEXT, allowNull: true },
      enrolment_start: { type: DataTypes.DATEONLY, allowNull: true },
      enrolment_end: { type: DataTypes.DATEONLY, allowNull: true },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    })

    await queryInterface.addIndex('course_realisations', ['code'])
    await queryInterface.addIndex('course_realisations', ['course_id'])
  },
  down: async ({ context: queryInterface }: { context: QueryInterface }) => {
    await queryInterface.dropTable('course_realisations')
    await queryInterface.dropTable('courses')
  },
}
