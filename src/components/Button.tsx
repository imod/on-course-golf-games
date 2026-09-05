import type { ButtonHTMLAttributes, CSSProperties } from 'react'

export type ButtonVariant = 'primary' | 'secondary'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}

/**
 * Single source of truth for how a primary/secondary action looks. `Button`
 * applies this to a real `<button>`; anything that needs the same appearance
 * on a non-button element (e.g. a navigating `<Link>`) can spread this
 * directly onto its own `style` prop instead of hand-copying the values.
 */
export function buttonStyle(variant: ButtonVariant = 'primary'): CSSProperties {
  const primary = variant === 'primary'
  return {
    height: 56,
    borderRadius: 6,
    fontSize: 18,
    fontWeight: 500,
    fontFamily: 'var(--sans)',
    cursor: 'pointer',
    background: primary ? 'var(--ink)' : 'transparent',
    color: primary ? 'var(--paper)' : 'var(--ink)',
    border: primary ? 'none' : '1.5px solid var(--ink)',
  }
}

export function Button({ variant = 'primary', style, ...props }: Props) {
  return (
    <button
      {...props}
      style={{
        ...buttonStyle(variant),
        ...style,
      }}
    />
  )
}
