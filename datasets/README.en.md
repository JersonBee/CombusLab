# Flame in Freefall datasets

## Files and scope

The data build produces local artifacts in `datasets/`. A fresh Git clone contains the preparation scripts, the committed CLD Flame source table, and the Supabase column map. Generate the larger artifacts using the steps below. Open the DuckDB file in read-only mode when analyzing the published release.

| Generated artifact | Coverage | Use |
|---|---:|---|
| `nasa_master.parquet` | 420,421 rows, 145 columns | Inspect integrated source records, test conditions, and calibration records. |
| `nasa_synchronized.duckdb` | 226,124 unique rows in `measurements` | Query synchronized readings, experiment metadata, conditions, and units. |

The release uses English `snake_case` column and table names. Values, identifiers, and source text retain their meaning. The files come from integrated master v0.3 and unified release v2.0. The dashboard also exports per-trial CSV and JSON. In CSV imports, interpret unquoted empty fields as `NULL`.


## Source selection

Five investigations were selected from links in the supplied DOCX. SAFFIRE provides calibrated sensor tables and telemetry. BASS provides test conditions and calibration data. Selection was based on tabular coverage, documented units, and the ability to link measurements to tests. The DOI and version identify the sources used.

| Investigation | NASA PSI | DOI | Version |
|---|---|---|---:|
| SAFFIRE-I | [PSI-98](https://psi.nasa.gov/physci/repo/data/investigations/PSI-98) | 10.60555/0t15-1z43 | 4 |
| SAFFIRE-II | [PSI-99](https://psi.nasa.gov/physci/repo/data/investigations/PSI-99) | 10.60555/2chp-m469 | 5 |
| SAFFIRE-III | [PSI-100](https://psi.nasa.gov/physci/repo/data/investigations/PSI-100) | 10.60555/040q-4h36 | 4 |
| BASS | [PSI-26](https://psi.nasa.gov/physci/repo/data/investigations/PSI-26) | 10.60555/58h4-dy80 | 4 |
| BASS-II | [PSI-25](https://psi.nasa.gov/physci/repo/data/investigations/PSI-25) | 10.60555/4qc4-de67 | 4 |

## Ingestion, restructuring, and cleaning

1. **Inventory and download.** PSI investigation pages and the public file inventory were consulted. The original experimental CSVs were downloaded directly. Selected Excel and CSV sources then supplied sensor, telemetry, test matrix, and calibration data. Manifests in `data/raw` and `data/expanded_raw` record file names, versions, DOI, size, and SHA-256 hashes.
2. **Parsing and classification.** The CSV reader respected quoted fields. Calamine read the Excel sheets through pandas, and the original Excel XML provided an independent row count check. Of 272 source CSV rows, 263 were classified as experimental records and nine as notes, auxiliary records, or maintenance. Original values, published units, and file, sheet, and row references were retained.
3. **Schema and rules.** Source-specific mappings defined experiment, observation, and provenance tables. Unit conversions used explicitly specified compatible units. Exact values, approximations, ranges, bounds, missing values, and overrange readings were distinguished. Identifiers, suffixes, operational sequences, and ambiguous values retained their source context. Zeros were handled according to channel and source conventions, without blanket imputation.
4. **Support master.** Its 420,421 rows contain 419,558 time events, 307 canonical condition records, and 556 calibration points. The integration collapsed 1,761,852 exact value repeats and retained their provenance in the working area. Conflicting value versions remain available in the integration workspace. The corresponding flat master cell is null. The `missing_clock` field flags 89,942 events without a usable clock for this integration. The historical 330,479-row view required clock presence, a less stringent criterion than synchronization.

### How to read the master

Use `record_type` to separate time events, reported and planned conditions, and calibration points before computing statistics. A planned condition records the test plan. Confirm its execution against the trial metadata. Calibrated measurements and telemetry remain distinct source domains. Use source-specific clock audits to establish synchronization and continuity across instrument resets. Preserve nulls for conflicting values and keep unit-unspecified channels separate from calibrated measurements.

## Synchronization and final table

The 225,300 calibrated rows came from 13 tests. Within each test, elapsed time was checked for uniqueness, increasing order, and agreement with the published epoch. The synchronized view uses 29 calibrated channels with verifiable units. It masks 15,945 negative fan-speed readings. Negative values on other channels were retained where the sign convention or instrument baseline could account for them. The igniter voltage scale requires review, and that channel is outside the final view.

Paired Cygnus and SAFFIRE clocks were evaluated on held-out pairs, and segment-level corrections were tested. The 1 Hz SAFFIRE-III source contributed 846 Cygnus rows within the S1 and S2 test windows. Each row required an exact anchor or two anchors at most two seconds apart. The maximum observed residual across 427 held-out clock pairs was 3 ms. Zeros with ambiguous update semantics in telemetry were masked. This validation covers time alignment. Physical sensor response delays remain unverified. Other Cygnus sources were withheld because of unresolved offsets or insufficient coverage inside the test windows.

An exact join on `(experiment_id, epoch_ms)` merged 22 matches. **225,300 + 846 − 22 = 226,124 unique rows**, with no resampling or imputation. `time_s` starts at the first calibrated record of each test. Nulls should display as gaps. BASS and BASS-II provide 735 condition observations outside the time-series table.

## Tools and libraries

| Tool | Purpose |
|---|---|
| Python 3.12, `urllib.request`, `csv`, `hashlib`, `zipfile` | Public service access, parsing, checksums, and packaging. |
| pandas and NumPy | Data frames, cleaning, checks, and clock analysis. |
| python-calamine and openpyxl | Excel reading and source sheet inspection. |
| Pint, Pydantic, Pandera | Units, structured values, and table validation. |
| DuckDB and PyArrow | SQL integration, uniqueness checks, and Parquet exports. |
| unittest, Hypothesis, and lxml | Parser and relationship tests and comparison with original XML. |
| Browser, pypdf, and lxml | Portal inspection and extraction of documentary context during research. |

Pinned versions are listed in [requirements.txt](../requirements.txt). Documentation informed source interpretation. Synchronized measurements came from the sensor and telemetry tables. PowerShell ran the scripts in an isolated virtual environment.

## Reproduction and use

From the project root with the sources downloaded, run `build_dataset` → `build_expanded_dataset` → `integrate_all_data` → `finalize_integrated` → `clean_synchronized` → `synchronize_telemetry` → `prepare_app_data` → `release_app_data` → `release_unified_app` → `export_datasets_folder`. Each module runs as `python -m src.<name>`. To retrieve the sources again, use `download_sources`, `inventory_sources`, and `download_expanded`. The clock offset audit is available in `audit_clock_segments`. Use `python -m unittest discover -s tests -v` to validate the pipeline.

Open DuckDB in read-only mode. `experiment_catalog` has 263 experimental records. The `measurements` key is `(experiment_id, epoch_ms)`. Units are available in `saffire_channel_units` and `cygnus_channel_units`. Exported values, counts, uniqueness, and window queries were verified.

```sql
SELECT time_s, o2, co2, cygnus_pcm_air_temperature_c
FROM measurement_series('PSI-100:S1:r2', 0, 60);
```
