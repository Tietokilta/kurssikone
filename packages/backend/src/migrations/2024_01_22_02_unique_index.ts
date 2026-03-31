import { QueryInterface } from 'sequelize'

module.exports = {
  up: async ({ context: queryInterface }: { context: QueryInterface }) => {
    await queryInterface.addIndex('reviews', ['user_id', 'course_code'], { unique: true })
  },
  down: async ({ context: queryInterface }: { context: QueryInterface }) => {
    await queryInterface.removeIndex('reviews', ['user_id', 'course_code'])
  },
}
