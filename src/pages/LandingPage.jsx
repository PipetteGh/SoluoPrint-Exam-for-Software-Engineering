import { Link } from 'react-router-dom'
import { CheckCircle, Printer, DollarSign, Users, Shield, Database, ArrowRight, Menu, X, Mail, Phone, LayoutDashboard, MessageSquare, Image as ImageIcon } from 'lucide-react'
import { useState } from 'react'
import SEO from '../components/ui/SEO'

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="landing-page" style={{ fontFamily: '"Inter", sans-serif', color: '#1f2937', background: '#f9fafb', minHeight: '100vh' }}>
      <SEO 
        title="SoluoPrint - The Ultimate Print Shop Management Software" 
        description="Streamline your printing business with intelligent job tracking, real-time invoicing, customer CRM, and comprehensive financial reporting. Best software for print shops." 
      />
      
      {/* Navbar */}
      <nav style={{ background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', position: 'fixed', width: '100%', top: 0, zIndex: 1000, borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '24px', color: '#111827' }}>
            <Printer color="#2563eb" size={28} />
            SoluoPrint
          </div>
          
          <div className="desktop-menu" style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
            <a href="#features" style={{ textDecoration: 'none', color: '#4b5563', fontWeight: 500 }}>Features</a>
            <a href="#use-cases" style={{ textDecoration: 'none', color: '#4b5563', fontWeight: 500 }}>Use Cases</a>
            <a href="#contact" style={{ textDecoration: 'none', color: '#4b5563', fontWeight: 500 }}>Contact</a>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Link to="/login" style={{ textDecoration: 'none', color: '#111827', fontWeight: 600, padding: '8px 16px', borderRadius: '8px', border: '1px solid #d1d5db' }}>Log in</Link>
              <Link to="/register" style={{ textDecoration: 'none', color: 'white', background: '#2563eb', fontWeight: 600, padding: '8px 16px', borderRadius: '8px', border: '1px solid #2563eb', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' }}>Get Started</Link>
            </div>
          </div>

          <div className="mobile-actions" style={{ display: 'none', alignItems: 'center', gap: '16px' }}>
            <Link to="/register" style={{ textDecoration: 'none', color: 'white', background: '#2563eb', fontWeight: 600, padding: '8px 16px', borderRadius: '8px', fontSize: '14px', border: '1px solid #2563eb' }}>Get Started</Link>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: '#111827', padding: 0 }}>
              {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div style={{ position: 'fixed', top: '73px', left: 0, right: 0, background: 'white', borderBottom: '1px solid #e5e7eb', padding: '24px', zIndex: 999, display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
          <a href="#features" onClick={() => setMobileMenuOpen(false)} style={{ textDecoration: 'none', color: '#111827', fontWeight: 600, fontSize: '18px' }}>Features</a>
          <a href="#gallery" onClick={() => setMobileMenuOpen(false)} style={{ textDecoration: 'none', color: '#111827', fontWeight: 600, fontSize: '18px' }}>Take a Tour</a>
          <a href="#pricing" onClick={() => setMobileMenuOpen(false)} style={{ textDecoration: 'none', color: '#111827', fontWeight: 600, fontSize: '18px' }}>Pricing</a>
          <a href="#contact" onClick={() => setMobileMenuOpen(false)} style={{ textDecoration: 'none', color: '#111827', fontWeight: 600, fontSize: '18px' }}>Contact</a>
          <div style={{ height: '1px', background: '#e5e7eb', margin: '4px 0' }}></div>
          <Link to="/login" onClick={() => setMobileMenuOpen(false)} style={{ textDecoration: 'none', color: '#4b5563', fontWeight: 600, fontSize: '18px' }}>Log in to account</Link>
        </div>
      )}

      {/* Hero Section */}
      <section style={{ paddingTop: '120px', paddingBottom: '60px', textAlign: 'center', maxWidth: '1200px', margin: '0 auto', padding: '120px 24px 60px' }}>
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

      {/* Features Section */}
      <section id="features" style={{ background: 'white', padding: '80px 24px', borderTop: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#111827', marginBottom: '16px' }}>Everything you need to scale</h2>
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

      {/* Gallery Section */}
      <section id="gallery" style={{ padding: '80px 24px', background: '#111827', color: 'white' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '36px', fontWeight: 800, color: 'white', marginBottom: '16px' }}>Take a Tour of SoluoPrint</h2>
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

      {/* Pricing Section */}
      <section id="pricing" style={{ background: 'white', padding: '80px 24px', borderTop: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#111827', marginBottom: '16px' }}>Simple, transparent pricing</h2>
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

      {/* Footer */}
      <footer id="contact" style={{ background: '#111827', color: '#9ca3af', padding: '60px 24px 30px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '40px', justifyContent: 'space-between', borderBottom: '1px solid #374151', paddingBottom: '40px', marginBottom: '30px' }}>
          <div style={{ maxWidth: '300px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '24px', color: 'white', marginBottom: '16px' }}>
              <Printer color="#3b82f6" size={28} />
              SoluoPrint
            </div>
            <p style={{ marginBottom: '24px', lineHeight: 1.6 }}>The complete business management solution built explicitly for the modern printing industry.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'white', fontWeight: 600 }}>
              <span>A product of</span> <span style={{ color: '#3b82f6' }}>Soluotech</span>
            </div>
          </div>
          
          <div>
            <h4 style={{ color: 'white', fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>Contact Us</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Phone size={18} /> +233 59 886 9170</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Mail size={18} /> info@soluotech.com</li>
            </ul>
          </div>
        </div>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', fontSize: '14px' }}>
          &copy; {new Date().getFullYear()} Soluotech. All rights reserved.
        </div>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .desktop-menu { display: none !important; }
          .mobile-actions { display: flex !important; }
          .use-case-row { flex-direction: column !important; }
        }
      `}</style>
    </div>
  )
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div style={{ background: '#f8fafc', padding: '32px', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
      <div style={{ width: '48px', height: '48px', background: '#dbeafe', color: '#2563eb', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
        {icon}
      </div>
      <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '12px' }}>{title}</h3>
      <p style={{ color: '#4b5563', lineHeight: 1.6, margin: 0 }}>{desc}</p>
    </div>
  )
}

function PricingCard({ name, price, features, popular }) {
  return (
    <div style={{ background: 'white', padding: '32px', borderRadius: '16px', border: popular ? '2px solid #2563eb' : '1px solid #e5e7eb', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      {popular && (
        <span style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#2563eb', color: 'white', padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Most Popular
        </span>
      )}
      <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>{name}</h3>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '24px' }}>
        <span style={{ fontSize: '48px', fontWeight: 800, color: '#111827', lineHeight: 1 }}>{price}</span>
        <span style={{ fontSize: '16px', color: '#6b7280', fontWeight: 500 }}>/mo</span>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
        {features.map((feature, i) => (
          <li key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center', color: '#4b5563', fontSize: '15px' }}>
            <CheckCircle size={20} color="#2563eb" /> {feature}
          </li>
        ))}
      </ul>
      <Link to="/register" style={{ textDecoration: 'none', textAlign: 'center', color: popular ? 'white' : '#2563eb', background: popular ? '#2563eb' : '#eff6ff', fontWeight: 600, padding: '12px 24px', borderRadius: '8px', border: popular ? '1px solid #2563eb' : '1px solid #bfdbfe', display: 'block', width: '100%' }}>
        Get Started
      </Link>
    </div>
  )
}

function GalleryItem({ src, title }) {
  return (
    <div style={{ background: '#1f2937', borderRadius: '12px', overflow: 'hidden', border: '1px solid #374151' }}>
      <img src={src} alt={title} style={{ width: '100%', display: 'block', objectFit: 'cover', height: '220px', borderBottom: '1px solid #374151' }} onError={(e) => e.target.src = 'https://placehold.co/600x400/1f2937/9ca3af?text=' + title.replace(/ /g, '+')} />
      <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#f3f4f6', fontWeight: 600 }}>
        <ImageIcon size={18} color="#9ca3af" />
        {title}
      </div>
    </div>
  )
}
