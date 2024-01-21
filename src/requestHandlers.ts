export const getReviewsForCouse = async (courseCode: string) => {
  console.log(`http://localhost:3001/api/reviews/course/${courseCode}`)
  const response = await fetch(`http://localhost:3001/api/reviews/course/${courseCode}`)
  const json = await response.json()
  Object.entries(json.averages).forEach(([key, value]) => {
    json.averages[key] = Number(value)
  })
  return json
}
