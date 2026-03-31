import { QueryInterface } from 'sequelize'
import { DataTypes } from 'sequelize'

module.exports = {
  up: async ({ context: queryInterface }: { context: QueryInterface }) => {
    await queryInterface.addColumn('reviews', 'course_code', {
      type: DataTypes.TEXT,
      allowNull: false,
    })
    await queryInterface.addColumn('reviews', 'difficulty_score', {
      type: DataTypes.INTEGER,
      allowNull: false,
    })
  },
  down: async ({ context: queryInterface }: { context: QueryInterface }) => {
    await queryInterface.removeColumn('reviews', 'course_code')
    await queryInterface.removeColumn('reviews', 'difficulty_score')
  },
}
