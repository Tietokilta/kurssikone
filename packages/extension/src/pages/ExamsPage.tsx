import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
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
    <div className="px-4 pb-4 pt-2">
      <p className="text-sm text-gray-500 mb-4">
        Exam data is provided by{' '}
        <a href="https://tenttiarkisto.fi" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          tenttiarkisto.fi
        </a>
        .
      </p>
      <div className="flex gap-6 items-center mb-2">
        <h2 className="text-xl font-medium">{exams.length} Exams</h2>
        <a
          href="https://www.tenttiarkisto.fi/exams/add/"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 text-sm bg-gray-200 text-gray-900 border border-gray-300 rounded-md hover:bg-gray-300 transition-colors"
        >
          + Add an exam
        </a>
      </div>
      <hr className="border-gray-800 mb-4" />
      <div className="flex flex-col gap-4">
        {exams.map((exam) => (
          <div key={exam.id} className="border-b border-gray-200 pb-4">
            <h3 className="font-medium">{dayjs(exam.exam_date).format('DD/MM/YYYY')}</h3>
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
