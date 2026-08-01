export const waitForElement = (
  selector: string,
  root: ParentNode = document
): Promise<HTMLElement> => {
  return new Promise((resolve) => {
    if (root.querySelector(selector)) {
      return resolve(root.querySelector(selector) as HTMLElement)
    }

    const observeTarget = root instanceof HTMLElement ? root : document.body
    const observer = new MutationObserver(() => {
      if (root.querySelector(selector)) {
        observer.disconnect()
        resolve(root.querySelector(selector) as HTMLElement)
      }
    })

    observer.observe(observeTarget, {
      childList: true,
      subtree: true,
    })
  })
}
