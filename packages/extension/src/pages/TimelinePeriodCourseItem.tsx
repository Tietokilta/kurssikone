import type { ParsedCourseUnitSelection } from './TimelinePage'

type Props = {
  selection: ParsedCourseUnitSelection
}

const TimelinePeriodCourseItem = ({ selection: s }: Props) => {
  const creditsForPeriod = s.plannedCredits / s.parsedPlannedPeriods.length

  return (
    <li className="bg-gray-300 flex" style={{ minHeight: creditsForPeriod * 20 }}>
      <div className="py-2 px-1 bg-blue-500 text-center w-12 shrink-0 flex flex-col items-center justify-center">
        <i>{creditsForPeriod.toFixed(1)}</i>
        {s.creditsMax === s.creditsMin ? s.creditsMax : `${s.creditsMin}–${s.creditsMax}`}
      </div>

      <div className="p-2">{s.name}</div>
    </li>
  )
}

export default TimelinePeriodCourseItem
