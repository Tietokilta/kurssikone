import { Model, DataTypes } from 'sequelize'
import { sequelize } from '../utils/db'

class Review extends Model {
  declare id: number
  declare courseCode: string
}

Review.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    learnings: { type: DataTypes.TEXT, allowNull: true },
    tasks: { type: DataTypes.TEXT, allowNull: true },
    otherInfo: { type: DataTypes.TEXT, allowNull: true },
    professor: { type: DataTypes.TEXT, allowNull: true },
    year: { type: DataTypes.INTEGER, allowNull: true },
    workloadScore: { type: DataTypes.INTEGER, allowNull: false },
    qualityScore: { type: DataTypes.INTEGER, allowNull: false },
    courseCode: { type: DataTypes.TEXT, allowNull: false },
    timestampCreated: { type: DataTypes.BIGINT, allowNull: false },
    timestampLastEdit: { type: DataTypes.BIGINT, allowNull: true },
  },
  {
    sequelize,
    underscored: true,
    timestamps: false,
    modelName: 'review',
    indexes: [{ fields: ['course_code'] }],
  }
)

export { Review }
