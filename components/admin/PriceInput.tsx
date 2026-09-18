'use client'

import React from 'react'

function fmt(raw: string): string {
  if (!raw && raw !== '0') return ''
  const [int, dec] = raw.split('.')
  const withCommas = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return dec !== undefined ? `${withCommas}.${dec}` : withCommas
}

/**
 * Text input that displays numbers with comma separators (e.g. 150,000).
 * `value` and `onChange` work with the raw numeric string — no commas —
 * so existing parseFloat() calls at submission remain unchanged.
 */
export default function PriceInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string | number
  onChange: (raw: string) => void
  placeholder?: string
  className?: string
}) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const stripped = e.target.value.replace(/,/g, '').replace(/[^\d.]/g, '')
    const parts = stripped.split('.')
    const clean = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : stripped
    onChange(clean)
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={fmt(String(value ?? ''))}
      onChange={handleChange}
      placeholder={placeholder ? fmt(placeholder) : ''}
      className={className}
    />
  )
}
