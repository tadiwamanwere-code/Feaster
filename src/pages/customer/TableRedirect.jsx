import { useParams, Navigate } from 'react-router-dom'

// Redirect old QR URLs `/<slug>/table/<n>` and `/<slug>` into the new
// in-app flow at `/app/r/<slug>?table=<n>`. This keeps printed QR codes
// from older deployments working.
export default function TableRedirect({ withTable = false }) {
  const { slug, tableNumber } = useParams()
  if (!slug) return <Navigate to="/welcome" replace />
  const target = withTable && tableNumber
    ? `/app/r/${slug}?table=${encodeURIComponent(tableNumber)}`
    : `/app/r/${slug}`
  return <Navigate to={target} replace />
}
