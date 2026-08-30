import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { TenttiarkistoCourse, TenttiarkistoExam } from '../types'

type Props = {
  courseCode: string
  getExams: (courseCode: string) => Promise<TenttiarkistoCourse | null>
}

const ExamsContent = ({ courseCode, getExams }: Props) => {
  const { t } = useTranslation()
  const [exams, setExams] = useState<TenttiarkistoExam[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    getExams(courseCode)
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
  }, [courseCode, getExams])

  if (hasError) {
    return <div className="text-gray-600">{t('shared.failedToLoadExams')}</div>
  }

  if (isLoading) {
    return <div className="text-gray-600">{t('shared.loading')}</div>
  }

  const examList = exams ?? []

  const grouped = examList.reduce<Record<string, TenttiarkistoExam[]>>((groups, exam) => {
    const year = dayjs(exam.exam_date).format('YYYY')
    ;(groups[year] ??= []).push(exam)
    return groups
  }, {})

  return (
    <>
      <p className="text-sm text-gray-500 mb-4">
        {t('shared.examDataProvider')}{' '}
        <a
          href="https://tenttiarkisto.fi"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          tenttiarkisto.fi
        </a>
      </p>
      <div className="flex gap-6 items-center mb-2">
        <h2 className="text-xl font-medium">{t('shared.examCount', { count: examList.length })}</h2>
        <a
          href="https://www.tenttiarkisto.fi/exams/add/"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
        >
          {t('shared.addExam')}
        </a>
      </div>
      <hr className="border-gray-800 mb-4" />
      {examList.length === 0 ? (
        <div className="text-gray-600 mb-44">{t('shared.noExamsFound')}</div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(grouped)
            .sort(([a], [b]) => Number(b) - Number(a))
            .map(([year, yearExams]) => (
              <div key={year}>
                <h3 className="text-lg font-semibold mb-2">{year}</h3>
                <div className="flex flex-wrap gap-3">
                  {yearExams.map((exam) => (
                    <div key={exam.id} className="border border-gray-200 rounded-md p-3 text-sm">
                      <p className="font-medium">{dayjs(exam.exam_date).format('DD MMM')}</p>
                      <p className="text-gray-600 mt-0.5">
                        {exam.desc} · {exam.lang}
                      </p>
                      <div className="flex flex-col gap-1 mt-2">
                        {exam.files.map((file, i) => (
                          <a
                            key={file.id}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {t('shared.file', { number: i + 1 })}
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </>
  )
}

export default ExamsContent
