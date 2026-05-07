// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/useImporter.ts — Estado del importador + función importTrades()
// Procesa en lotes de 10 para no saturar Supabase
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { ParsedTrade } from '../lib/importParser'

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export type ImportStep = 'upload' | 'preview' | 'importing' | 'completed' | 'error'

export interface ImportOptions {
  broker:       'alpaca' | 'binance' | 'manual'
  createJournal: boolean
  filename:     string
}

export interface ImportResult {
  importedRows: number
  skippedRows:  number
  errors:       { row: number; error: string }[]
  sessionId:    string
}

export interface ImporterState {
  step:         ImportStep
  parsedTrades: ParsedTrade[]
  validTrades:  ParsedTrade[]
  invalidTrades: ParsedTrade[]
  progress:     number            // 0–100
  progressMsg:  string
  result:       ImportResult | null
  error:        string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useImporter() {
  const [state, setState] = useState<ImporterState>({
    step:          'upload',
    parsedTrades:  [],
    validTrades:   [],
    invalidTrades: [],
    progress:      0,
    progressMsg:   '',
    result:        null,
    error:         null,
  })

  /** Establece las trades parseadas y avanza al paso preview */
  const setParsedTrades = useCallback((trades: ParsedTrade[]) => {
    const valid   = trades.filter(t => !t.error)
    const invalid = trades.filter(t => !!t.error)
    setState(s => ({
      ...s,
      step:          'preview',
      parsedTrades:  trades,
      validTrades:   valid,
      invalidTrades: invalid,
      error:         null,
    }))
  }, [])

  /** Vuelve al paso de upload */
  const reset = useCallback(() => {
    setState({
      step:          'upload',
      parsedTrades:  [],
      validTrades:   [],
      invalidTrades: [],
      progress:      0,
      progressMsg:   '',
      result:        null,
      error:         null,
    })
  }, [])

  /** Función principal de importación — procesa en lotes de 10 */
  const importTrades = useCallback(async (
    trades: ParsedTrade[],
    options: ImportOptions
  ) => {
    setState(s => ({
      ...s,
      step:        'importing',
      progress:    0,
      progressMsg: 'Iniciando importación...',
      error:       null,
    }))

    // 1. Obtener usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      setState(s => ({
        ...s,
        step:  'error',
        error: 'No autenticado. Por favor, iniciá sesión.',
      }))
      return
    }

    // 2. Crear sesión de importación en import_sessions
    const { data: session, error: sessionError } = await supabase
      .from('import_sessions')
      .insert({
        user_id:    user.id,
        filename:   options.filename,
        total_rows: trades.length,
        status:     'importing',
      })
      .select()
      .single()

    if (sessionError || !session) {
      setState(s => ({
        ...s,
        step:  'error',
        error: `Error al crear sesión: ${sessionError?.message ?? 'desconocido'}`,
      }))
      return
    }

    // 3. Importar en lotes de 10
    const BATCH = 10
    let importedRows = 0
    let skippedRows  = 0
    const errors: { row: number; error: string }[] = []

    for (let i = 0; i < trades.length; i += BATCH) {
      const batch = trades.slice(i, i + BATCH)

      setState(s => ({
        ...s,
        progress:    Math.round(((i) / trades.length) * 100),
        progressMsg: `Importando ${Math.min(i + BATCH, trades.length)} de ${trades.length} operaciones...`,
      }))

      for (let j = 0; j < batch.length; j++) {
        const trade = batch[j]
        if (!trade) continue
        const absoluteIdx = i + j

        try {
          // ── a) Insertar en orders ──────────────────────────────────────────
          const brokerMap = {
            alpaca:  'alpaca',
            binance: 'binance',
            manual:  'alpaca',   // default broker para manual
          } as const

          const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
              user_id:         user.id,
              broker_order_id: `import-${session.id}-${absoluteIdx}`,
              broker:          brokerMap[options.broker],
              symbol:          trade.symbol,
              side:            trade.side,
              order_type:      'market' as const,
              qty:             trade.qty,
              filled_qty:      trade.qty,
              filled_avg_price: trade.price,
              status:          'filled' as const,
              asset_class:     trade.asset_class,
              submitted_at:    trade.date.toISOString(),
              filled_at:       trade.date.toISOString(),
              notes:           `Importado desde ${options.filename}`,
            })
            .select()
            .single()

          if (orderError) {
            errors.push({ row: absoluteIdx + 1, error: orderError.message })
            skippedRows++
            continue
          }

          // ── b) Crear entrada en journal_entries si el checkbox está activo ─
          if (options.createJournal && order) {
            const outcome = trade.side === 'sell' ? 'win' : undefined

            await supabase.from('journal_entries').insert({
              user_id:        user.id,
              order_id:       order.id,
              symbol:         trade.symbol,
              side:           trade.side,
              asset_class:    trade.asset_class,
              entry_thesis:   'Operación importada desde historial',
              emotional_state:'calm' as const,
              confidence_level: 3 as const,
              followed_plan:  true,
              outcome:        trade.side === 'sell' ? outcome : undefined,
              created_at:     trade.date.toISOString(),
              updated_at:     trade.date.toISOString(),
            })
            // No fallamos la importación si el journal falla
          }

          importedRows++
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido'
          errors.push({ row: absoluteIdx + 1, error: msg })
          skippedRows++
        }
      }
    }

    // 4. Actualizar sesión como completada
    await supabase
      .from('import_sessions')
      .update({
        imported_rows: importedRows,
        skipped_rows:  skippedRows,
        status:        errors.length > 0 && importedRows === 0 ? 'failed' : 'completed',
        errors:        errors,
        completed_at:  new Date().toISOString(),
      })
      .eq('id', session.id)

    setState(s => ({
      ...s,
      step:        'completed',
      progress:    100,
      progressMsg: 'Importación completada',
      result: {
        importedRows,
        skippedRows,
        errors,
        sessionId: session.id,
      },
    }))
  }, [])

  /** Verifica si un archivo ya fue importado (por filename + user) */
  const checkDuplicate = useCallback(async (filename: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data } = await supabase
      .from('import_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('filename', filename)
      .in('status', ['completed', 'importing'])
      .limit(1)

    return (data?.length ?? 0) > 0
  }, [])

  /** Carga el historial de importaciones anteriores */
  const loadHistory = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data } = await supabase
      .from('import_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    return data ?? []
  }, [])

  return {
    state,
    setParsedTrades,
    importTrades,
    checkDuplicate,
    loadHistory,
    reset,
  }
}
