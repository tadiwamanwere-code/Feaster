// Lazy-loaded Firebase instances — only initialized when first accessed
let _app = null
let _db = null
let _auth = null

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

export async function getAuthInstance() {
  if (!_auth) {
    const app = await getApp()
    const { getAuth } = await import('firebase/auth')
    _auth = getAuth(app)
  }
  return _auth
}
