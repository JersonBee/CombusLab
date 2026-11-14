export const investigations = ['PSI-98', 'PSI-99', 'PSI-100', 'PSI-26', 'PSI-25']
const pageSize = 20

export async function readCatalog(db, filters) {
  const { rows } = await db.query(
    `SELECT experiment_id, investigation_id, study_name, material_original,
       coalesce(saffire_filas, 0) + coalesce(cygnus_filas, 0) > 0 AS has_series,
       coalesce(condiciones_filas, 0) > 0 AS has_conditions
     FROM combuslab.experiment_catalog
     WHERE investigation_id = ANY($1::text[])
       AND ($2 = '' OR investigation_id = $2)
       AND strpos(lower(concat_ws(' ', study_name, experiment_id, source_test_id,
           material_original, material_normalized)), lower($3)) > 0
       AND ($4::double precision IS NULL OR air_velocity_cm_s >= $4)
       AND ($5::double precision IS NULL OR air_velocity_cm_s <= $5)
     ORDER BY study_name, experiment_id LIMIT $6 OFFSET $7`,
    [investigations, filters.study, filters.query, filters.flowMin, filters.flowMax,
      pageSize + 1, (filters.page - 1) * pageSize],
  )
  return { page: filters.page, has_next: rows.length > pageSize, rows: rows.slice(0, pageSize) }
}

