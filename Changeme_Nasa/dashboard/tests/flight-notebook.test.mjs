import { describe, expect, it } from 'vitest'
import { makeEvidenceNote, measurements, notebookSources } from '../src/flightNotebook'

describe('SAFFIRE Flight Notebook evidence export', () => {
  it.each(measurements)('includes the selected measurement and its explanation ($id)', measurement => {
    const note = makeEvidenceNote(measurement, '  Repeat with a new fabric.  ')
    expect(note).toContain(measurement.label)
    expect(note).toContain(measurement.feedback)
    expect(note).toContain('## My notes\n\nRepeat with a new fabric.')
    expect(note).toContain('## Open question')
    for (const source of notebookSources) expect(note).toContain(source.url)
  })

  it('keeps the image timing, gas clock and different airflow values visible', () => {
    const note = makeEvidenceNote(measurements[0], '   ')
    expect(note).toContain('40 seconds apart')
    expect(note).toContain('first calibrated reading for each trial')
    expect(note).toContain('Alignment between the images and gas readings has not been verified')
    expect(note).toContain('30 cm/s for SAFFIRE-III')
    expect(note).toContain('25 cm/s for this concurrent-flow test')
    expect(note).not.toContain('## My notes')
  })
})
