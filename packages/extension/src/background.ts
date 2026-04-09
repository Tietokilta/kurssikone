/**
 * Standalone `tsc` compiles this file to `background.js` without webpack; keep it free of
 * `import`/`export` so output is a plain script (no `exports` in the extension background).
 */
function academicYearStartCalendarYear(now: Date): number {
  const y = now.getFullYear()
  const month = now.getMonth() + 1
  return month >= 8 ? y : y - 1
}

/** Matches `defaultFirstStudyYearWhenNoAttainments` in `utils/inferSisuFirstStudyYear.ts`. */
function defaultFirstStudyYearBg(now = new Date()): number {
  const academicStart = academicYearStartCalendarYear(now)
  return Math.max(1990, academicStart - 10)
}

/** Kori study-years: cover from `firstYear` through current academic year plus forward margin (matches Sisu UI ranges). */
function numberOfKoriStudyYearsFromFirst(firstYear: number, now = new Date()): number {
  const currentStart = academicYearStartCalendarYear(now)
  const inclusiveSpan = Math.max(1, currentStart - firstYear + 1)
  return Math.min(50, inclusiveSpan + 7)
}

/** Max course unit ids per `/kori/api/course-units` request (URL length; HAR uses ~50). */
const COURSE_UNITS_CHUNK_MAX = 45

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
  if (request.type === 'initSisuAuth') {
    dedupeSisuFetch('sisu:init-auth', () => ensureValidSisuAuth()).then((ok) =>
      sendResponse(ok ? { ok: true } : { ok: false })
    )
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
      typeof fy === 'number' && Number.isInteger(fy) && fy >= 1990 && fy <= 2100
        ? fy
        : defaultFirstStudyYearBg()
    dedupeSisuFetch(`sisu:study-years:${organisationId}:${firstYear}`, () =>
      fetchStudyYearsFromSisu(organisationId, firstYear)
    ).then((res) => sendResponse(res))
  }
  if (request.type === 'updateStudyPlan') {
    putStudyPlanToSisu(request.planId, request.plan).then((res) => sendResponse(res))
  }
  if (request.type === 'fetchCourseUnits') {
    const raw = request.ids
    const ids = Array.isArray(raw) ? raw.filter((x: unknown) => typeof x === 'string') : []
    fetchCourseUnitsFromSisu(ids as string[]).then((res) => sendResponse(res))
  }
  return true
})

const filter = {
  urls: ['https://sisu.aalto.fi/*'],
}

const LOG = '[Kurssikompassi/Sisu]'
const SISU_PREAUTH_URL = 'https://sisu.aalto.fi/ori/preauth'
const EXPIRY_SAFETY_BUFFER_MS = 15_000
const FALLBACK_CAPTURED_TOKEN_TTL_MS = 2 * 60 * 1000

console.log('Background script running...')

let sisuAuthToken: string | undefined = undefined
let sisuAuthExpiresAtMs: number | undefined = undefined
let sisuAuthRefreshInFlight: Promise<boolean> | null = null

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

function normalizeAuthHeaderValue(token: string): string {
  const trimmed = token.trim()
  if (trimmed.toLowerCase().startsWith('bearer ')) {
    return trimmed
  }
  return `Bearer ${trimmed}`
}

function stripBearerPrefix(authHeader: string): string {
  const trimmed = authHeader.trim()
  return trimmed.toLowerCase().startsWith('bearer ') ? trimmed.slice(7).trim() : trimmed
}

function parseJwtExpMs(authHeader: string): number | null {
  try {
    const token = stripBearerPrefix(authHeader)
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = payloadBase64 + '='.repeat((4 - (payloadBase64.length % 4)) % 4)
    const payloadJson = atob(padded)
    const payload = JSON.parse(payloadJson) as { exp?: unknown }
    if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) {
      return null
    }
    return payload.exp * 1000
  } catch {
    return null
  }
}

function parseEpochSecondsToMs(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw * 1000
  }
  if (typeof raw === 'string' && raw.trim()) {
    const n = Number(raw)
    if (Number.isFinite(n)) {
      return n * 1000
    }
  }
  return null
}

function resolveExpiryMs(params: {
  authHeader: string
  expiresIn?: number | null
  sessionExpiresAt?: unknown
  sessionTimeoutAt?: unknown
}): number {
  const now = Date.now()
  const candidates: number[] = []

  const jwtExp = parseJwtExpMs(params.authHeader)
  if (jwtExp && jwtExp > now) candidates.push(jwtExp)

  if (
    typeof params.expiresIn === 'number' &&
    Number.isFinite(params.expiresIn) &&
    params.expiresIn > 0
  ) {
    candidates.push(now + params.expiresIn * 1000)
  }

  const sessionExp = parseEpochSecondsToMs(params.sessionExpiresAt)
  if (sessionExp && sessionExp > now) candidates.push(sessionExp)

  const timeoutExp = parseEpochSecondsToMs(params.sessionTimeoutAt)
  if (timeoutExp && timeoutExp > now) candidates.push(timeoutExp)

  const soonest =
    candidates.length > 0 ? Math.min(...candidates) : now + FALLBACK_CAPTURED_TOKEN_TTL_MS
  return Math.max(now + 1_000, soonest - EXPIRY_SAFETY_BUFFER_MS)
}

function setSisuAuthState(
  authHeader: string,
  expiry: { expiresIn?: number | null; sessionExpiresAt?: unknown; sessionTimeoutAt?: unknown }
): void {
  sisuAuthToken = normalizeAuthHeaderValue(authHeader)
  sisuAuthExpiresAtMs = resolveExpiryMs({
    authHeader: sisuAuthToken,
    expiresIn: expiry.expiresIn ?? null,
    sessionExpiresAt: expiry.sessionExpiresAt,
    sessionTimeoutAt: expiry.sessionTimeoutAt,
  })
}

function hasUsableSisuAuth(): boolean {
  if (!sisuAuthToken) return false
  if (!sisuAuthExpiresAtMs) return false
  return Date.now() < sisuAuthExpiresAtMs
}

async function fetchSisuPreauth(): Promise<boolean> {
  try {
    const response = await fetch(SISU_PREAUTH_URL, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json, text/plain, */*',
      },
    })
    if (!response.ok) {
      const text = await response.text()
      logSisuFailure('preauth', SISU_PREAUTH_URL, {
        status: response.status,
        statusText: response.statusText,
        bodySnippet: text.slice(0, 300),
      })
      return false
    }

    const raw = (await response.json()) as {
      authToken?: unknown
      expiresIn?: unknown
      sessionExpiresAt?: unknown
      sessionTimeoutAt?: unknown
    }

    if (typeof raw.authToken !== 'string' || !raw.authToken.trim()) {
      logSisuFailure('preauth', SISU_PREAUTH_URL, {
        error: 'missing authToken in preauth response',
        bodySnippet: JSON.stringify(raw).slice(0, 300),
      })
      return false
    }

    setSisuAuthState(raw.authToken, {
      expiresIn: typeof raw.expiresIn === 'number' ? raw.expiresIn : null,
      sessionExpiresAt: raw.sessionExpiresAt,
      sessionTimeoutAt: raw.sessionTimeoutAt,
    })
    console.info(LOG, 'Preauth succeeded; token and expiry updated')
    return true
  } catch (err) {
    logSisuFailure('preauth', SISU_PREAUTH_URL, { error: String(err) })
    return false
  }
}

async function ensureValidSisuAuth(options: { forceRefresh?: boolean } = {}): Promise<boolean> {
  const forceRefresh = options.forceRefresh === true
  if (!forceRefresh && hasUsableSisuAuth()) {
    return true
  }
  if (sisuAuthRefreshInFlight) {
    return sisuAuthRefreshInFlight
  }
  sisuAuthRefreshInFlight = (async () => {
    const ok = await fetchSisuPreauth()
    return ok && hasUsableSisuAuth()
  })().finally(() => {
    sisuAuthRefreshInFlight = null
  })
  return sisuAuthRefreshInFlight
}

async function sisuFetchWithAuth(
  url: string,
  init: RequestInit = {}
): Promise<{ ok: true; response: Response } | { ok: false; error: 'no_sisu_token' }> {
  const hasAuth = await ensureValidSisuAuth()
  if (!hasAuth) {
    return { ok: false, error: 'no_sisu_token' }
  }

  let response = await sisuFetch(url, init)
  if (response.status === 401 || response.status === 403) {
    console.warn(LOG, 'Sisu request unauthorized; forcing auth refresh and retry', {
      url,
      status: response.status,
    })
    const refreshed = await ensureValidSisuAuth({ forceRefresh: true })
    if (!refreshed) {
      return { ok: false, error: 'no_sisu_token' }
    }
    response = await sisuFetch(url, init)
  }
  return { ok: true, response }
}

chrome.webRequest.onBeforeSendHeaders.addListener(
  function (details) {
    for (let header of details.requestHeaders || []) {
      if (header.name.toLowerCase() === 'authorization' && header.value) {
        if (header.value !== sisuAuthToken) {
          setSisuAuthState(header.value, {})
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
  try {
    const authResponse = await sisuFetchWithAuth(url)
    if (!authResponse.ok) {
      console.warn(LOG, 'my-plans skipped: no valid Sisu auth', { url })
      return { ok: false, error: 'no_sisu_token' }
    }
    const response = authResponse.response
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
    const authResponse = await sisuFetchWithAuth(urlStr)
    if (!authResponse.ok) {
      console.warn(LOG, 'study-years skipped: no valid Sisu auth', { url: urlStr })
      return { ok: false, error: 'no_sisu_token' }
    }
    const response = authResponse.response
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
      : raw &&
          typeof raw === 'object' &&
          'content' in raw &&
          Array.isArray((raw as { content: unknown }).content)
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

  try {
    const authResponse = await sisuFetchWithAuth(urlStr)
    if (!authResponse.ok) {
      console.warn(LOG, 'attainments skipped: no valid Sisu auth', {
        url: urlStr,
        personId,
      })
      return { ok: false, error: 'no_sisu_token' }
    }
    const response = authResponse.response
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
  try {
    const authResponse = await sisuFetchWithAuth(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan),
    })
    if (!authResponse.ok) {
      console.warn(LOG, 'PUT my-plans skipped: no valid Sisu auth', { url, planId })
      return { ok: false, error: 'no_sisu_token' }
    }
    const response = authResponse.response
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

type FetchCourseUnitsResult =
  | { ok: true; data: import('./utils/types').SisuKoriCourseUnit[] }
  | { ok: false; error: 'no_sisu_token' }
  | { ok: false; error: 'fetch_failed'; message?: string }

async function fetchCourseUnitsChunkFromSisu(ids: string[]): Promise<FetchCourseUnitsResult> {
  if (ids.length === 0) {
    return { ok: true, data: [] }
  }
  const url = new URL('https://sisu.aalto.fi/kori/api/course-units')
  url.searchParams.set('id', ids.join(','))
  const urlStr = url.toString()
  try {
    const authResponse = await sisuFetchWithAuth(urlStr)
    if (!authResponse.ok) {
      console.warn(LOG, 'course-units skipped: no valid Sisu auth', { url: urlStr })
      return { ok: false, error: 'no_sisu_token' }
    }
    const response = authResponse.response
    if (!response.ok) {
      const text = await response.text()
      logSisuFailure('course-units', urlStr, {
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
    if (!Array.isArray(raw)) {
      logSisuFailure('course-units', urlStr, {
        error: 'unexpected JSON shape (not array)',
        bodySnippet: typeof raw === 'object' ? JSON.stringify(raw).slice(0, 300) : String(raw),
      })
      return { ok: false, error: 'fetch_failed', message: 'course-units: expected JSON array' }
    }
    return { ok: true, data: raw as import('./utils/types').SisuKoriCourseUnit[] }
  } catch (err) {
    logSisuFailure('course-units', urlStr, { error: String(err) })
    return { ok: false, error: 'fetch_failed', message: String(err) }
  }
}

async function fetchCourseUnitsFromSisu(ids: string[]): Promise<FetchCourseUnitsResult> {
  const unique = Array.from(
    new Set(ids.filter((id) => typeof id === 'string' && id.trim() !== ''))
  )
  if (unique.length === 0) {
    return { ok: true, data: [] }
  }
  const all: import('./utils/types').SisuKoriCourseUnit[] = []
  for (let i = 0; i < unique.length; i += COURSE_UNITS_CHUNK_MAX) {
    const chunk = unique.slice(i, i + COURSE_UNITS_CHUNK_MAX)
    const dedupeKey = `sisu:course-units:${[...chunk].sort().join(',')}`
    const res = await dedupeSisuFetch(dedupeKey, () => fetchCourseUnitsChunkFromSisu(chunk))
    if (!res.ok) {
      return res
    }
    all.push(...res.data)
  }
  return { ok: true, data: all }
}
