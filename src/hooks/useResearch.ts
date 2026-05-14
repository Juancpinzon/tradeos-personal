// ─────────────────────────────────────────────────────────────────────────────
// useResearch.ts
// Hook para el Research Agent: fetch streaming desde claude-research,
// gestión de estado local y lectura del historial desde research_entries.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { ResearchEntry, ResearchDataSnapshot, PortfolioContext } from '../types'

// ─────────────────────────────────────────────────────────────────────────────

interface UseResearchReturn {
  analyzeSymbol: (symbol: string, query: string) => Promise<void>
  streamingText: string
  isStreaming: boolean
  isLoading: boolean
  error: string | null
  currentSnapshot: ResearchDataSnapshot | null
  currentPortfolioCtx: PortfolioContext | null
  currentSymbol: string | null
  history: ResearchEntry[]
  loadHistoryEntry: (entry: ResearchEntry) => void
  deleteHistoryEntry: (id: string) => Promise<void>
  deleteAllHistory: () => Promise<void>
  reset: () => void
}

// ─────────────────────────────────────────────────────────────────────────────

export function useResearch(): UseResearchReturn {
  const queryClient = useQueryClient()

  const [streamingText,    setStreamingText]    = useState('')
  const [isStreaming,      setIsStreaming]       = useState(false)
  const [isLoading,        setIsLoading]         = useState(false)
  const [error,            setError]             = useState<string | null>(null)
  const [currentSnapshot,  setCurrentSnapshot]   = useState<ResearchDataSnapshot | null>(null)
  const [currentPortfolioCtx, setCurrentPortfolioCtx] = useState<PortfolioContext | null>(null)
  const [currentSymbol,    setCurrentSymbol]     = useState<string | null>(null)

  // ── Historial ────────────────────────────────────────────────────────────
  const { data: history = [] } = useQuery<ResearchEntry[]>({
    queryKey: ['research-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('research_entries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      return data as ResearchEntry[]
    },
    staleTime: 60_000,
  })

  // ── analyzeSymbol ────────────────────────────────────────────────────────
  const analyzeSymbol = useCallback(async (symbol: string, query: string) => {
    setIsLoading(true)
    setIsStreaming(false)
    setStreamingText('')
    setError(null)
    setCurrentSymbol(symbol)
    setCurrentSnapshot(null)
    setCurrentPortfolioCtx(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('No autenticado')

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string

      const response = await fetch(
        `${supabaseUrl}/functions/v1/claude-research`,
        {
          method:  'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type':  'application/json',
          },
          body: JSON.stringify({ symbol, query }),
        }
      )

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(errText || `Error ${response.status}`)
      }

      // Leer datos del header custom si el edge function los envía
      // (en esta implementación los datos vienen inline antes del análisis)

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No readable stream')

      const decoder = new TextDecoder()
      setIsLoading(false)
      setIsStreaming(true)

      let accumulated = ''
      let metadataFound = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        accumulated += chunk

        // ── Detectar y parsear metadatos ──────────────────────────────────────
        // Buscamos el delimitador. Si no se encuentra, seguimos acumulando.
        if (!metadataFound) {
          const delimiter = "--METADATA_END--"
          const index = accumulated.indexOf(delimiter)
          
          if (index !== -1) {
            const metadataStr = accumulated.substring(0, index).trim()
            // El resto es texto de Claude
            accumulated = accumulated.substring(index + delimiter.length).trimStart()
            
            try {
              const metadata = JSON.parse(metadataStr)
              if (metadata && metadata.type === 'metadata') {
                setCurrentSnapshot(metadata.dataSnapshot)
                setCurrentPortfolioCtx(metadata.portfolioCtx)
              }
            } catch (e) {
              console.error('Error parsing metadata chunk:', e, 'Raw:', metadataStr)
            } finally {
              metadataFound = true // Marcamos como encontrado incluso si falló el parseo
            }
          }
        }

        // Una vez que el metadata fue procesado (o falló), empezamos a mostrar el texto
        if (metadataFound) {
          setStreamingText(accumulated)
        }
      }

      setIsStreaming(false)

      // Invalidar historial para que se recargue con la nueva entrada
      await queryClient.invalidateQueries({ queryKey: ['research-history'] })

    } catch (e) {
      setIsLoading(false)
      setIsStreaming(false)
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      setError(msg)
    }
  }, [queryClient])

  // ── loadHistoryEntry ─────────────────────────────────────────────────────
  const loadHistoryEntry = useCallback((entry: ResearchEntry) => {
    setCurrentSymbol(entry.symbol)
    setStreamingText(entry.analysis)
    setIsStreaming(false)
    setIsLoading(false)
    setError(null)
    setCurrentSnapshot(entry.data_used)
    setCurrentPortfolioCtx(entry.portfolio_context)
  }, [])

  // ── reset ──────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setStreamingText('')
    setIsStreaming(false)
    setIsLoading(false)
    setError(null)
    setCurrentSnapshot(null)
    setCurrentPortfolioCtx(null)
    setCurrentSymbol(null)
  }, [])

  // ── deleteHistoryEntry ──────────────────────────────────────────────────
  const deleteHistoryEntry = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('research_entries')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      await queryClient.invalidateQueries({ queryKey: ['research-history'] })
    } catch (e) {
      console.error('Error deleting research entry:', e)
      alert('No se pudo eliminar el análisis')
    }
  }, [queryClient])

  // ── deleteAllHistory ──────────────────────────────────────────────────
  const deleteAllHistory = useCallback(async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar TODO el historial de investigación? Esta acción no se puede deshacer.')) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) return

      const { error } = await supabase
        .from('research_entries')
        .delete()
        .eq('user_id', session.user.id)

      if (error) throw error
      
      await queryClient.invalidateQueries({ queryKey: ['research-history'] })
    } catch (e) {
      console.error('Error deleting research history:', e)
      alert('No se pudo limpiar el historial')
    }
  }, [queryClient])

  return {
    analyzeSymbol,
    streamingText,
    isStreaming,
    isLoading,
    error,
    currentSnapshot,
    currentPortfolioCtx,
    currentSymbol,
    history,
    loadHistoryEntry,
    deleteHistoryEntry,
    deleteAllHistory,
    reset,
  }
}
