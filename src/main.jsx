import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { CSS } from './theme.js'

// Injected once here rather than by each screen, which previously
// duplicated the stylesheet (and its font @import) across the DOM.
const style = document.createElement('style')
style.textContent = CSS
document.head.appendChild(style)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
