import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { JournalEntry } from '../types'

export function useJournal() {
  const queryClient = useQueryClient()

  // 1. Obtener todas las entradas
  const { data: entries = [], isLoading, error } = useQuery<JournalEntry[]>({
    queryKey: ['journal-entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as JournalEntry[]
    }
  })

  // 2. Crear entrada
  const addEntry = useMutation({
    mutationFn: async (entry: Partial<JournalEntry>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { data, error } = await supabase
        .from('journal_entries')
        .insert({ ...entry, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
    }
  })

  // 3. Actualizar entrada
  const updateEntry = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<JournalEntry> }) => {
      const { error } = await supabase
        .from('journal_entries')
        .update(updates)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
    }
  })

  // 4. Eliminar entrada
  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
    }
  })

  return {
    entries,
    isLoading,
    error,
    addEntry: addEntry.mutateAsync,
    updateEntry: updateEntry.mutateAsync,
    deleteEntry: deleteEntry.mutateAsync,
    isAdding: addEntry.isPending,
    isUpdating: updateEntry.isPending
  }
}
