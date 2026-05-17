import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './contexts/ThemeContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { Toaster } from 'sonner'   // ← nuevo

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: 'font-sans text-sm',
            style: {
              background: '#ffffff',
              color: '#444f5a',
              border: '1px solid #e2e8f0',
            },
          }}
        />
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>
)