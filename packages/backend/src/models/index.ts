import { Review } from './review'
import { User } from './user'

User.hasMany(Review)
Review.belongsTo(User)

export { Review, User }
