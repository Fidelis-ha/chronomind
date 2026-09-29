import type { MdFilledButton } from '@material/web/button/filled-button.js'
import type { MdOutlinedButton } from '@material/web/button/outlined-button.js'
import type { MdTextButton } from '@material/web/button/text-button.js'
import type { MdFilledTonalButton } from '@material/web/button/filled-tonal-button.js'
import type { MdOutlinedTextField } from '@material/web/textfield/outlined-text-field.js'
import type { MdFilledTextField } from '@material/web/textfield/filled-text-field.js'
import type { MdSwitch } from '@material/web/switch/switch.js'
import type { MdAssistChip } from '@material/web/chips/assist-chip.js'

/**
 * JSX-Intrinsics für die verwendeten @material/web-Elemente.
 * React 18 kennt custom elements nicht von Haus aus.
 */
type M3Element<T> = Omit<Partial<T>, 'children'> &
  Omit<React.DOMAttributes<T>, 'children'> & {
    children?: React.ReactNode
    className?: string
    class?: string
    style?: React.CSSProperties
  }

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'md-filled-button': M3Element<MdFilledButton>
      'md-outlined-button': M3Element<MdOutlinedButton>
      'md-text-button': M3Element<MdTextButton>
      'md-filled-tonal-button': M3Element<MdFilledTonalButton>
      'md-filled-text-field': M3Element<MdFilledTextField>
      'md-outlined-text-field': M3Element<MdOutlinedTextField>
      'md-switch': M3Element<MdSwitch>
      'md-assist-chip': M3Element<MdAssistChip>
    }
  }
}
