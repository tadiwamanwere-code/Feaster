import { getDb, getStorageInstance } from './firebase'

// Lazy-load Firestore functions only when needed
let _firestore = null
async function fs() {
  if (!_firestore) _firestore = await import('firebase/firestore')
  return _firestore
}

// ─── Restaurants ───────────────────────────────────────────────

export async function getRestaurants({ activeOnly = true } = {}) {
  const { collection, query, where, getDocs } = await fs()
  const db = await getDb()
  const q = activeOnly
    ? query(collection(db, 'restaurants'), where('is_active', '==', true))
    : query(collection(db, 'restaurants'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getRestaurantBySlug(slug) {
  const { collection, query, where, getDocs } = await fs()
  const db = await getDb()
  const q = query(collection(db, 'restaurants'), where('slug', '==', slug))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() }
}

export async function updateRestaurant(id, data) {
  const { doc, updateDoc } = await fs()
  const db = await getDb()
  await updateDoc(doc(db, 'restaurants', id), data)
}

// ─── Menu Items ────────────────────────────────────────────────

export async function getMenuItems(restaurantId) {
  const { collection, query, where, orderBy, getDocs } = await fs()
  const db = await getDb()
  const q = query(
    collection(db, 'menu_items'),
    where('restaurant_id', '==', restaurantId),
    orderBy('sort_order')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function addMenuItem(data) {
  const { collection, addDoc, serverTimestamp } = await fs()
  const db = await getDb()
  return addDoc(collection(db, 'menu_items'), {
    ...data,
    is_available: true,
    sort_order: 0,
    created_at: serverTimestamp(),
  })
}

export async function updateMenuItem(id, data) {
  const { doc, updateDoc } = await fs()
  const db = await getDb()
  await updateDoc(doc(db, 'menu_items', id), data)
}

export async function deleteMenuItem(id) {
  const { doc, deleteDoc } = await fs()
  const db = await getDb()
  await deleteDoc(doc(db, 'menu_items', id))
}

// ─── Tables ────────────────────────────────────────────────────

export async function getTables(restaurantId) {
  const { collection, query, where, getDocs } = await fs()
  const db = await getDb()
  const q = query(collection(db, 'tables'), where('restaurant_id', '==', restaurantId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function addTable(data) {
  const { collection, addDoc } = await fs()
  const db = await getDb()
  return addDoc(collection(db, 'tables'), { ...data, is_active: true })
}

export async function deleteTable(id) {
  const { doc, deleteDoc } = await fs()
  const db = await getDb()
  await deleteDoc(doc(db, 'tables', id))
}

export async function setupTables(restaurantId, tableCount) {
  const existing = await getTables(restaurantId)
  const existingNumbers = new Set(existing.map(t => t.table_number))

  // Add missing tables
  const promises = []
  for (let i = 1; i <= tableCount; i++) {
    const num = String(i)
    if (!existingNumbers.has(num)) {
      promises.push(addTable({ table_number: num, restaurant_id: restaurantId }))
    }
  }

  // Remove tables with numbers above the count (only numbered ones)
  for (const table of existing) {
    const n = parseInt(table.table_number, 10)
    if (!isNaN(n) && n > tableCount) {
      promises.push(deleteTable(table.id))
    }
  }

  await Promise.all(promises)
}

// ─── Orders ────────────────────────────────────────────────────

export async function createOrder(orderData) {
  const { collection, addDoc, serverTimestamp } = await fs()
  const db = await getDb()
  return addDoc(collection(db, 'orders'), {
    ...orderData,
    status: 'pending',
    created_at: serverTimestamp(),
  })
}

export async function getOrder(orderId) {
  const { doc, getDoc } = await fs()
  const db = await getDb()
  const snap = await getDoc(doc(db, 'orders', orderId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export async function updateOrderStatus(orderId, status) {
  const { doc, updateDoc } = await fs()
  const db = await getDb()
  await updateDoc(doc(db, 'orders', orderId), { status })
}

export function subscribeToOrder(orderId, callback) {
  let unsubscribe = () => {}
  ;(async () => {
    const { doc, onSnapshot } = await fs()
    const db = await getDb()
    unsubscribe = onSnapshot(doc(db, 'orders', orderId), (snap) => {
      if (snap.exists()) callback({ id: snap.id, ...snap.data() })
    })
  })()
  return () => unsubscribe()
}

export function subscribeToKitchenOrders(restaurantId, callback) {
  let unsubscribe = () => {}
  ;(async () => {
    const { collection, query, where, onSnapshot } = await fs()
    const db = await getDb()
    const q = query(
      collection(db, 'orders'),
      where('restaurant_id', '==', restaurantId),
      where('status', 'in', ['pending', 'confirmed', 'preparing', 'ready'])
    )
    unsubscribe = onSnapshot(q, (snap) => {
      const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      orders.sort((a, b) => (a.created_at?.toMillis?.() || 0) - (b.created_at?.toMillis?.() || 0))
      callback(orders)
    })
  })()
  return () => unsubscribe()
}

export async function getOrdersByRestaurant(restaurantId) {
  const { collection, query, where, orderBy, getDocs } = await fs()
  const db = await getDb()
  const q = query(
    collection(db, 'orders'),
    where('restaurant_id', '==', restaurantId),
    orderBy('created_at', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getTimestamp() {
  const { Timestamp } = await fs()
  return Timestamp
}

// ─── Platform Admin (restaurant CRUD) ──────────────────────────

export async function getRestaurantById(id) {
  const { doc, getDoc } = await fs()
  const db = await getDb()
  const snap = await getDoc(doc(db, 'restaurants', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export async function isSlugAvailable(slug, excludeId = null) {
  const { collection, query, where, getDocs } = await fs()
  const db = await getDb()
  const q = query(collection(db, 'restaurants'), where('slug', '==', slug))
  const snap = await getDocs(q)
  if (snap.empty) return true
  // If editing, the existing doc with same slug is OK
  if (excludeId && snap.docs.length === 1 && snap.docs[0].id === excludeId) return true
  return false
}

export async function addRestaurant(data) {
  const { collection, addDoc, serverTimestamp } = await fs()
  const db = await getDb()
  return addDoc(collection(db, 'restaurants'), {
    ...data,
    is_active: true,
    created_at: serverTimestamp(),
  })
}

export async function deleteRestaurant(id) {
  const { doc, deleteDoc } = await fs()
  const db = await getDb()
  await deleteDoc(doc(db, 'restaurants', id))
}

// ─── Image Uploads ─────────────────────────────────────────────

export async function uploadImage(path, file) {
  const storage = await getStorageInstance()
  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage')
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}
