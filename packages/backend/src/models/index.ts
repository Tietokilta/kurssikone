import { Review } from './review'
import { User } from './user'
import { Course } from './course'
import { CourseRealisation } from './courseRealisation'
import { AdminUser } from './adminUser'
import { ReviewReaction } from './reviewReaction'

User.hasMany(Review)
Review.belongsTo(User)

Review.hasMany(ReviewReaction, { foreignKey: 'reviewId', onDelete: 'CASCADE' })
ReviewReaction.belongsTo(Review, { foreignKey: 'reviewId' })

Course.hasMany(CourseRealisation, { foreignKey: 'courseId' })
CourseRealisation.belongsTo(Course, { foreignKey: 'courseId' })

export { Review, User, Course, CourseRealisation, AdminUser, ReviewReaction }
