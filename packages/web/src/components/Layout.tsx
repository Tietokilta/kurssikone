import { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Props = {
  children: ReactNode
}

const Layout = ({ children }: Props) => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gray-900 text-white px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link to="/" className="font-medium text-white no-underline hover:text-gray-200">
            Kurssikompassi
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">{children}</main>

      <footer className="bg-gray-100 border-t border-gray-300 text-gray-600 text-sm text-center px-6 py-6 mt-12">
        <p>Kurssikompassi - Course reviews for Aalto University</p>
        <p className="mt-2">
          Also available as a{' '}
          <a
            href="https://github.com/otju/kurssikompassi"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-800"
          >
            browser extension
          </a>
        </p>
      </footer>
    </div>
  )
}

export default Layout
