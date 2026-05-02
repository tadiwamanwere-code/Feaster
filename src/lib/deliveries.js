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

// ─── Create a delivery (customer side) ─────────────────────────

export async function createDelivery({
  orderId,
  restaurantId,
  pickup,           // { address, lat, lng }
  dropoff,          // { address, lat, lng }
  city = 'Harare',
}) {
  const customer = await getMyCustomerProfile()
  if (!customer) throw new Error('Not authenticated')
  const quote = await quoteDelivery({ city, pickup, dropoff })
  if (!quote) throw new Error('Could not calculate delivery fee')

  const payload = {
    order_id: orderId,
    customer_id: customer.id,
    restaurant_id: restaurantId,
    pickup_address: pickup.address,
    pickup_lat: pickup.lat,
    pickup_lng: pickup.lng,
    dropoff_address: dropoff.address,
    dropoff_lat: dropoff.lat,
    dropoff_lng: dropoff.lng,
    distance_km: quote.distance_km,
    base_fee_usd: quote.base_fee,
    per_km_fee_usd: quote.per_km_fee,
    surge_multiplier: quote.surge,
    total_fee_usd: quote.total,
    driver_earnings_usd: quote.driver_earnings,
    platform_commission_usd: quote.platform_commission,
    status: 'pending',
  }
  const { data, error } = await supabase
    .from('deliveries')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
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

// Driver: list pending deliveries near their location
export async function getOpenDeliveries({ lat, lng, radiusKm = 15 } = {}) {
  let query = supabase
    .from('deliveries')
    .select('*, restaurants(name, logo_url)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50)
  const { data, error } = await query
  if (error) throw error
  if (!data) return []
  // Filter by distance client-side if location known
  if (lat != null && lng != null) {
    return data
      .map(d => ({
        ...d,
        distance_to_pickup_km: haversineKm(lat, lng, d.pickup_lat, d.pickup_lng),
      }))
      .filter(d => d.distance_to_pickup_km <= radiusKm)
      .sort((a, b) => a.distance_to_pickup_km - b.distance_to_pickup_km)
  }
  return data
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

// ─── Lifecycle transitions (driver) ────────────────────────────

export async function markPickedUp(deliveryId) {
  const driver = await getMyDriverProfile()
  if (!driver) throw new Error('Not a driver')
  const { error } = await supabase
    .from('deliveries')
    .update({ status: 'picked_up', picked_up_at: new Date().toISOString() })
    .eq('id', deliveryId)
    .eq('driver_id', driver.id)
  if (error) throw error
}

export async function markInTransit(deliveryId) {
  const driver = await getMyDriverProfile()
  if (!driver) throw new Error('Not a driver')
  const { error } = await supabase
    .from('deliveries')
    .update({ status: 'in_transit' })
    .eq('id', deliveryId)
    .eq('driver_id', driver.id)
  if (error) throw error
}

export async function markArrived(deliveryId) {
  const driver = await getMyDriverProfile()
  if (!driver) throw new Error('Not a driver')
  const { error } = await supabase
    .from('deliveries')
    .update({ status: 'arrived' })
    .eq('id', deliveryId)
    .eq('driver_id', driver.id)
  if (error) throw error
}

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
  const { error } = await supabase
    .from('deliveries')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason || null,
    })
    .eq('id', deliveryId)
  if (error) throw error
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
