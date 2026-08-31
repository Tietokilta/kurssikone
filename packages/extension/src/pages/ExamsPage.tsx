import { useTranslation } from 'react-i18next'
import { ExamsContent } from '@kurssikone/shared'
import { getExamsForCourse } from '../requestHandlers'

type Props = {
  courseCode?: string
}

const ExamsPage = ({ courseCode }: Props) => {
  const { t } = useTranslation()
  if (!courseCode) {
    return <div className="text-gray-600">{t('extension.courseCodeNotFound')}</div>
  }

  return <ExamsContent courseCode={courseCode} getExams={getExamsForCourse} />
}

export default ExamsPage
