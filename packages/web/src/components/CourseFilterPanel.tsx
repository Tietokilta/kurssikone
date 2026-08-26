import { useState, useEffect, useRef } from 'react'
import { CourseFilterOptions, CourseFilters } from '@kurssikone/shared'
import DepartmentFilterModal, { ORG_HIERARCHY, shortenDepartment } from './DepartmentFilterModal'

type Props = {
  filters: CourseFilters
  onChange: (filters: CourseFilters) => void
  filterOptions: CourseFilterOptions | null
}

type DropdownOption = string | { value: string; label: string }

const MultiSelectDropdown = ({
  label,
  options,
  selected,
  onChange,
  className,
}: {
  label: string
  options: DropdownOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  className?: string
}) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const getValue = (opt: DropdownOption) => (typeof opt === 'string' ? opt : opt.value)
  const getLabel = (opt: DropdownOption) => (typeof opt === 'string' ? opt : opt.label)

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value])
  }

  const selectedLabels = selected.map((v) => {
    const opt = options.find((o) => getValue(o) === v)
    return opt ? getLabel(opt) : v
  })

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-left focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${className ?? ''}`}
      >
        {selected.length === 0 ? (
          <span className="flex-1 truncate">{label}</span>
        ) : (
          <>
            <span className="truncate min-w-0">{selectedLabels.join(', ')}</span>
            <span className="shrink-0">({selected.length})</span>
          </>
        )}
        <svg className="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {options.map((opt) => {
            const v = getValue(opt)
            return (
              <label
                key={v}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(v)}
                  onChange={() => toggle(v)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="truncate">{getLabel(opt)}</span>
              </label>
            )
          })}
          {options.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-400">No options available</div>
          )}
        </div>
      )}
    </div>
  )
}

const PERIOD_OPTIONS = ['I', 'II', 'III', 'IV', 'V', 'Summer']

function getUpcomingPeriod(): { periods: string[]; excludedPeriods: string[]; label: string } {
  const month = new Date().getMonth() + 1
  switch (month) {
    case 8:
      return { periods: ['I'], excludedPeriods: [], label: 'Period I' }
    case 9:
    case 10:
      return { periods: ['II'], excludedPeriods: ['I'], label: 'Period II' }
    case 11:
    case 12:
      return { periods: ['III'], excludedPeriods: [], label: 'Period III' }
    case 2:
    case 3:
      return { periods: ['IV'], excludedPeriods: ['III'], label: 'Period IV' }
    case 4:
      return { periods: ['V'], excludedPeriods: ['IV'], label: 'Period V' }
    default:
      return { periods: ['Summer'], excludedPeriods: [], label: 'Summer' }
  }
}

type PeriodState = 'off' | 'include' | 'exclude'

const PeriodTriStateSelector = ({
  periods,
  excludedPeriods,
  onChange,
}: {
  periods: string[]
  excludedPeriods: string[]
  onChange: (periods: string[], excludedPeriods: string[]) => void
}) => {
  const getState = (p: string): PeriodState => {
    if (periods.includes(p)) return 'include'
    if (excludedPeriods.includes(p)) return 'exclude'
    return 'off'
  }

  const cycle = (p: string) => {
    const state = getState(p)
    if (state === 'off') {
      onChange([...periods, p], excludedPeriods)
    } else if (state === 'include') {
      onChange(
        periods.filter((v) => v !== p),
        [...excludedPeriods, p]
      )
    } else {
      onChange(
        periods,
        excludedPeriods.filter((v) => v !== p)
      )
    }
  }

  return (
    <div className="flex gap-1">
      {PERIOD_OPTIONS.map((p) => {
        const state = getState(p)
        return (
          <button
            key={p}
            type="button"
            onClick={() => cycle(p)}
            className={`px-2 py-1.5 text-sm rounded-md border cursor-pointer transition-colors ${
              state === 'include'
                ? 'bg-blue-100 border-blue-400 text-blue-700'
                : state === 'exclude'
                  ? 'bg-red-100 border-red-400 text-red-700 line-through decoration-2'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
            title={
              state === 'off'
                ? `Click to include period ${p}`
                : state === 'include'
                  ? `Click to exclude period ${p}`
                  : `Click to clear period ${p} filter`
            }
          >
            {p}
          </button>
        )
      })}
    </div>
  )
}

const LEVEL_SORT_ORDER: Record<string, number> = {
  basic: 0,
  intermediate: 1,
  advanced: 2,
  doctoral: 3,
  postgraduate: 3,
}

function levelSortKey(raw: string): number {
  const lower = raw.toLowerCase()
  for (const [keyword, order] of Object.entries(LEVEL_SORT_ORDER)) {
    if (lower.includes(keyword)) return order
  }
  return 99
}

function formatLevel(raw: string): string {
  return raw
    .replace(/[-_]/g, ' ')
    .replace(/\bstudies\b/gi, '')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\b(And|Or|Of|In)\b/g, (w) => w.toLowerCase())
}

function buildLevelOptions(rawLevels: string[]): DropdownOption[] {
  return [...rawLevels]
    .sort((a, b) => levelSortKey(a) - levelSortKey(b))
    .map((raw) => ({ value: raw, label: formatLevel(raw) }))
}

const FilterChip = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
  <button
    type="button"
    onClick={onRemove}
    className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full hover:bg-blue-200 cursor-pointer"
    aria-label={`Remove filter: ${label}`}
  >
    {label}
  </button>
)

const CURRICULUM_LABELS: Record<string, string> = {
  future: 'Future',
  current: 'Current',
  past: 'Past',
}

const CourseFilterPanel = ({ filters, onChange, filterOptions }: Props) => {
  const [expanded, setExpanded] = useState(true)
  const [deptModalOpen, setDeptModalOpen] = useState(false)

  const currentYear = filterOptions?.currentAcademicYear ?? new Date().getFullYear()

  const curriculumOptions = [
    { value: 'future', label: `Future (≥ ${currentYear + 1}–${currentYear + 2})` },
    { value: 'current', label: `Current (${currentYear}–${currentYear + 1})` },
    { value: 'past', label: `Past (≤ ${currentYear - 1}–${currentYear})` },
  ]

  const clearAll = () => onChange({})

  const update = (patch: Partial<CourseFilters>) => onChange({ ...filters, ...patch })

  const chips: { label: string; onRemove: () => void }[] = []

  if (filters.creditsMin != null || filters.creditsMax != null) {
    const min = filters.creditsMin
    const max = filters.creditsMax
    const label =
      min != null && max != null
        ? `Credits: ${min}–${max}`
        : min != null
          ? `Credits: ${min}+`
          : `Credits: ≤ ${max}`
    chips.push({
      label,
      onRemove: () => update({ creditsMin: undefined, creditsMax: undefined }),
    })
  }

  if (filters.periods?.length || filters.excludedPeriods?.length) {
    const parts: string[] = []
    if (filters.periods?.length) parts.push(filters.periods.join(', '))
    if (filters.excludedPeriods?.length) parts.push(`not ${filters.excludedPeriods.join(', ')}`)
    chips.push({
      label: `Period: ${parts.join('; ')}`,
      onRemove: () => update({ periods: undefined, excludedPeriods: undefined }),
    })
  }

  if (filters.departments?.length) {
    const selectedLower = new Set(filters.departments.map((d) => d.toLowerCase()))
    const availableLower = new Set(filterOptions?.departments.map((d) => d.toLowerCase()) ?? [])
    const labels: string[] = []
    const accounted = new Set<string>()
    for (const group of ORG_HIERARCHY) {
      const allDepts = [group.school, ...group.departments]
      const allAvailable = allDepts.filter((d) => availableLower.has(d.toLowerCase()))
      if (
        allAvailable.length > 0 &&
        allAvailable.every((d) => selectedLower.has(d.toLowerCase()))
      ) {
        labels.push(shortenDepartment(group.school))
        allAvailable.forEach((d) => accounted.add(d.toLowerCase()))
      }
    }
    for (const d of filters.departments) {
      if (!accounted.has(d.toLowerCase())) labels.push(shortenDepartment(d))
    }
    const MAX_CHIP_LEN = 60
    let text = labels.join(', ')
    if (text.length > MAX_CHIP_LEN) {
      text = text.slice(0, MAX_CHIP_LEN) + '…'
    }
    chips.push({
      label: `Dept: ${text}`,
      onRemove: () => update({ departments: undefined }),
    })
  }

  if (filters.levels?.length) {
    chips.push({
      label: `Level: ${filters.levels.map(formatLevel).join(', ')}`,
      onRemove: () => update({ levels: undefined }),
    })
  }

  if (filters.minRating != null) {
    chips.push({
      label: `Quality: ${filters.minRating}+`,
      onRemove: () => update({ minRating: undefined }),
    })
  }

  if (filters.hasReviews) {
    chips.push({
      label: 'Has reviews',
      onRemove: () => update({ hasReviews: undefined }),
    })
  }

  if (filters.curriculumPeriods?.length) {
    chips.push({
      label: `Curriculum: ${filters.curriculumPeriods.map((v) => CURRICULUM_LABELS[v] ?? v).join(', ')}`,
      onRemove: () => update({ curriculumPeriods: undefined }),
    })
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
        >
          <svg
            className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
              clipRule="evenodd"
            />
          </svg>
          Filters
        </button>
        {chips.map((chip) => (
          <FilterChip key={chip.label} label={chip.label} onRemove={chip.onRemove} />
        ))}
        {chips.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Clear all
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Minimum rating */}
            <label className="flex flex-col gap-1 text-sm text-gray-600">
              <span>Quality</span>
              <select
                value={filters.minRating ?? ''}
                onChange={(e) =>
                  update({
                    minRating: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 "
              >
                <option value="">Any</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
              </select>
            </label>

            {/* Credits */}
            <div className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Credits</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  min={0}
                  value={filters.creditsMin ?? ''}
                  // 0-credit courses are not meaningful to filter for
                  onChange={(e) =>
                    update({
                      creditsMin:
                        e.target.value && Number(e.target.value) > 0
                          ? Number(e.target.value)
                          : undefined,
                    })
                  }
                  className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-gray-400 text-sm">&ndash;</span>
                <input
                  type="number"
                  placeholder="Max"
                  min={0}
                  value={filters.creditsMax ?? ''}
                  onChange={(e) =>
                    update({
                      creditsMax:
                        e.target.value && Number(e.target.value) > 0
                          ? Number(e.target.value)
                          : undefined,
                    })
                  }
                  className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Period */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-gray-600">Period</span>
                <button
                  type="button"
                  onClick={() => {
                    const upcoming = getUpcomingPeriod()
                    update({
                      periods: upcoming.periods,
                      excludedPeriods: upcoming.excludedPeriods.length > 0 ? upcoming.excludedPeriods : undefined,
                    })
                  }}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs rounded border border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer transition-colors"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2zm6 10l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3zM5 16l.67 2.33L8 19l-2.33.67L5 22l-.67-2.33L2 19l2.33-.67L5 16z"/></svg>
                  Select upcoming
                </button>
              </div>
              <PeriodTriStateSelector
                periods={filters.periods ?? []}
                excludedPeriods={filters.excludedPeriods ?? []}
                onChange={(periods, excludedPeriods) =>
                  update({
                    periods: periods.length > 0 ? periods : undefined,
                    excludedPeriods: excludedPeriods.length > 0 ? excludedPeriods : undefined,
                  })
                }
              />
            </div>

            {/* Level */}
            <div className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Level</span>
              <MultiSelectDropdown
                label="All levels"
                options={buildLevelOptions(filterOptions?.levels ?? [])}
                selected={filters.levels ?? []}
                onChange={(levels) => update({ levels: levels.length > 0 ? levels : undefined })}
                className="w-34"
              />
            </div>

            {/* Curriculum period */}
            <div className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Curriculum</span>
              <MultiSelectDropdown
                label="All curriculums"
                options={curriculumOptions}
                selected={filters.curriculumPeriods ?? []}
                onChange={(curriculumPeriods) =>
                  update({
                    curriculumPeriods: curriculumPeriods.length > 0 ? curriculumPeriods : undefined,
                  })
                }
                className="w-48"
              />
            </div>

            {/* Department */}
            <div className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Department</span>
              <button
                type="button"
                onClick={() => setDeptModalOpen(true)}
                className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-left w-32 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {(filters.departments?.length ?? 0) === 0 ? (
                  <span className="flex-1 truncate">All departments</span>
                ) : (
                  <>
                    <span className="truncate min-w-0">{filters.departments!.join(', ')}</span>
                    <span className="shrink-0">({filters.departments!.length})</span>
                  </>
                )}
              </button>
            </div>

            <DepartmentFilterModal
              open={deptModalOpen}
              onClose={() => setDeptModalOpen(false)}
              availableDepartments={filterOptions?.departments ?? []}
              selected={filters.departments ?? []}
              onChange={(departments) =>
                update({ departments: departments.length > 0 ? departments : undefined })
              }
            />

            {/* Has reviews */}
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer self-end py-2">
              <input
                type="checkbox"
                checked={filters.hasReviews ?? false}
                onChange={(e) => update({ hasReviews: e.target.checked || undefined })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Only courses with reviews
            </label>
          </div>
        </div>
      )}
    </div>
  )
}

export default CourseFilterPanel
