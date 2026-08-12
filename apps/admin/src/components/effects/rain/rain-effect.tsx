'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

import { Raindrops } from './rain-engine'
import { RainRenderer } from './rain-renderer'
import type { RainAssets, RainEffectProps, RaindropOptions, WeatherKind } from './types'

const ASSET_ROOT = '/effects/rain'
const FOREGROUND_SIZE = { height: 64, width: 96 }
const BACKGROUND_SIZE = { height: 256, width: 384 }

const WEATHER_LABELS: Record<WeatherKind, string> = {
  drizzle: '小雨',
  'heavy-rain': '大雨',
  thunderstorm: '雷雨',
}

const WEATHER_OPTIONS: Record<WeatherKind, Partial<RaindropOptions>> = {
  drizzle: {
    dropletsRate: 10,
    dropletsSize: [3.5, 6],
    maxR: 40,
    minR: 10,
    rainChance: 0.15,
    rainLimit: 2,
  },
  'heavy-rain': {
    dropletsRate: 50,
    dropletsSize: [3, 5.5],
    maxR: 50,
    minR: 20,
    rainChance: 0.35,
    rainLimit: 6,
    trailRate: 1,
    trailScaleRange: [0.25, 0.35],
  },
  thunderstorm: {
    dropletsRate: 80,
    dropletsSize: [3, 5.5],
    maxR: 55,
    minR: 20,
    rainChance: 0.4,
    rainLimit: 6,
    trailRate: 2.5,
    trailScaleRange: [0.25, 0.4],
  },
}

let rainAssetsPromise: Promise<RainAssets> | null = null

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image()
    const handleLoad = () => resolve(image)
    image.addEventListener('load', handleLoad, { once: true })
    image.addEventListener('error', () => reject(new Error(`Unable to load ${source}`)), {
      once: true,
    })
    image.src = source
    if (image.complete && image.naturalWidth > 0) handleLoad()
  })
}

function loadRainAssets(): Promise<RainAssets> {
  rainAssetsPromise ??= Promise.all([
    loadImage(`${ASSET_ROOT}/city.jpg`),
    loadImage(`${ASSET_ROOT}/drop-alpha.png`),
    loadImage(`${ASSET_ROOT}/drop-color.png`),
    loadImage(`${ASSET_ROOT}/texture-drizzle-bg.png`),
    loadImage(`${ASSET_ROOT}/texture-drizzle-fg.png`),
    loadImage(`${ASSET_ROOT}/texture-rain-bg.png`),
    loadImage(`${ASSET_ROOT}/texture-rain-fg.png`),
    loadImage(`${ASSET_ROOT}/texture-storm-lightning-bg.png`),
    loadImage(`${ASSET_ROOT}/texture-storm-lightning-fg.png`),
  ]).then(
    ([city, dropAlpha, dropColor, drizzleBg, drizzleFg, rainBg, rainFg, stormBg, stormFg]) => ({
      city,
      drizzleBg,
      drizzleFg,
      dropAlpha,
      dropColor,
      rainBg,
      rainFg,
      stormBg,
      stormFg,
    }),
  )
  return rainAssetsPromise
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function weatherPair(assets: RainAssets, weather: WeatherKind) {
  return weather === 'drizzle'
    ? { background: assets.drizzleBg, foreground: assets.drizzleFg }
    : { background: assets.rainBg, foreground: assets.rainFg }
}

function drawTexturePair(
  foregroundContext: CanvasRenderingContext2D,
  backgroundContext: CanvasRenderingContext2D,
  foreground: CanvasImageSource,
  background: CanvasImageSource,
  clear = true,
  alpha = 1,
): void {
  if (clear) {
    foregroundContext.clearRect(0, 0, FOREGROUND_SIZE.width, FOREGROUND_SIZE.height)
    backgroundContext.clearRect(0, 0, BACKGROUND_SIZE.width, BACKGROUND_SIZE.height)
  }
  foregroundContext.globalAlpha = alpha
  backgroundContext.globalAlpha = alpha
  foregroundContext.drawImage(foreground, 0, 0, FOREGROUND_SIZE.width, FOREGROUND_SIZE.height)
  backgroundContext.drawImage(background, 0, 0, BACKGROUND_SIZE.width, BACKGROUND_SIZE.height)
  foregroundContext.globalAlpha = 1
  backgroundContext.globalAlpha = 1
}

export function RainEffect({
  className = '',
  showWeatherLabel = false,
  weather: weatherMode = 'auto',
}: RainEffectProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [renderState, setRenderState] = useState<'fallback' | 'loading' | 'ready'>('loading')
  const [weatherLabel, setWeatherLabel] = useState(
    WEATHER_LABELS[weatherMode === 'auto' ? 'heavy-rain' : weatherMode],
  )

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return

    let assets: RainAssets | null = null
    let currentWeather: WeatherKind = weatherMode === 'auto' ? 'heavy-rain' : weatherMode
    let disposed = false
    let resizeFrame = 0
    let transitionFrame = 0
    let weatherTimer = 0
    let flashTimer = 0
    let flashing = false
    let raindrops: Raindrops | null = null
    let renderer: RainRenderer | null = null

    const foregroundTexture = createCanvas(FOREGROUND_SIZE.width, FOREGROUND_SIZE.height)
    const backgroundTexture = createCanvas(BACKGROUND_SIZE.width, BACKGROUND_SIZE.height)
    const foregroundContext = foregroundTexture.getContext('2d')
    const backgroundContext = backgroundTexture.getContext('2d')
    if (!foregroundContext || !backgroundContext) {
      const fallbackTimer = window.setTimeout(() => setRenderState('fallback'), 0)
      return () => window.clearTimeout(fallbackTimer)
    }

    const renderWeather = (kind: WeatherKind) => {
      if (!assets) return
      const pair = weatherPair(assets, kind)
      drawTexturePair(foregroundContext, backgroundContext, pair.foreground, pair.background)
      renderer?.updateTextures()
    }

    const build = () => {
      if (!assets || disposed) return
      renderer?.destroy()
      raindrops?.destroy()

      const bounds = root.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(2, Math.round(bounds.width * dpr))
      canvas.height = Math.max(2, Math.round(bounds.height * dpr))
      canvas.style.width = `${bounds.width}px`
      canvas.style.height = `${bounds.height}px`

      renderWeather(currentWeather)
      raindrops = new Raindrops(
        canvas.width,
        canvas.height,
        dpr,
        assets.dropAlpha,
        assets.dropColor,
        WEATHER_OPTIONS[currentWeather],
      )
      renderer = new RainRenderer(canvas, raindrops.canvas, foregroundTexture, backgroundTexture)
      setRenderState('ready')
    }

    const transitionWeather = (nextWeather: WeatherKind) => {
      if (!assets || nextWeather === currentWeather) return
      cancelAnimationFrame(transitionFrame)
      const sourceForeground = createCanvas(FOREGROUND_SIZE.width, FOREGROUND_SIZE.height)
      const sourceBackground = createCanvas(BACKGROUND_SIZE.width, BACKGROUND_SIZE.height)
      sourceForeground.getContext('2d')?.drawImage(foregroundTexture, 0, 0)
      sourceBackground.getContext('2d')?.drawImage(backgroundTexture, 0, 0)
      const target = weatherPair(assets, nextWeather)
      const startedAt = performance.now()
      currentWeather = nextWeather
      setWeatherLabel(WEATHER_LABELS[nextWeather])
      raindrops?.setOptions(WEATHER_OPTIONS[nextWeather])
      raindrops?.clearDrops()

      const drawTransition = (now: number) => {
        if (disposed) return
        const progress = Math.min(1, (now - startedAt) / 1000)
        drawTexturePair(foregroundContext, backgroundContext, sourceForeground, sourceBackground)
        drawTexturePair(
          foregroundContext,
          backgroundContext,
          target.foreground,
          target.background,
          false,
          progress,
        )
        renderer?.updateTextures()
        if (progress < 1) transitionFrame = requestAnimationFrame(drawTransition)
      }
      transitionFrame = requestAnimationFrame(drawTransition)
    }

    const scheduleWeather = () => {
      if (weatherMode !== 'auto' || disposed) return
      const duration = 18_000 + Math.random() * 24_000
      weatherTimer = window.setTimeout(() => {
        const alternatives: WeatherKind[] = ['drizzle', 'heavy-rain', 'thunderstorm'].filter(
          (kind): kind is WeatherKind => kind !== currentWeather,
        )
        const next = alternatives[Math.floor(Math.random() * alternatives.length)] ?? 'heavy-rain'
        transitionWeather(next)
        scheduleWeather()
      }, duration)
    }

    const flash = async () => {
      if (!assets || flashing || currentWeather !== 'thunderstorm') return
      flashing = true
      const base = weatherPair(assets, currentWeather)
      const paint = (alpha: number) => {
        if (!assets || disposed) return
        drawTexturePair(foregroundContext, backgroundContext, base.foreground, base.background)
        drawTexturePair(
          foregroundContext,
          backgroundContext,
          assets.stormFg,
          assets.stormBg,
          false,
          alpha,
        )
        renderer?.updateTextures()
      }
      const wait = (milliseconds: number) =>
        new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))

      paint(1)
      await wait(25)
      const pulses = 2 + Math.floor(Math.random() * 5)
      for (let index = 0; index < pulses && !disposed; index += 1) {
        paint(0.1 + Math.random() * 0.9)
        await wait(25)
      }
      paint(1)
      await wait(100)
      const fadeStartedAt = performance.now()
      await new Promise<void>((resolve) => {
        const fade = (now: number) => {
          const progress = Math.min(1, (now - fadeStartedAt) / 250)
          paint(1 - progress)
          if (progress < 1 && !disposed) requestAnimationFrame(fade)
          else resolve()
        }
        requestAnimationFrame(fade)
      })
      flashing = false
    }

    const handlePointerMove = (event: PointerEvent) => {
      renderer?.setParallax(
        (event.clientX / Math.max(window.innerWidth, 1)) * 2 - 1,
        (event.clientY / Math.max(window.innerHeight, 1)) * 2 - 1,
      )
    }

    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame)
      resizeFrame = requestAnimationFrame(build)
    })
    resizeObserver.observe(root)
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    flashTimer = window.setInterval(() => {
      if (currentWeather === 'thunderstorm' && Math.random() <= 0.1) void flash()
    }, 500)

    void loadRainAssets()
      .then((loadedAssets) => {
        if (disposed) return
        assets = loadedAssets
        build()
        scheduleWeather()
      })
      .catch(() => {
        if (!disposed) setRenderState('fallback')
      })

    return () => {
      disposed = true
      resizeObserver.disconnect()
      cancelAnimationFrame(resizeFrame)
      cancelAnimationFrame(transitionFrame)
      window.clearTimeout(weatherTimer)
      window.clearInterval(flashTimer)
      window.removeEventListener('pointermove', handlePointerMove)
      renderer?.destroy()
      raindrops?.destroy()
    }
  }, [weatherMode])

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden bg-[#1b1728] ${className}`}
      data-rain-state={renderState}
      ref={rootRef}
    >
      <Image
        alt=""
        className="absolute inset-0 size-full object-cover"
        fill
        sizes="100vw"
        src={`${ASSET_ROOT}/city.jpg`}
      />
      <div className="absolute inset-0 bg-white/20" />
      <canvas
        className={`absolute inset-0 size-full transition-opacity duration-300 ${renderState === 'ready' ? 'opacity-100' : 'opacity-0'}`}
        ref={canvasRef}
      />
      {showWeatherLabel ? (
        <div className="absolute bottom-5 left-5 hidden items-center gap-2 rounded-full border border-white/30 bg-[#252445]/35 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-md sm:flex">
          <span className="size-1.5 rounded-full bg-primary shadow-[0_0_10px_#39c5bb]" />
          动态天气 · {weatherLabel}
        </div>
      ) : null}
    </div>
  )
}
