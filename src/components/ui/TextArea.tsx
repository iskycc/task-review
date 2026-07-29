import * as React from 'react'

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, hint, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]" htmlFor={props.id}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={[
            'w-full rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3 text-sm',
            'text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error ? 'border-[var(--danger)] focus-visible:ring-[var(--danger)]' : '',
            className,
          ].join(' ')}
          {...props}
        />
        {hint && !error && <p className="mt-1.5 text-xs text-[var(--text-secondary)]">{hint}</p>}
        {error && <p className="mt-1.5 text-xs text-[var(--danger)]">{error}</p>}
      </div>
    )
  },
)
TextArea.displayName = 'TextArea'
