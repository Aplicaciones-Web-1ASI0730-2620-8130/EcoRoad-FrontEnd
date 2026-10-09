<script setup>
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import MonitoringShell from '../../../monitoring/presentation/components/monitoring-shell.vue'
import { ALERT_STATUSES, RISK_LEVELS } from '../../domain/alert.js'
import { DEMO_ALERT_PROJECTS } from '../../infrastructure/alert-fixtures.js'
import { useAlerts } from '../../application/use-alerts.js'
import '../alerting.css'

const store = useAlerts()
const selectedId = ref(store.alerts.value[0]?.id || null)
const selected = computed(() => store.alerts.value.find((alert) => alert.id === selectedId.value) || null)
const acknowledgeBy = ref('Equipo EcoRoad')
const feedback = ref('')
const formattedDate = (date) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date))

watch(store.visibleAlerts, (alerts) => {
  if (!alerts.some((alert) => alert.id === selectedId.value)) selectedId.value = alerts[0]?.id || null
})

function acknowledgeSelected() {
  if (!selected.value) return
  feedback.value = store.acknowledge(selected.value.id, acknowledgeBy.value)
    ? 'La atención se registró en esta sesión de demostración.'
    : 'Indica el nombre de quien atiende la alerta.'
}
</script>

<template>
  <MonitoringShell>
    <div class="monitoring-heading">
      <div><span class="monitoring-eyebrow">EVALUACIÓN PREVENTIVA</span><h1>Alertas ambientales</h1><p>Lecturas que requieren observación o atención en los corredores viales.</p></div>
      <span class="alerting-total"><i class="pi pi-bell" aria-hidden="true"></i> {{ store.summary.value.byStatus.active || 0 }} alertas activas</span>
    </div>

    <Message severity="info" :closable="false" class="monitoring-demo-note">Simulación con mediciones y umbrales de ejemplo. El acuse de recibo se conserva solo mientras esta página permanezca abierta.</Message>

    <section class="alerting-filters" aria-label="Filtros de alertas">
      <label>Proyecto<select v-model="store.filters.value.projectId"><option value="all">Todos los proyectos</option><option v-for="project in DEMO_ALERT_PROJECTS" :key="project.id" :value="project.id">{{ project.name }}</option></select></label>
      <label>Riesgo<select v-model="store.filters.value.risk"><option value="all">Todos los niveles</option><option value="critical">Crítica</option><option value="observation">En observación</option></select></label>
      <label>Estado<select v-model="store.filters.value.status"><option value="all">Todos los estados</option><option value="active">Activa</option><option value="acknowledged">Atendida</option></select></label>
      <label>Buscar<input v-model="store.filters.value.search" type="search" placeholder="Código o indicador" /></label>
    </section>

    <div class="alerting-layout">
      <section class="alerting-list" aria-label="Listado de alertas">
        <div class="alerting-list-heading"><h2>Registro de alertas</h2><span>{{ store.visibleAlerts.value.length }} resultados</span></div>
        <div v-if="!store.visibleAlerts.value.length" class="alerting-empty"><i class="pi pi-check-circle" aria-hidden="true"></i><h3>Sin alertas para estos filtros</h3><p>Cambia los filtros para consultar otros registros.</p></div>
        <button v-for="alert in store.visibleAlerts.value" :key="alert.id" type="button" class="alerting-card" :class="[`alerting-card--${alert.risk}`, { 'is-selected': selectedId === alert.id }]" :aria-pressed="selectedId === alert.id" @click="selectedId = alert.id; feedback = ''">
          <span class="alerting-card-top"><strong>{{ alert.id }}</strong><Tag :severity="RISK_LEVELS[alert.risk].severity" :value="RISK_LEVELS[alert.risk].label" /></span>
          <strong class="alerting-card-title">{{ alert.indicator }} · {{ alert.value }} {{ alert.unit }}</strong>
          <span class="alerting-card-project">{{ alert.projectName }}</span>
          <span class="alerting-card-section">{{ alert.sectionName }}</span>
          <span class="alerting-card-footer"><span>{{ ALERT_STATUSES[alert.status].label }}</span><time :datetime="alert.detectedAt">{{ formattedDate(alert.detectedAt) }}</time></span>
        </button>
      </section>

      <section class="alerting-detail" aria-label="Detalle de alerta">
        <template v-if="selected">
          <div class="alerting-detail-head"><div><span class="monitoring-eyebrow">PANEL TÉCNICO · {{ selected.id }}</span><h2>{{ selected.indicator }}</h2><p>{{ selected.projectName }} · {{ selected.sectionName }}</p></div><Tag :severity="RISK_LEVELS[selected.risk].severity" :value="RISK_LEVELS[selected.risk].label" /></div>
          <div class="alerting-measurement"><span>VALOR DETECTADO</span><strong>{{ selected.value }} <small>{{ selected.unit }}</small></strong><p>Perfil de referencia: {{ selected.thresholdLabel }}</p></div>
          <dl class="alerting-facts"><div><dt>Estado</dt><dd>{{ ALERT_STATUSES[selected.status].label }}</dd></div><div><dt>Detección</dt><dd>{{ formattedDate(selected.detectedAt) }}</dd></div><div><dt>Origen</dt><dd>{{ selected.source === 'manual' ? 'Registro de campo' : 'Telemetría de ejemplo' }}</dd></div><div><dt>Lectura</dt><dd>{{ selected.readingId }}</dd></div></dl>
          <div class="alerting-recommendation"><strong><i class="pi pi-exclamation-triangle" aria-hidden="true"></i> Acción sugerida</strong><p>{{ selected.recommendation }}</p></div>
          <template v-if="selected.status === 'active'"><label class="alerting-ack-label">Atendida por<input v-model="acknowledgeBy" type="text" maxlength="80" /></label><Button label="Registrar atención" icon="pi pi-check" class="alerting-ack-button" @click="acknowledgeSelected" /></template>
          <div v-else class="alerting-ack-record"><i class="pi pi-check-circle" aria-hidden="true"></i><div><strong>Atención registrada</strong><span>{{ selected.acknowledgedBy }} · {{ formattedDate(selected.acknowledgedAt) }}</span></div></div>
          <Message v-if="feedback" :severity="selected.status === 'acknowledged' ? 'success' : 'warn'" :closable="false">{{ feedback }}</Message>
        </template>
        <div v-else class="alerting-empty"><h3>Selecciona una alerta</h3><p>El detalle aparecerá aquí.</p></div>
      </section>
    </div>
  </MonitoringShell>
</template>
