// ─────────────────────────────────────────────────────────────────────────────
// src/hooks/useFlightPlanExport.ts
// Hook para exportar candidatos seleccionados a formato JSON para el Plan de Vuelo
// ─────────────────────────────────────────────────────────────────────────────

export interface FlightPlanCandidate {
  symbol: string
  name: string
  price: number
  score: number
  aiNote: string
  revGrowthPct: number
  athDistPct: number
  nextEarningsDate?: string
}

export interface FlightPlanExport {
  date: string
  generatedAt: string
  source: 'tradeos-screener'
  candidates: FlightPlanCandidate[]
}

// Custom toast helper compatible con la firma de Sonner pero integrado en TradeOS
export const toast = {
  error: (msg: string): void => {
    window.dispatchEvent(
      new CustomEvent('tradeos-toast', {
        detail: {
          title: 'Error',
          message: msg,
          color: 'var(--color-loss)',
        },
      })
    );
  },
  success: (msg: string, options?: { description?: string }): void => {
    window.dispatchEvent(
      new CustomEvent('tradeos-toast', {
        detail: {
          title: 'Éxito',
          message: options?.description ? `${msg}. ${options.description}` : msg,
          color: 'var(--color-profit)',
        },
      })
    );
  }
};

export function useFlightPlanExport() {
  function exportCandidates(candidates: FlightPlanCandidate[]): void {
    if (candidates.length === 0) {
      toast.error('Selecciona al menos un candidato')
      return
    }
    if (candidates.length > 3) {
      toast.error('Máximo 3 candidatos por Plan de Vuelo')
      return
    }

    const today = new Date()
    const dateStr = today.toISOString().split('T')[0]

    const payload: FlightPlanExport = {
      date: dateStr,
      generatedAt: today.toISOString(),
      source: 'tradeos-screener',
      candidates,
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `candidatos_${dateStr}.json`
    a.click()
    URL.revokeObjectURL(url)

    toast.success(
      `${candidates.length} candidato${candidates.length > 1 ? 's' : ''} exportado${candidates.length > 1 ? 's' : ''}`,
      { description: `Mueve candidatos_${dateStr}.json a cowork-workspace/inbox/` }
    )
  }

  return { exportCandidates }
}
