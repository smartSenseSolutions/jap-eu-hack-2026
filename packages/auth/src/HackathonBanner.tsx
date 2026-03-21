export function HackathonBanner() {
  return (
    <div
      style={{
        width: '100%',
        background: '#0A0A0A',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '6px 16px',
        fontSize: '11px',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* smartSense geometric icon — official logo mark, white on black */}
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 28 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0 14.6817L9.71269 26.0885L24.3702 0L0 14.6817ZM20.648 3.83907L15.0787 13.76L3.65422 14.0902L20.6485 3.83907H20.648ZM9.49525 23.7082L2.48584 15.4935L14.2905 15.1494L9.49525 23.7082Z"
            fill="white"
          />
          <path
            d="M18.0674 14.0762L3.11084 39.9999L27.6169 25.6345L18.0669 14.0762H18.0674ZM18.2575 16.4566L25.1584 24.8089L13.1768 25.2494L18.2575 16.4566ZM6.85989 36.2162L12.375 26.667L23.881 26.2265L6.85989 36.2162Z"
            fill="white"
          />
        </svg>
      </span>

      <span style={{ fontWeight: 500, color: 'rgba(255,255,255,0.92)' }}>smartSense Consulting Solutions</span>
      <span style={{ fontSize: 14, lineHeight: 1 }}>🇮🇳</span>
      <span style={{ color: 'rgba(255,255,255,0.28)', margin: '0 2px' }}>·</span>
      <span style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 300 }}>INPACE Hackathon Tokyo 2026</span>
    </div>
  )
}
