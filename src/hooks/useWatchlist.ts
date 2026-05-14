import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { useMarketData } from './useMarketData';
import { useEffect, useRef } from 'react';
import type { WatchlistItem } from '../types';

export function useWatchlist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const lastCheckedPrices = useRef<Record<string, number>>({});

  // 1. Fetch Watchlist items from DB
  const { data: items = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ['watchlist', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('watchlist_items')
        .select('*')
        .eq('user_id', user?.id)
        .order('added_at', { ascending: false });
      
      if (error) throw error;
      return data as WatchlistItem[];
    },
    enabled: !!user
  });

  // 2. Fetch prices for these items
  const symbols = items.map(item => item.symbol);
  const { data: prices = {}, isLoading: isLoadingPrices } = useMarketData(symbols);

  // 3. Combine items with prices
  const getWatchlistWithPrices = () => {
    return items.map(item => ({
      ...item,
      marketData: prices[item.symbol]
    }));
  };

  // 4. Check Alerts logic
  useEffect(() => {
    if (Object.keys(prices).length === 0) return;

    items.forEach(item => {
      const currentPrice = prices[item.symbol]?.price;
      const lastPrice = lastCheckedPrices.current[item.symbol];

      if (currentPrice != null && lastPrice != null && currentPrice !== lastPrice) {
        // Alerta Price Above
        if (item.alert_price_above && currentPrice >= item.alert_price_above && lastPrice < item.alert_price_above) {
          triggerAlertToast(item.symbol, 'arriba', currentPrice);
        }
        // Alerta Price Below
        if (item.alert_price_below && currentPrice <= item.alert_price_below && lastPrice > item.alert_price_below) {
          triggerAlertToast(item.symbol, 'abajo', currentPrice);
        }
      }

      if (currentPrice != null) {
        lastCheckedPrices.current[item.symbol] = currentPrice;
      }
    });
  }, [prices, items]);

  // Mutations
  const addItem = useMutation({
    mutationFn: async ({ symbol, broker, asset_class }: { symbol: string, broker: string, asset_class: string }) => {
      const { data, error } = await supabase
        .from('watchlist_items')
        .insert({ user_id: user?.id, symbol, broker, asset_class })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] })
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('watchlist_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] })
  });

  const updateAlerts = useMutation({
    mutationFn: async ({ id, above, below }: { id: string, above: number | null, below: number | null }) => {
      const { error } = await supabase
        .from('watchlist_items')
        .update({ alert_price_above: above, alert_price_below: below })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] })
  });

  return {
    items: getWatchlistWithPrices(),
    isLoading: isLoadingItems || isLoadingPrices,
    addItem: addItem.mutate,
    removeItem: removeItem.mutate,
    updateAlerts: updateAlerts.mutate,
    checkAlerts: () => {} // Se ejecuta automáticamente vía useEffect
  };
}

function triggerAlertToast(symbol: string, direction: 'arriba' | 'abajo', price: number) {
  const color = direction === 'arriba' ? '#10b981' : '#ef4444';
  const event = new CustomEvent('tradeos-toast', {
    detail: {
      title: `Alerta: ${symbol}`,
      message: `${symbol} cruzó ${direction} a $${price.toFixed(2)}`,
      color
    }
  });
  window.dispatchEvent(event);
}
