'use client'

import { useEffect } from 'react'

/**
 * Registriert die benötigten @material/web-Komponenten (MWC) client-seitig.
 * Die dynamischen Imports laufen erst im useEffect (nach dem Mount), damit
 * zur SSR-/Importzeit kein `window`/`customElements` im Server-Baum benötigt
 * wird (Next.js App Router).
 */
export function M3Provider() {
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const modules = [
        import('@material/web/button/filled-button.js'),
        import('@material/web/button/outlined-button.js'),
        import('@material/web/button/text-button.js'),
        import('@material/web/button/filled-tonal-button.js'),
        import('@material/web/textfield/filled-text-field.js'),
        import('@material/web/textfield/outlined-text-field.js')
      ]
      await Promise.all(modules)
    }
    load().catch(err => {
      if (!cancelled) {
        console.error('M3: failed to load @material/web components', err)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  return null
}
