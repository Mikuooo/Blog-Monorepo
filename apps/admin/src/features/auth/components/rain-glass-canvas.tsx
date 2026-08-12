'use client'

import { useEffect, useRef, useState } from 'react'

import {
  advanceWeather,
  createWeatherState,
  getWeatherProfile,
  type WeatherProfile,
} from '../lib/rain-simulation'

type RainStreak = {
  length: number
  opacity: number
  speed: number
  width: number
  x: number
  y: number
}

type GlassDrop = {
  radius: number
  slideDelay: number
  speed: number
  stretch: number
  trail: Array<{ radius: number; x: number; y: number }>
  x: number
  y: number
}

type SceneLight = {
  color: string
  radius: number
  x: number
  y: number
}

function randomBetween(minimum: number, maximum: number): number {
  return minimum + Math.random() * (maximum - minimum)
}

function drawNightScene(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  lights: SceneLight[],
  mist: number,
  lightning: number,
) {
  const sky = context.createLinearGradient(0, 0, width, height)
  sky.addColorStop(0, '#020b0b')
  sky.addColorStop(0.45, '#061d1b')
  sky.addColorStop(1, '#0a2825')
  context.fillStyle = sky
  context.fillRect(0, 0, width, height)

  const glow = context.createRadialGradient(
    width * 0.7,
    height * 0.55,
    0,
    width * 0.7,
    height * 0.55,
    width * 0.62,
  )
  glow.addColorStop(0, `rgba(57, 197, 187, ${0.08 + lightning * 0.18})`)
  glow.addColorStop(1, 'rgba(2, 11, 11, 0)')
  context.fillStyle = glow
  context.fillRect(0, 0, width, height)

  context.save()
  context.filter = `blur(${Math.max(8, Math.min(width, height) * 0.018)}px)`
  for (const light of lights) {
    const halo = context.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.radius)
    halo.addColorStop(0, light.color)
    halo.addColorStop(0.28, light.color.replace('0.78', '0.26'))
    halo.addColorStop(1, 'rgba(0,0,0,0)')
    context.fillStyle = halo
    context.fillRect(
      light.x - light.radius,
      light.y - light.radius,
      light.radius * 2,
      light.radius * 2,
    )
  }
  context.restore()

  context.fillStyle = `rgba(178, 225, 220, ${mist})`
  context.fillRect(0, 0, width, height)

  if (lightning > 0) {
    context.fillStyle = `rgba(218, 255, 252, ${lightning * 0.68})`
    context.fillRect(0, 0, width, height)
  }
}

function drawStreak(
  context: CanvasRenderingContext2D,
  streak: RainStreak,
  wind: number,
  lightning: number,
) {
  const gradient = context.createLinearGradient(
    streak.x,
    streak.y,
    streak.x + wind * 22,
    streak.y + streak.length,
  )
  gradient.addColorStop(0, 'rgba(166, 232, 227, 0)')
  gradient.addColorStop(0.55, `rgba(190, 242, 238, ${streak.opacity + lightning * 0.18})`)
  gradient.addColorStop(1, 'rgba(214, 255, 252, 0)')
  context.strokeStyle = gradient
  context.lineWidth = streak.width
  context.beginPath()
  context.moveTo(streak.x, streak.y)
  context.lineTo(streak.x + wind * 22, streak.y + streak.length)
  context.stroke()
}

function drawGlassDrop(
  context: CanvasRenderingContext2D,
  scene: HTMLCanvasElement,
  drop: GlassDrop,
  lightning: number,
) {
  for (let index = 0; index < drop.trail.length; index += 1) {
    const point = drop.trail[index]
    if (!point) continue
    const opacity = ((index + 1) / drop.trail.length) * 0.13
    context.fillStyle = `rgba(165, 225, 220, ${opacity})`
    context.beginPath()
    context.ellipse(point.x, point.y, point.radius * 0.62, point.radius, 0, 0, Math.PI * 2)
    context.fill()
  }

  const radiusX = drop.radius
  const radiusY = drop.radius * drop.stretch

  context.save()
  context.beginPath()
  context.ellipse(drop.x, drop.y, radiusX, radiusY, 0, 0, Math.PI * 2)
  context.clip()
  context.translate(drop.x, drop.y)
  context.scale(1.08, -1.08)
  context.globalAlpha = 0.76
  context.drawImage(
    scene,
    Math.max(0, drop.x - radiusX * 1.4),
    Math.max(0, drop.y - radiusY * 1.4),
    radiusX * 2.8,
    radiusY * 2.8,
    -radiusX,
    -radiusY,
    radiusX * 2,
    radiusY * 2,
  )
  context.restore()

  const shade = context.createRadialGradient(
    drop.x - radiusX * 0.3,
    drop.y - radiusY * 0.35,
    radiusX * 0.08,
    drop.x,
    drop.y,
    Math.max(radiusX, radiusY),
  )
  shade.addColorStop(0, `rgba(235,255,253,${0.68 + lightning * 0.2})`)
  shade.addColorStop(0.18, 'rgba(214,249,246,0.12)')
  shade.addColorStop(0.72, 'rgba(14,47,44,0.06)')
  shade.addColorStop(1, 'rgba(1,12,12,0.48)')
  context.fillStyle = shade
  context.beginPath()
  context.ellipse(drop.x, drop.y, radiusX, radiusY, 0, 0, Math.PI * 2)
  context.fill()

  context.strokeStyle = `rgba(218,255,252,${0.34 + lightning * 0.25})`
  context.lineWidth = Math.max(0.7, radiusX * 0.09)
  context.stroke()
}

function lightningIntensity(startedAt: number, now: number): number {
  if (startedAt < 0) return 0
  const elapsed = now - startedAt
  const pulse = (start: number, duration: number, power: number) => {
    const progress = (elapsed - start) / duration
    return progress >= 0 && progress <= 1 ? Math.sin(progress * Math.PI) * power : 0
  }
  return Math.max(pulse(0, 100, 0.88), pulse(145, 85, 0.48), pulse(310, 150, 0.72))
}

export function RainGlassCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [weatherLabel, setWeatherLabel] = useState('小雨')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) return

    const scene = document.createElement('canvas')
    const sceneContext = scene.getContext('2d', { alpha: false })
    if (!sceneContext) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let width = 1
    let height = 1
    let density = 1
    let frameId = 0
    let tick = 0
    let lastFrame = performance.now()
    let streakBudget = 0
    let dropBudget = 0
    let weather = createWeatherState(lastFrame)
    let lightningStartedAt = -1
    let nextLightningAt = lastFrame + randomBetween(7_000, 18_000)
    let streaks: RainStreak[] = []
    let drops: GlassDrop[] = []
    let lights: SceneLight[] = []

    const resize = () => {
      width = Math.max(1, window.innerWidth)
      height = Math.max(1, window.innerHeight)
      density = width < 768 ? 0.46 : width < 1200 ? 0.72 : 1
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      scene.width = width
      scene.height = height
      lights = Array.from({ length: Math.max(8, Math.round(width / 115)) }, (_, index) => ({
        color:
          index % 3 === 0
            ? 'rgba(57,197,187,0.78)'
            : index % 3 === 1
              ? 'rgba(219,250,246,0.78)'
              : 'rgba(222,174,95,0.78)',
        radius: randomBetween(30, 92),
        x: randomBetween(width * 0.08, width * 0.96),
        y: randomBetween(height * 0.32, height * 0.9),
      }))
      streaks = streaks.filter((streak) => streak.x < width && streak.y < height)
      drops = drops.filter((drop) => drop.x < width && drop.y < height)
    }

    const spawnStreak = (profile: WeatherProfile) => {
      streaks.push({
        length: randomBetween(18, 62) * profile.speed,
        opacity: randomBetween(0.1, 0.34),
        speed: randomBetween(540, 940) * profile.speed,
        width: randomBetween(0.45, 1.3),
        x: randomBetween(-width * 0.08, width * 1.04),
        y: randomBetween(-height * 0.18, -10),
      })
    }

    const spawnDrop = (profile: WeatherProfile, settled = false) => {
      const radius = randomBetween(1.4, 5.8 + profile.dropRate * 3.5)
      drops.push({
        radius,
        slideDelay: settled ? randomBetween(600, 8_000) : randomBetween(1_800, 15_000),
        speed: randomBetween(12, 36) * profile.speed,
        stretch: randomBetween(1, 1.28),
        trail: [],
        x: randomBetween(8, width - 8),
        y: settled ? randomBetween(10, height - 10) : randomBetween(8, height * 0.92),
      })
    }

    const mergeDrops = () => {
      for (let first = drops.length - 1; first >= 0; first -= 1) {
        const a = drops[first]
        if (!a) continue
        for (let second = first - 1; second >= 0; second -= 1) {
          const b = drops[second]
          if (!b) continue
          const distance = Math.hypot(a.x - b.x, a.y - b.y)
          if (distance > (a.radius + b.radius) * 0.72) continue
          const area = a.radius * a.radius + b.radius * b.radius
          a.radius = Math.min(15, Math.sqrt(area))
          a.x = (a.x + b.x) / 2
          a.y = (a.y + b.y) / 2
          a.speed = Math.max(a.speed, b.speed) * 1.08
          a.slideDelay = Math.min(a.slideDelay, b.slideDelay)
          drops.splice(second, 1)
          first -= 1
          break
        }
      }
    }

    const drawStaticFallback = () => {
      const profile = getWeatherProfile(weather, performance.now())
      drawNightScene(sceneContext, width, height, lights, 0.3, 0)
      context.drawImage(scene, 0, 0, width, height)
      if (drops.length === 0)
        for (let index = 0; index < Math.round(34 * density); index += 1) spawnDrop(profile, true)
      for (const drop of drops) drawGlassDrop(context, scene, drop, 0)
    }

    const animate = (now: number) => {
      const delta = Math.min(0.035, Math.max(0.001, (now - lastFrame) / 1_000))
      lastFrame = now
      const nextWeather = advanceWeather(weather, now)
      if (nextWeather !== weather) {
        weather = nextWeather
        setWeatherLabel(weather.target.label)
        if (weather.target.thunder > 0) nextLightningAt = now + randomBetween(4_500, 11_000)
      }
      const profile = getWeatherProfile(weather, now)

      if (profile.thunder > 0.35 && now >= nextLightningAt) {
        lightningStartedAt = now
        nextLightningAt = now + randomBetween(7_000, 18_000)
      }
      const lightning = lightningIntensity(lightningStartedAt, now) * profile.thunder

      drawNightScene(sceneContext, width, height, lights, profile.mist, lightning)
      context.drawImage(scene, 0, 0, width, height)

      streakBudget += delta * (18 + profile.streakRate * 118) * density
      while (streakBudget >= 1) {
        spawnStreak(profile)
        streakBudget -= 1
      }
      streaks = streaks.filter((streak) => streak.y < height + streak.length)
      for (const streak of streaks) {
        streak.x += profile.wind * streak.speed * delta
        streak.y += streak.speed * delta
        drawStreak(context, streak, profile.wind, lightning)
      }

      dropBudget += delta * (1.8 + profile.dropRate * 7.2) * density
      const maximumDrops = Math.round((38 + profile.dropRate * 58) * density)
      while (dropBudget >= 1 && drops.length < maximumDrops) {
        spawnDrop(profile)
        dropBudget -= 1
      }

      for (const drop of drops) {
        drop.slideDelay -= delta * 1_000
        const sliding = drop.slideDelay <= 0 || drop.radius > 8.5
        if (sliding) {
          if (
            drop.trail.length === 0 ||
            Math.abs((drop.trail.at(-1)?.y ?? 0) - drop.y) > drop.radius * 0.8
          ) {
            drop.trail.push({ radius: Math.max(0.8, drop.radius * 0.28), x: drop.x, y: drop.y })
            if (drop.trail.length > 9) drop.trail.shift()
          }
          drop.speed += 34 * delta * profile.speed
          drop.x += profile.wind * drop.speed * delta * 0.28
          drop.y += drop.speed * delta
          drop.stretch = Math.min(1.9, 1.08 + drop.speed / 180)
        }
        drawGlassDrop(context, scene, drop, lightning)
      }
      drops = drops.filter((drop) => drop.y - drop.radius < height + 26)
      if (tick % 7 === 0) mergeDrops()
      tick += 1

      frameId = window.requestAnimationFrame(animate)
    }

    const start = () => {
      window.cancelAnimationFrame(frameId)
      lastFrame = performance.now()
      if (reducedMotion.matches) drawStaticFallback()
      else frameId = window.requestAnimationFrame(animate)
    }

    const handleVisibility = () => {
      if (document.hidden) window.cancelAnimationFrame(frameId)
      else start()
    }

    const handleResize = () => {
      resize()
      if (reducedMotion.matches) drawStaticFallback()
    }

    resize()
    setWeatherLabel(weather.target.label)
    start()
    window.addEventListener('resize', handleResize)
    document.addEventListener('visibilitychange', handleVisibility)
    reducedMotion.addEventListener('change', start)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', handleVisibility)
      reducedMotion.removeEventListener('change', start)
    }
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <canvas className="absolute inset-0 size-full" ref={canvasRef} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_50%,transparent_0%,rgba(1,10,10,0.08)_38%,rgba(1,8,8,0.46)_100%)]" />
      <div className="absolute bottom-5 left-5 hidden items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-medium text-white/72 backdrop-blur-md sm:flex">
        <span className="size-1.5 rounded-full bg-primary shadow-[0_0_10px_#39c5bb]" />
        动态天气 · {weatherLabel}
      </div>
    </div>
  )
}
