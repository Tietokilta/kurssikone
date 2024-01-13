const handleOpenCourse = (details) => {
  /*
  let filter = browser.webRequest.filterResponseData(details.requestId)
  let decoder = new TextDecoder('utf-8')
  //let encoder = new TextEncoder()

  filter.ondata = (event) => {
    let str = decoder.decode(event.data)
    try {
      const json = JSON.parse(str)
      console.log(json)
    } catch (_) {
      filter.disconnect()
    }
    filter.write(event.data)
  }
  filter.onstop = () => {
    filter.disconnect()
  };*/
  const startOfUrl = 'https://sisu.aalto.fi/osuva/api/notifications/student/aalto-HLO-'
  const url = details.url
  if (details.url.startsWith(startOfUrl)) {
    const userId = url.slice(startOfUrl.length).trim()
    browser.storage.local.set({ userId })
  }
}

browser.webRequest.onBeforeRequest.addListener(
  handleOpenCourse,
  {
    urls: ['*://sisu.aalto.fi/*'],
  }
  //['blocking']
)
