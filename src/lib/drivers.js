import { supabase } from './supabase'
import { normalizePhone, isValidPhone } from './customers'

// ─── Driver auth (phone OTP, same flow as customers) ───────────

export async function sendDriverOtp(phone) {
  const normalized = normalizePhone(phone)
  if (!isValidPhone(normalized)) throw new Error('Invalid phone number')
  const { error } = await supabase.auth.signInWithOtp({
    phone: normalized,
    options: { channel: 'sms' },
  })
  if (error) throw error
  return normalized
}

export async function verifyDriverOtp(phone, code) {
  const normalized = normalizePhone(phone)
  const { data, error } = await supabase.auth.verifyOtp({
    phone: normalized,
    token: code,
    type: 'sms',
  })
  if (error) throw error
  return data
}

// Create driver profile (called once after OTP verification, before KYC)
export async function createDriverProfile(profile) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const phone = user.phone ? `+${user.phone}` : profile.phone
  const payload = {
    auth_user_id: user.id,
    phone,
    full_name: profile.full_name,
    email: profile.email || null,
    national_id: profile.national_id || null,
    date_of_birth: profile.date_of_birth || null,
    vehicle_type: profile.vehicle_type || 'car',
    vehicle_make: profile.vehicle_make || null,
    vehicle_model: profile.vehicle_model || null,
    vehicle_plate: profile.vehicle_plate || null,
    vehicle_color: profile.vehicle_color || null,
    vehicle_year: profile.vehicle_year || null,
    kyc_status: 'pending',
  }
  const { data, error } = await supabase
    .from('drivers')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getMyDriverProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function updateMyDriverProfile(updates) {
  const profile = await getMyDriverProfile()
  if (!profile) throw new Error('Driver profile not found')
  const allowed = (({
    full_name, email, vehicle_type, vehicle_make, vehicle_model,
    vehicle_plate, vehicle_color, vehicle_year, national_id, date_of_birth,
  }) => ({
    full_name, email, vehicle_type, vehicle_make, vehicle_model,
    vehicle_plate, vehicle_color, vehicle_year, national_id, date_of_birth,
  }))(updates)
  const { data, error } = await supabase
    .from('drivers')
    .update(allowed)
    .eq('id', profile.id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── KYC documents ─────────────────────────────────────────────

export const REQUIRED_DOCS = [
  { key: 'selfie', label: 'Selfie photo' },
  { key: 'id_front', label: 'National ID — front' },
  { key: 'id_back', label: 'National ID — back' },
  { key: 'drivers_license', label: 'Driver\'s licence' },
  { key: 'vehicle_registration', label: 'Vehicle registration book' },
  { key: 'insurance', label: 'Insurance certificate' },
  { key: 'vehicle_photo_front', label: 'Vehicle — front' },
  { key: 'vehicle_photo_back', label: 'Vehicle — back (with plate)' },
  { key: 'proof_of_residence', label: 'Proof of residence' },
]

export async function uploadDriverDocument(driverId, docType, file) {
  if (!file) throw new Error('No file provided')
  if (!REQUIRED_DOCS.find(d => d.key === docType)) throw new Error('Invalid doc type')
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${driverId}/${docType}_${Date.now()}.${ext}`
  const { error: upErr } = await supabase
    .storage
    .from('driver-docs')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (upErr) throw upErr

  // Upsert document record
  const { data, error } = await supabase
    .from('driver_documents')
    .upsert({
      driver_id: driverId,
      doc_type: docType,
      file_path: path,
      status: 'pending',
      uploaded_at: new Date().toISOString(),
    }, { onConflict: 'driver_id,doc_type' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getMyDocuments() {
  const profile = await getMyDriverProfile()
  if (!profile) return []
  const { data, error } = await supabase
    .from('driver_documents')
    .select('*')
    .eq('driver_id', profile.id)
  if (error) throw error
  return data
}

export async function getSignedDocumentUrl(filePath) {
  const { data, error } = await supabase
    .storage
    .from('driver-docs')
    .createSignedUrl(filePath, 60 * 5) // 5 min
  if (error) throw error
  return data.signedUrl
}

// Submit KYC for review (only allowed when all required docs are uploaded)
export async function submitKycForReview() {
  const profile = await getMyDriverProfile()
  if (!profile) throw new Error('No driver profile')
  const docs = await getMyDocuments()
  const haveTypes = new Set(docs.map(d => d.doc_type))
  const missing = REQUIRED_DOCS.filter(r => !haveTypes.has(r.key))
  if (missing.length > 0) {
    throw new Error(`Missing documents: ${missing.map(m => m.label).join(', ')}`)
  }
  const { error } = await supabase
    .from('drivers')
    .update({ kyc_status: 'submitted' })
    .eq('id', profile.id)
  if (error) throw error
}

// ─── Online status + location ──────────────────────────────────

export async function setDriverOnline(isOnline) {
  const profile = await getMyDriverProfile()
  if (!profile) throw new Error('No driver profile')
  if (isOnline && profile.kyc_status !== 'approved') {
    throw new Error('Account not yet approved. Complete KYC first.')
  }
  const { error } = await supabase
    .from('drivers')
    .update({ is_online: isOnline })
    .eq('id', profile.id)
  if (error) throw error
}

export async function updateDriverLocation(lat, lng) {
  const profile = await getMyDriverProfile()
  if (!profile) return
  const { error } = await supabase
    .from('drivers')
    .update({
      current_lat: lat,
      current_lng: lng,
      last_location_update: new Date().toISOString(),
    })
    .eq('id', profile.id)
  if (error) throw error
}

// ─── Wallet ────────────────────────────────────────────────────

export async function getMyWallet() {
  const profile = await getMyDriverProfile()
  if (!profile) return null
  const { data, error } = await supabase
    .from('driver_wallets')
    .select('*')
    .eq('driver_id', profile.id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getWalletTransactions(limit = 50) {
  const profile = await getMyDriverProfile()
  if (!profile) return []
  const { data, error } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('driver_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

// Initiate a wallet top-up (creates a pending txn; payment confirmation completes it)
export async function initiateWalletTopup({ amount, paymentMethod, paymentReference }) {
  const profile = await getMyDriverProfile()
  if (!profile) throw new Error('No driver profile')
  if (!amount || amount <= 0) throw new Error('Amount must be positive')

  // Insert pending transaction; admin/webhook completes it
  const { data, error } = await supabase
    .from('wallet_transactions')
    .insert({
      driver_id: profile.id,
      kind: 'topup',
      amount_usd: amount,
      balance_after: 0, // not credited until completed
      reference_type: 'topup',
      payment_method: paymentMethod,
      payment_reference: paymentReference || null,
      status: 'pending',
      notes: `Top-up via ${paymentMethod}`,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// Live wallet subscription
export function subscribeToWallet(driverId, callback) {
  const channel = supabase
    .channel(`wallet:${driverId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'driver_wallets',
      filter: `driver_id=eq.${driverId}`,
    }, (payload) => callback(payload.new))
    .subscribe()
  return () => supabase.removeChannel(channel)
}

export async function driverLogout() {
  await supabase.auth.signOut()
}
