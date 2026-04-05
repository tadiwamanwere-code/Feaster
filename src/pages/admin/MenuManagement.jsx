import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, X, GripVertical, Eye, EyeOff, Image, Link2, Loader, Upload } from 'lucide-react'
import { getRestaurantBySlug, getMenuItems, addMenuItem, updateMenuItem, deleteMenuItem } from '../../lib/services'

const DEMO_MENU = [
  { id: 'm1', name: 'Classic Burger', description: 'Beef patty, lettuce, tomato, special sauce', price: 8.50, category: 'Mains', is_available: true, sort_order: 0 },
  { id: 'm2', name: 'Chicken Wings (6pc)', description: 'Crispy fried wings with peri-peri sauce', price: 6.00, category: 'Starters', is_available: true, sort_order: 1 },
  { id: 'm3', name: 'Fish & Chips', description: 'Beer battered hake with hand-cut chips', price: 12.00, category: 'Mains', is_available: true, sort_order: 2 },
  { id: 'm4', name: 'Coca-Cola', description: '330ml can', price: 2.00, category: 'Drinks', is_available: true, sort_order: 3 },
  { id: 'm5', name: 'Castle Lager', description: '500ml bottle', price: 3.50, category: 'Drinks', is_available: true, sort_order: 4 },
  { id: 'm6', name: 'Chocolate Brownie', description: 'Warm brownie with vanilla ice cream', price: 5.50, category: 'Desserts', is_available: true, sort_order: 5 },
]

const EMPTY_ITEM = { name: '', description: '', price: '', category: '', image_url: '' }

export default function MenuManagement() {
  const { slug } = useParams()
  const [restaurant, setRestaurant] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState(null) // null = closed, 'new' = adding, item object = editing
  const [form, setForm] = useState(EMPTY_ITEM)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const imageInputRef = useRef()

  useEffect(() => {
    async function load() {
      try {
        const rest = await getRestaurantBySlug(slug)
        if (rest) {
          setRestaurant(rest)
          const menuItems = await getMenuItems(rest.id)
          setItems(menuItems.length > 0 ? menuItems : DEMO_MENU)
        } else {
          setRestaurant({ id: 'demo', slug })
          setItems(DEMO_MENU)
        }
      } catch {
        setRestaurant({ id: 'demo', slug })
        setItems(DEMO_MENU)
      }
      setLoading(false)
    }
    load()
  }, [slug])

  const categories = [...new Set(items.map(i => i.category))]

  const openAdd = () => {
    setEditItem('new')
    setForm(EMPTY_ITEM)
  }

  const openEdit = (item) => {
    setEditItem(item)
    setForm({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      category: item.category,
      image_url: item.image_url || '',
    })
  }

  const handleImageUpload = (file) => {
    if (!file) return
    setUploading(true)
    const reader = new FileReader()
    reader.onload = (e) => {
      setForm(f => ({ ...f, image_url: e.target.result }))
      setUploading(false)
    }
    reader.onerror = () => setUploading(false)
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!form.name || !form.price || !form.category) return
    setSaving(true)

    const data = {
      name: form.name,
      description: form.description,
      price: parseFloat(form.price),
      category: form.category,
      image_url: form.image_url || null,
      restaurant_id: restaurant.id,
    }

    try {
      if (editItem === 'new') {
        if (restaurant.id === 'demo') {
          setItems(prev => [...prev, { ...data, id: 'new-' + Date.now(), is_available: true, sort_order: prev.length }])
        } else {
          const docRef = await addMenuItem(data)
          setItems(prev => [...prev, { ...data, id: docRef.id, is_available: true, sort_order: prev.length }])
        }
      } else {
        if (!editItem.id.startsWith('demo') && !editItem.id.startsWith('m') && !editItem.id.startsWith('new')) {
          await updateMenuItem(editItem.id, data)
        }
        setItems(prev => prev.map(i => i.id === editItem.id ? { ...i, ...data } : i))
      }
    } catch (err) {
      console.error('Save failed:', err)
      if (editItem === 'new') {
        setItems(prev => [...prev, { ...data, id: 'new-' + Date.now(), is_available: true, sort_order: prev.length }])
      } else {
        setItems(prev => prev.map(i => i.id === editItem.id ? { ...i, ...data } : i))
      }
    }

    setEditItem(null)
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this menu item?')) return
    try {
      if (!id.startsWith('demo') && !id.startsWith('m') && !id.startsWith('new')) {
        await deleteMenuItem(id)
      }
    } catch {}
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const toggleAvailability = async (item) => {
    const newVal = !item.is_available
    try {
      if (!item.id.startsWith('demo') && !item.id.startsWith('m') && !item.id.startsWith('new')) {
        await updateMenuItem(item.id, { is_available: newVal })
      }
    } catch {}
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: newVal } : i))
  }

  if (loading) {
    return <div className="animate-pulse space-y-4">{[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-xl" />)}</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Menu Management</h2>
          <p className="text-sm text-gray-500">{items.length} items across {categories.length} categories</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {items.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <Image className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No menu items yet</p>
          <p className="text-sm text-gray-400 mt-1">Add your first item with a name, price, and photo</p>
          <button
            onClick={openAdd}
            className="mt-4 inline-flex items-center gap-2 bg-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-700"
          >
            <Plus className="w-4 h-4" />
            Add First Item
          </button>
        </div>
      )}

      {/* Menu by category */}
      {categories.map(cat => (
        <div key={cat}>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{cat}</h3>
          <div className="space-y-2">
            {items.filter(i => i.category === cat).map(item => (
              <div
                key={item.id}
                className={`flex items-center gap-3 bg-white px-4 py-3 rounded-xl border border-gray-100 ${
                  !item.is_available ? 'opacity-50' : ''
                }`}
              >
                <GripVertical className="w-4 h-4 text-gray-300 cursor-grab shrink-0" />
                {item.image_url ? (
                  <img src={item.image_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center">
                    <Image className="w-5 h-5 text-gray-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                  <p className="text-xs text-gray-400 truncate">{item.description}</p>
                </div>
                <span className="text-sm font-semibold text-gray-900 shrink-0">${item.price.toFixed(2)}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleAvailability(item)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"
                    title={item.is_available ? 'Mark unavailable' : 'Mark available'}
                  >
                    {item.is_available ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => openEdit(item)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Add/Edit Modal */}
      {editItem !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditItem(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">
                {editItem === 'new' ? 'Add Menu Item' : 'Edit Menu Item'}
              </h3>
              <button onClick={() => setEditItem(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Image upload */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Item Photo</label>
                {form.image_url ? (
                  <div className="relative inline-block">
                    <img src={form.image_url} alt="" className="w-full h-40 rounded-xl object-cover border border-gray-200" />
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, image_url: '' }))}
                      className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full h-32 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 transition-colors"
                  >
                    {uploading ? (
                      <Loader className="w-6 h-6 text-gray-400 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-gray-400 mb-1" />
                        <span className="text-sm text-gray-500">Click to upload photo</span>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => handleImageUpload(e.target.files[0])}
                />
                {!form.image_url && (
                  <div className="flex items-center gap-2 mt-2">
                    <Link2 className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                      type="url"
                      value={form.image_url || ''}
                      onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Or paste image URL..."
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g. Grilled Chicken"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  placeholder="Short description..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Price (USD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Category *</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g. Mains"
                    list="categories"
                  />
                  <datalist id="categories">
                    {categories.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setEditItem(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name || !form.price || !form.category}
                className="flex-1 px-4 py-2.5 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
