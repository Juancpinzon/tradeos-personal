# Manual de Usuario — TradeOS Personal

Este manual es para vos: ya tenés cuenta creada, sesión activa y experiencia en trading. Acá no hay teoría de mercados ni instalación técnica — solo cómo usar TradeOS para dos objetivos concretos: **generar opciones de inversión** (Screener → Research → Plan de Vuelo) y **operar acciones** (Plan de Vuelo → Trading → Journal).

Una aclaración antes de empezar: el badge `PAPER` que ves junto al logo significa que toda la app corre en modo simulación. Ninguna orden toca dinero real hasta que actives live trading explícitamente en Settings — y no hay razón para hacerlo hasta dominar el flujo completo.

## 1. Primer día en TradeOS

**El Dashboard de un vistazo**

1. Abrí **Dashboard** (primer ítem del sidebar). Es tu pantalla de inicio y la foto completa de tu capital.
2. Mirá la fila superior: `Equity Total` (valor total de la cuenta), `PnL Hoy` (resultado del día en dólares y porcentaje), `Cash` (efectivo disponible) y `Buying Power` (poder de compra). Debajo, los badges `Alpaca` y `Binance` muestran cuánto aporta cada broker al total.
3. Revisá `Posiciones Abiertas`: cada tarjeta muestra cantidad, precio de entrada, valor actual y PnL no realizado. Hacé click en una posición y vas directo a Trading con ese símbolo cargado.
4. El gráfico `Equity — últimos 30 días` muestra la evolución de tu capital. Si se ve plano, no operaste o el mercado te dio tregua.
5. `Próximos Eventos` lista los earnings de tus posiciones y watchlist en los próximos 30 días. Un earnings encima de una posición abierta es volatilidad garantizada: conviene saberlo antes, no después.
6. Si ves el badge `actualizando...` en el header, la app está sincronizando con el broker en segundo plano. Lo que ves en pantalla viene del cache local — por eso el Dashboard carga en menos de 2 segundos siempre.
7. Si ya creaste el plan del día, el widget `PLAN DE VUELO` muestra el avance del `Checklist de Pre-Sesión` y tus candidatos ejecutados.
8. Los domingos puede aparecer un banner ámbar: *"Tenés X operaciones sin post-mortem esta semana"*. Hacé click en `Revisar ahora →` para cerrarlas — el Journal sin post-mortem es solo un diario, no una herramienta de mejora.

**Colores y números: cómo leerlos**

- Verde = ganancia, rojo = pérdida, gris = neutro. Aplica a PnL, porcentajes y velas del chart.
- Los porcentajes siempre llevan signo explícito: `+2.3%` / `-1.1%`. Los precios y PnL van en fuente monoespaciada para comparar dígitos de un vistazo.
- Badge amarillo con ícono de calendario en una posición = earnings en menos de 7 días. Tratalo como alerta, no como decoración.
- Score del Screener: badge verde (≥ 80), ámbar (60–79), gris (< 60).
- `Nivel de convicción` en el Journal: 5 puntos tipo semáforo, de 1 (rojo, "Muy bajo") a 5 (verde, "Muy alto").
- En el Screener, la estrella dorada marca símbolos que ya tenés en el portafolio y el ícono de ojo los que ya están en tu watchlist.

**Configurá el riesgo antes de operar**

1. Abrí **Settings** y andá a la sección `Gestión de Riesgo`.
2. Definí `Riesgo por Operación (%)`: el capital máximo a arriesgar en un solo trade (default: 2%). De este número el Risk Calculator deriva la cantidad sugerida en cada orden — es la configuración más importante de toda la app.
3. Definí `Tamaño Máximo de Posición (%)`: el peso máximo de un activo en tu portafolio (default: 15%). Si una orden lo supera, vas a ver advertencias en el formulario y en el modal de confirmación.
4. En `API Keys (validación de conexión)` confirmá que `Alpaca (NYSE)` y `Binance (Cripto)` estén en estado `CONECTADO`. Si no, ingresá las keys y presioná `Guardar y Verificar`.
5. En `Modo de Trading` verificá que diga `PAPER TRADING ACTIVADO`.
6. Opcional: si traés historial de operaciones en Excel, usá `Importar desde Excel` (sección *Importar historial de operaciones*) para que el Journal y sus estadísticas arranquen con tu experiencia real, no desde cero.

## 2. Flujo para generar opciones de inversión

**Correr el Screener**

1. Abrí **Screener**.
2. En `Seleccionar Preset...` cargá un preset guardado. Vienen dos por defecto: `Momentum Growth` (empresas en crecimiento con momentum, revenue growth ≥ 20%) y `Breakout Técnico` (cerca de máximos con RSI semanal entre 50 y 70). Al cargar, los criterios llenan el formulario.
3. Ajustá los criterios que quieras: `Market Cap Mín.`, `Precio Mínimo ($)`, `Revenue Growth Mín. (%)`, `Distancia ATH Máx. (%)`, `RSI Semanal (Rango)`, los toggles `EPS Próx. Positivo` y `Excluir con Dividendos`, y `Tipo de Activo` (Equity, Cripto o Ambos).
4. Si la combinación te sirve para repetir, guardala: botón de disquete (`Guardar como preset`), nombre descriptivo, `Guardar`.
5. Hacé click en `Correr`. Mientras ves `Ejecutando Análisis IA...`, el sistema filtra el universo cacheado de tickers, enriquece los candidatos con fundamentales y le pide a la IA que puntúe cada uno considerando tu portafolio actual.

**Leer los resultados**

1. Empezá por el bloque `RESUMEN DE LA IA`: dice qué encontró la corrida y cómo se relaciona con tu portafolio — qué complementa tus posiciones y qué duplicaría exposición.
2. La tabla es ordenable por columna: `Symbol`, `Nombre`, `Precio`, `Market Cap`, `Rev Growth`, `ATH%`, `RSI`, `EPS Est` y `Score`.
3. El `Score` (0–100) lo asigna la IA combinando momentum, fundamentales y técnica. Verde (≥ 80): candidato fuerte. Ámbar (60–79): interesante con reservas. Gris (< 60): débil frente a tus criterios.
4. Pasá el mouse sobre una fila para leer la nota de la IA: una o dos líneas explicando por qué ese símbolo destaca (o qué le falta).
5. La estrella dorada = ya está en tu portafolio (una compra sería ampliar posición, no diversificar). El ícono de ojo = ya está en tu watchlist.

**Profundizar con el Research Agent**

1. Hacé click en cualquier fila de resultados: se abre **Research** con el símbolo precargado.
2. Presioná `Analizar`, o antes elegí una de las preguntas rápidas (por ejemplo *"¿Hay setup válido hoy o esperamos?"*) o escribí la tuya en `¿QUÉ QUIERES SABER?`.
3. El análisis llega en streaming con 7 secciones fijas: `📊 CUADRO DE MANDO`, `📈 TESIS DE INVERSIÓN`, `📉 ANÁLISIS FUNDAMENTAL`, `💼 TU EXPOSICIÓN` (solo si tenés posición), `⚠️ RIESGOS`, `📐 NIVELES TÉCNICOS` y `📅 PRÓXIMO CATALIZADOR`.
4. Contrastá siempre contra el panel `DATOS FUENTE` de la derecha: `PRECIO`, `DIST. ATH`, `RSI SEMANAL`, `EPS ACTUAL`, `VOLUMEN PROM.`, `REV. GROWTH YoY`, `P/E RATIO` y `PRÓX. EARNINGS`. Es el snapshot exacto de datos que usó la IA — la regla de la casa es que sin datos fuente visibles, el análisis no vale.
5. Si tenés posición en el símbolo, el panel `TU POSICIÓN` muestra cantidad, entrada, PnL y peso en el portafolio, y la sección `💼 TU EXPOSICIÓN` del análisis recomienda mantener, recortar o ampliar con números concretos.

**Enviar candidatos al Plan de Vuelo**

1. Prerequisito: tener inicializado el plan del día en **Plan de Vuelo**. Si no lo hiciste, la app te frena con *"Primero debés inicializar el Plan de Vuelo del día."*
2. En la fila del candidato elegido, hacé click en el botón de avión (`Agregar al Plan de Vuelo`). Para enviar varios de una vez: marcá sus checkboxes y usá `Exportar al Plan de Vuelo (n/3)`.
3. El límite es 3 candidatos por día — si intentás más, verás *"Máximo 3 candidatos por Plan de Vuelo"*. No es un bug: es disciplina de foco.
4. Abrí **Plan de Vuelo** y completá lo que le falte a cada candidato — stop, target y tesis (paso a paso en la sección 3).

## 3. Flujo para operar

**Completar el Plan de Vuelo antes de la apertura**

1. Abrí **Plan de Vuelo** antes de la apertura del mercado (9:30 AM ET para NYSE).
2. Primera vez del día: en `PREPARAR PLAN DE VUELO` elegí el mercado de la sesión — `NYSE / NASDAQ`, `CRIPTO` o `AMBOS`.
3. Si cerraste sesión el día anterior, arriba aparece `LECCIÓN DE LA SESIÓN ANTERIOR` con lo que escribiste al cierre. Leela antes de planear — existe exactamente para eso.
4. Completá `CONTEXTO DEL DÍA`: `SPY Close Ayer`, `Nivel VIX`, `Bias del Mercado` (`Neutral`, `Bullish` o `Bearish`) y `Noticias Relevantes` (CPI, Fed, earnings del día).
5. En `CANDIDATOS DEL DÍA (MÁX. 3)` cargá cada candidato con `Agregar Candidato` (los que exportaste del Screener ya están): `Símbolo`, `Tipo de Setup` (Breakout, Pullback, Reversión, Earnings Play, Momentum, etc.), `Tipo de Trade` (`Intraday` o `Swing`), `Precio de Entrada`, `Stop Loss`, `Target` y `Tesis de Entrada` en una oración. El R/R se calcula solo con esos números.
6. Repasá `REGLAS DE GESTIÓN DE RIESGO`: `STOP DIARIO MÁXIMO` (3% del capital intradía — si lo tocás, se terminó la sesión) y `OPERACIONES MÁXIMAS` del día.
7. Marcá los 9 puntos del `CHECKLIST PRE-SESIÓN`: calendario económico revisado, niveles clave de SPY/QQQ verificados, stops de posiciones abiertas ajustados, setups de candidatos validados, capital y riesgo máximo confirmados, APIs conectadas, distracciones eliminadas, estado emocional neutral, y plan de salida (stop/target) claro para cada trade.
8. Con el checklist completo, el estado del plan pasa a `LISTO PARA DESPEGAR`. Tené presente: el Plan de Vuelo nunca ejecuta órdenes — prepara y propone; la ejecución vive en Trading.
9. Si mantenés posiciones swing, revisá el bloque `POSICIONES SWING ABIERTAS` y decidí si ajustás stops antes de la apertura.

**Abrir la orden en Trading**

1. Abrí **Trading**. A la izquierda está el panel `ORDER ENTRY` (con badge `PAPER MODE`); a la derecha, el chart nativo con indicadores y `TU WATCHLIST`.
2. En `NUEVA ORDEN` elegí el tipo de activo (`EQUITY` o `CRIPTO`) y escribí el `SÍMBOLO` — o hacé click en un símbolo de la watchlist para precargarlo con su precio actual.
3. Elegí `DIRECCIÓN` (`COMPRA` o `VENTA`) y `TIPO DE ORDEN` (`Market`, `Limit`, `Stop`, `Stop Limit`).
4. Ingresá el `STOP LOSS` — marcado `OBLIGATORIO` — y si lo tenés, el `TARGET` (`OPCIONAL — para R/R`). Ambos se dibujan como líneas horizontales sobre el chart: validá visualmente que el trade tenga sentido antes de seguir.
5. El `RISK CALCULATOR` calcula en tiempo real: `Qty sugerida` (derivada de tu `Riesgo por Operación (%)` de Settings), `Valor posición`, `Capital en riesgo`, `Dist. al stop` y `R/R ratio` — con veredicto `✓ BUENO` si es ≥ 2.
6. Aceptá la sugerencia con `← Usar qty sugerida` o escribí tu cantidad en `CANTIDAD (ACCIONES)`.
7. Si la posición resultante supera tu límite, aparece `POSICIÓN EXCEDE EL MÁXIMO`: reducí la cantidad o repensá el trade. La advertencia no bloquea, pero existe por una razón.
8. Hacé click en `REVISAR ORDEN`.

**Confirmar: el modal de confirmación**

1. Se abre `CONFIRMAR ORDEN` con el resumen completo: símbolo, tipo, cantidad, precio estimado, valor de posición, peso resultante en el portafolio, stop, target y el bloque `ANÁLISIS DE RIESGO`.
2. Campo obligatorio: `TIPO DE OPERACIÓN *` — seleccioná `INTRADAY` o `SWING`. Sin esta selección el botón de confirmación queda bloqueado (*"Seleccioná el tipo de trade para habilitar la confirmación"*). Si el símbolo coincide con un candidato del plan del día, viene preseleccionado automáticamente.
3. Si es una orden de venta, el riesgo se presenta como `Posición protegida`: la orden protege tu posición existente en lugar de arriesgar capital nuevo.
4. Verificá el aviso `PAPER TRADING — Esta orden se ejecutará en modo simulación`.
5. Hacé click en `Confirmar Compra` (o `Confirmar Venta`). Vas a ver el banner *"Orden enviada"* y la orden aparece en `HISTORIAL DE ÓRDENES` con su status (`PENDING` → `FILLED`).
6. ¿Te arrepentiste de una orden que sigue pendiente? En `HISTORIAL DE ÓRDENES` (dentro de Trading), hacé click en la X (`Cancelar orden`) — disponible solo para órdenes `PENDING` o `ACCEPTED` — y confirmá la alerta.

**Registrar la operación en el Journal**

1. Con la orden ejecutada, abrí **Journal** y hacé click en `Nueva entrada`.
2. Ingresá el símbolo de la operación: el formulario detecta la orden reciente y el candidato del Plan de Vuelo, y precarga tesis, stop, target y `Tipo de operación` (vas a ver *"Precargado automáticamente desde la orden ejecutada"*). Usá `Cambiar` solo si necesitás corregir algo.
3. Completá los campos obligatorios: `Tesis de entrada *` (por qué entraste, en tus palabras), `Tipo de operación *` (`Intraday (Día)` o `Swing (Varios días)`), `Estado emocional *` (`Tranquilo`, `Confiado`, `Emocionado`, `Inseguro` o `Temeroso` — respondé honesto, esta métrica vale oro después) y `Nivel de convicción *` (1 a 5).
4. Si aplica, agregá `Tipo de setup`, `Stop Loss planificado`, `Target planificado` y `Precio de entrada (para calcular R/R)`.
5. Hacé click en `Guardar entrada`. La entrada queda abierta (sin resultado) hasta que hagas el post-mortem.

**Cerrar el loop: el post-mortem**

1. Cuando cierres la posición, volvé a **Journal** y abrí la entrada de esa operación.
2. En la sección `Post-Trade` completá: `Resultado *` (`Win`, `Loss` o `Breakeven`), `PnL real ($)`, `PnL real (%)` y `Razón de salida` (stop hit, target alcanzado, cambio de tesis).
3. Respondé las tres preguntas de aprendizaje: `✅ ¿Qué funcionó?`, `❌ ¿Qué falló?` y `📚 Lección principal`.
4. Marcá `¿Seguiste el plan? *` (`Sí, seguí el plan` / `No, improvisé`) y tu estado en `¿Cómo te sentís ahora?`.
5. Hacé click en `Guardar post-mortem`. Las `Estadísticas` del Journal se recalculan al instante: `Win Rate` y `Profit Factor` — totales y separados por `Intraday` / `Swing` —, `Seguí el plan`, `Avg Win vs Avg Loss` y `Error más frecuente`.
6. Si se te acumulan entradas sin cerrar, el Journal muestra un badge con el número pendiente y el Dashboard te lo recuerda los domingos.

## 4. Referencia rápida

**Pantallas**

| Pantalla | Ruta | Para qué sirve |
| --- | --- | --- |
| Dashboard | `/` | Estado del portafolio: equity, posiciones con PnL en vivo y eventos próximos |
| Trading | `/trading` | Ejecutar órdenes con Risk Calculator, chart nativo y watchlist |
| Research | `/research` | Análisis IA de un símbolo con datos fuente visibles y tu exposición |
| Journal | `/journal` | Tesis pre-trade, post-mortems y métricas de comportamiento |
| Plan de Vuelo | `/flight-plan` | Preparación pre-sesión: contexto, candidatos, checklist y cierre del día |
| Academia | `/academy` | Manuales de estrategias (ORB, Pullback, Stage 2 Breakout) y glosario |
| Screener | `/screener` | Filtrar el universo de activos y puntuar candidatos con IA |
| Historial | `/history` | Todas las órdenes con filtros: ejecutadas e importadas |
| Manual | `/manual` | Este manual |
| Settings | `/settings` | API keys, gestión de riesgo, modo paper/live e importador de historial |

**Reglas irrompibles del sistema**

- Paper trading por defecto: ninguna orden real se ejecuta sin activar live trading explícitamente en Settings.
- Toda orden pasa por `CONFIRMAR ORDEN`. No existe ejecución en un solo clic.
- `TIPO DE OPERACIÓN` (`INTRADAY` / `SWING`) es obligatorio para confirmar cualquier orden.
- `STOP LOSS` es obligatorio en el formulario de orden. Sin stop no hay cálculo de riesgo, y sin riesgo calculado no hay trade serio.
- La cantidad sugerida sale siempre de `Riesgo por Operación (%)`; si superás `Tamaño Máximo de Posición (%)`, la app te lo advierte en el formulario y en el modal.
- Máximo 3 candidatos por Plan de Vuelo y un solo plan por día.
- `Lección del Día (Obligatorio)`: no podés cerrar la sesión del Plan de Vuelo sin escribirla.
- `STOP DIARIO MÁXIMO`: 3% del capital intradía. Si se alcanza, se dejó de operar por hoy.
- Ningún análisis de Research se muestra sin su panel `DATOS FUENTE`.
- Ningún resultado de Screener aparece sin score y nota de la IA.

**Glosario**

| Término | Qué significa |
| --- | --- |
| R/R (Risk/Reward) | Relación entre lo que arriesgás y lo que buscás ganar: `(target − entrada) / (entrada − stop)`. Se muestra como `1:2.4`; el Risk Calculator marca `✓ BUENO` desde 1:2. |
| ATH dist | Distancia porcentual al máximo de 52 semanas: `(precio − máximo 52s) / máximo 52s × 100`. Siempre negativa o cero; `-5%` = a un 5% del máximo. |
| RSI semanal | Índice de fuerza relativa (Wilder, 14 períodos) sobre velas semanales. Desde 70: `Sobrecomprado`; 50–70: `Zona alcista`; 30–50: `Zona bajista`; bajo 30: `Sobrevendido`. |
| Profit Factor | Ganancia bruta dividida por pérdida bruta de tus trades cerrados. Mayor a 1 = sistema rentable; el Journal lo separa por `Intraday` y `Swing`. |
| setup_type | Patrón técnico que justifica el trade: `Breakout`, `Pullback`, `Reversión`, `Earnings Play`, `Swing`, `Momentum`, `Stage 2 Breakout`, `Rango` u `Otro`. Se registra en el Plan de Vuelo y el Journal para detectar en cuál setup ganás de verdad. |
| Equity | Valor total de la cuenta: efectivo más el valor de mercado de todas las posiciones. |
| Buying Power | Capital disponible para abrir posiciones nuevas según el broker. |
| Paper trading | Modo simulación: órdenes reales en mecánica, ficticias en dinero. Todo TradeOS opera así por defecto. |
| Win Rate | Porcentaje de trades cerrados en ganancia sobre el total de trades cerrados. |

## 5. Ejemplo completo: del Screener a la orden ejecutada

Un martes cualquiera, 8:40 AM ET, con el plan del día ya inicializado en Plan de Vuelo. Así se ve el flujo completo con NVDA:

1. Abrís **Screener**, cargás `Momentum Growth` en `Seleccionar Preset...`, hacés click en `Correr` y NVDA aparece al tope de la tabla con score 92 en badge verde.
2. Hacés click en la fila de NVDA y **Research** se abre con el símbolo precargado; presionás `Analizar`.
3. Mientras leés el análisis verificás en `DATOS FUENTE` que `DIST. ATH` está a un -5.2% del máximo y `RSI SEMANAL` en 65 (zona alcista), confirmás en `📉 ANÁLISIS FUNDAMENTAL` que el EPS estimado supera el guidance, y revisás qué recomienda `💼 TU EXPOSICIÓN` sobre tu posición actual.
4. Convencido, volvés al **Screener** y hacés click en el botón de avión (`Agregar al Plan de Vuelo`) en la fila de NVDA.
5. En **Plan de Vuelo** completás el candidato: `Stop Loss` debajo del soporte, `Target` en la resistencia, `Tesis de Entrada` en una oración — *"Breakout con volumen sobre resistencia, fundamentales acompañan y sin earnings esta semana"* — y `Tipo de Setup` en `Breakout`.
6. Marcás los 9 puntos del `CHECKLIST PRE-SESIÓN`, dejás `Bias del Mercado` en `Bullish`, y el plan queda `LISTO PARA DESPEGAR`.
7. En la apertura vas a **Trading** e ingresás NVDA en el campo `SÍMBOLO` de `NUEVA ORDEN`, con el stop y el target del plan.
8. El `RISK CALCULATOR` muestra la `Qty sugerida` con tu 2% de riesgo; revisás que `Capital en riesgo` sea un número que podés perder sin drama y que `R/R ratio` marque `✓ BUENO`.
9. Hacés click en `REVISAR ORDEN` y en `CONFIRMAR ORDEN` verificás que `TIPO DE OPERACIÓN` esté en `INTRADAY` (preseleccionado desde el plan; sería `SWING` si fueras a mantener días) y presionás `Confirmar Compra`.
10. Abrís **Journal**, hacés click en `Nueva entrada` e ingresás NVDA: la tesis, stop, target y tipo llegan precargados desde la orden y el plan — completás `Estado emocional` en `Tranquilo` y `Nivel de convicción` en 4, y guardás.
11. Durante la sesión monitoreás la posición en el **Dashboard**: la tarjeta de NVDA en `Posiciones Abiertas` muestra el PnL en tiempo real, en verde mientras acompañe.
12. Al cerrar la posición volvés al **Journal** y completás el post-mortem: `Resultado` en `Win`, en `✅ ¿Qué funcionó?` anotás que respetaste la qty sugerida, en `❌ ¿Qué falló?` que saliste antes del target por ansiedad, y en `📚 Lección principal` — *"si el setup sigue válido, el target se respeta"*.
13. Al día siguiente, al preparar el nuevo plan, **Plan de Vuelo** te muestra automáticamente `LECCIÓN DE LA SESIÓN ANTERIOR` con esa frase — y el loop de mejora queda cerrado.

---

*TradeOS Personal · Manual de usuario · Las capturas de pantalla se omiten a propósito: cada nombre citado en `este formato` es el texto literal que vas a encontrar en la interfaz.*
