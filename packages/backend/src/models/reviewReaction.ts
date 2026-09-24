import { Model, DataTypes } from 'sequelize'
import { sequelize } from '../utils/db'

export const REACTION_TYPES = ['helpful', 'agree', 'disagree', 'funny', 'outdated'] as const
export type ReactionType = (typeof REACTION_TYPES)[number]

class ReviewReaction extends Model {
  declare id: number
  declare reviewId: number
  /** Hash of the reactor's user ID, or of an anonymous client-generated ID. */
  declare reactorId: string
  declare type: ReactionType
  declare timestampCreated: number
}

ReviewReaction.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    reviewId: { type: DataTypes.INTEGER, allowNull: false },
    reactorId: { type: DataTypes.TEXT, allowNull: false },
    type: { type: DataTypes.TEXT, allowNull: false },
    timestampCreated: { type: DataTypes.BIGINT, allowNull: false },
  },
  {
    sequelize,
    underscored: true,
    timestamps: false,
    modelName: 'reviewReaction',
    tableName: 'review_reactions',
  }
)

export { ReviewReaction }
