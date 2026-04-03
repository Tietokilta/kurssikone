import { Model, DataTypes } from 'sequelize'
import { sequelize } from '../utils/db'

class Course extends Model {
  declare id: string
  declare code: string
  declare groupId: string | null
  declare nameFi: string | null
  declare nameEn: string | null
  declare creditsMin: number | null
  declare creditsMax: number | null
  declare validityStart: string | null
  declare validityEnd: string | null
  declare curriculumPeriodIds: string[] | null
  declare avgQualityScore: number | null
  declare avgWorkloadScore: number | null
  declare reviewCount: number
  declare updatedAt: Date
}

Course.init(
  {
    id: { type: DataTypes.TEXT, primaryKey: true },
    code: { type: DataTypes.TEXT, allowNull: false },
    groupId: { type: DataTypes.TEXT, allowNull: true },
    nameFi: { type: DataTypes.TEXT, allowNull: true },
    nameEn: { type: DataTypes.TEXT, allowNull: true },
    creditsMin: { type: DataTypes.INTEGER, allowNull: true },
    creditsMax: { type: DataTypes.INTEGER, allowNull: true },
    validityStart: { type: DataTypes.DATEONLY, allowNull: true },
    validityEnd: { type: DataTypes.DATEONLY, allowNull: true },
    curriculumPeriodIds: { type: DataTypes.JSONB, allowNull: true },
    avgQualityScore: { type: DataTypes.DECIMAL(4, 2), allowNull: true },
    avgWorkloadScore: { type: DataTypes.DECIMAL(4, 2), allowNull: true },
    reviewCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    underscored: true,
    timestamps: false,
    modelName: 'course',
    indexes: [{ fields: ['code'] }],
  }
)

export { Course }
