import React from 'react'

export default function Preloader({ fullScreen = false, message = null, style = {} }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        minHeight: fullScreen ? '100vh' : '320px',
        width: '100%',
        backgroundColor: fullScreen ? '#ffffff' : 'transparent',
        position: fullScreen ? 'fixed' : 'relative',
        inset: fullScreen ? 0 : 'auto',
        zIndex: fullScreen ? 9999 : 10,
        ...style
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
        {/* Animated Brand Circular Spinner */}
        <div
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            border: '4px solid #e2e8f0',
            borderTopColor: '#2563eb',
            borderRightColor: '#10b981',
            animation: 'soluoSpin 0.75s linear infinite'
          }}
        />

        {/* Brand Logo Only (Prominent & Responsive) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: '85vw' }}>
          <img 
            src="/logo.png" 
            alt="SoluoPrint Logo" 
            style={{ 
              height: '75px', 
              maxHeight: '100px', 
              maxWidth: '280px', 
              width: 'auto', 
              objectFit: 'contain',
              filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.06))'
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
              gap: '10px', 
              fontWeight: 800, 
              fontSize: '28px', 
              color: '#1e293b', 
              letterSpacing: '-0.5px' 
            }}
          >
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563eb, #10b981)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '20px'
            }}>SP</div>
            <span>Soluo<span style={{ color: '#10b981' }}>Print</span></span>
          </div>
        </div>

        {message && (
          <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
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
