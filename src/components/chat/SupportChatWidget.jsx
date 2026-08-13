import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { MessageSquare, Send, X, User, ShieldCheck } from 'lucide-react'

export default function SupportChatWidget({ customer }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (!customer?.id) return

    fetchMessages()

    // Real-time subscription to support messages
    const channel = supabase
      .channel(`support_chat:${customer.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `customer_id=eq.${customer.id}` },
        (payload) => {
          setMessages(prev => [...prev, payload.new])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [customer?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isOpen])

  if (!customer) return null

  async function fetchMessages() {
    try {
      if (!customer?.id) return
      const { data } = await supabase
        .from('support_messages')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: true })

      if (data && data.length > 0) {
        setMessages(data)
      } else {
        // Default initial welcome message if no history
        setMessages([
          {
            id: 'welcome',
            sender_type: 'staff',
            sender_name: customer?.companies?.name || 'Shop Support',
            message: `Hello ${customer?.name?.split(' ')[0] || 'there'}! Welcome to ${customer?.companies?.name || 'our'} customer support. How can we assist you with your print orders today?`,
            created_at: new Date().toISOString()
          }
        ])
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!input.trim() || loading || !customer?.id) return

    const messageText = input.trim()
    setInput('')

    const tempMsg = {
      id: 'temp-' + Date.now(),
      company_id: customer?.company_id,
      customer_id: customer.id,
      sender_type: 'customer',
      sender_name: customer.name || 'Customer',
      message: messageText,
      created_at: new Date().toISOString()
    }

    setMessages(prev => [...prev, tempMsg])

    try {
      setLoading(true)
      await supabase.from('support_messages').insert({
        company_id: customer.company_id,
        customer_id: customer.id,
        sender_type: 'customer',
        sender_name: customer.name || 'Customer',
        message: messageText,
        created_at: new Date().toISOString()
      })

      // Also create notification for shop staff
      if (customer.company_id) {
        await supabase.from('notifications').insert({
          company_id: customer.company_id,
          title: 'New Customer Support Message',
          message: `${customer.name}: "${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}"`,
          type: 'support_message'
        })
      }
    } catch (err) {
      console.error('Send message error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000 }}>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: 'white',
            border: 'none',
            borderRadius: '50px',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.4)',
            transition: 'all 0.2s ease'
          }}
        >
          <MessageSquare size={18} />
          <span>Need Help?</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            width: '360px',
            maxWidth: 'calc(100vw - 32px)',
            height: '480px',
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px',
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={20} color="white" />
                </div>
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', backgroundColor: '#10b981', borderRadius: '50%', border: '2px solid #1e293b' }} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{customer?.companies?.name || 'Support Chat'}</h4>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Live Shop Staff Support</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Container */}
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((msg, i) => {
              const isCustomer = msg.sender_type === 'customer'
              return (
                <div
                  key={msg.id || i}
                  style={{
                    alignSelf: isCustomer ? 'flex-end' : 'flex-start',
                    maxWidth: '82%'
                  }}
                >
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: isCustomer ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                      backgroundColor: isCustomer ? '#2563eb' : 'white',
                      color: isCustomer ? 'white' : '#1e293b',
                      fontSize: '13px',
                      boxShadow: isCustomer ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
                      border: isCustomer ? 'none' : '1px solid var(--border)'
                    }}
                  >
                    {!isCustomer && (
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#2563eb', marginBottom: '2px' }}>
                        {msg.sender_name || 'Shop Support'}
                      </div>
                    )}
                    <div>{msg.message}</div>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', textAlign: isCustomer ? 'right' : 'left' }}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <form onSubmit={handleSend} style={{ padding: '12px', borderTop: '1px solid var(--border)', backgroundColor: 'white', display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              style={{
                flex: 1,
                border: '1px solid var(--border)',
                borderRadius: '20px',
                padding: '8px 16px',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              style={{
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
                opacity: !input.trim() || loading ? 0.6 : 1
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
