import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Clock, User } from 'lucide-react'
import { getRestaurantBySlug, getOrdersByRestaurant } from '../../lib/services'
import { formatDate, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, DAYS_SHORT } from '../../lib/dates'

const DEMO_PRE_ORDERS = [
  {
    id: 'po1', customer_name: 'Grace T.', order_type: 'pre_order', status: 'pending',
    delivery_time: (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(19, 0); return d.toISOString() })(),
    items: [{ name: 'T-Bone Steak', quantity: 2 }, { name: 'Caesar Salad', quantity: 2 }], total: 51.00,
    created_at: new Date().toISOString(),
  },
  {
    id: 'po2', customer_name: 'Brian M.', order_type: 'pre_order', status: 'pending',
    delivery_time: (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(20, 30); return d.toISOString() })(),
    items: [{ name: 'Mozambican Prawns', quantity: 4 }, { name: 'Castle Lager', quantity: 4 }], total: 102.00,
    created_at: new Date().toISOString(),
  },
  {
    id: 'po3', customer_name: 'Linda K.', order_type: 'takeout', status: 'pending',
    delivery_time: (() => { const d = new Date(); d.setDate(d.getDate() + 3); d.setHours(12, 0); return d.toISOString() })(),
    items: [{ name: 'Classic Burger', quantity: 5 }, { name: 'Coca-Cola', quantity: 5 }], total: 52.50,
    created_at: new Date().toISOString(),
  },
]

export default function PreOrderCalendar() {
  const { slug } = useParams()
  const [preOrders, setPreOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const rest = await getRestaurantBySlug(slug)
        if (rest) {
          const orders = await getOrdersByRestaurant(rest.id)
          const preOrd = orders.filter(o => o.order_type === 'pre_order' || o.order_type === 'takeout')
          setPreOrders(preOrd.length > 0 ? preOrd : DEMO_PRE_ORDERS)
        } else {
          setPreOrders(DEMO_PRE_ORDERS)
        }
      } catch {
        setPreOrders(DEMO_PRE_ORDERS)
      }
      setLoading(false)
    }
    load()
  }, [slug])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Pad start of month to align with weekday
  const startDay = monthStart.getDay()
  const paddedDays = Array(startDay).fill(null).concat(daysInMonth)

  const getOrdersForDate = (date) => {
    if (!date) return []
    return preOrders.filter(o => {
      const deliveryDate = o.delivery_time ? new Date(o.delivery_time) : null
      return deliveryDate && isSameDay(deliveryDate, date)
    })
  }

  const selectedOrders = selectedDate ? getOrdersForDate(selectedDate) : []

  if (loading) {
    return <div className="h-64 bg-white rounded-xl animate-pulse" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Pre-Order Calendar</h2>
        <p className="text-sm text-gray-500">Upcoming scheduled orders and pickups</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="font-semibold text-gray-900">{formatDate(currentMonth, 'MMMM yyyy')}</h3>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {paddedDays.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />
              const dayOrders = getOrdersForDate(day)
              const isSelected = selectedDate && isSameDay(day, selectedDate)

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`relative p-2 rounded-lg text-sm transition-colors min-h-[48px] ${
                    isSelected
                      ? 'bg-orange-600 text-white'
                      : isToday(day)
                        ? 'bg-orange-50 text-orange-700 font-semibold'
                        : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span>{formatDate(day, 'd')}</span>
                  {dayOrders.length > 0 && (
                    <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-white' : 'bg-orange-500'
                    }`} />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected day orders */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">
            {selectedDate ? formatDate(selectedDate, 'EEEE, MMMM d') : 'Select a date'}
          </h3>
          {selectedDate ? (
            selectedOrders.length > 0 ? (
              <div className="space-y-3">
                {selectedOrders.map(order => (
                  <div key={order.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium">{order.customer_name}</span>
                      </div>
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                        {order.order_type === 'takeout' ? 'Pickup' : 'Pre-order'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                      <Clock className="w-3.5 h-3.5" />
                      {order.delivery_time && formatDate(new Date(order.delivery_time), 'h:mm a')}
                    </div>
                    <div className="text-xs text-gray-600 space-y-0.5">
                      {order.items?.map((item, i) => (
                        <p key={i}>{item.quantity}x {item.name}</p>
                      ))}
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mt-2">${order.total?.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">No scheduled orders</p>
            )
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">
              Click a date to see scheduled orders
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
