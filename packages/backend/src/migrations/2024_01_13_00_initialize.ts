import { QueryInterface } from 'sequelize'
import { DataTypes } from 'sequelize'

module.exports = {
  up: async ({ context: queryInterface }: { context: QueryInterface }) => {
    await queryInterface.createTable('reviews', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      title: { type: DataTypes.TEXT, allowNull: false },
      content: { type: DataTypes.TEXT, allowNull: false },
      date: { type: DataTypes.DATE, allowNull: false },
      workload_score: { type: DataTypes.INTEGER, allowNull: false },
      quality_score: { type: DataTypes.INTEGER, allowNull: false },
    })
    await queryInterface.createTable('users', {
      id: { type: DataTypes.TEXT, primaryKey: true },
      study_program: { type: DataTypes.TEXT, allowNull: true },
      starting_year: { type: DataTypes.INTEGER, allowNull: true },
    })
    await queryInterface.addColumn('reviews', 'user_id', {
      type: DataTypes.TEXT,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    })
  },
  down: async ({ context: queryInterface }: { context: QueryInterface }) => {
    await queryInterface.dropTable('reviews')
    await queryInterface.dropTable('users')
  },
}
