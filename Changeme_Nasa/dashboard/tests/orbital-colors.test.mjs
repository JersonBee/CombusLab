import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { chartColors } from '../src/components/Charts'

const stylesheet = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')

function themeColor(name) {
  return stylesheet.match(new RegExp(`--color-${name}: (#[0-9a-f]{6});`, 'i'))?.[1]
}

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map(pair => {
    const value = Number.parseInt(pair, 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

function contrast(a, b) {
  const [dark, light] = [luminance(a), luminance(b)].sort((left, right) => left - right)
  return (light + 0.05) / (dark + 0.05)
}

it('keeps the canvas chart colors aligned with the application palette', () => {
  expect(chartColors).toMatchObject({
    text: themeColor('ink'), muted: themeColor('muted'),
    cyan: themeColor('cyan'), orbital: themeColor('orbital'),
  })
})

it('keeps data labels and series legible on the brightest chart surface', () => {
  const surface = themeColor('raised')
  for (const foreground of [chartColors.text, chartColors.muted]) {
    expect(contrast(foreground, surface)).toBeGreaterThanOrEqual(4.5)
  }
  for (const foreground of [chartColors.cyan, chartColors.orbital]) {
    expect(contrast(foreground, surface)).toBeGreaterThanOrEqual(3)
  }
})
