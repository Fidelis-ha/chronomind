import type { ReactNode } from 'react'

/** Design-Prototypen laufen fullscreen ÜBER der App-Shell (Header etc.) —
 *  die Demos sind bewusst frei von jeglicher App-Chrome. */
export default function DesignDemoLayout({ children }: { children: ReactNode }) {
  return <div className="fixed inset-0 z-[100]">{children}</div>
}
