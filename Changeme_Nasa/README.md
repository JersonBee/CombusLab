# CombusLab

The React/Vite dashboard and Node.js API deploy together. Dashboard opens with a synchronized SAFFIRE series, Discover shows trial details, and Ranking orders investigations by documented scenario matches. Compare shows conditions side by side and overlays compatible measurements. Data Lab provides exports, Safety Insights explains evidence coverage, and Resources links to NASA PSI.

## Architecture and deployment

Use the Git repository root as the Vercel Root Directory so Vercel reads the [root configuration](../vercel.json). One deployment publishes the dashboard and its Node.js functions. Browser requests use relative `/api/*` URLs on the same domain.

The HTTP adapter validates requests and coordinates the catalog, experiments, series and export modules in `server/modules/`. Read operations share a read-only PostgreSQL snapshot. The chart assistant calls the Supabase Edge Function, where provider credentials and session verification are managed. Sentry monitors the dashboard and API.

## Local development

From the Git repository root, run `npm ci --prefix Changeme_Nasa` and `npm run api --prefix Changeme_Nasa`. The API listens on port 8787. In a second terminal, run `npm ci --prefix Changeme_Nasa/dashboard` and `npm run dev --prefix Changeme_Nasa/dashboard`. Vite proxies `/api` to the local server.

The API requires `COMBUSLAB_DB_HOST`, `COMBUSLAB_DB_USER`, `COMBUSLAB_DB_PASSWORD`, and `COMBUSLAB_DB_CA`. The CA variable contains the PEM certificate and the user includes the project suffix on the Supabase Session pooler. These values belong in the ignored root `.env` locally and in the server-side environment for deployment.

## Read endpoints

| Request | Response |
|---|---|
| `GET /api/catalog?view=inventory` | Per-investigation trial counts, quantitative coverage and NASA PSI sources. |
| `GET /api/catalog?view=test-days&investigation_id=PSI-21` | Versioned CLD Flame counts by test day and test type, with the NASA PSI source and file checksum. |
| `GET /api/catalog?investigation_id=PSI-25&page=1` | Up to 20 trial records with coverage flags. Optional filters are `q`, `flow_min` and `flow_max` in cm/s. |
| `GET /api/experiment?experiment_id=PSI-25:B10:r11` | BASS-II trial metadata, PSI provenance and six tabular conditions. |
| `GET /api/series?experiment_id=PSI-100:S1:r2&from_s=0&to_s=60` | 1,877 synchronized rows with O₂ and CO₂, units, provenance and time in seconds. |
| `GET /api/export?experiment_id=PSI-100:S1:r2&mode=series&channel=o2&from_s=0&to_s=60&format=csv` | The selected channel at native resolution with units and source references. The format can be `csv` or `json`. |
| `GET /api/export?experiment_id=PSI-25:B10:r11&mode=conditions&format=json` | Experimental conditions with units, qualifiers, bounds and provenance. |

The series endpoint accepts windows of up to 60 seconds, orders by epoch and has a maximum response of 5,000 rows. Its `truncated` property indicates when that limit is reached. PostgreSQL bigint values, including epoch milliseconds, are returned as decimal strings.

### ACME source snapshot

The bundled CLD Flame table comes from [NASA PSI-21](https://psi.nasa.gov/physci/repo/data/investigations/PSI-21). The original file is preserved under `datasets/acme/psi-21`. Run `python -m src.prepare_acme_cld` from the repository root to regenerate the API snapshot, or add `--check` to verify it. The importer verifies the NASA file version by checksum and converts the documented year/day-of-year codes to calendar dates. Daily flame counts are shown at investigation level and do not enter the integrated trial totals or time-series comparisons.

## Comparing and exporting

Open Compare and choose two distinct trial IDs from the catalog. The overlay supports O₂ and CO₂ when both trials have values for the selected channel, the same documented unit, and compatible relative time axes. For a BASS–SAFFIRE pair, the side-by-side table shows the available experimental context and the trial cards cite NASA PSI.

Downloads are per trial. The series links preserve the selected channel and time window. The conditions links export the test observations listed in the card. For CSV, see [export fields](docs/export-fields.md). Unquoted empty CSV fields and JSON nulls represent missing values.

## Chart assistant

Open the assistant on a synchronized trial chart in Dashboard or Discover. The browser submits the active trial, channel, and time window without a user account. The Edge Function rereads the published series, calculates the summary, and asks the first available provider to choose verified observations. An alternate-channel suggestion requires available readings and an explicit click to change the chart.

The frontend uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. The `chart-assistant` function uses `COMBUSLAB_ASSISTANT_ORIGINS` for allowed browser origins and `COMBUSLAB_EVIDENCE_ORIGIN` for the deployed scientific API. Groq, Cloudflare Workers AI, and Pollinations credentials stay in Supabase Edge Function secrets.

Apply the public assistant quota migration before deploying `supabase/functions/chart-assistant` with gateway JWT verification disabled. The service-only quota allows up to 12 AI requests per minute across visitors. The assistant returns the calculated evidence summary when the quota is exhausted or unavailable, or when all providers fail. Publish the Edge Function alongside the Vercel frontend release. A Git push that triggers Vercel does not publish the Edge Function.

## Testing and error monitoring

Use Node.js 24. From the Git repository root, run `npm ci --prefix Changeme_Nasa` and `npm ci --prefix Changeme_Nasa/dashboard`. The first command installs the Husky hook for local clones. The hook runs the Vitest suite before a commit. To run it separately, use `npm test --prefix Changeme_Nasa`. The API tests use a simulated database and cover validation, pagination, CSV nulls, and server errors.

| Vercel variable | Purpose |
|---|---|
| `VITE_SENTRY_DSN` | Public DSN of the React project in Sentry. Captures rendering errors and uncaught browser errors. |
| `SENTRY_DSN` | DSN of the Node project. Reports handled API failures with the route and a sanitized database error code. |
| `VITE_SENTRY_ENVIRONMENT`, `SENTRY_ENVIRONMENT` | Optional environment labels. Use distinct labels for production and preview. |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | Optional browser source-map upload. Use the React project slug and keep the token in the build environment as a sensitive variable. |

The dashboard and API run without a DSN. After setting the variables, redeploy and confirm event ingestion in the corresponding Sentry projects. When all upload variables are present, Vite generates hidden source maps and removes them after sending them to Sentry.

## Database bootstrap

`scripts/publish_metadata.py` initializes the `combuslab` schema from the project's synchronized DuckDB file. It requires DuckDB, psycopg, the official Supabase CA and an administrator connection to the database containing `public.nasa_synchronized`. The bootstrap is a one-time transaction, checks the four input row counts and provisions a login with SELECT grants for the four metadata tables and the synchronized readings. It prompts for the administrator password and writes the generated application login to the specified, previously absent local env file. Use `--help` for the file and connection arguments.

