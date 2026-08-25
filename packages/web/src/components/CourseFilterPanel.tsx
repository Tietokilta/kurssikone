import { useState, useEffect, useRef } from 'react'
import { CourseFilterOptions, CourseFilters } from '@kurssikone/shared'
import DepartmentFilterModal, { ORG_HIERARCHY } from './DepartmentFilterModal'

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
}: {
  label: string
  options: DropdownOption[]
  selected: string[]
  onChange: (selected: string[]) => void
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
    onChange(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-left min-w-[12rem] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      >
        <span className="flex-1 truncate">
          {selected.length === 0 ? label : `${label} (${selected.length})`}
        </span>
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

const LEVEL_SORT_ORDER: Record<string, number> = {
  'basic': 0,
  'intermediate': 1,
  'advanced': 2,
  'doctoral': 3,
  'postgraduate': 3,
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

const FilterChip = ({
  label,
  onRemove,
}: {
  label: string
  onRemove: () => void
}) => (
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

  if (filters.periods?.length) {
    chips.push({
      label: `Period: ${filters.periods.join(', ')}`,
      onRemove: () => update({ periods: undefined }),
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
        labels.push(group.school)
        allAvailable.forEach((d) => accounted.add(d.toLowerCase()))
      }
    }
    for (const d of filters.departments) {
      if (!accounted.has(d.toLowerCase())) labels.push(d)
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
                      creditsMin: e.target.value && Number(e.target.value) > 0 ? Number(e.target.value) : undefined,
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
                      creditsMax: e.target.value && Number(e.target.value) > 0 ? Number(e.target.value) : undefined,
                    })
                  }
                  className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Period */}
            <div className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Period</span>
              <MultiSelectDropdown
                label="All periods"
                options={PERIOD_OPTIONS}
                selected={filters.periods ?? []}
                onChange={(periods) => update({ periods: periods.length > 0 ? periods : undefined })}
              />
            </div>

            {/* Level */}
            <div className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Level</span>
              <MultiSelectDropdown
                label="All levels"
                options={buildLevelOptions(filterOptions?.levels ?? [])}
                selected={filters.levels ?? []}
                onChange={(levels) =>
                  update({ levels: levels.length > 0 ? levels : undefined })
                }
              />
            </div>

            {/* Minimum rating */}
            <label className="flex flex-col gap-1 text-sm text-gray-600">
              <span>Min quality</span>
              <select
                value={filters.minRating ?? ''}
                onChange={(e) =>
                  update({
                    minRating: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-w-[7rem]"
              >
                <option value="">Any</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
              </select>
            </label>

            {/* Curriculum period */}
            <div className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Curriculum</span>
              <MultiSelectDropdown
                label="All periods"
                options={curriculumOptions}
                selected={filters.curriculumPeriods ?? []}
                onChange={(curriculumPeriods) =>
                  update({
                    curriculumPeriods: curriculumPeriods.length > 0 ? curriculumPeriods : undefined,
                  })
                }
              />
            </div>

            {/* Department */}
            <div className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Department</span>
              <button
                type="button"
                onClick={() => setDeptModalOpen(true)}
                className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-left min-w-[12rem] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <span className="flex-1 truncate">
                  {(filters.departments?.length ?? 0) === 0
                    ? 'All departments'
                    : `All departments (${filters.departments!.length})`}
                </span>
                <svg className="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
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
