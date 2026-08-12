import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Database, Download, Upload, Server, RefreshCw } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { supabase } from '../../lib/supabase'
import SEO from '../../components/ui/SEO'

export default function DataBackupPage() {
  const navigate = useNavigate()
  const { company } = useAuth()
  const toast = useToast()
  
  const [loading, setLoading] = useState(false)
  const [backupDate, setBackupDate] = useState(new Date().toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }))

  const TABLES_TO_EXPORT = [
    'customers', 'services', 'print_jobs', 'payments', 'expenses'
  ]

  async function handleBackup() {
    if (!confirm('This will generate a full backup of all your company data. Continue?')) return
    
    setLoading(true)
    try {
      const backupData = {}
      
      for (const table of TABLES_TO_EXPORT) {
        const { data, error } = await supabase.from(table).select('*').eq('company_id', company.id)
        if (error) throw error
        backupData[table] = data
      }
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `printdesk_backup_${new Date().toISOString().split('T')[0]}.json`
      a.click()
      
      setBackupDate(new Date().toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }))
      toast.success('Full database backup completed successfully')
    } catch (err) {
      toast.error('Backup failed: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleExportCsv(table) {
    setLoading(true)
    supabase.from(table).select('*').eq('company_id', company.id).then(({ data, error }) => {
      setLoading(false)
      if (error) {
        toast.error(`Failed to export ${table}: ` + error.message)
        return
      }
      
      if (!data || data.length === 0) {
        toast.error(`No data found in ${table}`)
        return
      }

      const keys = Object.keys(data[0])
      const csvContent = [
        keys.join(','),
        ...data.map(row => keys.map(k => `"${String(row[k] || '').replace(/"/g, '""')}"`).join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${table}_export_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      
      toast.success(`${table} exported successfully`)
    })
  }

  function handleImportClick() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (!file) return
      
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          setLoading(true)
          toast.info('Importing data... Please wait.')
          const content = event.target.result
          
          if (file.name.endsWith('.json')) {
            const data = JSON.parse(content)
            
            // Define order to respect basic foreign key constraints
            const importOrder = ['customers', 'services', 'print_jobs', 'payments', 'expenses']
            let importedCount = 0
            
            for (const table of importOrder) {
              if (data[table] && data[table].length > 0) {
                const { error } = await supabase.from(table).upsert(data[table])
                if (error) throw new Error(`Error importing ${table}: ${error.message}`)
                importedCount += data[table].length
              }
            }
            toast.success(`Successfully restored ${importedCount} records from backup!`)
          } else {
            toast.error('Please upload a valid JSON backup file.')
          }
        } catch (err) {
          toast.error('Import failed: ' + err.message)
        } finally {
          setLoading(false)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  return (
    <div className="settings-page">
      <SEO title="Data Backup & Restore" description="Backup your database, export data to CSV, or import data." />
      
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/settings')} style={{ padding: '8px' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="page-title">Data Backup & Restore</h1>
            <p className="page-subtitle">Manage your database, export records, and import data</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        
        {/* Full Backup Section */}
        <div className="settings-card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '10px', color: '#2563eb' }}>
              <Database size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Full Database Backup</h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>Download a complete JSON backup of your company's data.</p>
            </div>
          </div>
          
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#475569' }}>Last Backup:</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{backupDate}</span>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }} onClick={handleBackup} disabled={loading}>
            {loading ? <RefreshCw size={16} className="spin" /> : <Download size={16} />} 
            {loading ? 'Generating Backup...' : 'Generate Full Backup'}
          </button>
        </div>

        {/* Export Data Section */}
        <div className="settings-card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: '#dcfce7', padding: '12px', borderRadius: '10px', color: '#16a34a' }}>
              <Server size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Export Records (CSV)</h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>Export specific tables to CSV for Excel/Numbers.</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {TABLES_TO_EXPORT.map(table => (
              <div key={table} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 500, textTransform: 'capitalize' }}>{table.replace('_', ' ')}</span>
                <button className="btn btn-secondary btn-xs" onClick={() => handleExportCsv(table)} disabled={loading}>
                  Export CSV
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Import Data Section */}
        <div className="settings-card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '10px', color: '#d97706' }}>
              <Upload size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Import Data</h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>Restore from a backup or import new records.</p>
            </div>
          </div>

          <div style={{ border: '2px dashed #cbd5e1', padding: '32px', borderRadius: '12px', textAlign: 'center', background: '#f8fafc', marginBottom: '20px' }}>
            <Upload size={32} color="#94a3b8" style={{ marginBottom: '12px' }} />
            <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: '#334155' }}>Upload JSON backup file</h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Ensure you upload a previously exported .json backup.</p>
          </div>

          <button className="btn btn-secondary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', border: '1px solid var(--border)' }} onClick={handleImportClick} disabled={loading}>
            <Upload size={16} /> Select File to Import
          </button>
        </div>

      </div>
    </div>
  )
}
