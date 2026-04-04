import { useEffect, useState } from 'react'
import { getAveragesForCourse } from '../requestHandlers'
import { ReviewAverages, ScoreBar } from '@kurssikompassi/shared'

type Props = {
  planId: string
}

const TimelinePage = ({ planId }: Props) => {
  return <div className="bg-red-500">TEST</div>
}

export default TimelinePage
