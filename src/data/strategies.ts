export interface Strategy {
  id: string
  title: string
  description: string
  target_market: string
  capital_req: string
  risk_per_trade: string
  setups: {
    name: string
    timeframe: string
    rules: string[]
  }[]
  rules: string[]
}

export const STRATEGIES: Strategy[] = [
  {
    id: 'intraday',
    title: 'Estrategia Intradía',
    description: 'Day Trading de alta precisión centrado en breakouts de apertura y tendencias confirmadas.',
    target_market: 'NYSE (9:30-16h ET) + Cripto (BTC/ETH)',
    capital_req: '$5,000',
    risk_per_trade: '1% ($50)',
    setups: [
      {
        name: 'Opening Range Breakout (ORB)',
        timeframe: '5 minutos',
        rules: [
          'Apertura con gap alcista y volumen > 2x promedio',
          'Identificar el high de los primeros 5 minutos (OR high)',
          'Consolidación de 2-3 velas por encima del OR high',
          'Entrada en ruptura del OR high con vela de confirmación',
          'Stop debajo del OR low'
        ]
      },
      {
        name: 'Pullback a la EMA 21',
        timeframe: '15 minutos',
        rules: [
          'Tendencia clara (HH/HL)',
          'Corrección hacia la EMA 21 períodos',
          'Vela de reversa (martillo/doji) sobre la EMA',
          'Entrada en ruptura del high de la vela de reversa',
          'Stop debajo del mínimo de la vela de reversa'
        ]
      }
    ],
    rules: [
      'Stop diario máximo: 3% del capital',
      'Máximo 3 operaciones perdedoras seguidas = STOP del día',
      'Cerrar todas las posiciones NYSE antes de las 15:55 ET',
      'No revenge trading: esperar 30 mins tras una pérdida'
    ]
  },
  {
    id: 'swing',
    title: 'Estrategia Swing',
    description: 'Captura de movimientos de varios días basados en fundamentales y estructura de mercado.',
    target_market: 'NYSE Equities + Cripto (Top 10)',
    capital_req: '$10,000+',
    risk_per_trade: '0.5% - 1%',
    setups: [
      {
        name: 'Stage 2 Breakout',
        timeframe: 'Diario',
        rules: [
          'Precio por encima de SMA 50 y SMA 200',
          'Consolidación lateral de al menos 2 semanas',
          'Ruptura de resistencia con volumen creciente',
          'Entrada en el cierre diario de la ruptura'
        ]
      }
    ],
    rules: [
      'No operar frente a reportes de earnings inminentes',
      'Trailing stop activo tras alcanzar 1R de beneficio',
      'Reducir exposición si el SPY está debajo de la SMA 50'
    ]
  },
  {
    id: 'dual',
    title: 'Estrategia Dual (Equities + Cripto)',
    description: 'Gestión balanceada de portafolio utilizando la baja correlación entre mercados tradicionales y digitales.',
    target_market: 'Binance (Top 5) + NYSE (Blue Chips)',
    capital_req: '$20,000+',
    risk_per_trade: '0.2% - 0.5%',
    setups: [
      {
        name: 'Market Divergence',
        timeframe: '4 horas',
        rules: [
          'SPY en tendencia alcista confirmada',
          'BTC en fase de acumulación lateral',
          'Rotación de capital hacia activos de riesgo',
          'Entrada en ruptura de rango de BTC'
        ]
      }
    ],
    rules: [
      'Máximo 25% de exposición total en Cripto',
      'Rebalanceo semanal de beneficios hacia Cash/Equities',
      'Cierre de posiciones si la volatilidad del VIX > 25'
    ]
  }
]

export const GLOSSARY = [
  { term: 'ATH Distance', def: 'Distancia porcentual al máximo histórico de 52 semanas.' },
  { term: 'Buying Power', def: 'Capital disponible para nuevas operaciones considerando margen.' },
  { term: 'Profit Factor', def: 'Ganancias brutas totales divididas por pérdidas brutas totales. Objetivo > 1.5.' },
  { term: 'Risk/Reward (R/R)', def: 'Ratio entre el riesgo asumido y la ganancia potencial. Mínimo 1:2.' },
  { term: 'Unrealized PnL', def: 'Ganancia o pérdida latente de una posición abierta.' }
]
