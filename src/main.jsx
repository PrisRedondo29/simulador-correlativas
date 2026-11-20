import * as React from 'react'
import { createRoot } from 'react-dom/client'
window.React = React; // Polyfill para librerías que esperan React global en React 19
import { HeroUIProvider, ToastProvider } from '@heroui/react'
import { ThemeProvider as NextThemesProvider } from "next-themes"
import App from './App.jsx'
import './main.css'
import '@fortawesome/fontawesome-free/css/all.min.css'

// Silenciar logs y warnings en producción para una consola limpia y profesional
if (import.meta.env.PROD) {
  console.log = () => { };
  console.warn = () => { };
  // console.info = () => {}; // Descomenta si también quieres quitar los "info"
}

createRoot(document.getElementById('root')).render(
  <HeroUIProvider>
    <ToastProvider placement="bottom-right" maxVisibleToasts={1} />
    <NextThemesProvider attribute="class" defaultTheme='light' themes={['light', 'dark']} enableSystem={false}>
      {/* Contenedor raíz de tema; el landmark <main> único vive dentro de App.jsx */}
      <div className="text-foreground bg-background min-h-screen">
        <App />
      </div>
    </NextThemesProvider>
  </HeroUIProvider>
)
