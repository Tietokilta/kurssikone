const handleOpenCourse = (details: browser.webRequest._OnBeforeRequestDetails) => {
  const startOfUrl = 'https://sisu.aalto.fi/osuva/api/notifications/student/aalto-HLO-'
  const url = details.url
  if (details.url.startsWith(startOfUrl)) {
    const userId = url.slice(startOfUrl.length).trim()
    browser.storage.local.set({ userId })
  }
}

browser.webRequest.onBeforeRequest.addListener(handleOpenCourse, {
  urls: ['https://sisu.aalto.fi/*'],
})
