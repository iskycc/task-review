import * as React from 'react'
import { Loader2 } from 'lucide-react'

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  asChild?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--tint)] text-white hover:bg-[var(--tint-hover)] shadow-sm hover:shadow-[0_4px_16px_color-mix(in_srgb,var(--tint)_38%,transparent),inset_0_1px_0_rgba(255,255,255,0.22)] active:scale-[0.98]',
  secondary:
    'bg-[var(--fill)] text-[var(--label-primary)] hover:bg-[var(--fill-hover)] active:scale-[0.98]',
  success:
    'bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20 active:scale-[0.98]',
  warning:
    'bg-[var(--warning)]/10 text-[var(--warning)] hover:bg-[var(--warning)]/20 active:scale-[0.98]',
  ghost:
    'bg-transparent text-[var(--label-secondary)] hover:bg-[var(--fill)] hover:text-[var(--label-primary)]',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-10 min-h-10 min-w-10 px-3.5 text-xs',
  md: 'h-11 min-h-11 min-w-11 px-4 text-sm',
  lg: 'h-12 min-h-12 min-w-12 px-6 text-base',
}

function Slot({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) {
  const child = React.Children.only(children) as React.ReactElement<{
    className?: string
    children?: React.ReactNode
  }>
  return React.cloneElement(child, {
    ...props,
    ...child.props,
    className: [props.className, child.props.className].filter(Boolean).join(' '),
    children: (props.children as React.ReactNode | undefined) ?? child.props.children,
  })
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', loading = false, asChild = false, type = 'button', children, disabled, className = '', ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button'
    const isDisabled = disabled || loading
    const content = asChild ? (
      children
    ) : (
      <>
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {children}
      </>
    )

    return (
      <Comp
        ref={ref}
        {...(!asChild ? { disabled: isDisabled, type } : {})}
        className={[
          'inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium',
          'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tint)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]',
          'disabled:opacity-50 disabled:pointer-events-none',
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(' ')}
        {...props}
      >
        {content}
      </Comp>
    )
  },
)
Button.displayName = 'Button'
