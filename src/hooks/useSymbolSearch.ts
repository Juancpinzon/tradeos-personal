import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface SymbolSuggestion {
  symbol: string;
  name: string;
  asset_class: string;
}

export function useSymbolSearch(query: string) {
  const [suggestions, setSuggestions] = useState<SymbolSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const searchSymbols = async () => {
      setIsLoading(true);
      try {
        // Buscamos coincidencia en symbol o name
        const { data, error } = await supabase
          .from('screener_universe')
          .select('symbol, name, asset_class')
          .or(`symbol.ilike.${query}%,name.ilike.%${query}%`)
          .order('market_cap', { ascending: false })
          .limit(6);

        if (error) throw error;
        setSuggestions(data || []);
      } catch (err) {
        console.error('Error searching symbols:', err);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(searchSymbols, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return { suggestions, isLoading };
}
