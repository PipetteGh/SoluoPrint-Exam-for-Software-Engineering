import { useCallback } from 'react'
import { FileSpreadsheet, Image, FileText } from 'lucide-react'

/**
 * Reusable export toolbar for report pages and portals.
 * Provides PDF, Excel, and Image (PNG) export buttons.
 */
export default function ExportToolbar({ tableData = [], columns = [], fileName = 'report', title = 'Report', currency = '¢', reportRef }) {

  const exportPDF = useCallback(async () => {
    try {
      const { default: jsPDF } = await import('jspdf')
      const html2canvas = (await import('html2canvas')).default

      if (reportRef?.current) {
        // High quality full-page visual capture (Charts + Tables + Stats)
        const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
        const imgData = canvas.toDataURL('image/jpeg', 0.95)
        
        const isLandscape = canvas.width > canvas.height
        const pdf = new jsPDF(isLandscape ? 'l' : 'p', 'mm', 'a4')
        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight)
        pdf.save(`${fileName}.pdf`)
      } else {
        // Fallback to autoTable PDF generation
        const autoTableModule = await import('jspdf-autotable')
        const autoTable = autoTableModule.default || autoTableModule
        
        const doc = new jsPDF('l', 'mm', 'a4')
        const pageWidth = doc.internal.pageSize.getWidth()
        
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text(title, pageWidth / 2, 16, { align: 'center' })
        
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 22, { align: 'center' })

        if (tableData.length > 0 && columns.length > 0) {
          const headers = columns.map(c => c.header)
          const rows = tableData.map(row => columns.map(c => {
            const val = row[c.key]
            if (typeof val === 'number') return `${currency}${val.toFixed(2)}`
            return val ?? '-'
          }))
          
          if (typeof autoTable === 'function') {
            autoTable(doc, {
              head: [headers],
              body: rows,
              startY: 28,
              styles: { fontSize: 9, cellPadding: 3 },
              headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
              alternateRowStyles: { fillColor: [245, 247, 250] }
            })
          } else if (doc.autoTable) {
            doc.autoTable({
              head: [headers],
              body: rows,
              startY: 28,
              styles: { fontSize: 9, cellPadding: 3 },
              headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
              alternateRowStyles: { fillColor: [245, 247, 250] }
            })
          }
        }

        doc.save(`${fileName}.pdf`)
      }
    } catch (err) {
      console.error('PDF Export Failed:', err)
    }
  }, [reportRef, tableData, columns, fileName, title, currency])

  const exportExcel = useCallback(async () => {
    try {
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
    } catch (err) {
      console.error('Excel Export Failed:', err)
    }
  }, [tableData, columns, fileName, title])

  const exportImage = useCallback(async () => {
    try {
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
    } catch (err) {
      console.error('Image Export Failed:', err)
    }
  }, [reportRef, fileName])

  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <button type="button" className="btn btn-secondary btn-sm" onClick={exportPDF} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <FileText size={14} /> Export PDF
      </button>
      <button type="button" className="btn btn-secondary btn-sm" onClick={exportExcel} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <FileSpreadsheet size={14} /> Export Excel
      </button>
      <button type="button" className="btn btn-secondary btn-sm" onClick={exportImage} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Image size={14} /> Save as Image
      </button>
    </div>
  )
}
