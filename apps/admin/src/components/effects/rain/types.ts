export type WeatherKind = 'drizzle' | 'heavy-rain' | 'thunderstorm'

export type RainEffectProps = {
  className?: string
  showWeatherLabel?: boolean
  weather?: 'auto' | WeatherKind
}

export type Drop = {
  isNew: boolean
  killed: boolean
  lastSpawn: number
  momentum: number
  momentumX: number
  nextSpawn: number
  parent: Drop | null
  r: number
  shrink: number
  spreadX: number
  spreadY: number
  x: number
  y: number
}

export type RaindropOptions = {
  autoShrink: boolean
  collisionBoost: number
  collisionBoostMultiplier: number
  collisionRadius: number
  collisionRadiusIncrease: number
  dropFallMultiplier: number
  dropletsCleaningRadiusMultiplier: number
  dropletsRate: number
  dropletsSize: readonly [number, number]
  globalTimeScale: number
  maxDrops: number
  maxR: number
  minR: number
  rainChance: number
  raining: boolean
  rainLimit: number
  spawnArea: readonly [number, number]
  trailRate: number
  trailScaleRange: readonly [number, number]
}

export type RainAssets = {
  city: HTMLImageElement
  dropAlpha: HTMLImageElement
  dropColor: HTMLImageElement
  drizzleBg: HTMLImageElement
  drizzleFg: HTMLImageElement
  rainBg: HTMLImageElement
  rainFg: HTMLImageElement
  stormBg: HTMLImageElement
  stormFg: HTMLImageElement
}
