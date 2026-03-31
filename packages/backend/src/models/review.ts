import { Model, DataTypes } from 'sequelize'
import { sequelize } from '../utils/db'

class Review extends Model {}

Review.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.TEXT, allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    professor: { type: DataTypes.TEXT, allowNull: true },
    year: { type: DataTypes.INTEGER, allowNull: true },
    workloadScore: { type: DataTypes.INTEGER, allowNull: false },
    qualityScore: { type: DataTypes.INTEGER, allowNull: false },
    difficultyScore: { type: DataTypes.INTEGER, allowNull: false },
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
