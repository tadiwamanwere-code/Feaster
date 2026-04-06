import { supabase } from './supabase'

// ─── Data cache ───────────────────────────────────────────────
const _cache = new Map()
const CACHE_TTL = 30_000

function cacheGet(key) {
  const entry = _cache.get(key)
  if (!entry) return undefined
  if (Date.now() - entry.ts > CACHE_TTL) { _cache.delete(key); return undefined }
  return entry.data
}

function cacheSet(key, data) {
  _cache.set(key, { data, ts: Date.now() })
}

export function invalidateCache(prefix) {
  for (const key of _cache.keys()) {
    if (key.startsWith(prefix)) _cache.delete(key)
  }
}

// ─── Restaurants ───────────────────────────────────────────────

export async function getRestaurants({ activeOnly = true } = {}) {
  const cacheKey = `restaurants:${activeOnly}`
  const cached = cacheGet(cacheKey)
  if (cached) return cached

  let query = supabase.from('restaurants').select('*')
  if (activeOnly) query = query.eq('is_active', true)
  const { data, error } = await query
  if (error) throw error
  cacheSet(cacheKey, data || [])
  return data || []
}

export async function getRestaurantBySlug(slug) {
  const cacheKey = `restaurant:${slug}`
  const cached = cacheGet(cacheKey)
  if (cached) return cached

  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  if (data) cacheSet(cacheKey, data)
  return data || null
}

export async function updateRestaurant(id, updates) {
  const { error } = await supabase
    .from('restaurants')
    .update(updates)
    .eq('id', id)
  if (error) throw error
  invalidateCache('restaurant')
}

// ─── Menu Items ────────────────────────────────────────────────

export async function getMenuItems(restaurantId) {
  const cacheKey = `menu:${restaurantId}`
  const cached = cacheGet(cacheKey)
  if (cached) return cached

  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('sort_order')
  if (error) throw error
  cacheSet(cacheKey, data || [])
  return data || []
}

export async function addMenuItem(item) {
  const { data, error } = await supabase
    .from('menu_items')
    .insert({ ...item, is_available: true, sort_order: 0 })
    .select()
    .single()
  if (error) throw error
  invalidateCache('menu')
  return data
}

export async function updateMenuItem(id, updates) {
  const { error } = await supabase
    .from('menu_items')
    .update(updates)
    .eq('id', id)
  if (error) throw error
  invalidateCache('menu')
}

export async function deleteMenuItem(id) {
  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', id)
  if (error) throw error
  invalidateCache('menu')
}

// ─── Tables ────────────────────────────────────────────────────

export async function getTables(restaurantId) {
  const cacheKey = `tables:${restaurantId}`
  const cached = cacheGet(cacheKey)
  if (cached) return cached

  const { data, error } = await supabase
    .from('tables')
    .select('*')
    .eq('restaurant_id', restaurantId)
  if (error) throw error
  cacheSet(cacheKey, data || [])
  return data || []
}

export async function addTable(item) {
  const { data, error } = await supabase
    .from('tables')
    .insert({ ...item, is_active: true })
    .select()
    .single()
  if (error) throw error
  invalidateCache('tables')
  return data
}

export async function deleteTable(id) {
  const { error } = await supabase
    .from('tables')
    .delete()
    .eq('id', id)
  if (error) throw error
  invalidateCache('tables')
}

export async function setupTables(restaurantId, tableCount) {
  const existing = await getTables(restaurantId)
  const existingNumbers = new Set(existing.map(t => t.table_number))

  const promises = []
  for (let i = 1; i <= tableCount; i++) {
    const num = String(i)
    if (!existingNumbers.has(num)) {
      promises.push(addTable({ table_number: num, restaurant_id: restaurantId }))
    }
  }

  for (const table of existing) {
    const n = parseInt(table.table_number, 10)
    if (!isNaN(n) && n > tableCount) {
      promises.push(deleteTable(table.id))
    }
  }

  await Promise.all(promises)
  invalidateCache('tables')
}

// ─── Orders ────────────────────────────────────────────────────

export async function createOrder(orderData) {
  const { data, error } = await supabase
    .from('orders')
    .insert({ ...orderData, status: 'pending' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getOrder(orderId) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()
  if (error) return null
  return data
}

export async function updateOrderStatus(orderId, status) {
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
  if (error) throw error
}

export function subscribeToOrder(orderId, callback) {
  // Fetch initial data
  getOrder(orderId).then(order => {
    if (order) callback(order)
  })

  // Subscribe to realtime changes
  const channel = supabase
    .channel(`order-${orderId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
      (payload) => {
        if (payload.new) callback(payload.new)
      }
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}

export function subscribeToKitchenOrders(restaurantId, callback) {
  // Fetch initial data
  ;(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .in('status', ['pending', 'confirmed', 'preparing', 'ready'])
      .order('created_at')
    if (data) callback(data)
  })()

  // Subscribe to realtime changes on all orders for this restaurant
  const channel = supabase
    .channel(`kitchen-${restaurantId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
      async () => {
        // Re-fetch active orders on any change
        const { data } = await supabase
          .from('orders')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .in('status', ['pending', 'confirmed', 'preparing', 'ready'])
          .order('created_at')
        if (data) callback(data)
      }
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}

export async function getOrdersByRestaurant(restaurantId) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

// ─── Platform Admin (restaurant CRUD) ──────────────────────────

export async function getRestaurantById(id) {
  const cacheKey = `restaurantById:${id}`
  const cached = cacheGet(cacheKey)
  if (cached) return cached

  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  cacheSet(cacheKey, data)
  return data
}

export async function isSlugAvailable(slug, excludeId = null) {
  const { data } = await supabase
    .from('restaurants')
    .select('id')
    .eq('slug', slug)
  if (!data || data.length === 0) return true
  if (excludeId && data.length === 1 && data[0].id === excludeId) return true
  return false
}

export async function addRestaurant(restaurantData) {
  const { data, error } = await supabase
    .from('restaurants')
    .insert({ ...restaurantData, is_active: true })
    .select()
    .single()
  if (error) throw error
  invalidateCache('restaurant')
  return data
}

export async function deleteRestaurant(id) {
  const { error } = await supabase
    .from('restaurants')
    .delete()
    .eq('id', id)
  if (error) throw error
  invalidateCache('restaurant')
}

// ─── Image Uploads ─────────────────────────────────────────────

function compressImage(file, { maxWidth = 800, quality = 0.7, forMenu = false } = {}) {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) return resolve(file)
    if (forMenu) { maxWidth = 600; quality = 0.65 }

    const timeout = setTimeout(() => resolve(file), 8000)
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      try {
        let { width, height } = img
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)

        const done = (blob) => {
          clearTimeout(timeout)
          if (!blob) { resolve(file); return }
          const ext = blob.type === 'image/webp' ? '.webp' : '.jpg'
          const name = file.name.replace(/\.[^.]+$/, ext)
          resolve(new File([blob], name, { type: blob.type }))
        }

        canvas.toBlob((webpBlob) => {
          if (webpBlob && webpBlob.size < file.size) {
            done(webpBlob)
          } else {
            canvas.toBlob((jpgBlob) => done(jpgBlob), 'image/jpeg', quality)
          }
        }, 'image/webp', quality)
      } catch {
        clearTimeout(timeout)
        resolve(file)
      }
    }

    img.onerror = () => { clearTimeout(timeout); URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

export async function uploadImage(path, file, { onProgress, forMenu = false } = {}) {
  const compressed = await compressImage(file, { forMenu })

  const { error } = await supabase.storage
    .from('restaurants')
    .upload(path, compressed, {
      cacheControl: '31536000',
      upsert: true,
      contentType: compressed.type,
    })
  if (error) throw error

  const { data } = supabase.storage
    .from('restaurants')
    .getPublicUrl(path)

  // Signal 100% complete for progress callbacks
  if (onProgress) onProgress(100)

  return data.publicUrl
}
