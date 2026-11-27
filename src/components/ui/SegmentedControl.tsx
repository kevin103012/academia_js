import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'

type SegmentValue = string | number

export interface SegmentOption<Value extends SegmentValue> {
  value: Value
  label: string
  shortLabel?: string
  icon?: ReactNode
  id?: string
  panelId?: string
}

interface SegmentedControlProps<Value extends SegmentValue> {
  label: string
  options: readonly SegmentOption<Value>[]
  value: Value
  onChange: (value: Value) => void
  className?: string
  tabs?: boolean
}

export function SegmentedControl<Value extends SegmentValue>({
  label, options, value, onChange, className, tabs = false,
}: SegmentedControlProps<Value>) {
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value))
  const style = {
    '--segment-count': options.length,
    '--segment-index': selectedIndex,
  } as CSSProperties

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const lastIndex = options.length - 1
    let nextIndex: number

    switch (event.key) {
      case 'ArrowRight':
        nextIndex = index === lastIndex ? 0 : index + 1
        break
      case 'ArrowLeft':
        nextIndex = index === 0 ? lastIndex : index - 1
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = lastIndex
        break
      default:
        return
    }

    event.preventDefault()
    if (index === nextIndex) return
    onChange(options[nextIndex].value)
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('.segment-control__option')[nextIndex]?.focus()
  }

  return (
    <div className={className ? `segment-control ${className}` : 'segment-control'} role={tabs ? 'tablist' : 'group'} aria-label={label} style={style}>
      <span className="segment-control__indicator" aria-hidden="true" />
      {options.map((option, index) => {
        const selected = selectedIndex === index
        return (
          <button
            key={option.value}
            type="button"
            className="segment-control__option"
            id={option.id}
            role={tabs ? 'tab' : undefined}
            aria-label={option.label}
            aria-selected={tabs ? selected : undefined}
            aria-pressed={tabs ? undefined : selected}
            aria-controls={option.panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => moveFocus(event, index)}
          >
            {option.icon}
            <span className="segment-control__label">{option.label}</span>
            {option.shortLabel && <span className="segment-control__short-label" aria-hidden="true">{option.shortLabel}</span>}
          </button>
        )
      })}
    </div>
  )
}
