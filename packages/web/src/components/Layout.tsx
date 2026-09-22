import { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { isFirefox } from 'react-device-detect'

type Props = {
  children: ReactNode
}

const Layout = ({ children }: Props) => {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
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
