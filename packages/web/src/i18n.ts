import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { i18nResources } from '@kurssikone/shared'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: i18nResources,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'kurssikone_language',
      caches: ['localStorage'],
      convertDetectedLanguage: (lng) => {
        if (lng.startsWith('fi')) return 'fi'
        return 'en'
      },
    },
  })

export default i18n
