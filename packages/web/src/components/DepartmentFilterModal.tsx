import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

const DEPARTMENT_NAMES_FI: Record<string, string> = {
  'Open University': 'Avoin yliopisto',
  'Aalto University, Language Centre': 'Kielikeskus',
  'Other separate courses': 'Erilliset yleisopintojen opintojaksot',
  'School of Arts, Design and Architecture': 'Taiteiden ja suunnittelun korkeakoulu',
  'School services, ARTS': 'School services, ARTS',
  'Department of Media': 'Media',
  'Department of Design': 'Muotoilu',
  'Department of Art': 'Taide',
  'Department of Architecture': 'Arkkitehtuuri',
  'Department of Film': 'Elokuvataide',
  'Department of Art and Media': 'Taide ja media',
  'School of Business': 'Kauppakorkeakoulu',
  'School Services, BIZ': 'School Services, BIZ',
  'Department of Accounting & Business Law': 'Laskentatoimi ja yritysjuridiikka',
  'Department of Marketing': 'Markkinointi',
  'Department of Economics': 'Taloustiede',
  'Department of Finance': 'Rahoitus',
  'Department of Management Studies': 'Johtaminen',
  'Department of Information and Service Management': 'Tieto- ja palvelujohtaminen',
  'School of Chemical Engineering': 'Kemian tekniikan korkeakoulu',
  'Department of Chemical and Metallurgical Engineering': 'Kemian tekniikka ja metallurgia',
  'Department of Chemistry and Materials Science': 'Kemia ja materiaalitiede',
  'Department of Bioproducts and Biosystems': 'Biotuotteet ja biotekniikka',
  'School of Electrical Engineering': 'Sähkötekniikan korkeakoulu',
  'Department of Electronics and Nanoengineering': 'Elektroniikka ja nanotekniikka',
  'Department of Signal Processing and Acoustics': 'Signaalinkäsittely ja akustiikka',
  'Department of Communications and Networking': 'Tietoliikenne- ja tietoverkkotekniikka',
  'Department of lnformation and Communications Engineering': 'Informaatio- ja tietoliikennetekniikka',
  'Department of Information and Communications Engineering': 'Informaatio- ja tietoliikennetekniikka',
  'Department of Electrical Engineering and Automation': 'Sähkötekniikka ja automaatio',
  'School of Engineering': 'Insinööritieteiden korkeakoulu',
  'Aalto University School of Engineering': 'Insinööritieteiden korkeakoulun yhteiset',
  'Department of Built Environment': 'Rakennettu ympäristö',
  'Department of Civil Engineering': 'Rakennustekniikka',
  'Department of Energy and Mechanical Engineering': 'Energia- ja konetekniikka',
  'School of Science': 'Perustieteiden korkeakoulu',
  'Aalto University School of Science': 'Perustieteiden korkeakoulun yhteiset',
  'Department of Mathematics and Systems Analysis': 'Matematiikka ja systeemianalyysi',
  'Department of Applied Physics': 'Teknillinen fysiikka',
  'Department of Industrial Engineering and Management': 'Tuotantotalous',
  'Department of Computer Science': 'Tietotekniikka',
  'Department of Neuroscience and Biomedical Engineering': 'Neurotiede ja lääketieteellinen tekniikka',
  'Common services': 'Yhteiset palvelut',
  'Aalto University': 'Aalto-yliopisto',
}

export function getDepartmentDisplayName(name: string, isFi: boolean): string {
  if (!isFi) return shortenDepartment(name)
  return DEPARTMENT_NAMES_FI[name] ?? shortenDepartment(name)
}

export function getSchoolDisplayName(name: string, isFi: boolean): string {
  if (!isFi) return shortenSchool(name)
  return DEPARTMENT_NAMES_FI[name] ?? shortenSchool(name)
}

// Static org hierarchy from Sisu API:
// GET https://sisu.aalto.fi/kori/api/organisations?universityOrgId=aalto-university-root-id
export const ORG_HIERARCHY: { school: string; departments: string[] }[] = [
  {
    school: 'School of Arts, Design and Architecture',
    departments: [
      'Department of Architecture',
      'Department of Art',
      'Department of Art and Media',
      'Department of Design',
      'Department of Film',
      'Department of Media',
      'School services, ARTS',
    ],
  },
  {
    school: 'School of Business',
    departments: [
      'Department of Accounting & Business Law',
      'Department of Economics',
      'Department of Finance',
      'Department of Information and Service Management',
      'Department of Management Studies',
      'Department of Marketing',
      'School Services, BIZ',
    ],
  },
  {
    school: 'School of Chemical Engineering',
    departments: [
      'Department of Bioproducts and Biosystems',
      'Department of Chemical and Metallurgical Engineering',
      'Department of Chemistry and Materials Science',
    ],
  },
  {
    school: 'School of Electrical Engineering',
    departments: [
      'Department of Communications and Networking',
      'Department of Electrical Engineering and Automation',
      'Department of Electronics and Nanoengineering',
      'Department of Information and Communications Engineering',
      'Department of lnformation and Communications Engineering',
      'Department of Signal Processing and Acoustics',
    ],
  },
  {
    school: 'School of Engineering',
    departments: [
      'Aalto University School of Engineering',
      'Department of Built Environment',
      'Department of Civil Engineering',
      'Department of Energy and Mechanical Engineering',
    ],
  },
  {
    school: 'School of Science',
    departments: [
      'Aalto University School of Science',
      'Department of Applied Physics',
      'Department of Computer Science',
      'Department of Industrial Engineering and Management',
      'Department of Mathematics and Systems Analysis',
      'Department of Neuroscience and Biomedical Engineering',
    ],
  },
  {
    school: 'Common services',
    departments: [
      'Aalto University, Language Centre',
      'Open University',
      'Other separate courses',
    ],
  },
]

export function shortenDepartment(name: string): string {
  if (/^Aalto University$/i.test(name.trim())) return name
  return name
    .replace(/^Aalto University School of /i, 'Sch. of ')
    .replace(/^Aalto University,? ?/i, '')
    .replace(/^School of /i, 'Sch. of ')
    .replace(/^Department of /i, '')
}

function shortenSchool(name: string): string {
  return name.replace(/^School of /i, 'Sch. of ')
}

function buildTree(availableDepartments: string[]) {
  const lowerToActual = new Map(availableDepartments.map((d) => [d.toLowerCase(), d]))
  const matched = new Set<string>()

  const groups = ORG_HIERARCHY.map((group) => {
    const depts: string[] = []
    const actual = lowerToActual.get(group.school.toLowerCase())
    if (actual) {
      depts.push(actual)
      matched.add(actual)
    }
    for (const d of group.departments) {
      const act = lowerToActual.get(d.toLowerCase())
      if (act) {
        depts.push(act)
        matched.add(act)
      }
    }
    return { school: group.school, departments: depts }
  }).filter((g) => g.departments.length > 0)

  const ungrouped = availableDepartments.filter((d) => !matched.has(d))

  return { groups, ungrouped }
}

type Props = {
  open: boolean
  onClose: () => void
  availableDepartments: string[]
  selected: string[]
  onChange: (selected: string[]) => void
}

const DepartmentFilterModal = ({
  open,
  onClose,
  availableDepartments,
  selected,
  onChange,
}: Props) => {
  const { t, i18n } = useTranslation()
  const isFi = i18n.language === 'fi'
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set(selected))
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) setLocalSelected(new Set(selected))
  }, [open, selected])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const { groups, ungrouped } = buildTree(availableDepartments)

  const toggle = (dept: string) => {
    const next = new Set(localSelected)
    if (next.has(dept)) next.delete(dept)
    else next.add(dept)
    setLocalSelected(next)
  }

  const toggleSchool = (departments: string[]) => {
    const next = new Set(localSelected)
    const allSelected = departments.every((d) => next.has(d))
    if (allSelected) {
      departments.forEach((d) => next.delete(d))
    } else {
      departments.forEach((d) => next.add(d))
    }
    setLocalSelected(next)
  }

  const apply = () => {
    const result = availableDepartments.filter((d) => localSelected.has(d))
    onChange(result.length > 0 ? result : [])
    onClose()
  }

  const clearAll = () => setLocalSelected(new Set())

  const schoolCheckState = (departments: string[]): 'all' | 'some' | 'none' => {
    const count = departments.filter((d) => localSelected.has(d)).length
    if (count === 0) return 'none'
    if (count === departments.length) return 'all'
    return 'some'
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose()
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{t('web.selectDepartments')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {groups.map((group) => {
            const state = schoolCheckState(group.departments)
            return (
              <div key={group.school} className="mb-3">
                <label className="flex items-center gap-2 py-1.5 cursor-pointer font-medium text-sm text-gray-900">
                  <input
                    type="checkbox"
                    checked={state === 'all'}
                    ref={(el) => {
                      if (el) el.indeterminate = state === 'some'
                    }}
                    onChange={() => toggleSchool(group.departments)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {getSchoolDisplayName(group.school, isFi)}
                </label>
                <div className="ml-6">
                  {group.departments.map((dept) => (
                    <label
                      key={dept}
                      className="flex items-center gap-2 py-1 cursor-pointer text-sm text-gray-700 hover:text-gray-900"
                    >
                      <input
                        type="checkbox"
                        checked={localSelected.has(dept)}
                        onChange={() => toggle(dept)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      {getDepartmentDisplayName(dept, isFi)}
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
          {ungrouped.map((dept) => (
            <label
              key={dept}
              className="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-700 hover:text-gray-900"
            >
              <input
                type="checkbox"
                checked={localSelected.has(dept)}
                onChange={() => toggle(dept)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              {getDepartmentDisplayName(dept, isFi)}
            </label>
          ))}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200">
          <button
            type="button"
            onClick={clearAll}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {t('web.clearAll')}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {t('web.cancel')}
            </button>
            <button
              type="button"
              onClick={apply}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              {t('web.apply')}{localSelected.size > 0 ? ` (${localSelected.size})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DepartmentFilterModal
