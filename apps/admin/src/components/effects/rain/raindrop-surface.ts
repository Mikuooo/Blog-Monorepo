import type { WeatherProfile } from './types'

type TrailPoint = { radius: number; x: number; y: number }

type MovingDrop = {
  age: number
  delay: number
  radius: number
  seed: number
  trail: TrailPoint[]
  velocityX: number
  velocityY: number
  x: number
  y: number
}

type DropStamp = { canvas: HTMLCanvasElement; padding: number }

const STAMP_SIZE = 72
const STAMP_VARIANTS = 10

function randomBetween(minimum: number, maximum: number): number {
  return minimum + Math.random() * (maximum - minimum)
}

function createCanvas(): HTMLCanvasElement {
  return document.createElement('canvas')
}

function createDropStamp(seed: number): DropStamp {
  const canvas = createCanvas()
  canvas.width = STAMP_SIZE
  canvas.height = STAMP_SIZE
  const context = canvas.getContext('2d')
  if (!context) throw new Error('2D canvas is unavailable')

  const image = context.createImageData(STAMP_SIZE, STAMP_SIZE)
  const phase = seed * 1.731
  for (let y = 0; y < STAMP_SIZE; y += 1) {
    for (let x = 0; x < STAMP_SIZE; x += 1) {
      const nx = ((x + 0.5) / STAMP_SIZE) * 2 - 1
      const ny = ((y + 0.5) / STAMP_SIZE) * 2 - 1
      const angle = Math.atan2(ny, nx)
      const boundary =
        0.91 +
        Math.sin(angle * 2 + phase) * 0.035 +
        Math.sin(angle * 3 - phase * 0.7) * 0.025 +
        Math.cos(angle * 5 + phase * 1.3) * 0.018
      const distance = Math.hypot(nx * 1.015, ny) / boundary
      if (distance >= 1) continue

      const dome = Math.pow(Math.max(0, 1 - distance * distance), 0.44)
      const rim = Math.min(1, Math.max(0, (1 - distance) * 16))
      const alpha = Math.round(rim * 255)
      const index = (y * STAMP_SIZE + x) * 4
      image.data[index] = Math.round(dome * 255)
      image.data[index + 1] = Math.round((nx * 0.5 + 0.5) * 255)
      image.data[index + 2] = Math.round((ny * 0.5 + 0.5) * 255)
      image.data[index + 3] = alpha
    }
  }
  context.putImageData(image, 0, 0)
  return { canvas, padding: 1.16 }
}

export class RaindropSurface {
  readonly canvas = createCanvas()

  private readonly context: CanvasRenderingContext2D
  private readonly microCanvas = createCanvas()
  private readonly microContext: CanvasRenderingContext2D
  private readonly stamps = Array.from({ length: STAMP_VARIANTS }, (_, index) =>
    createDropStamp(index + 1),
  )
  private drops: MovingDrop[] = []
  private dropBudget = 0
  private frame = 1
  private height = 1
  private microBudget = 0
  private width = 1

  constructor() {
    const context = this.canvas.getContext('2d', { alpha: false })
    const microContext = this.microCanvas.getContext('2d')
    if (!context || !microContext) throw new Error('2D canvas is unavailable')
    this.context = context
    this.microContext = microContext
  }

  resize(containerWidth: number, containerHeight: number): boolean {
    const scale = Math.min(0.78, 1040 / Math.max(containerWidth, containerHeight, 1))
    const width = Math.max(2, Math.round(containerWidth * scale))
    const height = Math.max(2, Math.round(containerHeight * scale))
    if (width === this.width && height === this.height) return false

    this.width = width
    this.height = height
    this.canvas.width = width
    this.canvas.height = height
    this.microCanvas.width = width
    this.microCanvas.height = height
    this.drops = []
    this.microBudget = 0
    this.dropBudget = 0
    this.drawSurface()
    return true
  }

  prime(profile: WeatherProfile, intensity: number): void {
    this.microContext.clearRect(0, 0, this.width, this.height)
    const areaScale = (this.width * this.height) / (900 * 650)
    const microCount = Math.round((390 + profile.dropRate * 980) * intensity * areaScale)
    const largeCount = Math.round((10 + profile.dropRate * 27) * intensity * Math.sqrt(areaScale))
    for (let index = 0; index < microCount; index += 1) this.spawnMicroDrop(profile)
    for (let index = 0; index < largeCount; index += 1) this.spawnMovingDrop(profile, true)
    this.drawSurface()
  }

  update(profile: WeatherProfile, delta: number, intensity: number): void {
    const widthScale = this.width / 900
    this.microBudget += delta * (18 + profile.dropRate * 112) * intensity * widthScale
    while (this.microBudget >= 1) {
      this.spawnMicroDrop(profile)
      this.microBudget -= 1
    }

    this.dropBudget += delta * (0.42 + profile.dropRate * 3.1) * intensity * widthScale
    const maximumDrops = Math.round((17 + profile.dropRate * 43) * intensity * widthScale)
    while (this.dropBudget >= 1 && this.drops.length < maximumDrops) {
      this.spawnMovingDrop(profile, false)
      this.dropBudget -= 1
    }

    for (const drop of this.drops) this.updateDrop(drop, profile, delta)
    this.drops = this.drops.filter(
      (drop) => drop.y - drop.radius < this.height + 36 && drop.x > -40 && drop.x < this.width + 40,
    )
    if (this.frame % 5 === 0) this.mergeDrops()
    if (this.frame % 720 === 0) this.fadeMicroDrops()
    this.frame += 1
    this.drawSurface()
  }

  private stampFor(seed: number): DropStamp {
    return this.stamps[Math.abs(Math.floor(seed * 997)) % this.stamps.length] ?? this.stamps[0]!
  }

  private drawStamp(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    seed: number,
    alpha = 1,
  ): void {
    const stamp = this.stampFor(seed)
    const width = radiusX * 2 * stamp.padding
    const height = radiusY * 2 * stamp.padding
    context.globalAlpha = alpha
    context.drawImage(stamp.canvas, x - width / 2, y - height / 2, width, height)
    context.globalAlpha = 1
  }

  private spawnMicroDrop(profile: WeatherProfile): void {
    const seed = Math.random()
    const radius = randomBetween(0.85, 2.65 + profile.dropRate * 1.35)
    const stretch = randomBetween(0.88, 1.18)
    this.drawStamp(
      this.microContext,
      randomBetween(-radius, this.width + radius),
      randomBetween(-radius, this.height + radius),
      radius,
      radius * stretch,
      seed,
      randomBetween(0.5, 0.94),
    )
  }

  private spawnMovingDrop(profile: WeatherProfile, settled: boolean): void {
    const radius = randomBetween(4.8, 9.5 + profile.dropRate * 8.8)
    this.drops.push({
      age: settled ? randomBetween(0, 7) : 0,
      delay: settled ? randomBetween(0.6, 7.5) : randomBetween(1.7, 12),
      radius,
      seed: Math.random(),
      trail: [],
      velocityX: profile.wind * randomBetween(2, 9),
      velocityY: randomBetween(3, 13) * profile.speed,
      x: randomBetween(radius, Math.max(radius + 1, this.width - radius)),
      y: randomBetween(-radius, this.height * 0.93),
    })
  }

  private updateDrop(drop: MovingDrop, profile: WeatherProfile, delta: number): void {
    drop.age += delta
    if (drop.age < drop.delay && drop.radius < 10.8) return

    const previousX = drop.x
    const previousY = drop.y
    drop.velocityY += (19 + drop.radius * 3.75) * profile.speed * delta
    drop.velocityY = Math.min(drop.velocityY, 186 * profile.speed)
    drop.velocityX += profile.wind * 6.5 * delta
    const wobble = Math.sin(drop.y * 0.047 + drop.seed * 17 + drop.age * 1.65)
    drop.x += drop.velocityX * delta + wobble * Math.min(0.46, drop.radius * 0.026)
    drop.y += drop.velocityY * delta

    if (drop.trail.length === 0 || drop.y - (drop.trail.at(-1)?.y ?? 0) > drop.radius * 0.54) {
      drop.trail.push({
        radius: Math.max(1.15, drop.radius * randomBetween(0.16, 0.3)),
        x: previousX,
        y: previousY,
      })
      if (drop.trail.length > 19) drop.trail.shift()
    }

    this.microContext.save()
    this.microContext.globalCompositeOperation = 'destination-out'
    this.microContext.lineCap = 'round'
    this.microContext.lineWidth = Math.max(2.5, drop.radius * 1.48)
    this.microContext.strokeStyle = 'rgba(0,0,0,0.92)'
    this.microContext.beginPath()
    this.microContext.moveTo(previousX, previousY)
    this.microContext.lineTo(drop.x, drop.y)
    this.microContext.stroke()
    this.microContext.restore()
  }

  private mergeDrops(): void {
    for (let first = this.drops.length - 1; first >= 0; first -= 1) {
      const a = this.drops[first]
      if (!a) continue
      for (let second = first - 1; second >= 0; second -= 1) {
        const b = this.drops[second]
        if (!b) continue
        if (Math.hypot(a.x - b.x, a.y - b.y) > (a.radius + b.radius) * 0.61) continue

        const areaA = a.radius * a.radius
        const areaB = b.radius * b.radius
        const totalArea = areaA + areaB
        a.x = (a.x * areaA + b.x * areaB) / totalArea
        a.y = (a.y * areaA + b.y * areaB) / totalArea
        a.radius = Math.min(27, Math.sqrt(totalArea))
        a.velocityY = Math.max(a.velocityY, b.velocityY) * 1.07
        a.velocityX = (a.velocityX * areaA + b.velocityX * areaB) / totalArea
        a.delay = Math.min(a.delay, b.delay)
        a.trail = [...b.trail, ...a.trail].slice(-19)
        this.drops.splice(second, 1)
        first -= 1
        break
      }
    }
  }

  private fadeMicroDrops(): void {
    this.microContext.save()
    this.microContext.globalCompositeOperation = 'destination-out'
    this.microContext.fillStyle = 'rgba(0,0,0,0.035)'
    this.microContext.fillRect(0, 0, this.width, this.height)
    this.microContext.restore()
  }

  private drawSurface(): void {
    this.context.fillStyle = '#000000'
    this.context.fillRect(0, 0, this.width, this.height)
    this.context.drawImage(this.microCanvas, 0, 0)

    for (const drop of this.drops) {
      for (let index = 0; index < drop.trail.length; index += 1) {
        const point = drop.trail[index]
        if (!point) continue
        const age = (index + 1) / drop.trail.length
        this.drawStamp(
          this.context,
          point.x,
          point.y,
          point.radius * (0.72 + age * 0.32),
          point.radius * (1.05 + age * 0.4),
          drop.seed + index * 0.13,
          0.28 + age * 0.32,
        )
      }

      const stretch = 1 + Math.min(0.82, drop.velocityY / 235)
      this.drawStamp(this.context, drop.x, drop.y, drop.radius, drop.radius * stretch, drop.seed)
      if (drop.radius > 11) {
        this.drawStamp(
          this.context,
          drop.x - drop.radius * 0.31,
          drop.y + drop.radius * stretch * 0.28,
          drop.radius * 0.62,
          drop.radius * 0.68,
          drop.seed + 0.37,
          0.76,
        )
      }
    }
  }
}
