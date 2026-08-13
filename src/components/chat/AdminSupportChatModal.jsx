import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { MessageSquare, Send, X, User, Search, RefreshCw } from 'lucide-react'

export default function AdminSupportChatModal({ companyId, onClose }) {
  const [conversations, setConversations] = useState([])
  const [activeCustomer, setActiveCustomer] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (!companyId) return
    loadConversations()

    // Real-time listener for incoming customer support messages
    const channel = supabase
      .channel(`admin_support:${companyId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `company_id=eq.${companyId}` },
        (payload) => {
          const newMsg = payload.new
          if (activeCustomer && newMsg.customer_id === activeCustomer.id) {
            setMessages(prev => [...prev, newMsg])
          }
          loadConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [companyId, activeCustomer?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadConversations() {
    try {
      const { data } = await supabase
        .from('support_messages')
        .select('*, customers(id, name, phone, email, balance)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (data) {
        // Group by customer_id
        const map = new Map()
        data.forEach(m => {
          const custId = m.customer_id
          if (!map.has(custId)) {
            map.set(custId, {
              customer: m.customers || { id: custId, name: m.sender_name || 'Customer' },
              lastMessage: m
            })
          }
        })
        const list = Array.from(map.values())
        setConversations(list)

        if (!activeCustomer && list.length > 0) {
          selectCustomer(list[0].customer)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function selectCustomer(customer) {
    setActiveCustomer(customer)
    try {
      const { data } = await supabase
        .from('support_messages')
        .select('*')
        .eq('company_id', companyId)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: true })

      setMessages(data || [])
    } catch (e) {
      console.error(e)
    }
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!input.trim() || !activeCustomer) return

    const messageText = input.trim()
    setInput('')

    const tempMsg = {
      id: 'temp-' + Date.now(),
      company_id: companyId,
      customer_id: activeCustomer.id,
      sender_type: 'staff',
      sender_name: 'Shop Support',
      message: messageText,
      created_at: new Date().toISOString()
    }

    setMessages(prev => [...prev, tempMsg])

    try {
      await supabase.from('support_messages').insert({
        company_id: companyId,
        customer_id: activeCustomer.id,
        sender_type: 'staff',
        sender_name: 'Shop Support',
        message: messageText,
        created_at: new Date().toISOString()
      })
    } catch (err) {
      console.error('Send staff message error:', err)
    }
  }

  const filteredConversations = conversations.filter(c => 
    c.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.lastMessage?.message?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal modal-lg" style={{ width: '900px', height: '620px', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div className="modal-header" style={{ padding: '16px 24px', background: '#1e293b', color: 'white', borderBottom: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MessageSquare size={20} color="#3b82f6" />
            <h2 className="modal-title" style={{ color: 'white', margin: 0, fontSize: '18px' }}>Customer Support Center & Live Chat</h2>
          </div>
          <button className="btn-close" onClick={onClose} style={{ color: 'white' }}><X size={20} /></button>
        </div>

        {/* Body Split View */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* Left Sidebar: Conversations list */}
          <div style={{ width: '320px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Search customer chats..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: '32px', height: '36px', fontSize: '13px' }}
                />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>Loading chats...</div>
              ) : filteredConversations.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>No customer messages yet.</div>
              ) : (
                filteredConversations.map((item) => {
                  const isSelected = activeCustomer?.id === item.customer.id
                  return (
                    <div
                      key={item.customer.id}
                      onClick={() => selectCustomer(item.customer)}
                      style={{
                        padding: '14px 16px',
                        borderBottom: '1px solid #e2e8f0',
                        cursor: 'pointer',
                        background: isSelected ? '#eff6ff' : 'white',
                        borderLeft: isSelected ? '4px solid #2563eb' : '4px solid transparent',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>{item.customer.name}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {new Date(item.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.lastMessage.sender_type === 'staff' ? 'You: ' : ''}{item.lastMessage.message}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right Area: Active Chat Area */}
          {activeCustomer ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white' }}>
              {/* Active Customer Top Bar */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b' }}>{activeCustomer.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Phone: {activeCustomer.phone || 'N/A'} {activeCustomer.email ? `| Email: ${activeCustomer.email}` : ''}
                  </div>
                </div>
                {activeCustomer.balance !== undefined && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Balance Owed</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: Number(activeCustomer.balance) > 0 ? '#ef4444' : '#10b981' }}>
                      ¢{Number(activeCustomer.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Thread */}
              <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc' }}>
                {messages.map((m, idx) => {
                  const isStaff = m.sender_type === 'staff'
                  return (
                    <div key={m.id || idx} style={{ display: 'flex', flexDirection: 'column', alignItems: isStaff ? 'flex-end' : 'flex-start' }}>
                      <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '3px', padding: '0 4px' }}>
                        {isStaff ? 'Staff Support' : m.sender_name} • {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div
                        style={{
                          maxWidth: '75%',
                          padding: '10px 14px',
                          borderRadius: isStaff ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                          backgroundColor: isStaff ? '#1e293b' : '#ffffff',
                          color: isStaff ? 'white' : '#1e293b',
                          fontSize: '13px',
                          lineHeight: '1.4',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                          border: isStaff ? 'none' : '1px solid #e2e8f0'
                        }}
                      >
                        {m.message}
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSend} style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px' }}>
                <input 
                  type="text"
                  className="form-control"
                  placeholder={`Reply to ${activeCustomer.name}...`}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  style={{ flex: 1, height: '42px', borderRadius: '21px', paddingLeft: '18px', fontSize: '13.5px' }}
                />
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={!input.trim()}
                  style={{ borderRadius: '21px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Send size={15} /> Send Reply
                </button>
              </form>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Select a customer to start live support chat
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
