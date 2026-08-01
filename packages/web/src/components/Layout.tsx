import { ReactNode } from 'react'
import { isFirefox } from 'react-device-detect'
import AdminBar from './AdminBar'

type Props = {
  children: ReactNode
}

const Layout = ({ children }: Props) => {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        <div className="flex justify-end mb-2">
          <AdminBar />
        </div>
        {children}
      </main>

      <footer className="bg-gray-100 border-t border-gray-300 text-gray-600 text-sm text-center px-6 py-6 mt-12">
        <p>KurssiKone - Course reviews for Aalto University</p>
        <p className="mt-2">
          Also available as a{' '}
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
            browser extension
          </a>{' '}
          for Firefox & Chrome.
        </p>
      </footer>
    </div>
  )
}

export default Layout
