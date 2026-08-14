import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { supabase } from '../lib/supabase'
import { ClipboardList, Plus, Edit, Trash2, Search, ArrowRight, ChevronLeft, ChevronRight, Eye, CheckCircle2, HelpCircle, X, Image as ImageIcon } from 'lucide-react'
import FileGallery from '../components/ui/FileGallery'
import { TableSkeleton } from '../components/ui/Skeletons'
import SEO from '../components/ui/SEO'
import NewJobListModal from '../components/modals/NewJobListModal'

const STATUS_OPTIONS = ['Pending', 'In Progress', 'Ready', 'Converted', 'Cancelled']

const hasFiles = (files) => {
  if (!files) return false
  if (Array.isArray(files)) return files.length > 0
  if (typeof files === 'string') {
    const clean = files.trim()
    return clean !== '' && clean !== '[]' && clean !== 'null'
  }
  return false
}

export default function JobListPage() {
  const { company } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [showDetail, setShowDetail] = useState(null)
  const [showHelp, setShowHelp] = useState(false)
  const [lightboxImage, setLightboxImage] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const toast = useToast()
  const { confirm } = useConfirm()
  const navigate = useNavigate()

  useEffect(() => { if (company) load() }, [company])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('job_list')
      .select('*, customers(name, phone)')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Error loading job list:', error)
      toast.error('Failed to load job list')
    }
    setItems(data || [])
    setLoading(false)
  }

  async function deleteItem(id) {
    const isConfirmed = await confirm({
      title: 'Delete Job List Item',
      message: 'Are you sure you want to delete this job list item? This action cannot be undone.',
      confirmText: 'Yes, Delete Item',
      cancelText: 'Cancel',
      type: 'danger'
    })
    if (!isConfirmed) return
    
    // Find the item first to get image paths
    const item = items.find(i => i.id === id)
    const images = item?.images || []
    const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost/printdesk' : ''

    // Delete images from server
    if (images.length > 0) {
      for (const url of images) {
        const match = url.match(/\/uploads\/joblist\/(.+)$/)
        if (match && match[1]) {
          try {
            await fetch(`${API_BASE}/api/upload.php`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path: match[1] })
            })
          } catch (e) {
            console.error('Delete image error:', e)
          }
        }
      }
    }

    const { error } = await supabase.from('job_list').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete')
    } else {
      toast.success('Job list item deleted')
      load()
    }
  }

  async function updateStatus(id, newStatus) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: newStatus } : i))
    const { error } = await supabase.from('job_list').update({ status: newStatus }).eq('id', id)
    if (error) {
      toast.error('Failed to update status')
      load()
    } else {
      toast.success(`Status updated to ${newStatus}`)
    }
  }

  function convertToJob(item) {
    // Navigate to print jobs page with pre-filled data
    // We store the conversion data in sessionStorage and redirect
    const conversionData = {
      customer_id: item.customer_id,
      services: item.services,
      description: item.description,
      notes: item.notes,
      images: item.images,
      source_job_list_id: item.id
    }
    sessionStorage.setItem('jobListConversion', JSON.stringify(conversionData))
    // Don't mark as 'Converted' yet — only after the print job is actually created
    navigate('/jobs?fromJobList=true')
  }

  const filtered = items.filter(i => {
    if (statusFilter !== 'All' && i.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const customerName = i.customers?.name?.toLowerCase() || ''
      const desc = i.description?.toLowerCase() || ''
      const serviceNames = (i.services || []).map(s => (s.name || s).toLowerCase()).join(' ')
      if (!customerName.includes(q) && !desc.includes(q) && !serviceNames.includes(q)) return false
    }
    return true
  })

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedItems = filtered.slice(startIndex, startIndex + itemsPerPage)

  const currency = company?.currency_symbol || '¢'

  function statusClass(s) {
    if (s === 'Ready') return 'completed'
    if (s === 'In Progress') return 'in-progress'
    if (s === 'Cancelled') return 'cancelled'
    if (s === 'Converted') return 'completed'
    return 'pending'
  }

  // Count by status
  const counts = {
    All: items.length,
    Pending: items.filter(i => i.status === 'Pending').length,
    'In Progress': items.filter(i => i.status === 'In Progress').length,
    Ready: items.filter(i => i.status === 'Ready').length,
    Converted: items.filter(i => i.status === 'Converted').length,
    Cancelled: items.filter(i => i.status === 'Cancelled').length
  }

  return (
    <div>
      <SEO title="Job List" description="Manage booked jobs and pending work orders." />
      
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Job List
            <button onClick={() => setShowHelp(!showHelp)} className="btn btn-ghost" style={{ padding: '4px', minHeight: 'auto', borderRadius: '50%' }} title="What is Job List?"><HelpCircle size={18} color="var(--primary)" /></button>
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Manage booked jobs that are pending completion. Convert ready items to print jobs.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowModal(true) }}>
          <Plus size={16} /> Add to Job List
        </button>
      </div>

      {showHelp && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px', position: 'relative' }}>
          <button onClick={() => setShowHelp(false)} style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><X size={14} color="#64748b" /></button>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e40af', marginBottom: '8px' }}>📋 About Job List</div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#334155', lineHeight: 1.8 }}>
            <li><strong>Job List</strong> is for booking or staging jobs that customers request but aren't ready to process yet.</li>
            <li>Select the customer, pick the services they need, and add any description or notes.</li>
            <li>When the job is ready to be worked on, click the <strong>→ Convert to Print Job</strong> button to create a full print job with pricing and tracking.</li>
            <li>The customer receives an SMS notification when a job is added to the list.</li>
            <li>Status will only change to <strong>Converted</strong> after you successfully create the print job.</li>
          </ul>
        </div>
      )}

      {/* Status filter pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {['All', ...STATUS_OPTIONS].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: '6px 16px',
              borderRadius: '20px',
              border: statusFilter === s ? '2px solid var(--primary)' : '1px solid var(--border)',
              background: statusFilter === s ? '#eff6ff' : 'white',
              color: statusFilter === s ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: statusFilter === s ? 600 : 400,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            {s} <span style={{ fontSize: '11px', opacity: 0.7 }}>({counts[s] || 0})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-control" style={{ paddingLeft: '32px', width: '280px', fontSize: '12px' }} placeholder="Search by customer, description, or service..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1) }} />
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Showing {filtered.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + itemsPerPage, filtered.length)} of {filtered.length} items
        </span>
      </div>

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>S/N</th>
              <th>Customer</th>
              <th>Services</th>
              <th>Description</th>
              <th>Date Added</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton columns={6} rows={5} />
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6}>
                <div className="empty-state" style={{ padding: '60px 0' }}>
                  <ClipboardList size={40} />
                  <h3>No job list items found</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                    Add jobs that customers have booked for later processing.
                  </p>
                  <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowModal(true) }}>
                    <Plus size={14} /> Add First Item
                  </button>
                </div>
              </td></tr>
            ) : paginatedItems.map((item, index) => (
              <tr key={item.id}>
                <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{startIndex + index + 1}</td>
                <td style={{ fontWeight: 600 }}>
                  {item.customers?.name || 'Unknown'}
                  {(item.images || []).length > 0 && (
                    <span style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                      <ImageIcon size={12} /> {item.images.length}
                    </span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {(item.services || []).slice(0, 3).map((s, i) => (
                      <span key={i} className="pill pill-blue" style={{ fontSize: '11px' }}>
                        {typeof s === 'string' ? s : s.name}
                      </span>
                    ))}
                    {(item.services || []).length > 3 && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        +{(item.services || []).length - 3} more
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.description || '-'}
                </td>
                <td style={{ fontSize: '12px' }}>
                  {new Date(item.created_at).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  <br />
                  <span style={{ color: 'var(--text-muted)' }}>
                    {new Date(item.created_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </td>
                <td>
                  <select
                    className={`status-badge ${statusClass(item.status)}`}
                    style={{ appearance: 'none', border: 'none', cursor: 'pointer', outline: 'none', paddingRight: '8px' }}
                    value={item.status}
                    onChange={e => updateStatus(item.id, e.target.value)}
                    disabled={item.status === 'Converted'}
                  >
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td>
                  <div className="action-btns">
                    {item.status !== 'Converted' && item.status !== 'Cancelled' && (
                      <button
                        className="action-btn"
                        title="Convert to Print Job"
                        onClick={() => convertToJob(item)}
                        style={{ color: 'var(--success)' }}
                      >
                        <ArrowRight />
                      </button>
                    )}
                    <button className="action-btn" title="View Details" onClick={() => setShowDetail(item)}>
                      <Eye />
                    </button>
                    {item.status !== 'Converted' && (
                      <button className="action-btn" title="Edit" onClick={() => { setEditItem(item); setShowModal(true) }}>
                        <Edit />
                      </button>
                    )}
                    <button className="action-btn danger" title="Delete" onClick={() => deleteItem(item.id)}>
                      <Trash2 />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px', paddingBottom: '20px' }}>
          <button 
            className="btn btn-secondary btn-sm" 
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px' }}
            disabled={currentPage === 1}
            onClick={() => { setCurrentPage(prev => prev - 1); window.scrollTo(0, 0) }}
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = i + 1
              if (totalPages > 5) {
                if (currentPage > 3) pageNum = currentPage - 3 + i
                if (pageNum > totalPages) pageNum = totalPages - 4 + i
              }
              if (pageNum <= 0) pageNum = i + 1

              return (
                <button
                  key={pageNum}
                  onClick={() => { setCurrentPage(pageNum); window.scrollTo(0, 0) }}
                  style={{
                    width: '32px', height: '32px', borderRadius: '6px', border: '1px solid var(--border)',
                    background: currentPage === pageNum ? 'var(--primary)' : 'white',
                    color: currentPage === pageNum ? 'white' : 'var(--text-primary)',
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>
          <button 
            className="btn btn-secondary btn-sm" 
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px' }}
            disabled={currentPage === totalPages}
            onClick={() => { setCurrentPage(prev => prev + 1); window.scrollTo(0, 0) }}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <NewJobListModal
          item={editItem}
          onClose={() => { setShowModal(false); setEditItem(null) }}
          onSuccess={() => { setShowModal(false); setEditItem(null); load() }}
        />
      )}

      {/* Detail Drawer */}
      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Job List Details</h2>
              <button className="modal-close" onClick={() => setShowDetail(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Customer</div>
                  <div style={{ fontWeight: 600, fontSize: '16px' }}>{showDetail.customers?.name || 'Unknown'}</div>
                  {showDetail.customers?.phone && (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{showDetail.customers.phone}</div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Services Requested</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {(showDetail.services || []).map((s, i) => (
                      <span key={i} className="pill pill-blue">
                        {typeof s === 'string' ? s : s.name}
                      </span>
                    ))}
                  </div>
                </div>
                {showDetail.description && (
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Description</div>
                    <div style={{ fontSize: '14px', lineHeight: 1.6 }}>{showDetail.description}</div>
                  </div>
                )}
                {showDetail.notes && (
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Notes</div>
                    <div style={{ fontSize: '14px', lineHeight: 1.6, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px' }}>{showDetail.notes}</div>
                  </div>
                )}
                {hasFiles(showDetail.images) && (
                  <div style={{ marginTop: '4px' }}>
                    <FileGallery files={showDetail.images} title="Uploaded Artwork & Documents" />
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Status</div>
                    <span className={`status-badge ${statusClass(showDetail.status)}`}>{showDetail.status}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Date Added</div>
                    <div style={{ fontSize: '13px' }}>{new Date(showDetail.created_at).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDetail(null)}>Close</button>
              {showDetail.status !== 'Converted' && showDetail.status !== 'Cancelled' && (
                <button className="btn btn-primary" onClick={() => { setShowDetail(null); convertToJob(showDetail) }}>
                  <ArrowRight size={14} /> Convert to Print Job
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {lightboxImage && (
        <div onClick={() => setLightboxImage(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <button onClick={() => setLightboxImage(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={24} color="white" />
          </button>
          <img src={lightboxImage} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', objectFit: 'contain' }} onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}
