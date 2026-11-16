<p align="center">
  <img src="Changeme_Nasa/dashboard/src/assets/logo.svg" alt="CombusLab pixel-art logo" width="96">
</p>

<h1 align="center">CombusLab</h1>

<p align="center"><strong>A field notebook for fire in microgravity</strong></p>

<p align="center">
  <a href="https://combuslab.vercel.app/">Open the dashboard</a> ·
  <a href="https://combuslab.vercel.app/flight-notebook">Try Flight Notebook</a> ·
  <a href="https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/">NASA Space Apps Challenge</a>
</p>

---

## Project summary

CombusLab is an interactive research dashboard built for the 2026 NASA Space Apps Challenge, *Flame in Freefall*. It brings NASA microgravity combustion records into one place so students, researchers, and curious explorers can see how flames behave when gravity and airflow differ from everyday experience. Users can inspect synchronized gas readings, compare documented trial conditions, rank investigations for a fire-safety scenario, and ask a scientific copilot to explain the evidence with NASA citations. Flight Notebook turns a real SAFFIRE comparison into a guided investigation. Visitors follow published flame-front images, choose what they would measure next, and download an evidence note with their own observations. By making experimental conditions, missing measurements, and sources visible, CombusLab helps people find evidence relevant to spacecraft fire-safety questions and see where further testing is needed for future missions to the Moon and Mars.

## Explore the lab

| View | What you can do |
| --- | --- |
| **Dashboard and Discover** | Inspect SAFFIRE oxygen and carbon dioxide time series, search experiments by material or conditions, and view trial metadata and sources. |
| **Compare** | Compare trials across SAFFIRE and BASS. Overlay gas readings when both trials have documented compatible units and time references. Each trial's clock starts at its first calibrated reading. |
| **Ranking and Safety Insights** | Match documented trial conditions to adjustable spacecraft, lunar, or Martian scenarios. See which criteria match, differ, or lack evidence. Scores measure relevance to the selected scenario. |
| **Data Lab** | Inspect candidate variables and export available series or experimental conditions as CSV or JSON. |
| **Flight Notebook** | Step through NASA's published SAFFIRE-I and SAFFIRE-III flame-front composites, compare gas readings, and download a Markdown evidence note with your proposed next measurement. |
| **Scientific copilot** | Open the pixel-art flame from any view, ask a follow-up about the active study or chart, and inspect NASA citations. The dashboard and copilot are public. |
| **Resources** | Browse the NASA research library and see which investigations have integrated records, partial coverage, or external datasets. |

## Design and development

We designed Flight Notebook around a question a visitor could investigate in a few minutes. How does changing airflow affect flame spread over the same fabric? Flight Notebook makes that question hands-on. A pixel-art flame marks the selected front in the published images, and the downloadable note captures the visitor's choice of measurement, their observations, and an open research question. The same trial pair opens directly in Compare. The visual identity combines a small pixel-art crew member with an orbital backdrop. The interface supports keyboard input and reduced motion.

We prioritized sources with documented units, usable clocks, and trial-level provenance. The pipeline checks for duplicates and preserves missing values. Flight Notebook labels the published image interval separately from the instrument clocks because alignment between them has not been verified. Coverage varies by experiment, so comparison and ranking expose gaps instead of assuming equivalent conditions. The copilot retrieves evidence before calling a model and distinguishes insufficient evidence from questions outside its scope. The hardware behind the measurements was NASA's flight experiment equipment. Our team developed the software and worked with published data.

## Data and NASA sources

The [dataset guide](datasets/README.en.md) documents the processing pipeline, source versions and DOIs. The integrated master has **420,421 rows** and the synchronized measurements table has **226,124 unique rows**. These figures describe different processing stages. The dashboard exposes selected channels with documented units.

| Coverage in CombusLab | NASA source |
| --- | --- |
| Integrated trial metadata and synchronized gas readings where available | [SAFFIRE-I · PSI-98](https://psi.nasa.gov/physci/repo/data/investigations/PSI-98), [SAFFIRE-II · PSI-99](https://psi.nasa.gov/physci/repo/data/investigations/PSI-99), [SAFFIRE-III · PSI-100](https://psi.nasa.gov/physci/repo/data/investigations/PSI-100) |
| Integrated trial metadata and reported conditions where available | [BASS · PSI-26](https://psi.nasa.gov/physci/repo/data/investigations/PSI-26), [BASS-II · PSI-25](https://psi.nasa.gov/physci/repo/data/investigations/PSI-25) |
| Test-day counts for the ACME CLD Flame subset | [CLD Flame · PSI-21](https://psi.nasa.gov/physci/repo/data/investigations/PSI-21) |
| Published images and experimental context for Flight Notebook | [SAFFIRE flame-front composites · slide 17](https://ntrs.nasa.gov/api/citations/20180004258/downloads/20180004258.pdf#page=17) |
| External references and datasets indexed in Resources | [FLEX · PSI-69](https://psi.nasa.gov/physci/repo/data/investigations/PSI-69), [SPICE · PSI-107](https://psi.nasa.gov/physci/repo/data/investigations/PSI-107), [SAME · PSI-102](https://psi.nasa.gov/physci/repo/data/investigations/PSI-102), [ACME](https://science.nasa.gov/mission/acme/), [SoFIE](https://science.nasa.gov/biological-physical/investigations/sofie/) |

The [Physical Sciences Informatics (PSI) combustion index](https://www.nasa.gov/physical-sciences-informatics-psi/psi-investigations-by-research-area/) is the primary route to the original measurement files. The [NASA Technical Reports Server (NTRS)](https://ntrs.nasa.gov/) provides reports and figures used for scientific context. Related discovery portals include the [NASA Open Data Portal](https://data.nasa.gov/), the [NASA Open Science Data Repository (OSDR)](https://science.nasa.gov/biological-physical/data/osdr/), and the [NASA Open Source Software Catalog](https://github.com/nasa/Open-Source-Catalog). The measurement imports in the table are attributed to their PSI records.

## Architecture and technology

CombusLab uses a **modular monolith** for the dashboard and scientific API. Vercel deploys them together. The Node.js API serves the catalog, trial metadata, series, and exports through same-origin routes backed by read-only PostgreSQL queries. The scientific copilot routes through a Supabase Edge Function. The backend calculates and validates the evidence and citations, while the model selects and orders supported observations. A private, five-minute Supabase cache stores public catalog evidence. Recent conversation context stays in the browser, and the trash button clears it. A server-side backup can return evidence when the Edge Function is unavailable.

| Layer | Stack |
| --- | --- |
| Front end | React, TypeScript, Vite, React Router, Tailwind CSS, Chart.js, Lucide |
| API and hosting | Node.js 24, Vercel Functions |
| Storage and AI | Supabase PostgreSQL, Supabase Edge Functions running Deno, Groq, Cloudflare Workers AI, Pollinations AI |
| Dataset preparation | Python, pandas, NumPy, DuckDB, PyArrow, Pint, Pandera |
| Quality and observability | Vitest, Husky, Python test suites, Sentry |

### AI tools used

| Where | Tools |
| --- | --- |
| Development and iteration | Google Gemini, Anthropic Claude, and OpenAI Codex |
| Copilot at runtime | Groq, Cloudflare Workers AI, and Pollinations AI |

## Run locally

Use Node.js 24. From the repository root, install both packages.

```sh
npm ci --prefix Changeme_Nasa
npm ci --prefix Changeme_Nasa/dashboard
```

Start the API and the front end in separate terminals.

```sh
npm run api --prefix Changeme_Nasa
npm run dev --prefix Changeme_Nasa/dashboard
```

Open `http://localhost:5173`. Vite forwards `/api` requests to port `8787`. The [developer guide](Changeme_Nasa/README.md) covers environment variables, data access, and deployment. The [dataset guide](datasets/README.en.md) covers Python setup and data reproduction.

```sh
npm test --prefix Changeme_Nasa
npm run build --prefix Changeme_Nasa/dashboard
```
