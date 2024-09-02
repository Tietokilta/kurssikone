const handleOpenCourse = (details: chrome.webRequest.WebRequestBodyDetails) => {
  const startOfUrl = 'https://sisu.aalto.fi/osuva/api/notifications/student/aalto-HLO-'
  const url = details.url
  if (details.url.startsWith(startOfUrl)) {
    const userId = url.slice(startOfUrl.length).trim()
    chrome.storage.local.set({ userId })
  }
}

chrome.webRequest.onBeforeRequest.addListener(handleOpenCourse, {
  urls: ['https://sisu.aalto.fi/*'],
})

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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'get') {
    get(request.pathParts, request.query).then((res) => sendResponse(res))
  }
  if (request.type === 'post') {
    post(request.pathParts, request.body).then((res) => sendResponse(res))
  }
  return true
})
