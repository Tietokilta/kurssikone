import ReactDOM from 'react-dom/client'
import CoursePage from './CoursePage'

const rootElement = document.getElementById('review-root') as HTMLElement
const root = ReactDOM.createRoot(rootElement)
root.render(<CoursePage />)
