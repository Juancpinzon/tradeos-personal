// ─────────────────────────────────────────────────────────────────────────────
// src/components/screener/ScreenerCriteriaForm.tsx
// Formulario de criterios con rangos y toggles
// Recibe criteria y onChange via props — sin estado global propio
// ─────────────────────────────────────────────────────────────────────────────

import type { ScreenerCriteria } from '../../types'

interface ScreenerCriteriaFormProps {
  criteria: ScreenerCriteria
  onChange: (updated: ScreenerCriteria) => void
  isRunning?: boolean
  onRun: () => void
  onSave?: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components de campo
// ─────────────────────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: '0.6875rem',
      color: 'var(--text-muted)',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.06em',
      fontWeight: 600,
      display: 'block',
      marginBottom: '0.3rem',
    }}>
      {children}
    </span>
  )
}

function NumberInput({
  value, placeholder, onChange,
}: { value?: number; placeholder: string; onChange: (v: number | undefined) => void }) {
  return (
    <input
      type="number"
      className="input-base font-mono"
      placeholder={placeholder}
      value={value ?? ''}
      style={{ fontSize: '0.8125rem', padding: '0.4rem 0.6rem' }}
      onChange={e => {
        const v = e.target.value === '' ? undefined : parseFloat(e.target.value)
        onChange(v)
      }}
    />
  )
}

function Toggle({
  checked, label, onChange,
}: { checked: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <label style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.625rem',
      cursor: 'pointer',
      userSelect: 'none' as const,
    }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: '34px',
          height: '20px',
          borderRadius: '10px',
          backgroundColor: checked ? 'var(--color-primary)' : 'var(--bg-elevated)',
          border: `1px solid ${checked ? 'var(--color-primary)' : 'var(--border-default)'}`,
          position: 'relative',
          transition: 'background-color 150ms',
          flexShrink: 0,
          cursor: 'pointer',
        }}
      >
        <div style={{
          position: 'absolute',
          top: '2px',
          left: checked ? '16px' : '2px',
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          backgroundColor: checked ? 'white' : 'var(--text-muted)',
          transition: 'left 150ms',
        }} />
      </div>
      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{label}</span>
    </label>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ScreenerCriteriaForm
// ─────────────────────────────────────────────────────────────────────────────

export default function ScreenerCriteriaForm({
  criteria, onChange, isRunning = false, onRun, onSave,
}: ScreenerCriteriaFormProps) {
  function patch(partial: Partial<ScreenerCriteria>) {
    onChange({ ...criteria, ...partial })
  }

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: '0.5rem',
      padding: '1rem 1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    }}>
      {/* Asset class selector */}
      <div>
        <FieldLabel>Clase de activo</FieldLabel>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(['equity', 'crypto', 'both'] as const).map(cls => (
            <button
              key={cls}
              onClick={() => patch({ asset_class: cls })}
              style={{
                padding: '0.375rem 0.875rem',
                borderRadius: '0.375rem',
                border: `1px solid ${criteria.asset_class === cls ? 'var(--color-primary)' : 'var(--border-default)'}`,
                backgroundColor: criteria.asset_class === cls ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: criteria.asset_class === cls ? 'var(--color-primary)' : 'var(--text-muted)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: '"Syne", sans-serif',
                textTransform: 'capitalize' as const,
                transition: 'all 120ms',
              }}
            >
              {cls === 'both' ? 'Ambos' : cls === 'equity' ? 'Acciones' : 'Cripto'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de campos numéricos */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '0.75rem',
      }}>
        <div>
          <FieldLabel>Market Cap mín. ($)</FieldLabel>
          <NumberInput
            value={criteria.market_cap_min}
            placeholder="ej. 2000000000"
            onChange={v => patch({ market_cap_min: v })}
          />
        </div>
        <div>
          <FieldLabel>Precio mín. ($)</FieldLabel>
          <NumberInput
            value={criteria.price_min}
            placeholder="ej. 10"
            onChange={v => patch({ price_min: v })}
          />
        </div>
        <div>
          <FieldLabel>Rev. growth mín. (%)</FieldLabel>
          <NumberInput
            value={criteria.revenue_growth_min_pct}
            placeholder="ej. 20"
            onChange={v => patch({ revenue_growth_min_pct: v })}
          />
        </div>
        <div>
          <FieldLabel>Volumen prom. mín.</FieldLabel>
          <NumberInput
            value={criteria.volume_avg_min}
            placeholder="ej. 200000"
            onChange={v => patch({ volume_avg_min: v })}
          />
        </div>
        <div>
          <FieldLabel>Dist. ATH máx. (%)</FieldLabel>
          <NumberInput
            value={criteria.ath_distance_max_pct}
            placeholder="ej. -20"
            onChange={v => patch({ ath_distance_max_pct: v })}
          />
        </div>
        <div>
          <FieldLabel>RSI semanal mín.</FieldLabel>
          <NumberInput
            value={criteria.rsi_weekly_min}
            placeholder="ej. 50"
            onChange={v => patch({ rsi_weekly_min: v })}
          />
        </div>
        <div>
          <FieldLabel>RSI semanal máx.</FieldLabel>
          <NumberInput
            value={criteria.rsi_weekly_max}
            placeholder="ej. 70"
            onChange={v => patch({ rsi_weekly_max: v })}
          />
        </div>
        <div>
          <FieldLabel>Sector</FieldLabel>
          <select
            className="input-base"
            value={criteria.sector ?? ''}
            style={{ fontSize: '0.8125rem', padding: '0.4rem 0.6rem' }}
            onChange={e => patch({ sector: e.target.value || undefined })}
          >
            <option value="">Todos</option>
            {['Technology', 'Healthcare', 'Finance', 'Consumer', 'Energy', 'Industrials', 'Materials', 'Utilities'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Toggles */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <Toggle
          checked={criteria.eps_next_positive}
          label="EPS próximo positivo"
          onChange={v => patch({ eps_next_positive: v })}
        />
        <Toggle
          checked={criteria.exclude_dividends ?? false}
          label="Sin dividendos"
          onChange={v => patch({ exclude_dividends: v })}
        />
      </div>

      {/* Botones */}
      <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
        {onSave && (
          <button
            onClick={onSave}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: '1px solid var(--border-default)',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: '0.8125rem',
              cursor: 'pointer',
              fontFamily: '"Syne", sans-serif',
              fontWeight: 500,
            }}
          >
            💾 Guardar preset
          </button>
        )}
        <button
          id="screener-run-btn"
          onClick={onRun}
          disabled={isRunning}
          style={{
            padding: '0.5rem 1.375rem',
            borderRadius: '0.375rem',
            border: 'none',
            backgroundColor: isRunning ? 'var(--bg-elevated)' : 'var(--color-primary)',
            color: isRunning ? 'var(--text-muted)' : 'white',
            fontSize: '0.8125rem',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            fontFamily: '"Syne", sans-serif',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'background-color 150ms',
          }}
        >
          {isRunning ? (
            <>
              <span style={{ display: 'inline-block', animation: 'spin 0.9s linear infinite' }}>⟳</span>
              Corriendo...
            </>
          ) : (
            <>▶ Correr Screener</>
          )}
        </button>
      </div>
    </div>
  )
}
