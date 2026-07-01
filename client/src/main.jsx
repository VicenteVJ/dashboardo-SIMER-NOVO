import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'

const dark = localStorage.getItem('theme') === 'dark'
document.documentElement.classList.toggle('dark', dark)

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
