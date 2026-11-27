import { useId } from 'react'

export function SparksEmblem({ size = 38 }: { size?: number }) {
  const gradId = useId()
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="sparks-emblem"
    >
      <defs>
        <linearGradient id={gradId} x1="4" y1="4" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#14171c" />
          <stop offset="100%" stopColor="#232832" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="40" height="40" rx="12" fill={`url(#${gradId})`} stroke="var(--surf, #00c2b5)" strokeWidth="1.6" />
      <path
        d="M12 14L20 22M12 30L20 22M32 13L24 22"
        stroke="var(--surf, #00c2b5)"
        strokeOpacity="0.45"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="11.5" cy="14" r="2.7" fill="var(--surf, #00c2b5)" />
      <circle cx="11.5" cy="30" r="2.7" fill="var(--surf, #00c2b5)" />
      <circle cx="32.5" cy="13" r="2.7" fill="var(--surf, #00c2b5)" />
      <path
        d="M24.2 8.5L16.5 22.8H22.2L19.6 35.5L29.2 19.8H23.2L24.2 8.5Z"
        fill="#ffffff"
        stroke="var(--surf, #00c2b5)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function SparksWordmark() {
  return (
    <span className="sparks-wordmark">
      <SparksEmblem size={40} />
      <span className="sparks-wordmark-text">
        <strong>Junior’s</strong>
        <span>
          Sparks
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M9.5 1.5L4 9H8.2L6.8 14.5L12.5 6.8H8.3L9.5 1.5Z" fill="var(--surf, #00c2b5)" />
          </svg>
        </span>
      </span>
    </span>
  )
}
