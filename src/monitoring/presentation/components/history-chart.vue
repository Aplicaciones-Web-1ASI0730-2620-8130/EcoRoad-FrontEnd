<script setup>
import { computed } from 'vue'

const props = defineProps({
  readings: { type: Array, required: true },
  unit: { type: String, required: true },
  profile: { type: Object, required: true },
})

const plot = computed(() => {
  const values = props.readings.map((reading) => reading.value)
  const upper = props.profile.kind === 'maximum' ? props.profile.criticalAt : props.profile.maximum
  const lower = props.profile.kind === 'range' ? props.profile.minimum : 0
  const min = Math.min(lower, ...values)
  const max = Math.max(upper, ...values)
  const padding = Math.max((max - min) * .12, 1)
  const yMin = Math.max(0, min - padding)
  const yMax = max + padding
  const x = (index) => 58 + index * (694 / Math.max(props.readings.length - 1, 1))
  const y = (value) => 225 - ((value - yMin) / (yMax - yMin)) * 185
  return {
    points: props.readings.map((reading, index) => ({ x: x(index), y: y(reading.value), value: reading.value, date: reading.recordedAt.slice(0, 10) })),
    limitY: y(upper),
    limit: upper,
    yMin: Math.round(yMin),
    yMax: Math.ceil(yMax),
  }
})
</script>

<template>
  <div class="monitoring-chart-wrap" role="img" :aria-label="`Gráfico de ${readings.length} mediciones entre ${plot.yMin} y ${plot.yMax} ${unit}`">
    <svg viewBox="0 0 800 280" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <line x1="58" y1="40" x2="58" y2="225" class="monitoring-chart-axis" />
      <line x1="58" y1="225" x2="752" y2="225" class="monitoring-chart-axis" />
      <line x1="58" :y1="plot.limitY" x2="752" :y2="plot.limitY" class="monitoring-chart-limit" />
      <text x="65" :y="Math.max(30, plot.limitY - 8)" class="monitoring-chart-limit-label">Umbral demo: {{ plot.limit }} {{ unit }}</text>
      <text x="12" y="45" class="monitoring-chart-label">{{ plot.yMax }}</text>
      <text x="22" y="225" class="monitoring-chart-label">{{ plot.yMin }}</text>
      <polyline v-if="plot.points.length > 1" :points="plot.points.map((point) => `${point.x},${point.y}`).join(' ')" class="monitoring-chart-line" />
      <g v-for="(point, index) in plot.points" :key="index"><circle :cx="point.x" :cy="point.y" r="5" class="monitoring-chart-point" /><text :x="point.x" :y="point.y - 12" text-anchor="middle" class="monitoring-chart-value">{{ point.value }}</text></g>
      <text v-if="plot.points.length" x="58" y="254" class="monitoring-chart-label">{{ plot.points[0].date }}</text>
      <text v-if="plot.points.length > 1" x="752" y="254" text-anchor="end" class="monitoring-chart-label">{{ plot.points.at(-1).date }}</text>
    </svg>
  </div>
</template>
