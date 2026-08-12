import { Phone, Mail, MapPin } from 'lucide-react'
import SEO from '../../components/ui/SEO'

export default function ContactPage() {
  return (
    <>
      <SEO 
        title="Contact Us - SoluoPrint" 
        description="Get in touch with the SoluoPrint team for support, sales, or any inquiries." 
      />
      <section style={{ background: 'white', padding: '80px 24px', minHeight: 'calc(100vh - 300px)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#111827', marginBottom: '16px' }}>Contact Us</h1>
          <p style={{ fontSize: '18px', color: '#6b7280', marginBottom: '60px' }}>Have questions? We'd love to hear from you.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '32px', textAlign: 'left' }}>
            <div style={{ padding: '32px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
              <Phone size={32} color="#2563eb" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>Call Us</h3>
              <p style={{ color: '#4b5563', fontSize: '16px' }}>+233 59 886 9170</p>
            </div>
            
            <div style={{ padding: '32px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
              <Mail size={32} color="#2563eb" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>Email Us</h3>
              <p style={{ color: '#4b5563', fontSize: '16px' }}>info@soluotech.com</p>
            </div>

            <div style={{ padding: '32px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
              <MapPin size={32} color="#2563eb" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>Office</h3>
              <p style={{ color: '#4b5563', fontSize: '16px' }}>Soluotech HQ</p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
