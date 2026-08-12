import type { Drop, RaindropOptions } from './types'

const DROP_TEXTURE_SIZE = 64
const DROP_TEXTURE_LEVELS = 255

const DEFAULT_OPTIONS: RaindropOptions = {
  autoShrink: true,
  collisionBoost: 1,
  collisionBoostMultiplier: 0.05,
  collisionRadius: 0.45,
  collisionRadiusIncrease: 0.0002,
  dropFallMultiplier: 1,
  dropletsCleaningRadiusMultiplier: 0.28,
  dropletsRate: 50,
  dropletsSize: [3, 5.5],
  globalTimeScale: 1,
  maxDrops: 900,
  maxR: 50,
  minR: 20,
  rainChance: 0.35,
  raining: true,
  rainLimit: 6,
  spawnArea: [-0.1, 0.95],
  trailRate: 1,
  trailScaleRange: [0.25, 0.35],
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function random(
  from = 0,
  to = 1,
  interpolation: (value: number) => number = (value) => value,
): number {
  return from + interpolation(Math.random()) * (to - from)
}

function chance(value: number): boolean {
  return random() <= value
}

function createDrop(values: Partial<Drop> & Pick<Drop, 'r' | 'x' | 'y'>): Drop {
  return {
    isNew: true,
    killed: false,
    lastSpawn: 0,
    momentum: 0,
    momentumX: 0,
    nextSpawn: 0,
    parent: null,
    shrink: 0,
    spreadX: 0,
    spreadY: 0,
    ...values,
  }
}

// TypeScript lifecycle adaptation of Lucas Bebber's Codrops Raindrops engine.
export class Raindrops {
  readonly canvas: HTMLCanvasElement

  private readonly clearDropletsTexture: HTMLCanvasElement
  private readonly context: CanvasRenderingContext2D
  private readonly dropTextures: HTMLCanvasElement[]
  private readonly droplets: HTMLCanvasElement
  private readonly dropletsContext: CanvasRenderingContext2D
  private readonly height: number
  private readonly scale: number
  private readonly width: number
  private drops: Drop[] = []
  private dropletsCounter = 0
  private frameId = 0
  private lastRender: number | null = null
  private options: RaindropOptions
  private running = true
  private textureCleaningIterations = 0

  constructor(
    width: number,
    height: number,
    scale: number,
    dropAlpha: HTMLImageElement,
    dropColor: HTMLImageElement,
    options: Partial<RaindropOptions> = {},
  ) {
    this.width = width
    this.height = height
    this.scale = scale
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this.canvas = createCanvas(width, height)
    this.droplets = createCanvas(width, height)
    const context = this.canvas.getContext('2d')
    const dropletsContext = this.droplets.getContext('2d')
    if (!context || !dropletsContext) throw new Error('2D canvas is unavailable')
    this.context = context
    this.dropletsContext = dropletsContext
    this.dropTextures = this.renderDropTextures(dropAlpha, dropColor)
    this.clearDropletsTexture = this.renderClearDropletsTexture()
    this.update()
  }

  setOptions(options: Partial<RaindropOptions>): void {
    this.options = { ...this.options, ...options }
  }

  clearDrops(): void {
    for (const drop of this.drops) {
      window.setTimeout(() => {
        drop.shrink = 0.1 + random(0.5)
      }, random(1200))
    }
    this.textureCleaningIterations = 50
  }

  destroy(): void {
    this.running = false
    cancelAnimationFrame(this.frameId)
  }

  private get deltaRadius(): number {
    return this.options.maxR - this.options.minR
  }

  private get areaMultiplier(): number {
    const area = (this.width * this.height) / this.scale
    return Math.sqrt(area / (1024 * 768))
  }

  private renderDropTextures(
    dropAlpha: HTMLImageElement,
    dropColor: HTMLImageElement,
  ): HTMLCanvasElement[] {
    const buffer = createCanvas(DROP_TEXTURE_SIZE, DROP_TEXTURE_SIZE)
    const bufferContext = buffer.getContext('2d')
    if (!bufferContext) throw new Error('2D canvas is unavailable')

    return Array.from({ length: DROP_TEXTURE_LEVELS }, (_, level) => {
      const texture = createCanvas(DROP_TEXTURE_SIZE, DROP_TEXTURE_SIZE)
      const textureContext = texture.getContext('2d')
      if (!textureContext) throw new Error('2D canvas is unavailable')

      bufferContext.clearRect(0, 0, DROP_TEXTURE_SIZE, DROP_TEXTURE_SIZE)
      bufferContext.globalCompositeOperation = 'source-over'
      bufferContext.drawImage(dropColor, 0, 0, DROP_TEXTURE_SIZE, DROP_TEXTURE_SIZE)
      bufferContext.globalCompositeOperation = 'screen'
      bufferContext.fillStyle = `rgba(0,0,${level},1)`
      bufferContext.fillRect(0, 0, DROP_TEXTURE_SIZE, DROP_TEXTURE_SIZE)

      textureContext.drawImage(dropAlpha, 0, 0, DROP_TEXTURE_SIZE, DROP_TEXTURE_SIZE)
      textureContext.globalCompositeOperation = 'source-in'
      textureContext.drawImage(buffer, 0, 0, DROP_TEXTURE_SIZE, DROP_TEXTURE_SIZE)
      return texture
    })
  }

  private renderClearDropletsTexture(): HTMLCanvasElement {
    const texture = createCanvas(128, 128)
    const context = texture.getContext('2d')
    if (!context) throw new Error('2D canvas is unavailable')
    context.fillStyle = '#000'
    context.beginPath()
    context.arc(64, 64, 64, 0, Math.PI * 2)
    context.fill()
    return texture
  }

  private drawDrop(context: CanvasRenderingContext2D, drop: Drop): void {
    const radius = drop.r
    const depthRange = this.deltaRadius === 0 ? 0 : (radius - this.options.minR) / this.deltaRadius
    let depth = Math.max(0, Math.min(1, depthRange * 0.9))
    depth *= 1 / ((drop.spreadX + drop.spreadY) * 0.5 + 1)
    const textureIndex = Math.floor(depth * (this.dropTextures.length - 1))
    const texture = this.dropTextures[textureIndex]
    if (!texture) return

    const scaleX = 1
    const scaleY = 1.5
    context.globalAlpha = 1
    context.globalCompositeOperation = 'source-over'
    context.drawImage(
      texture,
      (drop.x - radius * scaleX * (drop.spreadX + 1)) * this.scale,
      (drop.y - radius * scaleY * (drop.spreadY + 1)) * this.scale,
      radius * 2 * scaleX * (drop.spreadX + 1) * this.scale,
      radius * 2 * scaleY * (drop.spreadY + 1) * this.scale,
    )
  }

  private drawDroplet(x: number, y: number, radius: number): void {
    this.drawDrop(this.dropletsContext, createDrop({ r: radius, x, y }))
  }

  private clearDroplets(x: number, y: number, radius: number): void {
    this.dropletsContext.globalCompositeOperation = 'destination-out'
    this.dropletsContext.drawImage(
      this.clearDropletsTexture,
      (x - radius) * this.scale,
      (y - radius) * this.scale,
      radius * 2 * this.scale,
      radius * 2 * this.scale * 1.5,
    )
  }

  private addDrop(drop: Drop | null, destination: Drop[]): void {
    if (!drop || this.drops.length >= this.options.maxDrops * this.areaMultiplier) return
    destination.push(drop)
  }

  private updateRain(timeScale: number): Drop[] {
    const rainDrops: Drop[] = []
    if (!this.options.raining) return rainDrops

    const limit = this.options.rainLimit * timeScale * this.areaMultiplier
    let count = 0
    while (chance(this.options.rainChance * timeScale * this.areaMultiplier) && count < limit) {
      count += 1
      const radius = random(this.options.minR, this.options.maxR, (value) => value ** 3)
      this.addDrop(
        createDrop({
          momentum: 1 + (radius - this.options.minR) * 0.1 + random(2),
          r: radius,
          spreadX: 1.5,
          spreadY: 1.5,
          x: random(this.width / this.scale),
          y: random(
            (this.height / this.scale) * this.options.spawnArea[0],
            (this.height / this.scale) * this.options.spawnArea[1],
          ),
        }),
        rainDrops,
      )
    }
    return rainDrops
  }

  private updateDroplets(timeScale: number): void {
    if (this.textureCleaningIterations > 0) {
      this.textureCleaningIterations -= timeScale
      this.dropletsContext.globalCompositeOperation = 'destination-out'
      this.dropletsContext.fillStyle = `rgba(0,0,0,${0.05 * timeScale})`
      this.dropletsContext.fillRect(0, 0, this.width, this.height)
    }
    if (this.options.raining) {
      this.dropletsCounter += this.options.dropletsRate * timeScale * this.areaMultiplier
      for (let index = 0; index < this.dropletsCounter; index += 1) {
        this.dropletsCounter -= 1
        this.drawDroplet(
          random(this.width / this.scale),
          random(this.height / this.scale),
          random(this.options.dropletsSize[0], this.options.dropletsSize[1], (value) => value ** 2),
        )
      }
    }
    this.context.drawImage(this.droplets, 0, 0, this.width, this.height)
  }

  private updateDrops(timeScale: number): void {
    const newDrops = this.updateRain(timeScale)
    this.updateDroplets(timeScale)
    this.drops.sort((first, second) => {
      const firstValue = first.y * (this.width / this.scale) + first.x
      const secondValue = second.y * (this.width / this.scale) + second.x
      return firstValue - secondValue
    })

    for (let index = 0; index < this.drops.length; index += 1) {
      const drop = this.drops[index]
      if (!drop || drop.killed) continue

      if (
        chance(
          (drop.r - this.options.minR * this.options.dropFallMultiplier) *
            (0.1 / this.deltaRadius) *
            timeScale,
        )
      ) {
        drop.momentum += random((drop.r / this.options.maxR) * 4)
      }
      if (this.options.autoShrink && drop.r <= this.options.minR && chance(0.05 * timeScale)) {
        drop.shrink += 0.01
      }
      drop.r -= drop.shrink * timeScale
      if (drop.r <= 0) drop.killed = true

      if (this.options.raining) {
        drop.lastSpawn += drop.momentum * timeScale * this.options.trailRate
        if (drop.lastSpawn > drop.nextSpawn) {
          this.addDrop(
            createDrop({
              parent: drop,
              r: drop.r * random(...this.options.trailScaleRange),
              spreadY: drop.momentum * 0.1,
              x: drop.x + random(-drop.r, drop.r) * 0.1,
              y: drop.y - drop.r * 0.01,
            }),
            newDrops,
          )
          drop.r *= 0.97 ** timeScale
          drop.lastSpawn = 0
          drop.nextSpawn =
            random(this.options.minR, this.options.maxR) -
            drop.momentum * 2 * this.options.trailRate +
            (this.options.maxR - drop.r)
        }
      }

      drop.spreadX *= 0.4 ** timeScale
      drop.spreadY *= 0.7 ** timeScale
      const moved = drop.momentum > 0
      if (moved && !drop.killed) {
        drop.y += drop.momentum * this.options.globalTimeScale
        drop.x += drop.momentumX * this.options.globalTimeScale
        if (drop.y > this.height / this.scale + drop.r) drop.killed = true
      }

      const checkCollision = (moved || drop.isNew) && !drop.killed
      drop.isNew = false
      if (checkCollision) this.resolveCollisions(drop, index, timeScale)

      drop.momentum -= Math.max(1, this.options.minR * 0.5 - drop.momentum) * 0.1 * timeScale
      if (drop.momentum < 0) drop.momentum = 0
      drop.momentumX *= 0.7 ** timeScale

      if (!drop.killed) {
        newDrops.push(drop)
        if (moved && this.options.dropletsRate > 0) {
          this.clearDroplets(drop.x, drop.y, drop.r * this.options.dropletsCleaningRadiusMultiplier)
        }
        this.drawDrop(this.context, drop)
      }
    }
    this.drops = newDrops
  }

  private resolveCollisions(drop: Drop, index: number, timeScale: number): void {
    for (const other of this.drops.slice(index + 1, index + 70)) {
      if (
        drop === other ||
        drop.r <= other.r ||
        drop.parent === other ||
        other.parent === drop ||
        other.killed
      ) {
        continue
      }
      const deltaX = other.x - drop.x
      const deltaY = other.y - drop.y
      const distance = Math.hypot(deltaX, deltaY)
      const collisionRadius =
        this.options.collisionRadius +
        drop.momentum * this.options.collisionRadiusIncrease * timeScale
      if (distance >= (drop.r + other.r) * collisionRadius) continue

      const targetRadius = Math.min(
        this.options.maxR,
        Math.sqrt(drop.r * drop.r + other.r * other.r * 0.8),
      )
      drop.r = targetRadius
      drop.momentumX += deltaX * 0.1
      drop.spreadX = 0
      drop.spreadY = 0
      other.killed = true
      drop.momentum = Math.max(
        other.momentum,
        Math.min(
          40,
          drop.momentum +
            targetRadius * this.options.collisionBoostMultiplier +
            this.options.collisionBoost,
        ),
      )
    }
  }

  private update = (): void => {
    if (!this.running) return
    this.context.clearRect(0, 0, this.width, this.height)
    const now = Date.now()
    if (this.lastRender === null) this.lastRender = now
    let timeScale = (now - this.lastRender) / ((1 / 60) * 1000)
    if (timeScale > 1.1) timeScale = 1.1
    timeScale *= this.options.globalTimeScale
    this.lastRender = now
    this.updateDrops(timeScale)
    this.frameId = requestAnimationFrame(this.update)
  }
}
