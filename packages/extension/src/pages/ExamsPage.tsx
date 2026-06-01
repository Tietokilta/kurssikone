import { useEffect, useState } from 'react'
import { getExamsForCourse, TenttiarkistoExam } from '../requestHandlers'

type Props = {
  courseCode?: string
}

const ExamsPage = ({ courseCode }: Props) => {
  const [exams, setExams] = useState<TenttiarkistoExam[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (!courseCode) return
    getExamsForCourse(courseCode)
      .then((data) => {
        if (data) {
          const sorted = [...data.exams].sort(
            (a, b) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime()
          )
          setExams(sorted)
        } else {
          setExams([])
        }
      })
      .catch(() => setHasError(true))
      .finally(() => setIsLoading(false))
  }, [courseCode])

  if (!courseCode) {
    return <div className="p-4 text-gray-600">Course code not found</div>
  }

  if (hasError) {
    return <div className="p-4 text-gray-600">Failed to load exams</div>
  }

  if (isLoading) {
    return <div className="p-4 text-gray-600">Loading...</div>
  }

  if (!exams || exams.length === 0) {
    return <div className="p-4 text-gray-600">No exams found for this course</div>
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-medium mb-4">{exams.length} Exams</h2>
      <div className="flex flex-col gap-4">
        {exams.map((exam) => (
          <div key={exam.id} className="ml-4 border-b border-gray-200 pb-4">
            <h3 className="font-medium">{exam.exam_date}</h3>
            <p className="text-sm text-gray-600 mt-0.5">
              {exam.desc} · {exam.lang}
            </p>
            <div className="flex flex-col gap-1 mt-2">
              {exam.files.map((file, i) => (
                <a
                  key={file.id}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  File {i + 1}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ExamsPage
