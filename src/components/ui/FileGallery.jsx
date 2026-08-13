import React, { useState } from 'react'
import { FileText, Eye, Download, Image as ImageIcon, ExternalLink, X, File } from 'lucide-react'

/**
 * Normalizes any file URL to a valid loadable URL
 */
export function normalizeFileUrl(url) {
  if (!url) return ''
  let cleaned = String(url).trim()
  if (cleaned.startsWith('[uploaded:')) {
    cleaned = cleaned.replace('[uploaded:', '').replace(']', '')
  }
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://') || cleaned.startsWith('data:')) {
    return cleaned
  }
  // Relative URL
  if (cleaned.startsWith('/')) {
    return `${window.location.origin}${cleaned}`
  }
  return `${window.location.origin}/${cleaned}`
}

/**
 * Helper to check if URL represents a PDF document
 */
export function isPdfFile(url) {
  if (!url) return false
  const lower = String(url).toLowerCase()
  return lower.endsWith('.pdf') || lower.includes('.pdf?') || lower.includes('application/pdf')
}

/**
 * Helper to check if URL represents an Image
 */
export function isImageFile(url) {
  if (!url) return false
  const lower = String(url).toLowerCase()
  return (
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.gif') ||
    lower.endsWith('.svg') ||
    lower.startsWith('data:image/')
  )
}

/**
 * Renders a full file preview gallery supporting Images, PDFs, and Documents.
 */
export default function FileGallery({ files = [], title = "Attached Files" }) {
  const [activePreview, setActivePreview] = useState(null) // { url, type, name }

  // Normalize input files to an array of URLs
  let fileList = []
  if (Array.isArray(files)) {
    fileList = files.flatMap(f => (typeof f === 'string' ? f.split(',') : [f]))
  } else if (typeof files === 'string' && files.trim()) {
    fileList = files.split(',')
  }

  fileList = fileList.map(f => String(f).trim()).filter(Boolean)

  if (fileList.length === 0) {
    return (
      <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
        No design files attached.
      </div>
    )
  }

  return (
    <div style={{ width: '100%' }}>
      {title && (
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <File size={14} /> {title} ({fileList.length})
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
        {fileList.map((rawUrl, i) => {
          const fullUrl = normalizeFileUrl(rawUrl)
          const isPdf = isPdfFile(rawUrl)
          const isImg = isImageFile(rawUrl)
          const fileName = rawUrl.split('/').pop() || `File ${i + 1}`

          if (isPdf) {
            return (
              <div
                key={i}
                style={{
                  border: '1px solid #fca5a5',
                  backgroundColor: '#fef2f2',
                  borderRadius: '10px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '8px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <FileText size={22} color="#dc2626" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#991b1b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={fileName}>
                    {fileName}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ flex: 1, padding: '4px 8px', fontSize: '11px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    onClick={() => setActivePreview({ url: fullUrl, type: 'pdf', name: fileName })}
                  >
                    <Eye size={12} /> View
                  </button>
                  <a
                    href={fullUrl}
                    download={fileName}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-sm"
                    style={{ padding: '4px 8px', fontSize: '11px', background: 'white', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '6px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Download PDF"
                  >
                    <Download size={12} />
                  </a>
                </div>
              </div>
            )
          }

          if (isImg) {
            return (
              <div
                key={i}
                style={{
                  position: 'relative',
                  height: '110px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                  backgroundColor: '#f8fafc',
                  group: 'file-item'
                }}
              >
                <img
                  src={fullUrl}
                  alt={fileName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                  onClick={() => setActivePreview({ url: fullUrl, type: 'image', name: fileName })}
                  onError={(e) => {
                    // Fallback graphic if image path doesn't resolve
                    e.target.style.display = 'none'
                    const parent = e.target.parentElement
                    if (parent) {
                      parent.style.display = 'flex'
                      parent.style.alignItems = 'center'
                      parent.style.justifyContent = 'center'
                      parent.style.flexDirection = 'column'
                      parent.innerHTML = `<span style="font-size:11px; color:#64748b;">📄 Image File</span>`
                    }
                  }}
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(15, 23, 42, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: 0,
                  transition: 'opacity 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                onMouseLeave={e => e.currentTarget.style.opacity = 0}
                onClick={() => setActivePreview({ url: fullUrl, type: 'image', name: fileName })}
                >
                  <button className="btn btn-sm" style={{ background: 'white', color: '#1e293b', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Eye size={12} /> View
                  </button>
                  <a href={fullUrl} download={fileName} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ background: 'white', color: '#2563eb', padding: '6px', borderRadius: '6px', display: 'flex' }}>
                    <Download size={12} />
                  </a>
                </div>
              </div>
            )
          }

          // Generic Document File
          return (
            <div
              key={i}
              style={{
                border: '1px solid var(--border)',
                backgroundColor: '#f8fafc',
                borderRadius: '10px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <File size={20} color="#2563eb" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={fileName}>
                  {fileName}
                </span>
              </div>
              <a
                href={fullUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-sm btn-secondary"
                style={{ fontSize: '11px', padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', textDecoration: 'none' }}
              >
                <ExternalLink size={12} /> Open File
              </a>
            </div>
          )
        })}
      </div>

      {/* Lightbox / Modal Viewer */}
      {activePreview && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setActivePreview(null)}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: activePreview.type === 'pdf' ? '900px' : '850px',
              maxHeight: '90vh',
              backgroundColor: 'white',
              borderRadius: '12px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '14px 20px', background: '#0f172a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                {activePreview.type === 'pdf' ? <FileText size={18} color="#ef4444" /> : <ImageIcon size={18} color="#3b82f6" />}
                <span style={{ fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {activePreview.name}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <a
                  href={activePreview.url}
                  download={activePreview.name}
                  target="_blank"
                  rel="noreferrer"
                  style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                >
                  <Download size={14} /> Download
                </a>
                <button
                  onClick={() => setActivePreview(null)}
                  style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', width: '30px', height: '30px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', overflow: 'auto', minHeight: '400px' }}>
              {activePreview.type === 'pdf' ? (
                <iframe
                  src={activePreview.url}
                  title={activePreview.name}
                  style={{ width: '100%', height: '70vh', border: 'none', borderRadius: '8px' }}
                />
              ) : (
                <img
                  src={activePreview.url}
                  alt={activePreview.name}
                  style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
