import { DataTypes, QueryInterface } from 'sequelize'

module.exports = {
  up: async ({ context: queryInterface }: { context: QueryInterface }) => {
    await queryInterface.addColumn('course_realisations', 'learning_outcomes_fi', {
      type: DataTypes.TEXT,
      allowNull: true,
    })
    await queryInterface.addColumn('course_realisations', 'prerequisites_fi', {
      type: DataTypes.TEXT,
      allowNull: true,
    })
    await queryInterface.addColumn('course_realisations', 'organization_name_fi', {
      type: DataTypes.TEXT,
      allowNull: true,
    })
  },
  down: async ({ context: queryInterface }: { context: QueryInterface }) => {
    await queryInterface.removeColumn('course_realisations', 'learning_outcomes_fi')
    await queryInterface.removeColumn('course_realisations', 'prerequisites_fi')
    await queryInterface.removeColumn('course_realisations', 'organization_name_fi')
  },
}
