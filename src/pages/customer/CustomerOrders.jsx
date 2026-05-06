import { ClipboardList } from 'lucide-react'

export default function CustomerOrders() {
  return (
    <div className="min-h-[100dvh] bg-white px-5 pt-7">
      <h1 className="text-2xl font-black text-black tracking-tight">Orders</h1>
      <p className="text-sm text-black/55 mt-1 font-medium">
        Your order history will appear here.
      </p>

      <div className="mt-12 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-[#F4F4F4] flex items-center justify-center mb-4">
          <ClipboardList className="w-9 h-9 text-black/30" />
        </div>
        <h2 className="text-lg font-extrabold text-black">No orders yet</h2>
        <p className="text-sm text-black/50 mt-1 max-w-xs">
          When you place an order, it'll show up here so you can track and re-order.
        </p>
      </div>
    </div>
  )
}
