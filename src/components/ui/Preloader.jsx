import React from 'react'

export default function Preloader({ fullScreen = false, message = null, style = {} }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        minHeight: fullScreen ? '100vh' : '360px',
        width: '100%',
        backgroundColor: fullScreen ? '#ffffff' : 'transparent',
        position: fullScreen ? 'fixed' : 'relative',
        inset: fullScreen ? 0 : 'auto',
        zIndex: fullScreen ? 9999 : 10,
        ...style
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '32px', width: '100%' }}>
        {/* Animated Brand Circular Spinner */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            border: '5px solid #e2e8f0',
            borderTopColor: '#2563eb',
            borderRightColor: '#10b981',
            animation: 'soluoSpin 0.75s linear infinite'
          }}
        />

        {/* Brand Logo Only (Large & Responsive) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: '85vw' }}>
          <img 
            src="/logo.png" 
            alt="SoluoPrint Logo" 
            style={{ 
              height: '160px', 
              maxHeight: '220px', 
              maxWidth: '520px', 
              width: '85vw', 
              objectFit: 'contain'
            }}
            onError={(e) => {
              e.target.style.display = 'none'
              const fallback = e.target.parentElement.querySelector('.brand-logo-fallback')
              if (fallback) fallback.style.display = 'flex'
            }}
          />
          <div 
            className="brand-logo-fallback" 
            style={{ 
              display: 'none', 
              alignItems: 'center', 
              gap: '14px', 
              fontWeight: 800, 
              fontSize: '42px', 
              color: '#1e293b', 
              letterSpacing: '-1px' 
            }}
          >
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #2563eb, #10b981)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '28px'
            }}>SP</div>
            <span>Soluo<span style={{ color: '#10b981' }}>Print</span></span>
          </div>
        </div>

        {message && (
          <div style={{ fontSize: '15px', color: '#64748b', fontWeight: 600, marginTop: '4px' }}>
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
