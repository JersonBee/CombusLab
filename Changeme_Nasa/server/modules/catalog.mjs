export const investigations = ['PSI-98', 'PSI-99', 'PSI-100', 'PSI-26', 'PSI-25']
const pageSize = 20
const seriesCoverage = 'coalesce(saffire_filas, 0) + coalesce(cygnus_filas, 0) > 0'
const conditionsCoverage = 'coalesce(condiciones_filas, 0) > 0'
const coveragePredicates = new Map([
  ['series', seriesCoverage],
  ['conditions', conditionsCoverage],
  ['catalog', `NOT (${seriesCoverage} OR ${conditionsCoverage})`],
])

export async function readInventory(db) {
  const { rows } = await db.query(
    `SELECT investigation_id, min(study_name) AS study_name, min(source_url) AS source_url,
       min(source_doi) AS source_doi, count(*)::int AS trials,
       count(*) FILTER (WHERE ${seriesCoverage})::int AS series_trials,
       count(*) FILTER (WHERE ${conditionsCoverage})::int AS conditions_trials,
       sum(coalesce(condiciones_filas, 0))::int AS observations,
       count(*) FILTER (WHERE ${seriesCoverage} OR ${conditionsCoverage})::int AS quantitative_trials
     FROM combuslab.experiment_catalog
     WHERE investigation_id = ANY($1::text[])
     GROUP BY investigation_id ORDER BY investigation_id`,
    [investigations],
  )
  return { rows }
}

export async function readEvidence(db) {
  const { rows } = await db.query(
    `SELECT e.experiment_id, e.investigation_id, e.study_name, e.material_original,
       e.material_normalized, e.source_url, e.source_doi, e.repository_version,
       e.air_velocity_cm_s, e.flow_direction, e.oxygen_ambient_pct, e.oxygen_ambient_status,
       e.oxygen_ambient_qualifier, e.oxygen_initial_pct, e.oxygen_initial_status,
       (e.carbon_monoxide_initial_ppm IS NOT NULL OR e.carbon_monoxide_final_ppm IS NOT NULL) AS has_co,
       e.ignition_power_w, e.burn_duration_s, e.length_mm, e.width_mm, e.thickness_mm,
       ${seriesCoverage} AS has_series, ${conditionsCoverage} AS has_conditions,
       ARRAY(SELECT DISTINCT u.channel FROM combuslab.saffire_channel_units u
         WHERE u.investigation_id = e.investigation_id AND u.test = e.source_test_id
           AND u.channel IN ('o2', 'co2') AND u.unit = '%' AND (${seriesCoverage})
         ORDER BY u.channel) AS series_channels
     FROM combuslab.experiment_catalog e
     WHERE e.investigation_id = ANY($1::text[])
     ORDER BY e.study_name, e.experiment_id`,
    [investigations],
  )
  return { rows }
}

export async function readCatalog(db, filters) {
  const coverage = coveragePredicates.get(filters.coverage)
  const { rows } = await db.query(
    `SELECT experiment_id, investigation_id, study_name, material_original,
       ${seriesCoverage} AS has_series,
       ${conditionsCoverage} AS has_conditions
     FROM combuslab.experiment_catalog
     WHERE investigation_id = ANY($1::text[])
       AND ($2 = '' OR investigation_id = $2)
       AND strpos(lower(concat_ws(' ', study_name, experiment_id, source_test_id,
           material_original, material_normalized)), lower($3)) > 0
       AND ($4::double precision IS NULL OR air_velocity_cm_s >= $4)
       AND ($5::double precision IS NULL OR air_velocity_cm_s <= $5)
       ${coverage ? `AND (${coverage})` : ''}
     ORDER BY study_name, experiment_id LIMIT $6 OFFSET $7`,
    [investigations, filters.study, filters.query, filters.flowMin, filters.flowMax,
      pageSize + 1, (filters.page - 1) * pageSize],
  )
  return { page: filters.page, has_next: rows.length > pageSize, rows: rows.slice(0, pageSize) }
}

