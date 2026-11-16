import type { Scenario } from './scientificEvidence.ts'

export const scenarios = {
  spacecraft: { gravity: 'microgravity', oxygen: '', pressure: '', airflow: '', material: '', objective: 'spread' },
  lunar: { gravity: 'lunar', oxygen: '32', pressure: '10.2', airflow: '', material: '', objective: 'materials' },
  martian: { gravity: 'martian', oxygen: '', pressure: '', airflow: '', material: '', objective: 'extinction' },
} satisfies Record<string, Scenario>
