import { Model, DataTypes } from 'sequelize'
import { sequelize } from '../utils/db'

class User extends Model {}

User.init(
  {
    id: { type: DataTypes.TEXT, primaryKey: true },
    studyProgram: { type: DataTypes.TEXT, allowNull: true },
    startingYear: { type: DataTypes.INTEGER, allowNull: true },
  },
  { sequelize, underscored: true, timestamps: false, modelName: 'user' }
)

export { User }
