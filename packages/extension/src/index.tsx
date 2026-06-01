import ReactDOM from 'react-dom/client'
// @ts-expect-error - CSS imported as string via ?inline query
import styles from './index.css?inline'
import CoursePage from './pages/CoursePage'
import ExamsPage from './pages/ExamsPage'
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
    const pageMainBody = (await waitForElement('[role="tabpanel"]'))?.parentElement

    // Reviews shadow host
    const reviewShadowHost = document.createElement('div')
    reviewShadowHost.setAttribute('id', 'review-root-host')
    reviewShadowHost.setAttribute('class', 'kurssikone-shadow-host')
    reviewShadowHost.setAttribute('role', 'tabpanel')
    pageMainBody?.append(reviewShadowHost)
    reviewShadowHost.style.display = 'none'

    const reviewShadow = createShadowRoot(reviewShadowHost)
    const reviewReactRoot = document.createElement('div')
    reviewReactRoot.setAttribute('id', 'review-root')
    reviewReactRoot.setAttribute('class', 'review-root px-4 pb-4 pt-2')
    reviewShadow.appendChild(reviewReactRoot)

    // Exams shadow host
    const examsShadowHost = document.createElement('div')
    examsShadowHost.setAttribute('id', 'exams-root-host')
    examsShadowHost.setAttribute('class', 'kurssikone-shadow-host')
    examsShadowHost.setAttribute('role', 'tabpanel')
    pageMainBody?.append(examsShadowHost)
    examsShadowHost.style.display = 'none'

    const examsShadow = createShadowRoot(examsShadowHost)
    const examsReactRoot = document.createElement('div')
    examsReactRoot.setAttribute('id', 'exams-root')
    examsShadow.appendChild(examsReactRoot)

    const courseCode = getCourseCode()
    console.log('[KurssiKone] courseCode:', courseCode)

    ReactDOM.createRoot(reviewReactRoot).render(<CoursePage courseCode={courseCode} />)
    ReactDOM.createRoot(examsReactRoot).render(<ExamsPage courseCode={courseCode} />)
    console.log('[KurssiKone] React render called')

    // Reviews tab button
    const reviewListElement = document.createElement('li')
    reviewListElement.setAttribute('role', 'presentation')
    reviewListElement.setAttribute('class', 'review-list-element')
    const reviewButton = document.createElement('button')
    reviewButton.setAttribute('type', 'button')
    reviewButton.setAttribute('role', 'tab')
    reviewButton.setAttribute('class', 'link-button')
    reviewButton.setAttribute('tabindex', '-1')
    reviewButton.textContent = 'Reviews'
    reviewListElement.append(reviewButton)

    // Exams tab button
    const examsListElement = document.createElement('li')
    examsListElement.setAttribute('role', 'presentation')
    examsListElement.setAttribute('class', 'exams-list-element')
    const examsButton = document.createElement('button')
    examsButton.setAttribute('type', 'button')
    examsButton.setAttribute('role', 'tab')
    examsButton.setAttribute('class', 'link-button')
    examsButton.setAttribute('tabindex', '-1')
    examsButton.textContent = 'Exams'
    examsListElement.append(examsButton)

    const tabList = await waitForElement('[role="tablist"]')
    console.log('[KurssiKone] tabList found:', tabList)

    await waitForElement('[role="tablist"] > li')

    const tabListElements = document.querySelectorAll('[role="tablist"] > li')
    console.log('[KurssiKone] tabListElements:', tabListElements.length)

    tabListElements.forEach((element) => {
      element.addEventListener('click', function () {
        getOldModalContents().forEach((el) => {
          el.style.display = 'block'
        })
        reviewShadowHost.style.display = 'none'
        examsShadowHost.style.display = 'none'
        element.classList.add('active')
        element.classList.add('focusedTab')
        reviewListElement.classList.remove('active')
        examsListElement.classList.remove('active')
      })
    })

    tabList?.append(reviewListElement)
    tabList?.append(examsListElement)
    console.log('[KurssiKone] Reviews and Exams tabs added')

    reviewButton.onclick = () => {
      tabListElements.forEach((element) => element.classList.remove('active'))
      reviewListElement.classList.add('active')
      examsListElement.classList.remove('active')
      getOldModalContents().forEach((el) => {
        el.style.display = 'none'
      })
      reviewShadowHost.style.display = 'block'
      examsShadowHost.style.display = 'none'
    }

    examsButton.onclick = () => {
      tabListElements.forEach((element) => element.classList.remove('active'))
      examsListElement.classList.add('active')
      reviewListElement.classList.remove('active')
      getOldModalContents().forEach((el) => {
        el.style.display = 'none'
      })
      examsShadowHost.style.display = 'block'
      reviewShadowHost.style.display = 'none'
    }
  } catch (error) {
    console.error('[KurssiKone] Error in handleCoursePage:', error)
  }
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
