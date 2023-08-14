const reviews = [
  {
    id: 1,
    user: {
      name: 'Jorma Jormakka',
      major: 'Computer Science',
      year: '2022',
    },
    reviewDate: '2021-04-01',
    reviewTitle: 'Pretty good course',
    reviewContent: 'I learned a lot from this course. Great course for learning about coding.',
  },
  {
    id: 2,
    user: {
      name: 'Jorma Jormakka',
      major: 'Computer Science',
      year: '2022',
    },
    reviewDate: '2021-04-01',
    reviewTitle: 'Pretty good course',
    reviewContent: 'I learned a lot from this course. Great course for learning about coding.',
  },
  {
    id: 3,
    user: {
      name: 'Jorma Jormakka',
      major: 'Computer Science',
      year: '2022',
    },
    reviewDate: '2021-04-01',
    reviewTitle: 'Pretty good course',
    reviewContent: 'I learned a lot from this course. Great course for learning about coding.',
  },
]

const App = () => {
  return (
    <>
      <h2 className="mt-0">Reviews</h2>
      <dl className="fill-by-column">
        {reviews.map((review) => (
          <div className="form-group-mimic">
            <dt className="label">{review.reviewTitle}</dt>
            <dd>{review.reviewContent}</dd>
          </div>
        ))}
      </dl>
    </>
  )
}
export default App
