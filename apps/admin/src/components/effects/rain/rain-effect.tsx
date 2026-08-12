'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

import { RaindropSurface } from './raindrop-surface'
import type { RainEffectProps, WeatherProfile } from './types'
import {
  createFixedWeatherState,
  createWeatherState,
  getWeatherProfile,
  advanceWeather,
} from './weather'
import { WebGLRainRenderer } from './webgl-rain-renderer'
import { supportsWebGL } from './webgl-support'

const DEFAULT_SCENE = '/images/effects/rain/rainy-night-city.png'

function randomBetween(minimum: number, maximum: number): number {
  return minimum + Math.random() * (maximum - minimum)
}

function lightningIntensity(startedAt: number, now: number): number {
  if (startedAt < 0) return 0
  const elapsed = now - startedAt
  const pulse = (start: number, duration: number, power: number) => {
    const progress = (elapsed - start) / duration
    return progress >= 0 && progress <= 1 ? Math.sin(progress * Math.PI) * power : 0
  }
  return Math.max(pulse(0, 100, 0.9), pulse(145, 85, 0.5), pulse(310, 150, 0.74))
}

export function RainEffect({
  className = '',
  fit = 'cover',
  intensity = 1,
  sceneSrc = DEFAULT_SCENE,
  showWeatherLabel = false,
  themeColor = '#39c5bb',
  weather: weatherMode = 'auto',
}: RainEffectProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<HTMLImageElement>(null)
  const [renderState, setRenderState] = useState<'fallback' | 'loading' | 'ready'>('loading')
  const [weatherLabel, setWeatherLabel] = useState(
    weatherMode === 'thunderstorm' ? '雷雨' : weatherMode === 'heavy-rain' ? '大雨' : '小雨',
  )

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    const image = sceneRef.current
    if (!root || !canvas || !image) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const normalizedIntensity = Math.min(1.8, Math.max(0.25, intensity))
    const surface = new RaindropSurface()
    let renderer: WebGLRainRenderer | null = null
    let resizeObserver: ResizeObserver | null = null
    let frameId = 0
    let disposed = false
    let initialized = false
    let lastFrame = performance.now()
    let weatherState =
      weatherMode === 'auto'
        ? createWeatherState(lastFrame)
        : createFixedWeatherState(weatherMode, lastFrame)
    let lightningStartedAt = -1
    let nextLightningAt = lastFrame + randomBetween(7_000, 18_000)

    const resize = () => {
      if (!renderer) return
      const bounds = root.getBoundingClientRect()
      const width = Math.max(2, bounds.width)
      const height = Math.max(2, bounds.height)
      const changed = surface.resize(width, height)
      renderer.resize(width, height)
      if (changed) {
        surface.prime(getWeatherProfile(weatherState, performance.now()), normalizedIntensity)
      }
    }

    const renderFrame = (profile: WeatherProfile, lightning: number, now: number) => {
      renderer?.render({
        fit,
        lightning,
        mist: profile.mist,
        rain: profile.streakRate,
        surface: surface.canvas,
        themeColor,
        time: now / 1_000,
        wind: profile.wind,
      })
    }

    const animate = (now: number) => {
      if (disposed || !renderer) return
      const delta = Math.min(0.034, Math.max(0.001, (now - lastFrame) / 1_000))
      lastFrame = now

      if (weatherMode === 'auto') {
        const nextState = advanceWeather(weatherState, now)
        if (nextState !== weatherState) {
          weatherState = nextState
          setWeatherLabel(weatherState.target.label)
          if (weatherState.target.thunder > 0) nextLightningAt = now + randomBetween(4_500, 11_000)
        }
      }

      const profile = getWeatherProfile(weatherState, now)
      if (profile.thunder > 0.35 && now >= nextLightningAt) {
        lightningStartedAt = now
        nextLightningAt = now + randomBetween(7_000, 18_000)
      }
      const lightning = lightningIntensity(lightningStartedAt, now) * profile.thunder
      surface.update(profile, delta, normalizedIntensity)
      renderFrame(profile, lightning, now)
      frameId = window.requestAnimationFrame(animate)
    }

    const start = () => {
      window.cancelAnimationFrame(frameId)
      if (!renderer) return
      lastFrame = performance.now()
      const profile = getWeatherProfile(weatherState, lastFrame)
      if (reducedMotion.matches) {
        surface.prime(profile, normalizedIntensity)
        renderFrame(profile, 0, lastFrame)
      } else {
        frameId = window.requestAnimationFrame(animate)
      }
    }

    const handleVisibility = () => {
      if (document.hidden) window.cancelAnimationFrame(frameId)
      else start()
    }

    const initialize = () => {
      if (disposed || initialized || !image.complete || image.naturalWidth === 0) return
      initialized = true
      if (!supportsWebGL(canvas)) {
        setRenderState('fallback')
        return
      }

      try {
        renderer = new WebGLRainRenderer(canvas, image)
        resizeObserver = new ResizeObserver(resize)
        resizeObserver.observe(root)
        document.addEventListener('visibilitychange', handleVisibility)
        reducedMotion.addEventListener('change', start)
        resize()
        const profile = getWeatherProfile(weatherState, performance.now())
        renderFrame(profile, 0, performance.now())
        setWeatherLabel(profile.label)
        setRenderState('ready')
        start()
      } catch {
        renderer?.destroy()
        renderer = null
        setRenderState('fallback')
      }
    }

    const handleImageError = () => setRenderState('fallback')
    setRenderState('loading')
    image.addEventListener('load', initialize)
    image.addEventListener('error', handleImageError)
    initialize()

    return () => {
      disposed = true
      window.cancelAnimationFrame(frameId)
      image.removeEventListener('load', initialize)
      image.removeEventListener('error', handleImageError)
      resizeObserver?.disconnect()
      document.removeEventListener('visibilitychange', handleVisibility)
      reducedMotion.removeEventListener('change', start)
      renderer?.destroy()
    }
  }, [fit, intensity, sceneSrc, themeColor, weatherMode])

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden bg-slate-950 ${className}`}
      data-rain-state={renderState}
      ref={rootRef}
    >
      <Image
        alt=""
        className={`absolute inset-0 size-full ${fit === 'cover' ? 'object-cover' : 'object-contain'}`}
        fill
        ref={sceneRef}
        sizes="100vw"
        src={sceneSrc}
      />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(2,18,19,0.44),rgba(1,9,11,0.66))]" />
      <canvas
        className={`absolute inset-0 size-full transition-opacity duration-700 ${renderState === 'ready' ? 'opacity-100' : 'opacity-0'}`}
        ref={canvasRef}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_48%,transparent_0%,rgba(1,10,12,0.06)_42%,rgba(1,8,10,0.48)_100%)]" />
      {showWeatherLabel ? (
        <div className="absolute bottom-5 left-5 hidden items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-medium text-white/75 backdrop-blur-md sm:flex">
          <span
            className="size-1.5 rounded-full shadow-[0_0_10px_currentColor]"
            style={{ backgroundColor: themeColor, color: themeColor }}
          />
          动态天气 · {weatherLabel}
        </div>
      ) : null}
    </div>
  )
}
