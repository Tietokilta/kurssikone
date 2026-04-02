import ReviewItem from './ReviewItem'
import { Review } from '../types'

type Props = {
  reviews: Review[]
  scoreTypes: { name: string; field: string }[]
}

const ReviewList = ({ reviews, scoreTypes }: Props) => {
  return (
    <dl className="fill-by-column">
      {reviews.map((review) => (
        <ReviewItem key={review.id} review={review} scoreTypes={scoreTypes} />
      ))}
    </dl>
  )
}

export default ReviewList
