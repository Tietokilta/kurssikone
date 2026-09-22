import { useTranslation } from 'react-i18next'
import AdminBar from './AdminBar'

const LanguageSelector = () => {
  const { i18n } = useTranslation()

  const setLanguage = (lang: string) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('kurssikone_language', lang)
  }

  const isEn = i18n.language !== 'fi'

  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-sm">
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`px-2.5 py-1 font-medium transition-colors ${isEn ? 'bg-gray-800 text-white' : 'bg-white text-gray-400 hover:text-gray-600'}`}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLanguage('fi')}
          className={`px-2.5 py-1 font-medium transition-colors ${!isEn ? 'bg-gray-800 text-white' : 'bg-white text-gray-400 hover:text-gray-600'}`}
        >
          FI
        </button>
      </div>
      <AdminBar />
    </div>
  )
}

export default LanguageSelector
