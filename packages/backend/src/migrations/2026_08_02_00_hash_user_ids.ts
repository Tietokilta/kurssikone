import { QueryInterface } from 'sequelize'
import crypto from 'crypto'

const hashUserId = (rawId: string): string =>
  crypto.createHash('sha256').update(rawId).digest('hex')

module.exports = {
  up: async ({ context: queryInterface }: { context: QueryInterface }) => {
    const transaction = await queryInterface.sequelize.transaction()
    try {
      await queryInterface.removeIndex('reviews', ['user_id', 'course_code'], { transaction })

      await queryInterface.removeConstraint('reviews', 'reviews_user_id_fkey', { transaction })

      const [users] = await queryInterface.sequelize.query('SELECT id FROM users', { transaction })

      for (const user of users as { id: string }[]) {
        const hashedId = hashUserId(user.id)
        await queryInterface.sequelize.query(
          'UPDATE reviews SET user_id = :hashedId WHERE user_id = :rawId',
          { replacements: { hashedId, rawId: user.id }, transaction }
        )
        await queryInterface.sequelize.query(
          'UPDATE users SET id = :hashedId WHERE id = :rawId',
          { replacements: { hashedId, rawId: user.id }, transaction }
        )
      }

      await queryInterface.addConstraint('reviews', {
        fields: ['user_id'],
        type: 'foreign key',
        name: 'reviews_user_id_fkey',
        references: { table: 'users', field: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        transaction,
      })

      await queryInterface.addIndex('reviews', ['user_id', 'course_code'], {
        unique: true,
        transaction,
      })

      await transaction.commit()
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  },
  // Cannot reverse a one-way hash
  down: async () => {},
}
