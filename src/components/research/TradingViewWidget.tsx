// ─────────────────────────────────────────────────────────────────────────────
// TradingViewWidget.tsx
// Iframe embed TradingView con tema dark, border-radius 8px, sin borde visible.
// Altura fija 300px. Sin scroll interno.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  symbol: string
  height?: number
}

export function TradingViewWidget({ symbol, height = 300 }: Props) {
  // TradingView necesita el símbolo con exchange prefix para stocks NYSE/NASDAQ
  // BTC, ETH etc. usan BINANCE:BTCUSDT
  const tvSymbol = isCrypto(symbol)
    ? `BINANCE:${symbol.replace('/', '')}T`
    : symbol

  const src = [
    'https://www.tradingview.com/widgetembed/',
    `?symbol=${encodeURIComponent(tvSymbol)}`,
    '&interval=D',
    '&theme=dark',
    '&style=1',
    '&locale=es',
    `&toolbar_bg=${encodeURIComponent('#111827')}`,
    '&hide_side_toolbar=1',
    '&hide_legend=0',
    '&save_image=0',
    '&withdateranges=1',
    '&allow_symbol_change=0',
  ].join('')

  return (
    <div
      style={{
        borderRadius: '8px',
        overflow: 'hidden',
        border: 'none',
        height: `${height}px`,
        position: 'relative',
        background: '#111827',
      }}
    >
      <iframe
        src={src}
        title={`${symbol} chart`}
        width="100%"
        height={height}
        style={{
          border: 'none',
          display: 'block',
          overflow: 'hidden',
        }}
        scrolling="no"
        allowFullScreen
      />
    </div>
  )
}

function isCrypto(symbol: string): boolean {
  const cryptoSymbols = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'LINK']
  return cryptoSymbols.some(c => symbol.toUpperCase().startsWith(c))
}
