import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { i18nResources } from '@kurssikone/shared'

function detectSisuLanguage(): string {
  try {
    const lang = localStorage.getItem('selected_language')
    if (lang === 'fi') return 'fi'
  } catch { /* ignore */ }
  return 'en'
}

i18n
  .use(initReactI18next)
  .init({
    resources: i18nResources,
    lng: detectSisuLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })

// Content scripts share localStorage but not the JS context, so we poll
// for same-tab changes and listen for cross-tab changes.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'selected_language') {
      i18n.changeLanguage(e.newValue === 'fi' ? 'fi' : 'en')
    }
  })

  let lastLang = i18n.language
  const observer = new MutationObserver(() => {
    const current = detectSisuLanguage()
    if (current !== lastLang) {
      lastLang = current
      i18n.changeLanguage(current)
    }
  })
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
}

export default i18n
