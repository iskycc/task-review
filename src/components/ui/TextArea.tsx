import * as React from 'react'

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, hint, error, className = '', id: propsId, ...props }, ref) => {
    const generatedId = React.useId()
    const id = propsId ?? generatedId
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-sm font-medium text-[var(--label-primary)]" htmlFor={id}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={[
            'w-full resize-y rounded-[var(--radius-md)] border border-[var(--separator)] bg-[var(--surface-secondary)] px-4 py-3 text-sm',
            'text-[var(--label-primary)] placeholder:text-[var(--label-tertiary)]',
            'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]',
            'focus-visible:outline-none focus-visible:border-[var(--tint)] focus-visible:ring-2 focus-visible:ring-[var(--tint)]/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error
              ? 'border-[var(--danger)] focus-visible:border-[var(--danger)] focus-visible:ring-[var(--danger)]/20'
              : 'hover:border-[var(--label-tertiary)]',
            className,
          ].join(' ')}
          {...props}
        />
        {hint && !error && <p className="mt-1.5 text-xs text-[var(--label-secondary)]">{hint}</p>}
        {error && <p className="mt-1.5 text-xs text-[var(--danger-label)]">{error}</p>}
      </div>
    )
  },
)
TextArea.displayName = 'TextArea'
