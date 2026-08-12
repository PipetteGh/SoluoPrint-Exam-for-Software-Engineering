import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import {
  BarChart2, RefreshCw, Briefcase, Clock, CreditCard, DollarSign,
  Calculator, Maximize2, ArrowLeftRight, Tag, RefreshCcw, TrendingUp, TrendingDown, FileText, Activity, Calendar,
  Users, Settings, Layers, PieChart
} from 'lucide-react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { Link } from 'react-router-dom'
import { CardSkeleton, StatSkeleton } from '../components/ui/Skeletons'
import NewJobModal from '../components/modals/NewJobModal'
import NewCustomerModal from '../components/modals/NewCustomerModal'
import NewPaymentModal from '../components/modals/NewPaymentModal'
import NewServiceModal from '../components/modals/NewServiceModal'
import NewExpenseModal from '../components/modals/NewExpenseModal'
import SEO from '../components/ui/SEO'

ChartJS.register(ArcElement, Filler, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend)

const customCanvasBackgroundColor = {
  id: 'customCanvasBackgroundColor',
  beforeDraw: (chart, args, options) => {
    const {ctx} = chart;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = options.color || '#ffffff';
    ctx.fillRect(0, 0, chart.width, chart.height);
    ctx.restore();
  }
};
ChartJS.register(customCanvasBackgroundColor);

// ─── LARGE FORMAT CALCULATOR ───────────────────────────────────────
const SIZE_PRESETS = [
  { label: 'A4 (8.3 × 11.7 inches)', w: 8.3, h: 11.7, unit: 'Inches' },
  { label: 'A3 (11.7 × 16.5 inches)', w: 11.7, h: 16.5, unit: 'Inches' },
  { label: 'A2 (16.5 × 23.4 inches)', w: 16.5, h: 23.4, unit: 'Inches' },
  { label: 'A1 (23.4 × 33.1 inches)', w: 23.4, h: 33.1, unit: 'Inches' },
  { label: 'A0 (33.1 × 46.8 inches)', w: 33.1, h: 46.8, unit: 'Inches' },
  { label: '2×3 ft Banner', w: 2, h: 3, unit: 'Feet' },
  { label: '3×5 ft Banner', w: 3, h: 5, unit: 'Feet' },
  { label: '4×6 ft Banner', w: 4, h: 6, unit: 'Feet' },
  { label: '6×10 ft Banner', w: 6, h: 10, unit: 'Feet' },
  { label: 'Custom', w: '', h: '', unit: 'Feet' },
]

const UNIT_OPTIONS = ['Feet', 'Inches', 'Meters', 'Centimeters']

function LargeFormatCalculator({ company }) {
  const [services, setServices] = useState([])
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [selectedPreset, setSelectedPreset] = useState(SIZE_PRESETS[0])
  const [width, setWidth] = useState('8.3')
  const [height, setHeight] = useState('11.7')
  const [unit, setUnit] = useState('Inches')
  const [qty, setQty] = useState(1)
  const [servicePrice, setServicePrice] = useState(null)
  const currency = company?.currency_symbol || '¢'

  useEffect(() => {
    if (!company) return
    supabase
      .from('services').select('id,name,unit_price,consumer_price,agency_price,corporate_price')
      .eq('company_id', company.id).eq('is_active', true)
      .then(({ data }) => setServices(data || []))
  }, [company])

  function handlePresetChange(e) {
    const idx = parseInt(e.target.value)
    const preset = SIZE_PRESETS[idx]
    setSelectedPreset(preset)
    if (preset.w !== '') { setWidth(String(preset.w)); setHeight(String(preset.h)); setUnit(preset.unit) }
  }

  function handleServiceChange(e) {
    const id = e.target.value
    setSelectedServiceId(id)
    const svc = services.find(s => s.id === id)
    setServicePrice(svc || null)
  }

  // Convert raw area to sq ft for pricing (services are priced per sq ft)
  const rawArea = (parseFloat(width) || 0) * (parseFloat(height) || 0)
  // Conversion factor from input unit² to sq ft
  function getSqFtDivisor(u) {
    if (u === 'Inches') return 144       // 12×12
    if (u === 'Centimeters') return 929.03 // 30.48²
    if (u === 'Meters') return 0.0929    // 1/10.764
    return 1                              // Feet → already sq ft
  }
  const divisor = getSqFtDivisor(unit)
  const areaSqFt = divisor === 1 ? rawArea : (divisor < 1 ? rawArea / divisor : rawArea / divisor)
  const areaSqFtRounded = parseFloat(areaSqFt.toFixed(4))

  const basePrice = servicePrice?.unit_price || 0
  const pricePerPiece = areaSqFtRounded * basePrice
  const consumerTotal = (pricePerPiece * qty).toFixed(2)
  const agencyTotal = ((servicePrice?.agency_price || basePrice * 0.85) * areaSqFtRounded * qty).toFixed(2)
  const corporateTotal = ((servicePrice?.corporate_price || basePrice * 0.75) * areaSqFtRounded * qty).toFixed(2)
  const hasService = !!servicePrice

  // Build conversion step text
  const needsConversion = unit !== 'Feet'
  const conversionText = needsConversion
    ? `${width || '0'} × ${height || '0'} ÷ ${divisor} = ${areaSqFtRounded} sq ft`
    : `${width || '0'} × ${height || '0'} = ${areaSqFtRounded} sq ft`

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 600, fontSize: '14px' }}>
          <Maximize2 size={16} /> Large Format Calculator
        </div>
        <button className="btn btn-ghost btn-xs" onClick={() => { setWidth(''); setHeight(''); setQty(1); setSelectedServiceId(''); setServicePrice(null) }}>
          <RefreshCcw size={12} /> Refresh
        </button>
      </div>

      <div className="form-row" style={{ marginBottom: '12px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Service Type</label>
          <select className="form-control" value={selectedServiceId} onChange={handleServiceChange}>
            <option value="">No large format services available</option>
            {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Size</label>
          <select className="form-control" onChange={handlePresetChange}>
            {SIZE_PRESETS.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
          </select>
        </div>
      </div>

      <div className="form-row-3" style={{ marginBottom: '12px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Width</label>
          <input className="form-control" type="number" placeholder="0" value={width} onChange={e => setWidth(e.target.value)} step="0.1" />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Height</label>
          <input className="form-control" type="number" placeholder="0" value={height} onChange={e => setHeight(e.target.value)} step="0.1" />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Unit</label>
          <select className="form-control" value={unit} onChange={e => setUnit(e.target.value)}>
            {UNIT_OPTIONS.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: '14px' }}>
        <label className="form-label">Quantity</label>
        <input className="form-control" type="number" value={qty} onChange={e => setQty(parseInt(e.target.value) || 1)} min="1" style={{ maxWidth: '100px' }} />
      </div>

      {/* Service Pricing section */}
      <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '12px' }}>
        <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Service Pricing</div>
        <div style={{ color: 'var(--text-muted)' }}>
          {hasService ? `${currency}${basePrice.toFixed(2)} per sq ft` : 'Select a service to view pricing'}
        </div>
      </div>

      {/* How Total Cost is Calculated */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '12px' }}>
        <div style={{ fontWeight: 600, color: '#1e40af', marginBottom: '4px' }}>How Total Cost is Calculated:</div>
        <div style={{ color: '#1e3a8a', lineHeight: '1.6' }}>
          Step 1: {conversionText}<br />
          Step 2: {areaSqFtRounded} sq ft × {currency}{basePrice.toFixed(2)} per sq ft = {currency}{pricePerPiece.toFixed(2)} per piece<br />
          Step 3: {currency}{pricePerPiece.toFixed(2)} per piece × {qty} qty = {currency}{(pricePerPiece * qty).toFixed(2)}
        </div>
      </div>

      {/* Pricing breakdown by customer type */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        {[
          { label: 'Individual/Consumer', total: consumerTotal, color: '#2563eb' },
          { label: 'Agency/Reseller', total: agencyTotal, color: '#7c3aed' },
          { label: 'Institution/Corporate', total: corporateTotal, color: '#059669' },
        ].map(({ label, total, color }) => (
          <div key={label} style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', textAlign: 'left' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color }}>{currency}{total}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Total Cost</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── SIMPLE CALCULATOR (iOS style) ──────────────────────────────────
function SimpleCalculator() {
  const [display, setDisplay] = useState('0')
  const [expr, setExpr] = useState('')
  const [waitingForOperand, setWaitingForOperand] = useState(false)
  const [operator, setOperator] = useState(null)
  const [prevValue, setPrevValue] = useState(null)

  function handleDigit(d) {
    if (waitingForOperand) { setDisplay(d); setWaitingForOperand(false) }
    else { setDisplay(display === '0' ? d : display + d) }
  }

  function handleDot() {
    if (waitingForOperand) { setDisplay('0.'); setWaitingForOperand(false); return }
    if (!display.includes('.')) setDisplay(display + '.')
  }

  function handleOperator(op) {
    const current = parseFloat(display)
    if (prevValue != null && !waitingForOperand) {
      const result = calculate(prevValue, current, operator)
      setDisplay(String(result))
      setPrevValue(result)
    } else { setPrevValue(current) }
    setOperator(op)
    setWaitingForOperand(true)
  }

  function calculate(a, b, op) {
    if (op === '+') return a + b
    if (op === '-') return a - b
    if (op === '*') return a * b
    if (op === '/') return b !== 0 ? a / b : 0
    return b
  }

  function handleEquals() {
    if (operator && prevValue != null) {
      const result = calculate(prevValue, parseFloat(display), operator)
      const formatted = parseFloat(result.toFixed(8))
      setDisplay(String(formatted))
      setPrevValue(null); setOperator(null); setWaitingForOperand(true)
    }
  }

  function handleAC() { setDisplay('0'); setExpr(''); setWaitingForOperand(false); setOperator(null); setPrevValue(null) }
  function handlePlusMinus() { setDisplay(String(parseFloat(display) * -1)) }
  function handlePercent() { setDisplay(String(parseFloat(display) / 100)) }

  const btnStyle = (type) => ({
    height: '56px', borderRadius: '50%', border: 'none', cursor: 'pointer',
    fontWeight: '500', fontSize: '20px', transition: 'all 0.1s',
    background: type === 'op' ? '#FF9F0A' : type === 'fn' ? '#a5a5a5' : '#333',
    color: type === 'fn' ? '#1c1c1e' : 'white',
  })

  return (
    <div style={{ maxWidth: '280px', margin: '0 auto' }}>
      {/* Display */}
      <div style={{ background: '#1c1c1e', borderRadius: '12px 12px 0 0', padding: '20px 16px 12px', textAlign: 'right', marginBottom: '4px' }}>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', minHeight: '18px', marginBottom: '4px' }}>
          {operator ? `${prevValue} ${operator}` : ''}
        </div>
        <div style={{ color: 'white', fontSize: display.length > 9 ? '24px' : '40px', fontWeight: '300', letterSpacing: '-1px', lineHeight: 1 }}>
          {parseFloat(display).toLocaleString('en', { maximumFractionDigits: 8 })}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ background: '#1c1c1e', borderRadius: '0 0 12px 12px', padding: '8px 12px 16px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
        <button style={btnStyle('fn')} onClick={handleAC}>AC</button>
        <button style={btnStyle('fn')} onClick={handlePlusMinus}>+/-</button>
        <button style={btnStyle('fn')} onClick={handlePercent}>%</button>
        <button style={{...btnStyle('op'), background: operator === '/' ? '#fff' : '#FF9F0A', color: operator === '/' ? '#FF9F0A' : 'white'}} onClick={() => handleOperator('/')}>÷</button>

        {[7,8,9].map(n => <button key={n} style={btnStyle('num')} onClick={() => handleDigit(String(n))}>{n}</button>)}
        <button style={{...btnStyle('op'), background: operator === '*' ? '#fff' : '#FF9F0A', color: operator === '*' ? '#FF9F0A' : 'white'}} onClick={() => handleOperator('*')}>×</button>

        {[4,5,6].map(n => <button key={n} style={btnStyle('num')} onClick={() => handleDigit(String(n))}>{n}</button>)}
        <button style={{...btnStyle('op'), background: operator === '-' ? '#fff' : '#FF9F0A', color: operator === '-' ? '#FF9F0A' : 'white'}} onClick={() => handleOperator('-')}>−</button>

        {[1,2,3].map(n => <button key={n} style={btnStyle('num')} onClick={() => handleDigit(String(n))}>{n}</button>)}
        <button style={{...btnStyle('op'), background: operator === '+' ? '#fff' : '#FF9F0A', color: operator === '+' ? '#FF9F0A' : 'white'}} onClick={() => handleOperator('+')}>+</button>

        <button style={{...btnStyle('num'), gridColumn:'span 2', borderRadius:'28px'}} onClick={() => handleDigit('0')}>0</button>
        <button style={btnStyle('num')} onClick={handleDot}>.</button>
        <button style={{...btnStyle('op')}} onClick={handleEquals}>=</button>
      </div>
      <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Click calculator to use keyboard input</p>
    </div>
  )
}

// ─── UNIT CONVERTER ──────────────────────────────────────────────────
const UNIT_GROUPS = {
  Length: {
    Millimeters: 1, Centimeters: 10, Meters: 1000, Kilometers: 1e6,
    Inches: 25.4, Feet: 304.8, Yards: 914.4, Miles: 1609344
  },
  Area: {
    'mm²': 1, 'cm²': 100, 'm²': 1e6, 'km²': 1e12,
    'in²': 645.16, 'ft²': 92903.04, 'yd²': 836127.36
  },
  Weight: {
    Milligrams: 1, Grams: 1000, Kilograms: 1e6, Tons: 1e9,
    Ounces: 28349.5, Pounds: 453592
  },
}

function UnitConverter() {
  const [type, setType] = useState('Length')
  const [value, setValue] = useState('1')
  const [from, setFrom] = useState('Inches')
  const [to, setTo] = useState('Centimeters')

  const units = Object.keys(UNIT_GROUPS[type])
  const factors = UNIT_GROUPS[type]

  useEffect(() => {
    const firstTwo = Object.keys(UNIT_GROUPS[type])
    setFrom(firstTwo[4] || firstTwo[0]); setTo(firstTwo[1])
  }, [type])

  const result = value && factors[from] && factors[to]
    ? ((parseFloat(value) * factors[from]) / factors[to]).toFixed(6).replace(/\.?0+$/, '')
    : ''

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 600, fontSize: '14px', marginBottom: '14px' }}>
        <ArrowLeftRight size={16} /> Unit Converter
      </div>
      <div className="form-row" style={{ marginBottom: '10px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Type</label>
          <select className="form-control" value={type} onChange={e => setType(e.target.value)}>
            {Object.keys(UNIT_GROUPS).map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Value</label>
          <input className="form-control" type="number" value={value} onChange={e => setValue(e.target.value)} />
        </div>
      </div>
      <div className="form-row" style={{ marginBottom: '10px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">From</label>
          <select className="form-control" value={from} onChange={e => setFrom(e.target.value)}>
            {units.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">To</label>
          <select className="form-control" value={to} onChange={e => setTo(e.target.value)}>
            {units.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
      </div>
      {result && (
        <div style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: 'white', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
          <span style={{ fontSize: '13px', opacity: 0.8 }}>{value} {from} =</span>
          <span style={{ fontSize: '20px', fontWeight: 800 }}>{result} {to}</span>
        </div>
      )}
    </div>
  )
}

// ─── SERVICES PRICE CHECKER ──────────────────────────────────────────
function ServicesPriceChecker({ company }) {
  const [categories, setCategories] = useState([])
  const [services, setServices] = useState([])
  const [selectedCat, setSelectedCat] = useState('')
  const [selectedSvc, setSelectedSvc] = useState('')
  const [qty, setQty] = useState(1)
  const currency = company?.currency_symbol || '¢'

  useEffect(() => {
    if (!company) return
    supabase.from('service_categories').select('*').eq('company_id', company.id).then(({ data }) => {
      setCategories(data || [])
      if (data?.length) setSelectedCat(data[0].name)
    })
  }, [company])

  useEffect(() => {
    if (!company || !selectedCat) return
    supabase.from('services').select('*').eq('company_id', company.id).eq('is_active', true)
      .then(({ data }) => { setServices(data || []); setSelectedSvc('') })
  }, [selectedCat, company])

  const svc = services.find(s => s.id === selectedSvc)
  const total = svc ? (svc.unit_price * qty).toFixed(2) : null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontWeight: 600, fontSize: '14px', marginBottom: '14px' }}>
        <Tag size={16} /> Services Price Checker
      </div>
      <div className="form-group">
        <label className="form-label">Select Category</label>
        <select className="form-control" value={selectedCat} onChange={e => setSelectedCat(e.target.value)}>
          {categories.map(c => <option key={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Select Service</label>
        <select className="form-control" value={selectedSvc} onChange={e => setSelectedSvc(e.target.value)}>
          <option value="">Select a service</option>
          {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      {svc && (
        <>
          <div className="form-group">
            <label className="form-label">Quantity</label>
            <input className="form-control" type="number" min="1" value={qty} onChange={e => setQty(parseInt(e.target.value) || 1)} />
          </div>
          <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 14px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Unit Price</span>
              <span style={{ fontWeight: 600 }}>{currency}{svc.unit_price?.toFixed(2)} / {svc.unit || 'piece'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Quantity</span>
              <span style={{ fontWeight: 600 }}>× {qty}</span>
            </div>
            <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700 }}>Total</span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)' }}>{currency}{total}</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── DATE HELPERS ────────────────────────────────────────────────────
const FILTER_OPTIONS = ['Today', 'Yesterday', 'This Week', 'Last Week', 'This Month']
const getDateRange = (filter) => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let start, end
  switch (filter) {
    case 'Today': start = today; end = new Date(today.getTime() + 86400000); break
    case 'Yesterday': start = new Date(today.getTime() - 86400000); end = today; break
    case 'This Week':
      const day = today.getDay(); start = new Date(today.getTime() - (day * 86400000)); end = new Date(start.getTime() + (7 * 86400000)); break
    case 'Last Week':
      const lastWeekEnd = new Date(today.getTime() - (today.getDay() * 86400000)); start = new Date(lastWeekEnd.getTime() - (7 * 86400000)); end = lastWeekEnd; break
    case 'This Month': start = new Date(now.getFullYear(), now.getMonth(), 1); end = new Date(now.getFullYear(), now.getMonth() + 1, 1); break
    default: start = today; end = new Date(today.getTime() + 86400000)
  }
  return { start, end }
}

export default function DashboardPage() {
  const { profile, company, hasPermission } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [cashFilter, setCashFilter] = useState('Today')
  const [jobFilter, setJobFilter] = useState('This Month')
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)

  // Modal states
  const [showJobModal, setShowJobModal] = useState(false)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)

  const loadStats = useCallback(async () => {
    if (!company) return
    setLoading(true)

    const [{ data: jobs }, { data: payments }, { data: expenses }, { data: customers }] = await Promise.all([
      supabase.from('print_jobs').select('*').eq('company_id', company.id),
      supabase.from('payments').select('*').eq('company_id', company.id),
      supabase.from('expenses').select('*').eq('company_id', company.id),
      supabase.from('customers').select('*').eq('company_id', company.id)
    ])

    const now = new Date()
    const allJobs = jobs || []
    const allPayments = payments || []
    const allExpenses = expenses || []
    const allCustomers = customers || []

    const yearString = String(now.getFullYear())
    const getLocalFormattedDate = (d) => {
      const tzOffset = d.getTimezoneOffset() * 60000
      return new Date(d.getTime() - tzOffset).toISOString().split('T')[0]
    }
    const todayStr = getLocalFormattedDate(now)
    const monthStartStr = `${yearString}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const yearStartStr = `${yearString}-01-01`

    // 1. Filtered Cash In-Flow
    const cashRange = getDateRange(cashFilter)
    const filteredPayments = allPayments.filter(p => {
      const d = new Date(p.payment_date)
      return d >= cashRange.start && d < cashRange.end
    })
    const cashInFlow = filteredPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)

    // 2. Filtered Job Summary
    const jobRange = getDateRange(jobFilter)
    const filteredJobs = allJobs.filter(j => {
      const d = new Date(j.created_at)
      return d >= jobRange.start && d < jobRange.end
    })
    const totalJobsCount = filteredJobs.length
    const incompleteJobsCount = filteredJobs.filter(j => !['Completed', 'Delivered', 'Cancelled'].includes(j.status)).length

    // This month jobs for the chart regardless of filter
    const thisMonthJobs = allJobs.filter(j => j.created_at >= monthStartStr)

    // 3. Yearly Cash Position Analysis
    const monthlyCashIncoming = Array(12).fill(0)
    const monthlyCashOutgoing = Array(12).fill(0)
    
    allPayments.filter(p => p.payment_date && p.payment_date.startsWith(yearString)).forEach(p => {
      const m = parseInt(p.payment_date.split('-')[1]) - 1
      monthlyCashIncoming[m] += parseFloat(p.amount) || 0
    })
    allExpenses.filter(e => e.expense_date && e.expense_date.startsWith(yearString)).forEach(e => {
      const m = parseInt(e.expense_date.split('-')[1]) - 1
      monthlyCashOutgoing[m] += parseFloat(e.amount) || 0
    })

    let cumulativeCash = 0
    const monthlyCashPosition = Array(12).fill(0)
    for(let i=0; i<12; i++) {
       cumulativeCash += monthlyCashIncoming[i] - monthlyCashOutgoing[i]
       monthlyCashPosition[i] = cumulativeCash
    }

    const totalYearIncoming = monthlyCashIncoming.reduce((a,b)=>a+b,0)
    const totalYearOutgoing = monthlyCashOutgoing.reduce((a,b)=>a+b,0)
    const currentCashPosition = totalYearIncoming - totalYearOutgoing
    const totalMonthIncoming = monthlyCashIncoming[now.getMonth()] || 0

    // 4. Jobs vs Payments (Daily for Current Month)
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const dailyJobsVsPaymentsLabels = Array.from({length: daysInMonth}, (_, i) => i + 1)
    const dailyRevenueData = Array(daysInMonth).fill(0)
    const dailyPaymentData = Array(daysInMonth).fill(0)

    thisMonthJobs.forEach(j => {
      const d = parseInt(j.created_at.split('T')[0].split('-')[2]) - 1
      if (!isNaN(d) && d >= 0 && d < daysInMonth) {
        dailyRevenueData[d] += parseFloat(j.total_price) || 0
      }
    })
    allPayments.filter(p => p.payment_date >= monthStartStr).forEach(p => {
      const d = parseInt(p.payment_date.split('-')[2]) - 1
      if (!isNaN(d) && d >= 0 && d < daysInMonth) {
        dailyPaymentData[d] += parseFloat(p.amount) || 0
      }
    })

    // 6. Top Expenses (This Year)
    const yearExpenses = allExpenses.filter(e => e.expense_date && e.expense_date >= yearStartStr)
    const expenseCategories = {}
    yearExpenses.forEach(e => {
      const cat = e.category || 'Other'
      expenseCategories[cat] = (expenseCategories[cat] || 0) + (parseFloat(e.amount) || 0)
    })
    const topExpensesList = Object.entries(expenseCategories).sort((a,b)=>b[1]-a[1]).slice(0, 5)

    // 7. Top Customers
    const customerRevenue = {}
    allJobs.forEach(j => {
      if (j.customer_id) {
        customerRevenue[j.customer_id] = (customerRevenue[j.customer_id] || 0) + (parseFloat(j.total_price) || 0)
      }
    })
    const topCustomersList = Object.entries(customerRevenue)
      .map(([id, rev]) => ({ customer: allCustomers.find(c=>c.id === id), rev }))
      .filter(x => x.customer)
      .sort((a,b)=>b.rev-a.rev)
      .slice(0, 10)

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    setMetrics({
      todayStr,
      cashInFlow,
      paymentsCount: filteredPayments.length,
      totalJobsCount,
      incompleteJobsCount,
      totalMonthJobsCount: thisMonthJobs.length,
      totalMonthIncoming,
      totalYearIncoming,
      totalYearOutgoing,
      currentCashPosition,
      yearString,
      topExpensesList,
      topExpensesTotal: totalYearOutgoing,
      topCustomersList,
      charts: {
        jobsVsPayments: {
          labels: dailyJobsVsPaymentsLabels,
          datasets: [
            { label: 'Booked Jobs', data: dailyRevenueData, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true, tension: 0.4 },
            { label: 'Payments', data: dailyPaymentData, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4 }
          ]
        },
        cashPosition: {
          labels: months,
          datasets: [{ label: 'Cash Position', data: monthlyCashPosition, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true, tension: 0.4 }]
        },
        incomeExpense: {
          labels: months,
          datasets: [
            { label: 'Income', data: monthlyCashIncoming, backgroundColor: '#10b981', borderRadius: 4 },
            { label: 'Expenses', data: monthlyCashOutgoing, backgroundColor: '#ef4444', borderRadius: 4 },
            { label: 'Net', data: monthlyCashPosition, backgroundColor: '#3b82f6', borderRadius: 4 }
          ]
        }
      }
    })
    setLoading(false)
  }, [company])

  useEffect(() => { loadStats() }, [loadStats, cashFilter, jobFilter])

  const currency = company?.currency_symbol || '¢'
  const userName = profile?.full_name || user?.email?.split('@')[0] || 'User'
  const companyName = company?.name || 'My Company'
  const now = new Date()

  return (
    <div>
      <SEO title="Dashboard" description="Overview of your print shop performance, jobs, and metrics." />
      {/* Welcome header matching screenshot */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '18px', flexShrink: 0 }}>
            {userName[0]?.toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '2px', color: '#111827' }}>Welcome back, {userName}!</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{companyName}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#3b82f6', background: '#eff6ff', padding: '8px 16px', borderRadius: '20px' }}>
          <Clock size={14} /> <span>Company Time: {now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric'})} at {now.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Main tabs */}
      <div className="tabs" style={{ marginBottom: '24px', borderBottom: '1px solid var(--border)' }}>
        <button className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')} style={{ paddingBottom: '12px', fontWeight: 600 }}>Dashboard</button>
        <button className={`tab ${activeTab === 'tools' ? 'active' : ''}`} onClick={() => setActiveTab('tools')} style={{ paddingBottom: '12px', fontWeight: 600 }}>Quick Tools</button>
        <button className={`tab ${activeTab === 'tutorials' ? 'active' : ''}`} onClick={() => setActiveTab('tutorials')} style={{ paddingBottom: '12px', fontWeight: 600 }}>Tutorials & Updates</button>
      </div>

      {activeTab === 'dashboard' && (
        <div className="analytics-dashboard">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Analytics...</div>
          ) : metrics ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Quick Navigation Cards */}
              <div className="grid-8" style={{ marginBottom: '10px' }}>
                {[
                  { title: 'Print Jobs', icon: <Briefcase size={22} />, color: '#3b82f6', bg: '#eff6ff', path: '/jobs', desc: 'Orders', perm: 'view_jobs' },
                  { title: 'Customers', icon: <Users size={22} />, color: '#10b981', bg: '#f0fdf4', path: '/customers', desc: 'Directory', perm: 'view_customers' },
                  { title: 'Payments', icon: <CreditCard size={22} />, color: '#f59e0b', bg: '#fffbeb', path: '/payments', desc: 'Income', perm: 'view_payments' },
                  { title: 'Receivables', icon: <FileText size={22} />, color: '#ea580c', bg: '#fff7ed', path: '/receivables', desc: 'Debtors', perm: 'view_reports' },
                  { title: 'Expenses', icon: <DollarSign size={22} />, color: '#ef4444', bg: '#fef2f2', path: '/expenses', desc: 'Costs', perm: 'view_expenses' },
                  { title: 'Reports', icon: <PieChart size={22} />, color: '#06b6d4', bg: '#ecfeff', path: '/reports/revenue', desc: 'Analytics', perm: 'view_reports' },
                  { title: 'Services', icon: <Layers size={22} />, color: '#7c3aed', bg: '#f5f3ff', path: '/services', desc: 'Pricing', perm: 'manage_settings' },
                  { title: 'Settings', icon: <Settings size={22} />, color: '#64748b', bg: '#f8fafc', path: '/settings', desc: 'Config', perm: 'manage_settings' },
                ].filter(item => hasPermission(item.perm)).map((item, i) => (
                  <Link key={i} to={item.path} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ 
                      background: 'white', 
                      borderRadius: '16px', 
                      padding: '20px', 
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: 'pointer',
                      height: '100%',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                      e.currentTarget.style.borderColor = item.color;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }}
                    >
                      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: item.bg, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {item.icon}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: '#111827', marginBottom: '2px' }}>{item.title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>{item.desc}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* ROW 1: Metric Cards */}
              <div className="grid-2">
                
                {/* Cash In-Flow Card */}
                {hasPermission('view_reports') ? (
                  <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#111827' }}>
                        <BarChart2 size={16} color="#3b82f6" /> {cashFilter}'s Cash In-Flow <RefreshCw size={14} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={loadStats} />
                      </div>
                      <select 
                        style={{ border: '1px solid var(--border)', background: 'white', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer', outline: 'none' }}
                        value={cashFilter}
                        onChange={e => setCashFilter(e.target.value)}
                      >
                        {FILTER_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#166534', marginBottom: '8px', fontWeight: 500 }}>
                          <DollarSign size={14} /> Cash Received {cashFilter}
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#16a34a', marginBottom: '4px' }}>{currency}{metrics.cashInFlow.toFixed(2)}</div>
                        <div style={{ fontSize: '10px', color: '#15803d' }}>Money received from payments</div>
                      </div>
                      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#1e3a8a', marginBottom: '8px', fontWeight: 500 }}>
                          <CreditCard size={14} /> {cashFilter}'s Payments
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#2563eb', marginBottom: '4px' }}>{metrics.paymentsCount}</div>
                        <div style={{ fontSize: '10px', color: '#1d4ed8' }}>Number of payment transactions</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '16px', height: '16px', background: '#eff6ff', color: '#3b82f6', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><DollarSign size={10} /></div>
                      Payment Breakdown
                    </div>
                    {metrics.paymentsCount === 0 ? (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No payments for {cashFilter}</div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{metrics.paymentsCount} payments collected.</div>
                    )}
                  </div>
                ) : (
                  <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center' }}>
                    <div>
                      <Activity size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                      <div style={{ fontWeight: 600 }}>Active Session</div>
                      <div style={{ fontSize: '12px' }}>Operational dashboard is active.</div>
                    </div>
                  </div>
                )}

                {/* Job Summary Card */}
                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#111827' }}>
                      <Briefcase size={16} color="#3b82f6" /> Job Summary ({jobFilter}) <RefreshCw size={14} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={loadStats} />
                    </div>
                    <select 
                      style={{ border: '1px solid var(--border)', background: 'white', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer', outline: 'none' }}
                      value={jobFilter}
                      onChange={e => setJobFilter(e.target.value)}
                    >
                      {FILTER_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#1e3a8a', marginBottom: '8px', fontWeight: 500 }}>
                        <Briefcase size={14} /> Total Jobs
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>{metrics.totalJobsCount}</div>
                      <div style={{ fontSize: '10px', color: '#1d4ed8' }}>All jobs for {jobFilter}</div>
                    </div>
                    <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#9a3412', marginBottom: '8px', fontWeight: 500 }}>
                        <Clock size={14} color="#ea580c" /> Incomplete Jobs
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>{metrics.incompleteJobsCount}</div>
                      <div style={{ fontSize: '10px', color: '#c2410c' }}>Jobs pending or in progress</div>
                    </div>
                  </div>
                  <button style={{ width: '100%', padding: '10px', background: 'white', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Activity size={14} /> View Team Performance
                  </button>
                </div>
              </div>

              {/* ROW 1.5: Income & Expenses Summary */}
              {hasPermission('view_reports') && (
                <div className="grid-4">
                  <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>
                      <TrendingUp size={14} color="#10b981" /> Total Income (Year)
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#16a34a' }}>{currency}{metrics.totalYearIncoming.toFixed(2)}</div>
                  </div>
                  <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>
                      <TrendingDown size={14} color="#ef4444" /> Total Expenses (Year)
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#dc2626' }}>{currency}{metrics.totalYearOutgoing.toFixed(2)}</div>
                  </div>
                  <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>
                      <DollarSign size={14} color="#3b82f6" /> Net Profit (Year)
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#2563eb' }}>{currency}{metrics.currentCashPosition.toFixed(2)}</div>
                  </div>
                  <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>
                      <Calendar size={14} color="#f59e0b" /> Income This Month
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>{currency}{metrics.totalMonthIncoming.toFixed(2)}</div>
                  </div>
                </div>
              )}

              {/* ROW 2: Jobs vs Payments */}
              <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#111827' }}>
                    Jobs vs Payments <RefreshCw size={14} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={loadStats} />
                  </div>
                  <select style={{ border: 'none', background: 'transparent', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer', outline: 'none' }}>
                    <option>Daily</option>
                  </select>
                </div>
                {metrics.totalMonthJobsCount === 0 && metrics.totalMonthIncoming === 0 ? (
                  <div style={{ height: '240px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    <Calendar size={32} style={{ marginBottom: '12px', opacity: 0.2 }} />
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>No data available for daily</div>
                    <div style={{ fontSize: '11px' }}>Try selecting a different time period</div>
                  </div>
                ) : (
                  <div style={{ height: '280px', width: '100%' }}>
                    <Line 
                      data={metrics.charts.jobsVsPayments} 
                      options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } } }} 
                    />
                  </div>
                )}
              </div>

              {/* ROW 3: Cash Position Analysis */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', padding: '20px' }}>
                  <div style={{ flex: 1, minWidth: '300px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#111827' }}>
                      Cash Position Analysis <RefreshCw size={14} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={loadStats} />
                    </div>
                    <select style={{ border: 'none', background: 'transparent', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer', outline: 'none' }}>
                      <option>This Year</option>
                    </select>
                  </div>
                  <div style={{ height: '300px', width: '100%' }}>
                    <Line 
                      data={metrics.charts.cashPosition} 
                      options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, elements: { line: { borderWidth: 2 } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } } }} 
                    />
                  </div>
                  </div>
                </div>
                <div className="grid-4" style={{ padding: '20px', borderTop: '1px solid var(--border)', background: '#f8fafc', borderRadius: '0 0 12px 12px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Initial Cash</div>
                    <div style={{ fontSize: '15px', fontWeight: 600 }}>{currency}0.00</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#16a34a', marginBottom: '4px' }}>Incoming</div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#16a34a' }}>{currency}{metrics.totalYearIncoming.toFixed(2)} +</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#ef4444', marginBottom: '4px' }}>Outgoing</div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#ef4444' }}>{currency}{metrics.totalYearOutgoing.toFixed(2)} -</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#2563eb', marginBottom: '4px' }}>Current Cash</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#2563eb' }}>{currency}{metrics.currentCashPosition.toFixed(2)} =</div>
                  </div>
                </div>
              </div>

              {/* ROW 4: Income/Expense & Top Expenses */}
              <div className="grid-2">
                {/* Income and Expense */}
                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                        Income and Expense <RefreshCw size={14} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={loadStats} />
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Monthly financial performance</div>
                    </div>
                    <select style={{ border: 'none', background: 'transparent', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer', outline: 'none' }}>
                      <option>This Year</option>
                    </select>
                  </div>
                  <div style={{ height: '240px', width: '100%', marginBottom: '20px' }}>
                    <Bar 
                      data={metrics.charts.incomeExpense} 
                      options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } } }} 
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '2px' }}></div> Income <span style={{ fontWeight: 600, color: '#16a34a' }}>{currency}{metrics.totalYearIncoming.toFixed(2)}</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '2px' }}></div> Expenses <span style={{ fontWeight: 600, color: '#dc2626' }}>{currency}{metrics.totalYearOutgoing.toFixed(2)}</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '8px', height: '8px', background: '#3b82f6', borderRadius: '2px' }}></div> Net <span style={{ fontWeight: 600, color: '#2563eb' }}>{currency}{metrics.currentCashPosition.toFixed(2)}</span></div>
                  </div>
                </div>

                {/* Top Expenses */}
                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                        Top Expenses <RefreshCw size={14} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={loadStats} />
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total: <span style={{ fontWeight: 600, color: '#111827' }}>{currency}{metrics.topExpensesTotal.toFixed(2)}</span></div>
                    </div>
                    <select style={{ border: 'none', background: 'transparent', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer', outline: 'none' }}>
                      <option>This Year</option>
                    </select>
                  </div>
                  {metrics.topExpensesList.length === 0 ? (
                     <div style={{ height: '240px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                       <div style={{ fontSize: '13px', fontWeight: 500 }}>No expense data available</div>
                       <div style={{ fontSize: '11px' }}>Expenses for this month will appear here</div>
                     </div>
                  ) : (
                    <div style={{ display: 'grid', gap: '16px' }}>
                      {metrics.topExpensesList.map(([cat, amt], i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ fontSize: '13px', fontWeight: 500 }}>{cat}</div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444' }}>{currency}{amt.toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ROW 5: Top Customers */}
              <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)', marginBottom: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#111827' }}>
                    <Briefcase size={16} color="#3b82f6" /> Top Customers <RefreshCw size={14} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={loadStats} />
                  </div>
                  <select style={{ border: '1px solid var(--border)', background: 'white', fontSize: '12px', color: '#111827', cursor: 'pointer', outline: 'none', padding: '4px 8px', borderRadius: '4px' }}>
                    <option>Top 10</option>
                  </select>
                </div>
                {metrics.topCustomersList.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.2 }}>👥</div>
                    <div style={{ fontSize: '13px' }}>No customer data available</div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
                    {metrics.topCustomersList.map(({ customer, rev }, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>{i + 1}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{customer.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{customer.phone || 'No phone'}</div>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#10b981' }}>{currency}{rev.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="empty-state">Failed to load analytics data.</div>
          )}
        </div>
      )}

      {activeTab === 'tools' && (
        <>
          <div className="calculator-grid" style={{ marginBottom: '20px' }}>
            <div className="card"><div className="card-body"><LargeFormatCalculator company={company} /></div></div>
            <div className="card"><div className="card-body"><SimpleCalculator /></div></div>
          </div>
          <div className="calculator-grid">
            <div className="card"><div className="card-body"><UnitConverter /></div></div>
            <div className="card"><div className="card-body"><ServicesPriceChecker company={company} /></div></div>
          </div>
        </>
      )}

      {activeTab === 'tutorials' && (
        <div className="card">
          <div className="card-header"><div className="card-title">Tutorials & Updates</div></div>
          <div className="card-body">
            <div style={{ display: 'grid', gap: '12px' }}>
              {[
                { title: 'Getting Started with SoluoPrint', desc: 'Learn the basics of managing your print shop', icon: '🚀' },
                { title: 'Managing Print Jobs', desc: 'How to create and track print jobs efficiently', icon: '🖨️' },
                { title: 'Customer Management', desc: 'Best practices for managing your customer base', icon: '👥' },
                { title: 'Financial Reports', desc: 'Understanding revenue, expenses and profit/loss', icon: '📊' },
                { title: 'Large Format Calculator Guide', desc: 'How to price your large format print jobs accurately', icon: '📐' },
                { title: "What's New in SoluoPrint", desc: 'Latest features and improvements to the platform', icon: '✨' },
              ].map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: '14px', padding: '14px', border: '1px solid var(--border)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s', background: 'white' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                  <div style={{ fontSize: '24px', flexShrink: 0 }}>{t.icon}</div>
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '3px' }}>{t.title}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showJobModal && <NewJobModal onClose={() => setShowJobModal(false)} onSuccess={loadStats} />}
      {showCustomerModal && <NewCustomerModal onClose={() => setShowCustomerModal(false)} onSuccess={loadStats} />}
      {showPaymentModal && <NewPaymentModal onClose={() => setShowPaymentModal(false)} onSuccess={loadStats} />}
      {showServiceModal && <NewServiceModal onClose={() => setShowServiceModal(false)} onSuccess={loadStats} />}
      {showExpenseModal && <NewExpenseModal onClose={() => setShowExpenseModal(false)} onSuccess={loadStats} company={company} />}
    </div>
  )
}
