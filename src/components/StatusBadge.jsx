const statusConfig = {
  pending: { label: 'Pending', bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  confirmed: { label: 'Confirmed', bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
  preparing: { label: 'Preparing', bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' },
  ready: { label: 'Ready', bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  completed: { label: 'Completed', bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-500' },
}

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.pending

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}
