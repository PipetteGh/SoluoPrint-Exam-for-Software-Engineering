import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)

  // Use a ref to prevent concurrent fetches 
  const fetchLock = useRef(false)

  useEffect(() => {
    let mounted = true

    async function initializeSession() {
      try {
        const savedUserId = localStorage.getItem('printdesk_user_id')
        
        if (savedUserId && mounted) {
          await fetchProfileAndCompany(savedUserId).catch(console.error)
        } else {
          setLoading(false)
        }
      } catch (err) {
        console.error("Initialization error:", err)
        if (mounted) setLoading(false)
      }
    }

    initializeSession()

    return () => {
      mounted = false
    }
  }, [])

  async function fetchProfileAndCompany(userId) {
    if (fetchLock.current) return
    fetchLock.current = true

    try {
      // Small delay on first load to allow Supabase auth token locks to settle
      await new Promise(r => setTimeout(r, 100))

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
        
      if (profileError) {
        if (profileError.code !== 'PGRST116') console.error("Profile fetch error:", profileError)
        setProfile(null)
        setCompany(null)
        return
      }

      let permissions = {}
      if (profileData?.role) {
        const { data: roleData } = await supabase
          .from('roles')
          .select('*')
          .eq('company_id', profileData.company_id)
          .eq('name', profileData.role)
          .single()
        
        if (roleData) {
          permissions = roleData.permissions || {}
        }
      }

      // Set profile with permissions in one go
      setProfile({ ...profileData, permissions })

      if (profileData?.company_id) {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profileData.company_id)
          .single()
          
        if (companyError) {
          console.error("Company fetch error:", companyError)
        }
        setCompany(companyData || null)
      } else {
        setCompany(null)
      }
    } catch (err) {
      console.error('Error fetching profile/company:', err)
    } finally {
      fetchLock.current = false
      setLoading(false)
    }
  }

  async function signIn(email, password) {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      return { error: { message: authError?.message || 'Invalid email or password' } }
    }

    localStorage.setItem('printdesk_user_id', authData.user.id)
    await fetchProfileAndCompany(authData.user.id)
    
    if (fetchLock.current) {
        // Wait briefly if it's still fetching
        await new Promise(r => setTimeout(r, 500))
    }
    return { data: authData.user, error: null }
  }

  async function signUp(email, password, fullName, companyName, phone) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    })

    if (data.user && !error) {
      // Small delay to ensure the trigger has created the profile row
      await new Promise(r => setTimeout(r, 1000))

      // Create company
      const { data: comp } = await supabase
        .from('companies')
        .insert({ name: companyName, phone: phone || null, currency: 'GHS', currency_symbol: '¢', timezone: 'Africa/Accra' })
        .select()
        .single()

      if (comp) {
        // Update profile with company
        await supabase
          .from('profiles')
          .update({ company_id: comp.id, full_name: fullName, phone: phone || null, role: 'owner', is_active: true })
          .eq('id', data.user.id)

        // Seed default data in parallel
        await Promise.all([
          supabase.from('customer_types').insert([
            { company_id: comp.id, name: 'Consumer/Individual', description: 'Walk in customers, personal projects, small quantities, standard pricing' },
            { company_id: comp.id, name: 'Reseller/Artist', description: 'Designers, agencies, print brokers with wholesale rates and trade accounts' },
            { company_id: comp.id, name: 'Corporate/Institution', description: 'Businesses, schools, nonprofits requiring invoicing and bulk orders' }
          ]),
          supabase.from('service_categories').insert([
            { company_id: comp.id, name: 'Large Format', description: 'Banners, posters, signs, and wide-format printing services', form_type: 'large_format', keeps_decimals: true },
            { company_id: comp.id, name: 'Press/Secretarial', description: 'Document printing, copying, binding, and office services', form_type: 'simple', keeps_decimals: true },
            { company_id: comp.id, name: 'Design', description: 'Graphic design, layout services, and creative work', form_type: 'simple', keeps_decimals: true },
            { company_id: comp.id, name: 'Embroidery', description: 'Custom embroidery and textile decoration services', form_type: 'simple', keeps_decimals: true },
            { company_id: comp.id, name: 'Photography', description: 'Photo printing, restoration, and photography services', form_type: 'simple', keeps_decimals: true },
            { company_id: comp.id, name: 'Outsourced Services', description: 'External services and third-party vendor work coordination', form_type: 'outsourced', keeps_decimals: true }
          ]),
          supabase.from('payment_accounts').insert([
            { company_id: comp.id, name: 'Cash', account_type: 'cash' },
            { company_id: comp.id, name: 'Mobile Money', account_type: 'mobile_money' },
            { company_id: comp.id, name: 'Bank Transfer', account_type: 'bank' }
          ]),
          supabase.from('expense_accounts').insert([
            { company_id: comp.id, name: 'Printing Materials', type: 'direct', is_active: true },
            { company_id: comp.id, name: 'Office Supplies', type: 'indirect', is_active: true }
          ]),
          supabase.from('sms_settings').insert({
            company_id: comp.id,
            payment_received: false,
            payment_reminder: false,
            job_completed: false,
            job_overdue: false,
            customer_welcome: true,
            job_created: true
          }),
          supabase.from('services').insert([
            { company_id: comp.id, name: 'Banner Printing', unit_price: 15.00, unit: 'sqft', is_active: true },
            { company_id: comp.id, name: 'Flex Banner', unit_price: 12.00, unit: 'sqft', is_active: true },
            { company_id: comp.id, name: 'Canvas Print', unit_price: 20.00, unit: 'sqft', is_active: true },
            { company_id: comp.id, name: 'Business Cards', unit_price: 0.50, unit: 'piece', is_active: true },
          ])
        ])

        // Send Welcome Email and SMS
        try {
          const { sendEmail } = await import('../lib/email')
          await sendEmail(
            email, 
            'Welcome to SoluoPrint!', 
            `<p>Hello ${fullName},</p><p>Welcome to SoluoPrint! Your company profile for <b>${companyName}</b> has been successfully created.</p><p>Please verify your email to get started.</p>`,
            'SoluoPrint'
          )
          
          if (phone) {
            const { sendSms } = await import('../lib/sms')
            await sendSms(phone, `Hello ${fullName}, Welcome to SoluoPrint! Your profile for ${companyName} has been created. Please verify your email to log in.`)
          }
        } catch (e) {
          console.error("Failed to send welcome notifications", e)
        }
      }
    }

    return { data, error }
  }

  async function signOut() {
    setProfile(null)
    setCompany(null)
    localStorage.removeItem('printdesk_user_id')
  }

  async function refreshCompany() {
    if (!profile?.company_id) return
    const { data } = await supabase
      .from('companies')
      .select('*')
      .eq('id', profile.company_id)
      .single()
    if (data) setCompany(data)
  }

  async function refreshProfile() {
    if (!user) return
    await fetchProfileAndCompany(user.id)
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      company,
      loading,
      signIn,
      signUp,
      signOut,
      refreshCompany,
      refreshProfile,
      fetchProfileAndCompany,
      hasPermission: (perm) => {
        if (!profile) return false
        if (profile.role === 'owner') return true
        if (profile.permissions?.all) return true
        return !!profile.permissions?.[perm]
      }
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
