import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // M3 Filled
        default:
          'bg-primary text-primary-foreground shadow-md hover:bg-primary/90 active:bg-primary/95',
        // M3 Error-Filled
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/95',
        // M3 Outlined
        outline:
          'border border-outline bg-transparent text-primary hover:bg-primary/[0.08] active:bg-primary/[0.12]',
        // M3 Tonal (Secondary Container)
        secondary:
          'bg-secondary-container text-on-secondary-container hover:bg-secondary-container/90 active:bg-secondary-container/95',
        // M3 Text
        ghost:
          'text-primary hover:bg-on-surface/[0.08] active:bg-on-surface/[0.12]',
        link: 'text-primary underline-offset-4 shadow-none hover:underline'
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm: 'h-8 px-4',
        lg: 'h-11 px-8',
        icon: 'h-10 w-10 p-0'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
