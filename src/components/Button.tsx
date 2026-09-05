import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary'
}

export function Button({ variant = 'primary', style, ...props }: Props) {
  const primary = variant === 'primary'
  return (
    <button
      {...props}
      style={{
        height: 56,
        borderRadius: 6,
        fontSize: 18,
        fontWeight: 500,
        fontFamily: 'var(--sans)',
        cursor: 'pointer',
        background: primary ? 'var(--ink)' : 'transparent',
        color: primary ? 'var(--paper)' : 'var(--ink)',
        border: primary ? 'none' : '1.5px solid var(--ink)',
        ...style,
      }}
    />
  )
}
