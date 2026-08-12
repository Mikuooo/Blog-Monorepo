export type WeatherKind = 'drizzle' | 'heavy-rain' | 'thunderstorm'

export type WeatherProfile = {
  dropRate: number
  label: string
  mist: number
  speed: number
  streakRate: number
  thunder: number
  wind: number
}

export type WeatherState = {
  from: WeatherProfile
  kind: WeatherKind
  nextChangeAt: number
  target: WeatherProfile
  transitionEndAt: number
  transitionStartAt: number
}

export const WEATHER_PROFILES: Record<WeatherKind, WeatherProfile> = {
  drizzle: {
    dropRate: 0.28,
    label: '小雨',
    mist: 0.16,
    speed: 0.72,
    streakRate: 0.24,
    thunder: 0,
    wind: 0.08,
  },
  'heavy-rain': {
    dropRate: 0.78,
    label: '大雨',
    mist: 0.34,
    speed: 1.2,
    streakRate: 0.82,
    thunder: 0,
    wind: 0.2,
  },
  thunderstorm: {
    dropRate: 1,
    label: '雷雨',
    mist: 0.46,
    speed: 1.42,
    streakRate: 1,
    thunder: 1,
    wind: 0.36,
  },
}

const durationRanges: Record<WeatherKind, readonly [number, number]> = {
  drizzle: [18_000, 42_000],
  'heavy-rain': [14_000, 32_000],
  thunderstorm: [12_000, 28_000],
}

const kinds: WeatherKind[] = ['drizzle', 'heavy-rain', 'thunderstorm']

function randomBetween(random: () => number, min: number, max: number): number {
  return min + random() * (max - min)
}

export function createWeatherState(now: number, random: () => number = Math.random): WeatherState {
  const kind = kinds[Math.floor(random() * kinds.length)] ?? 'drizzle'
  const profile = WEATHER_PROFILES[kind]
  const [minimum, maximum] = durationRanges[kind]

  return {
    from: profile,
    kind,
    nextChangeAt: now + randomBetween(random, minimum, maximum),
    target: profile,
    transitionEndAt: now,
    transitionStartAt: now,
  }
}

export function advanceWeather(
  state: WeatherState,
  now: number,
  random: () => number = Math.random,
): WeatherState {
  if (now < state.nextChangeAt) return state

  const alternatives = kinds.filter((kind) => kind !== state.kind)
  const kind = alternatives[Math.floor(random() * alternatives.length)] ?? 'drizzle'
  const transitionDuration = randomBetween(random, 4_000, 8_000)
  const [minimum, maximum] = durationRanges[kind]

  return {
    from: getWeatherProfile(state, now),
    kind,
    nextChangeAt: now + transitionDuration + randomBetween(random, minimum, maximum),
    target: WEATHER_PROFILES[kind],
    transitionEndAt: now + transitionDuration,
    transitionStartAt: now,
  }
}

export function getWeatherProfile(state: WeatherState, now: number): WeatherProfile {
  const span = state.transitionEndAt - state.transitionStartAt
  const progress = span <= 0 ? 1 : Math.min(1, Math.max(0, (now - state.transitionStartAt) / span))
  const eased = progress * progress * (3 - 2 * progress)

  return {
    dropRate: interpolate(state.from.dropRate, state.target.dropRate, eased),
    label: state.target.label,
    mist: interpolate(state.from.mist, state.target.mist, eased),
    speed: interpolate(state.from.speed, state.target.speed, eased),
    streakRate: interpolate(state.from.streakRate, state.target.streakRate, eased),
    thunder: interpolate(state.from.thunder, state.target.thunder, eased),
    wind: interpolate(state.from.wind, state.target.wind, eased),
  }
}

function interpolate(from: number, to: number, progress: number): number {
  return from + (to - from) * progress
}
