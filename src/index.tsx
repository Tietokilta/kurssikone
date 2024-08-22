import ReactDOM from 'react-dom/client'
import CoursePage from './CoursePage'
import SearchResult from './SearchResult'

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

const handleSearchResult = (node: Node) => {
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
  root.render(<SearchResult courseCode={courseCode} />)
}

const handleCoursePage = (isModal: boolean) => {
  const mainBodyString = isModal ? '.modal-body' : '.course-unit-info-page-body'
  const pageMainBody = document.querySelector(mainBodyString) as HTMLElement
  const reactRoot = document.createElement('div')
  reactRoot.setAttribute('id', 'review-root')
  reactRoot.setAttribute('class', 'review-root')
  reactRoot.setAttribute('role', 'tabpanel')

  pageMainBody.append(reactRoot)
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
  button.innerHTML = 'Reviews'

  listElement.append(button)

  const tabElementName = isModal ? 'sis-tab-content-switch' : 'sis-tab-navigation'

  const tabs = document.querySelector(`${tabElementName} > .nav-tabs`)

  const otherListElements = document.querySelectorAll(`${tabElementName} > .nav-tabs > li`)

  const getReviewListElement = () => {
    return document.querySelector('.review-list-element') as HTMLElement
  }

  const getOldModalContents = () => {
    return document.querySelectorAll(
      `${mainBodyString} > div:not(#review-root)`
    ) as unknown as HTMLElement[]
  }

  otherListElements.forEach((element) => {
    element.classList.add('other-list-element')
    element.addEventListener('click', function () {
      reactRoot.style.display = 'none'
      getOldModalContents().forEach((element) => {
        element.style.display = 'block'
      })

      getReviewListElement().classList.remove('active')
    })
  })

  const getOtherListElements = () => {
    return document.querySelectorAll('.other-list-element')
  }

  tabs?.append(listElement)

  button.onclick = () => {
    getOtherListElements().forEach((element) => {
      element.classList.remove('active')
    })
    getReviewListElement().classList.add('active')
    getOldModalContents().forEach((element) => {
      element.style.display = 'none'
    })
    reactRoot.style.display = 'block'
  }
}

const addCourseCodeToLocalStorage = () => {
  const courseCodeString = document.querySelector('.course-unit-code')?.textContent
  if (courseCodeString) {
    const currentCourseCode = courseCodeString.split('|')[0].trim()
    if (currentCourseCode && currentCourseCode.length > 0) {
      browser.storage.local.set({ currentCourseCode })
    }
  }
}

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: false,
  characterData: false,
})
