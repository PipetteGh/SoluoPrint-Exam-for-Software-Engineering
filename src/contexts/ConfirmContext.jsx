import React, { createContext, useContext, useState } from 'react'
import ConfirmModal from '../components/modals/ConfirmModal'

const ConfirmContext = createContext()

export function ConfirmProvider({ children }) {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(false)

  const confirm = (options = {}) => {
    // Support passing string or options object
    const opts = typeof options === 'string' ? { message: options } : options
    return new Promise((resolve) => {
      setConfig({
        title: opts.title || 'Confirm Action',
        message: opts.message || 'Are you sure you want to perform this action?',
        confirmText: opts.confirmText || 'Yes',
        cancelText: opts.cancelText || 'Cancel',
        type: opts.type || 'danger',
        resolve
      })
    })
  }

  const handleConfirm = async () => {
    if (config?.resolve) {
      setLoading(true)
      await config.resolve(true)
      setLoading(false)
    }
    setConfig(null)
  }

  const handleCancel = () => {
    if (config?.resolve) {
      config.resolve(false)
    }
    setConfig(null)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {config && (
        <ConfirmModal
          isOpen={!!config}
          title={config.title}
          message={config.message}
          confirmText={config.confirmText}
          cancelText={config.cancelText}
          type={config.type}
          loading={loading}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context
}
