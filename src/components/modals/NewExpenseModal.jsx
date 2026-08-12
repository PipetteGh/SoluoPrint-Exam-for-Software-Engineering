import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { supabase } from '../../lib/supabase'

const EXPENSE_CATEGORIES = ['Office Supplies', 'Utilities', 'Rent', 'Salaries', 'Materials', 'Equipment', 'Maintenance', 'Marketing', 'Transport', 'Other']

export default function NewExpenseModal({ onClose, onSuccess, company }) {
  const [accounts, setAccounts] = useState([])
  const [form, setForm] = useState({ category: 'Other', description: '', amount: '', expense_date: new Date().toISOString().split('T')[0], payment_account_id: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()

  useEffect(() => {
    if (!company) return
    supabase.from('payment_accounts').select('*').eq('company_id', company.id).then(({ data }) => setAccounts(data || []))
  }, [company])

  function handleChange(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const { error: err } = await supabase.from('expenses').insert({ ...form, company_id: company.id, amount: parseFloat(form.amount) })
    setLoading(false)
    if (err) {
      setError(err.message)
      toast.error('Failed to add expense: ' + err.message)
    } else {
      toast.success('Expense added')
      onSuccess?.(); onClose()
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">New Expense</h2>
          <button className="modal-close" onClick={onClose}><X /></button>
        </div>
        <div className="modal-body">
          {error && <div className="error-alert">{error}</div>}
          <form onSubmit={handleSubmit} id="expense-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select name="category" className="form-control" value={form.category} onChange={handleChange}>
                  {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" name="expense_date" className="form-control" value={form.expense_date} onChange={handleChange} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description *</label>
              <input name="description" className="form-control" placeholder="Description of expense" value={form.description} onChange={handleChange} required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Amount *</label>
                <input type="number" name="amount" className="form-control" placeholder="0.00" value={form.amount} onChange={handleChange} required step="0.01" min="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Account</label>
                <select name="payment_account_id" className="form-control" value={form.payment_account_id} onChange={handleChange}>
                  <option value="">Select account</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea name="notes" className="form-control" placeholder="Additional notes..." value={form.notes} onChange={handleChange} rows={2} />
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="expense-form" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Add Expense'}</button>
        </div>
      </div>
    </div>
  )
}
