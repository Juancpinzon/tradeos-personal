# Manual de Usuario — TradeOS Personal

Este manual es para ti: ya tienes cuenta creada, sesión activa y experiencia en trading. Aquí no hay teoría de mercados ni instalación técnica — solo cómo usar TradeOS para dos objetivos concretos: **generar opciones de inversión** (Screener → Research → Plan de Vuelo) y **operar acciones** (Plan de Vuelo → Trading → Journal).

Una aclaración antes de empezar: el badge `PAPER` que ves junto al logo significa que toda la app corre en modo simulación. Ninguna orden toca dinero real hasta que actives live trading explícitamente en Settings — y no hay razón para hacerlo hasta dominar el flujo completo.

## 1. Primer día en TradeOS

**El Dashboard de un vistazo**

1. Abre **Dashboard** (primer ítem del sidebar). Es tu pantalla de inicio y la foto completa de tu capital.
2. Mira la fila superior: `Equity Total` (valor total de la cuenta), `PnL Hoy` (resultado del día en dólares y porcentaje), `Cash` (efectivo disponible) y `Buying Power` (poder de compra). Debajo, los badges `Alpaca` y `Binance` muestran cuánto aporta cada broker al total.
3. Revisa `Posiciones Abiertas`: cada tarjeta muestra cantidad, precio de entrada, valor actual y PnL no realizado. Haz clic en una posición y vas directo a Trading con ese símbolo cargado.
4. El gráfico `Equity — últimos 30 días` muestra la evolución de tu capital. Si se ve plano, no operaste o el mercado te dio tregua.
5. `Próximos Eventos` lista los earnings de tus posiciones y watchlist en los próximos 30 días. Un earnings encima de una posición abierta es volatilidad garantizada: conviene saberlo antes, no después.
6. Si ves el badge `actualizando...` en el header, la app está sincronizando con el broker en segundo plano. Lo que ves en pantalla viene del cache local — por eso el Dashboard carga en menos de 2 segundos siempre.
7. Si ya creaste el plan del día, el widget `PLAN DE VUELO` muestra el avance del `Checklist de Pre-Sesión` y tus candidatos ejecutados.
8. Los domingos puede aparecer un banner ámbar avisando que tienes operaciones sin post-mortem esta semana. Haz clic en `Revisar ahora →` para cerrarlas — el Journal sin post-mortem es solo un diario, no una herramienta de mejora.

**Colores y números: cómo leerlos**

- Verde = ganancia, rojo = pérdida, gris = neutro. Aplica a PnL, porcentajes y velas del chart.
- Los porcentajes siempre llevan signo explícito: `+2.3%` / `-1.1%`. Los precios y PnL van en fuente monoespaciada para comparar dígitos de un vistazo.
- Badge amarillo con ícono de calendario en una posición = earnings en menos de 7 días. Trátalo como alerta, no como decoración.
- Score del Screener: badge verde (≥ 80), ámbar (60–79), gris (menos de 60).
- `Nivel de convicción` en el Journal: 5 puntos tipo semáforo, de 1 (rojo, "Muy bajo") a 5 (verde, "Muy alto").
- En el Screener, la estrella dorada marca símbolos que ya tienes en el portafolio y el ícono de ojo los que ya están en tu watchlist.

**Configura el riesgo antes de operar**

1. Abre **Settings** y ve a la sección `Gestión de Riesgo`.
2. Define `Riesgo por Operación (%)`: el capital máximo a arriesgar en un solo trade (default: 2%). De este número el Risk Calculator deriva la cantidad sugerida en cada orden — es la configuración más importante de toda la app.
3. Define `Tamaño Máximo de Posición (%)`: el peso máximo de un activo en tu portafolio (default: 15%). Si una orden lo supera, verás advertencias en el formulario y en el modal de confirmación.
4. En `API Keys (validación de conexión)` confirma que `Alpaca (NYSE)` y `Binance (Cripto)` estén en estado `CONECTADO`. Si no, ingresa las keys y presiona `Guardar y Verificar`.
5. En `Modo de Trading` verifica que diga `PAPER TRADING ACTIVADO`.
6. Opcional: si traes historial de operaciones en Excel, usa `Importar desde Excel` (sección *Importar historial de operaciones*) para que el Journal y sus estadísticas arranquen con tu experiencia real, no desde cero.

## 2. Flujo para generar opciones de inversión

**Ejecutar el Screener**

1. Abre **Screener**.
2. En `Seleccionar Preset...` carga un preset guardado. Vienen dos por defecto: `Momentum Growth` (empresas en crecimiento con momentum, revenue growth ≥ 20%) y `Breakout Técnico` (cerca de máximos con RSI semanal entre 50 y 70). Al cargar, los criterios llenan el formulario.
3. Ajusta los criterios que quieras: `Market Cap Mín.`, `Precio Mínimo ($)`, `Revenue Growth Mín. (%)`, `Distancia ATH Máx. (%)`, `RSI Semanal (Rango)`, los toggles `EPS Próx. Positivo` y `Excluir con Dividendos`, y `Tipo de Activo` (Equity, Cripto o Ambos).
4. Si la combinación te sirve para repetir, guárdala: botón de disquete (`Guardar como preset`), nombre descriptivo, `Guardar`.
5. Haz clic en `Correr`. Mientras ves `Ejecutando Análisis IA...`, el sistema filtra el universo cacheado de tickers, enriquece los candidatos con fundamentales y le pide a la IA que puntúe cada uno considerando tu portafolio actual.

**Leer los resultados**

1. Empieza por el bloque `RESUMEN DE LA IA`: dice qué encontró la corrida y cómo se relaciona con tu portafolio — qué complementa tus posiciones y qué duplicaría exposición.
2. La tabla es ordenable por columna: `Symbol`, `Nombre`, `Precio`, `Market Cap`, `Rev Growth`, `ATH%`, `RSI`, `EPS Est` y `Score`.
3. El `Score` (0–100) lo asigna la IA combinando momentum, fundamentales y técnica. Verde (≥ 80): candidato fuerte. Ámbar (60–79): interesante con reservas. Gris (menos de 60): débil frente a tus criterios.
4. Pasa el mouse sobre una fila para leer la nota de la IA: una o dos líneas explicando por qué ese símbolo destaca (o qué le falta).
5. La estrella dorada = ya está en tu portafolio (una compra sería ampliar posición, no diversificar). El ícono de ojo = ya está en tu watchlist.

**Profundizar con el Research Agent**

1. Haz clic en cualquier fila de resultados: se abre **Research** con el símbolo precargado.
2. Presiona `Analizar`, o antes elige una de las preguntas rápidas (por ejemplo *"¿Hay setup válido hoy o esperamos?"*) o escribe la tuya en `¿QUÉ QUIERES SABER?`.
3. El análisis llega en streaming con 7 secciones fijas: `📊 CUADRO DE MANDO`, `📈 TESIS DE INVERSIÓN`, `📉 ANÁLISIS FUNDAMENTAL`, `💼 TU EXPOSICIÓN` (solo si tienes posición), `⚠️ RIESGOS`, `📐 NIVELES TÉCNICOS` y `📅 PRÓXIMO CATALIZADOR`.
4. Contrasta siempre contra el panel `DATOS FUENTE` de la derecha: `PRECIO`, `DIST. ATH`, `RSI SEMANAL`, `EPS ACTUAL`, `VOLUMEN PROM.`, `REV. GROWTH YoY`, `P/E RATIO` y `PRÓX. EARNINGS`. Es el snapshot exacto de datos que usó la IA — la regla de la casa es que sin datos fuente visibles, el análisis no vale.
5. Si tienes posición en el símbolo, el panel `TU POSICIÓN` muestra cantidad, entrada, PnL y peso en el portafolio, y la sección `💼 TU EXPOSICIÓN` del análisis recomienda mantener, recortar o ampliar con números concretos.

**Enviar candidatos al Plan de Vuelo**

1. Prerequisito: tener inicializado el plan del día en **Plan de Vuelo**. Si no lo hiciste, la app te frena y te pide inicializar primero el Plan de Vuelo del día.
2. En la fila del candidato elegido, haz clic en el botón de avión (`Agregar al Plan de Vuelo`). Para enviar varios de una vez: marca sus checkboxes y usa `Exportar al Plan de Vuelo (n/3)`.
3. El límite es 3 candidatos por día — si intentas más, la app lo bloquea con "Máximo 3 candidatos por Plan de Vuelo". No es un bug: es disciplina de foco.
4. Abre **Plan de Vuelo** y completa lo que le falte a cada candidato — stop, target y tesis (paso a paso en la sección 3).

## 3. Flujo para operar

**Completar el Plan de Vuelo antes de la apertura**

1. Abre **Plan de Vuelo** antes de la apertura del mercado (9:30 AM ET para NYSE).
2. Primera vez del día: en `PREPARAR PLAN DE VUELO` elige el mercado de la sesión — `NYSE / NASDAQ`, `CRIPTO` o `AMBOS`.
3. Si cerraste sesión el día anterior, arriba aparece `LECCIÓN DE LA SESIÓN ANTERIOR` con lo que escribiste al cierre. Léela antes de planear — existe exactamente para eso.
4. Completa `CONTEXTO DEL DÍA`: `SPY Close Ayer`, `Nivel VIX`, `Bias del Mercado` (`Neutral`, `Bullish` o `Bearish`) y `Noticias Relevantes` (CPI, Fed, earnings del día).
5. En `CANDIDATOS DEL DÍA (MÁX. 3)` carga cada candidato con `Agregar Candidato` (los que exportaste del Screener ya están): `Símbolo`, `Tipo de Setup` (Breakout, Pullback, Reversión, Earnings Play, Momentum, etc.), `Tipo de Trade` (`Intraday` o `Swing`), `Precio de Entrada`, `Stop Loss`, `Target` y `Tesis de Entrada` en una oración. El R/R se calcula solo con esos números.
6. Repasa `REGLAS DE GESTIÓN DE RIESGO`: `STOP DIARIO MÁXIMO` (3% del capital intradía — si lo tocas, se terminó la sesión) y `OPERACIONES MÁXIMAS` del día.
7. Marca los 9 puntos del `CHECKLIST PRE-SESIÓN`: calendario económico revisado, niveles clave de SPY/QQQ verificados, stops de posiciones abiertas ajustados, setups de candidatos validados, capital y riesgo máximo confirmados, APIs conectadas, distracciones eliminadas, estado emocional neutral, y plan de salida (stop/target) claro para cada trade.
8. Con el checklist completo, el estado del plan pasa a `LISTO PARA DESPEGAR`. Ten presente: el Plan de Vuelo nunca ejecuta órdenes — prepara y propone; la ejecución vive en Trading.
9. Si mantienes posiciones swing, revisa el bloque `POSICIONES SWING ABIERTAS` y decide si ajustas stops antes de la apertura.

**Abrir la orden en Trading**

1. Abre **Trading**. A la izquierda está el panel `ORDER ENTRY` (con badge `PAPER MODE`); a la derecha, el chart nativo con indicadores y `TU WATCHLIST`.
2. En `NUEVA ORDEN` elige el tipo de activo (`EQUITY` o `CRIPTO`) y escribe el `SÍMBOLO` — o haz clic en un símbolo de la watchlist para precargarlo con su precio actual.
3. Elige `DIRECCIÓN` (`COMPRA` o `VENTA`) y `TIPO DE ORDEN` (`Market`, `Limit`, `Stop`, `Stop Limit`).
4. Ingresa el `STOP LOSS` — marcado `OBLIGATORIO` — y si lo tienes, el `TARGET` (`OPCIONAL — para R/R`). Ambos se dibujan como líneas horizontales sobre el chart: valida visualmente que el trade tenga sentido antes de seguir.
5. El `RISK CALCULATOR` calcula en tiempo real: `Qty sugerida` (derivada de tu `Riesgo por Operación (%)` de Settings), `Valor posición`, `Capital en riesgo`, `Dist. al stop` y `R/R ratio` — con veredicto `✓ BUENO` si es ≥ 2.
6. Acepta la sugerencia con `← Usar qty sugerida` o escribe tu cantidad en `CANTIDAD (ACCIONES)`.
7. Si la posición resultante supera tu límite, aparece `POSICIÓN EXCEDE EL MÁXIMO`: reduce la cantidad o repiensa el trade. La advertencia no bloquea, pero existe por una razón.
8. Haz clic en `REVISAR ORDEN`.

**Confirmar: el modal de confirmación**

1. Se abre `CONFIRMAR ORDEN` con el resumen completo: símbolo, tipo, cantidad, precio estimado, valor de posición, peso resultante en el portafolio, stop, target y el bloque `ANÁLISIS DE RIESGO`.
2. Campo obligatorio: `TIPO DE OPERACIÓN *` — selecciona `INTRADAY` o `SWING`. Sin esta selección el botón de confirmación queda bloqueado hasta que elijas el tipo de trade. Si el símbolo coincide con un candidato del plan del día, viene preseleccionado automáticamente.
3. Si es una orden de venta, el riesgo se presenta como `Posición protegida`: la orden protege tu posición existente en lugar de arriesgar capital nuevo.
4. Verifica el aviso `PAPER TRADING — Esta orden se ejecutará en modo simulación`.
5. Haz clic en `Confirmar Compra` (o `Confirmar Venta`). Verás el banner "Orden enviada" y la orden aparece en `HISTORIAL DE ÓRDENES` con su status (`PENDING` → `FILLED`).
6. ¿Te arrepentiste de una orden que sigue pendiente? En `HISTORIAL DE ÓRDENES` (dentro de Trading), haz clic en la X (`Cancelar orden`) — disponible solo para órdenes `PENDING` o `ACCEPTED` — y confirma la alerta.

**Registrar la operación en el Journal**

1. Con la orden ejecutada, abre **Journal** y haz clic en `Nueva entrada`.
2. Ingresa el símbolo de la operación: el formulario detecta la orden reciente y el candidato del Plan de Vuelo, y precarga tesis, stop, target y `Tipo de operación` (verás "Precargado automáticamente desde la orden ejecutada"). Usa `Cambiar` solo si necesitas corregir algo.
3. Completa los campos obligatorios: `Tesis de entrada *` (por qué entraste, en tus palabras), `Tipo de operación *` (`Intraday (Día)` o `Swing (Varios días)`), `Estado emocional *` (`Tranquilo`, `Confiado`, `Emocionado`, `Inseguro` o `Temeroso` — responde honesto, esta métrica vale oro después) y `Nivel de convicción *` (1 a 5).
4. Si aplica, agrega `Tipo de setup`, `Stop Loss planificado`, `Target planificado` y `Precio de entrada (para calcular R/R)`.
5. Haz clic en `Guardar entrada`. La entrada queda abierta (sin resultado) hasta que hagas el post-mortem.

**Cerrar el loop: el post-mortem**

1. Cuando cierres la posición, vuelve a **Journal** y abre la entrada de esa operación.
2. En la sección `Post-Trade` completa: `Resultado *` (`Win`, `Loss` o `Breakeven`), `PnL real ($)`, `PnL real (%)` y `Razón de salida` (stop hit, target alcanzado, cambio de tesis).
3. Responde las tres preguntas de aprendizaje: `✅ ¿Qué funcionó?`, `❌ ¿Qué falló?` y `📚 Lección principal`.
4. Marca `¿Seguiste el plan? *` (`Sí, seguí el plan` / `No, improvisé`) y tu estado en `¿Cómo te sientes ahora?`.
5. Haz clic en `Guardar post-mortem`. Las `Estadísticas` del Journal se recalculan al instante: `Win Rate` y `Profit Factor` — totales y separados por `Intraday` / `Swing` —, `Seguí el plan`, `Avg Win vs Avg Loss` y `Error más frecuente`.
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
- La cantidad sugerida sale siempre de `Riesgo por Operación (%)`; si superas `Tamaño Máximo de Posición (%)`, la app te lo advierte en el formulario y en el modal.
- Máximo 3 candidatos por Plan de Vuelo y un solo plan por día.
- `Lección del Día (Obligatorio)`: no puedes cerrar la sesión del Plan de Vuelo sin escribirla.
- `STOP DIARIO MÁXIMO`: 3% del capital intradía. Si se alcanza, se dejó de operar por hoy.
- Ningún análisis de Research se muestra sin su panel `DATOS FUENTE`.
- Ningún resultado de Screener aparece sin score y nota de la IA.

**Glosario**

| Término | Qué significa |
| --- | --- |
| R/R (Risk/Reward) | Relación entre lo que arriesgas y lo que buscas ganar: `(target − entrada) / (entrada − stop)`. Se muestra como `1:2.4`; el Risk Calculator marca `✓ BUENO` desde 1:2. |
| ATH dist | Distancia porcentual al máximo de 52 semanas: `(precio − máximo 52s) / máximo 52s × 100`. Siempre negativa o cero; `-5%` = a un 5% del máximo. |
| RSI semanal | Índice de fuerza relativa (Wilder, 14 períodos) sobre velas semanales. Desde 70: `Sobrecomprado`; 50–70: `Zona alcista`; 30–50: `Zona bajista`; bajo 30: `Sobrevendido`. |
| Profit Factor | Ganancia bruta dividida por pérdida bruta de tus trades cerrados. Mayor a 1 = sistema rentable; el Journal lo separa por `Intraday` y `Swing`. |
| setup_type | Patrón técnico que justifica el trade: `Breakout`, `Pullback`, `Reversión`, `Earnings Play`, `Swing`, `Momentum`, `Stage 2 Breakout`, `Rango` u `Otro`. Se registra en el Plan de Vuelo y el Journal para detectar en cuál setup ganas de verdad. |
| Equity | Valor total de la cuenta: efectivo más el valor de mercado de todas las posiciones. |
| Buying Power | Capital disponible para abrir posiciones nuevas según el broker. |
| Paper trading | Modo simulación: órdenes reales en mecánica, ficticias en dinero. Todo TradeOS opera así por defecto. |
| Win Rate | Porcentaje de trades cerrados en ganancia sobre el total de trades cerrados. |

## 5. Ejemplo completo: del Screener a la orden ejecutada

Un martes cualquiera, 8:40 AM ET, con el plan del día ya inicializado en Plan de Vuelo. Así se ve el flujo completo con NVDA:

1. Abres **Screener**, cargas `Momentum Growth` en `Seleccionar Preset...`, haces clic en `Correr` y NVDA aparece al tope de la tabla con score 92 en badge verde.
2. Haces clic en la fila de NVDA y **Research** se abre con el símbolo precargado; presionas `Analizar`.
3. Mientras lees el análisis verificas en `DATOS FUENTE` que `DIST. ATH` está a un -5.2% del máximo y `RSI SEMANAL` en 65 (zona alcista), confirmas en `📉 ANÁLISIS FUNDAMENTAL` que el EPS estimado supera el guidance, y revisas qué recomienda `💼 TU EXPOSICIÓN` sobre tu posición actual.
4. Convencido, vuelves al **Screener** y haces clic en el botón de avión (`Agregar al Plan de Vuelo`) en la fila de NVDA.
5. En **Plan de Vuelo** completas el candidato: `Stop Loss` debajo del soporte, `Target` en la resistencia, `Tesis de Entrada` en una oración — *"Breakout con volumen sobre resistencia, fundamentales acompañan y sin earnings esta semana"* — y `Tipo de Setup` en `Breakout`.
6. Marcas los 9 puntos del `CHECKLIST PRE-SESIÓN`, dejas `Bias del Mercado` en `Bullish`, y el plan queda `LISTO PARA DESPEGAR`.
7. En la apertura vas a **Trading** e ingresas NVDA en el campo `SÍMBOLO` de `NUEVA ORDEN`, con el stop y el target del plan.
8. El `RISK CALCULATOR` muestra la `Qty sugerida` con tu 2% de riesgo; revisas que `Capital en riesgo` sea un número que puedes perder sin drama y que `R/R ratio` marque `✓ BUENO`.
9. Haces clic en `REVISAR ORDEN` y en `CONFIRMAR ORDEN` verificas que `TIPO DE OPERACIÓN` esté en `INTRADAY` (preseleccionado desde el plan; sería `SWING` si fueras a mantener días) y presionas `Confirmar Compra`.
10. Abres **Journal**, haces clic en `Nueva entrada` e ingresas NVDA: la tesis, stop, target y tipo llegan precargados desde la orden y el plan — completas `Estado emocional` en `Tranquilo` y `Nivel de convicción` en 4, y guardas.
11. Durante la sesión monitoreas la posición en el **Dashboard**: la tarjeta de NVDA en `Posiciones Abiertas` muestra el PnL en tiempo real, en verde mientras acompañe.
12. Al cerrar la posición vuelves al **Journal** y completas el post-mortem: `Resultado` en `Win`, en `✅ ¿Qué funcionó?` anotas que respetaste la qty sugerida, en `❌ ¿Qué falló?` que saliste antes del target por ansiedad, y en `📚 Lección principal` — *"si el setup sigue válido, el target se respeta"*.
13. Al día siguiente, al preparar el nuevo plan, **Plan de Vuelo** te muestra automáticamente `LECCIÓN DE LA SESIÓN ANTERIOR` con esa frase — y el loop de mejora queda cerrado.

---

*TradeOS Personal · Manual de usuario · Las capturas de pantalla se omiten a propósito: cada nombre citado en `este formato` es el texto literal que vas a encontrar en la interfaz.*
