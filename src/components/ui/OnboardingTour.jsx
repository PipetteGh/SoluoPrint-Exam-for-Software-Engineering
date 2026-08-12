import { useState, useEffect } from 'react'
import { X, ChevronRight, ChevronLeft, Check, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function OnboardingTour({ steps, tourKey, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const hasSeen = localStorage.getItem(tourKey)
    if (!hasSeen) {
      // Small delay so it doesn't pop up instantly jarringly
      const timer = setTimeout(() => setIsVisible(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [tourKey])

  function handleComplete() {
    localStorage.setItem(tourKey, 'true')
    setIsVisible(false)
    if (onComplete) onComplete()
  }

  if (!isVisible) return null

  const step = steps[currentStep]

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal" style={{ maxWidth: '500px', animation: 'slideIn 0.3s ease-out' }}>
        <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ padding: '6px 12px', background: 'var(--primary)', color: 'white', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
              Step {currentStep + 1} of {steps.length}
            </div>
          </div>
          <button className="btn-close" onClick={handleComplete}><X size={20} /></button>
        </div>
        
        <div className="modal-body" style={{ padding: '24px 32px', minHeight: '150px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>{step.title}</h2>
          <div style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '15px', marginBottom: step.actionPath ? '24px' : '0' }}>
            {step.content}
          </div>
          
          {step.actionPath && (
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '15px' }}
              onClick={() => {
                navigate(step.actionPath)
                handleComplete() // Complete the tour if they take action, or we could just navigate
              }}
            >
              {step.actionText || 'Take me there'} <ExternalLink size={16} />
            </button>
          )}
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', padding: '20px 32px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => setCurrentStep(prev => prev - 1)}
            disabled={currentStep === 0}
            style={{ visibility: currentStep === 0 ? 'hidden' : 'visible' }}
          >
            <ChevronLeft size={18} /> Back
          </button>
          
          {currentStep === steps.length - 1 ? (
            <button className="btn btn-primary" onClick={handleComplete}>
              <Check size={18} style={{ marginRight: '6px' }}/> Got it!
            </button>
          ) : (
            <button className="btn btn-secondary" style={{ background: 'var(--bg-secondary)' }} onClick={() => setCurrentStep(prev => prev + 1)}>
              Next <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
