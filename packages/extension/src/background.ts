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
    fetchStudyPlansFromSisu().then((res) => sendResponse(res))
  }
  if (request.type === 'fetchAttainments') {
    fetchAttainmentsFromSisu(request.personId).then((res) => sendResponse(res))
  }
  if (request.type === 'updateStudyPlan') {
    putStudyPlanToSisu(request.planId, request.plan).then((res) => sendResponse(res))
  }
  return true
})

const filter = {
  urls: ['https://sisu.aalto.fi/*'],
}

console.log('Background script running...')

let sisuAuthToken: string | undefined = undefined

chrome.webRequest.onBeforeSendHeaders.addListener(
  function (details) {
    // Only steal the token if we don't have it yet
    if (!sisuAuthToken) {
      for (let header of details.requestHeaders || []) {
        if (header.name.toLowerCase() === 'authorization') {
          sisuAuthToken = header.value
          console.log('Got auth token for Sisu')

          void fetchStudyPlansFromSisu()
          break
        }
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
  if (!sisuAuthToken) {
    return { ok: false, error: 'no_sisu_token' }
  }

  try {
    const response = await fetch('https://sisu.aalto.fi/osuva/api/my-plans', {
      headers: { Authorization: sisuAuthToken },
    })
    if (!response.ok) {
      return { ok: false, error: 'fetch_failed', message: response.statusText }
    }
    const data = (await response.json()) as import('./utils/types').SisuMyPlansResponse

    return { ok: true, data }
  } catch (err) {
    console.error(err)
    return { ok: false, error: 'fetch_failed', message: String(err) }
  }
}

type FetchAttainmentsResult =
  | { ok: true; data: import('./utils/types').SisuAttainmentsResponse }
  | { ok: false; error: 'no_sisu_token' }
  | { ok: false; error: 'fetch_failed'; message?: string }

async function fetchAttainmentsFromSisu(personId: string): Promise<FetchAttainmentsResult> {
  if (!sisuAuthToken) {
    return { ok: false, error: 'no_sisu_token' }
  }

  try {
    const url = new URL('https://sisu.aalto.fi/ori/api/attainments')
    url.searchParams.set('personId', personId)
    const response = await fetch(url.toString(), {
      headers: { Authorization: sisuAuthToken },
    })
    if (!response.ok) {
      return { ok: false, error: 'fetch_failed', message: response.statusText }
    }
    const data = (await response.json()) as import('./utils/types').SisuAttainmentsResponse
    return { ok: true, data }
  } catch (err) {
    console.error(err)
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
  if (!sisuAuthToken) {
    return { ok: false, error: 'no_sisu_token' }
  }

  try {
    // Student-owned plans: use my-plans (GET already uses this). PUT /plans/{id} requires plan-admin.
    const response = await fetch(
      `https://sisu.aalto.fi/osuva/api/my-plans/${encodeURIComponent(planId)}`,
      {
        method: 'PUT',
        headers: {
          Authorization: sisuAuthToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(plan),
      }
    )
    if (!response.ok) {
      const text = await response.text()
      return {
        ok: false,
        error: 'fetch_failed',
        status: response.status,
        message: text || response.statusText,
      }
    }
    return { ok: true }
  } catch (err) {
    console.error(err)
    return { ok: false, error: 'fetch_failed', message: String(err) }
  }
}
