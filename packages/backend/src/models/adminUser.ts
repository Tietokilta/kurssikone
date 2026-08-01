import { Model, DataTypes } from 'sequelize'
import { sequelize } from '../utils/db'

class AdminUser extends Model {
  declare id: number
  declare username: string
  declare passwordHash: string
}

AdminUser.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.TEXT, allowNull: false, unique: true },
    passwordHash: { type: DataTypes.TEXT, allowNull: false },
  },
  { sequelize, underscored: true, timestamps: true, modelName: 'adminUser', tableName: 'admin_users' }
)

export { AdminUser }
