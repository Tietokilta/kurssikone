import { Model, DataTypes } from 'sequelize'
import { sequelize } from '../utils/db'

class CourseRealisation extends Model {
  declare id: string
  declare courseId: string | null
  declare code: string
  declare nameFi: string | null
  declare nameEn: string | null
  declare nameSv: string | null
  declare startDate: string | null
  declare endDate: string | null
  declare creditsMin: number | null
  declare creditsMax: number | null
  declare contentFi: string | null
  declare contentEn: string | null
  declare learningOutcomesEn: string | null
  declare learningOutcomesFi: string | null
  declare prerequisitesEn: string | null
  declare prerequisitesFi: string | null
  declare teachers: string[] | null
  declare teacherInCharge: string[] | null
  declare languageCodes: string[] | null
  declare organizationId: string | null
  declare organizationNameEn: string | null
  declare organizationNameFi: string | null
  declare gradingScale: string | null
  declare level: string | null
  declare enrolmentStart: string | null
  declare enrolmentEnd: string | null
  declare updatedAt: Date
}

CourseRealisation.init(
  {
    id: { type: DataTypes.TEXT, primaryKey: true },
    courseId: { type: DataTypes.TEXT, allowNull: true },
    code: { type: DataTypes.TEXT, allowNull: false },
    nameFi: { type: DataTypes.TEXT, allowNull: true },
    nameEn: { type: DataTypes.TEXT, allowNull: true },
    nameSv: { type: DataTypes.TEXT, allowNull: true },
    startDate: { type: DataTypes.DATEONLY, allowNull: true },
    endDate: { type: DataTypes.DATEONLY, allowNull: true },
    creditsMin: { type: DataTypes.INTEGER, allowNull: true },
    creditsMax: { type: DataTypes.INTEGER, allowNull: true },
    contentFi: { type: DataTypes.TEXT, allowNull: true },
    contentEn: { type: DataTypes.TEXT, allowNull: true },
    learningOutcomesEn: { type: DataTypes.TEXT, allowNull: true },
    learningOutcomesFi: { type: DataTypes.TEXT, allowNull: true },
    prerequisitesEn: { type: DataTypes.TEXT, allowNull: true },
    prerequisitesFi: { type: DataTypes.TEXT, allowNull: true },
    teachers: { type: DataTypes.JSONB, allowNull: true },
    teacherInCharge: { type: DataTypes.JSONB, allowNull: true },
    languageCodes: { type: DataTypes.JSONB, allowNull: true },
    organizationId: { type: DataTypes.TEXT, allowNull: true },
    organizationNameEn: { type: DataTypes.TEXT, allowNull: true },
    organizationNameFi: { type: DataTypes.TEXT, allowNull: true },
    gradingScale: { type: DataTypes.TEXT, allowNull: true },
    level: { type: DataTypes.TEXT, allowNull: true },
    enrolmentStart: { type: DataTypes.DATEONLY, allowNull: true },
    enrolmentEnd: { type: DataTypes.DATEONLY, allowNull: true },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    underscored: true,
    timestamps: false,
    modelName: 'courseRealisation',
    tableName: 'course_realisations',
    indexes: [{ fields: ['code'] }, { fields: ['course_id'] }],
  }
)

export { CourseRealisation }
