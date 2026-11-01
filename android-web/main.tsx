import type { ComponentType } from 'react'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Route } from '@/routes/index'
import '@/styles.css'

// Versión de la web que va dentro de la app Android: sin servidor ni enrutador.
// Monta la misma pantalla principal que la web y los mismos avisos que __root.tsx.
const Home = Route.options.component as unknown as ComponentType | undefined
const container = document.getElementById('root')
if (!Home || !container) throw new Error('No se encontró la pantalla principal')

createRoot(container).render(
  <>
    <TooltipProvider>{createElement(Home)}</TooltipProvider>
    <Toaster />
  </>,
)
