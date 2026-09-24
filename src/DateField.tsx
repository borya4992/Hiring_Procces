import { useEffect, useState } from 'react'
import { formatDate, parseDisplayDate } from './store'

export function DateField({
  value,
  onChange,
  min,
  max,
}: {
  value: string
  onChange: (iso: string) => void
  min?: string
  max?: string
}) {
  const [text, setText] = useState(() => (value ? formatDate(value) : ''))

  useEffect(() => {
    setText(value ? formatDate(value) : '')
  }, [value])

  const commit = (raw: string) => {
    const iso = parseDisplayDate(raw)
    if (!iso) {
      setText(value ? formatDate(value) : '')
      return
    }
    let next = iso
    if (min && next < min) next = min
    if (max && next > max) next = max
    onChange(next)
    setText(formatDate(next))
  }

  return (
    <input
      className="date-input"
      inputMode="numeric"
      placeholder="dd.mm.yyyy"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => commit(text)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          commit(text)
        }
      }}
    />
  )
}
