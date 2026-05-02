import { supabase } from './supabase'
import { getMyCustomerProfile } from './customers'
import { getMyDriverProfile } from './drivers'

// ─── Pricing ───────────────────────────────────────────────────

// Server-authoritative pricing via SQL function
export async function quoteDelivery({ city, pickup, dropoff }) {
  const { data, error } = await supabase.rpc('calculate_delivery_fee', {
    p_city: city || 'Harare',
    p_pickup_lat: pickup.lat,
    p_pickup_lng: pickup.lng,
    p_dropoff_lat: dropoff.lat,
    p_dropoff_lng: dropoff.lng,
  })
  if (error) throw error
  return data?.[0] || null
}

// ─── Find nearby drivers (for customer to see available drivers) ─

export async function findNearbyDrivers({ lat, lng, radiusKm = 10, limit = 20 }) {
  const { data, error } = await supabase.rpc('find_nearby_drivers', {
    p_lat: lat,
    p_lng: lng,
    p_radius_km: radiusKm,
    p_limit: limit,
  })
  if (error) throw error
  return data || []
}

// ─── Create a delivery (server-authoritative) ──────────────────
// Calls the SECURITY DEFINER RPC; client cannot tamper with pricing.

export async function createDelivery({
  orderId,
  pickup,           // { address, lat, lng }
  dropoff,          // { address, lat, lng }
}) {
  const { data, error } = await supabase.rpc('create_delivery_for_order', {
    p_order_id: orderId,
    p_pickup_lat: pickup.lat,
    p_pickup_lng: pickup.lng,
    p_pickup_address: pickup.address,
    p_dropoff_lat: dropoff.lat,
    p_dropoff_lng: dropoff.lng,
    p_dropoff_address: dropoff.address,
  })
  if (error) throw error
  return data?.[0] || null
}

// ─── Place an order (server-authoritative pricing) ─────────────
export async function placeOrder({
  restaurantId,
  items,           // [{ item_id, quantity, notes }]
  orderType,
  paymentMethod,
  scheduledFor = null,
  customerNotes = null,
}) {
  const { data, error } = await supabase.rpc('place_order', {
    p_restaurant_id: restaurantId,
    p_items: items,
    p_order_type: orderType,
    p_payment_method: paymentMethod,
    p_scheduled_for: scheduledFor,
    p_customer_notes: customerNotes,
  })
  if (error) throw error
  return data?.[0] || null
}

export async function getDelivery(deliveryId) {
  const { data, error } = await supabase
    .from('deliveries')
    .select('*, drivers(id, full_name, phone, vehicle_type, vehicle_plate, rating, current_lat, current_lng)')
    .eq('id', deliveryId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getMyDeliveries(limit = 50) {
  const customer = await getMyCustomerProfile()
  if (!customer) return []
  const { data, error } = await supabase
    .from('deliveries')
    .select('*, drivers(full_name, vehicle_plate, rating)')
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

// ─── Dispatch offers ───────────────────────────────────────────

// Driver: list pending deliveries near their location (anonymized via RPC)
// Returns: { id, restaurant_id, restaurant_name, restaurant_logo, pickup_*, distance_km, fees }
// Dropoff is rounded to ~1km grid until offer is accepted.
export async function getOpenDeliveries({ lat, lng, radiusKm = 15 } = {}) {
  if (lat == null || lng == null) return []
  const { data, error } = await supabase.rpc('get_open_deliveries_near_me', {
    p_lat: lat,
    p_lng: lng,
    p_radius_km: radiusKm,
    p_limit: 30,
  })
  if (error) throw error
  // Map to legacy shape for the existing UI
  return (data || []).map(d => ({
    id: d.id,
    restaurant_id: d.restaurant_id,
    restaurants: { name: d.restaurant_name, logo_url: d.restaurant_logo },
    pickup_lat: d.pickup_lat,
    pickup_lng: d.pickup_lng,
    pickup_address: d.pickup_address,
    dropoff_lat: d.dropoff_lat_approx,
    dropoff_lng: d.dropoff_lng_approx,
    dropoff_address: '~ ' + Number(d.dropoff_lat_approx).toFixed(2) + ', ' + Number(d.dropoff_lng_approx).toFixed(2),
    distance_km: d.distance_km,
    distance_to_pickup_km: d.distance_km,
    total_fee_usd: d.total_fee_usd,
    driver_earnings_usd: d.driver_earnings_usd,
    platform_commission_usd: d.platform_commission_usd,
    created_at: d.created_at,
  }))
}

// Driver: make an offer on a delivery
export async function makeOffer({ deliveryId, offerAmountUsd, etaMinutes }) {
  const driver = await getMyDriverProfile()
  if (!driver) throw new Error('Not a driver')
  if (driver.kyc_status !== 'approved') throw new Error('KYC not approved')
  if (!driver.is_online) throw new Error('Go online first')
  const expires = new Date(Date.now() + 60 * 1000).toISOString() // 60s validity
  const payload = {
    delivery_id: deliveryId,
    driver_id: driver.id,
    offer_amount_usd: offerAmountUsd,
    est_arrival_min: etaMinutes,
    status: 'open',
    expires_at: expires,
  }
  const { data, error } = await supabase
    .from('dispatch_offers')
    .upsert(payload, { onConflict: 'delivery_id,driver_id' })
    .select()
    .single()
  if (error) throw error
  return data
}

// Customer: list open offers for their delivery
export async function getOffersForDelivery(deliveryId) {
  const { data, error } = await supabase
    .from('dispatch_offers')
    .select('*, drivers(id, full_name, vehicle_type, vehicle_plate, rating, total_deliveries, current_lat, current_lng)')
    .eq('delivery_id', deliveryId)
    .eq('status', 'open')
    .order('offer_amount_usd', { ascending: true })
  if (error) throw error
  return data
}

// Customer: accept an offer (assigns driver, charges commission via SQL)
export async function acceptOffer({ offerId, driverId }) {
  const { data, error } = await supabase.rpc('accept_delivery_offer', {
    p_offer_id: offerId,
    p_driver_id: driverId,
  })
  if (error) throw error
  return data?.[0] || { success: false }
}

// ─── Lifecycle transitions (server-authoritative state machine) ─

async function advance(deliveryId, target) {
  const { data, error } = await supabase.rpc('driver_advance_delivery', {
    p_delivery_id: deliveryId,
    p_target_status: target,
  })
  if (error) throw error
  const result = data?.[0]
  if (!result?.success) throw new Error(result?.error || 'Transition failed')
  return result
}

export const markPickedUp  = (id) => advance(id, 'picked_up')
export const markInTransit = (id) => advance(id, 'in_transit')
export const markArrived   = (id) => advance(id, 'arrived')

export async function markDelivered(deliveryId) {
  const driver = await getMyDriverProfile()
  if (!driver) throw new Error('Not a driver')
  const { data, error } = await supabase.rpc('complete_delivery', {
    p_delivery_id: deliveryId,
    p_driver_id: driver.id,
  })
  if (error) throw error
  return data?.[0] || { success: false }
}

export async function cancelDelivery({ deliveryId, reason }) {
  const { data, error } = await supabase.rpc('cancel_delivery', {
    p_delivery_id: deliveryId,
    p_reason: reason || null,
  })
  if (error) throw error
  return data?.[0] || { success: false }
}

// ─── Active deliveries (for restaurant admin dashboard) ────────

export async function getRestaurantDeliveries(restaurantId, { activeOnly = false } = {}) {
  let query = supabase
    .from('deliveries')
    .select('*, drivers(full_name, phone, vehicle_plate)')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (activeOnly) {
    query = query.in('status', ['pending', 'awaiting_pickup', 'picked_up', 'in_transit', 'arrived'])
  }
  const { data, error } = await query
  if (error) throw error
  return data
}

// ─── Realtime ──────────────────────────────────────────────────

export function subscribeToDelivery(deliveryId, callback) {
  const channel = supabase
    .channel(`delivery:${deliveryId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'deliveries',
      filter: `id=eq.${deliveryId}`,
    }, (payload) => callback(payload.new || payload.old))
    .subscribe()
  return () => supabase.removeChannel(channel)
}

export function subscribeToOffersForDelivery(deliveryId, callback) {
  const channel = supabase
    .channel(`offers:${deliveryId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'dispatch_offers',
      filter: `delivery_id=eq.${deliveryId}`,
    }, () => {
      // Refetch all open offers on any change for simplicity
      getOffersForDelivery(deliveryId).then(callback).catch(() => {})
    })
    .subscribe()
  return () => supabase.removeChannel(channel)
}

export function subscribeToOpenDeliveries(callback) {
  const channel = supabase
    .channel('deliveries:pending')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'deliveries',
      filter: 'status=eq.pending',
    }, callback)
    .subscribe()
  return () => supabase.removeChannel(channel)
}

// ─── Utility: haversine distance (client-side) ────────────────

export function haversineKm(lat1, lng1, lat2, lng2) {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return Math.round(R * 2 * Math.asin(Math.sqrt(a)) * 100) / 100
}
