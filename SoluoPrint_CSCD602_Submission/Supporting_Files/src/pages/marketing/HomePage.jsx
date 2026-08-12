import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle } from 'lucide-react'
import SEO from '../../components/ui/SEO'

export default function HomePage() {
  return (
    <>
      <SEO 
        title="SoluoPrint - The Ultimate Print Shop Management Software" 
        description="Streamline your printing business with intelligent job tracking, real-time invoicing, customer CRM, and comprehensive financial reporting. Best software for print shops." 
      />
      
      {/* Hero Section */}
      <section style={{ paddingTop: '80px', paddingBottom: '60px', textAlign: 'center', maxWidth: '1200px', margin: '0 auto', padding: '80px 24px 60px' }}>
        <h1 style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 800, lineHeight: 1.1, color: '#111827', marginBottom: '24px', maxWidth: '800px', margin: '0 auto 24px' }}>
          The Ultimate Operating System for <span style={{ color: '#2563eb' }}>Print Shops</span>
        </h1>
        <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: '#4b5563', maxWidth: '600px', margin: '0 auto 40px', lineHeight: 1.6 }}>
          Streamline your printing business with intelligent job tracking, real-time invoicing, customer management, and comprehensive financial reporting.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '60px' }}>
          <Link to="/register" style={{ textDecoration: 'none', color: 'white', background: '#2563eb', fontWeight: 600, padding: '16px 32px', borderRadius: '12px', fontSize: '18px', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)' }}>
            Start Free Trial <ArrowRight size={20} />
          </Link>
        </div>

        {/* Dashboard Mockup Screenshot */}
        <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e5e7eb', background: 'white', maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ height: '24px', background: '#f3f4f6', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></div>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }}></div>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></div>
          </div>
          <img src="/screenshots/dashboard.png" alt="SoluoPrint Dashboard" style={{ width: '100%', display: 'block', objectFit: 'cover' }} onError={(e) => e.target.src = 'https://placehold.co/1000x600/f8fafc/94a3b8?text=Dashboard+Screenshot'} />
        </div>
      </section>

      {/* Use Cases Section with Mixed Layout */}
      <section id="use-cases" style={{ padding: '80px 24px', background: '#f8fafc' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#111827', marginBottom: '16px' }}>Perfect for any Print Business</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '80px' }}>
            {/* Case 1 */}
            <div className="use-case-row" style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '16px', color: '#111827' }}>Commercial Print Shops</h3>
                <p style={{ fontSize: '18px', color: '#4b5563', lineHeight: 1.6, marginBottom: '24px' }}>
                  Handle walk-in customers seamlessly. Use the Bulk Job feature to quickly ring up multi-item orders like banners, flyers, and business cards all in one transaction. Instantly print a consolidated receipt.
                </p>
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <li style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#374151', fontWeight: 500 }}><CheckCircle size={20} color="#10b981" /> Instant Itemized Receipts</li>
                  <li style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#374151', fontWeight: 500 }}><CheckCircle size={20} color="#10b981" /> Custom Pricing per square foot/meter</li>
                  <li style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#374151', fontWeight: 500 }}><CheckCircle size={20} color="#10b981" /> Track Customer Balances</li>
                </ul>
              </div>
              <div style={{ flex: 1, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', border: '1px solid #e5e7eb' }}>
                 <img src="/screenshots/jobs.png" alt="Jobs Management" style={{ width: '100%', display: 'block' }} onError={(e) => e.target.src = 'https://placehold.co/600x400/f8fafc/94a3b8?text=Jobs+Management'} />
              </div>
            </div>

            {/* Case 2 */}
            <div className="use-case-row reverse" style={{ display: 'flex', alignItems: 'center', gap: '40px', flexDirection: 'row-reverse' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '16px', color: '#111827' }}>Large Format & Agencies</h3>
                <p style={{ fontSize: '18px', color: '#4b5563', lineHeight: 1.6, marginBottom: '24px' }}>
                  Track large corporate accounts and manage receivables. Setup specific user roles so your sales team can only view their jobs, while management oversees the entire profit and loss pipeline.
                </p>
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <li style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#374151', fontWeight: 500 }}><CheckCircle size={20} color="#10b981" /> Comprehensive Profit & Loss Reports</li>
                  <li style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#374151', fontWeight: 500 }}><CheckCircle size={20} color="#10b981" /> Granular Staff Permissions</li>
                  <li style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#374151', fontWeight: 500 }}><CheckCircle size={20} color="#10b981" /> Detailed Expense Tracking</li>
                </ul>
              </div>
              <div style={{ flex: 1, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', border: '1px solid #e5e7eb' }}>
                 <img src="/screenshots/settings.png" alt="Settings & Permissions" style={{ width: '100%', display: 'block' }} onError={(e) => e.target.src = 'https://placehold.co/600x400/f8fafc/94a3b8?text=Settings+&+Roles'} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ background: '#1e3a8a', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 800, color: 'white', marginBottom: '24px' }}>Ready to modernize your print shop?</h2>
          <p style={{ fontSize: '18px', color: '#bfdbfe', marginBottom: '40px' }}>Join dozens of forward-thinking businesses upgrading their operations with SoluoPrint.</p>
          <Link to="/register" style={{ textDecoration: 'none', color: '#1e3a8a', background: 'white', fontWeight: 700, padding: '16px 40px', borderRadius: '12px', fontSize: '18px', display: 'inline-block', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
            Create Your Account
          </Link>
        </div>
      </section>
    </>
  )
}
