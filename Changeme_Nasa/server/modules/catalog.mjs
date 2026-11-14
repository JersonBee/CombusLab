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

