import { ImageIcon } from 'lucide-react'
import SEO from '../../components/ui/SEO'

function GalleryItem({ src, title }) {
  return (
    <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #374151', background: '#1f2937', transition: 'transform 0.2s', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} onClick={() => window.open(src, '_blank')}>
      <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #374151' }}>
        <ImageIcon size={18} color="#60a5fa" />
        <span style={{ fontWeight: 600, fontSize: '15px' }}>{title}</span>
      </div>
      <img src={src} alt={title} style={{ width: '100%', display: 'block', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }} onError={(e) => { e.target.src = 'https://placehold.co/800x450/1e293b/94a3b8?text=' + title.replace(' ', '+') }} />
    </div>
  )
}

export default function TourPage() {
  return (
    <>
      <SEO 
        title="Take a Tour - SoluoPrint" 
        description="Take a visual tour of the SoluoPrint software. Explore our beautiful, intuitive interfaces designed for printing businesses." 
      />
      <section style={{ padding: '80px 24px', background: '#111827', color: 'white', minHeight: 'calc(100vh - 300px)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h1 style={{ fontSize: '36px', fontWeight: 800, color: 'white', marginBottom: '16px' }}>Take a Tour of SoluoPrint</h1>
            <p style={{ fontSize: '18px', color: '#9ca3af', maxWidth: '600px', margin: '0 auto' }}>Explore the intuitive interfaces designed to make managing your print shop a breeze.</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
            <GalleryItem src="/screenshots/dashboard.png" title="Main Dashboard" />
            <GalleryItem src="/screenshots/jobs.png" title="Print Jobs & Bulk Orders" />
            <GalleryItem src="/screenshots/customers.png" title="Customer CRM" />
            <GalleryItem src="/screenshots/payments.png" title="Payment Tracking" />
            <GalleryItem src="/screenshots/receivables.png" title="Receivables & Balances" />
            <GalleryItem src="/screenshots/reviews.png" title="Customer Reviews" />
            <GalleryItem src="/screenshots/expenses.png" title="Expense Tracking" />
            <GalleryItem src="/screenshots/revenue.png" title="Revenue Reports" />
            <GalleryItem src="/screenshots/expense_report.png" title="Expense Reports" />
            <GalleryItem src="/screenshots/profit_loss.png" title="Profit & Loss Statements" />
            <GalleryItem src="/screenshots/services.png" title="Services Configuration" />
            <GalleryItem src="/screenshots/categories.png" title="Categories Settings" />
            <GalleryItem src="/screenshots/settings.png" title="System Settings" />
          </div>
        </div>
      </section>
    </>
  )
}
