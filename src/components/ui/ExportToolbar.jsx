import { useRef, useCallback } from 'react'
import { Download, FileSpreadsheet, Image, FileText } from 'lucide-react'

/**
 * Reusable export toolbar for report pages.
 * Provides PDF, Excel, and Image (PNG) export buttons.
 * 
 * Props:
 * - tableData: Array of objects for table export
 * - columns: Array of { header, key } for mapping
 * - fileName: base file name (no extension)
 * - title: report title for PDF header
 * - currency: currency symbol
 * - chartRefs: array of refs to chart containers for image capture
 * - reportRef: ref to the entire report container for image capture
 */
export default function ExportToolbar({ tableData = [], columns = [], fileName = 'report', title = 'Report', currency = '¢', reportRef }) {
  const [exporting, setExporting] = [false, () => {}] // placeholder for loading

  const exportPDF = useCallback(async () => {
    const { default: jsPDF } = await import('jspdf')
    await import('jspdf-autotable')
    
    const doc = new jsPDF('l', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
    
    // Title
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(title, pageWidth / 2, 20, { align: 'center' })
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' })

    if (tableData.length > 0 && columns.length > 0) {
      const headers = columns.map(c => c.header)
      const rows = tableData.map(row => columns.map(c => {
        const val = row[c.key]
        if (typeof val === 'number') return `${currency}${val.toFixed(2)}`
        return val ?? '-'
      }))
      
      doc.autoTable({
        head: [headers],
        body: rows,
        startY: 35,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { top: 35 }
      })
    }

    doc.save(`${fileName}.pdf`)
  }, [tableData, columns, fileName, title, currency])

  const exportExcel = useCallback(async () => {
    const XLSX = await import('xlsx')
    
    const worksheetData = tableData.map(row => {
      const obj = {}
      columns.forEach(c => {
        obj[c.header] = row[c.key]
      })
      return obj
    })
    
    const ws = XLSX.utils.json_to_sheet(worksheetData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31))
    XLSX.writeFile(wb, `${fileName}.xlsx`)
  }, [tableData, columns, fileName, title])

  const exportImage = useCallback(async () => {
    if (!reportRef?.current) return
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(reportRef.current, { 
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true
    })
    const link = document.createElement('a')
    link.download = `${fileName}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [reportRef, fileName])

  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <button className="btn btn-secondary btn-sm" onClick={exportPDF} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <FileText size={14} /> Export PDF
      </button>
      <button className="btn btn-secondary btn-sm" onClick={exportExcel} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <FileSpreadsheet size={14} /> Export Excel
      </button>
      <button className="btn btn-secondary btn-sm" onClick={exportImage} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Image size={14} /> Save as Image
      </button>
    </div>
  )
}
