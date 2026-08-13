import React from 'react'

export default function Preloader({ fullScreen = false, message = null, style = {} }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justify: 'center',
        padding: fullScreen ? '60px 20px' : '40px 20px',
        minHeight: fullScreen ? '100vh' : '260px',
        width: '100%',
        backgroundColor: fullScreen ? '#ffffff' : 'transparent',
        position: fullScreen ? 'fixed' : 'relative',
        inset: fullScreen ? 0 : 'auto',
        zIndex: fullScreen ? 9999 : 10,
        ...style
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        {/* Animated Circular Spinner Arc */}
        <div
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            border: '4px solid #e2e8f0',
            borderTopColor: '#2563eb',
            borderRightColor: '#6366f1',
            animation: 'soluoSpin 0.75s linear infinite'
          }}
        />

        {/* Brand Logo & Subtitle */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img 
            src="/logo.png" 
            alt="SoluoPrint" 
            style={{ height: '38px', width: 'auto', objectFit: 'contain', marginBottom: '4px' }}
            onError={(e) => {
              e.target.style.display = 'none'
            }}
          />
          <div style={{ fontWeight: 800, fontSize: '18px', color: '#1e293b', letterSpacing: '-0.4px', lineHeight: 1.2 }}>
            Soluo<span style={{ color: '#10b981' }}>Print</span>
          </div>
          <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#64748b', letterSpacing: '1.2px', textTransform: 'uppercase', marginTop: '2px' }}>
            PRINT MANAGEMENT SOFTWARE
          </div>
        </div>

        {message && (
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
            {message}
          </div>
        )}
      </div>

      <style>{`
        @keyframes soluoSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
