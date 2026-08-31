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
window.addEventListener('storage', (e) => {
  if (e.key === 'selected_language') {
    i18n.changeLanguage(e.newValue === 'fi' ? 'fi' : 'en')
  }
})

setInterval(() => {
  const current = detectSisuLanguage()
  if (current !== i18n.language) {
    i18n.changeLanguage(current)
  }
}, 1000)

export default i18n
