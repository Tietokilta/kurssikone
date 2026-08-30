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

export default i18n
