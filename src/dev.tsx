import ReactDOM from 'react-dom/client'
import App from './App'

const rootElement = document.getElementById('review-root') as HTMLElement
const root = ReactDOM.createRoot(rootElement)
root.render(<App />)
