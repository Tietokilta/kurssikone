import ReactDOM from 'react-dom/client'
import CoursePage from './pages/CoursePage'
import SearchResultPage from './pages/SearchResultPage'
import { waitForElement } from './utils/waitForElement'

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

      if ((isModal || isAppCourseUnitInfo) && once) {
        once = false
        handleCoursePage(isModal)
      } else if (isSearchResult) {
        handleSearchResult(node)
      }
    }
  })
})

const handleSearchResult = async (node: Node) => {
  const searchResultBody = node as HTMLElement
  const searchResultColumn = searchResultBody.querySelector('.col-12.col-md-5')
  const searchResultColumnParent = searchResultColumn?.parentElement
  const reactRoot = document.createElement('div')
  reactRoot.setAttribute('class', 'col-12 col-md-5')
  searchResultColumnParent?.append(reactRoot)
  for (const child of searchResultColumnParent?.children || []) {
    child.setAttribute('style', 'width: 33% !important')
  }
  const courseCode = searchResultBody.querySelector('.courseunit-code')?.textContent || ''
  const root = ReactDOM.createRoot(reactRoot)
  root.render(<SearchResultPage courseCode={courseCode} />)
}

const handleCoursePage = async (isModal: boolean) => {
  const reactRoot = document.createElement('div')
  reactRoot.setAttribute('id', 'review-root')
  reactRoot.setAttribute('class', 'review-root')
  reactRoot.setAttribute('role', 'tabpanel')

  const pageMainBody = (await waitForElement('[role="tabpanel"]'))?.parentElement
  pageMainBody?.append(reactRoot)
  reactRoot.style.display = 'none'

  const root = ReactDOM.createRoot(reactRoot)
  root.render(<CoursePage />)

  addCourseCodeToLocalStorage()

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

  await waitForElement('[role="tablist"] > li')

  const tabListElements = document.querySelectorAll('[role="tablist"] > li')

  tabListElements.forEach((element) => {
    element.addEventListener('click', function () {
      getOldModalContents().forEach((element) => {
        element.style.display = 'block'
      })
      reactRoot.style.display = 'none'

      element.classList.add('active')
      element.classList.add('focusedTab')
      getReviewListElement().classList.remove('active')
    })
  })

  tabList?.append(listElement)

  button.onclick = () => {
    tabListElements.forEach((element) => {
      element.classList.remove('active')
    })

    getReviewListElement().classList.add('active')

    getOldModalContents().forEach((element) => {
      element.style.display = 'none'
    })
    reactRoot.style.display = 'block'
  }
}

const getReviewListElement = () => {
  return document.querySelector('.review-list-element') as HTMLElement
}

const getOldModalContents = () => {
  return document.querySelectorAll(`[role="tabpanel"]`) as unknown as HTMLElement[]
}

const addCourseCodeToLocalStorage = () => {
  const courseCodeModalString = document.querySelector('.course-unit-code')?.textContent
  const courseCodePageString = document.querySelector('.page-sub-title')?.textContent
  if (courseCodeModalString) {
    const currentCourseCode = courseCodeModalString.split('|')[0].trim()
    if (currentCourseCode) {
      chrome.storage.local.set({ currentCourseCode })
    }
  }
  if (courseCodePageString) {
    const currentCourseCode = courseCodePageString.trim()
    if (currentCourseCode) {
      chrome.storage.local.set({ currentCourseCode })
    }
  }
}

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: false,
  characterData: false,
})
