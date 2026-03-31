import { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Props = {
  children: ReactNode
}

const Layout = ({ children }: Props) => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          backgroundColor: '#0066cc',
          color: 'white',
          padding: '16px 24px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Link
            to="/"
            style={{
              color: 'white',
              textDecoration: 'none',
              fontSize: 24,
              fontWeight: 600,
            }}
          >
            Kurssikompassi
          </Link>
          <nav>
            <Link
              to="/"
              style={{
                color: 'white',
                textDecoration: 'none',
                padding: '8px 16px',
              }}
            >
              Home
            </Link>
          </nav>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          padding: '40px 24px',
          maxWidth: 1200,
          margin: '0 auto',
          width: '100%',
        }}
      >
        {children}
      </main>

      <footer
        style={{
          backgroundColor: '#333',
          color: '#999',
          padding: '24px',
          textAlign: 'center',
          fontSize: 14,
        }}
      >
        <p>
          Kurssikompassi - Course reviews for Aalto University
        </p>
        <p style={{ marginTop: 8 }}>
          Also available as a{' '}
          <a
            href="https://github.com/otju/kurssikompassi"
            style={{ color: '#ccc' }}
            target="_blank"
            rel="noopener noreferrer"
          >
            browser extension
          </a>
        </p>
      </footer>
    </div>
  )
}

export default Layout
