import { QueryInterface } from 'sequelize'
import { DataTypes } from 'sequelize'

module.exports = {
  up: async ({ context: queryInterface }: { context: QueryInterface }) => {
    await queryInterface.removeColumn('reviews', 'date')
    await queryInterface.addColumn('reviews', 'timestamp_created', {
      type: DataTypes.BIGINT,
      allowNull: false,
    })
    await queryInterface.addColumn('reviews', 'timestamp_last_edit', {
      type: DataTypes.BIGINT,
      allowNull: true,
    })
  },
  down: async ({ context: queryInterface }: { context: QueryInterface }) => {
    await queryInterface.removeColumn('reviews', 'timestamp_created')
    await queryInterface.removeColumn('reviews', 'timestamp_last_edit')
    await queryInterface.addColumn('reviews', 'date', {
      type: DataTypes.DATE,
      allowNull: false,
    })
  },
}
