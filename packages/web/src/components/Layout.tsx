import { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { isFirefox } from 'react-device-detect'
import AdminBar from './AdminBar'

type Props = {
  children: ReactNode
}

const Layout = ({ children }: Props) => {
  const { t, i18n } = useTranslation()

  const setLanguage = (lang: string) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('kurssikone_language', lang)
  }

  const isEn = i18n.language !== 'fi'

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        <div className="flex justify-end mb-2 gap-2">
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
        {children}
      </main>

      <footer className="bg-gray-100 border-t border-gray-300 text-gray-600 text-sm px-6 py-3 mt-12 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <span>{t('web.footerTagline')}</span>

        <a
          href={
            isFirefox
              ? 'https://addons.mozilla.org/en-US/firefox/addon/kurssikone/'
              : 'http://chromewebstore.google.com/detail/dfchpeehiilpkpikbmgkdfpenkdcpeim'
          }
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800"
        >
          {t('web.browserExtension')}
        </a>

        <a
          href="https://forms.gle/RM8YCYAByhyHnr4w5"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800"
        >
          {t('web.giveFeedback')}
        </a>

        <span>{t('web.madeBy')}</span>
      </footer>
    </div>
  )
}

export default Layout
