// ─────────────────────────────────────────────────────────────────────────────
// TradingViewWidget.tsx
// Reimplementado de forma nativa utilizando ChartContainer (lightweight-charts)
// Evita iframes externos lentos y provee indicadores client-side.
// ─────────────────────────────────────────────────────────────────────────────

import { ChartContainer } from '../chart/ChartContainer';

interface Props {
  symbol: string;
  height?: number;
}

// Inferencia del broker según la clase de activo del símbolo
function inferBroker(symbol: string): 'binance' | 'alpaca' {
  const s = symbol.toUpperCase().trim();
  const isCrypto = 
    s.includes('/') || 
    s.endsWith('USDT') || 
    s.endsWith('BTC') || 
    s.endsWith('ETH') || 
    s.endsWith('SOL') ||
    s.endsWith('BNB') ||
    s.endsWith('XRP') ||
    s.endsWith('ADA') ||
    s.endsWith('DOGE') ||
    s.endsWith('AVAX') ||
    s.endsWith('DOT') ||
    s.endsWith('LINK');
    
  return isCrypto ? 'binance' : 'alpaca';
}

export function TradingViewWidget({ symbol, height = 300 }: Props) {
  const broker = inferBroker(symbol);
  
  return (
    <ChartContainer 
      symbol={symbol} 
      broker={broker} 
      height={height - 24} // Acomodar header/footer de ChartContainer dentro del alto
    />
  );
}
export default TradingViewWidget;
