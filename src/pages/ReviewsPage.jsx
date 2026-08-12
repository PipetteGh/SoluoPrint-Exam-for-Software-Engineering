import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Star, Plus, Trash2, X } from 'lucide-react'
import SEO from '../components/ui/SEO'

function NewReviewModal({ onClose, onSuccess, company }) {
  const [customers, setCustomers] = useState([])
  const [form, setForm] = useState({ customer_id: '', rating: 5, comment: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('customers').select('id,name').eq('company_id', company.id).then(({ data }) => setCustomers(data || []))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    await supabase.from('reviews').insert({ ...form, company_id: company.id, rating: parseInt(form.rating) })
    setLoading(false)
    onSuccess?.(); onClose()
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Add Review</h2>
          <button className="modal-close" onClick={onClose}><X /></button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} id="review-form">
            <div className="form-group">
              <label className="form-label">Customer</label>
              <select className="form-control" value={form.customer_id} onChange={e=>setForm(f=>({...f,customer_id:e.target.value}))} required>
                <option value="">Select customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Rating</label>
              <select className="form-control" value={form.rating} onChange={e=>setForm(f=>({...f,rating:e.target.value}))}>
                {[5,4,3,2,1].map(r => <option key={r} value={r}>{r} Star{r!==1?'s':''}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Comment</label>
              <textarea className="form-control" value={form.comment} onChange={e=>setForm(f=>({...f,comment:e.target.value}))} placeholder="Customer feedback..." />
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="review-form" type="submit" disabled={loading}>{loading?'Saving...':'Add Review'}</button>
        </div>
      </div>
    </div>
  )
}

export default function ReviewsPage() {
  const { company } = useAuth()
  const [reviews, setReviews] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (company) load() }, [company])

  async function load() {
    const { data } = await supabase.from('reviews').select('*,customers(name)').eq('company_id', company.id).order('created_at', { ascending: false })
    setReviews(data || [])
    setLoading(false)
  }

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '0.0'

  return (
    <div>
      <SEO title="Reviews" description="View and manage customer feedback and ratings for your services." />
      <div className="page-header">
        <div><h1 className="page-title">Reviews</h1><p className="page-subtitle">Customer feedback and ratings</p></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus /> Add Review</button>
      </div>

      <div className="stat-grid" style={{gridTemplateColumns:'auto auto auto',maxWidth:'500px',marginBottom:'20px'}}>
        <div className="stat-card">
          <div className="stat-icon" style={{background:'#fef3c7'}}><Star size={22} color="#f59e0b"/></div>
          <div className="stat-info"><div className="stat-label">Average Rating</div><div className="stat-value">{avgRating}/5</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{background:'#eff6ff'}}><Star size={22} color="#2563eb"/></div>
          <div className="stat-info"><div className="stat-label">Total Reviews</div><div className="stat-value">{reviews.length}</div></div>
        </div>
      </div>

      <div style={{display:'grid',gap:'12px'}}>
        {loading ? <div style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>Loading...</div>
        : reviews.length === 0 ? (
          <div className="empty-state"><Star/><h3>No reviews yet</h3><p>Add your first customer review</p></div>
        ) : reviews.map(r => (
          <div key={r.id} className="card">
            <div className="card-body" style={{display:'flex',gap:'16px',alignItems:'flex-start'}}>
              <div style={{width:'44px',height:'44px',borderRadius:'10px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'700',fontSize:'16px',flexShrink:0}}>
                {r.customers?.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}>
                  <span style={{fontWeight:600}}>{r.customers?.name || 'Unknown'}</span>
                  <div style={{display:'flex',gap:'2px'}}>
                    {[1,2,3,4,5].map(s => <Star key={s} size={14} fill={s<=r.rating?'#f59e0b':'none'} color={s<=r.rating?'#f59e0b':'#cbd5e1'}/>)}
                  </div>
                  <span style={{fontSize:'12px',color:'var(--text-muted)'}}>{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <p style={{fontSize:'13.5px',color:'var(--text-secondary)'}}>{r.comment || 'No comment'}</p>
              </div>
              <button className="action-btn danger" onClick={async()=>{await supabase.from('reviews').delete().eq('id',r.id);load()}}><Trash2/></button>
            </div>
          </div>
        ))}
      </div>

      {showAdd && <NewReviewModal onClose={() => setShowAdd(false)} onSuccess={load} company={company} />}
    </div>
  )
}
