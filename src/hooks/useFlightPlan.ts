// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/useFlightPlan.ts
// Hook para la gestión del Plan de Vuelo Diario
// ─────────────────────────────────────────────────────────────────────────────

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { FlightPlan, FlightPlanCandidate } from '../types'

export function useFlightPlan() {
  const queryClient = useQueryClient()
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  // 1. Obtener plan de hoy
  const { data: plan, isLoading, error } = useQuery<FlightPlan | null>({
    queryKey: ['flight-plan', todayStr],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('flight_plans')
        .select('*, candidates:flight_plan_candidates(*)')
        .eq('user_id', user.id)
        .eq('date', todayStr)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error
      return data as FlightPlan
    }
  })

  // 2. Obtener lección del plan anterior
  const { data: lastPlan } = useQuery<FlightPlan | null>({
    queryKey: ['flight-plan-last'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('flight_plans')
        .select('*')
        .eq('user_id', user.id)
        .lt('date', todayStr)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      return data as FlightPlan
    }
  })

  // 3. Crear o inicializar plan de hoy
  const initPlan = useMutation({
    mutationFn: async (market: 'NYSE' | 'crypto' | 'both') => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { data, error } = await supabase
        .from('flight_plans')
        .insert({
          user_id: user.id,
          date: todayStr,
          market,
          max_operations: 5
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flight-plan', todayStr] })
    }
  })

  // 4. Actualizar campos del plan
  const updatePlan = useMutation({
    mutationFn: async (updates: Partial<FlightPlan>) => {
      if (!plan?.id) {
        console.warn('[useFlightPlan] updatePlan: plan.id is undefined, aborting update')
        return
      }
      console.log('[useFlightPlan] updatePlan — id:', plan.id, '| updates:', updates)
      const result = await supabase
        .from('flight_plans')
        .update(updates)
        .eq('id', plan.id)
        .select()
        .single()
      console.log('[useFlightPlan] Supabase response:', result)
      if (result.error) throw result.error
      return result.data
    },
    onSuccess: (_data, variables) => {
      // Aplicar el update al cache inmediatamente para que la UI refleje el cambio
      // sin esperar el round-trip de la invalidación
      queryClient.setQueryData<FlightPlan | null>(
        ['flight-plan', todayStr],
        (old) => old ? { ...old, ...variables } : old
      )
      // Invalidar para re-fetch en background y confirmar consistencia
      queryClient.invalidateQueries({ queryKey: ['flight-plan', todayStr] })
    },
    onError: (err) => {
      console.error('[useFlightPlan] updatePlan failed:', err)
    }
  })

  // 5. Gestión de candidatos
  const addCandidate = useMutation({
    mutationFn: async (candidate: Partial<FlightPlanCandidate>) => {
      if (!plan?.id) throw new Error('Plan no inicializado')
      const { error } = await supabase
        .from('flight_plan_candidates')
        .insert({
          ...candidate,
          flight_plan_id: plan.id
        })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flight-plan', todayStr] })
    }
  })

  const updateCandidate = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<FlightPlanCandidate> }) => {
      const { error } = await supabase
        .from('flight_plan_candidates')
        .update(updates)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flight-plan', todayStr] })
    }
  })

  const deleteCandidate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('flight_plan_candidates')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flight-plan', todayStr] })
    }
  })

  return {
    plan,
    lastPlan,
    isLoading,
    error,
    initPlan: initPlan.mutateAsync,
    updatePlan: updatePlan.mutateAsync,
    addCandidate: addCandidate.mutateAsync,
    updateCandidate: updateCandidate.mutateAsync,
    deleteCandidate: deleteCandidate.mutateAsync,
    isInitializing: initPlan.isPending,
    isUpdating: updatePlan.isPending
  }
}
