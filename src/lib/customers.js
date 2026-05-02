import { supabase } from './supabase'
import bcrypt from 'bcryptjs'

// ─── Customer auth (phone OTP + PIN) ───────────────────────────

const PHONE_REGEX = /^\+?[1-9]\d{6,14}$/

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

// Send OTP via Supabase Auth (uses underlying SMS provider configured in Supabase)
export async function sendPhoneOtp(phone) {
  const normalized = normalizePhone(phone)
  if (!normalized || !isValidPhone(normalized)) {
    throw new Error('Invalid phone number')
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

// ─── PIN management (bcrypt-hashed, stored on customer row) ────

export async function setPin(pin) {
  if (!/^\d{4,6}$/.test(pin)) throw new Error('PIN must be 4 to 6 digits')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const hash = await bcrypt.hash(pin, 10)
  const { error } = await supabase
    .from('customers')
    .update({ pin_hash: hash, pin_set_at: new Date().toISOString() })
    .eq('auth_user_id', user.id)
  if (error) throw error
}

export async function verifyPin(pin) {
  const profile = await getMyCustomerProfile()
  if (!profile?.pin_hash) return false
  return bcrypt.compare(pin, profile.pin_hash)
}

export async function hasPin() {
  const profile = await getMyCustomerProfile()
  return !!profile?.pin_hash
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
