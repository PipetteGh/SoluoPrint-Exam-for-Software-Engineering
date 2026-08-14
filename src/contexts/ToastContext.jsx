import { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react'
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react'

const ToastContext = createContext(null)

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef({})

  const removeToast = useCallback((id) => {
    setToasts(ts => ts.map(t => t.id === id ? { ...t, exiting: true } : t))
    setTimeout(() => {
      setToasts(ts => ts.filter(t => t.id !== id))
      if (timersRef.current[id]) {
        clearTimeout(timersRef.current[id])
        delete timersRef.current[id]
      }
    }, 300)
  }, [])

  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = ++toastId
    setToasts(ts => [...ts, { id, message, type, exiting: false }])
    timersRef.current[id] = setTimeout(() => removeToast(id), duration)
    return id
  }, [removeToast])

  const toast = useMemo(() => ({
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error', 6000),
    info: (msg) => addToast(msg, 'info'),
    warning: (msg) => addToast(msg, 'warning', 5000),
    showToast: (msg, type = 'success') => addToast(msg, type),
  }), [addToast])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

const ICONS = {
  success: <CheckCircle size={18} />,
  error: <AlertCircle size={18} />,
  info: <Info size={18} />,
  warning: <AlertTriangle size={18} />,
}
const COLORS = {
  success: { bg: '#f0fdf4', border: '#86efac', text: '#166534', icon: '#16a34a' },
  error: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', icon: '#dc2626' },
  info: { bg: '#eff6ff', border: '#93c5fd', text: '#1e3a8a', icon: '#2563eb' },
  warning: { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', icon: '#d97706' },
}

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed', top: '20px', right: '20px',
      display: 'flex', flexDirection: 'column', gap: '10px',
      zIndex: 99999, pointerEvents: 'none',
      maxWidth: '400px', width: '100%'
    }}>
      {toasts.map(t => {
        const c = COLORS[t.type] || COLORS.info
        return (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '14px 16px',
            background: c.bg, border: `1px solid ${c.border}`,
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            animation: t.exiting ? 'toast-out 0.3s ease-in forwards' : 'toast-in 0.35s ease-out',
            pointerEvents: 'auto',
            fontSize: '13px', fontWeight: 500, color: c.text,
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ color: c.icon, flexShrink: 0, display: 'flex' }}>{ICONS[t.type]}</div>
            <div style={{ flex: 1, lineHeight: 1.4 }}>{t.message}</div>
            <button onClick={() => onDismiss(t.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: c.icon,
              padding: '2px', flexShrink: 0, display: 'flex', opacity: 0.6,
            }}>
              <X size={14} />
            </button>
          </div>
        )
      })}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes toast-out {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}
