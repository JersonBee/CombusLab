export const notebookSources = [
  { label: 'NASA flight images · slide 17', url: 'https://ntrs.nasa.gov/api/citations/20180004258/downloads/20180004258.pdf#page=17' },
  { label: 'Published test conditions · Table 2', url: 'https://ntrs.nasa.gov/api/citations/20210011521/downloads/ICES%202021-266%200503-2021%20final.pdf' },
  { label: 'SAFFIRE-I · NASA PSI', url: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-98' },
  { label: 'SAFFIRE-III · NASA PSI', url: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-100' },
]

export const observation = 'Both tests burned SIBAL fabric with the flame moving in the direction of the airflow. NASA reports faster spread in the 25 cm/s SAFFIRE-III test than in the 20 cm/s SAFFIRE-I test.'
export const clockNote = 'NASA spaced the flame images 40 seconds apart. The gas charts start at the first calibrated reading for each trial. Alignment between the images and gas readings has not been verified.'
export const airflowNote = 'The integrated trial record lists 30 cm/s for SAFFIRE-III. The published figure and Table 2 give 25 cm/s for this concurrent-flow test, which is the value used in this case.'
export const openQuestion = 'Would the same change in airflow produce a similar change in spread rate on a different spacecraft fabric?'

export const measurements = [
  {
    id: 'front',
    label: 'Track flame-front position over time',
    feedback: 'Position over time directly measures spread rate when the images have a distance scale. Repeat at different airflow speeds with the same fabric, geometry and atmosphere to isolate the effect of flow.',
  },
  {
    id: 'oxygen',
    label: 'Measure oxygen concentration over time',
    feedback: 'Oxygen readings describe the gas environment. Measure flame-front position over time as well to learn how quickly the flame travels across the fabric.',
  },
  {
    id: 'carbon',
    label: 'Measure carbon dioxide concentration over time',
    feedback: 'Carbon dioxide readings track a combustion product at the sensor. Measure flame-front position over time as well to learn how quickly the flame travels across the fabric.',
  },
] as const

export function makeEvidenceNote(measurement: typeof measurements[number], annotation: string) {
  return [
    '# Flight Notebook – Same fabric, different airflow',
    '## Observation',
    observation,
    '## Next measurement',
    measurement.label + '. ' + measurement.feedback,
    '## Open question',
    openQuestion,
    ...(annotation.trim() ? ['## My notes', annotation.trim()] : []),
    '## Evidence limits',
    clockNote,
    airflowNote,
    '## Sources',
    notebookSources.map(({ label, url }) => '- [' + label + '](' + url + ')').join('\n'),
  ].join('\n\n') + '\n'
}
