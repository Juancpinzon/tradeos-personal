import { useEffect, useRef } from 'react'
import { useWatchlist } from './useWatchlist'

export function usePriceAlerts() {
  const { items } = useWatchlist()
  const lastPrices = useRef<Record<string, number>>({})

  useEffect(() => {
    // Solicitar permiso para notificaciones
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }

    items.forEach(item => {
      const currentPrice = item.marketData?.price
      if (!currentPrice) return

      const prevPrice = lastPrices.current[item.symbol]
      
      // Solo disparar si el precio cambió
      if (prevPrice !== currentPrice) {
        // Alerta Above
        if (item.alert_price_above && currentPrice >= item.alert_price_above && (!prevPrice || prevPrice < item.alert_price_above)) {
          sendNotification(item.symbol, `Cruzó al alza: $${currentPrice}`, 'bullish')
        }

        // Alerta Below
        if (item.alert_price_below && currentPrice <= item.alert_price_below && (!prevPrice || prevPrice > item.alert_price_below)) {
          sendNotification(item.symbol, `Cruzó a la baja: $${currentPrice}`, 'bearish')
        }

        lastPrices.current[item.symbol] = currentPrice
      }
    })
  }, [items])

  const sendNotification = (symbol: string, message: string, bias: 'bullish' | 'bearish') => {
    if (Notification.permission === 'granted') {
      new Notification(`TradeOS: ${symbol}`, {
        body: message,
        icon: '/favicon.ico' // O un ícono de tendencia
      })
    }
    console.log(`[ALERT] ${symbol}: ${message} (${bias})`)
  }
}
