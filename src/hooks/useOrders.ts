// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/useOrders.ts
// Gestión de órdenes: historial desde DB + submit via alpaca-proxy.
// Polling cada 3s para órdenes pendientes. React Query con invalidación automática.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Order } from '../types'
import type { OrderDraft } from '../components/trading/OrderForm'

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const ORDERS_KEY = ['orders'] as const
const POLL_INTERVAL_MS = 3000
const PENDING_STATUSES: Order['status'][] = ['pending', 'accepted', 'partially_filled']

// ─────────────────────────────────────────────────────────────────────────────
// Helpers para llamar a la Edge Function
// ─────────────────────────────────────────────────────────────────────────────

async function getAuthHeader(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('No session token available')
  return `Bearer ${token}`
}

async function callAlpacaProxy(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
  const authHeader  = await getAuthHeader()

  return fetch(`${supabaseUrl}/functions/v1/alpaca-proxy${path}`, {
    ...options,
    headers: {
      'Authorization': authHeader,
      'Content-Type':  'application/json',
      ...(options.headers ?? {}),
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Payload para POST /orders (lo que el hook envía a la Edge Function)
// ─────────────────────────────────────────────────────────────────────────────

export interface SubmitOrderPayload extends OrderDraft {
  risk_amount?: number
  portfolio_weight_at_order?: number
  risk_reward_ratio?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook principal
// ─────────────────────────────────────────────────────────────────────────────

export function useOrders() {
  const queryClient = useQueryClient()
  const pollingRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── GET historial desde tabla orders ────────────────────────────────────
  const ordersQuery = useQuery<Order[], Error>({
    queryKey: ORDERS_KEY,
    queryFn:  fetchOrdersFromDB,
    staleTime: 10_000, // 10s
  })

  // ── Polling para órdenes pendientes ─────────────────────────────────────
  useEffect(() => {
    const hasPending = ordersQuery.data?.some(o =>
      PENDING_STATUSES.includes(o.status)
    )

    if (hasPending) {
      if (!pollingRef.current) {
        pollingRef.current = setInterval(async () => {
          await syncPendingOrders(ordersQuery.data ?? [])
          queryClient.invalidateQueries({ queryKey: ORDERS_KEY })
        }, POLL_INTERVAL_MS)
      }
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [ordersQuery.data, queryClient])

  // ── POST nueva orden ─────────────────────────────────────────────────────
  const submitOrder = useMutation<
    { order: Order; alpaca_order: unknown },
    Error,
    SubmitOrderPayload
  >({
    mutationFn: async (payload) => {
      const res = await callAlpacaProxy('/orders', {
        method: 'POST',
        body: JSON.stringify({
          symbol:                   payload.symbol,
          side:                     payload.side,
          order_type:               payload.order_type,
          qty:                      payload.qty,
          limit_price:              payload.limit_price ?? undefined,
          stop_price:               payload.stop_loss ?? undefined,     // stop order price
          stop_loss_price:          payload.stop_loss ?? undefined,     // snapshot
          target_price:             payload.target ?? undefined,
          risk_amount:              payload.risk_amount,
          portfolio_weight_at_order: payload.portfolio_weight_at_order,
          risk_reward_ratio:        payload.risk_reward_ratio,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
      }

      return res.json()
    },
    onSuccess: () => {
      // Invalidar cache para recargar historial inmediatamente
      queryClient.invalidateQueries({ queryKey: ORDERS_KEY })
    },
  })

  return {
    orders:       ordersQuery.data ?? [],
    isLoading:    ordersQuery.isLoading,
    isError:      ordersQuery.isError,
    error:        ordersQuery.error,
    submitOrder,
    refetch:      ordersQuery.refetch,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch órdenes desde Supabase DB
// ─────────────────────────────────────────────────────────────────────────────

async function fetchOrdersFromDB(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('submitted_at', { ascending: false })
    .limit(100)

  if (error) throw new Error(error.message)
  return (data ?? []) as Order[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Sincronizar status de órdenes pendientes consultando a Alpaca via proxy
// ─────────────────────────────────────────────────────────────────────────────

async function syncPendingOrders(orders: Order[]): Promise<void> {
  const pending = orders.filter(o => PENDING_STATUSES.includes(o.status))
  if (pending.length === 0) return

  try {
    // Consultar Alpaca para órdenes abiertas
    const res = await callAlpacaProxy('/orders?status=open&limit=50')
    if (!res.ok) return

    const alpacaOrders = await res.json() as AlpacaOrderStatus[]

    // Mapear broker_order_id → status de Alpaca
    const statusMap = new Map<string, { status: string; filled_qty: string; filled_avg_price: string; filled_at: string | null }>()
    for (const ao of alpacaOrders) {
      statusMap.set(ao.id, {
        status:           ao.status,
        filled_qty:       ao.filled_qty ?? '0',
        filled_avg_price: ao.filled_avg_price ?? '0',
        filled_at:        ao.filled_at ?? null,
      })
    }

    // Actualizar en Supabase los que tienen nuevo status
    for (const order of pending) {
      const alpaca = statusMap.get(order.broker_order_id)
      if (!alpaca) continue

      const newStatus = mapAlpacaStatus(alpaca.status)
      if (newStatus !== order.status) {
        await supabase
          .from('orders')
          .update({
            status:           newStatus,
            filled_qty:       parseFloat(alpaca.filled_qty) || null,
            filled_avg_price: parseFloat(alpaca.filled_avg_price) || null,
            filled_at:        alpaca.filled_at,
          })
          .eq('id', order.id)
      }
    }
  } catch (e) {
    console.warn('syncPendingOrders error:', e)
  }
}

function mapAlpacaStatus(alpacaStatus: string): Order['status'] {
  const map: Record<string, Order['status']> = {
    new:               'accepted',
    partially_filled:  'partially_filled',
    filled:            'filled',
    done_for_day:      'cancelled',
    canceled:          'cancelled',
    expired:           'cancelled',
    replaced:          'cancelled',
    pending_cancel:    'accepted',
    pending_replace:   'accepted',
    accepted:          'accepted',
    accepted_for_bidding: 'accepted',
    stopped:           'cancelled',
    rejected:          'rejected',
    suspended:         'rejected',
    calculated:        'accepted',
  }
  return map[alpacaStatus] ?? 'pending'
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipo local para respuesta de Alpaca
// ─────────────────────────────────────────────────────────────────────────────

interface AlpacaOrderStatus {
  id: string
  status: string
  filled_qty: string | null
  filled_avg_price: string | null
  filled_at: string | null
}
