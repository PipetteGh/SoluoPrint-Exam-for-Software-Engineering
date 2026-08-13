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

  async function fetchMessages() {
    try {
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
            sender_name: customer.companies?.name || 'Shop Support',
            message: `Hello ${customer.name.split(' ')[0]}! Welcome to ${customer.companies?.name || 'our'} customer support. How can we assist you with your print orders today?`,
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
    if (!input.trim() || loading) return

    const messageText = input.trim()
    setInput('')

    const tempMsg = {
      id: 'temp-' + Date.now(),
      company_id: customer.company_id,
      customer_id: customer.id,
      sender_type: 'customer',
      sender_name: customer.name,
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
        sender_name: customer.name,
        message: messageText,
        created_at: new Date().toISOString()
      })

      // Also create notification for shop staff
      await supabase.from('notifications').insert({
        company_id: customer.company_id,
        title: 'New Customer Support Message',
        message: `${customer.name}: "${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}"`,
        type: 'support_message'
      })
    } catch (err) {
      console.error('Send message error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000 }}>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            backgroundColor: 'var(--primary, #2563eb)',
            color: 'white',
            border: 'none',
            borderRadius: '50px',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.5)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <MessageSquare size={20} />
          <span>Live Support</span>
        </button>
      )}

      {/* Chat Modal Panel */}
      {isOpen && (
        <div
          style={{
            width: '380px',
            height: '520px',
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid var(--border, #e2e8f0)'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: '#2563eb',
              color: 'white',
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center'
                }}
              >
                <ShieldCheck size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px', lineHeight: 1.2 }}>
                  {customer.companies?.name || 'Print Shop'} Support
                </div>
                <div style={{ fontSize: '11px', opacity: 0.85 }}>● Online - Real-time assistance</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Body */}
          <div
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backgroundColor: '#f8fafc'
            }}
          >
            {messages.map((m, idx) => {
              const isMe = m.sender_type === 'customer'
              return (
                <div
                  key={m.id || idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMe ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', padding: '0 4px' }}>
                    {isMe ? 'You' : m.sender_name} • {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div
                    style={{
                      maxWidth: '82%',
                      padding: '10px 14px',
                      borderRadius: isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                      backgroundColor: isMe ? '#2563eb' : 'white',
                      color: isMe ? 'white' : '#1e293b',
                      fontSize: '13px',
                      lineHeight: '1.4',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      wordBreak: 'break-word'
                    }}
                  >
                    {m.message}
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={handleSend}
            style={{
              padding: '12px 16px',
              backgroundColor: 'white',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              gap: '8px'
            }}
          >
            <input
              type="text"
              className="form-control"
              placeholder="Type your message..."
              value={input}
              onChange={e => setInput(e.target.value)}
              style={{
                flex: 1,
                height: '40px',
                borderRadius: '20px',
                paddingLeft: '16px',
                fontSize: '13px'
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justify: 'center',
                cursor: 'pointer',
                opacity: !input.trim() ? 0.5 : 1
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
