import { describe, expect, it } from 'vitest'

import {
  advanceWeather,
  createFixedWeatherState,
  createWeatherState,
  getWeatherProfile,
  WEATHER_PROFILES,
} from './weather'

describe('rain weather simulation', () => {
  it('creates a state with a randomized hold duration', () => {
    const state = createWeatherState(1_000, () => 0)

    expect(state.kind).toBe('drizzle')
    expect(state.nextChangeAt).toBe(19_000)
  })

  it('never transitions directly to the same weather kind', () => {
    const initial = createWeatherState(0, () => 0)
    const next = advanceWeather(initial, initial.nextChangeAt, () => 0)

    expect(next.kind).toBe('heavy-rain')
    expect(next.kind).not.toBe(initial.kind)
  })

  it('smoothly blends weather intensity during a transition', () => {
    const state = {
      from: WEATHER_PROFILES.drizzle,
      kind: 'heavy-rain' as const,
      nextChangeAt: 30_000,
      target: WEATHER_PROFILES['heavy-rain'],
      transitionEndAt: 8_000,
      transitionStartAt: 0,
    }

    const midpoint = getWeatherProfile(state, 4_000)

    expect(midpoint.dropRate).toBeGreaterThan(WEATHER_PROFILES.drizzle.dropRate)
    expect(midpoint.dropRate).toBeLessThan(WEATHER_PROFILES['heavy-rain'].dropRate)
  })

  it('keeps explicitly selected weather fixed', () => {
    const state = createFixedWeatherState('thunderstorm', 2_000)

    expect(advanceWeather(state, 99_000)).toBe(state)
    expect(getWeatherProfile(state, 99_000)).toEqual(WEATHER_PROFILES.thunderstorm)
  })
})
