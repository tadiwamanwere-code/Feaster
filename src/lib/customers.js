import { supabase } from './supabase'

// ─── Customer auth (phone OTP + 6-digit PIN) ───────────────────

const PHONE_REGEX = /^\+?[1-9]\d{6,14}$/

export const PIN_LENGTH = 6

export function normalizePhone(input) {
  if (!input) return null
  const trimmed = String(input).replace(/[\s\-()]/g, '')
  // Zim default: +263, accept 07x as 077... -> +2637...
  if (trimmed.startsWith('+')) return trimmed
  if (trimmed.startsWith('00')) return '+' + trimmed.slice(2)
  if (trimmed.startsWith('0')) return '+263' + trimmed.slice(1)
  if (/^\d+$/.test(trimmed)) return '+' + trimmed
  return null
}

export function isValidPhone(phone) {
  return PHONE_REGEX.test(phone || '')
}

// Send OTP via Supabase Auth — server-side rate-limited per phone.
export async function sendPhoneOtp(phone) {
  const normalized = normalizePhone(phone)
  if (!normalized || !isValidPhone(normalized)) {
    throw new Error('Invalid phone number')
  }
  // Server-side rate limit: 5 sends per phone per hour
  const { data: rl, error: rlErr } = await supabase.rpc('rate_limit_otp_send', { p_phone: normalized })
  if (rlErr) throw rlErr
  const limit = rl?.[0]
  if (limit && !limit.allowed) {
    const mins = Math.ceil((limit.retry_after_seconds || 60) / 60)
    throw new Error(`Too many OTP requests. Try again in ${mins} min.`)
  }
  const { error } = await supabase.auth.signInWithOtp({
    phone: normalized,
    options: { channel: 'sms' },
  })
  if (error) throw error
  return normalized
}

// Verify the SMS OTP code; on success returns auth session and ensures customer row exists
export async function verifyPhoneOtp(phone, code) {
  const normalized = normalizePhone(phone)
  const { data, error } = await supabase.auth.verifyOtp({
    phone: normalized,
    token: code,
    type: 'sms',
  })
  if (error) throw error
  // Ensure customer row exists
  await ensureCustomerProfile(data.user.id, normalized)
  return data
}

async function ensureCustomerProfile(authUserId, phone) {
  const { data: existing } = await supabase
    .from('customers')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle()
  if (existing) return existing
  const { data: created, error } = await supabase
    .from('customers')
    .insert({ auth_user_id: authUserId, phone, is_verified: true })
    .select()
    .single()
  if (error) throw error
  return created
}

export async function getMyCustomerProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function updateMyCustomerProfile(updates) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const allowed = (({ full_name, email }) => ({ full_name, email }))(updates)
  const { data, error } = await supabase
    .from('customers')
    .update(allowed)
    .eq('auth_user_id', user.id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── PIN management (server-side bcrypt + rate-limited verify) ─

export async function setPin(pin) {
  if (!/^\d{6}$/.test(pin)) throw new Error('PIN must be exactly 6 digits')
  const { data, error } = await supabase.rpc('set_customer_pin', { p_pin: pin })
  if (error) throw error
  const result = data?.[0]
  if (!result?.success) throw new Error(result?.error || 'Could not set PIN')
}

// Returns { success, error?, attemptsRemaining?, lockedUntil? }
export async function verifyPin(pin) {
  if (!/^\d{6}$/.test(pin || '')) return { success: false, error: 'PIN must be 6 digits' }
  const { data, error } = await supabase.rpc('verify_customer_pin', { p_pin: pin })
  if (error) return { success: false, error: error.message }
  const r = data?.[0] || {}
  return {
    success: !!r.success,
    error: r.error || null,
    attemptsRemaining: r.attempts_remaining ?? null,
    lockedUntil: r.locked_until || null,
  }
}

export async function hasPin() {
  const { data, error } = await supabase.rpc('customer_has_pin')
  if (error) return false
  return !!data
}

// ─── Customer addresses ────────────────────────────────────────

export async function getMyAddresses() {
  const profile = await getMyCustomerProfile()
  if (!profile) return []
  const { data, error } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('customer_id', profile.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addAddress(addr) {
  const profile = await getMyCustomerProfile()
  if (!profile) throw new Error('Not authenticated')
  const payload = {
    customer_id: profile.id,
    label: addr.label || 'Home',
    line1: addr.line1,
    line2: addr.line2 || null,
    city: addr.city || 'Harare',
    suburb: addr.suburb || null,
    latitude: addr.latitude,
    longitude: addr.longitude,
    notes: addr.notes || null,
    is_default: !!addr.is_default,
  }
  if (payload.is_default) {
    // unset existing defaults
    await supabase
      .from('customer_addresses')
      .update({ is_default: false })
      .eq('customer_id', profile.id)
  }
  const { data, error } = await supabase
    .from('customer_addresses')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  if (payload.is_default) {
    await supabase
      .from('customers')
      .update({ default_address_id: data.id })
      .eq('id', profile.id)
  }
  return data
}

export async function deleteAddress(addressId) {
  const { error } = await supabase
    .from('customer_addresses')
    .delete()
    .eq('id', addressId)
  if (error) throw error
}

export async function setDefaultAddress(addressId) {
  const profile = await getMyCustomerProfile()
  if (!profile) throw new Error('Not authenticated')
  await supabase
    .from('customer_addresses')
    .update({ is_default: false })
    .eq('customer_id', profile.id)
  await supabase
    .from('customer_addresses')
    .update({ is_default: true })
    .eq('id', addressId)
  await supabase
    .from('customers')
    .update({ default_address_id: addressId })
    .eq('id', profile.id)
}

export async function customerLogout() {
  await supabase.auth.signOut()
}
