import { Review } from './review'
import { User } from './user'
import { Course } from './course'
import { CourseRealisation } from './courseRealisation'

User.hasMany(Review)
Review.belongsTo(User)

Course.hasMany(CourseRealisation, { foreignKey: 'courseId' })
CourseRealisation.belongsTo(Course, { foreignKey: 'courseId' })

export { Review, User, Course, CourseRealisation }
