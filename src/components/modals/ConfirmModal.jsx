import React from 'react'
import { AlertTriangle, Trash2, X, HelpCircle } from 'lucide-react'

export default function ConfirmModal({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed? This action cannot be undone.',
  confirmText = 'Yes, Proceed',
  cancelText = 'Cancel',
  type = 'danger',
  onConfirm,
  onCancel,
  loading = false
}) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" style={{ zIndex: 10000 }}>
      <div className="modal modal-sm" style={{ maxWidth: '440px', padding: 0, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', border: '1px solid var(--border)' }}>
        
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          background: type === 'danger' ? '#fef2f2' : type === 'warning' ? '#fffbeb' : '#eff6ff',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: '1px solid var(--border)'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: type === 'danger' ? '#fee2e2' : type === 'warning' ? '#fef3c7' : '#dbeafe',
            color: type === 'danger' ? '#ef4444' : type === 'warning' ? '#d97706' : '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {type === 'danger' ? <Trash2 size={22} /> : type === 'warning' ? <AlertTriangle size={22} /> : <HelpCircle size={22} />}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{title}</h3>
          </div>
          <button 
            type="button"
            className="close-btn" 
            onClick={onCancel}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>
          {message}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          background: '#f8fafc',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          borderTop: '1px solid var(--border)'
        }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onCancel}
            disabled={loading}
            style={{ padding: '8px 20px', borderRadius: '8px', fontWeight: 600 }}
          >
            {cancelText}
          </button>
          <button 
            type="button" 
            className="btn"
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              fontWeight: 600,
              backgroundColor: type === 'danger' ? '#ef4444' : '#2563eb',
              borderColor: type === 'danger' ? '#ef4444' : '#2563eb',
              color: 'white'
            }}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>

      </div>
    </div>
  )
}
