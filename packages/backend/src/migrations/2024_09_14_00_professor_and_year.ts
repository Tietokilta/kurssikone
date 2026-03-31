import { QueryInterface } from 'sequelize'
import { DataTypes } from 'sequelize'

module.exports = {
  up: async ({ context: queryInterface }: { context: QueryInterface }) => {
    await queryInterface.addColumn('reviews', 'professor', {
      type: DataTypes.TEXT,
      allowNull: true,
    })
    await queryInterface.addColumn('reviews', 'year', {
      type: DataTypes.INTEGER,
      allowNull: true,
    })
  },
  down: async ({ context: queryInterface }: { context: QueryInterface }) => {
    await queryInterface.removeColumn('reviews', 'professor')
    await queryInterface.removeColumn('reviews', 'year')
  },
}
