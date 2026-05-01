const statusConfig = {
  pending: { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  confirmed: { label: 'Confirmed', bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
  preparing: { label: 'Preparing', bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  ready: { label: 'Ready', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  completed: { label: 'Completed', bg: 'bg-canvas-100', text: 'text-ink-700', dot: 'bg-ink-500' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
}

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.pending

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}
