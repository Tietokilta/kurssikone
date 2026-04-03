import { QueryInterface } from 'sequelize'
import { DataTypes } from 'sequelize'

module.exports = {
  up: async ({ context: queryInterface }: { context: QueryInterface }) => {
    await queryInterface.addColumn('reviews', 'learnings', {
      type: DataTypes.TEXT,
      allowNull: true,
    })
    await queryInterface.addColumn('reviews', 'tasks', {
      type: DataTypes.TEXT,
      allowNull: true,
    })
    await queryInterface.renameColumn('reviews', 'content', 'other_info')
    await queryInterface.removeColumn('reviews', 'title')
    await queryInterface.removeColumn('reviews', 'difficulty_score')
  },
  down: async ({ context: queryInterface }: { context: QueryInterface }) => {
    await queryInterface.addColumn('reviews', 'difficulty_score', {
      type: DataTypes.INTEGER,
      allowNull: false,
    })
    await queryInterface.addColumn('reviews', 'title', {
      type: DataTypes.TEXT,
      allowNull: false,
    })
    await queryInterface.renameColumn('reviews', 'other_info', 'content')
    await queryInterface.removeColumn('reviews', 'tasks')
    await queryInterface.removeColumn('reviews', 'learnings')
  },
}
