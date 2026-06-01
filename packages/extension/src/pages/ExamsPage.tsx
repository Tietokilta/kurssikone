import { ExamsContent } from '@kurssikone/shared'
import { getExamsForCourse } from '../requestHandlers'

type Props = {
  courseCode?: string
}

const ExamsPage = ({ courseCode }: Props) => {
  if (!courseCode) {
    return <div className="text-gray-600">Course code not found</div>
  }

  return <ExamsContent courseCode={courseCode} getExams={getExamsForCourse} />
}

export default ExamsPage
