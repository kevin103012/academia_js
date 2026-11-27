export function LoadingMark({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <span className={`loading-mark${compact ? ' loading-mark--compact' : ''}`} role="status">
      <span className="loading-mark__motion" aria-hidden="true"><i /><i /><i /></span>
      <span>{label}</span>
    </span>
  )
}
