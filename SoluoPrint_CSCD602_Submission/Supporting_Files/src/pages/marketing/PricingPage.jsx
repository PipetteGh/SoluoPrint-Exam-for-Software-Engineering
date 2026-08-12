import { Link } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import SEO from '../../components/ui/SEO'

function PricingCard({ name, price, features, popular }) {
  return (
    <div style={{ background: 'white', padding: '40px 32px', borderRadius: '16px', border: `2px solid ${popular ? '#2563eb' : '#e5e7eb'}`, position: 'relative', boxShadow: popular ? '0 20px 25px -5px rgba(37, 99, 235, 0.1)' : 'none', display: 'flex', flexDirection: 'column' }}>
      {popular && <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: '#2563eb', color: 'white', padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Most Popular</div>}
      <h3 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px', color: '#111827' }}>{name}</h3>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '32px' }}>
        <span style={{ fontSize: '48px', fontWeight: 800, color: '#111827', lineHeight: 1 }}>{price}</span>
        <span style={{ fontSize: '16px', color: '#6b7280', fontWeight: 500 }}>/ month</span>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 40px 0', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
        {features.map((f, i) => (
          <li key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center', color: '#4b5563', fontWeight: 500 }}>
            <CheckCircle size={20} color="#10b981" /> {f}
          </li>
        ))}
      </ul>
      <Link to="/register" style={{ textDecoration: 'none', textAlign: 'center', display: 'block', width: '100%', padding: '16px', borderRadius: '12px', fontWeight: 700, fontSize: '16px', background: popular ? '#2563eb' : '#f3f4f6', color: popular ? 'white' : '#111827', transition: 'all 0.2s' }}>
        Get Started
      </Link>
    </div>
  )
}

export default function PricingPage() {
  return (
    <>
      <SEO 
        title="Pricing - SoluoPrint" 
        description="Simple, transparent pricing for print shops of all sizes. Choose the perfect plan for your printing business." 
      />
      <section style={{ background: 'white', padding: '80px 24px', borderTop: '1px solid #e5e7eb', minHeight: 'calc(100vh - 300px)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#111827', marginBottom: '16px' }}>Simple, transparent pricing</h1>
            <p style={{ fontSize: '18px', color: '#6b7280', maxWidth: '600px', margin: '0 auto' }}>Choose the plan that best fits your printing business size and needs.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
            <PricingCard 
              name="Starter" 
              price="$5" 
              features={['1 User', '100 Jobs/month', 'Basic Reports', 'Email Support', 'No SMS Package']} 
            />
            <PricingCard 
              name="Professional" 
              price="$15" 
              features={['5 Users', 'Unlimited Jobs', 'Advanced Reports', '500 SMS/month included', 'Priority Support']} 
              popular 
            />
            <PricingCard 
              name="Business" 
              price="$35" 
              features={['15 Users', 'Unlimited Jobs', 'All Features', 'Unlimited SMS', 'Custom Branding', 'API Access', 'Dedicated Support']} 
            />
          </div>
        </div>
      </section>
    </>
  )
}
