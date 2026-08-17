'use client'

import type { KeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

const minimumThumbSize = 32
const hideDelayMs = 900

type ScrollMetrics = {
  hasOverflow: boolean
  maximumScroll: number
  scrollTop: number
  thumbSize: number
  thumbTop: number
}

const initialMetrics: ScrollMetrics = {
  hasOverflow: false,
  maximumScroll: 0,
  scrollTop: 0,
  thumbSize: 0,
  thumbTop: 0,
}

export function OverlayScrollArea({ children }: { children: ReactNode }) {
  const viewportId = useId()
  const viewportRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const hideTimerRef = useRef<number | undefined>(undefined)
  const dragRef = useRef<{ pointerId: number; scrollTop: number; y: number } | undefined>(undefined)
  const [metrics, setMetrics] = useState(initialMetrics)
  const [visible, setVisible] = useState(false)

  const updateMetrics = useCallback(() => {
    const viewport = viewportRef.current
    const track = trackRef.current
    if (!viewport || !track) return

    const maximumScroll = Math.max(0, viewport.scrollHeight - viewport.clientHeight)
    const hasOverflow = maximumScroll > 1
    const thumbSize = hasOverflow
      ? Math.max(
          minimumThumbSize,
          (track.clientHeight * viewport.clientHeight) / viewport.scrollHeight,
        )
      : 0
    const maximumThumbTop = Math.max(0, track.clientHeight - thumbSize)
    const thumbTop = maximumScroll > 0 ? (viewport.scrollTop / maximumScroll) * maximumThumbTop : 0

    setMetrics({
      hasOverflow,
      maximumScroll,
      scrollTop: viewport.scrollTop,
      thumbSize,
      thumbTop,
    })
  }, [])

  const cancelHide = useCallback(() => {
    if (hideTimerRef.current !== undefined) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = undefined
    }
  }, [])

  const scheduleHide = useCallback(() => {
    cancelHide()
    hideTimerRef.current = window.setTimeout(() => setVisible(false), hideDelayMs)
  }, [cancelHide])

  const showTemporarily = useCallback(() => {
    cancelHide()
    setVisible(true)
    scheduleHide()
  }, [cancelHide, scheduleHide])

  useEffect(() => {
    const viewport = viewportRef.current
    const content = contentRef.current
    if (!viewport || !content) return

    const resizeObserver = new ResizeObserver(updateMetrics)
    resizeObserver.observe(viewport)
    resizeObserver.observe(content)
    const animationFrame = window.requestAnimationFrame(updateMetrics)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      cancelHide()
    }
  }, [cancelHide, updateMetrics])

  function handleScroll() {
    updateMetrics()
    showTemporarily()
  }

  function handleTrackPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return

    const viewport = viewportRef.current
    const track = trackRef.current
    if (!viewport || !track || !metrics.hasOverflow) return

    const pointerOffset = event.clientY - track.getBoundingClientRect().top
    const maximumThumbTop = Math.max(0, track.clientHeight - metrics.thumbSize)
    const nextThumbTop = Math.min(
      maximumThumbTop,
      Math.max(0, pointerOffset - metrics.thumbSize / 2),
    )
    viewport.scrollTop =
      maximumThumbTop > 0 ? (nextThumbTop / maximumThumbTop) * metrics.maximumScroll : 0
  }

  function handleThumbPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const viewport = viewportRef.current
    if (!viewport) return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      scrollTop: viewport.scrollTop,
      y: event.clientY,
    }
    cancelHide()
    setVisible(true)
  }

  function handleThumbPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    const viewport = viewportRef.current
    const track = trackRef.current
    if (!drag || drag.pointerId !== event.pointerId || !viewport || !track) return

    const maximumThumbTop = Math.max(0, track.clientHeight - metrics.thumbSize)
    if (maximumThumbTop === 0) return

    viewport.scrollTop =
      drag.scrollTop + ((event.clientY - drag.y) / maximumThumbTop) * metrics.maximumScroll
  }

  function handleThumbPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return

    dragRef.current = undefined
    event.currentTarget.releasePointerCapture(event.pointerId)
    scheduleHide()
  }

  function handleTrackPointerLeave() {
    if (!dragRef.current) scheduleHide()
  }

  function handleScrollbarKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const viewport = viewportRef.current
    if (!viewport) return

    const keyScrollOffsets: Partial<Record<string, number>> = {
      ArrowDown: 40,
      ArrowUp: -40,
      PageDown: viewport.clientHeight * 0.9,
      PageUp: viewport.clientHeight * -0.9,
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      viewport.scrollTo({ top: event.key === 'Home' ? 0 : metrics.maximumScroll })
      return
    }

    const offset = keyScrollOffsets[event.key]
    if (offset === undefined) return

    event.preventDefault()
    viewport.scrollBy({ top: offset })
  }

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div
        className="admin-content-scroll h-full overflow-y-auto overscroll-contain"
        id={viewportId}
        onScroll={handleScroll}
        ref={viewportRef}
      >
        <div ref={contentRef}>{children}</div>
      </div>
      <div
        className={`absolute inset-y-2 right-1 z-30 w-3 rounded-full transition-opacity duration-200 ${
          metrics.hasOverflow ? '' : 'pointer-events-none'
        } ${metrics.hasOverflow && visible ? 'opacity-100' : 'opacity-0'}`}
        onPointerDown={handleTrackPointerDown}
        onPointerEnter={() => {
          cancelHide()
          setVisible(true)
        }}
        onPointerLeave={handleTrackPointerLeave}
        ref={trackRef}
      >
        {metrics.hasOverflow ? (
          <div
            aria-controls={viewportId}
            aria-orientation="vertical"
            aria-valuemax={Math.round(metrics.maximumScroll)}
            aria-valuemin={0}
            aria-valuenow={Math.round(metrics.scrollTop)}
            className="absolute right-0 w-1.5 touch-none rounded-full bg-foreground/30 shadow-sm transition-[width,background-color] hover:w-2 hover:bg-foreground/50 focus-visible:w-2 focus-visible:bg-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onFocus={() => {
              cancelHide()
              setVisible(true)
            }}
            onKeyDown={handleScrollbarKeyDown}
            onPointerDown={handleThumbPointerDown}
            onPointerMove={handleThumbPointerMove}
            onPointerUp={handleThumbPointerUp}
            role="scrollbar"
            style={{ height: metrics.thumbSize, transform: `translateY(${metrics.thumbTop}px)` }}
            tabIndex={0}
          />
        ) : null}
      </div>
    </div>
  )
}
