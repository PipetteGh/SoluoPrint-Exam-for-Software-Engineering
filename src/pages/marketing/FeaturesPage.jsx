import { Printer, DollarSign, Users, Shield, Database, LayoutDashboard, MessageSquare } from 'lucide-react'
import SEO from '../../components/ui/SEO'

function FeatureCard({ icon, title, desc }) {
  return (
    <div style={{ background: '#f9fafb', padding: '32px', borderRadius: '16px', border: '1px solid #e5e7eb', transition: 'transform 0.2s', cursor: 'default' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
        {icon}
      </div>
      <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: '#111827' }}>{title}</h3>
      <p style={{ color: '#4b5563', lineHeight: 1.6, margin: 0 }}>{desc}</p>
    </div>
  )
}

export default function FeaturesPage() {
  return (
    <>
      <SEO 
        title="Features - SoluoPrint" 
        description="Discover the powerful features of SoluoPrint. Job management, automated SMS, bulk orders, customer CRM, and granular staff permissions." 
      />
      <section style={{ background: 'white', padding: '80px 24px', borderTop: '1px solid #e5e7eb', minHeight: 'calc(100vh - 300px)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#111827', marginBottom: '16px' }}>Everything you need to scale</h1>
            <p style={{ fontSize: '18px', color: '#6b7280', maxWidth: '600px', margin: '0 auto' }}>Built specifically for the printing industry, packed with features to save you time and increase revenue.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
            <FeatureCard icon={<Printer size={24} />} title="Job Management & Bulk Orders" desc="Easily manage individual print jobs or bulk orders. Generate instant receipts and track job progress." />
            <FeatureCard icon={<DollarSign size={24} />} title="Financial Tracking" desc="Track revenue, log expenses, and instantly generate profit & loss statements. Never lose track of payments." />
            <FeatureCard icon={<Users size={24} />} title="Customer CRM" desc="Maintain a database of your clients, their order history, outstanding balances, and VIP status." />
            <FeatureCard icon={<Shield size={24} />} title="Roles & Permissions" desc="Assign custom roles to your staff to restrict access to sensitive financial data or configuration settings." />
            <FeatureCard icon={<Database size={24} />} title="Data Backup & Security" desc="Export your entire database to JSON or CSV anytime. Your business data is always safe and yours to keep." />
            <FeatureCard icon={<MessageSquare size={24} />} title="Automated SMS Alerts" desc="Keep customers informed instantly. Send automated SMS receipts and job completion notifications." />
            <FeatureCard icon={<LayoutDashboard size={24} />} title="Real-time Analytics" desc="Beautiful dashboards showing daily sales, receivables, and performance metrics at a glance." />
          </div>
        </div>
      </section>
    </>
  )
}
