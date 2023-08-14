import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'

let observer = new MutationObserver((mutations) => {
  let once = true
  mutations.forEach((mutation) => {
    if (!mutation.addedNodes) return
    for (let i = 0; i < mutation.addedNodes.length; i++) {
      const node = mutation.addedNodes[i]
      // @ts-ignore
      if (node.classList && node.classList.contains('course-unit-info-modal') && once) {
        once = false
        const modalBody = document.querySelector('.modal-body') as HTMLElement
        const reactRoot = document.createElement('div')
        reactRoot.setAttribute('id', 'review-root')
        reactRoot.setAttribute('class', 'review-root')
        reactRoot.setAttribute('role', 'tabpanel')

        modalBody.append(reactRoot)
        reactRoot.style.display = 'none'
        const root = ReactDOM.createRoot(reactRoot)
        root.render(<App />)

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

        const tabs = document.querySelector('sis-tab-content-switch > .nav-tabs')

        const otherListElements = document.querySelectorAll(
          'sis-tab-content-switch > .nav-tabs > li'
        )

        const getReviewListElement = () => {
          return document.querySelector('.review-list-element') as HTMLElement
        }

        const getOldModalContents = () => {
          return document.querySelectorAll(
            '.modal-body > div:not(#review-root)'
          ) as unknown as HTMLElement[]
        }

        // eslint-disable-next-line no-loop-func
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

        // eslint-disable-next-line no-loop-func
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
    }
  })
})

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: false,
  characterData: false,
})
