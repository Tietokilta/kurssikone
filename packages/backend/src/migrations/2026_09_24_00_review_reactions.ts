import { DataTypes, QueryInterface } from 'sequelize'

module.exports = {
  up: async ({ context: queryInterface }: { context: QueryInterface }) => {
    await queryInterface.createTable('review_reactions', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      review_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'reviews', key: 'id' },
        onDelete: 'CASCADE',
      },
      reactor_id: { type: DataTypes.TEXT, allowNull: false },
      type: { type: DataTypes.TEXT, allowNull: false },
      timestamp_created: { type: DataTypes.BIGINT, allowNull: false },
    })
    await queryInterface.addIndex('review_reactions', ['review_id', 'reactor_id', 'type'], {
      unique: true,
    })
  },
  down: async ({ context: queryInterface }: { context: QueryInterface }) => {
    await queryInterface.dropTable('review_reactions')
  },
}
