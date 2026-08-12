import { useState, useEffect } from 'react'
import { Wifi, WifiOff, X, AlertCircle } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'

export default function ConnectivityManager() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showPrompt, setShowPrompt] = useState(false)
  const toast = useToast()

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowPrompt(false)
      toast.success('You are back online!')
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowPrompt(true)
      toast.error('Internet connection lost.')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial check
    if (!navigator.onLine) {
      setShowPrompt(true)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [toast])

  if (!showPrompt) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      width: 'max-content',
      maxWidth: '90vw'
    }}>
      <div style={{
        background: '#fff1f2',
        border: '1px solid #fda4af',
        borderRadius: '12px',
        padding: '12px 20px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{ 
          width: '36px', 
          height: '36px', 
          borderRadius: '50%', 
          background: '#fee2e2', 
          color: '#ef4444', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <WifiOff size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#991b1b' }}>Connection Issues</div>
          <div style={{ fontSize: '12px', color: '#b91c1c' }}>You are currently offline. Some features may not work.</div>
        </div>
        <button 
          onClick={() => setShowPrompt(false)}
          style={{ 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer', 
            color: '#ef4444',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#fecaca'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
