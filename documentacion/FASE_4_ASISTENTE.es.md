# Fase 4 de CombusLab

El asistente explica una gráfica a partir del ensayo, canal y ventana que el usuario tiene abiertos. La API de CombusLab consulta Supabase con su rol de lectura y Chart.js traza las observaciones con el tiempo transcurrido en segundos. La Edge Function consulta esa misma API y envía al proveedor un resumen calculado con el número de filas, faltantes, primera y última lectura, extremos, media, unidad y procedencia. Este resumen permite explicar los valores disponibles. Para explicar cuándo ocurrió un cambio o cómo evolucionó dentro de la ventana, será necesario incorporar evidencia temporal adicional.

El prototipo recibe una pregunta por petición y responde en español. El panel de Research conserva los últimos cinco turnos en pantalla y se reinicia al cambiar de ventana o ensayo. Cada petición envía la pregunta actual. La fuente PSI y el DOI acompañan la interpretación cuando están disponibles. El contexto entre preguntas, el ranking y la síntesis de fichas de BASS quedan pendientes. BASS y BASS-II aportan condiciones tabulares. Las series del prototipo corresponden a O₂ y CO₂ de ensayos SAFFIRE.

## Arquitectura y configuración

- React mantiene la selección de la gráfica. El panel de Research inicia sesión con una cuenta piloto existente de Supabase Auth y reenvía su token al invocar `chart-assistant`. La función verifica el usuario antes de consultar datos o consumir un proveedor. Antes de habilitar acceso general se necesita una cuota compartida por usuario que funcione entre instancias.
- La función prueba Groq, Cloudflare Workers AI y Pollinations AI en ese orden, hasta obtener una respuesta. Cada intento tiene un plazo de cinco segundos. Las credenciales quedan en Supabase Edge Function Secrets. [Supabase Edge Functions](https://supabase.com/docs/guides/functions/secrets)
- Python usa DuckDB y NumPy como verificación reproducible. El script coteja el payload de la gráfica contra la referencia local y comprueba orden, reloj, unidad, valores y posiciones nulas. La verificación visual en navegador comprueba que Chart.js efectivamente respete la escala y los huecos. El modelo interpreta la evidencia y la gráfica usa los puntos verificados.

| Variable | Configuración |
|---|---|
| `COMBUSLAB_EVIDENCE_ORIGIN` | Origen HTTPS del despliegue de CombusLab que sirve `/api/series`. Para pruebas locales puede ser el origen de la API local, accesible desde la función. |
| `COMBUSLAB_ASSISTANT_ORIGINS` | Orígenes exactos del dashboard, separados por comas. Incluye el origen local si se prueba con Vite. |
| `GROQ_API_KEY` | Clave de servidor de Groq. Modelo predeterminado `openai/gpt-oss-20b`. |
| `CLOUDFLARE_API_TOKEN` | Token con acceso a Workers AI. Modelo predeterminado `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID de Cloudflare utilizado por Workers AI en la ruta REST. |
| `POLLINATIONS_API_KEY` | Clave de servidor de Pollinations. Modelo predeterminado `openai/gpt-4o-mini`. |

Las variables opcionales `GROQ_MODEL`, `CLOUDFLARE_MODEL` y `POLLINATIONS_MODEL` permiten seleccionar modelos habilitados en cada cuenta. La función usa `SUPABASE_URL` y `SUPABASE_ANON_KEY` del entorno Supabase para verificar la sesión. Las claves compartidas en el chat deben sustituirse por claves nuevas antes de configurar el piloto.

El frontend requiere `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` en `Changeme_Nasa/dashboard/.env.local` o en el entorno de compilación del dashboard. Se usan la URL y la clave pública del mismo proyecto Supabase donde se despliegue la función. Las claves de proveedores se configuran exclusivamente en los secretos de la Edge Function.

Ejemplo de cuerpo JSON para `POST /functions/v1/chart-assistant`. La prueba requiere una sesión válida, la API de evidencia accesible y un proveedor configurado.

```json
{"experiment_id":"PSI-100:S1:r2","channel":"o2","from_s":0,"to_s":60,"question":"¿Qué representa esta gráfica y qué puedo concluir?"}
```

Desde la raíz del repositorio, el auditor se ejecuta con el Python del proyecto y las dependencias de `requirements.txt`.

```powershell
.\.venv\Scripts\python.exe Changeme_Nasa/scripts/check_chart.py --base-url https://TU-DOMINIO
```

## Etapas y aceptación

| Etapa | Entrega | Comprobación |
|---|---|---|
| 4.1 Contrato de evidencia | Selección de ensayo, canal y ventana con fuente, unidad y tiempo relativos. | La consulta SAFFIRE-III de 0 a 60 s devuelve 1.877 filas y el auditor conserva el orden y los nulos. |
| 4.2 Edge Function | Autenticación, recuperación de evidencia y tres adaptadores de texto con respaldo. | Una consulta autorizada devuelve respuesta y fuente. Una ventana vacía omite todos los proveedores. |
| 4.3 Asistente conversacional | Panel junto a la gráfica, historial acotado, selección visible y control de uso por usuario. | Cambiar de ensayo o ventana cambia la evidencia. La interfaz distingue los resultados medidos de la explicación. |
| 4.4 Ranking y fichas | Ranking determinista por escenario e interpretación de fichas, incluidas las condiciones BASS/BASS-II. | El ranking muestra coincidencias y ausencia de evidencia, y permite abrir la fuente de cada ensayo. |
| 4.5 Validación y demo | Auditoría Python, revisión de Chart.js, verificación de proveedores y del flujo completo. | Coinciden los puntos de origen y los entregados al dashboard. La demo comprueba un fallo de proveedor y una respuesta con evidencia insuficiente. |
