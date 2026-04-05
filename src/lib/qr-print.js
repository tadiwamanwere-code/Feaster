/**
 * Shared QR code print layout utilities.
 * Produces beautiful, branded, A4-ready print pages — 4 QR cards per page.
 */

export function downloadQRImage(dataUrl, filename) {
  if (!dataUrl) return
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

/**
 * Build a print-ready HTML string for QR codes.
 *
 * @param {Object} opts
 * @param {string} opts.restaurantName
 * @param {'restaurant'|'table'} opts.type
 * @param {Array<{qrDataUrl: string, label: string, sublabel: string, url: string}>} opts.items
 * @returns {string} Full HTML document string
 */
export function buildQRPrintHTML({ restaurantName, type, items }) {
  const isTable = type === 'table'
  const accent = isTable ? '#2563eb' : '#ea580c'   // blue for tables, orange for restaurant
  const accentLight = isTable ? '#dbeafe' : '#fff7ed'
  const accentText = isTable ? '#1e40af' : '#c2410c'
  const badge = isTable ? 'DINE IN' : 'RESTAURANT'
  const title = isTable
    ? `${restaurantName} — Table QR Codes`
    : `${restaurantName} — Restaurant QR Code`

  const cards = items.map(item => `
    <div class="card">
      <div class="card-inner">
        <div class="badge" style="background:${accent};color:#fff;">${badge}</div>
        <div class="qr-frame">
          <img src="${item.qrDataUrl || ''}" alt="QR Code" />
        </div>
        <div class="card-label">${item.label}</div>
        <div class="card-sub">${item.sublabel}</div>
        <div class="card-divider"></div>
        <div class="brand-row">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${accent}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 2l1 7h16l1-7"/><path d="M5 9v12a1 1 0 001 1h12a1 1 0 001-1V9"/><path d="M10 22V14h4v8"/>
          </svg>
          <span>Feaster</span>
        </div>
        <div class="card-url">${item.url}</div>
      </div>
    </div>
  `).join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f9fafb;
      color: #111827;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .header {
      text-align: center;
      padding: 16px 0 12px;
      border-bottom: 2px solid ${accent};
      margin-bottom: 16px;
    }
    .header h1 {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
    }
    .header p {
      font-size: 11px;
      color: #6b7280;
      margin-top: 2px;
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      padding: 0;
    }

    .card {
      break-inside: avoid;
      page-break-inside: avoid;
      border: 2px solid #e5e7eb;
      border-radius: 16px;
      background: #ffffff;
      overflow: hidden;
    }

    .card-inner {
      padding: 20px 16px 16px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .badge {
      display: inline-block;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 1.2px;
      padding: 3px 12px;
      border-radius: 20px;
      margin-bottom: 12px;
    }

    .qr-frame {
      background: ${accentLight};
      border: 2px solid ${accent}22;
      border-radius: 14px;
      padding: 12px;
      display: inline-block;
    }

    .qr-frame img {
      width: 150px;
      height: 150px;
      display: block;
      border-radius: 6px;
    }

    .card-label {
      font-size: 20px;
      font-weight: 800;
      color: #111827;
      margin-top: 12px;
      line-height: 1.2;
    }

    .card-sub {
      font-size: 11px;
      color: ${accentText};
      font-weight: 600;
      margin-top: 4px;
    }

    .card-divider {
      width: 40px;
      height: 2px;
      background: ${accent};
      border-radius: 2px;
      margin: 10px 0;
    }

    .brand-row {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 700;
      color: ${accent};
    }

    .card-url {
      font-size: 8px;
      color: #9ca3af;
      font-family: 'SF Mono', 'Consolas', 'Liberation Mono', Menlo, monospace;
      margin-top: 4px;
      word-break: break-all;
      max-width: 220px;
    }

    /* ─ Page-break after every 4 cards ─ */
    .card:nth-child(4n+1) {
      page-break-before: auto;
    }

    /* Force page-break for sets of 4 */
    .page-break {
      break-before: page;
      page-break-before: always;
    }

    @media print {
      body { background: white; }
      .no-print { display: none !important; }
      .header { padding-top: 0; }
    }

    @media screen {
      body { max-width: 210mm; margin: 0 auto; padding: 20px; }
      .no-print-btn {
        position: fixed;
        top: 16px;
        right: 16px;
        background: ${accent};
        color: white;
        border: none;
        padding: 10px 24px;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        z-index: 100;
        box-shadow: 0 4px 12px ${accent}44;
      }
    }
  </style>
</head>
<body>
  <button class="no-print-btn no-print" onclick="window.print()">Print QR Codes</button>

  <div class="header">
    <h1>${restaurantName}</h1>
    <p>${isTable ? `${items.length} Table QR Code${items.length !== 1 ? 's' : ''} — Dine-In Ordering` : 'Restaurant QR Code — Menu & Ordering'}</p>
  </div>

  <div class="grid">
    ${cards}
  </div>
</body>
</html>`
}
