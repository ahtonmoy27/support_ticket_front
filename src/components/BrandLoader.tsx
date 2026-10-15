interface BrandLoaderProps {
  label?: string
  sublabel?: string
  compact?: boolean
}

export function BrandLoader({
  label = 'Opening Support Desk…',
  sublabel = 'MAKE EVERY REPLY COUNT',
  compact = false,
}: BrandLoaderProps) {
  return (
    <div
      className={`brand-loader ${compact ? 'is-compact' : ''}`}
      role="status"
      aria-label={label}
    >
      <div className="brand-loader-logo-wrap" aria-hidden="true">
        <div className="brand-loader-pulse-ring" />
        <div className="brand-loader-badge">
          <svg
            viewBox="0 0 40 40"
            width={compact ? 28 : 36}
            height={compact ? 28 : 36}
            className="brand-loader-svg"
            fill="none"
          >
            <path
              d="M11 12h18v13H19l-6 5v-5h-2z"
              stroke="#e9f5b7"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <path
              d="M16 17h8m-8 4h5"
              stroke="#e9f5b7"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      <div className="brand-loader-title">
        <span>Support</span>
        <span className="brand-light">Desk</span>
      </div>

      {sublabel && !compact && (
        <small className="brand-loader-tagline">{sublabel}</small>
      )}

      <div className="brand-loader-bar-wrap" aria-hidden="true">
        <div className="brand-loader-bar" />
      </div>

      <p className="brand-loader-text">{label}</p>
    </div>
  )
}

