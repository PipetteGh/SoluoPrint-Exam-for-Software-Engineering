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
        minHeight: fullScreen ? '100vh' : '360px',
        width: '100%',
        backgroundColor: fullScreen ? '#ffffff' : 'transparent',
        position: fullScreen ? 'fixed' : 'relative',
        inset: fullScreen ? 0 : 'auto',
        zIndex: fullScreen ? 9999 : 10,
        ...style
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}>
        {/* Animated Brand Circular Spinner */}
        <div
          style={{
            width: '58px',
            height: '58px',
            borderRadius: '50%',
            border: '5px solid #e2e8f0',
            borderTopColor: '#2563eb',
            borderRightColor: '#10b981',
            animation: 'soluoSpin 0.75s linear infinite'
          }}
        />

        {/* Brand Logo Right Underneath Spinner */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: '85vw', marginTop: '-18px' }}>
          <img 
            src="/logo.png" 
            alt="SoluoPrint Logo" 
            style={{ 
              height: '140px', 
              maxHeight: '190px', 
              maxWidth: '480px', 
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
              gap: '12px', 
              fontWeight: 800, 
              fontSize: '36px', 
              color: '#1e293b', 
              letterSpacing: '-1px' 
            }}
          >
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #2563eb, #10b981)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '24px'
            }}>SP</div>
            <span>Soluo<span style={{ color: '#10b981' }}>Print</span></span>
          </div>
        </div>

        {message && (
          <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, marginTop: '-10px' }}>
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
