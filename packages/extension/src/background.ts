/**
 * Standalone `tsc` compiles this file to `background.js` without webpack; keep it free of
 * `import`/`export` so output is a plain script (no `exports` in the extension background).
 * Same algorithm as `utils/inferSisuFirstStudyYear.ts` (keep in sync).
 */
const ROOT_DATE_SUFFIX = /-(\d{4})-\d{2}-\d{2}$/

function academicYearStartCalendarYear(now: Date): number {
  const y = now.getFullYear()
  const month = now.getMonth() + 1
  return month >= 8 ? y : y - 1
}

function inferFirstYearForKoriStudyYearsBg(plan: {
  rootId?: string | null
  curriculumPeriodId?: string | null
}): number {
  const root = plan.rootId?.trim() ?? ''
  const fromRoot = root.match(ROOT_DATE_SUFFIX)
  if (fromRoot) {
    const y = parseInt(fromRoot[1], 10)
    if (y >= 1990 && y <= 2100) return y
  }

  const cp = plan.curriculumPeriodId?.trim() ?? ''
  const fromCp = cp.match(/\b(20\d{2})\b/)
  if (fromCp) {
    const y = parseInt(fromCp[1], 10)
    if (y >= 1990 && y <= 2100) return y
  }

  const academicStart = academicYearStartCalendarYear(new Date())
  return Math.max(1990, academicStart - 10)
}

/** Kori study-years: cover from `firstYear` through current academic year plus forward margin (matches Sisu UI ranges). */
function numberOfKoriStudyYearsFromFirst(firstYear: number, now = new Date()): number {
  const currentStart = academicYearStartCalendarYear(now)
  const inclusiveSpan = Math.max(1, currentStart - firstYear + 1)
  return Math.min(50, inclusiveSpan + 7)
}

const IS_PRODUCTION = false

const host = IS_PRODUCTION
  ? 'https://sisu-course-reviewer-api.otju.dev/api'
  : 'http://localhost:3001/api'

const get = async (
  pathParts: string[],
  query: { [key: string]: string | undefined | null } = {}
) => {
  let url = `${host}/${pathParts.join('/')}`

  for (let param in { ...query }) {
    if (query[param] === undefined || query[param] === null || query[param] === '') {
      delete query[param]
    }
  }

  const queryString = new URLSearchParams(query as { [key: string]: string }).toString()

  url += queryString ? `?${queryString}` : ''

  const response = await fetch(url)

  if (response.status === 404) {
    return null
  }

  return await response.json()
}

const post = async (pathParts: string[], body: { [key: string]: any }) => {
  let url = `${host}/${pathParts.join('/')}`

  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

const del = async (pathParts: string[], body: { [key: string]: any }) => {
  let url = `${host}/${pathParts.join('/')}`

  console.log(body)
  await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'get') {
    get(request.pathParts, request.query).then((res) => sendResponse(res))
  }
  if (request.type === 'post') {
    post(request.pathParts, request.body).then((res) => sendResponse(res))
  }
  if (request.type === 'delete') {
    del(request.pathParts, request.body).then((res) => sendResponse(res))
  }
  if (request.type === 'fetchStudyPlans') {
    dedupeSisuFetch('sisu:my-plans', fetchStudyPlansFromSisu).then((res) => sendResponse(res))
  }
  if (request.type === 'fetchAttainments') {
    dedupeSisuFetch(`sisu:attainments:${request.personId}`, () =>
      fetchAttainmentsFromSisu(request.personId)
    ).then((res) => sendResponse(res))
  }
  if (request.type === 'fetchStudyYears') {
    const organisationId =
      typeof request.organisationId === 'string' && request.organisationId.trim()
        ? request.organisationId.trim()
        : 'aalto-university-root-id'
    const fy = request.firstYear
    const firstYear =
      typeof fy === 'number' &&
      Number.isInteger(fy) &&
      fy >= 1990 &&
      fy <= 2100
        ? fy
        : inferFirstYearForKoriStudyYearsBg({
            rootId: organisationId,
            curriculumPeriodId:
              typeof request.curriculumPeriodId === 'string' ? request.curriculumPeriodId : '',
          })
    dedupeSisuFetch(`sisu:study-years:${organisationId}:${firstYear}`, () =>
      fetchStudyYearsFromSisu(organisationId, firstYear)
    ).then((res) => sendResponse(res))
  }
  if (request.type === 'updateStudyPlan') {
    putStudyPlanToSisu(request.planId, request.plan).then((res) => sendResponse(res))
  }
  return true
})

const filter = {
  urls: ['https://sisu.aalto.fi/*'],
}

const LOG = '[Kurssikompassi/Sisu]'

console.log('Background script running...')

let sisuAuthToken: string | undefined = undefined

/** Coalesce concurrent identical Sisu reads (e.g. double message or rapid tab opens). */
const inFlight = new Map<string, Promise<unknown>>()

function dedupeSisuFetch<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key) as Promise<T> | undefined
  if (existing) {
    return existing
  }
  const p = run().finally(() => {
    if (inFlight.get(key) === p) {
      inFlight.delete(key)
    }
  })
  inFlight.set(key, p)
  return p
}

function logSisuFailure(
  label: string,
  url: string,
  info: { status?: number; statusText?: string; bodySnippet?: string; error?: string }
): void {
  console.error(LOG, label, 'failed', { url, ...info })
}

function sisuFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (sisuAuthToken) {
    headers.set('Authorization', sisuAuthToken)
  }
  return fetch(url, {
    ...init,
    credentials: 'include',
    headers,
  })
}

chrome.webRequest.onBeforeSendHeaders.addListener(
  function (details) {
    for (let header of details.requestHeaders || []) {
      if (header.name.toLowerCase() === 'authorization' && header.value) {
        if (header.value !== sisuAuthToken) {
          sisuAuthToken = header.value
          console.info(LOG, 'Captured new Authorization header (token updated; no auto-fetch)')
        }
        break
      }
    }
  },
  filter,
  ['requestHeaders']
)

type FetchStudyPlansResult =
  | { ok: true; data: import('./utils/types').SisuMyPlansResponse }
  | { ok: false; error: 'no_sisu_token' }
  | { ok: false; error: 'fetch_failed'; message?: string }

async function fetchStudyPlansFromSisu(): Promise<FetchStudyPlansResult> {
  const url = 'https://sisu.aalto.fi/osuva/api/my-plans'
  if (!sisuAuthToken) {
    console.warn(LOG, 'my-plans skipped: no Authorization token captured yet', { url })
    return { ok: false, error: 'no_sisu_token' }
  }

  try {
    const response = await sisuFetch(url)
    if (!response.ok) {
      const text = await response.text()
      logSisuFailure('my-plans', url, {
        status: response.status,
        statusText: response.statusText,
        bodySnippet: text.slice(0, 300),
      })
      return {
        ok: false,
        error: 'fetch_failed',
        message: text ? `${response.status}: ${text.slice(0, 200)}` : response.statusText,
      }
    }
    const data = (await response.json()) as import('./utils/types').SisuMyPlansResponse
    return { ok: true, data }
  } catch (err) {
    logSisuFailure('my-plans', url, { error: String(err) })
    return { ok: false, error: 'fetch_failed', message: String(err) }
  }
}

type FetchAttainmentsResult =
  | { ok: true; data: import('./utils/types').SisuAttainmentsResponse }
  | { ok: false; error: 'no_sisu_token' }
  | { ok: false; error: 'fetch_failed'; message?: string }

type FetchStudyYearsResult =
  | { ok: true; data: import('./utils/types').SisuStudyYearsResponse }
  | { ok: false; error: 'no_sisu_token' }
  | { ok: false; error: 'fetch_failed'; message?: string }

async function fetchStudyYearsFromSisu(
  organisationId: string,
  firstYear: number
): Promise<FetchStudyYearsResult> {
  const url = new URL('https://sisu.aalto.fi/kori/api/study-years')
  url.searchParams.set('organisationId', organisationId)
  url.searchParams.set('firstYear', String(firstYear))
  url.searchParams.set('numberOfYears', String(numberOfKoriStudyYearsFromFirst(firstYear)))
  const urlStr = url.toString()
  try {
    const response = await sisuFetch(urlStr)
    if (!response.ok) {
      const text = await response.text()
      logSisuFailure('study-years', urlStr, {
        status: response.status,
        statusText: response.statusText,
        bodySnippet: text.slice(0, 300),
      })
      return {
        ok: false,
        error: 'fetch_failed',
        message: text ? `${response.status}: ${text.slice(0, 200)}` : response.statusText,
      }
    }
    const raw: unknown = await response.json()
    const data = Array.isArray(raw)
      ? raw
      : raw && typeof raw === 'object' && 'content' in raw && Array.isArray((raw as { content: unknown }).content)
        ? (raw as { content: import('./utils/types').SisuStudyYearsResponse }).content
        : null
    if (!Array.isArray(data)) {
      const kind = raw === null || raw === undefined ? 'null' : typeof raw
      logSisuFailure('study-years', urlStr, {
        error: `unexpected JSON shape (${kind})`,
        bodySnippet: typeof raw === 'object' ? JSON.stringify(raw).slice(0, 300) : String(raw),
      })
      return { ok: false, error: 'fetch_failed', message: 'study-years: expected JSON array' }
    }
    return { ok: true, data: data as import('./utils/types').SisuStudyYearsResponse }
  } catch (err) {
    logSisuFailure('study-years', urlStr, { error: String(err) })
    return { ok: false, error: 'fetch_failed', message: String(err) }
  }
}

async function fetchAttainmentsFromSisu(personId: string): Promise<FetchAttainmentsResult> {
  const url = new URL('https://sisu.aalto.fi/ori/api/attainments')
  url.searchParams.set('personId', personId)
  const urlStr = url.toString()

  if (!sisuAuthToken) {
    console.warn(LOG, 'attainments skipped: no Authorization token captured yet', {
      url: urlStr,
      personId,
    })
    return { ok: false, error: 'no_sisu_token' }
  }

  try {
    const response = await sisuFetch(urlStr)
    if (!response.ok) {
      const text = await response.text()
      logSisuFailure('attainments', urlStr, {
        status: response.status,
        statusText: response.statusText,
        bodySnippet: text.slice(0, 300),
      })
      return {
        ok: false,
        error: 'fetch_failed',
        message: text ? `${response.status}: ${text.slice(0, 200)}` : response.statusText,
      }
    }
    const data = (await response.json()) as import('./utils/types').SisuAttainmentsResponse
    return { ok: true, data }
  } catch (err) {
    logSisuFailure('attainments', urlStr, { error: String(err) })
    return { ok: false, error: 'fetch_failed', message: String(err) }
  }
}

type UpdateStudyPlanResult =
  | { ok: true }
  | {
      ok: false
      error: 'no_sisu_token' | 'fetch_failed'
      status?: number
      message?: string
    }

async function putStudyPlanToSisu(
  planId: string,
  plan: import('./utils/types').SisuStudyPlan
): Promise<UpdateStudyPlanResult> {
  const url = `https://sisu.aalto.fi/osuva/api/my-plans/${encodeURIComponent(planId)}`
  if (!sisuAuthToken) {
    console.warn(LOG, 'PUT my-plans skipped: no Authorization token', { url, planId })
    return { ok: false, error: 'no_sisu_token' }
  }

  try {
    const response = await sisuFetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan),
    })
    if (!response.ok) {
      const text = await response.text()
      logSisuFailure('PUT my-plans', url, {
        status: response.status,
        statusText: response.statusText,
        bodySnippet: text.slice(0, 300),
      })
      return {
        ok: false,
        error: 'fetch_failed',
        status: response.status,
        message: text || response.statusText,
      }
    }
    return { ok: true }
  } catch (err) {
    logSisuFailure('PUT my-plans', url, { error: String(err) })
    return { ok: false, error: 'fetch_failed', message: String(err) }
  }
}
