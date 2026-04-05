// Seed script — populates Firestore with demo restaurant data
// Run: node scripts/seed.js
// Uses Application Default Credentials from: gcloud auth application-default login
// Or set GOOGLE_APPLICATION_CREDENTIALS to a service account key file

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyB4hx-qyV0tTeLv8ALzzip6NBeO47S1ccQ',
  authDomain: 'feaster-zw-app.firebaseapp.com',
  projectId: 'feaster-zw-app',
  storageBucket: 'feaster-zw-app.firebasestorage.app',
  messagingSenderId: '238258800430',
  appId: '1:238258800430:web:dd69250a7dce53f90b5cbf',
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const restaurants = [
  {
    slug: 'fishmonger',
    name: 'Fishmonger',
    description: 'Premium seafood and grill restaurant in the heart of Harare. Fresh catches daily.',
    cuisine_type: 'Seafood & Grill',
    city: 'Harare',
    logo_url: null,
    cover_photo_url: null,
    whatsapp_number: '+263771234567',
    opening_hours: { mon: '11:00-22:00', tue: '11:00-22:00', wed: '11:00-22:00', thu: '11:00-22:00', fri: '11:00-23:00', sat: '11:00-23:00', sun: '12:00-21:00' },
    payment_methods: ['cash', 'ecocash', 'innbucks', 'card'],
    subscription_tier: 'pro',
    is_active: true,
    kitchen_pin: '1234',
    rating: 4.5,
  },
  {
    slug: 'smokehouse',
    name: 'Smokehouse',
    description: 'Bulawayo\'s finest BBQ and steakhouse. Slow-smoked meats and craft beverages.',
    cuisine_type: 'BBQ & Steakhouse',
    city: 'Bulawayo',
    logo_url: null,
    cover_photo_url: null,
    whatsapp_number: '+263772345678',
    opening_hours: { mon: '12:00-22:00', tue: '12:00-22:00', wed: '12:00-22:00', thu: '12:00-22:00', fri: '12:00-23:00', sat: '12:00-23:00', sun: '12:00-21:00' },
    payment_methods: ['cash', 'ecocash', 'card'],
    subscription_tier: 'pro',
    is_active: true,
    kitchen_pin: '1234',
    rating: 4.3,
  },
  {
    slug: 'coimbra',
    name: 'Coimbra',
    description: 'Authentic Portuguese and seafood cuisine. A Harare institution since 1998.',
    cuisine_type: 'Portuguese & Seafood',
    city: 'Harare',
    logo_url: null,
    cover_photo_url: null,
    whatsapp_number: '+263773456789',
    opening_hours: { mon: '11:00-22:00', tue: '11:00-22:00', wed: '11:00-22:00', thu: '11:00-22:00', fri: '11:00-23:00', sat: '11:00-23:00', sun: '12:00-21:00' },
    payment_methods: ['cash', 'ecocash', 'innbucks', 'card'],
    subscription_tier: 'pro',
    is_active: true,
    kitchen_pin: '1234',
    rating: 4.7,
  },
  {
    slug: 'roosters',
    name: 'Roosters',
    description: 'Quick-service chicken and fast food. Crispy, juicy, and always fresh.',
    cuisine_type: 'Chicken & Fast Food',
    city: 'Bulawayo',
    logo_url: null,
    cover_photo_url: null,
    whatsapp_number: '+263774567890',
    opening_hours: { mon: '09:00-21:00', tue: '09:00-21:00', wed: '09:00-21:00', thu: '09:00-21:00', fri: '09:00-22:00', sat: '09:00-22:00', sun: '10:00-20:00' },
    payment_methods: ['cash', 'ecocash'],
    subscription_tier: 'lite',
    is_active: true,
    kitchen_pin: '1234',
    rating: 4.1,
  },
  {
    slug: 'mozambik',
    name: 'Mozambik',
    description: 'Vibrant Mozambican flavours in Bulawayo CBD. Peri-peri prawns and grilled seafood.',
    cuisine_type: 'Mozambican Cuisine',
    city: 'Bulawayo',
    logo_url: null,
    cover_photo_url: null,
    whatsapp_number: '+263775678901',
    opening_hours: { mon: '11:00-22:00', tue: '11:00-22:00', wed: '11:00-22:00', thu: '11:00-22:00', fri: '11:00-23:00', sat: '11:00-23:00', sun: '12:00-21:00' },
    payment_methods: ['cash', 'ecocash', 'innbucks', 'card'],
    subscription_tier: 'pro',
    is_active: true,
    kitchen_pin: '1234',
    rating: 4.6,
  },
]

const menus = {
  fishmonger: [
    { name: 'Calamari Strips', description: 'Crispy fried calamari with tartare sauce', price: 7.50, category: 'Starters', sort_order: 0 },
    { name: 'Prawn Cocktail', description: 'Prawns in Marie Rose sauce on a bed of lettuce', price: 9.00, category: 'Starters', sort_order: 1 },
    { name: 'Fish & Chips', description: 'Beer battered hake with hand-cut chips and coleslaw', price: 12.00, category: 'Mains', sort_order: 2 },
    { name: 'Grilled Salmon', description: 'Atlantic salmon with lemon butter sauce and vegetables', price: 18.00, category: 'Mains', sort_order: 3 },
    { name: 'Seafood Platter', description: 'Prawns, calamari, fish, mussels and chips for two', price: 35.00, category: 'Mains', sort_order: 4 },
    { name: 'Prawn Curry', description: 'Creamy coconut prawn curry with basmati rice', price: 16.00, category: 'Mains', sort_order: 5 },
    { name: 'Caesar Salad', description: 'Romaine lettuce, croutons, parmesan, caesar dressing', price: 7.50, category: 'Sides', sort_order: 6 },
    { name: 'Sweet Potato Fries', description: 'Crispy sweet potato fries with aioli', price: 4.50, category: 'Sides', sort_order: 7 },
    { name: 'Coca-Cola', description: '330ml can', price: 2.00, category: 'Drinks', sort_order: 8 },
    { name: 'Sprite', description: '330ml can', price: 2.00, category: 'Drinks', sort_order: 9 },
    { name: 'Castle Lager', description: '500ml bottle', price: 3.50, category: 'Drinks', sort_order: 10 },
    { name: 'Fresh Juice', description: 'Orange, mango or pineapple', price: 3.00, category: 'Drinks', sort_order: 11 },
    { name: 'Chocolate Brownie', description: 'Warm brownie with vanilla ice cream', price: 5.50, category: 'Desserts', sort_order: 12 },
    { name: 'Malva Pudding', description: 'Traditional South African sponge pudding with custard', price: 5.00, category: 'Desserts', sort_order: 13 },
  ],
  smokehouse: [
    { name: 'Chicken Wings (6pc)', description: 'Smoky BBQ wings with ranch dip', price: 6.00, category: 'Starters', sort_order: 0 },
    { name: 'Nachos', description: 'Loaded nachos with cheese, jalapenos, sour cream', price: 7.00, category: 'Starters', sort_order: 1 },
    { name: 'Classic Burger', description: 'Beef patty, lettuce, tomato, pickles, special sauce', price: 8.50, category: 'Mains', sort_order: 2 },
    { name: 'BBQ Ribs (Half Rack)', description: 'Slow-smoked pork ribs with BBQ glaze and fries', price: 15.00, category: 'Mains', sort_order: 3 },
    { name: 'Grilled T-Bone Steak', description: '400g T-bone with mushroom sauce, chips and salad', price: 18.00, category: 'Mains', sort_order: 4 },
    { name: 'Pulled Pork Sandwich', description: '12-hour smoked pulled pork with coleslaw on brioche', price: 10.00, category: 'Mains', sort_order: 5 },
    { name: 'Brisket Platter', description: 'Smoked beef brisket with two sides', price: 20.00, category: 'Mains', sort_order: 6 },
    { name: 'Onion Rings', description: 'Beer battered onion rings', price: 4.00, category: 'Sides', sort_order: 7 },
    { name: 'Coleslaw', description: 'Creamy homemade coleslaw', price: 2.50, category: 'Sides', sort_order: 8 },
    { name: 'Castle Lager', description: '500ml bottle', price: 3.50, category: 'Drinks', sort_order: 9 },
    { name: 'Zambezi Lager', description: '500ml bottle', price: 3.50, category: 'Drinks', sort_order: 10 },
    { name: 'Coca-Cola', description: '330ml can', price: 2.00, category: 'Drinks', sort_order: 11 },
    { name: 'Milkshake', description: 'Chocolate, vanilla or strawberry', price: 4.00, category: 'Drinks', sort_order: 12 },
  ],
  coimbra: [
    { name: 'Garlic Bread', description: 'Toasted ciabatta with garlic butter and herbs', price: 4.00, category: 'Starters', sort_order: 0 },
    { name: 'Peri-Peri Chicken Livers', description: 'Pan-fried livers in spicy peri-peri sauce', price: 6.50, category: 'Starters', sort_order: 1 },
    { name: 'Peri-Peri Chicken', description: 'Half grilled chicken with peri-peri sauce, rice and salad', price: 12.00, category: 'Mains', sort_order: 2 },
    { name: 'Espetada', description: 'Beef espetada on a hanging skewer with fries', price: 16.00, category: 'Mains', sort_order: 3 },
    { name: 'Mozambican Prawns', description: 'Grilled prawns in garlic butter and peri-peri', price: 22.00, category: 'Mains', sort_order: 4 },
    { name: 'Bacalhau', description: 'Traditional Portuguese salt cod with potatoes and olives', price: 14.00, category: 'Mains', sort_order: 5 },
    { name: 'Steak Roll', description: 'Sliced steak in a Portuguese roll with chips', price: 9.00, category: 'Mains', sort_order: 6 },
    { name: 'Portuguese Rice', description: 'Tomato and herb rice', price: 3.00, category: 'Sides', sort_order: 7 },
    { name: 'Mixed Salad', description: 'Fresh garden salad', price: 3.50, category: 'Sides', sort_order: 8 },
    { name: 'Super Bock', description: 'Portuguese lager 330ml', price: 3.50, category: 'Drinks', sort_order: 9 },
    { name: 'Fanta Orange', description: '330ml can', price: 2.00, category: 'Drinks', sort_order: 10 },
    { name: 'Pastel de Nata', description: 'Portuguese custard tart', price: 3.00, category: 'Desserts', sort_order: 11 },
  ],
  roosters: [
    { name: '2pc Chicken & Chips', description: '2 pieces fried chicken with regular chips', price: 5.00, category: 'Combos', sort_order: 0 },
    { name: '3pc Chicken & Chips', description: '3 pieces fried chicken with regular chips and roll', price: 7.00, category: 'Combos', sort_order: 1 },
    { name: 'Chicken Burger Combo', description: 'Chicken burger, chips and drink', price: 6.50, category: 'Combos', sort_order: 2 },
    { name: 'Family Bucket (8pc)', description: '8 pieces chicken, 2 large chips, 2 rolls, coleslaw', price: 18.00, category: 'Combos', sort_order: 3 },
    { name: 'Wings (6pc)', description: 'Crispy fried wings', price: 4.50, category: 'Sides', sort_order: 4 },
    { name: 'Large Chips', description: 'Large portion hand-cut chips', price: 3.00, category: 'Sides', sort_order: 5 },
    { name: 'Coleslaw', description: 'Creamy coleslaw', price: 1.50, category: 'Sides', sort_order: 6 },
    { name: 'Coca-Cola', description: '500ml bottle', price: 1.50, category: 'Drinks', sort_order: 7 },
    { name: 'Water', description: '500ml still water', price: 1.00, category: 'Drinks', sort_order: 8 },
  ],
  mozambik: [
    { name: 'Chilli Bites', description: 'Deep-fried chilli poppers with sweet chilli dip', price: 5.50, category: 'Starters', sort_order: 0 },
    { name: 'Peri-Peri Calamari', description: 'Grilled calamari tubes in peri-peri butter', price: 8.00, category: 'Starters', sort_order: 1 },
    { name: 'Mozambican Prawn Curry', description: 'Creamy coconut prawn curry with rice and sambals', price: 20.00, category: 'Mains', sort_order: 2 },
    { name: 'Grilled Prawns (500g)', description: 'Garlic and peri-peri grilled prawns with sides', price: 25.00, category: 'Mains', sort_order: 3 },
    { name: 'Peri-Peri Chicken', description: 'Flame-grilled half chicken, Mozambican style', price: 11.00, category: 'Mains', sort_order: 4 },
    { name: 'Trinchado', description: 'Beef cubes in spicy tomato and beer sauce with bread', price: 13.00, category: 'Mains', sort_order: 5 },
    { name: 'Matapa', description: 'Traditional cassava leaf stew with prawns and coconut', price: 14.00, category: 'Mains', sort_order: 6 },
    { name: 'Coconut Rice', description: 'Fragrant coconut-infused rice', price: 3.00, category: 'Sides', sort_order: 7 },
    { name: 'Prego Roll', description: 'Steak in garlic and chilli on a roll', price: 8.00, category: 'Mains', sort_order: 8 },
    { name: '2M Lager', description: 'Mozambican lager 330ml', price: 3.50, category: 'Drinks', sort_order: 9 },
    { name: 'Castle Lager', description: '500ml bottle', price: 3.50, category: 'Drinks', sort_order: 10 },
    { name: 'Fresh Mango Juice', description: 'Freshly squeezed mango', price: 3.50, category: 'Drinks', sort_order: 11 },
  ],
}

const tables = {
  fishmonger: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Bar 1', 'Bar 2'],
  smokehouse: ['1', '2', '3', '4', '5', '6', '7', '8', 'Patio 1', 'Patio 2'],
  coimbra: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
  roosters: ['1', '2', '3', '4', '5', '6'],
  mozambik: ['1', '2', '3', '4', '5', '6', '7', '8', 'Outside 1', 'Outside 2', 'Outside 3'],
}

async function seed() {
  console.log('Seeding Firestore...\n')

  for (const rest of restaurants) {
    const slug = rest.slug
    console.log(`Creating restaurant: ${rest.name}`)

    const restRef = await addDoc(collection(db, 'restaurants'), {
      ...rest,
      created_at: new Date(),
    })
    const restId = restRef.id
    console.log(`  ID: ${restId}`)

    const menuItems = menus[slug] || []
    for (const item of menuItems) {
      await addDoc(collection(db, 'menu_items'), {
        ...item,
        restaurant_id: restId,
        is_available: true,
        image_url: null,
        created_at: new Date(),
      })
    }
    console.log(`  Menu: ${menuItems.length} items`)

    const tableList = tables[slug] || []
    for (const num of tableList) {
      await addDoc(collection(db, 'tables'), {
        restaurant_id: restId,
        table_number: num,
        is_active: true,
      })
    }
    console.log(`  Tables: ${tableList.length}\n`)
  }

  console.log('Seeding complete!')
  process.exit(0)
}

seed().catch(err => { console.error(err); process.exit(1) })
