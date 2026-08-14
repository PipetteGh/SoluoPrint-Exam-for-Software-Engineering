import { X, Printer, CreditCard } from 'lucide-react'

export default function ReceiptModal({ job, company, onClose, onPay, gatewaysActive, customerName }) {
  function handlePrint() {
    window.print()
  }

  const currency = company?.currency_symbol || '¢'

  // calculate subtotal, discount amt, etc from job
  const price = parseFloat(job.unit_price) || 0
  const qty = parseInt(job.quantity) || 1
  const w = parseFloat(job.width) || 0
  const h = parseFloat(job.height) || 0
  const area = w && h ? w * h : 1
  const subtotal = price * area * qty
  const discountAmt = subtotal * (parseFloat(job.discount) || 0) / 100
  const premiumAmt = subtotal * (parseFloat(job.premium) || 0) / 100

  const dateObj = new Date(job.created_at || new Date())
  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const assignedName = job.profiles?.full_name || 'Admin'

  let bulkItems = null
  let displayNotes = job.notes || ''
  
  if (displayNotes.includes('<!--BULK_JSON:')) {
    try {
      const match = displayNotes.match(/<!--BULK_JSON:(.*)-->/)
      if (match && match[1]) {
        bulkItems = JSON.parse(match[1])
        displayNotes = displayNotes.split('[Bulk Job Breakdown]')[0].trim()
      }
    } catch(e) {
      console.error('Failed to parse bulk JSON', e)
    }
  }

  let itemTitle = job.services?.name || job.category || 'Print Job'
  if (job.preset_size && !itemTitle.toLowerCase().includes(job.preset_size.toLowerCase())) {
    itemTitle += ` (${job.preset_size})`
  } else if (displayNotes) {
    const presetMatch = displayNotes.match(/(Sticker\s+[A-Z0-9x\s]+|Preset:\s*[^;\n]+|[A-Z0-9]+\s+Sheet|Banner\s+[0-9x\s]+)/i)
    if (presetMatch && !itemTitle.toLowerCase().includes(presetMatch[1].toLowerCase())) {
      itemTitle += ` - ${presetMatch[1]}`
    }
  }

  let dimensionStr = '-'
  if (job.width && job.height) {
    dimensionStr = `${job.width} × ${job.height} ${job.unit || ''}`.trim()
  } else if (job.preset_size) {
    dimensionStr = job.preset_size
  }

  return (
    <div className="modal-overlay print-modal-overlay">
      <div className="modal modal-lg receipt-modal">
        <div className="modal-header no-print">
          <h2 className="modal-title">Receipt / Invoice #{job.job_number}</h2>
          <div style={{display:'flex', gap:'10px', alignItems: 'center'}}>
             {Number(job.balance) > 0 && onPay && (
               <button className="btn btn-success" onClick={() => onPay(job)} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#10b981', color: 'white', border: 'none', fontWeight: 600 }}>
                 <CreditCard size={16} /> Pay Online Now ({currency}{Number(job.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
               </button>
             )}
             <button className="btn btn-primary" onClick={handlePrint}><Printer size={16}/> Print</button>
             <button className="modal-close" onClick={onClose}><X /></button>
          </div>
        </div>
        <div className="modal-body printable-area" style={{padding: '40px', color: '#000', background: '#fff', minHeight: '600px'}}>
           {/* Receipt Layout */}
           <div style={{display:'flex', justifyContent:'space-between', borderBottom:'2px solid #eee', paddingBottom:'20px', marginBottom:'20px'}}>
             <div>
               <h1 style={{margin:0, fontSize:'24px', fontWeight:800}}>{company?.name || 'My Company'}</h1>
               <p style={{margin:'4px 0', color:'#555', whiteSpace:'pre-wrap'}}>{company?.address}</p>
               <p style={{margin:'0', color:'#555'}}>{company?.phone} {company?.phone && company?.email ? '|' : ''} {company?.email}</p>
             </div>
             <div style={{textAlign:'right'}}>
               <h2 style={{margin:0, fontSize:'28px', color:'#ccc'}}>INVOICE</h2>
               <p style={{margin:'8px 0 4px 0'}}><strong>Job #:</strong> {job.job_number}</p>
               <p style={{margin:'0'}}><strong>Date:</strong> {job.job_date} {timeStr}</p>
             </div>
           </div>
           
           <div style={{display:'flex', justifyContent:'space-between', marginBottom:'30px'}}>
             <div>
               <h3 style={{fontSize:'12px', color:'#666', marginBottom:'4px', textTransform:'uppercase'}}>Billed To:</h3>
               <p style={{margin:0, fontWeight:600, fontSize:'16px'}}>{job.customers?.name || customerName || 'Walk-in Customer'}</p>
             </div>
             <div style={{textAlign:'right'}}>
               <h3 style={{fontSize:'12px', color:'#666', marginBottom:'4px', textTransform:'uppercase'}}>Tendered By:</h3>
               <p style={{margin:0, fontWeight:600, fontSize:'14px'}}>{assignedName}</p>
             </div>
           </div>
           
           <table style={{width:'100%', borderCollapse:'collapse', marginBottom:'30px', fontSize: '14px'}}>
             <thead>
               <tr style={{background:'#f9fafb', borderBottom:'2px solid #ddd'}}>
                 <th style={{padding:'12px', textAlign:'left'}}>Description &amp; Item Details</th>
                 <th style={{padding:'12px', textAlign:'center'}}>Dimensions</th>
                 <th style={{padding:'12px', textAlign:'center'}}>Qty</th>
                 <th style={{padding:'12px', textAlign:'right'}}>Unit Price</th>
                 <th style={{padding:'12px', textAlign:'right'}}>Amount</th>
               </tr>
             </thead>
             <tbody>
               {bulkItems ? (
                 bulkItems.map((item, i) => (
                   <tr key={i} style={{borderBottom:'1px solid #eee'}}>
                     <td style={{padding:'12px'}}>
                       <div style={{fontWeight:700, color: '#1e293b'}}>{item.service || item.category || 'Print Item'}</div>
                       {item.notes && <div style={{fontSize:'12px', color:'#475569', marginTop:'2px'}}>{item.notes}</div>}
                       {i === 0 && displayNotes && <div style={{fontSize:'12px', color:'#64748b', marginTop:'4px'}}>{displayNotes}</div>}
                     </td>
                     <td style={{padding:'12px', textAlign:'center', fontWeight:500}}>{item.dim || '-'}</td>
                     <td style={{padding:'12px', textAlign:'center', fontWeight:600}}>{item.qty}</td>
                     <td style={{padding:'12px', textAlign:'right'}}>{currency}{Number(item.price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                     <td style={{padding:'12px', textAlign:'right', fontWeight:600}}>{currency}{Number(item.subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                   </tr>
                 ))
               ) : (
                 <tr style={{borderBottom:'1px solid #eee'}}>
                   <td style={{padding:'12px'}}>
                     <div style={{fontWeight:700, color: '#1e293b', fontSize: '15px'}}>{itemTitle}</div>
                     {displayNotes && (
                       <div style={{fontSize:'12px', color:'#475569', marginTop:'4px', whiteSpace: 'pre-wrap', lineHeight: 1.4}}>
                         {displayNotes}
                       </div>
                     )}
                   </td>
                   <td style={{padding:'12px', textAlign:'center', fontWeight:500}}>{dimensionStr}</td>
                   <td style={{padding:'12px', textAlign:'center', fontWeight:600}}>{job.quantity}</td>
                   <td style={{padding:'12px', textAlign:'right'}}>{currency}{Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                   <td style={{padding:'12px', textAlign:'right', fontWeight:600}}>{currency}{Number(subtotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                 </tr>
               )}
             </tbody>
           </table>
           
           <div style={{display:'flex', justifyContent:'flex-end'}}>
             <div style={{width:'320px'}}>
               <div style={{display:'flex', justifyContent:'space-between', padding:'8px 0', fontSize: '14px'}}>
                 <span style={{color:'#666'}}>Subtotal:</span>
                 <span>{currency}{Number(subtotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
               </div>
               {job.discount > 0 && (
                 <div style={{display:'flex', justifyContent:'space-between', padding:'8px 0', color:'#dc2626', fontSize: '14px'}}>
                   <span>Discount ({job.discount}%):</span>
                   <span>-{currency}{Number(discountAmt).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                 </div>
               )}
               {job.premium > 0 && (
                 <div style={{display:'flex', justifyContent:'space-between', padding:'8px 0', fontSize: '14px'}}>
                   <span style={{color:'#666'}}>Premium ({job.premium}%):</span>
                   <span>+{currency}{Number(premiumAmt).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                 </div>
               )}
               <div style={{display:'flex', justifyContent:'space-between', padding:'12px 0', borderTop:'2px solid #ddd', borderBottom:'2px solid #ddd', marginTop:'8px', fontWeight:800, fontSize:'18px'}}>
                 <span>Total:</span>
                 <span>{currency}{Number(job.total_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
               </div>
               <div style={{display:'flex', justifyContent:'space-between', padding:'8px 0', marginTop:'8px', color: (job.balance || 0) > 0 ? '#dc2626' : '#16a34a', fontWeight:600, fontSize: '14px'}}>
                 <span>Balance Due:</span>
                 <span>{currency}{Number(job.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
               </div>
             </div>
           </div>
           
           <div style={{marginTop:'60px', textAlign:'center', color:'#888', fontSize:'12px', borderTop:'1px solid #eee', paddingTop:'20px'}}>
             <p style={{margin:'0 0 4px 0'}}>Thank you for your business!</p>
             <p style={{margin:0}}>Generated by SoluoPrint Software</p>
           </div>
        </div>
      </div>
      <style>{`
        @media print {
          /* Hide all page content by default */
          body * {
            visibility: hidden;
          }
          
          /* Show the printable area and its children */
          .printable-area, .printable-area * {
            visibility: visible;
          }
          
          /* Position the printable area to the top left of the page */
          .printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
            margin: 0 !important;
          }

          /* Hide non-printable modal elements */
          .modal-header, .modal-close, .no-print, .btn {
            display: none !important;
          }

          /* Ensure flex layouts and colors are preserved */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Force display types for critical elements */
          .printable-area div[style*="display: flex"] { display: flex !important; }
          .printable-area table { display: table !important; width: 100% !important; }
          
          /* Clean up the page */
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  )
}
