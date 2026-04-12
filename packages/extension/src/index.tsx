import ReactDOM from 'react-dom/client'
// @ts-expect-error - CSS imported as string via ?inline query
import styles from './index.css?inline'
import CoursePage from './pages/CoursePage'
import SearchResultPage from './pages/SearchResultPage'
import { waitForElement } from './utils/waitForElement'
import TimelinePage from './pages/TimelinePage'

console.log('[KurssiKone] Extension loaded successfully')

// Transform Tailwind CSS for shadow DOM compatibility
// 1. Replace :root with :host so CSS custom properties work in shadow DOM
// 2. Replace universal selectors to scope Tailwind's CSS variable defaults to shadow DOM
const shadowStyles = styles
  .replace(/:root/g, ':host')
  .replace(
    /\*, ::before, ::after, ::backdrop \{/g,
    ':host, :host *, :host ::before, :host ::after, :host ::backdrop {'
  )

const createShadowRoot = (hostElement: HTMLElement): ShadowRoot => {
  const shadow = hostElement.attachShadow({ mode: 'open' })

  const styleElement = document.createElement('style')
  styleElement.textContent = shadowStyles
  shadow.appendChild(styleElement)

  return shadow
}

let observer = new MutationObserver((mutations) => {
  let once = true
  mutations.forEach((mutation) => {
    if (!mutation.addedNodes) return
    for (let i = 0; i < mutation.addedNodes.length; i++) {
      const node = mutation.addedNodes[i]
      const isModal = node.nodeName === 'APP-COURSE-UNIT-INFO-MODAL-HEADER-TABS'
      const isAppCourseUnitInfo = node.nodeName === 'APP-COURSE-UNIT-INFO'

      // @ts-ignore
      const cy = node?.dataset?.cy

      const isSearchResult = cy === 'student-courseunit-search-resultrow'

      const isTimelinePage = node.nodeName === 'APP-TIMELINE'

      if ((isModal || isAppCourseUnitInfo) && once) {
        once = false
        handleCoursePage(isModal)
      } else if (isSearchResult) {
        handleSearchResult(node)
      } else if (isTimelinePage) {
        handleTimeline(node)
      }
    }
  })
})

/** Sisu plan URLs look like `/student/plan/otm-…/timing`. */
const getPlanIdFromPageUrl = (): string => {
  const match = window.location.pathname.match(/\/student\/plan\/([^/]+)/)
  return match?.[1] ?? ''
}

const handleTimeline = (node: Node) => {
  const timelineBody = node as HTMLElement

  const shadowHost = document.createElement('div')
  shadowHost.setAttribute('class', 'kurssikone-shadow-host')
  timelineBody?.prepend(shadowHost)

  const shadow = createShadowRoot(shadowHost)
  const reactRoot = document.createElement('div')
  shadow.appendChild(reactRoot)

  const planId = getPlanIdFromPageUrl()
  const root = ReactDOM.createRoot(reactRoot)
  root.render(<TimelinePage planId={planId} />)
}

const handleSearchResult = (node: Node) => {
  const searchResultBody = node as HTMLElement
  const searchResultColumn = searchResultBody.querySelector('.col-12.col-md-5')
  const searchResultColumnParent = searchResultColumn?.parentElement

  const shadowHost = document.createElement('div')
  shadowHost.setAttribute('class', 'col-12 col-md-5 kurssikone-shadow-host')
  searchResultColumnParent?.append(shadowHost)

  for (const child of searchResultColumnParent?.children || []) {
    child.setAttribute('style', 'width: 33% !important')
  }

  const shadow = createShadowRoot(shadowHost)
  const reactRoot = document.createElement('div')
  shadow.appendChild(reactRoot)

  const courseCode = searchResultBody.querySelector('.courseunit-code')?.textContent || ''
  const root = ReactDOM.createRoot(reactRoot)
  root.render(<SearchResultPage courseCode={courseCode} />)
}

const handleCoursePage = async (isModal: boolean) => {
  console.log('[KurssiKone] handleCoursePage called, isModal:', isModal)
  try {
    const shadowHost = document.createElement('div')
    shadowHost.setAttribute('id', 'review-root-host')
    shadowHost.setAttribute('class', 'kurssikone-shadow-host')
    shadowHost.setAttribute('role', 'tabpanel')

    const pageMainBody = (await waitForElement('[role="tabpanel"]'))?.parentElement
    pageMainBody?.append(shadowHost)
    shadowHost.style.display = 'none'

    const shadow = createShadowRoot(shadowHost)
    const reactRoot = document.createElement('div')
    reactRoot.setAttribute('id', 'review-root')
    reactRoot.setAttribute('class', 'review-root p-4')
    shadow.appendChild(reactRoot)

    const courseCode = getCourseCode()
    console.log('[KurssiKone] courseCode:', courseCode)

    const root = ReactDOM.createRoot(reactRoot)
    root.render(<CoursePage courseCode={courseCode} />)
    console.log('[KurssiKone] React render called')

    const listElement = document.createElement('li')

    listElement.setAttribute('role', 'presentation')
    listElement.setAttribute('class', 'review-list-element')

    const button = document.createElement('button')
    button.setAttribute('type', 'button')
    button.setAttribute('role', 'tab')
    button.setAttribute('class', 'link-button')
    button.setAttribute('tabindex', '-1')
    button.textContent = 'Reviews'

    listElement.append(button)

    const tabList = await waitForElement('[role="tablist"]')
    console.log('[KurssiKone] tabList found:', tabList)

    await waitForElement('[role="tablist"] > li')

    const tabListElements = document.querySelectorAll('[role="tablist"] > li')
    console.log('[KurssiKone] tabListElements:', tabListElements.length)

    tabListElements.forEach((element) => {
      element.addEventListener('click', function () {
        getOldModalContents().forEach((element) => {
          element.style.display = 'block'
        })
        shadowHost.style.display = 'none'

        element.classList.add('active')
        element.classList.add('focusedTab')
        getReviewListElement().classList.remove('active')
      })
    })

    tabList?.append(listElement)
    console.log('[KurssiKone] Reviews tab added')

    button.onclick = () => {
      tabListElements.forEach((element) => {
        element.classList.remove('active')
      })

      getReviewListElement().classList.add('active')

      getOldModalContents().forEach((element) => {
        element.style.display = 'none'
      })
      shadowHost.style.display = 'block'
    }
  } catch (error) {
    console.error('[KurssiKone] Error in handleCoursePage:', error)
  }
}

const getReviewListElement = () => {
  return document.querySelector('.review-list-element') as HTMLElement
}

const getOldModalContents = () => {
  return document.querySelectorAll(
    `[role="tabpanel"]:not(.kurssikone-shadow-host)`
  ) as unknown as HTMLElement[]
}

const getCourseCode = () => {
  const courseCodeModalString = document.querySelector('.course-unit-code')?.textContent
  const courseCodePageString = document.querySelector('.page-sub-title')?.textContent
  if (courseCodeModalString) {
    return courseCodeModalString.split('|')[0].trim()
  }
  if (courseCodePageString) {
    return courseCodePageString.trim()
  }
}

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: false,
  characterData: false,
})
