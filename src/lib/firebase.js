// Lazy-loaded Firebase instances — only initialized when first accessed
let _app = null
let _db = null
let _auth = null
let _storage = null
let _warming = false

// Validate required Firebase env vars — fail fast if misconfigured
;['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_STORAGE_BUCKET', 'VITE_FIREBASE_APP_ID']
  .forEach(key => {
    if (!import.meta.env[key]) {
      throw new Error(`Missing ${key} in .env — Firebase cannot initialize.`)
    }
  })

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
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

// Pre-warm Firebase + Firestore + Storage on first user interaction
export function warmUp() {
  if (_warming || _db) return
  _warming = true
  getDb().catch(() => {})
  getStorageInstance().catch(() => {})
}

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
