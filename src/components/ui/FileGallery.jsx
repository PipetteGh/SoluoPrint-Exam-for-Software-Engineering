import React, { useState } from 'react'
import { FileText, Download, Image as ImageIcon, File, Loader2, CheckCircle2 } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'

/**
 * Normalizes any file URL or Data URL for downloading
 */
export function normalizeFileUrl(url) {
  if (!url) return ''
  let cleaned = String(url).trim()

  if (cleaned.startsWith('[uploaded:')) {
    cleaned = cleaned.replace('[uploaded:', '').replace(']', '').trim()
  }

  // Strip embedded ;name=... metadata from Data URL
  if (cleaned.startsWith('data:')) {
    if (cleaned.includes(';name=')) {
      cleaned = cleaned.replace(/;name=[^;]+;/, ';')
    }
    return cleaned
  }

  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    return cleaned
  }

  // Relative URL
  if (cleaned.startsWith('/')) {
    return `${window.location.origin}${cleaned}`
  }
  return `${window.location.origin}/${cleaned}`
}

/**
 * Extracts human-readable filename and original extension as stored in database/directory
 */
export function extractFileName(rawUrl, index = 0) {
  if (!rawUrl) return `File_${index + 1}`
  const str = String(rawUrl).trim()

  if (str.startsWith('[uploaded:')) {
    const rawName = str.replace('[uploaded:', '').replace(']', '').trim()
    return rawName || `File_${index + 1}`
  }

  if (str.includes(';name=')) {
    const match = str.match(/;name=([^;]+);/)
    if (match && match[1]) {
      return decodeURIComponent(match[1])
    }
  }

  const clean = str.split('?')[0].split('#')[0]
  const name = clean.split('/').pop()
  if (name && name.length > 3 && !name.startsWith('data:')) {
    return name
  }

  if (str.startsWith('data:image/png')) return `Artwork_${index + 1}.png`
  if (str.startsWith('data:image/jpeg') || str.startsWith('data:image/jpg')) return `Artwork_${index + 1}.jpg`
  if (str.startsWith('data:image/webp')) return `Artwork_${index + 1}.webp`
  if (str.startsWith('data:application/pdf')) return `Document_${index + 1}.pdf`
  return `File_${index + 1}`
}

/**
 * Helper to check if URL represents a PDF document
 */
export function isPdfFile(url) {
  if (!url) return false
  const lower = String(url).toLowerCase()
  return lower.includes('application/pdf') || lower.endsWith('.pdf') || lower.includes('.pdf?')
}

/**
 * Helper to check if URL represents an Image
 */
export function isImageFile(url) {
  if (!url) return false
  const lower = String(url).toLowerCase()
  return (
    lower.includes('image/') ||
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.gif') ||
    lower.endsWith('.svg') ||
    lower.startsWith('data:image/') ||
    lower.startsWith('[uploaded:')
  )
}

/**
 * Native Browser Blob Download Engine (Guarantees 100% exact binary format & extension)
 * Accepts optional onStart and onComplete callbacks for progress UI feedback
 */
export async function downloadFile(rawUrl, fallbackName = 'download', onStart = () => {}, onComplete = () => {}) {
  try {
    onStart()
    const fileName = extractFileName(rawUrl) || fallbackName
    const str = String(rawUrl).trim()

    // 1. If it's a Data URL (base64)
    if (str.startsWith('data:')) {
      const validDataUrl = str.replace(/;name=[^;]+;/, ';')
      const parts = validDataUrl.split(';base64,')

      if (parts.length === 2) {
        const mime = parts[0].replace('data:', '') || 'application/octet-stream'
        const cleanBase64 = parts[1].replace(/\s/g, '').replace(/[^A-Za-z0-9+/=]/g, '')

        const binary = window.atob(cleanBase64)
        const len = binary.length
        const bytes = new Uint8Array(len)
        for (let i = 0; i < len; i++) {
          bytes[i] = binary.charCodeAt(i)
        }

        const blob = new Blob([bytes], { type: mime })
        const blobUrl = URL.createObjectURL(blob)

        const a = document.createElement('a')
        a.href = blobUrl
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(blobUrl), 3000)
        onComplete(true, fileName)
        return
      }
    }

    // 2. Normal HTTP/HTTPS or relative URL
    const fullUrl = normalizeFileUrl(str)
    try {
      const res = await fetch(fullUrl)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000)
      onComplete(true, fileName)
    } catch (fetchErr) {
      const a = document.createElement('a')
      a.href = fullUrl
      a.download = fileName
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      onComplete(true, fileName)
    }
  } catch (err) {
    console.error('Download exception:', err)
    onComplete(false, fallbackName)
  }
}

/**
 * Renders attached file cards with active downloading state, loader spinner & toast feedback.
 */
export default function FileGallery({ files = [], title = "Attached Files" }) {
  const [downloadingIndex, setDownloadingIndex] = useState(null)
  const [downloadedIndex, setDownloadedIndex] = useState(null)
  const [hoveredIndex, setHoveredIndex] = useState(null)
  
  let showToast = () => {}
  try {
    const toastCtx = useToast()
    if (toastCtx && toastCtx.showToast) showToast = toastCtx.showToast
  } catch (e) {
    // Optional fallback if rendered outside ToastContext
  }

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

  const handleDownload = async (rawUrl, fileName, index) => {
    setDownloadingIndex(index)
    showToast(`Preparing download for ${fileName}...`, 'info')

    await downloadFile(
      rawUrl,
      fileName,
      () => {},
      (success, name) => {
        setDownloadingIndex(null)
        if (success) {
          setDownloadedIndex(index)
          showToast(`${name || fileName} downloaded successfully!`, 'success')
          setTimeout(() => setDownloadedIndex(null), 4000)
        } else {
          showToast(`Failed to download ${name || fileName}. Please try again.`, 'error')
        }
      }
    )
  }

  return (
    <div style={{ width: '100%' }}>
      {title && (
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <File size={14} /> {title} ({fileList.length})
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {fileList.map((rawUrl, i) => {
          const isPdf = isPdfFile(rawUrl)
          const isImg = isImageFile(rawUrl)
          const fileName = extractFileName(rawUrl, i)
          const isDownloading = downloadingIndex === i
          const isDownloaded = downloadedIndex === i
          const isHovered = hoveredIndex === i
          const imgSrc = window.location.hostname === 'localhost' && !rawUrl.startsWith('http') ? `http://localhost${rawUrl}` : rawUrl

          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '80px' }}>
              <div
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => !isDownloading && handleDownload(rawUrl, fileName, i)}
                style={{
                  position: 'relative',
                  width: '80px',
                  height: '80px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: isDownloading ? '2px solid #3b82f6' : isDownloaded ? '2px solid #10b981' : '1px solid var(--border)',
                  background: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isDownloading ? 'wait' : 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  transition: 'all 0.15s ease-in-out'
                }}
                title={isDownloading ? `Downloading ${fileName}...` : `Click to Download ${fileName}`}
              >
                {/* Thumbnail / Doc Preview */}
                {isImg ? (
                  <img src={imgSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '4px' }}>
                    <FileText size={24} color={isDownloading ? '#3b82f6' : isDownloaded ? '#10b981' : '#64748b'} />
                  </div>
                )}

                {/* Hover Download Overlay */}
                {isHovered && !isDownloading && !isDownloaded && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(15,23,42,0.65)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    transition: 'all 0.15s ease'
                  }}>
                    <Download size={20} />
                  </div>
                )}

                {/* Downloading Overlay */}
                {isDownloading && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(239,246,255,0.95)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2563eb',
                    gap: '4px',
                    padding: '2px'
                  }}>
                    <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: '7.5px', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center', letterSpacing: '-0.3px' }}>DOWNLOADING</span>
                  </div>
                )}

                {/* Downloaded Success Overlay */}
                {isDownloaded && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(240,253,244,0.95)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#166534',
                    gap: '4px',
                    padding: '2px'
                  }}>
                    <CheckCircle2 size={16} />
                    <span style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase' }}>DONE</span>
                  </div>
                )}
              </div>

              {/* Visible Filename Below Card */}
              <span 
                style={{ 
                  fontSize: '10px', 
                  color: 'var(--text-secondary)', 
                  textAlign: 'center', 
                  maxWidth: '80px', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap',
                  fontWeight: 500
                }}
                title={fileName}
              >
                {fileName}
              </span>
            </div>
          )
        })}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
