import { Link, Outlet, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Printer, Menu, X, Mail, Phone } from 'lucide-react'

export default function MarketingLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="landing-page" style={{ fontFamily: '"Inter", sans-serif', color: '#1f2937', background: '#f9fafb', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <nav style={{ background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', position: 'fixed', width: '100%', top: 0, zIndex: 1000, borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '24px', color: '#111827', textDecoration: 'none' }}>
            <Printer color="#2563eb" size={28} />
            SoluoPrint
          </Link>
          
          <div className="desktop-menu" style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
            <Link to="/features" style={{ textDecoration: 'none', color: location.pathname === '/features' ? '#2563eb' : '#4b5563', fontWeight: 500 }}>Features</Link>
            <Link to="/tour" style={{ textDecoration: 'none', color: location.pathname === '/tour' ? '#2563eb' : '#4b5563', fontWeight: 500 }}>Take a Tour</Link>
            <Link to="/pricing" style={{ textDecoration: 'none', color: location.pathname === '/pricing' ? '#2563eb' : '#4b5563', fontWeight: 500 }}>Pricing</Link>
            <Link to="/contact" style={{ textDecoration: 'none', color: location.pathname === '/contact' ? '#2563eb' : '#4b5563', fontWeight: 500 }}>Contact</Link>
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
          <Link to="/features" style={{ textDecoration: 'none', color: '#111827', fontWeight: 600, fontSize: '18px' }}>Features</Link>
          <Link to="/tour" style={{ textDecoration: 'none', color: '#111827', fontWeight: 600, fontSize: '18px' }}>Take a Tour</Link>
          <Link to="/pricing" style={{ textDecoration: 'none', color: '#111827', fontWeight: 600, fontSize: '18px' }}>Pricing</Link>
          <Link to="/contact" style={{ textDecoration: 'none', color: '#111827', fontWeight: 600, fontSize: '18px' }}>Contact</Link>
          <div style={{ height: '1px', background: '#e5e7eb', margin: '4px 0' }}></div>
          <Link to="/login" style={{ textDecoration: 'none', color: '#4b5563', fontWeight: 600, fontSize: '18px' }}>Log in to account</Link>
        </div>
      )}

      <main style={{ flex: 1, paddingTop: '73px' }}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer style={{ background: '#111827', color: '#9ca3af', padding: '60px 24px 30px', marginTop: 'auto' }}>
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
