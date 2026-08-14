'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@blog/ui/components/card'
import { BarChart, LineChart } from 'echarts/charts'
import { AriaComponent, GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import type { EChartsCoreOption } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useEffect, useRef, useState } from 'react'

echarts.use([
  AriaComponent,
  BarChart,
  CanvasRenderer,
  GridComponent,
  LegendComponent,
  LineChart,
  TooltipComponent,
])

export type DashboardTrendPoint = {
  date: string
  drafts: number
  pendingComments: number
  published: number
  views: number
}

const compactNumberFormatter = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 1,
  notation: 'compact',
})

const timeRanges = [
  { label: '近 7 天', value: 'week' },
  { label: '近一个月', value: 'month' },
] as const

function getChartOption(
  data: ReadonlyArray<DashboardTrendPoint>,
  colors: {
    border: string
    drafts: string
    muted: string
    pendingComments: string
    primary: string
    views: string
  },
  reduceMotion: boolean,
): EChartsCoreOption {
  return {
    animation: !reduceMotion,
    aria: {
      decal: { show: true },
      enabled: true,
    },
    color: [colors.primary, colors.drafts, colors.pendingComments, colors.views],
    grid: {
      bottom: 56,
      containLabel: false,
      left: 58,
      right: 66,
      top: 44,
    },
    legend: {
      icon: 'roundRect',
      itemGap: 18,
      itemHeight: 8,
      itemWidth: 18,
      bottom: 0,
      left: 'center',
      textStyle: { color: colors.muted, fontSize: 12 },
    },
    series: [
      {
        barMaxWidth: 18,
        data: data.map((point) => point.published),
        emphasis: { focus: 'series' },
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        name: '已发布文章',
        type: 'bar',
        yAxisIndex: 0,
      },
      {
        barMaxWidth: 18,
        data: data.map((point) => point.drafts),
        emphasis: { focus: 'series' },
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        name: '草稿与待提交',
        type: 'bar',
        yAxisIndex: 0,
      },
      {
        barMaxWidth: 18,
        data: data.map((point) => point.pendingComments),
        emphasis: { focus: 'series' },
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        name: '待审核评论',
        type: 'bar',
        yAxisIndex: 0,
      },
      {
        data: data.map((point) => point.views),
        lineStyle: { width: 3 },
        name: '文章阅读量',
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        type: 'line',
        yAxisIndex: 1,
      },
    ],
    tooltip: {
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(23, 33, 31, 0.94)',
      borderWidth: 0,
      padding: [10, 12],
      textStyle: { color: '#ffffff', fontSize: 12 },
      trigger: 'axis',
    },
    xAxis: {
      axisLabel: { color: colors.muted, fontSize: 12, margin: 14 },
      axisLine: { lineStyle: { color: colors.border } },
      axisTick: { show: false },
      data: data.map((point) => point.date),
      type: 'category',
    },
    yAxis: [
      {
        axisLabel: { color: colors.muted, fontSize: 11 },
        name: '内容数量',
        nameGap: 14,
        nameTextStyle: { color: colors.muted, padding: [0, 0, 8, 0] },
        splitLine: { lineStyle: { color: colors.border, type: 'dashed' } },
        type: 'value',
      },
      {
        axisLabel: {
          color: colors.muted,
          fontSize: 11,
          formatter: (value: number | string) => compactNumberFormatter.format(Number(value)),
        },
        axisLine: { lineStyle: { color: colors.views }, show: true },
        name: '阅读次数',
        nameGap: 14,
        nameTextStyle: { color: colors.muted, padding: [0, 0, 8, 0] },
        splitLine: { show: false },
        type: 'value',
      },
    ],
  }
}

export function DashboardOverviewChart({ data }: { data: ReadonlyArray<DashboardTrendPoint> }) {
  const chartElementRef = useRef<HTMLDivElement>(null)
  const [range, setRange] = useState<'month' | 'week'>('week')

  useEffect(() => {
    const chartElement = chartElementRef.current

    if (!chartElement) {
      return
    }

    let chart: ReturnType<typeof echarts.init> | undefined

    const renderChart = () => {
      if (chartElement.clientWidth === 0 || chartElement.clientHeight === 0) {
        return
      }

      const computedStyles = window.getComputedStyle(chartElement)
      const getColor = (name: string, fallback: string) =>
        computedStyles.getPropertyValue(name).trim() || fallback
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const visibleData = data.slice(range === 'week' ? -7 : -30)

      chart ??= echarts.init(chartElement, undefined, { renderer: 'canvas' })
      chart.setOption(
        getChartOption(
          visibleData,
          {
            border: getColor('--border', '#dce7e5'),
            drafts: '#f59e0b',
            muted: getColor('--muted-foreground', '#607370'),
            pendingComments: '#8b5cf6',
            primary: getColor('--primary', '#39c5bb'),
            views: getColor('--success', '#138a68'),
          },
          reduceMotion,
        ),
      )
      chart.resize()
    }

    const resizeObserver = new ResizeObserver(renderChart)
    resizeObserver.observe(chartElement)
    renderChart()

    return () => {
      resizeObserver.disconnect()
      chart?.dispose()
    }
  }, [data, range])

  return (
    <Card className="flex h-full min-h-0 flex-col gap-0 py-0">
      <CardHeader className="shrink-0 gap-2 px-4 pb-2 pt-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <CardTitle>数据总览</CardTitle>
        <div
          aria-label="选择数据时间范围"
          className="inline-flex w-fit rounded-lg bg-muted p-1"
          role="group"
        >
          {timeRanges.map(({ label, value }) => {
            const active = range === value

            return (
              <button
                aria-pressed={active}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                key={value}
                onClick={() => setRange(value)}
                type="button"
              >
                {label}
              </button>
            )
          })}
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 px-2 pb-3 sm:px-4">
        <div
          aria-label={`${range === 'week' ? '近七天' : '近一个月'}已发布文章、草稿与待提交、待审核评论及文章阅读量趋势图`}
          className="min-h-0 w-full flex-1"
          ref={chartElementRef}
          role="img"
        />
      </CardContent>
    </Card>
  )
}
