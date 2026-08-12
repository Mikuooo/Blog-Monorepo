export type RainFit = 'contain' | 'cover'

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

export type RainEffectProps = {
  className?: string
  fit?: RainFit
  intensity?: number
  sceneSrc?: string
  showWeatherLabel?: boolean
  themeColor?: string
  weather?: 'auto' | WeatherKind
}
