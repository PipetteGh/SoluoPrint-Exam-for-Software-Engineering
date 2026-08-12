import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { X, Maximize2 } from 'lucide-react'

export default function PriceCalculatorModal({ service, currency, onClose }) {
  const [presets, setPresets] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    width: 8.3,
    height: 11.7,
    unit: 'Inches',
    quantity: 1,
    selectedPreset: ''
  })

  useEffect(() => {
    loadPresets()
  }, [])

  async function loadPresets() {
    const { data } = await supabase
      .from('preset_sizes')
      .select('*')
      .order('sort_order', { ascending: true })
    setPresets(data || [])
    
    // Try to find A4 as default if it exists
    const a4 = data?.find(p => p.name.toLowerCase().includes('a4'))
    if (a4) {
      setForm(f => ({
        ...f,
        width: a4.width,
        height: a4.height,
        unit: a4.unit,
        selectedPreset: a4.id
      }))
    }
    setLoading(false)
  }

  function handlePresetChange(e) {
    const presetId = e.target.value
    if (!presetId) {
      setForm(f => ({ ...f, selectedPreset: '', width: '', height: '' }))
      return
    }
    const preset = presets.find(p => p.id === presetId)
    if (preset) {
      setForm(f => ({
        ...f,
        selectedPreset: presetId,
        width: preset.width,
        height: preset.height,
        unit: preset.unit
      }))
    } else if (presetId === 'custom') {
      setForm(f => ({ ...f, selectedPreset: 'custom' }))
    }
  }

  // Conversion logic to Square Feet
  const getSqFt = () => {
    const w = parseFloat(form.width) || 0
    const h = parseFloat(form.height) || 0
    let areaInSqFt = 0

    if (form.unit === 'Inches') {
      areaInSqFt = (w * h) / 144
    } else if (form.unit === 'Feet') {
      areaInSqFt = w * h
    } else if (form.unit === 'Centimeters') {
      areaInSqFt = (w * h) / 929.03
    } else if (form.unit === 'Meters') {
      areaInSqFt = (w * h) * 10.7639
    }

    return areaInSqFt
  }

  const sqFt = getSqFt() || 0
  const qty = parseInt(form.quantity) || 1
  
  const individualTotal = sqFt * (service?.unit_price || 0) * qty
  const resellerTotal = sqFt * (service?.agency_price || 0) * qty
  const corporateTotal = sqFt * (service?.corporate_price || 0) * qty

  const individualPerPiece = sqFt * (service?.unit_price || 0)

  const formatPrice = (val) => {
    const num = parseFloat(val)
    return isNaN(num) ? '0.00' : num.toFixed(2)
  }

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Price Calculator - {service.name}</h2>
          <button className="modal-close" onClick={onClose}><X /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Calculate total pricing for different customer types with dimensional specifications
          </p>

          <div style={{ background: '#f0f7ff', border: '1px solid #cce3ff', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '12px' }}>Dimensions</div>
            
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '12px' }}>Popular Sizes</label>
              <select className="form-control" value={form.selectedPreset} onChange={handlePresetChange}>
                <option value="custom">Custom Size</option>
                {presets.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.width}×{p.height} {p.unit.toLowerCase()})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Width</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={form.width} 
                  onChange={e => setForm(f => ({ ...f, width: e.target.value, selectedPreset: 'custom' }))} 
                  step="0.01"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Height</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={form.height} 
                  onChange={e => setForm(f => ({ ...f, height: e.target.value, selectedPreset: 'custom' }))} 
                  step="0.01"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Unit</label>
                <select 
                  className="form-control" 
                  value={form.unit} 
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                >
                  {['Inches', 'Feet', 'Centimeters', 'Meters'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginTop: '12px', padding: '8px 12px', background: 'white', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
              Dimensions: <strong>{form.width} × {form.height} {form.unit.toLowerCase()}</strong> 
              <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>(≈ {sqFt.toFixed(2)} sq ft)</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Quantity</label>
            <input 
              type="number" 
              className="form-control" 
              value={form.quantity} 
              onChange={e => setForm(f => ({ ...f, quantity: Math.max(1, parseInt(e.target.value) || 1) }))} 
              min="1"
            />
          </div>

          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Individual/Consumer:</span>
              <span style={{ fontWeight: 700, fontSize: '16px' }}>{currency}{formatPrice(individualTotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Institution/Corporate:</span>
              <span style={{ fontWeight: 700, fontSize: '16px' }}>{currency}{formatPrice(corporateTotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Artist/Reseller:</span>
              <span style={{ fontWeight: 700, fontSize: '16px' }}>{currency}{formatPrice(resellerTotal)}</span>
            </div>
          </div>

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-muted)' }}>
            <div>Base Price: {currency}{formatPrice(service?.unit_price || 0)} per sq ft</div>
            <div>Price per piece: {currency}{formatPrice(individualPerPiece)}</div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
