// Lazy-loaded Firebase instances — only initialized when first accessed
let _app = null
let _db = null
let _auth = null
let _storage = null
let _warming = false

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:000:web:000',
}

export async function getApp() {
  if (!_app) {
    const { initializeApp } = await import('firebase/app')
    _app = initializeApp(firebaseConfig)
  }
  return _app
}

export async function getDb() {
  if (!_db) {
    const app = await getApp()
    const { getFirestore } = await import('firebase/firestore')
    _db = getFirestore(app)
  }
  return _db
}

export async function getStorageInstance() {
  if (!_storage) {
    const app = await getApp()
    const { getStorage } = await import('firebase/storage')
    _storage = getStorage(app)
  }
  return _storage
}

export async function getAuthInstance() {
  if (!_auth) {
    const app = await getApp()
    const { getAuth } = await import('firebase/auth')
    _auth = getAuth(app)
  }
  return _auth
}

// Pre-warm Firebase + Firestore on first user interaction
// This runs in the background so by the time the user navigates,
// Firebase is already initialized and the first query is faster
export function warmUp() {
  if (_warming || _db) return
  _warming = true
  // Don't await — fire and forget in the background
  getDb().catch(() => {})
  // Also pre-warm Storage SDK so first image upload doesn't stall
  getStorageInstance().catch(() => {})
}

// Start warming on first interaction (click, touch, scroll)
if (typeof window !== 'undefined') {
  const trigger = () => {
    warmUp()
    window.removeEventListener('click', trigger)
    window.removeEventListener('touchstart', trigger)
    window.removeEventListener('scroll', trigger)
  }
  window.addEventListener('click', trigger, { once: true, passive: true })
  window.addEventListener('touchstart', trigger, { once: true, passive: true })
  window.addEventListener('scroll', trigger, { once: true, passive: true })
}
