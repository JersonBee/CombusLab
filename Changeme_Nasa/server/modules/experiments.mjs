import { investigations } from './catalog.mjs'

export async function findExperiment(db, id) {
  const { rows: [experiment] } = await db.query(
    'SELECT * FROM combuslab.experiment_catalog WHERE experiment_id = $1', [id],
  )
  return experiment && investigations.includes(experiment.investigation_id) ? experiment : null
}

export async function readConditions(db, experiment, id) {
  const { rows: conditions } = await db.query(
    'SELECT * FROM combuslab.experiment_conditions WHERE experiment_id = $1 ORDER BY field, source_column',
    [id],
  )
  return { experiment, conditions }
}
