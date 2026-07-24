// ─────────────────────────────────────────────────────────────────────────────
// src/pages/Manual.tsx — Manual de usuario integrado
// Guía visual ilustrada: contenido en español (Colombia), iconos lucide-react,
// tarjetas de pasos numeradas, callouts de color por tipo (regla / tip / ejemplo)
// y diagramas de flujo en CSS. Conserva el índice lateral con scroll-spy y anchors.
// Fuente de prosa espejo (plano): docs/manual_usuario.md
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  LayoutDashboard,
  Telescope,
  TrendingUp,
  BookMarked,
  Rocket,
  Gauge,
  Palette,
  SlidersHorizontal,
  Search,
  Table,
  ClipboardList,
  Plane,
  ShoppingCart,
  ShieldCheck,
  BookOpen,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  Info,
  Flag,
  type LucideIcon,
} from 'lucide-react'
import { useMediaQuery } from '../hooks/useMediaQuery'

// ── Modelo de secciones (índice + scroll-spy) ────────────────────────────────

interface ManualSection {
  id:    string
  num:   string
  label: string
  icon:  LucideIcon
}

const SECTIONS: ManualSection[] = [
  { id: 'primer-dia-en-tradeos',                num: '01', label: 'Primer día en TradeOS',          icon: LayoutDashboard },
  { id: 'flujo-para-generar-opciones',          num: '02', label: 'Generar opciones de inversión',  icon: Telescope },
  { id: 'flujo-para-operar',                    num: '03', label: 'Flujo para operar',              icon: TrendingUp },
  { id: 'referencia-rapida',                    num: '04', label: 'Referencia rápida',              icon: BookMarked },
  { id: 'ejemplo-completo',                     num: '05', label: 'Ejemplo completo',               icon: Rocket },
]

// ── Piezas visuales reutilizables ────────────────────────────────────────────

function SubHead({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <h3 className="m-subhead">
      <span className="m-subhead-icon"><Icon size={15} strokeWidth={2.25} /></span>
      <span>{children}</span>
    </h3>
  )
}

function Steps({ children }: { children: ReactNode }) {
  return <ol className="m-steps">{children}</ol>
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="m-step">
      <span className="m-step-num">{String(n).padStart(2, '0')}</span>
      <div className="m-step-body">{children}</div>
    </li>
  )
}

type CalloutVariant = 'warning' | 'tip' | 'example' | 'info'

function Callout({
  variant,
  icon: Icon,
  title,
  children,
}: {
  variant: CalloutVariant
  icon: LucideIcon
  title: string
  children: ReactNode
}) {
  return (
    <div className={`m-callout m-callout--${variant}`} role="note">
      <div className="m-callout-head">
        <Icon size={16} strokeWidth={2.25} />
        <span>{title}</span>
      </div>
      <div className="m-callout-body">{children}</div>
    </div>
  )
}

function Flow({ items }: { items: { label: string; icon: LucideIcon }[] }) {
  return (
    <div className="m-flow" role="list" aria-label="Diagrama de flujo">
      {items.map((item, i) => {
        const Icon = item.icon
        return (
          <div className="m-flow-seg" key={item.label} role="listitem">
            <div className="m-flow-node">
              <span className="m-flow-node-icon"><Icon size={18} strokeWidth={2} /></span>
              <span className="m-flow-node-label">{item.label}</span>
            </div>
            {i < items.length - 1 && (
              <span className="m-flow-arrow" aria-hidden="true">
                <ArrowRight size={16} strokeWidth={2.5} />
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Section({
  section,
  children,
}: {
  section: ManualSection
  children: ReactNode
}) {
  const Icon = section.icon
  return (
    <section className="m-section">
      <h2 id={section.id} className="m-h2">
        <span className="m-h2-icon"><Icon size={20} strokeWidth={2} /></span>
        <span className="m-h2-num">{section.num}</span>
        <span className="m-h2-label">{section.label}</span>
      </h2>
      {children}
    </section>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function Manual() {
  const isNarrow = useMediaQuery('(max-width: 900px)')
  const sections = useMemo(() => SECTIONS, [])
  const [activeId, setActiveId] = useState<string>(() => sections[0]?.id ?? '')

  // Scroll-spy: la sección cuyo heading cruza la banda superior queda activa
  useEffect(() => {
    const headings = sections
      .map(s => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null)
    if (headings.length === 0) return

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id)
        }
      },
      { rootMargin: '-8% 0px -78% 0px', threshold: 0 },
    )
    headings.forEach(h => observer.observe(h))
    return () => observer.disconnect()
  }, [sections])

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    setActiveId(id)
  }

  // TOC — rail vertical (desktop) o chips horizontales sticky (mobile)
  const toc = (
    <nav
      aria-label="Índice del manual"
      className={isNarrow ? 'manual-toc manual-toc--chips no-print' : 'manual-toc no-print'}
      style={
        isNarrow
          ? {
              position: 'sticky',
              top: 0,
              zIndex: 40,
              display: 'flex',
              gap: '0.5rem',
              overflowX: 'auto',
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--bg-base)',
              borderBottom: '1px solid var(--border-subtle)',
            }
          : {
              position: 'sticky',
              top: '1.5rem',
              alignSelf: 'start',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.125rem',
            }
      }
    >
      {!isNarrow && <div className="manual-toc-title">Índice</div>}
      {sections.map(section => {
        const isActive = section.id === activeId
        const Icon = section.icon
        return (
          <button
            key={section.id}
            onClick={() => scrollTo(section.id)}
            aria-current={isActive ? 'true' : undefined}
            className={`manual-toc-item${isActive ? ' active' : ''}`}
          >
            <span className="manual-toc-icon"><Icon size={15} strokeWidth={2} /></span>
            <span className="manual-toc-num">{section.num}</span>
            <span className="manual-toc-label">{section.label}</span>
          </button>
        )
      })}
    </nav>
  )

  return (
    <div
      style={
        isNarrow
          ? { display: 'flex', flexDirection: 'column' }
          : {
              display: 'grid',
              gridTemplateColumns: '248px minmax(0, 1fr)',
              gap: '2.5rem',
              maxWidth: '1180px',
              padding: '1.5rem 2rem 4rem',
              width: '100%',
              boxSizing: 'border-box',
            }
      }
    >
      {toc}

      <article
        className="manual-md"
        style={{
          maxWidth: '820px',
          minWidth: 0,
          padding: isNarrow ? '1.25rem 1rem 4rem' : 0,
          boxSizing: 'border-box',
        }}
      >
        {/* ── Hero ── */}
        <header className="manual-hero">
          <span className="manual-hero-kicker">Guía operativa · TradeOS</span>
          <h1 className="manual-h1">Manual de Usuario</h1>
          <p className="manual-hero-lead">
            Este manual es para ti: ya tienes cuenta creada, sesión activa y experiencia en
            trading. Aquí no hay teoría de mercados ni instalación técnica, solo cómo usar TradeOS
            para dos objetivos concretos: <strong>generar opciones de inversión</strong>{' '}
            (Screener → Research → Plan de Vuelo) y <strong>operar acciones</strong>{' '}
            (Plan de Vuelo → Trading → Journal).
          </p>
        </header>

        <Callout variant="info" icon={ShieldCheck} title="Estás en modo simulación (PAPER)">
          El badge <code>PAPER</code> junto al logo significa que toda la app corre en modo
          simulación. Ninguna orden toca dinero real hasta que actives live trading explícitamente
          en Settings, y no hay razón para hacerlo hasta dominar el flujo completo.
        </Callout>

        {/* ══ 01 · Primer día ══════════════════════════════════════════════ */}
        <Section section={SECTIONS[0]!}>
          <SubHead icon={LayoutDashboard}>El Dashboard de un vistazo</SubHead>
          <Steps>
            <Step n={1}>
              Abre <strong>Dashboard</strong> (primer ítem del sidebar). Es tu pantalla de inicio y
              la foto completa de tu capital.
            </Step>
            <Step n={2}>
              Mira la fila superior: <code>Equity Total</code> (valor total de la cuenta),{' '}
              <code>PnL Hoy</code> (resultado del día en dólares y porcentaje), <code>Cash</code>{' '}
              (efectivo disponible) y <code>Buying Power</code> (poder de compra). Debajo, los
              badges <code>Alpaca</code> y <code>Binance</code> muestran cuánto aporta cada broker
              al total.
            </Step>
            <Step n={3}>
              Revisa <code>Posiciones Abiertas</code>: cada tarjeta muestra cantidad, precio de
              entrada, valor actual y PnL no realizado. Haz clic en una posición y vas directo a
              Trading con ese símbolo cargado.
            </Step>
            <Step n={4}>
              El gráfico <code>Equity — últimos 30 días</code> muestra la evolución de tu capital.
              Si se ve plano, no operaste o el mercado te dio tregua.
            </Step>
            <Step n={5}>
              <code>Próximos Eventos</code> lista los earnings de tus posiciones y watchlist en los
              próximos 30 días. Un earnings encima de una posición abierta es volatilidad
              garantizada: conviene saberlo antes, no después.
            </Step>
            <Step n={6}>
              Si ves el badge <code>actualizando...</code> en el header, la app está sincronizando
              con el broker en segundo plano. Lo que ves en pantalla viene del cache local; por eso
              el Dashboard carga en menos de 2 segundos siempre.
            </Step>
            <Step n={7}>
              Si ya creaste el plan del día, el widget <code>PLAN DE VUELO</code> muestra el avance
              del <code>Checklist de Pre-Sesión</code> y tus candidatos ejecutados.
            </Step>
            <Step n={8}>
              Los domingos puede aparecer un banner ámbar avisando que tienes operaciones sin
              post-mortem esta semana. Haz clic en <code>Revisar ahora →</code> para cerrarlas: el
              Journal sin post-mortem es solo un diario, no una herramienta de mejora.
            </Step>
          </Steps>

          <SubHead icon={Palette}>Colores y números: cómo leerlos</SubHead>
          <ul className="m-list">
            <li>Verde = ganancia, rojo = pérdida, gris = neutro. Aplica a PnL, porcentajes y velas del chart.</li>
            <li>
              Los porcentajes siempre llevan signo explícito: <code>+2.3%</code> / <code>-1.1%</code>.
              Los precios y PnL van en fuente monoespaciada para comparar dígitos de un vistazo.
            </li>
            <li>
              Badge amarillo con ícono de calendario en una posición = earnings en menos de 7 días.
              Trátalo como alerta, no como decoración.
            </li>
            <li>Score del Screener: badge verde (≥ 80), ámbar (60–79), gris (menos de 60).</li>
            <li>
              <code>Nivel de convicción</code> en el Journal: 5 puntos tipo semáforo, de 1 (rojo,
              «Muy bajo») a 5 (verde, «Muy alto»).
            </li>
            <li>
              En el Screener, la estrella dorada marca símbolos que ya tienes en el portafolio y el
              ícono de ojo los que ya están en tu watchlist.
            </li>
          </ul>

          <SubHead icon={SlidersHorizontal}>Configura el riesgo antes de operar</SubHead>
          <Steps>
            <Step n={1}>
              Abre <strong>Settings</strong> y ve a la sección <code>Gestión de Riesgo</code>.
            </Step>
            <Step n={2}>
              Define <code>Riesgo por Operación (%)</code>: el capital máximo a arriesgar en un solo
              trade (default: 2%). De este número el Risk Calculator deriva la cantidad sugerida en
              cada orden; es la configuración más importante de toda la app.
            </Step>
            <Step n={3}>
              Define <code>Tamaño Máximo de Posición (%)</code>: el peso máximo de un activo en tu
              portafolio (default: 15%). Si una orden lo supera, verás advertencias en el formulario
              y en el modal de confirmación.
            </Step>
            <Step n={4}>
              En <code>API Keys (validación de conexión)</code> confirma que <code>Alpaca (NYSE)</code>{' '}
              y <code>Binance (Cripto)</code> estén en estado <code>CONECTADO</code>. Si no, ingresa
              las keys y presiona <code>Guardar y Verificar</code>.
            </Step>
            <Step n={5}>
              En <code>Modo de Trading</code> verifica que diga <code>PAPER TRADING ACTIVADO</code>.
            </Step>
            <Step n={6}>
              Opcional: si traes historial de operaciones en Excel, usa <code>Importar desde Excel</code>{' '}
              (sección <em>Importar historial de operaciones</em>) para que el Journal y sus
              estadísticas arranquen con tu experiencia real, no desde cero.
            </Step>
          </Steps>

          <Callout variant="tip" icon={Lightbulb} title="El número que rige todo">
            <code>Riesgo por Operación (%)</code> es la palanca que alimenta al Risk Calculator en
            cada orden. Ajústalo una vez, con criterio, y déjalo trabajar: es lo que convierte cada
            trade en una apuesta de tamaño consistente en lugar de una corazonada.
          </Callout>
        </Section>

        {/* ══ 02 · Generar opciones de inversión ═══════════════════════════ */}
        <Section section={SECTIONS[1]!}>
          <Flow
            items={[
              { label: 'Screener', icon: Search },
              { label: 'Research', icon: Telescope },
              { label: 'Plan de Vuelo', icon: ClipboardList },
            ]}
          />

          <SubHead icon={Search}>Ejecutar el Screener</SubHead>
          <Steps>
            <Step n={1}>Abre <strong>Screener</strong>.</Step>
            <Step n={2}>
              En <code>Seleccionar Preset...</code> carga un preset guardado. Vienen dos por
              defecto: <code>Momentum Growth</code> (empresas en crecimiento con momentum, revenue
              growth ≥ 20%) y <code>Breakout Técnico</code> (cerca de máximos con RSI semanal entre
              50 y 70). Al cargar, los criterios llenan el formulario.
            </Step>
            <Step n={3}>
              Ajusta los criterios que quieras: <code>Market Cap Mín.</code>,{' '}
              <code>Precio Mínimo ($)</code>, <code>Revenue Growth Mín. (%)</code>,{' '}
              <code>Distancia ATH Máx. (%)</code>, <code>RSI Semanal (Rango)</code>, los toggles{' '}
              <code>EPS Próx. Positivo</code> y <code>Excluir con Dividendos</code>, y{' '}
              <code>Tipo de Activo</code> (Equity, Cripto o Ambos).
            </Step>
            <Step n={4}>
              Si la combinación te sirve para repetir, guárdala: botón de disquete{' '}
              (<code>Guardar como preset</code>), nombre descriptivo, <code>Guardar</code>.
            </Step>
            <Step n={5}>
              Haz clic en <code>Correr</code>. Mientras ves <code>Ejecutando Análisis IA...</code>,
              el sistema filtra el universo cacheado de tickers, enriquece los candidatos con
              fundamentales y le pide a la IA que puntúe cada uno considerando tu portafolio actual.
            </Step>
          </Steps>

          <SubHead icon={Table}>Leer los resultados</SubHead>
          <Steps>
            <Step n={1}>
              Empieza por el bloque <code>RESUMEN DE LA IA</code>: dice qué encontró la corrida y
              cómo se relaciona con tu portafolio, qué complementa tus posiciones y qué duplicaría
              exposición.
            </Step>
            <Step n={2}>
              La tabla es ordenable por columna: <code>Symbol</code>, <code>Nombre</code>,{' '}
              <code>Precio</code>, <code>Market Cap</code>, <code>Rev Growth</code>,{' '}
              <code>ATH%</code>, <code>RSI</code>, <code>EPS Est</code> y <code>Score</code>.
            </Step>
            <Step n={3}>
              El <code>Score</code> (0–100) lo asigna la IA combinando momentum, fundamentales y
              técnica. Verde (≥ 80): candidato fuerte. Ámbar (60–79): interesante con reservas.
              Gris (menos de 60): débil frente a tus criterios.
            </Step>
            <Step n={4}>
              Pasa el mouse sobre una fila para leer la nota de la IA: una o dos líneas explicando
              por qué ese símbolo destaca (o qué le falta).
            </Step>
            <Step n={5}>
              La estrella dorada = ya está en tu portafolio (una compra sería ampliar posición, no
              diversificar). El ícono de ojo = ya está en tu watchlist.
            </Step>
          </Steps>

          <SubHead icon={Telescope}>Profundizar con el Research Agent</SubHead>
          <Steps>
            <Step n={1}>
              Haz clic en cualquier fila de resultados: se abre <strong>Research</strong> con el
              símbolo precargado.
            </Step>
            <Step n={2}>
              Presiona <code>Analizar</code>, o antes elige una de las preguntas rápidas (por
              ejemplo <em>«¿Hay setup válido hoy o esperamos?»</em>) o escribe la tuya en{' '}
              <code>¿QUÉ QUIERES SABER?</code>.
            </Step>
            <Step n={3}>
              El análisis llega en streaming con 7 secciones fijas: <code>📊 CUADRO DE MANDO</code>,{' '}
              <code>📈 TESIS DE INVERSIÓN</code>, <code>📉 ANÁLISIS FUNDAMENTAL</code>,{' '}
              <code>💼 TU EXPOSICIÓN</code> (solo si tienes posición), <code>⚠️ RIESGOS</code>,{' '}
              <code>📐 NIVELES TÉCNICOS</code> y <code>📅 PRÓXIMO CATALIZADOR</code>.
            </Step>
            <Step n={4}>
              Contrasta siempre contra el panel <code>DATOS FUENTE</code> de la derecha:{' '}
              <code>PRECIO</code>, <code>DIST. ATH</code>, <code>RSI SEMANAL</code>,{' '}
              <code>EPS ACTUAL</code>, <code>VOLUMEN PROM.</code>, <code>REV. GROWTH YoY</code>,{' '}
              <code>P/E RATIO</code> y <code>PRÓX. EARNINGS</code>. Es el snapshot exacto de datos
              que usó la IA; la regla de la casa es que sin datos fuente visibles, el análisis no
              vale.
            </Step>
            <Step n={5}>
              Si tienes posición en el símbolo, el panel <code>TU POSICIÓN</code> muestra cantidad,
              entrada, PnL y peso en el portafolio, y la sección <code>💼 TU EXPOSICIÓN</code> del
              análisis recomienda mantener, recortar o ampliar con números concretos.
            </Step>
          </Steps>

          <SubHead icon={Plane}>Enviar candidatos al Plan de Vuelo</SubHead>
          <Steps>
            <Step n={1}>
              Prerequisito: tener inicializado el plan del día en <strong>Plan de Vuelo</strong>. Si
              no lo hiciste, la app te frena y te pide inicializar primero el Plan de Vuelo del día.
            </Step>
            <Step n={2}>
              En la fila del candidato elegido, haz clic en el botón de avión{' '}
              (<code>Agregar al Plan de Vuelo</code>). Para enviar varios de una vez: marca sus
              checkboxes y usa <code>Exportar al Plan de Vuelo (n/3)</code>.
            </Step>
            <Step n={3}>
              El límite es 3 candidatos por día; si intentas más, la app lo bloquea con «Máximo 3
              candidatos por Plan de Vuelo». No es un bug: es disciplina de foco.
            </Step>
            <Step n={4}>
              Abre <strong>Plan de Vuelo</strong> y completa lo que le falte a cada candidato: stop,
              target y tesis (paso a paso en la sección 3).
            </Step>
          </Steps>
        </Section>

        {/* ══ 03 · Flujo para operar ═══════════════════════════════════════ */}
        <Section section={SECTIONS[2]!}>
          <Flow
            items={[
              { label: 'Plan de Vuelo', icon: ClipboardList },
              { label: 'Trading', icon: TrendingUp },
              { label: 'Confirmar', icon: ShoppingCart },
              { label: 'Journal', icon: BookOpen },
              { label: 'Post-mortem', icon: Flag },
            ]}
          />

          <SubHead icon={ClipboardList}>Completar el Plan de Vuelo antes de la apertura</SubHead>
          <Steps>
            <Step n={1}>
              Abre <strong>Plan de Vuelo</strong> antes de la apertura del mercado (9:30 AM ET para
              NYSE).
            </Step>
            <Step n={2}>
              Primera vez del día: en <code>PREPARAR PLAN DE VUELO</code> elige el mercado de la
              sesión — <code>NYSE / NASDAQ</code>, <code>CRIPTO</code> o <code>AMBOS</code>.
            </Step>
            <Step n={3}>
              Si cerraste sesión el día anterior, arriba aparece{' '}
              <code>LECCIÓN DE LA SESIÓN ANTERIOR</code> con lo que escribiste al cierre. Léela
              antes de planear: existe exactamente para eso.
            </Step>
            <Step n={4}>
              Completa <code>CONTEXTO DEL DÍA</code>: <code>SPY Close Ayer</code>,{' '}
              <code>Nivel VIX</code>, <code>Bias del Mercado</code> (<code>Neutral</code>,{' '}
              <code>Bullish</code> o <code>Bearish</code>) y <code>Noticias Relevantes</code>{' '}
              (CPI, Fed, earnings del día).
            </Step>
            <Step n={5}>
              En <code>CANDIDATOS DEL DÍA (MÁX. 3)</code> carga cada candidato con{' '}
              <code>Agregar Candidato</code> (los que exportaste del Screener ya están):{' '}
              <code>Símbolo</code>, <code>Tipo de Setup</code> (Breakout, Pullback, Reversión,
              Earnings Play, Momentum, etc.), <code>Tipo de Trade</code> (<code>Intraday</code> o{' '}
              <code>Swing</code>), <code>Precio de Entrada</code>, <code>Stop Loss</code>,{' '}
              <code>Target</code> y <code>Tesis de Entrada</code> en una oración. El R/R se calcula
              solo con esos números.
            </Step>
            <Step n={6}>
              Repasa <code>REGLAS DE GESTIÓN DE RIESGO</code>: <code>STOP DIARIO MÁXIMO</code>{' '}
              (3% del capital intradía; si lo tocas, se terminó la sesión) y{' '}
              <code>OPERACIONES MÁXIMAS</code> del día.
            </Step>
            <Step n={7}>
              Marca los 9 puntos del <code>CHECKLIST PRE-SESIÓN</code>: calendario económico
              revisado, niveles clave de SPY/QQQ verificados, stops de posiciones abiertas
              ajustados, setups de candidatos validados, capital y riesgo máximo confirmados, APIs
              conectadas, distracciones eliminadas, estado emocional neutral, y plan de salida
              (stop/target) claro para cada trade.
            </Step>
            <Step n={8}>
              Con el checklist completo, el estado del plan pasa a <code>LISTO PARA DESPEGAR</code>.
              Ten presente: el Plan de Vuelo nunca ejecuta órdenes, prepara y propone; la ejecución
              vive en Trading.
            </Step>
            <Step n={9}>
              Si mantienes posiciones swing, revisa el bloque <code>POSICIONES SWING ABIERTAS</code>{' '}
              y decide si ajustas stops antes de la apertura.
            </Step>
          </Steps>

          <SubHead icon={TrendingUp}>Abrir la orden en Trading</SubHead>
          <Steps>
            <Step n={1}>
              Abre <strong>Trading</strong>. A la izquierda está el panel <code>ORDER ENTRY</code>{' '}
              (con badge <code>PAPER MODE</code>); a la derecha, el chart nativo con indicadores y{' '}
              <code>TU WATCHLIST</code>.
            </Step>
            <Step n={2}>
              En <code>NUEVA ORDEN</code> elige el tipo de activo (<code>EQUITY</code> o{' '}
              <code>CRIPTO</code>) y escribe el <code>SÍMBOLO</code>, o haz clic en un símbolo de la
              watchlist para precargarlo con su precio actual.
            </Step>
            <Step n={3}>
              Elige <code>DIRECCIÓN</code> (<code>COMPRA</code> o <code>VENTA</code>) y{' '}
              <code>TIPO DE ORDEN</code> (<code>Market</code>, <code>Limit</code>, <code>Stop</code>,{' '}
              <code>Stop Limit</code>).
            </Step>
            <Step n={4}>
              Ingresa el <code>STOP LOSS</code> — marcado <code>OBLIGATORIO</code> — y si lo tienes,
              el <code>TARGET</code> (<code>OPCIONAL — para R/R</code>). Ambos se dibujan como líneas
              horizontales sobre el chart: valida visualmente que el trade tenga sentido antes de
              seguir.
            </Step>
            <Step n={5}>
              El <code>RISK CALCULATOR</code> calcula en tiempo real: <code>Qty sugerida</code>{' '}
              (derivada de tu <code>Riesgo por Operación (%)</code> de Settings),{' '}
              <code>Valor posición</code>, <code>Capital en riesgo</code>, <code>Dist. al stop</code>{' '}
              y <code>R/R ratio</code>, con veredicto <code>✓ BUENO</code> si es ≥ 2.
            </Step>
            <Step n={6}>
              Acepta la sugerencia con <code>← Usar qty sugerida</code> o escribe tu cantidad en{' '}
              <code>CANTIDAD (ACCIONES)</code>.
            </Step>
            <Step n={7}>
              Si la posición resultante supera tu límite, aparece{' '}
              <code>POSICIÓN EXCEDE EL MÁXIMO</code>: reduce la cantidad o repiensa el trade. La
              advertencia no bloquea, pero existe por una razón.
            </Step>
            <Step n={8}>
              Haz clic en <code>REVISAR ORDEN</code>.
            </Step>
          </Steps>

          <SubHead icon={ShoppingCart}>Confirmar: el modal de confirmación</SubHead>
          <Steps>
            <Step n={1}>
              Se abre <code>CONFIRMAR ORDEN</code> con el resumen completo: símbolo, tipo, cantidad,
              precio estimado, valor de posición, peso resultante en el portafolio, stop, target y
              el bloque <code>ANÁLISIS DE RIESGO</code>.
            </Step>
            <Step n={2}>
              Campo obligatorio: <code>TIPO DE OPERACIÓN *</code> — selecciona <code>INTRADAY</code>{' '}
              o <code>SWING</code>. Sin esta selección el botón de confirmación queda bloqueado hasta
              que elijas el tipo de trade. Si el símbolo coincide con un candidato del plan del día,
              viene preseleccionado automáticamente.
            </Step>
            <Step n={3}>
              Si es una orden de venta, el riesgo se presenta como <code>Posición protegida</code>:
              la orden protege tu posición existente en lugar de arriesgar capital nuevo.
            </Step>
            <Step n={4}>
              Verifica el aviso <code>PAPER TRADING — Esta orden se ejecutará en modo simulación</code>.
            </Step>
            <Step n={5}>
              Haz clic en <code>Confirmar Compra</code> (o <code>Confirmar Venta</code>). Verás el
              banner «Orden enviada» y la orden aparece en <code>HISTORIAL DE ÓRDENES</code> con su
              status (<code>PENDING</code> → <code>FILLED</code>).
            </Step>
            <Step n={6}>
              ¿Te arrepentiste de una orden que sigue pendiente? En{' '}
              <code>HISTORIAL DE ÓRDENES</code> (dentro de Trading), haz clic en la X{' '}
              (<code>Cancelar orden</code>) — disponible solo para órdenes <code>PENDING</code> o{' '}
              <code>ACCEPTED</code> — y confirma la alerta.
            </Step>
          </Steps>

          <SubHead icon={BookOpen}>Registrar la operación en el Journal</SubHead>
          <Steps>
            <Step n={1}>
              Con la orden ejecutada, abre <strong>Journal</strong> y haz clic en{' '}
              <code>Nueva entrada</code>.
            </Step>
            <Step n={2}>
              Ingresa el símbolo de la operación: el formulario detecta la orden reciente y el
              candidato del Plan de Vuelo, y precarga tesis, stop, target y <code>Tipo de operación</code>{' '}
              (verás «Precargado automáticamente desde la orden ejecutada»). Usa <code>Cambiar</code>{' '}
              solo si necesitas corregir algo.
            </Step>
            <Step n={3}>
              Completa los campos obligatorios: <code>Tesis de entrada *</code> (por qué entraste,
              en tus palabras), <code>Tipo de operación *</code> (<code>Intraday (Día)</code> o{' '}
              <code>Swing (Varios días)</code>), <code>Estado emocional *</code>{' '}
              (<code>Tranquilo</code>, <code>Confiado</code>, <code>Emocionado</code>,{' '}
              <code>Inseguro</code> o <code>Temeroso</code>; responde honesto, esta métrica vale oro
              después) y <code>Nivel de convicción *</code> (1 a 5).
            </Step>
            <Step n={4}>
              Si aplica, agrega <code>Tipo de setup</code>, <code>Stop Loss planificado</code>,{' '}
              <code>Target planificado</code> y <code>Precio de entrada (para calcular R/R)</code>.
            </Step>
            <Step n={5}>
              Haz clic en <code>Guardar entrada</code>. La entrada queda abierta (sin resultado)
              hasta que hagas el post-mortem.
            </Step>
          </Steps>

          <SubHead icon={Flag}>Cerrar el loop: el post-mortem</SubHead>
          <Steps>
            <Step n={1}>
              Cuando cierres la posición, vuelve a <strong>Journal</strong> y abre la entrada de esa
              operación.
            </Step>
            <Step n={2}>
              En la sección <code>Post-Trade</code> completa: <code>Resultado *</code>{' '}
              (<code>Win</code>, <code>Loss</code> o <code>Breakeven</code>),{' '}
              <code>PnL real ($)</code>, <code>PnL real (%)</code> y <code>Razón de salida</code>{' '}
              (stop hit, target alcanzado, cambio de tesis).
            </Step>
            <Step n={3}>
              Responde las tres preguntas de aprendizaje: <code>✅ ¿Qué funcionó?</code>,{' '}
              <code>❌ ¿Qué falló?</code> y <code>📚 Lección principal</code>.
            </Step>
            <Step n={4}>
              Marca <code>¿Seguiste el plan? *</code> (<code>Sí, seguí el plan</code> /{' '}
              <code>No, improvisé</code>) y tu estado en <code>¿Cómo te sientes ahora?</code>.
            </Step>
            <Step n={5}>
              Haz clic en <code>Guardar post-mortem</code>. Las <code>Estadísticas</code> del
              Journal se recalculan al instante: <code>Win Rate</code> y <code>Profit Factor</code>{' '}
              — totales y separados por <code>Intraday</code> / <code>Swing</code> —,{' '}
              <code>Seguí el plan</code>, <code>Avg Win vs Avg Loss</code> y{' '}
              <code>Error más frecuente</code>.
            </Step>
            <Step n={6}>
              Si se te acumulan entradas sin cerrar, el Journal muestra un badge con el número
              pendiente y el Dashboard te lo recuerda los domingos.
            </Step>
          </Steps>
        </Section>

        {/* ══ 04 · Referencia rápida ═══════════════════════════════════════ */}
        <Section section={SECTIONS[3]!}>
          <SubHead icon={LayoutDashboard}>Pantallas</SubHead>
          <div className="m-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Pantalla</th>
                  <th>Ruta</th>
                  <th>Para qué sirve</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Dashboard</td><td><code>/</code></td><td>Estado del portafolio: equity, posiciones con PnL en vivo y eventos próximos</td></tr>
                <tr><td>Trading</td><td><code>/trading</code></td><td>Ejecutar órdenes con Risk Calculator, chart nativo y watchlist</td></tr>
                <tr><td>Research</td><td><code>/research</code></td><td>Análisis IA de un símbolo con datos fuente visibles y tu exposición</td></tr>
                <tr><td>Journal</td><td><code>/journal</code></td><td>Tesis pre-trade, post-mortems y métricas de comportamiento</td></tr>
                <tr><td>Plan de Vuelo</td><td><code>/flight-plan</code></td><td>Preparación pre-sesión: contexto, candidatos, checklist y cierre del día</td></tr>
                <tr><td>Academia</td><td><code>/academy</code></td><td>Manuales de estrategias (ORB, Pullback, Stage 2 Breakout) y glosario</td></tr>
                <tr><td>Screener</td><td><code>/screener</code></td><td>Filtrar el universo de activos y puntuar candidatos con IA</td></tr>
                <tr><td>Historial</td><td><code>/history</code></td><td>Todas las órdenes con filtros: ejecutadas e importadas</td></tr>
                <tr><td>Manual</td><td><code>/manual</code></td><td>Este manual</td></tr>
                <tr><td>Settings</td><td><code>/settings</code></td><td>API keys, gestión de riesgo, modo paper/live e importador de historial</td></tr>
              </tbody>
            </table>
          </div>

          <SubHead icon={AlertTriangle}>Reglas irrompibles del sistema</SubHead>
          <Callout variant="warning" icon={AlertTriangle} title="No negociables">
            <ul className="m-list m-list--tight">
              <li>Paper trading por defecto: ninguna orden real se ejecuta sin activar live trading explícitamente en Settings.</li>
              <li>Toda orden pasa por <code>CONFIRMAR ORDEN</code>. No existe ejecución en un solo clic.</li>
              <li><code>TIPO DE OPERACIÓN</code> (<code>INTRADAY</code> / <code>SWING</code>) es obligatorio para confirmar cualquier orden.</li>
              <li><code>STOP LOSS</code> es obligatorio en el formulario de orden. Sin stop no hay cálculo de riesgo, y sin riesgo calculado no hay trade serio.</li>
              <li>La cantidad sugerida sale siempre de <code>Riesgo por Operación (%)</code>; si superas <code>Tamaño Máximo de Posición (%)</code>, la app te lo advierte en el formulario y en el modal.</li>
              <li>Máximo 3 candidatos por Plan de Vuelo y un solo plan por día.</li>
              <li><code>Lección del Día (Obligatorio)</code>: no puedes cerrar la sesión del Plan de Vuelo sin escribirla.</li>
              <li><code>STOP DIARIO MÁXIMO</code>: 3% del capital intradía. Si se alcanza, se dejó de operar por hoy.</li>
              <li>Ningún análisis de Research se muestra sin su panel <code>DATOS FUENTE</code>.</li>
              <li>Ningún resultado de Screener aparece sin score y nota de la IA.</li>
            </ul>
          </Callout>

          <SubHead icon={BookMarked}>Glosario</SubHead>
          <div className="m-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Término</th>
                  <th>Qué significa</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>R/R (Risk/Reward)</td><td>Relación entre lo que arriesgas y lo que buscas ganar: <code>(target − entrada) / (entrada − stop)</code>. Se muestra como <code>1:2.4</code>; el Risk Calculator marca <code>✓ BUENO</code> desde 1:2.</td></tr>
                <tr><td>ATH dist</td><td>Distancia porcentual al máximo de 52 semanas: <code>(precio − máximo 52s) / máximo 52s × 100</code>. Siempre negativa o cero; <code>-5%</code> = a un 5% del máximo.</td></tr>
                <tr><td>RSI semanal</td><td>Índice de fuerza relativa (Wilder, 14 períodos) sobre velas semanales. Desde 70: <code>Sobrecomprado</code>; 50–70: <code>Zona alcista</code>; 30–50: <code>Zona bajista</code>; bajo 30: <code>Sobrevendido</code>.</td></tr>
                <tr><td>Profit Factor</td><td>Ganancia bruta dividida por pérdida bruta de tus trades cerrados. Mayor a 1 = sistema rentable; el Journal lo separa por <code>Intraday</code> y <code>Swing</code>.</td></tr>
                <tr><td>setup_type</td><td>Patrón técnico que justifica el trade: <code>Breakout</code>, <code>Pullback</code>, <code>Reversión</code>, <code>Earnings Play</code>, <code>Swing</code>, <code>Momentum</code>, <code>Stage 2 Breakout</code>, <code>Rango</code> u <code>Otro</code>. Se registra en el Plan de Vuelo y el Journal para detectar en cuál setup ganas de verdad.</td></tr>
                <tr><td>Equity</td><td>Valor total de la cuenta: efectivo más el valor de mercado de todas las posiciones.</td></tr>
                <tr><td>Buying Power</td><td>Capital disponible para abrir posiciones nuevas según el broker.</td></tr>
                <tr><td>Paper trading</td><td>Modo simulación: órdenes reales en mecánica, ficticias en dinero. Todo TradeOS opera así por defecto.</td></tr>
                <tr><td>Win Rate</td><td>Porcentaje de trades cerrados en ganancia sobre el total de trades cerrados.</td></tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* ══ 05 · Ejemplo completo ════════════════════════════════════════ */}
        <Section section={SECTIONS[4]!}>
          <Callout variant="example" icon={Info} title="Escenario">
            Un martes cualquiera, 8:40 AM ET, con el plan del día ya inicializado en Plan de Vuelo.
            Así se ve el flujo completo con NVDA.
          </Callout>

          <ol className="m-example">
            <ExampleStep n={1} icon={Search}>
              Abres <strong>Screener</strong>, cargas <code>Momentum Growth</code> en{' '}
              <code>Seleccionar Preset...</code>, haces clic en <code>Correr</code> y NVDA aparece
              al tope de la tabla con score 92 en badge verde.
            </ExampleStep>
            <ExampleStep n={2} icon={Telescope}>
              Haces clic en la fila de NVDA y <strong>Research</strong> se abre con el símbolo
              precargado; presionas <code>Analizar</code>.
            </ExampleStep>
            <ExampleStep n={3} icon={Telescope}>
              Mientras lees el análisis verificas en <code>DATOS FUENTE</code> que{' '}
              <code>DIST. ATH</code> está a un -5.2% del máximo y <code>RSI SEMANAL</code> en 65
              (zona alcista), confirmas en <code>📉 ANÁLISIS FUNDAMENTAL</code> que el EPS estimado
              supera el guidance, y revisas qué recomienda <code>💼 TU EXPOSICIÓN</code> sobre tu
              posición actual.
            </ExampleStep>
            <ExampleStep n={4} icon={Plane}>
              Convencido, vuelves al <strong>Screener</strong> y haces clic en el botón de avión{' '}
              (<code>Agregar al Plan de Vuelo</code>) en la fila de NVDA.
            </ExampleStep>
            <ExampleStep n={5} icon={ClipboardList}>
              En <strong>Plan de Vuelo</strong> completas el candidato: <code>Stop Loss</code>{' '}
              debajo del soporte, <code>Target</code> en la resistencia, <code>Tesis de Entrada</code>{' '}
              en una oración — <em>«Breakout con volumen sobre resistencia, fundamentales acompañan
              y sin earnings esta semana»</em> — y <code>Tipo de Setup</code> en <code>Breakout</code>.
            </ExampleStep>
            <ExampleStep n={6} icon={ClipboardList}>
              Marcas los 9 puntos del <code>CHECKLIST PRE-SESIÓN</code>, dejas{' '}
              <code>Bias del Mercado</code> en <code>Bullish</code>, y el plan queda{' '}
              <code>LISTO PARA DESPEGAR</code>.
            </ExampleStep>
            <ExampleStep n={7} icon={TrendingUp}>
              En la apertura vas a <strong>Trading</strong> e ingresas NVDA en el campo{' '}
              <code>SÍMBOLO</code> de <code>NUEVA ORDEN</code>, con el stop y el target del plan.
            </ExampleStep>
            <ExampleStep n={8} icon={Gauge}>
              El <code>RISK CALCULATOR</code> muestra la <code>Qty sugerida</code> con tu 2% de
              riesgo; revisas que <code>Capital en riesgo</code> sea un número que puedes perder sin
              drama y que <code>R/R ratio</code> marque <code>✓ BUENO</code>.
            </ExampleStep>
            <ExampleStep n={9} icon={ShoppingCart}>
              Haces clic en <code>REVISAR ORDEN</code> y en <code>CONFIRMAR ORDEN</code> verificas
              que <code>TIPO DE OPERACIÓN</code> esté en <code>INTRADAY</code> (preseleccionado
              desde el plan; sería <code>SWING</code> si fueras a mantener días) y presionas{' '}
              <code>Confirmar Compra</code>.
            </ExampleStep>
            <ExampleStep n={10} icon={BookOpen}>
              Abres <strong>Journal</strong>, haces clic en <code>Nueva entrada</code> e ingresas
              NVDA: la tesis, stop, target y tipo llegan precargados desde la orden y el plan;
              completas <code>Estado emocional</code> en <code>Tranquilo</code> y{' '}
              <code>Nivel de convicción</code> en 4, y guardas.
            </ExampleStep>
            <ExampleStep n={11} icon={LayoutDashboard}>
              Durante la sesión monitoreas la posición en el <strong>Dashboard</strong>: la tarjeta
              de NVDA en <code>Posiciones Abiertas</code> muestra el PnL en tiempo real, en verde
              mientras acompañe.
            </ExampleStep>
            <ExampleStep n={12} icon={Flag}>
              Al cerrar la posición vuelves al <strong>Journal</strong> y completas el post-mortem:{' '}
              <code>Resultado</code> en <code>Win</code>, en <code>✅ ¿Qué funcionó?</code> anotas
              que respetaste la qty sugerida, en <code>❌ ¿Qué falló?</code> que saliste antes del
              target por ansiedad, y en <code>📚 Lección principal</code> —{' '}
              <em>«si el setup sigue válido, el target se respeta»</em>.
            </ExampleStep>
            <ExampleStep n={13} icon={Rocket}>
              Al día siguiente, al preparar el nuevo plan, <strong>Plan de Vuelo</strong> te muestra
              automáticamente <code>LECCIÓN DE LA SESIÓN ANTERIOR</code> con esa frase, y el loop de
              mejora queda cerrado.
            </ExampleStep>
          </ol>
        </Section>

        <p className="manual-footer no-print">
          TradeOS Personal · Manual de usuario · Las capturas de pantalla se omiten a propósito:
          cada nombre citado en <code>este formato</code> es el texto literal que vas a encontrar en
          la interfaz.
        </p>
      </article>

      <style>{`
        /* ── TOC: índice checklist de vuelo ─────────────────────────────── */
        .manual-toc-title {
          font-size: 0.6875rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
          padding: 0 0.875rem 0.5rem;
        }
        .manual-toc-item {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.6875rem 0.875rem;
          border: none;
          border-left: 2px solid var(--border-subtle);
          border-radius: 0;
          background: transparent;
          color: var(--text-secondary);
          font-family: "Syne", system-ui, sans-serif;
          font-size: 0.8125rem;
          font-weight: 500;
          text-align: left;
          cursor: pointer;
          transition: color 150ms ease, border-color 150ms ease, background-color 150ms ease;
        }
        .manual-toc-item:hover {
          color: var(--text-primary);
          background-color: var(--bg-surface);
        }
        .manual-toc-item:focus-visible {
          outline: 2px solid var(--color-primary);
          outline-offset: -2px;
        }
        .manual-toc-item.active {
          border-left-color: var(--color-primary);
          color: var(--text-primary);
        }
        .manual-toc-icon {
          display: inline-flex;
          flex-shrink: 0;
          color: var(--text-muted);
          transition: color 150ms ease;
        }
        .manual-toc-item.active .manual-toc-icon { color: var(--color-primary); }
        .manual-toc-num {
          font-family: "IBM Plex Mono", monospace;
          font-size: 0.6875rem;
          color: var(--text-muted);
          flex-shrink: 0;
          transition: color 150ms ease;
        }
        .manual-toc-item.active .manual-toc-num {
          color: var(--color-primary);
          font-weight: 700;
        }
        .manual-toc-label { min-width: 0; }
        /* Chips horizontales en mobile */
        .manual-toc--chips .manual-toc-item {
          border: 1px solid var(--border-default);
          border-radius: 999px;
          padding: 0.5rem 0.875rem;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .manual-toc--chips .manual-toc-item.active {
          border-color: var(--color-primary);
          background-color: rgba(59, 130, 246, 0.1);
        }

        /* ── Hero ───────────────────────────────────────────────────────── */
        .manual-hero {
          margin-bottom: 1.75rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid var(--border-subtle);
        }
        .manual-hero-kicker {
          display: inline-block;
          font-family: "IBM Plex Mono", monospace;
          font-size: 0.6875rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--color-primary);
          margin-bottom: 0.625rem;
        }
        .manual-h1 {
          font-family: "Syne", system-ui, sans-serif;
          font-weight: 800;
          font-size: 1.875rem;
          line-height: 1.2;
          letter-spacing: -0.02em;
          color: var(--text-primary);
          margin: 0 0 0.875rem;
        }
        .manual-hero-lead {
          font-size: 0.9375rem;
          line-height: 1.75;
          color: var(--text-secondary);
          margin: 0;
        }
        .manual-hero-lead strong { color: var(--text-primary); font-weight: 700; }

        /* ── Secciones ──────────────────────────────────────────────────── */
        .m-section { scroll-margin-top: 4.5rem; }
        .m-h2 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-family: "Syne", system-ui, sans-serif;
          font-weight: 700;
          font-size: 1.3125rem;
          letter-spacing: -0.01em;
          color: var(--text-primary);
          margin: 3rem 0 1.25rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border-subtle);
          scroll-margin-top: 4.5rem;
        }
        .m-h2-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.25rem;
          height: 2.25rem;
          flex-shrink: 0;
          border-radius: 10px;
          background: linear-gradient(145deg, rgba(59,130,246,0.18), rgba(59,130,246,0.06));
          border: 1px solid rgba(59,130,246,0.3);
          color: var(--color-primary);
        }
        .m-h2-num {
          font-family: "IBM Plex Mono", monospace;
          font-size: 0.8125rem;
          font-weight: 400;
          color: var(--color-primary);
        }
        .m-h2-label { min-width: 0; }

        /* ── Sub-encabezado ─────────────────────────────────────────────── */
        .m-subhead {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: "Syne", system-ui, sans-serif;
          font-size: 0.8125rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--text-primary);
          margin: 2rem 0 1rem;
        }
        .m-subhead-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 1.625rem;
          height: 1.625rem;
          flex-shrink: 0;
          border-radius: 7px;
          background-color: var(--bg-elevated);
          border: 1px solid var(--border-default);
          color: var(--color-primary);
        }

        /* ── Tarjetas de paso ───────────────────────────────────────────── */
        .m-steps {
          list-style: none;
          margin: 0 0 1.25rem;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }
        .m-step {
          display: flex;
          align-items: flex-start;
          gap: 0.875rem;
          padding: 0.875rem 1rem;
          background-color: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-left: 3px solid var(--color-primary);
          border-radius: 8px;
          transition: border-color 150ms ease, background-color 150ms ease;
        }
        .m-step:hover {
          border-color: var(--border-default);
          border-left-color: var(--color-primary);
          background-color: var(--bg-elevated);
        }
        .m-step-num {
          font-family: "IBM Plex Mono", monospace;
          font-size: 1.125rem;
          font-weight: 700;
          line-height: 1.4;
          color: var(--color-primary);
          flex-shrink: 0;
          width: 1.75rem;
          text-align: center;
        }
        .m-step-body {
          font-size: 0.9375rem;
          line-height: 1.7;
          color: var(--text-secondary);
          min-width: 0;
        }
        .m-step-body strong { color: var(--text-primary); font-weight: 700; }
        .m-step-body em { color: var(--text-primary); font-style: italic; }

        /* ── Listas ─────────────────────────────────────────────────────── */
        .m-list {
          margin: 0 0 1.25rem;
          padding-left: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .m-list li {
          font-size: 0.9375rem;
          line-height: 1.7;
          color: var(--text-secondary);
        }
        .m-list li::marker { color: var(--color-primary); }
        .m-list--tight { margin-bottom: 0; gap: 0.375rem; }

        /* ── Callouts ───────────────────────────────────────────────────── */
        .m-callout {
          margin: 1.25rem 0 1.5rem;
          padding: 0.875rem 1rem;
          border-radius: 10px;
          border: 1px solid var(--border-default);
          background-color: var(--bg-surface);
        }
        .m-callout-head {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: "Syne", system-ui, sans-serif;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 0.5rem;
        }
        .m-callout-body {
          font-size: 0.9375rem;
          line-height: 1.7;
          color: var(--text-secondary);
        }
        .m-callout-body strong { color: var(--text-primary); font-weight: 700; }
        .m-callout-body em { color: var(--text-primary); font-style: italic; }
        .m-callout--warning {
          border-color: rgba(245, 158, 11, 0.4);
          background-color: rgba(245, 158, 11, 0.08);
        }
        .m-callout--warning .m-callout-head { color: var(--color-warning); }
        .m-callout--tip {
          border-color: rgba(16, 185, 129, 0.4);
          background-color: rgba(16, 185, 129, 0.08);
        }
        .m-callout--tip .m-callout-head { color: var(--color-profit); }
        .m-callout--info {
          border-color: rgba(59, 130, 246, 0.4);
          background-color: rgba(59, 130, 246, 0.08);
        }
        .m-callout--info .m-callout-head { color: var(--color-primary); }
        .m-callout--example {
          border-color: var(--border-default);
          background-color: var(--bg-elevated);
          border-left: 3px solid var(--color-primary);
        }
        .m-callout--example .m-callout-head { color: var(--text-primary); }

        /* ── Diagrama de flujo ──────────────────────────────────────────── */
        .m-flow {
          display: flex;
          align-items: stretch;
          flex-wrap: wrap;
          gap: 0.25rem;
          margin: 0.5rem 0 1.75rem;
          padding: 1rem;
          border-radius: 10px;
          background-color: var(--bg-surface);
          border: 1px solid var(--border-subtle);
        }
        .m-flow-seg { display: flex; align-items: center; flex: 1 1 auto; }
        .m-flow-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.4375rem;
          flex: 1 1 auto;
          padding: 0.75rem 0.5rem;
          border-radius: 8px;
          background-color: var(--bg-elevated);
          border: 1px solid var(--border-default);
          text-align: center;
        }
        .m-flow-node-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2rem;
          height: 2rem;
          border-radius: 8px;
          background: linear-gradient(145deg, rgba(59,130,246,0.2), rgba(59,130,246,0.06));
          color: var(--color-primary);
        }
        .m-flow-node-label {
          font-family: "Syne", system-ui, sans-serif;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-primary);
          white-space: nowrap;
        }
        .m-flow-arrow {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 0.25rem;
          color: var(--color-primary);
          flex-shrink: 0;
        }

        /* ── Secuencia de ejemplo ───────────────────────────────────────── */
        .m-example {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .m-example-step {
          position: relative;
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 0 0 1.25rem 0;
        }
        .m-example-rail {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
        }
        .m-example-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 10px;
          background: linear-gradient(145deg, rgba(59,130,246,0.22), rgba(59,130,246,0.06));
          border: 1px solid rgba(59,130,246,0.35);
          color: var(--color-primary);
          position: relative;
          z-index: 1;
        }
        .m-example-line {
          flex: 1 1 auto;
          width: 2px;
          margin-top: 0.25rem;
          min-height: 0.5rem;
          background-color: var(--border-default);
        }
        .m-example-content {
          flex: 1 1 auto;
          min-width: 0;
          padding-top: 0.375rem;
        }
        .m-example-n {
          display: block;
          font-family: "IBM Plex Mono", monospace;
          font-size: 0.6875rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--color-primary);
          margin-bottom: 0.1875rem;
        }
        .m-example-content p {
          font-size: 0.9375rem;
          line-height: 1.7;
          color: var(--text-secondary);
          margin: 0;
        }
        .m-example-content strong { color: var(--text-primary); font-weight: 700; }
        .m-example-content em { color: var(--text-primary); font-style: italic; }

        /* ── Código inline ──────────────────────────────────────────────── */
        .manual-md code {
          font-family: "IBM Plex Mono", monospace;
          font-size: 0.8125em;
          color: var(--text-primary);
          background-color: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: 4px;
          padding: 0.0625rem 0.375rem;
          overflow-wrap: break-word;
        }

        /* ── Tablas ─────────────────────────────────────────────────────── */
        .m-table-wrap {
          overflow-x: auto;
          margin: 0 0 1.5rem;
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          background-color: var(--bg-surface);
        }
        .manual-md table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8125rem;
        }
        .manual-md th {
          font-family: "IBM Plex Mono", monospace;
          font-size: 0.6875rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-align: left;
          color: var(--text-muted);
          padding: 0.625rem 0.875rem;
          border-bottom: 1px solid var(--border-default);
          white-space: nowrap;
        }
        .manual-md td {
          padding: 0.625rem 0.875rem;
          color: var(--text-secondary);
          line-height: 1.6;
          border-bottom: 1px solid var(--border-subtle);
          vertical-align: top;
          min-width: 8rem;
        }
        .manual-md tr:last-child td { border-bottom: none; }
        .manual-md td:first-child {
          color: var(--text-primary);
          font-weight: 600;
          white-space: nowrap;
        }

        /* ── Footer ─────────────────────────────────────────────────────── */
        .manual-footer {
          margin-top: 3rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border-subtle);
          font-size: 0.8125rem;
          line-height: 1.7;
          color: var(--text-muted);
        }

        @media (prefers-reduced-motion: reduce) {
          .manual-toc-item,
          .manual-toc-icon,
          .manual-toc-num,
          .m-step { transition: none; }
        }
      `}</style>
    </div>
  )
}

// ── Paso de la secuencia de ejemplo (timeline vertical) ──────────────────────
function ExampleStep({ n, icon: Icon, children }: { n: number; icon: LucideIcon; children: ReactNode }) {
  return (
    <li className="m-example-step">
      <div className="m-example-rail">
        <span className="m-example-badge"><Icon size={18} strokeWidth={2} /></span>
        {n < 13 && <span className="m-example-line" />}
      </div>
      <div className="m-example-content">
        <span className="m-example-n">Paso {String(n).padStart(2, '0')}</span>
        <p>{children}</p>
      </div>
    </li>
  )
}
